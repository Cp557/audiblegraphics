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
        console.log('Payment succeeded for invoice:', invoice.id);
        
        // If this is a subscription invoice, update the subscription data
        if (invoice.subscription) {
          console.log('Retrieving subscription from invoice:', invoice.subscription);
          const subscription = await stripe.subscriptions.retrieve(
            invoice.subscription as string
          );
          console.log('Full subscription object retrieved:', JSON.stringify(subscription, null, 2));
          await handleSubscriptionChange(subscription);
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        console.log('Payment failed for invoice:', invoice.id);
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
    console.error('No user ID in session metadata');
    return;
  }

  // Update user's record with Stripe customer ID
  const { error } = await supabaseAdmin
    .from('aim90_table')
    .update({ stripe_customer_id: customerId })
    .eq('user_id', userId);

  if (error) {
    console.error('Error updating customer ID:', error);
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
    console.error('User not found for customer:', customerId);
    return;
  }

  const priceId = subscription.items.data[0]?.price.id;
  const priceData = subscription.items.data[0]?.price;
  
  // Access subscription as any to check for underscore properties
  const subAny = subscription as any;
  
  // Get the billing interval from the price
  const interval = (priceData as any)?.recurring?.interval; // 'month'
  const intervalCount = (priceData as any)?.recurring?.interval_count || 1;
  
  console.log('Price/Interval data:', {
    priceId,
    interval,
    intervalCount,
  });
  
  // Use billing_cycle_anchor or start_date as the period start
  const periodStartTimestamp = subAny.billing_cycle_anchor || subAny.start_date || subscription.created;
  const currentPeriodStart = periodStartTimestamp 
    ? new Date(periodStartTimestamp * 1000).toISOString()
    : null;
  
  // Calculate period end based on interval
  let currentPeriodEnd = null;
  if (periodStartTimestamp && interval) {
    const startDate = new Date(periodStartTimestamp * 1000);
    const endDate = new Date(startDate);
    
    if (interval === 'month') {
      endDate.setMonth(endDate.getMonth() + intervalCount);
    } else if (interval === 'year') {
      endDate.setFullYear(endDate.getFullYear() + intervalCount);
    } else if (interval === 'week') {
      endDate.setDate(endDate.getDate() + (7 * intervalCount));
    } else if (interval === 'day') {
      endDate.setDate(endDate.getDate() + intervalCount);
    }
    
    currentPeriodEnd = endDate.toISOString();
  }

  console.log('Converted dates for database:', {
    customerId,
    subscriptionId: subscription.id,
    status: subscription.status,
    priceId,
    periodStart: currentPeriodStart,
    periodEnd: currentPeriodEnd,
  });

  // Update subscription details
  const { error } = await supabaseAdmin
    .from('aim90_table')
    .update({
      stripe_subscription_id: subscription.id,
      subscription_status: subscription.status,
      plan_price_id: priceId,
      pro_start_date: currentPeriodStart,
      pro_end_date: currentPeriodEnd,
    })
    .eq('user_id', userData.user_id);

  if (error) {
    console.error('Error updating subscription:', error);
  } else {
    console.log('Successfully updated subscription for user:', userData.user_id);
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
    console.error('User not found for customer:', customerId);
    return;
  }

  // Update subscription status to canceled
  const { error } = await supabaseAdmin
    .from('aim90_table')
    .update({
      subscription_status: 'canceled',
    })
    .eq('user_id', userData.user_id);

  if (error) {
    console.error('Error canceling subscription:', error);
  }
}


