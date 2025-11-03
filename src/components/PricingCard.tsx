'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

type PlanType = 'monthly' | 'quarterly';

interface PricingCardProps {
  isLoggedIn: boolean;
  userEmail?: string;
}

export default function PricingCard({ isLoggedIn, userEmail }: PricingCardProps) {
  const [selectedPlan, setSelectedPlan] = useState<PlanType>('monthly');
  const router = useRouter();

  const handleSubscribe = () => {
    // If not logged in, redirect to sign-in page
    if (!isLoggedIn) {
      router.push('/sign-in');
      return;
    }

    // If logged in, redirect to dashboard with selected plan
    router.push(`/dashboard?plan=${selectedPlan}`);
  };

  return (
    <div className="space-y-3">
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
                  ? 'billed every month' 
                  : 'billed every 3 months'}
              </p>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            <ul className="text-sm text-gray-600 space-y-2">
              <li>✔︎ Alfie AI accountability partner</li>
              <li>✔︎ Daily check-ins & insights</li>
              <li>✔︎ Cancel anytime</li>
            </ul>
            <Button
              onClick={handleSubscribe}
              className="w-full bg-[#4A90E2] hover:bg-[#3a7bc8] cursor-pointer"
            >
              {isLoggedIn ? "Dashboard" : "Sign In"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

