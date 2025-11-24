'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface PricingCardsProps {
  isLoggedIn: boolean;
  userEmail?: string;
  subscriptionTier?: 'Pro' | 'Ultra' | null;
}

export default function PricingCards({ isLoggedIn, userEmail, subscriptionTier }: PricingCardsProps) {
  const [isUpgradingPro, setIsUpgradingPro] = useState(false);
  const [isUpgradingUltra, setIsUpgradingUltra] = useState(false);
  const [isManagingSubscription, setIsManagingSubscription] = useState(false);

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

  const handleManageSubscription = async () => {
    if (isManagingSubscription) {
      return;
    }

    setIsManagingSubscription(true);
    try {
      const response = await fetch('/api/stripe/create-portal-session', {
        method: 'POST',
      });

      const data = await response.json();
      
      if (data.error) {
        console.error(data.error);
        return;
      }

      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsManagingSubscription(false);
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
        className="border-2 border-gray-200 relative overflow-hidden"
        onMouseEnter={(e) => handleHover(e, true)}
        onMouseLeave={(e) => handleHover(e, false)}
      >
        <div 
          className="absolute top-0 right-0 bg-[#4A90E2] text-white text-xs font-bold px-3 py-1 rounded-bl-lg shadow-md z-10 transition-opacity duration-300"
          style={{ 
            opacity: subscriptionTier === 'Pro' ? 1 : 0,
            pointerEvents: subscriptionTier === 'Pro' ? 'auto' : 'none'
          }}
        >
          Current Plan
        </div>
        <CardHeader className="text-center space-y-4">
          <div>
            <CardTitle className="text-2xl mb-2">Pro Plan</CardTitle>
            <p className="text-4xl font-bold text-[#4A90E2]">$14.99</p>
            <p className="text-sm text-gray-600">per month</p>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <ul className="text-sm text-gray-600 space-y-2">
            <li>✔︎ 50 infographics per month</li>
            <li>✔︎ High-quality images & audio</li>
            <li>✔︎ Multiple voice options</li>
            <li>✔︎ Download as video</li>
            <li>✔︎ Cancel anytime</li>
          </ul>
          <div 
            className="transition-all duration-300"
            style={{
              opacity: (isLoggedIn && subscriptionTier === 'Pro') ? 1 : 0,
              height: (isLoggedIn && subscriptionTier === 'Pro') ? 'auto' : '0',
              overflow: 'hidden',
              marginTop: (isLoggedIn && subscriptionTier === 'Pro') ? '1rem' : '0'
            }}
          >
            <Button
              onClick={handleManageSubscription}
              disabled={isManagingSubscription}
              className="w-full bg-[#4A90E2] hover:bg-[#3a7bc8] cursor-pointer"
            >
              {isManagingSubscription ? "Loading..." : "Manage Subscription"}
            </Button>
          </div>
          <div 
            className="transition-all duration-300"
            style={{
              opacity: (isLoggedIn && !subscriptionTier) ? 1 : 0,
              height: (isLoggedIn && !subscriptionTier) ? 'auto' : '0',
              overflow: 'hidden',
              marginTop: (isLoggedIn && !subscriptionTier) ? '1rem' : '0'
            }}
          >
            <Button
              onClick={() => handleUpgrade('pro')}
              disabled={isUpgradingPro}
              className="w-full bg-[#4A90E2] hover:bg-[#3a7bc8] cursor-pointer"
            >
              {isUpgradingPro ? "Loading..." : "Upgrade to Pro"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Ultra Plan Card */}
      <Card
        className="border-2 border-gray-200 relative overflow-hidden"
        onMouseEnter={(e) => handleHover(e, true)}
        onMouseLeave={(e) => handleHover(e, false)}
      >
        <div 
          className="absolute top-0 right-0 bg-[#4A90E2] text-white text-xs font-bold px-3 py-1 rounded-bl-lg shadow-md z-10 transition-opacity duration-300"
          style={{ 
            opacity: subscriptionTier === 'Ultra' ? 1 : 0,
            pointerEvents: subscriptionTier === 'Ultra' ? 'auto' : 'none'
          }}
        >
          Current Plan
        </div>
        <CardHeader className="text-center space-y-4">
          <div>
            <CardTitle className="text-2xl mb-2">Ultra Plan</CardTitle>
            <p className="text-4xl font-bold text-[#4A90E2]">$24.99</p>
            <p className="text-sm text-gray-600">per month</p>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <ul className="text-sm text-gray-600 space-y-2">
            <li>✔︎ 100 infographics per month</li>
            <li>✔︎ High-quality images & audio</li>
            <li>✔︎ Multiple voice options</li>
            <li>✔︎ Download as video</li>
            <li>✔︎ Cancel anytime</li>
          </ul>
          <div 
            className="transition-all duration-300"
            style={{
              opacity: (isLoggedIn && subscriptionTier === 'Pro') ? 1 : 0,
              height: (isLoggedIn && subscriptionTier === 'Pro') ? 'auto' : '0',
              overflow: 'hidden',
              marginTop: (isLoggedIn && subscriptionTier === 'Pro') ? '1rem' : '0'
            }}
          >
            <Button
              onClick={handleManageSubscription}
              disabled={isManagingSubscription}
              className="w-full bg-[#4A90E2] hover:bg-[#3a7bc8] cursor-pointer"
            >
              {isManagingSubscription ? "Loading..." : "Manage Subscription"}
            </Button>
          </div>
          <div 
            className="transition-all duration-300"
            style={{
              opacity: (isLoggedIn && !subscriptionTier) ? 1 : 0,
              height: (isLoggedIn && !subscriptionTier) ? 'auto' : '0',
              overflow: 'hidden',
              marginTop: (isLoggedIn && !subscriptionTier) ? '1rem' : '0'
            }}
          >
            <Button
              onClick={() => handleUpgrade('ultra')}
              disabled={isUpgradingUltra}
              className="w-full bg-[#4A90E2] hover:bg-[#3a7bc8] cursor-pointer"
            >
              {isUpgradingUltra ? "Loading..." : "Upgrade to Ultra"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
