export interface SubscriptionData {
  subscription_status?: string | null;
  pro_end_date?: string | null;
  cancel_at_end_date?: boolean | null;
  plan_price_id?: string | null;
}

/**
 * Checks if user has an active subscription
 * Validates both subscription status and expiration date
 */
export function hasActiveSubscription(userData?: SubscriptionData | null): boolean {
  if (!userData || userData.subscription_status !== 'active') {
    return false;
  }
  
  // Must have a non-null end date and it must be in the future
  if (!userData.pro_end_date) {
    return false;
  }
  const endDate = new Date(userData.pro_end_date);
  return endDate.getTime() > Date.now();
}

/**
 * Gets a warning message if subscription is ending soon
 * Returns null if subscription is recurring or not active
 */
export function getSubscriptionWarning(userData?: SubscriptionData | null): string | null {
  if (!userData || !hasActiveSubscription(userData)) {
    return null;
  }
  
  if (userData.cancel_at_end_date && userData.pro_end_date) {
    const endDate = new Date(userData.pro_end_date);
    const formattedDate = endDate.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
    return `Your subscription ends on ${formattedDate}`;
  }
  
  return null;
}

/**
 * Gets the plan name from price ID
 */
export function getPlanName(planPriceId?: string | null): string {
  if (planPriceId === process.env.NEXT_PUBLIC_STRIPE_MONTHLY_PRICE_ID) {
    return 'Monthly';
  } else if (planPriceId === process.env.NEXT_PUBLIC_STRIPE_QUARTERLY_PRICE_ID) {
    return 'Quarterly';
  }
  return 'Pro';
}

/**
 * Gets formatted plan display with price
 */
export function getPlanDisplayName(planPriceId?: string | null): string {
  if (planPriceId === process.env.NEXT_PUBLIC_STRIPE_MONTHLY_PRICE_ID) {
    return 'Monthly ($11.99/mo)';
  } else if (planPriceId === process.env.NEXT_PUBLIC_STRIPE_QUARTERLY_PRICE_ID) {
    return 'Quarterly ($29.99/3mo)';
  }
  return 'Pro';
}

