'use client';

import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { FileText, FileSpreadsheet, FileCode, FileImage } from 'lucide-react';

export default function KnowledgeVault3D() {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const containerRef = useRef(null);

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!containerRef.current) return;
      
      const rect = containerRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      
      const x = (e.clientX - centerX) / (rect.width / 2);
      const y = (e.clientY - centerY) / (rect.height / 2);
      
      setMousePosition({ x: x * 20, y: y * 20 });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const documents = [
    { name: 'Employee_Handbook.pdf', size: '2.4 MB', icon: FileText, color: 'from-violet-500 to-purple-600', rotation: 15, delay: 0 },
    { name: 'Q4_Report.xlsx', size: '1.8 MB', icon: FileSpreadsheet, color: 'from-blue-500 to-cyan-600', rotation: -12, delay: 0.2 },
    { name: 'API_Documentation.md', size: '856 KB', icon: FileCode, color: 'from-cyan-500 to-teal-600', rotation: 25, delay: 0.4 },
    { name: 'Product_Design.fig', size: '3.2 MB', icon: FileImage, color: 'from-purple-500 to-pink-600', rotation: -20, delay: 0.6 },
  ];

  return (
    <div ref={containerRef} className="relative w-full h-[500px] flex items-center justify-center">
      {/* Central Holographic Vault */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1, ease: [0.4, 0, 0.2, 1] }}
        style={{
          transform: `perspective(1000px) rotateY(${mousePosition.x * 0.5}deg) rotateX(${-mousePosition.y * 0.5}deg)`,
        }}
        className="relative w-72 h-72 sm:w-80 sm:h-80"
      >
        {/* Orbiting Rings */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
          className="absolute inset-0"
        >
          <div className="absolute inset-0 rounded-full border-2 border-landing-violet/30"
            style={{
              transform: 'rotateX(75deg)',
              boxShadow: '0 0 30px rgba(86, 217, 181, 0.25)',
            }}
          />
        </motion.div>

        <motion.div
          animate={{ rotate: -360 }}
          transition={{ duration: 25, repeat: Infinity, ease: 'linear' }}
          className="absolute inset-4"
        >
          <div className="absolute inset-0 rounded-full border-2 border-landing-blue/30"
            style={{
              transform: 'rotateX(75deg) rotateY(45deg)',
              boxShadow: '0 0 30px rgba(106, 174, 255, 0.25)',
            }}
          />
        </motion.div>

        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}
          className="absolute inset-8"
        >
          <div className="absolute inset-0 rounded-full border-2 border-landing-cyan/30"
            style={{
              transform: 'rotateX(75deg) rotateY(-45deg)',
              boxShadow: '0 0 30px rgba(169, 154, 255, 0.22)',
            }}
          />
        </motion.div>

        {/* Central Vault Core */}
        <motion.div
          animate={{
            scale: [1, 1.05, 1],
            opacity: [0.8, 1, 0.8],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          className="absolute inset-0 flex items-center justify-center"
        >
          {/* Glowing Core */}
          <div className="absolute inset-20 rounded-full bg-gradient-to-br from-landing-violet via-landing-blue to-landing-cyan opacity-20 blur-2xl animate-pulse-glow" />
          
          {/* Vault Icon */}
          <div className="relative z-10 landing-glass rounded-3xl p-8 backdrop-blur-premium">
            <svg
              width="80"
              height="80"
              viewBox="0 0 80 80"
              fill="none"
              className="drop-shadow-2xl"
            >
              {/* Outer vault */}
              <rect
                x="8"
                y="8"
                width="64"
                height="64"
                rx="16"
                fill="url(#vault-gradient-main)"
                fillOpacity="0.9"
              />
              
              {/* Inner vault */}
              <rect
                x="16"
                y="16"
                width="48"
                height="48"
                rx="12"
                fill="url(#vault-gradient-inner)"
                fillOpacity="0.7"
              />
              
              {/* Document layers */}
              <g opacity="0.9">
                <line x1="28" y1="32" x2="52" y2="32" stroke="white" strokeWidth="3" strokeLinecap="round" />
                <line x1="28" y1="40" x2="52" y2="40" stroke="white" strokeWidth="3" strokeLinecap="round" />
                <line x1="28" y1="48" x2="44" y2="48" stroke="white" strokeWidth="3" strokeLinecap="round" />
              </g>
              
              {/* AI sparkle */}
              <motion.circle
                animate={{
                  scale: [1, 1.2, 1],
                  opacity: [0.8, 1, 0.8],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
                cx="60"
                cy="20"
                r="8"
                fill="url(#sparkle-gradient)"
              />
              
              <defs>
                <linearGradient id="vault-gradient-main" x1="8" y1="8" x2="72" y2="72">
                  <stop offset="0%" stopColor="#56D9B5" />
                  <stop offset="50%" stopColor="#6AAEFF" />
                  <stop offset="100%" stopColor="#A99AFF" />
                </linearGradient>
                <linearGradient id="vault-gradient-inner" x1="16" y1="16" x2="64" y2="64">
                  <stop offset="0%" stopColor="#6AAEFF" />
                  <stop offset="100%" stopColor="#A99AFF" />
                </linearGradient>
                <linearGradient id="sparkle-gradient" x1="52" y1="12" x2="68" y2="28">
                  <stop offset="0%" stopColor="#A99AFF" />
                  <stop offset="100%" stopColor="#56D9B5" />
                </linearGradient>
              </defs>
            </svg>
          </div>

          {/* Processing Indicator */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1, duration: 0.6 }}
            className="absolute -bottom-12 left-1/2 -translate-x-1/2 flex items-center gap-2 landing-badge px-4 py-2"
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
              className="w-4 h-4"
            >
              <div className="w-full h-full border-2 border-landing-violet border-t-transparent rounded-full" />
            </motion.div>
            <span className="text-xs font-semibold">AI Processing Active</span>
          </motion.div>
        </motion.div>
      </motion.div>

      {/* Floating Document Cards */}
      {documents.map((doc, index) => {
        const Icon = doc.icon;
        const angle = (index / documents.length) * Math.PI * 2;
        const radius = 205;
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;

        return (
          <motion.div
            key={doc.name}
            initial={{ opacity: 0, scale: 0.5, x: 0, y: 0 }}
            animate={{
              opacity: 1,
              scale: 1,
              x: x + mousePosition.x * 0.3,
              y: y + mousePosition.y * 0.3,
            }}
            transition={{
              delay: doc.delay,
              duration: 0.8,
              ease: [0.4, 0, 0.2, 1],
            }}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
            style={{
              transform: `translate(${x + mousePosition.x * 0.3}px, ${y + mousePosition.y * 0.3}px) translate(-50%, -50%)`,
            }}
          >
            <motion.div
              animate={{
                y: [-10, 10, -10],
                rotate: [doc.rotation, doc.rotation + 2, doc.rotation],
              }}
              transition={{
                duration: 6,
                repeat: Infinity,
                ease: 'easeInOut',
                delay: index * 0.5,
              }}
              whileHover={{ scale: 1.1, rotate: 0 }}
              className="landing-glass-hover rounded-xl p-4 w-56 cursor-pointer"
            >
              <div className="flex items-start gap-3 mb-3">
                <div className={`p-2 rounded-lg bg-gradient-to-br ${doc.color}`}>
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-landing-text-primary truncate">
                    {doc.name}
                  </div>
                  <div className="text-xs text-landing-text-muted">
                    {doc.size}
                  </div>
                </div>
              </div>
              
              {/* Progress bar */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-landing-text-secondary">Indexed</span>
                  <span className="text-landing-text-primary font-semibold">100%</span>
                </div>
                <div className="h-1.5 bg-black/20 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: '0%' }}
                    animate={{ width: '100%' }}
                    transition={{ delay: doc.delay + 0.5, duration: 1.5, ease: 'easeOut' }}
                    className={`h-full bg-gradient-to-r ${doc.color}`}
                  />
                </div>
              </div>

              {/* Status badge */}
              <div className="mt-3 flex items-center gap-2 text-xs">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse-glow" />
                <span className="text-landing-text-secondary">Ready for queries</span>
              </div>
            </motion.div>
          </motion.div>
        );
      })}

      {/* Connection Lines */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-20">
        <defs>
          <linearGradient id="line-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#56D9B5" stopOpacity="0" />
            <stop offset="50%" stopColor="#6AAEFF" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#A99AFF" stopOpacity="0" />
          </linearGradient>
        </defs>
        {documents.map((_, index) => {
          const angle = (index / documents.length) * Math.PI * 2;
          const radius = 250;
          const x = Math.cos(angle) * radius + 300;
          const y = Math.sin(angle) * radius + 300;

          return (
            <motion.line
              key={index}
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ delay: 0.5 + index * 0.2, duration: 1 }}
              x1="300"
              y1="300"
              x2={x}
              y2={y}
              stroke="url(#line-gradient)"
              strokeWidth="2"
              strokeDasharray="5,5"
            >
              <animate
                attributeName="stroke-dashoffset"
                from="0"
                to="10"
                dur="1s"
                repeatCount="indefinite"
              />
            </motion.line>
          );
        })}
      </svg>
    </div>
  );
}
