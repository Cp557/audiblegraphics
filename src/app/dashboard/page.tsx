import { redirect } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import logo from "../../../public/logo.png";
import { createClient } from '@/lib/supabase/server';
import { Button } from "@/components/ui/button";

export default async function DashboardPage() {
  const supabase = await createClient();
  
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    redirect('/sign-in');
  }

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
          </div>

          {/* Action Buttons Grid */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* Primary CTA - Subscribe */}
            <div className="md:col-span-2">
              <button className="w-full bg-gradient-to-r from-[#4A90E2] to-[#357ABD] text-white rounded-xl p-6 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200">
                <div className="flex items-center justify-center space-x-3">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                  </svg>
                  <span className="text-xl font-semibold">Upgrade to Premium</span>
                </div>
                <p className="text-blue-100 text-sm mt-2">Unlock all features • Cancel anytime</p>
              </button>
            </div>

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

