'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface PricingCardProps {
  isLoggedIn: boolean;
  userEmail?: string;
}

export default function PricingCard({ isLoggedIn, userEmail }: PricingCardProps) {
  const router = useRouter();

  const handleSubscribe = () => {
    // If not logged in, redirect to sign-in page
    if (!isLoggedIn) {
      router.push('/sign-in');
      return;
    }

    // If logged in, redirect to dashboard
    router.push('/dashboard');
  };

  return (
    <div className="space-y-3">
      <div className="max-w-md mx-auto">
        <Card className="border-2 border-gray-200">
          <CardHeader className="text-center space-y-4">
            {/* Pricing */}
            <div>
              <CardTitle className="text-2xl mb-2">Monthly Plan</CardTitle>
              <p className="text-4xl font-bold text-[#4A90E2]">$11.99</p>
              <p className="text-sm text-gray-600">billed every month</p>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            <ul className="text-sm text-gray-600 space-y-2">
              <li>✔︎ Access to all features</li>
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

