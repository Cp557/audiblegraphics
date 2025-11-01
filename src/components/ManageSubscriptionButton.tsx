'use client';

import { useState } from 'react';

interface ManageSubscriptionButtonProps {
  subscriptionStatus?: string;
  planPriceId?: string;
}

export default function ManageSubscriptionButton({ 
  subscriptionStatus, 
  planPriceId 
}: ManageSubscriptionButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleManageSubscription = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/stripe/create-portal-session', {
        method: 'POST',
      });

      const data = await response.json();
      
      if (data.error) {
        alert(data.error);
        return;
      }

      // Redirect to Stripe Customer Portal
      window.location.href = data.url;
    } catch (error) {
      console.error('Error:', error);
      alert('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Determine plan name
  const getPlanName = () => {
    if (planPriceId === process.env.NEXT_PUBLIC_STRIPE_MONTHLY_PRICE_ID) {
      return 'Monthly ($11.99/mo)';
    } else if (planPriceId === process.env.NEXT_PUBLIC_STRIPE_QUARTERLY_PRICE_ID) {
      return 'Quarterly ($29.99/3mo)';
    }
    return 'Pro';
  };

  return (
    <div className="w-full">
      <button
        onClick={handleManageSubscription}
        disabled={loading}
        className="w-full bg-gradient-to-r from-[#4A90E2] to-[#357ABD] text-white rounded-xl p-6 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <div className="flex items-center justify-center space-x-3">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
          </svg>
          <span className="text-xl font-semibold">
            {loading ? 'Loading...' : 'Manage Subscription'}
          </span>
        </div>
        {!loading && (
          <div className="mt-2">
            <p className="text-blue-100 text-sm">
              Current Plan: {getPlanName()}
            </p>
            <p className="text-blue-100 text-xs mt-1">
              Update payment • View invoices • Cancel anytime
            </p>
          </div>
        )}
      </button>
    </div>
  );
}


