'use client';

import { motion } from 'framer-motion';
import { Search, Shield, Sparkles, Layers } from 'lucide-react';
import { scrollReveal, staggerContainer } from '@/lib/animations';

export default function FeatureStrip() {
  const features = [
    {
      icon: Search,
      title: 'Smart Search',
      description: 'Find information instantly',
      color: 'from-landing-violet to-landing-blue',
    },
    {
      icon: Shield,
      title: 'Secure & Reliable',
      description: 'Your data, always safe',
      color: 'from-landing-blue to-landing-cyan',
    },
    {
      icon: Sparkles,
      title: 'Powered by AI',
      description: 'Get accurate answers',
      color: 'from-landing-violet to-landing-cyan',
    },
    {
      icon: Layers,
      title: 'RAG Technology',
      description: 'Grounded in your knowledge',
      color: 'from-landing-cyan to-landing-blue',
    },
  ];

  return (
    <section className="relative z-10 py-12">
      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.3 }}
        variants={staggerContainer}
        className="landing-glass rounded-2xl p-6 md:p-8"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            
            return (
              <motion.div
                key={feature.title}
                variants={scrollReveal}
                className="relative group"
              >
                <div className="flex flex-col items-center text-center">
                  {/* Icon */}
                  <motion.div
                    whileHover={{ scale: 1.1, rotate: 5 }}
                    className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.color} p-3 mb-3 shadow-lg`}
                  >
                    <Icon className="w-full h-full text-white" />
                  </motion.div>

                  {/* Title */}
                  <h3 className="text-base font-bold text-landing-text-primary mb-1">
                    {feature.title}
                  </h3>

                  {/* Description */}
                  <p className="text-sm text-landing-text-secondary">
                    {feature.description}
                  </p>
                </div>

                {/* Separator (not on last item) */}
                {index < features.length - 1 && (
                  <div className="hidden lg:block absolute top-1/2 -right-4 w-px h-16 -translate-y-1/2 bg-gradient-to-b from-transparent via-landing-glass-border to-transparent" />
                )}

                {/* Hover glow effect */}
                <motion.div
                  className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10"
                  style={{
                    background: `radial-gradient(circle at center, ${
                      index % 3 === 0
                        ? 'rgba(86, 217, 181, 0.15)'
                        : index % 3 === 1
                        ? 'rgba(106, 174, 255, 0.15)'
                        : 'rgba(169, 154, 255, 0.15)'
                    }, transparent 70%)`,
                  }}
                />
              </motion.div>
            );
          })}
        </div>
      </motion.div>
    </section>
  );
}
