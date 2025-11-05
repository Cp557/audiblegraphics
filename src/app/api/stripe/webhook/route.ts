import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe/server';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

// Use service role key for server-side operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature')!;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (error: any) {
    console.error('Webhook signature verification failed:', error.message);
    return NextResponse.json(
      { error: 'Webhook signature verification failed' },
      { status: 400 }
    );
  }

  // Handle different event types
  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutSessionCompleted(session);
        break;
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionChange(subscription);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionDeleted(subscription);
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        
        // If this is a subscription invoice, update the subscription data
        if (invoice.subscription) {
          const subscription = await stripe.subscriptions.retrieve(
            invoice.subscription as string
          );
          await handleSubscriptionChange(subscription);
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        console.error('Payment failed for invoice:', invoice.id);
        // TODO: Notify user of payment failure
        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error('Error handling webhook event:', error);
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }
}

async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.supabase_user_id;
  const customerId = session.customer as string;

  if (!userId) {
    console.error('Webhook: No user ID in session metadata');
    return;
  }

  // Update user's record with Stripe customer ID
  const { error } = await supabaseAdmin
    .from('aim90_table')
    .update({ stripe_customer_id: customerId })
    .eq('user_id', userId);

  if (error) {
    console.error('Webhook: Error updating customer ID:', error);
  }
}

async function handleSubscriptionChange(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string;
  
  // Find user by Stripe customer ID
  const { data: userData, error: fetchError } = await supabaseAdmin
    .from('aim90_table')
    .select('user_id')
    .eq('stripe_customer_id', customerId)
    .single();

  if (fetchError || !userData) {
    console.error('Webhook: User not found for customer:', customerId);
    return;
  }

  const item = subscription.items.data[0];
  const priceId = item?.price.id;
  const itemAny = item as any;
  
  // Use current_period_start and current_period_end from the subscription item
  // These are automatically updated by Stripe on renewals
  const currentPeriodStart = itemAny.current_period_start
    ? new Date(itemAny.current_period_start * 1000).toISOString()
    : null;
  
  const currentPeriodEnd = itemAny.current_period_end
    ? new Date(itemAny.current_period_end * 1000).toISOString()
    : null;

  // Update subscription details
  const { error } = await supabaseAdmin
    .from('aim90_table')
    .update({
      stripe_subscription_id: subscription.id,
      plan_price_id: priceId,
      pro_start_date: currentPeriodStart,
      pro_end_date: currentPeriodEnd,
      cancel_at_period_end: subscription.cancel_at_period_end,
    })
    .eq('user_id', userData.user_id);

  if (error) {
    console.error('Webhook: Error updating subscription:', error);
  }
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string;

  const { data: userData, error: fetchError } = await supabaseAdmin
    .from('aim90_table')
    .select('user_id')
    .eq('stripe_customer_id', customerId)
    .single();

  if (fetchError || !userData) {
    console.error('Webhook: User not found for customer:', customerId);
    return;
  }

  // Note: Subscription deletion is tracked by pro_end_date being in the past
  // No additional status field needed
  console.log('Webhook: Subscription deleted for user:', userData.user_id);
}


