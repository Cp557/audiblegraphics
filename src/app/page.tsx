"use client"

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import logo from "../../public/logo.png";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import LottieButton from "@/components/LottieButton";
import { createClient } from '@/lib/supabase/client';
import Header from "@/components/Header";
import PricingCard from "@/components/PricingCard";
 

const HomePage = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userEmail, setUserEmail] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    
    // Check initial session
    supabase.auth.getSession().then((response: any) => {
      setIsLoggedIn(!!response.data.session);
      setUserEmail(response.data.session?.user?.email);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: string, session: any) => {
      setIsLoggedIn(!!session);
      setUserEmail(session?.user?.email);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleHover = (
    e: React.MouseEvent<HTMLDivElement>,
    entering: boolean,
    label: string
  ) => {
    const el = e.currentTarget as HTMLDivElement
    if (entering) {
      el.style.transition = 'transform 160ms ease-out, box-shadow 160ms ease-out'
      el.style.transform = 'translateY(-3px)'
      el.style.boxShadow = '0 8px 14px -8px rgba(0,0,0,0.15)'
    } else {
      el.style.transform = ''
      el.style.boxShadow = ''
      el.style.outline = ''
    }
  }
  return (
    <div className="min-h-screen bg-[#FEFEFD]">
      <Header rightContent={
        !loading && (
          <Link href={isLoggedIn ? "/dashboard" : "/sign-in"}>
            <Button className="h-9 px-6 text-base">
              {isLoggedIn ? "Dashboard" : "Sign In"}
            </Button>
          </Link>
        )
      } />

      <main>
        {/* Hero Section */}
        <section className="pt-16 pb-16 bg-[#FEFEFD]">
          <div className="max-w-5xl mx-auto px-6 flex flex-col items-center justify-center text-center">
            <Badge variant="outline" className="mb-4 bg-white">Mobile App</Badge>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Transform your life in 90 days.</h2>
            <div className="flex flex-wrap gap-10 justify-center mt-10">
              <Link href="https://www.apple.com/app-store/" target="_blank" rel="noopener noreferrer">
                <div className="h-12 overflow-hidden flex items-center my-2 rounded-lg">
                  <Image src="/apple.svg" alt="Download on the App Store" width={180} height={54} className="block" />
                </div>
              </Link>
              <Link href="https://play.google.com/store/apps?hl=en_US" target="_blank" rel="noopener noreferrer">
                <div className="h-12 overflow-hidden flex items-center my-2 rounded-lg">
                  <Image src="/google.svg" alt="Get it on Google Play" width={180} height={54} className="block" />
                </div>
              </Link>
            </div>
          </div>
        </section>

        <div className="max-w-5xl mx-auto border-t border-gray-200" />


        {/* Features Section */}
        <section id="features" className="py-16">
          <div className="max-w-5xl mx-auto px-6">
            <div className="text-center mb-14">
              <Badge variant="outline" className="mb-4 bg-white">Features</Badge>
              <h2 className="text-3xl font-bold text-gray-900 mb-4">Everything You Need to Succeed</h2>
            </div>
            
            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
              <Card className="transform-gpu will-change-transform" onMouseEnter={(e) => handleHover(e, true, 'Features - Definite Chief Aim')} onMouseLeave={(e) => handleHover(e, false, 'Features - Definite Chief Aim')}>
                <CardHeader>
                  <CardTitle>Definite Chief Aim</CardTitle>
                  <CardDescription className="mt-2">
                    Set and focus on your most important 90-day definite chief aim.
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card className="transform-gpu will-change-transform" onMouseEnter={(e) => handleHover(e, true, 'Features - Daily Critical Tasks')} onMouseLeave={(e) => handleHover(e, false, 'Features - Daily Critical Tasks')}>
                <CardHeader>
                  <CardTitle>Daily Critical Tasks</CardTitle>
                  <CardDescription className="mt-2">
                    Complete 3 essential daily tasks that move you closer to achieving your chief aim.
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card className="transform-gpu will-change-transform" onMouseEnter={(e) => handleHover(e, true, 'Features - Progress Tracker')} onMouseLeave={(e) => handleHover(e, false, 'Features - Progress Tracker')}>
                <CardHeader>
                  <CardTitle>Progress Tracker</CardTitle>
                  <CardDescription className="mt-2">
                    Visualize your 90-day journey with an intuitive progress tracking system.
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card className="transform-gpu will-change-transform" onMouseEnter={(e) => handleHover(e, true, 'Features - Meet Alfie')} onMouseLeave={(e) => handleHover(e, false, 'Features - Meet Alfie')}>
                <CardHeader>
                  <CardTitle>Alfie</CardTitle>
                  <CardDescription className="mt-2">
                    Your AI accountability partner with daily check-ins to keep you on track.
                  </CardDescription>
                </CardHeader>
              </Card>
            </div>
          </div>
        </section>

        <div className="max-w-5xl mx-auto border-t border-gray-200" />


        {/* Benefits Section */}
        <section className="py-16">
          <div className="max-w-5xl mx-auto px-6">
            <div className="text-center mb-14">
              <Badge variant="outline" className="mb-4 bg-white">Benefits</Badge>
              <h2 className="text-3xl font-bold text-gray-900 mb-4">Why Choose Aim90?</h2>
            </div>
            
            <div className="grid gap-6 sm:grid-cols-1 md:grid-cols-3">
              <Card className="transform-gpu will-change-transform" onMouseEnter={(e) => handleHover(e, true, 'Benefits - Proven Framework')} onMouseLeave={(e) => handleHover(e, false, 'Benefits - Proven Framework')}>
                <CardHeader className="pb-1">
                  <CardTitle className="text-lg">Proven Framework</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600">
                    Built on timeless principles from Napoleon Hill's "Think and Grow Rich," adapted for modern goal achievement.
                  </p>
                </CardContent>
              </Card>

              <Card className="transform-gpu will-change-transform" onMouseEnter={(e) => handleHover(e, true, 'Benefits - AI Accountability Partner')} onMouseLeave={(e) => handleHover(e, false, 'Benefits - AI Accountability Partner')}>
                <CardHeader className="pb-1">
                  <CardTitle className="text-lg">AI Accountability Partner</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600">
                    Alfie, your AI accountability partner, provides personalized check-ins and keeps you motivated throughout your 90-day journey.
                  </p>
                </CardContent>
              </Card>

              <Card className="transform-gpu will-change-transform" onMouseEnter={(e) => handleHover(e, true, 'Benefits - Focus on What Matters')} onMouseLeave={(e) => handleHover(e, false, 'Benefits - Focus on What Matters')}>
                <CardHeader className="pb-1">
                  <CardTitle className="text-lg">Focus on What Matters</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600">
                    Stay laser-focused on your single most important goal with daily tasks designed to drive meaningful progress.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        <div className="max-w-5xl mx-auto border-t border-gray-200" />

        {/* Philosophy Section */}
        <section className="py-16">
          <div className="max-w-5xl mx-auto px-6">
            <div className="text-center mb-8">
              <Badge variant="outline" className="mb-4 bg-white">Philosophy</Badge>
              <h2 className="text-3xl font-bold text-gray-900 mb-8">The Science of Achievement</h2>
            </div>

            <div className="max-w-3xl mx-auto space-y-6 text-gray-700 text-center">
              <p className="text-base leading-relaxed">
                Napoleon Hill studied 500 of the most successful people in history and found one common thread: they all had a definite chief aim backed by an intense burning desire to achieve it. They were extremely clear on WHAT they wanted and WHY they wanted it.
              </p>

              <blockquote className="py-2 italic text-gray-800 mx-auto max-w-2xl">
                "The starting point of all achievement is DESIRE. Keep this constantly in mind. Weak desire brings weak results, just as a small fire makes a small amount of heat." - Napoleon Hill
              </blockquote>

              <p className="text-base leading-relaxed">
                This is where Alfie, your AI accountability partner, comes in. Through daily check-ins, Alfie helps you develop and maintain that burning desire.
              </p>
            </div>
          </div>
        </section>

        <div className="max-w-5xl mx-auto border-t border-gray-200" />

        {/* Alfie Section */}
        <section id="alfie" className="pt-16 pb-6">
          <div className="max-w-5xl mx-auto px-6">
            <div className="text-center mb-6">
              <Badge variant="outline" className="mb-4 bg-white">Alfie</Badge>
              <h2 className="text-3xl font-bold text-gray-900 mb-4">Your AI Accountability Partner</h2>
            </div>
            <div className="flex justify-center mb-4">
              <LottieButton src="/ai_ball.json" width={260} height={260} className="cursor-pointer" audioSrc="/alfie_message.mp3" />
            </div>
            <p className="text-center text-sm text-gray-500 mt-1">Press the ball to hear Alfie's message.</p>
          </div>
        </section>

        <div className="max-w-5xl mx-auto border-t border-gray-200" />

        {/* Pricing Section */}
        <section id="pricing" className="py-16">
          <div className="max-w-5xl mx-auto px-6 text-center mb-10">
            <Badge variant="outline" className="mb-6 bg-white">Pricing</Badge>
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Choose Your Plan</h2>
          </div>

          <div className="max-w-5xl mx-auto px-6">
            <PricingCard isLoggedIn={isLoggedIn} userEmail={userEmail} />
          </div>
        </section>

    </main>

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
              <Button asChild variant="link" className="text-xs text-gray-500 hover:text-[#4A90E2]">
                <a href="mailto:contact@aim90.org" className="footer-link">Contact</a>
              </Button>
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
};

export default HomePage;