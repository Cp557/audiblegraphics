'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function SubscribeButtons() {
  const [loadingMonthly, setLoadingMonthly] = useState(false);
  const [loadingQuarterly, setLoadingQuarterly] = useState(false);

  const handleSubscribe = async (priceId: string, isMonthly: boolean) => {
    if (isMonthly) {
      setLoadingMonthly(true);
    } else {
      setLoadingQuarterly(true);
    }

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
      // Note: These won't actually run because we're redirecting, but kept for clarity
      if (isMonthly) {
        setLoadingMonthly(false);
      } else {
        setLoadingQuarterly(false);
      }
    }
  };

  return (
    <div className="grid md:grid-cols-2 gap-6">
      {/* Monthly Plan */}
      <Card className="border-2 border-gray-200 hover:border-[#4A90E2] transition-all">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl mb-2">Monthly</CardTitle>
          <p className="text-4xl font-bold text-[#4A90E2]">$11.99</p>
          <p className="text-sm text-gray-600">per month</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <ul className="text-sm text-gray-600 space-y-2">
            <li>✔︎ Alfie AI accountability partner</li>
            <li>✔︎ Daily check-ins & insights</li>
            <li>✔︎ Personalized coaching</li>
            <li>✔︎ Cancel anytime</li>
          </ul>
          <Button
            onClick={() => handleSubscribe(process.env.NEXT_PUBLIC_STRIPE_MONTHLY_PRICE_ID!, true)}
            disabled={loadingMonthly}
            className="w-full bg-[#4A90E2] hover:bg-[#3a7bc8]"
          >
            {loadingMonthly ? 'Loading...' : 'Subscribe Monthly'}
          </Button>
        </CardContent>
      </Card>

      {/* Quarterly Plan */}
      <Card className="border-2 border-[#4A90E2] bg-blue-50/30 hover:shadow-lg transition-all relative">
        <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-green-500 hover:bg-green-600">
          Save 17%
        </Badge>
        <CardHeader className="text-center pt-6">
          <CardTitle className="text-2xl mb-2">Quarterly</CardTitle>
          <p className="text-4xl font-bold text-[#4A90E2]">$29.99</p>
          <p className="text-sm text-gray-600">$10/month - billed every 3 months</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <ul className="text-sm text-gray-600 space-y-2">
            <li>✔︎ Everything in Monthly</li>
            <li>✔︎ Best value plan</li>
            <li>✔︎ Commit to your 90-day goal</li>
            <li>✔︎ Cancel anytime</li>
          </ul>
          <Button
            onClick={() => handleSubscribe(process.env.NEXT_PUBLIC_STRIPE_QUARTERLY_PRICE_ID!, false)}
            disabled={loadingQuarterly}
            className="w-full bg-[#4A90E2] hover:bg-[#3a7bc8]"
          >
            {loadingQuarterly ? 'Loading...' : 'Subscribe Quarterly'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}


