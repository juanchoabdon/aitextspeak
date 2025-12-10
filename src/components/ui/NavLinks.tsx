'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface NavLink {
  href: string;
  label: string;
  matchPaths?: string[];
}

interface ServiceItem {
  slug: string;
  name: string;
  icon: string | null;
  short_description: string;
}

interface NavLinksProps {
  featuredServices?: ServiceItem[];
}

const navLinks: NavLink[] = [
  { href: '/', label: 'Home' },
  { href: '/pricing', label: 'Pricing' },
  { href: '/blog', label: 'Resources', matchPaths: ['/blog'] },
  { href: '/affiliates', label: 'Affiliates' },
];

export function NavLinks({ featuredServices = [] }: NavLinksProps) {
  const pathname = usePathname();
  const [isServicesOpen, setIsServicesOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const isActive = (link: NavLink) => {
    if (link.href === '/') {
      return pathname === '/';
    }
    if (pathname === link.href || pathname.startsWith(link.href + '/')) {
      return true;
    }
    if (link.matchPaths) {
      return link.matchPaths.some(
        (path) => pathname === path || pathname.startsWith(path + '/')
      );
    }
    return false;
  };

  const isServicesActive = pathname.startsWith('/services');

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsServicesOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMouseEnter = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsServicesOpen(true);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setIsServicesOpen(false);
    }, 150);
  };

  return (
    <div className="hidden md:flex items-center gap-8">
      {/* Home Link */}
      <Link
        href="/"
        className={`text-sm transition-colors cursor-pointer ${
          pathname === '/'
            ? 'text-amber-400 font-medium'
            : 'text-slate-300 hover:text-white'
        }`}
      >
        Home
      </Link>

      {/* Services Dropdown */}
      <div 
        ref={dropdownRef}
        className="relative"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <button
          className={`text-sm transition-colors cursor-pointer flex items-center gap-1 ${
            isServicesActive
              ? 'text-amber-400 font-medium'
              : 'text-slate-300 hover:text-white'
          }`}
          onClick={() => setIsServicesOpen(!isServicesOpen)}
        >
          Services
          <svg 
            className={`w-4 h-4 transition-transform ${isServicesOpen ? 'rotate-180' : ''}`} 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* Dropdown Menu */}
        {isServicesOpen && (
          <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-80 rounded-xl border border-slate-700 bg-slate-900 shadow-2xl shadow-black/50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
            {/* Services Grid */}
            <div className="p-2">
              {featuredServices.length > 0 ? (
                featuredServices.map((service) => (
                  <Link
                    key={service.slug}
                    href={`/services/${service.slug}`}
                    className="flex items-start gap-3 p-3 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                    onClick={() => setIsServicesOpen(false)}
                  >
                    <span className="text-2xl">{service.icon || '🎯'}</span>
                    <div>
                      <div className="font-medium text-white text-sm">{service.name}</div>
                      <div className="text-xs text-slate-400 line-clamp-1">{service.short_description}</div>
                    </div>
                  </Link>
                ))
              ) : (
                <>
                  <Link
                    href="/services/youtube-videos"
                    className="flex items-start gap-3 p-3 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                    onClick={() => setIsServicesOpen(false)}
                  >
                    <span className="text-2xl">🎬</span>
                    <div>
                      <div className="font-medium text-white text-sm">YouTube Videos</div>
                      <div className="text-xs text-slate-400">Professional voiceovers for YouTube</div>
                    </div>
                  </Link>
                  <Link
                    href="/services/podcasts"
                    className="flex items-start gap-3 p-3 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                    onClick={() => setIsServicesOpen(false)}
                  >
                    <span className="text-2xl">🎙️</span>
                    <div>
                      <div className="font-medium text-white text-sm">Podcasts</div>
                      <div className="text-xs text-slate-400">Intros, outros, and narration</div>
                    </div>
                  </Link>
                  <Link
                    href="/services/audiobooks"
                    className="flex items-start gap-3 p-3 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                    onClick={() => setIsServicesOpen(false)}
                  >
                    <span className="text-2xl">📚</span>
                    <div>
                      <div className="font-medium text-white text-sm">Audiobooks</div>
                      <div className="text-xs text-slate-400">Convert books to audio</div>
                    </div>
                  </Link>
                  <Link
                    href="/services/e-learning"
                    className="flex items-start gap-3 p-3 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                    onClick={() => setIsServicesOpen(false)}
                  >
                    <span className="text-2xl">🎓</span>
                    <div>
                      <div className="font-medium text-white text-sm">E-Learning</div>
                      <div className="text-xs text-slate-400">Course and training narration</div>
                    </div>
                  </Link>
                </>
              )}
            </div>

            {/* View All Button */}
            <div className="border-t border-slate-700 p-2">
              <Link
                href="/services"
                className="flex items-center justify-center gap-2 w-full p-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-400 font-medium text-sm transition-colors cursor-pointer"
                onClick={() => setIsServicesOpen(false)}
              >
                View All Services
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Other Links */}
      {navLinks.slice(1).map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className={`text-sm transition-colors cursor-pointer ${
            isActive(link)
              ? 'text-amber-400 font-medium'
              : 'text-slate-300 hover:text-white'
          }`}
        >
          {link.label}
        </Link>
      ))}
    </div>
  );
}
