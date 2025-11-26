import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { syncSubscriptionFromStripe } from '@/lib/stripe/server';

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * POST /api/sync-subscription
 * Syncs the user's subscription data from Stripe if it's been more than 24 hours
 * Called automatically on dashboard load as a safety net for webhook failures
 */
export async function POST() {
  try {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's current data including last sync time
    const { data: userData } = await supabaseAdmin
      .from('main_table')
      .select('stripe_customer_id, last_stripe_sync')
      .eq('user_id', user.id)
      .single();

    // Check if sync is needed (more than 24 hours since last sync)
    const lastSync = userData?.last_stripe_sync
      ? new Date(userData.last_stripe_sync)
      : new Date(0);
    const hoursSinceSync = (Date.now() - lastSync.getTime()) / (1000 * 60 * 60);

    if (hoursSinceSync < 24) {
      return NextResponse.json({
        synced: false,
        message: 'Sync not needed yet',
        nextSyncIn: `${Math.round(24 - hoursSinceSync)} hours`,
      });
    }

    // Perform sync with Stripe
    const result = await syncSubscriptionFromStripe(
      userData?.stripe_customer_id || null,
      user.id
    );

    return NextResponse.json({
      synced: true,
      subscription_tier: result.subscription_tier,
    });
  } catch (error) {
    console.error('Sync error:', error);
    return NextResponse.json({ error: 'Sync failed' }, { status: 500 });
  }
}

