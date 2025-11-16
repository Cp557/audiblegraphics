'use client';

import { useState } from 'react';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { getPlanDisplayName } from '@/lib/utils/subscription';

interface ManageSubscriptionButtonProps {
  cancelAtPeriodEnd?: boolean;
  proEndDate?: string;
}

export default function ManageSubscriptionButton({ 
  cancelAtPeriodEnd,
  proEndDate
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

  return (
    <div className="max-w-sm mx-auto -mt-4">
      <Card className="border-2 border-gray-200">
        <CardHeader className="flex items-center justify-center p-0 gap-0">
          <Badge> AudibleSlides Pro </Badge>
        </CardHeader>
        <CardContent className="space-y-3 pt-0 text-center">
          {/* Key details */}
          <p className="text-sm text-gray-700">{getPlanDisplayName()}</p>
          {proEndDate && (
            <p className="text-sm text-gray-700">
              {cancelAtPeriodEnd ? 'Ends on ' : 'Renews on '}
              {new Date(proEndDate as string).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: '2-digit' })}
            </p>
          )}
          <div className="border-t border-gray-100" />
          <p className="text-sm text-gray-700">Update payment • View invoices • Cancel anytime</p>
        </CardContent>
        <CardFooter className="flex flex-col items-center">
          <Button
            onClick={handleManageSubscription}
            disabled={loading}
            className="w-full bg-[#4A90E2] hover:bg-[#3a7bc8] cursor-pointer"
          >
            {loading ? 'Loading...' : 'Manage Subscription'}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}


