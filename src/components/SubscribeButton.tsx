'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function SubscribeButton() {
  const [loading, setLoading] = useState(false);

  const handleSubscribe = async () => {
    setLoading(true);

    try {
      const response = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
      <Card className="border-2 border-gray-200">
        <CardHeader className="text-center space-y-4">
          <CardTitle className="text-2xl mb-2">Monthly Plan</CardTitle>
          <p className="text-4xl font-bold text-[#4A90E2]">$11.99</p>
          <p className="text-sm text-gray-600">per month</p>
        </CardHeader>

        <CardContent className="space-y-4">
          <ul className="text-sm text-gray-600 space-y-2">
            <li>✔︎ Access to all features</li>
            <li>✔︎ Cancel anytime</li>
          </ul>
          <Button
            onClick={handleSubscribe}
            disabled={loading}
            className="w-full bg-[#4A90E2] hover:bg-[#3a7bc8] cursor-pointer"
          >
            {loading ? 'Loading...' : 'Subscribe Monthly'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

