import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  typescript: true,
});

// Admin client for database operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export interface SyncResult {
  subscription_tier: 'Pro' | 'Ultra' | null;
  pro_start_date: string | null;
  pro_end_date: string | null;
  cancel_at_period_end: boolean;
}

/**
 * Sync subscription data from Stripe to database
 * Call this once per day per user to ensure DB stays in sync with Stripe
 */
export async function syncSubscriptionFromStripe(
  stripeCustomerId: string | null,
  userId: string
): Promise<SyncResult> {
  const defaultResult: SyncResult = {
    subscription_tier: null,
    pro_start_date: null,
    pro_end_date: null,
    cancel_at_period_end: false,
  };

  if (!stripeCustomerId) {
    // No Stripe customer - update DB to reflect no subscription
    await supabaseAdmin
      .from('main_table')
      .update({
        subscription_tier: null,
        pro_start_date: null,
        pro_end_date: null,
        cancel_at_period_end: false,
        last_stripe_sync: new Date().toISOString(),
      })
      .eq('user_id', userId);
    return defaultResult;
  }

  try {
    // Get active subscriptions from Stripe
    const subscriptions = await stripe.subscriptions.list({
      customer: stripeCustomerId,
      status: 'active',
      limit: 1,
    });

    if (subscriptions.data.length === 0) {
      // No active subscription - update DB
      await supabaseAdmin
        .from('main_table')
        .update({
          subscription_tier: null,
          pro_start_date: null,
          pro_end_date: null,
          cancel_at_period_end: false,
          last_stripe_sync: new Date().toISOString(),
        })
        .eq('user_id', userId);
      return defaultResult;
    }

    const subscription = subscriptions.data[0];
    const subscriptionItem = subscription.items.data[0];
    const priceId = subscriptionItem?.price.id;

    let subscription_tier: 'Pro' | 'Ultra' | null = null;
    if (priceId === process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID) {
      subscription_tier = 'Pro';
    } else if (priceId === process.env.NEXT_PUBLIC_STRIPE_ULTRA_PRICE_ID) {
      subscription_tier = 'Ultra';
    }

    // current_period_start and current_period_end are on the subscription item
    const itemAny = subscriptionItem as any;
    const result: SyncResult = {
      subscription_tier,
      pro_start_date: itemAny.current_period_start
        ? new Date(itemAny.current_period_start * 1000).toISOString()
        : null,
      pro_end_date: itemAny.current_period_end
        ? new Date(itemAny.current_period_end * 1000).toISOString()
        : null,
      cancel_at_period_end: subscription.cancel_at_period_end,
    };

    // Update database with fresh Stripe data
    await supabaseAdmin
      .from('main_table')
      .update({
        ...result,
        stripe_subscription_id: subscription.id,
        last_stripe_sync: new Date().toISOString(),
      })
      .eq('user_id', userId);

    return result;
  } catch (error) {
    console.error('Error syncing from Stripe:', error);
    // Don't update on error - keep existing data
    return defaultResult;
  }
}
