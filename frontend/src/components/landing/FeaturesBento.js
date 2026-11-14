'use client';

import { motion } from 'framer-motion';
import { 
  Search, 
  MessageSquare, 
  FileText, 
  Database, 
  Lock, 
  Zap,
  TrendingUp,
  Users
} from 'lucide-react';
import { scrollReveal, cardHover } from '@/lib/animations';

export default function FeaturesBento() {
  const features = [
    {
      icon: Search,
      title: 'Intelligent Document Retrieval',
      description: 'Advanced semantic search finds exactly what you need, even when you don\'t know the exact keywords.',
      size: 'large',
      color: 'from-landing-violet to-landing-blue',
    },
    {
      icon: MessageSquare,
      title: 'Context-Aware AI Responses',
      description: 'Get answers that understand context and nuance, not just keyword matches.',
      size: 'small',
      color: 'from-landing-blue to-landing-cyan',
    },
    {
      icon: FileText,
      title: 'Source Citations',
      description: 'Every answer includes exact page numbers and document references for verification.',
      size: 'small',
      color: 'from-landing-cyan to-landing-violet',
    },
    {
      icon: Database,
      title: 'Knowledge Base Management',
      description: 'Organize, tag, and manage thousands of documents with smart categorization and bulk operations.',
      size: 'medium',
      color: 'from-landing-violet to-landing-cyan',
    },
    {
      icon: Lock,
      title: 'Secure Access Control',
      description: 'Role-based permissions with four security levels: Public, Internal, Confidential, and Restricted.',
      size: 'medium',
      color: 'from-landing-blue to-landing-violet',
    },
    {
      icon: Zap,
      title: 'Lightning Fast',
      description: 'Sub-2-second response times powered by optimized indexing.',
      size: 'small',
      color: 'from-landing-cyan to-landing-blue',
    },
    {
      icon: TrendingUp,
      title: 'Analytics Dashboard',
      description: 'Track queries, accuracy, usage patterns, and system performance in real-time.',
      size: 'small',
      color: 'from-landing-violet to-landing-blue',
    },
    {
      icon: Users,
      title: 'Team Collaboration',
      description: 'Share knowledge bases, collaborate on documents, and maintain consistent answers across your organization.',
      size: 'large',
      color: 'from-landing-blue to-landing-cyan',
    },
  ];

  return (
    <section id="features" className="section-spacing relative">
      <div className="text-center mb-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="inline-block mb-3"
        >
          <div className="landing-badge">
            <Zap className="w-3.5 h-3.5" />
            <span>Features</span>
          </div>
        </motion.div>

        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
          className="display-lg mb-3"
        >
          <span className="text-landing-text-primary">Everything You Need for</span>
          <br />
          <span className="gradient-text-hero">Document Intelligence</span>
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
          className="text-lg text-landing-text-secondary max-w-3xl mx-auto"
        >
          Enterprise-grade features that transform how your team accesses and uses information
        </motion.p>
      </div>

      {/* Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {features.map((feature, index) => {
          const Icon = feature.icon;
          const gridClass = 
            feature.size === 'large' 
              ? 'md:col-span-2 md:row-span-2' 
              : feature.size === 'medium'
              ? 'md:col-span-2'
              : 'md:col-span-1';

          return (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ delay: index * 0.1 }}
              className={gridClass}
            >
              <motion.div
                whileHover="hover"
                initial="rest"
                variants={cardHover}
                className={`card card-hover h-full flex flex-col group relative overflow-hidden ${
                  feature.size === 'large' ? 'p-6' : 'p-5'
                }`}
              >
                {/* Background pattern */}
                <div className="absolute inset-0 opacity-5 group-hover:opacity-10 transition-opacity">
                  <div
                    className="absolute inset-0"
                    style={{
                      backgroundImage: `radial-gradient(circle at 2px 2px, currentColor 1px, transparent 0)`,
                      backgroundSize: '24px 24px',
                    }}
                  />
                </div>

                {/* Icon */}
                <motion.div
                  whileHover={{ scale: 1.1, rotate: 5 }}
                  className={`inline-flex p-3 rounded-xl bg-gradient-to-br ${feature.color} mb-4 relative z-10`}
                >
                  <Icon className={`${feature.size === 'large' ? 'w-7 h-7' : 'w-6 h-6'} text-white`} />
                  
                  {/* Icon glow */}
                  <div className={`absolute inset-0 rounded-xl bg-gradient-to-br ${feature.color} blur-xl opacity-50 group-hover:opacity-75 transition-opacity`} />
                </motion.div>

                {/* Content */}
                <div className="relative z-10 flex-1">
                  <h3 className={`${feature.size === 'large' ? 'h3' : 'h4'} mb-2`}>
                    {feature.title}
                  </h3>
                  <p className={`text-landing-text-secondary ${feature.size === 'large' ? 'text-base' : 'text-sm'} leading-relaxed`}>
                    {feature.description}
                  </p>
                </div>

                {/* Gradient border glow on hover */}
                <div className={`absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none`}>
                  <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${feature.color} opacity-10`} />
                </div>

                {/* Corner accent */}
                <motion.div
                  className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${feature.color} opacity-0 group-hover:opacity-10 transition-opacity blur-3xl`}
                />
              </motion.div>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}
