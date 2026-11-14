'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, FileText, CheckCircle, Sparkles } from 'lucide-react';
import { scrollReveal } from '@/lib/animations';

export default function DemoSection() {
  const [currentDemo, setCurrentDemo] = useState(0);

  const demos = [
    {
      question: 'What are our vacation policies?',
      answer: 'Based on the Employee Handbook, full-time employees receive 15 days of paid vacation per year during their first year, increasing to 20 days after 3 years of service. Vacation time accrues monthly and can be carried over up to 5 days into the next calendar year.',
      sources: [
        { name: 'Employee_Handbook.pdf', page: 24, confidence: 94 },
        { name: 'HR_Policies_2024.pdf', page: 12, confidence: 87 },
      ],
      category: 'HR Policy',
    },
    {
      question: 'How do I submit an expense report?',
      answer: 'To submit an expense report: 1) Log into the finance portal at finance.company.com, 2) Click "New Expense Report", 3) Upload receipts (required for amounts over $25), 4) Select the appropriate expense category, and 5) Submit for manager approval. Reports must be submitted within 30 days of the expense.',
      sources: [
        { name: 'Finance_Procedures.docx', page: 8, confidence: 96 },
        { name: 'Employee_Handbook.pdf', page: 45, confidence: 89 },
      ],
      category: 'Finance',
    },
    {
      question: 'What is our data retention policy?',
      answer: 'Customer data is retained for 7 years after account closure per regulatory requirements. Transaction logs are kept for 5 years. Marketing data is retained for 2 years unless the user opts out. All data is encrypted at rest and in transit, with automatic deletion after the retention period.',
      sources: [
        { name: 'Data_Governance_Policy.pdf', page: 15, confidence: 98 },
        { name: 'Legal_Compliance_Guide.pdf', page: 32, confidence: 91 },
      ],
      category: 'Compliance',
    },
  ];

  const currentDemoData = demos[currentDemo];

  return (
    <section id="demo" className="section-spacing relative">
      <div className="text-center mb-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="inline-block mb-3"
        >
          <div className="landing-badge">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Interactive demo · sample data</span>
          </div>
        </motion.div>

        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
          className="display-lg mb-3"
        >
          <span className="text-landing-text-primary">See</span>{' '}
          <span className="gradient-text-hero">Agentvault</span>{' '}
          <span className="text-landing-text-primary">in Action</span>
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
          className="text-lg text-landing-text-secondary max-w-3xl mx-auto"
        >
          Ask questions in plain English and get precise answers with citations
        </motion.p>
      </div>

      {/* Demo Tabs */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="flex flex-wrap justify-center gap-3 mb-6"
      >
        {demos.map((demo, index) => (
          <motion.button
            key={index}
            onClick={() => setCurrentDemo(index)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-all ${
              currentDemo === index
                ? 'bg-gradient-to-r from-landing-violet to-landing-blue text-white shadow-lg'
                : 'landing-glass text-landing-text-secondary hover:text-landing-text-primary'
            }`}
          >
            {demo.category}
          </motion.button>
        ))}
      </motion.div>

      {/* Demo Interface */}
      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.3 }}
        variants={scrollReveal}
        className="max-w-5xl mx-auto"
      >
        <div className="landing-glass rounded-2xl p-6 md:p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentDemo}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              {/* Question */}
              <div className="mb-6">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-landing-violet to-landing-blue flex items-center justify-center">
                    <Send className="w-4 h-4 text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="text-xs text-landing-text-muted mb-1.5">Your Question</div>
                    <div className="text-base font-semibold text-landing-text-primary">
                      {currentDemoData.question}
                    </div>
                  </div>
                </div>
              </div>

              {/* Processing indicator */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center gap-2.5 text-landing-text-secondary mb-6 pl-11"
              >
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                  className="w-3.5 h-3.5 border-2 border-landing-violet border-t-transparent rounded-full"
                />
                <span className="text-xs">Searching across 156 documents...</span>
              </motion.div>

              {/* Answer */}
              <div className="mb-6">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-landing-cyan to-landing-blue flex items-center justify-center">
                    <CheckCircle className="w-4 h-4 text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="text-xs text-landing-text-muted mb-1.5">AI Answer</div>
                    <div className="text-base text-landing-text-primary leading-relaxed">
                      {currentDemoData.answer}
                    </div>
                  </div>
                </div>
              </div>

              {/* Sources */}
              <div className="pl-11">
                <div className="text-sm font-semibold text-landing-text-primary mb-3">
                  Sources ({currentDemoData.sources.length})
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {currentDemoData.sources.map((source, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.2 + idx * 0.1 }}
                      whileHover={{ scale: 1.02, x: 4 }}
                      className="landing-glass-hover rounded-xl p-3.5 cursor-pointer"
                    >
                      <div className="flex items-start gap-2.5">
                        <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-gradient-to-br from-landing-blue to-landing-cyan flex items-center justify-center">
                          <FileText className="w-4 h-4 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-semibold text-landing-text-primary truncate mb-1">
                            {source.name}
                          </div>
                          <div className="flex items-center justify-between text-xs text-landing-text-muted">
                            <span>Page {source.page}</span>
                            <div className="flex items-center gap-1">
                              <div className="w-12 h-1.5 bg-black/20 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-gradient-to-r from-landing-cyan to-landing-blue rounded-full"
                                  style={{ width: `${source.confidence}%` }}
                                />
                              </div>
                              <span className="font-semibold text-landing-cyan">{source.confidence}%</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Response time */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="mt-5 pl-11 text-xs text-landing-text-muted"
              >
                ⚡ Response time: <span className="text-landing-cyan font-semibold">1.8 seconds</span>
              </motion.div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* CTA below demo */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4 }}
          className="text-center mt-8"
        >
          <p className="text-landing-text-secondary mb-4 text-sm">
            Try it with your own documents
          </p>
          <motion.a
            href="/signup"
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.95 }}
            className="btn btn-primary btn-lg inline-flex gap-2"
          >
            <span>Start Free Trial</span>
            <Sparkles className="w-4 h-4" />
          </motion.a>
        </motion.div>
      </motion.div>
    </section>
  );
}
