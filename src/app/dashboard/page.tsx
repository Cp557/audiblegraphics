import { redirect } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import logo from "../../../public/logo.png";
import { createClient } from '@/lib/supabase/server';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import SubscribeButtons from '@/components/SubscribeButtons';
import ManageSubscriptionButton from '@/components/ManageSubscriptionButton';

export default async function DashboardPage() {
  const supabase = await createClient();
  
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    redirect('/sign-in');
  }

  // Fetch user's subscription status from aim90_table
  const { data: userData } = await supabase
    .from('aim90_table')
    .select('stripe_customer_id, subscription_status, plan_price_id')
    .eq('user_id', user.id)
    .single();

  const hasActiveSubscription = userData?.subscription_status === 'active';

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
      <main className="flex items-center justify-center min-h-screen px-6 py-12">
        <div className="max-w-4xl w-full space-y-8">
          {/* Header Section */}
          <div className="text-center">
            <h1 className="text-5xl font-bold text-gray-900">
              Manage your billing and subscription
            </h1>
            {hasActiveSubscription && (
              <Badge className="mt-3 bg-green-500 hover:bg-green-600">
                Active Subscription
              </Badge>
            )}
          </div>

          {/* Action Buttons Grid */}
          <div className="space-y-6">
            {/* Primary CTA - Subscribe or Manage */}
            {!hasActiveSubscription ? (
              <div>
                <h2 className="text-2xl font-bold text-center mb-4">Choose Your Plan</h2>
                <SubscribeButtons />
              </div>
            ) : (
              <ManageSubscriptionButton 
                subscriptionStatus={userData?.subscription_status}
                planPriceId={userData?.plan_price_id}
              />
            )}

          {/* Secondary Actions */}
          <div className="grid md:grid-cols-2 gap-6 mt-6">

            {/* Manage Subscription */}
            <button className="bg-white rounded-xl p-6 border-2 border-gray-200 hover:border-[#4A90E2] hover:shadow-md transition-all duration-200 text-left group">
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 bg-gray-100 group-hover:bg-blue-50 rounded-lg flex items-center justify-center transition-colors">
                  <svg className="w-5 h-5 text-gray-600 group-hover:text-[#4A90E2]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                  </svg>
                </div>
                <svg className="w-5 h-5 text-gray-400 group-hover:text-[#4A90E2]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-1">Manage Subscription</h3>
              <p className="text-sm text-gray-600">View and update your plan details</p>
            </button>

            {/* Update Payment Method */}
            <button className="bg-white rounded-xl p-6 border-2 border-gray-200 hover:border-[#4A90E2] hover:shadow-md transition-all duration-200 text-left group">
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 bg-gray-100 group-hover:bg-blue-50 rounded-lg flex items-center justify-center transition-colors">
                  <svg className="w-5 h-5 text-gray-600 group-hover:text-[#4A90E2]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                </div>
                <svg className="w-5 h-5 text-gray-400 group-hover:text-[#4A90E2]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-1">Payment Method</h3>
              <p className="text-sm text-gray-600">Update your payment details</p>
            </button>

            {/* Billing History */}
            <button className="bg-white rounded-xl p-6 border-2 border-gray-200 hover:border-[#4A90E2] hover:shadow-md transition-all duration-200 text-left group">
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 bg-gray-100 group-hover:bg-blue-50 rounded-lg flex items-center justify-center transition-colors">
                  <svg className="w-5 h-5 text-gray-600 group-hover:text-[#4A90E2]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <svg className="w-5 h-5 text-gray-400 group-hover:text-[#4A90E2]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-1">Billing History</h3>
              <p className="text-sm text-gray-600">View past invoices and receipts</p>
            </button>

            {/* Support/Help */}
            <button className="bg-white rounded-xl p-6 border-2 border-gray-200 hover:border-[#4A90E2] hover:shadow-md transition-all duration-200 text-left group">
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 bg-gray-100 group-hover:bg-blue-50 rounded-lg flex items-center justify-center transition-colors">
                  <svg className="w-5 h-5 text-gray-600 group-hover:text-[#4A90E2]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                </div>
                <svg className="w-5 h-5 text-gray-400 group-hover:text-[#4A90E2]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-1">Help & Support</h3>
              <p className="text-sm text-gray-600">Get help with your subscription</p>
            </button>
          </div>
          </div>

          {/* Footer Note */}
          <div className="text-center pt-4 space-y-1">
            <p className="text-xs text-gray-400">
              Signed in as <span className="font-medium text-gray-500">{user.email}</span>
            </p>
            <p className="text-xs text-gray-400">
              Secure payment processing powered by Stripe
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

