'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

type PlanType = 'monthly' | 'quarterly';

interface SubscribeButtonsProps {
  initialPlan?: PlanType;
}

export default function SubscribeButtons({ initialPlan = 'monthly' }: SubscribeButtonsProps) {
  const [selectedPlan, setSelectedPlan] = useState<PlanType>(initialPlan);
  const [loading, setLoading] = useState(false);

  const handleSubscribe = async () => {
    setLoading(true);

    const priceId = selectedPlan === 'monthly' 
      ? process.env.NEXT_PUBLIC_STRIPE_MONTHLY_PRICE_ID!
      : process.env.NEXT_PUBLIC_STRIPE_QUARTERLY_PRICE_ID!;

    try {
      const response = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceId }),
      });

      const data = await response.json();
      
      if (data.error) {
        alert(data.error);
        return;
      }

      // Redirect to Stripe Checkout using the session URL
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert('Failed to create checkout session');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('An error occurred. Please try again.');
    } finally {
      // Note: This won't actually run because we're redirecting, but kept for clarity
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto">
      <Card className="border-2 border-gray-200 relative">
        {selectedPlan === 'quarterly' && (
          <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-green-500 hover:bg-green-600">
            Save 17%
          </Badge>
        )}
        
        <CardHeader className="text-center space-y-4">
          {/* Toggle */}
          <div className="flex justify-center gap-2 bg-gray-100 p-1 rounded-lg">
            <button
              onClick={() => setSelectedPlan('monthly')}
              className={`flex-1 px-6 py-2 rounded-md text-sm font-medium transition-all cursor-pointer ${
                selectedPlan === 'monthly'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setSelectedPlan('quarterly')}
              className={`flex-1 px-6 py-2 rounded-md text-sm font-medium transition-all cursor-pointer ${
                selectedPlan === 'quarterly'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Quarterly
            </button>
          </div>

          {/* Pricing */}
          <div>
            <CardTitle className="text-2xl mb-2">
              {selectedPlan === 'monthly' ? 'Monthly Plan' : 'Quarterly Plan'}
            </CardTitle>
            <p className="text-4xl font-bold text-[#4A90E2]">
              {selectedPlan === 'monthly' ? '$11.99' : '$29.99'}
            </p>
            <p className="text-sm text-gray-600">
              {selectedPlan === 'monthly' 
                ? 'per month' 
                : 'per 3 months'}
            </p>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <ul className="text-sm text-gray-600 space-y-2">
            <li>✔︎ Access to Alfie, your AI accountability partner</li>
            <li>✔︎ Daily check-ins & insights</li>
            <li>✔︎ Cancel anytime</li>
          </ul>
          <Button
            onClick={handleSubscribe}
            disabled={loading}
            className="w-full bg-[#4A90E2] hover:bg-[#3a7bc8] cursor-pointer"
          >
            {loading ? 'Loading...' : `Subscribe ${selectedPlan === 'monthly' ? 'Monthly' : 'Quarterly'}`}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}


