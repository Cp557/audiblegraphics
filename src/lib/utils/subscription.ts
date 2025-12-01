export interface SubscriptionData {
  pro_end_date?: string | null;
  cancel_at_period_end?: boolean | null;
  subscription_tier?: 'Pro' | 'Ultra' | null;
  monthly_generated_slideshows?: number | null;
  last_reset_date?: string | null;
  pro_start_date?: string | null;
}

export const SLIDE_LIMITS = {
  FREE: 1,
  PRO: 30,
  ULTRA: 75,
} as const;

export function getSlideshowLimit(tier?: string | null): number {
  switch (tier) {
    case 'Pro':
      return SLIDE_LIMITS.PRO;
    case 'Ultra':
      return SLIDE_LIMITS.ULTRA;
    default:
      return SLIDE_LIMITS.FREE;
  }
}

/**
 * Checks if user has an active subscription
 * Validates subscription based on expiration date
 */
export function hasActiveSubscription(userData?: SubscriptionData | null): boolean {
  if (!userData) {
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
  
  if (userData.cancel_at_period_end && userData.pro_end_date) {
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

