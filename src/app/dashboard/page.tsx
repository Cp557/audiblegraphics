import { redirect } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import logo from "../../../public/logo.png";
import { Button } from "@/components/ui/button";
import { createClient } from '@/lib/supabase/server';

export default async function DashboardPage() {
  const supabase = await createClient();
  
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    redirect('/sign-in');
  }

  return (
    <div className="min-h-screen bg-[#F5F5F5] flex flex-col">
      {/* Header */}
      <header className="bg-white py-4 border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-6">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center">
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
            <form action="/api/auth/signout" method="post">
              <Button 
                type="submit"
                variant="outline"
                className="text-sm"
              >
                Sign Out
              </Button>
            </form>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="text-center space-y-6">
          <h1 className="text-4xl font-bold text-gray-900">
            Welcome to Aim90
          </h1>
          <p className="text-lg text-gray-600">
            You&apos;re signed in as <span className="font-medium text-[#4A90E2]">{user.email}</span>
          </p>
          <div className="pt-4">
            <p className="text-gray-500">
              Dashboard functionality coming soon...
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

