"use client"

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { createClient } from '@/lib/supabase/client';

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    // Check if we have a session (user clicked the reset link)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        setError('Invalid or expired reset link. Please request a new one.');
      }
    });
  }, [supabase]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      if (password.length < 6) {
        setError('Password must be at least 6 characters');
        setLoading(false);
        return;
      }

      const { error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) throw error;

      setSuccess('Password updated successfully! Redirecting to sign in...');
      
      // Sign out and redirect to sign in
      setTimeout(async () => {
        await supabase.auth.signOut();
        router.push('/sign-in');
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FEFEFD] flex items-center justify-center px-6 py-12">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl text-center">
            Set New Password
          </CardTitle>
        </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-900 mb-1">
                  New Password
                </label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  disabled={loading}
                  minLength={6}
                />
              </div>

              {error && (
                <div className="p-3 rounded-md bg-red-50 border border-red-200">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              )}

              {success && (
                <div className="p-3 rounded-md bg-green-50 border border-green-200">
                  <p className="text-sm text-green-800">{success}</p>
                </div>
              )}

              <Button 
                type="submit" 
                className="w-full bg-[#4A90E2] hover:bg-[#3a7bc8] cursor-pointer"
                disabled={loading}
              >
                {loading ? 'Updating...' : 'Update Password'}
              </Button>

              <div className="text-center">
                <Link 
                  href="/sign-in" 
                  className="text-sm text-[#4A90E2] hover:underline"
                >
                  Back to sign in
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
    </div>
  );
}

