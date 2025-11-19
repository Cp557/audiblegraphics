'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface PricingCardsProps {
  isLoggedIn: boolean;
  userEmail?: string;
}

export default function PricingCards({ isLoggedIn, userEmail }: PricingCardsProps) {
  const [isUpgradingPro, setIsUpgradingPro] = useState(false);
  const [isUpgradingUltra, setIsUpgradingUltra] = useState(false);

  const handleUpgrade = async (plan: 'pro' | 'ultra') => {
    const priceId = plan === 'pro'
      ? process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID
      : process.env.NEXT_PUBLIC_STRIPE_ULTRA_PRICE_ID;

    const setIsUpgrading = plan === 'pro' ? setIsUpgradingPro : setIsUpgradingUltra;
    const isUpgrading = plan === 'pro' ? isUpgradingPro : isUpgradingUltra;

    if (isUpgrading) {
      return;
    }

    setIsUpgrading(true);
    try {
      const response = await fetch("/api/stripe/create-checkout-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ priceId }),
      });

      const data = await response.json();

      if (data?.url) {
        window.location.href = data.url as string;
        return;
      }

      console.error("Unable to create checkout session:", data?.error);
    } catch (error) {
      console.error("Error starting checkout:", error);
    } finally {
      setIsUpgrading(false);
    }
  };

  const handleHover = (e: React.MouseEvent<HTMLDivElement>, entering: boolean) => {
    const el = e.currentTarget as HTMLDivElement;
    if (entering) {
      el.style.transition = 'transform 160ms ease-out, box-shadow 160ms ease-out';
      el.style.transform = 'translateY(-3px)';
      el.style.boxShadow = '0 8px 14px -8px rgba(0,0,0,0.15)';
    } else {
      el.style.transform = '';
      el.style.boxShadow = '';
    }
  };

  return (
    <div className="grid gap-6 sm:grid-cols-1 md:grid-cols-2 max-w-4xl mx-auto">
      {/* Pro Plan Card */}
      <Card
        className="border-2 border-gray-200"
        onMouseEnter={(e) => handleHover(e, true)}
        onMouseLeave={(e) => handleHover(e, false)}
      >
        <CardHeader className="text-center space-y-4">
          <div>
            <CardTitle className="text-2xl mb-2">Pro Plan</CardTitle>
            <p className="text-4xl font-bold text-[#4A90E2]">$9.99</p>
            <p className="text-sm text-gray-600">per month</p>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <ul className="text-sm text-gray-600 space-y-2">
            <li>✔︎ 100 slides per month</li>
            <li>✔︎ High-quality audio</li>
            <li>✔︎ Multiple voices</li>
            <li>✔︎ Priority support</li>
            <li>✔︎ Cancel anytime</li>
          </ul>
          {isLoggedIn && (
            <Button
              onClick={() => handleUpgrade('pro')}
              disabled={isUpgradingPro}
              className="w-full bg-[#4A90E2] hover:bg-[#3a7bc8] cursor-pointer"
            >
              {isUpgradingPro ? "Loading..." : "Get Started"}
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Ultra Plan Card */}
      <Card
        className="border-2 border-gray-200"
        onMouseEnter={(e) => handleHover(e, true)}
        onMouseLeave={(e) => handleHover(e, false)}
      >
        <CardHeader className="text-center space-y-4">
          <div>
            <CardTitle className="text-2xl mb-2">Ultra Plan</CardTitle>
            <p className="text-4xl font-bold text-[#4A90E2]">$19.99</p>
            <p className="text-sm text-gray-600">per month</p>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <ul className="text-sm text-gray-600 space-y-2">
            <li>✔︎ Unlimited slides</li>
            <li>✔︎ Premium audio quality</li>
            <li>✔︎ All voice options</li>
            <li>✔︎ Priority support</li>
            <li>✔︎ Advanced features</li>
            <li>✔︎ Cancel anytime</li>
          </ul>
          {isLoggedIn && (
            <Button
              onClick={() => handleUpgrade('ultra')}
              disabled={isUpgradingUltra}
              className="w-full bg-[#4A90E2] hover:bg-[#3a7bc8] cursor-pointer"
            >
              {isUpgradingUltra ? "Loading..." : "Get Started"}
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
