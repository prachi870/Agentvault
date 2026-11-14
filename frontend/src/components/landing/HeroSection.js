'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { ArrowRight, Play, Sparkles, Zap, Shield, Clock } from 'lucide-react';
import KnowledgeVault3D from './KnowledgeVault3D';
import { fadeInUp, staggerContainer } from '@/lib/animations';

export default function HeroSection() {
  const handleWatchDemo = () => {
    const demoSection = document.querySelector('#demo');
    if (demoSection) {
      demoSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section className="relative min-h-screen flex items-center pt-32 sm:pt-36 pb-16 px-4 sm:px-6">
      <div className="container">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <motion.div
            initial="initial"
            animate="animate"
            variants={staggerContainer}
            className="relative z-10"
          >
            {/* Animated Badge */}
            <motion.div
              variants={fadeInUp}
              whileHover={{ scale: 1.05 }}
              className="inline-block mb-6"
            >
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold bg-accent-primary/10 border border-accent-primary/30 text-accent-primary backdrop-blur-sm">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                </motion.div>
                <span>Evidence-first enterprise knowledge</span>
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="w-1.5 h-1.5 rounded-full bg-accent-tertiary"
                />
              </div>
            </motion.div>

            {/* Main Heading */}
            <motion.h1
              variants={fadeInUp}
              className="display-xl mb-6"
            >
              <span className="block text-primary">Your knowledge,</span>
              <span className="block gradient-text mt-2">secured.</span>
              <span className="block text-primary mt-2">Answers, verified.</span>
            </motion.h1>

            {/* Supporting Text */}
            <motion.p
              variants={fadeInUp}
              className="text-lg text-secondary mb-8 max-w-2xl"
            >
              Bring together the documents your team trusts. Ask questions in natural language and get{' '}
              <span className="text-primary font-semibold">
                precise answers with citations
              </span>{' '}
              in seconds.
            </motion.p>

            {/* Stats Bar */}
            <motion.div
              variants={fadeInUp}
              className="card mb-8 grid grid-cols-3 gap-6"
            >
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <Zap className="w-4 h-4 text-accent-primary" />
                  <div className="text-2xl font-bold gradient-text">
                    Cited
                  </div>
                </div>
                <div className="text-caption text-muted">
                  Answers grounded in sources
                </div>
              </div>

              <div className="text-center border-x border-border-subtle">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <Shield className="w-4 h-4 text-accent-secondary" />
                  <div className="text-2xl font-bold gradient-text">
                    Scoped
                  </div>
                </div>
                <div className="text-caption text-muted">
                  Access-aware retrieval
                </div>
              </div>

              <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <Clock className="w-4 h-4 text-accent-tertiary" />
                  <div className="text-2xl font-bold gradient-text">
                    Signed
                  </div>
                </div>
                <div className="text-caption text-muted">
                  Verifiable receipts
                </div>
              </div>
            </motion.div>

            {/* CTA Buttons */}
            <motion.div
              variants={fadeInUp}
              className="flex flex-wrap gap-3"
            >
              <Link href="/signup">
                <motion.button
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  className="btn btn-primary btn-lg"
                >
                  <span>Explore Agentvault</span>
                  <motion.div
                    className="flex items-center"
                    animate={{ x: [0, 4, 0] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  >
                    <ArrowRight className="w-4 h-4" />
                  </motion.div>
                </motion.button>
              </Link>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleWatchDemo}
                className="btn btn-secondary btn-lg"
              >
                <motion.div
                  whileHover={{ scale: 1.1 }}
                  className="flex items-center justify-center w-6 h-6 rounded-full bg-gradient-to-br from-accent-primary to-accent-secondary"
                >
                  <Play className="w-3 h-3 text-white ml-0.5" fill="white" />
                </motion.div>
                <span>Watch Demo</span>
              </motion.button>
            </motion.div>

            {/* Trust Indicators */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1 }}
              className="mt-8 flex flex-wrap items-center gap-4 text-caption text-muted"
            >
              <div className="flex items-center gap-1.5">
                <svg className="w-4 h-4 text-accent-success" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>Answers link back to evidence</span>
              </div>
              <div className="flex items-center gap-1.5">
                <svg className="w-4 h-4 text-accent-success" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>Access rules apply at retrieval</span>
              </div>
              <div className="flex items-center gap-1.5">
                <svg className="w-4 h-4 text-accent-success" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>Receipts preserve the audit trail</span>
              </div>
            </motion.div>
          </motion.div>

          {/* Right 3D Visualization */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, x: 50 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            transition={{ delay: 0.3, duration: 1, ease: [0.4, 0, 0.2, 1] }}
            className="relative hidden lg:block"
          >
            <div className="h-[500px]">
              <KnowledgeVault3D />
            </div>
            
            {/* Decorative Glow */}
            <div className="absolute inset-0 bg-gradient-to-br from-accent-primary/20 via-accent-secondary/20 to-accent-tertiary/20 blur-3xl -z-10" />
          </motion.div>
        </div>
      </div>

      {/* Scroll Indicator */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.5, duration: 0.8 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 hidden lg:block"
      >
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          className="flex flex-col items-center gap-2 cursor-pointer group"
          onClick={() => {
            const featuresSection = document.querySelector('#features');
            if (featuresSection) {
              featuresSection.scrollIntoView({ behavior: 'smooth' });
            }
          }}
        >
          <span className="text-caption text-muted group-hover:text-secondary transition-colors">
            Scroll to explore
          </span>
          <div className="w-5 h-8 border-2 border-glass-border rounded-full flex items-start justify-center p-1.5">
            <motion.div
              animate={{ y: [0, 10, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              className="w-1 h-1 rounded-full bg-gradient-to-b from-accent-primary to-accent-secondary"
            />
          </div>
        </motion.div>
      </motion.div>
    </section>
  );
}
