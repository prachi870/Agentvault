'use client';

import { motion } from 'framer-motion';
import { Upload, Cpu, MessageSquare, CheckCircle, ArrowRight } from 'lucide-react';
import { scrollReveal, staggerContainer } from '@/lib/animations';

export default function HowItWorksSection() {
  const steps = [
    {
      number: '01',
      icon: Upload,
      title: 'Upload Documents',
      description: 'Upload employee handbooks, contracts, policies, reports, or any business documents. Supports PDF, DOCX, XLSX, and more.',
      color: 'from-landing-violet to-landing-blue',
    },
    {
      number: '02',
      icon: Cpu,
      title: 'AI Processes & Indexes',
      description: 'Agentvault prepares supported documents for semantic search so their contents can be retrieved when you ask a question.',
      color: 'from-landing-blue to-landing-cyan',
    },
    {
      number: '03',
      icon: MessageSquare,
      title: 'Ask Questions',
      description: 'Ask questions in natural language, just like talking to a colleague. No complex queries or search syntax required.',
      color: 'from-landing-cyan to-landing-blue',
    },
    {
      number: '04',
      icon: CheckCircle,
      title: 'Review Cited Answers',
      description: 'Get an answer with supporting source information, then review the cited material in context.',
      color: 'from-landing-blue to-landing-violet',
    },
  ];

  return (
    <section id="how-it-works" className="section-spacing relative">
      <div className="text-center mb-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="inline-block mb-3"
        >
          <div className="landing-badge">
            <Cpu className="w-3.5 h-3.5" />
            <span>How It Works</span>
          </div>
        </motion.div>

        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
          className="display-lg mb-3"
        >
          <span className="gradient-text-hero">Four Simple Steps</span>
          <br />
          <span className="text-landing-text-primary">to Intelligent Search</span>
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
          className="text-lg text-landing-text-secondary max-w-3xl mx-auto"
        >
          Add documents, ask questions in plain language, and inspect the sources behind each response.
        </motion.p>
      </div>

      {/* Steps Grid */}
      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
        variants={staggerContainer}
        className="grid grid-cols-1 lg:grid-cols-4 gap-6 relative"
      >
        {steps.map((step, index) => {
          const Icon = step.icon;
          
          return (
            <motion.div
              key={step.number}
              variants={scrollReveal}
              className="relative"
            >
              {/* Connector Line */}
              {index < steps.length - 1 && (
                <div className="hidden lg:block absolute top-20 left-[calc(50%+2rem)] w-[calc(100%-4rem)] h-px">
                  <motion.div
                    initial={{ scaleX: 0 }}
                    whileInView={{ scaleX: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.5 + index * 0.2, duration: 0.6 }}
                    className="h-full origin-left"
                    style={{
                      background: 'linear-gradient(90deg, rgba(86, 217, 181, 0.5), rgba(106, 174, 255, 0.5))',
                    }}
                  />
                  <motion.div
                    animate={{ x: [0, 20, 0] }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                    className="absolute right-0 top-1/2 -translate-y-1/2"
                  >
                    <ArrowRight className="w-4 h-4 text-landing-blue" />
                  </motion.div>
                </div>
              )}

              {/* Step Card */}
              <motion.div
                whileHover={{ y: -8, scale: 1.02 }}
                className="card card-hover h-full relative overflow-hidden group"
              >
                {/* Step Number */}
                <div className="absolute top-4 right-4 text-5xl font-bold opacity-5 group-hover:opacity-10 transition-opacity">
                  {step.number}
                </div>

                {/* Icon */}
                <motion.div
                  whileHover={{ scale: 1.1, rotate: 5 }}
                  className={`inline-flex p-3 rounded-xl bg-gradient-to-br ${step.color} mb-4 relative`}
                >
                  <Icon className="w-6 h-6 text-white" />
                  
                  {/* Icon glow */}
                  <div className={`absolute inset-0 rounded-xl bg-gradient-to-br ${step.color} blur-xl opacity-50 group-hover:opacity-75 transition-opacity`} />
                </motion.div>

                {/* Content */}
                <div className="relative z-10">
                  <h3 className="h4 mb-2">
                    {step.title}
                  </h3>
                  <p className="text-sm text-landing-text-secondary leading-relaxed">
                    {step.description}
                  </p>
                </div>

                {/* Bottom accent */}
                <div className={`absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r ${step.color} opacity-0 group-hover:opacity-100 transition-opacity`} />
              </motion.div>
            </motion.div>
          );
        })}
      </motion.div>

      {/* Bottom CTA */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ delay: 0.8 }}
        className="mt-12 text-center"
      >
        <p className="text-landing-text-secondary mb-4 text-sm">
          Ready to get started?
        </p>
        <motion.a
          href="/signup"
          whileHover={{ scale: 1.05, y: -2 }}
          whileTap={{ scale: 0.95 }}
          className="btn btn-primary btn-lg inline-flex gap-2"
        >
          <span>Try Agentvault</span>
          <ArrowRight className="w-4 h-4" />
        </motion.a>
      </motion.div>
    </section>
  );
}
