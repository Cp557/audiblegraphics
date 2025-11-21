"use client"

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import logo from "../../public/logo.png";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { createClient } from '@/lib/supabase/client';
import Header from "@/components/Header";
import PricingCards from "@/components/PricingCards";
 

const HomePage = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userEmail, setUserEmail] = useState<string | undefined>(undefined);
  const [subscriptionTier, setSubscriptionTier] = useState<'Pro' | 'Ultra' | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    
    const fetchSubscription = async (userId: string) => {
      const { data } = await supabase
        .from('main_table')
        .select('subscription_tier')
        .eq('user_id', userId)
        .single();
      setSubscriptionTier(data?.subscription_tier as 'Pro' | 'Ultra' | null);
    };

    // Check initial session
    supabase.auth.getSession().then((response: any) => {
      const session = response.data.session;
      setIsLoggedIn(!!session);
      setUserEmail(session?.user?.email);
      if (session?.user) {
        fetchSubscription(session.user.id);
      }
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: string, session: any) => {
      setIsLoggedIn(!!session);
      setUserEmail(session?.user?.email);
      if (session?.user) {
        fetchSubscription(session.user.id);
      } else {
        setSubscriptionTier(null);
      }
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
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Generate Educational Slideshows in Seconds</h2>
            <p className="text-lg text-gray-600 max-w-2xl mt-4">
              Simply enter a topic/question, and AudibleSlides will generate a slideshow with engaging visuals and narration.
            </p>
          </div>
        </section>

        <div className="max-w-5xl mx-auto border-t border-gray-200" />


        {/* Features Section */}
        <section id="features" className="py-16">
          <div className="max-w-5xl mx-auto px-6">
            <div className="text-center mb-14">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">Features</h2>
            </div>
            
            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
              <Card className="transform-gpu will-change-transform" onMouseEnter={(e) => handleHover(e, true, 'Features - Topic to Video')} onMouseLeave={(e) => handleHover(e, false, 'Features - Topic to Video')}>
                <CardHeader>
                  <CardTitle>Topic to Video</CardTitle>
                  <CardDescription className="mt-2">
                    Just type a topic or question, and AI generates a full presentation for you.
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card className="transform-gpu will-change-transform" onMouseEnter={(e) => handleHover(e, true, 'Features - AI Visuals & Script')} onMouseLeave={(e) => handleHover(e, false, 'Features - AI Visuals & Script')}>
                <CardHeader>
                  <CardTitle>AI Visuals & Script</CardTitle>
                  <CardDescription className="mt-2">
                    Automatically creates relevant visuals and a comprehensive narration script.
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card className="transform-gpu will-change-transform" onMouseEnter={(e) => handleHover(e, true, 'Features - Natural Narration')} onMouseLeave={(e) => handleHover(e, false, 'Features - Natural Narration')}>
                <CardHeader>
                  <CardTitle>Natural Narration</CardTitle>
                  <CardDescription className="mt-2">
                    High-quality AI voices bring your generated content to life.
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card className="transform-gpu will-change-transform" onMouseEnter={(e) => handleHover(e, true, 'Features - Edit & Export')} onMouseLeave={(e) => handleHover(e, false, 'Features - Edit & Export')}>
                <CardHeader>
                  <CardTitle>Edit & Export</CardTitle>
                  <CardDescription className="mt-2">
                    Review the generated content, tweak if needed, and download as HD video.
                  </CardDescription>
                </CardHeader>
              </Card>
            </div>
          </div>
        </section>

        <div className="max-w-5xl mx-auto border-t border-gray-200" />


        {/* About Section */}
        <section className="py-16">
          <div className="max-w-3xl mx-auto px-6 text-center">
            <div className="mb-4">
              <h2 className="text-3xl font-bold text-gray-900 mb-6">About</h2>
              
              <div className="space-y-6 text-lg text-gray-600 leading-relaxed">
                <p>
                  ChatGPT is a great tool for learning, but reading endless walls of plain text can get boring. AudibleSlides is a tool that makes learning more engaging, visual, and fun.
                </p>
                <p>
                  AudibleSlides was built to encourage extreme curiosity in the age of AI, transforming simple topics & questions into immersive audiovisual experiences.
                </p>
                
                <div className="pt-4 flex flex-col items-center">
                  <blockquote className="text-xl font-medium text-gray-900 italic max-w-lg">
                    &quot;Learning never exhausts the mind.&quot;
                  </blockquote>
                  <cite className="mt-3 text-sm text-gray-500 not-italic">— Leonardo da Vinci</cite>
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="max-w-5xl mx-auto border-t border-gray-200" />

        {/* Pricing Section */}
        <section id="pricing" className="py-16">
          <div className="max-w-5xl mx-auto px-6 text-center mb-10">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Pricing</h2>
          </div>

          <div className="max-w-5xl mx-auto px-6">
            <PricingCards isLoggedIn={isLoggedIn} userEmail={userEmail} subscriptionTier={subscriptionTier} />
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
                    alt="AudibleSlides Logo" 
                    fill
                    style={{ objectFit: 'contain' }}
                  />
                </div>
                <span className="ml-2 text-base font-semibold text-gray-900">
                  AudibleSlides
                </span>
              </Link>
            </div>
            
            <div className="flex space-x-3">
              <Link href="/terms" target="_blank" rel="noopener noreferrer" className="footer-link">
                <Button variant="link" className="text-xs text-gray-500 hover:text-[#4A90E2]">Terms of Service</Button>
              </Link>
              <Link href="/privacy" target="_blank" rel="noopener noreferrer" className="footer-link">
                <Button variant="link" className="text-xs text-gray-500 hover:text-[#4A90E2]">Privacy</Button>
              </Link>
              <span className="inline-flex items-center justify-center h-9 px-4 py-2 rounded-md text-xs font-medium text-gray-500 cursor-default select-text">
                Contact@audibleslides.com
              </span>
            </div>
          </div>

          <div className="text-center mt-8">
            <p className="text-xs text-gray-500">
              &copy; {new Date().getFullYear()} AudibleSlides. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;