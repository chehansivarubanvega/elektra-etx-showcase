'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { ArrowUp } from 'lucide-react';

const Footer = () => {
  const [time, setTime] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const options: Intl.DateTimeFormatOptions = {
        timeZone: 'Asia/Colombo',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      };
      setTime(new Intl.DateTimeFormat('en-US', options).format(now));
    };

    updateTime();
    const timer = setInterval(updateTime, 60000);
    return () => clearInterval(timer);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <motion.footer 
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      transition={{ duration: 0.8 }}
      className="relative w-full bg-[#000000] text-white pt-24 pb-12 overflow-hidden"
    >
      {/* Grainy Noise Overlay */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}></div>
      
      {/* Radial Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-[#001433] rounded-full blur-[150px] opacity-20 pointer-events-none"></div>

      <div className="container mx-auto px-6 md:px-12 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-12 mb-24">
          
          {/* Top Section: Links (col 1-8) */}
          <div className="md:col-span-8 grid grid-cols-2 md:grid-cols-3 gap-8">
            {[
              { title: 'Sitemap', links: ['Home', 'About ETX', 'Technology', 'Contact'] },
              { title: 'Follow Us', links: ['LinkedIn', 'Instagram', 'Twitter', 'Facebook'] },
              { title: 'Company', links: ['Trace Expert City', 'Tripoli Market', 'Maradana, SL', '+94 76 464 3619'] }
            ].map((section) => (
              <div key={section.title}>
                <h4 className="text-[10px] uppercase tracking-[0.3em] text-[#FF5722] mb-6">{section.title}</h4>
                <ul className="space-y-4">
                  {section.links.map((link) => (
                    <li key={link}>
                      <motion.a 
                        whileHover={{ x: 5, color: '#FF5722' }}
                        href="#" 
                        className="text-[13px] font-medium hover:text-[#FF5722] transition-colors"
                      >
                        {link}
                      </motion.a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Top Section: Contact (col 9-12) */}
          <div className="md:col-span-4">
            <h4 className="text-[10px] uppercase tracking-[0.3em] text-[#FF5722] mb-6">Contact Us</h4>
            <a href="mailto:info@elektrateq.com" className="text-[24px] md:text-[32px] font-bold border-b-2 border-white hover:border-[#FF5722] hover:text-[#FF5722] transition-colors">
              info@elektrateq.com
            </a>
          </div>
        </div>

        {/* Middle Section: Metadata */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-t border-white/10 pt-12 text-[11px] uppercase tracking-[0.2em] text-white/40">
          <p>Based in Maradana, Sri Lanka.</p>
          <p>Current Time (SL): {time}</p>
          <p>Availability: Currently scaling urban mobility.</p>
        </div>

        {/* Bottom Section: Branding & Scroll */}
        <div className="mt-24 relative flex items-center justify-center">
          <h1 className="text-[15vw] font-black leading-none uppercase tracking-tighter text-white select-none">
            ELEKTRATEQ
          </h1>
          
          <motion.button
            whileHover={{ scale: 1.1, backgroundColor: '#FF5722' }}
            onClick={scrollToTop}
            className="absolute right-0 bottom-0 md:bottom-auto md:top-1/2 w-16 h-16 rounded-full border border-white flex items-center justify-center hover:text-black transition-colors"
          >
            <ArrowUp />
          </motion.button>
        </div>
      </div>
    </motion.footer>
  );
};

export default Footer;
