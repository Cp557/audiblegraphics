import { redirect } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import logo from "../../../public/logo.png";
import { createClient } from '@/lib/supabase/server';
import { Button } from "@/components/ui/button";
import SubscribeButtons from '@/components/SubscribeButtons';
import ManageSubscriptionButton from '@/components/ManageSubscriptionButton';
import { hasActiveSubscription, getSubscriptionWarning } from '@/lib/utils/subscription';
import { Info } from 'lucide-react';

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string }>;
}) {
  const supabase = await createClient();
  
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    redirect('/sign-in');
  }

  // Resolve searchParams promise and get the plan
  const params = await searchParams;
  const plan = (params.plan === 'quarterly' ? 'quarterly' : 'monthly') as 'monthly' | 'quarterly';

  // Fetch user's subscription status from aim90_table
  const { data: userData } = await supabase
    .from('aim90_table')
    .select('stripe_customer_id, plan_price_id, pro_end_date, cancel_at_period_end')
    .eq('user_id', user.id)
    .single();

  const isSubscriptionActive = hasActiveSubscription(userData);
  const subscriptionWarning = getSubscriptionWarning(userData);

  return (
    <div className="min-h-screen bg-[#FEFEFD]">
      {/* Header */}
      <header className="bg-[#FEFEFD] py-4">
        <div className="max-w-5xl mx-auto px-6">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center cursor-pointer">
              <div className="h-10 w-10 relative">
                <Image 
                  src={logo} 
                  alt="Aim90 Logo" 
                  fill
                  style={{ objectFit: 'contain' }}
                  priority
                />
              </div>
              <span className="ml-2 text-xl font-semibold text-gray-900">
                Aim90
              </span>
            </Link>
            <div className="flex items-center">
              <form action="/api/auth/signout" method="post">
                <Button className="h-9 px-6 text-base cursor-pointer">
                  Sign Out
                </Button>
              </form>
            </div>
          </div>
        </div>
      </header>
      <div className="max-w-5xl mx-auto border-t border-gray-200" />

      {/* Main Content */}
      <main className="flex items-center justify-center px-6 py-20">
        <div className="max-w-4xl w-full">
          {/* Action Buttons Grid */}
          <div className="space-y-3">
            {/* Primary CTA - Subscribe or Manage */}
            {!isSubscriptionActive ? (
              <div>
                <h2 className="text-2xl font-bold text-center mb-4">Choose Your Plan</h2>
                <SubscribeButtons initialPlan={plan} />
              </div>
            ) : (
              <div className="mt-30">
                <h2 className="text-2xl font-bold text-center mb-8">Manage Your Subscription</h2>
                <ManageSubscriptionButton 
                  planPriceId={userData?.plan_price_id}
                  cancelAtPeriodEnd={userData?.cancel_at_period_end}
                  proEndDate={userData?.pro_end_date}
                />
              </div>
            )}
            {/* Inline Note (moved closer to card) */}
            <div className="text-center space-y-1">
              <p className="text-xs text-gray-400">
                Signed in as <span className="font-medium text-gray-500">{user.email}</span>
              </p>
              <p className="text-xs text-gray-400">
                Secure payment processing powered by Stripe
              </p>
            </div>
          </div>
          
        </div>
      </main>

      <div className="flex items-center justify-center gap-2 text-xs text-gray-400 py-6">
        <Info className="h-3.5 w-3.5" />
        <span>
          We process payment on our website to avoid paying Apple's 30% & Google's 15% fees on mobile apps.
        </span>
      </div>

      <div className="max-w-5xl mx-auto border-t border-gray-200" />

      {/* Footer */}
      <footer className="bg-[#FEFEFD] py-8 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="mb-6 md:mb-0">
              <Link href="/" className="flex items-center cursor-pointer">
                <div className="h-6 w-6 relative">
                  <Image 
                    src={logo} 
                    alt="Aim90 Logo" 
                    fill
                    style={{ objectFit: 'contain' }}
                  />
                </div>
                <span className="ml-2 text-base font-semibold text-gray-900">
                  Aim90
                </span>
              </Link>
            </div>
            
            <div className="flex space-x-6">
              <Link href="https://docs.google.com/document/d/1_tyc6xjePKLSjjDrFP5Cb5D7iqdfbQcl/edit?usp=sharing&ouid=105580698223202217739&rtpof=true&sd=true" target="_blank" rel="noopener noreferrer" className="footer-link">
                <Button variant="link" className="text-xs text-gray-500 hover:text-[#4A90E2]">Terms of Service</Button>
              </Link>
              <Link href="https://docs.google.com/document/d/1idJSO9TVnZKyM49ATBcWKxi9gr0v9fVa/edit?usp=sharing&ouid=105580698223202217739&rtpof=true&sd=true" target="_blank" rel="noopener noreferrer" className="footer-link">
                <Button variant="link" className="text-xs text-gray-500 hover:text-[#4A90E2]">Privacy</Button>
              </Link>
              <Link href="mailto:contact@aim90.org" target="_blank" rel="noopener noreferrer" className="footer-link">
                <Button variant="link" className="text-xs text-gray-500 hover:text-[#4A90E2]">Contact</Button>
              </Link>
            </div>
          </div>

          <div className="text-center mt-8">
            <p className="text-xs text-gray-500">
              &copy; {new Date().getFullYear()} Aim90. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

