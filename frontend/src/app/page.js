'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getToken } from '@/lib/api';
import AtmosphericBackground from '@/components/landing/AtmosphericBackground';
import HeroSection from '@/components/landing/HeroSection';
import FeatureStrip from '@/components/landing/FeatureStrip';
import HowItWorksSection from '@/components/landing/HowItWorksSection';
import FeaturesBento from '@/components/landing/FeaturesBento';
import DemoSection from '@/components/landing/DemoSection';
import CTASection from '@/components/landing/CTASection';
import LandingFooter from '@/components/landing/LandingFooter';

export default function LandingPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to dashboard if already logged in
    if (getToken()) {
      router.push('/dashboard');
    }
  }, [router]);

  return (
    <div className="relative overflow-x-hidden">
      {/* Atmospheric Background */}
      <AtmosphericBackground />

      {/* Hero Section */}
      <HeroSection />

      {/* Feature Highlight Strip */}
      <FeatureStrip />

      {/* How It Works */}
      <HowItWorksSection />

      {/* Features Bento Grid */}
      <FeaturesBento />

      {/* Interactive Demo */}
      <DemoSection />

      {/* Final CTA */}
      <CTASection />

      {/* Footer */}
      <LandingFooter />
    </div>
  );
}
