"use client"

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { createClient } from '@/lib/supabase/client';

export default function SignInPage() {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const router = useRouter();
  const supabase = createClient();

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      // Redirect to dashboard on successful sign in
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'An error occurred during sign in');
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
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

      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) throw error;

      setSuccess('Account created! Please check your email to verify your account.');
      setEmail('');
      setPassword('');
    } catch (err: any) {
      setError(err.message || 'An error occurred during sign up');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = mode === 'signin' ? handleSignIn : handleSignUp;

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-6 py-12">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl text-center">
            {mode === 'signin' ? 'Welcome Back' : 'Create Account'}
          </CardTitle>
        </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-900 mb-1">
                  Email
                </label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  disabled={loading}
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-900 mb-1">
                  Password
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

              {mode === 'signin' ? (
                <div className="space-y-2">
                  <div className="text-center">
                    <Link 
                      href="/forgot-password" 
                      className="text-sm text-[#4A90E2] hover:underline"
                    >
                      Forgot password?
                    </Link>
                  </div>
                  <div className="text-center">
                    <span className="text-sm text-gray-600">
                      Don't have an account?{' '}
                      <button
                        type="button"
                        onClick={() => {
                          setMode('signup');
                          setError('');
                          setSuccess('');
                        }}
                        className="text-[#4A90E2] hover:underline cursor-pointer"
                        disabled={loading}
                      >
                        Sign up
                      </button>
                    </span>
                  </div>
                </div>
              ) : (
                <div className="text-center">
                  <span className="text-sm text-gray-600">
                    Already have an account?{' '}
                    <button
                      type="button"
                      onClick={() => {
                        setMode('signin');
                        setError('');
                        setSuccess('');
                      }}
                      className="text-[#4A90E2] hover:underline cursor-pointer"
                      disabled={loading}
                    >
                      Sign in
                    </button>
                  </span>
                </div>
              )}

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
                {loading 
                  ? (mode === 'signin' ? 'Signing in...' : 'Creating account...') 
                  : (mode === 'signin' ? 'Sign In' : 'Sign Up')}
              </Button>
            </form>
          </CardContent>
        </Card>
    </div>
  );
}

