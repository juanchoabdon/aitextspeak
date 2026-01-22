import Link from 'next/link';

interface LogoProps {
  href?: string;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  className?: string;
}

export function Logo({ 
  href = '/', 
  size = 'md', 
  showIcon = true,
  className = '' 
}: LogoProps) {
  const sizeClasses = {
    sm: 'text-lg',
    md: 'text-2xl',
    lg: 'text-3xl',
  };

  const iconSizes = {
    sm: 'w-5 h-5',
    md: 'w-7 h-7',
    lg: 'w-9 h-9',
  };

  const content = (
    <span className={`font-bold flex items-center gap-2 ${className}`}>
      {showIcon && (
        <span className={`${iconSizes[size]} flex items-center justify-center rounded-lg bg-gradient-to-br from-amber-400 to-orange-600 shadow-lg shadow-amber-500/20`}>
          <svg 
            viewBox="0 0 24 24" 
            fill="none" 
            className="w-[60%] h-[60%] text-white"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {/* Microphone/Speaker wave icon */}
            <path d="M12 2a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" fill="currentColor" stroke="none" />
            <path d="M19 10v1a7 7 0 0 1-14 0v-1" />
            <line x1="12" y1="19" x2="12" y2="22" />
          </svg>
        </span>
      )}
      <span className={`bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent ${sizeClasses[size]}`}>
        AI TextSpeak
      </span>
    </span>
  );

  if (href) {
    return (
      <Link href={href} className="inline-flex">
        {content}
      </Link>
    );
  }

  return content;
}

export function LogoIcon({ className = 'w-8 h-8' }: { className?: string }) {
  return (
    <span className={`${className} flex items-center justify-center rounded-lg bg-gradient-to-br from-amber-400 to-orange-600 shadow-lg shadow-amber-500/20`}>
      <svg 
        viewBox="0 0 24 24" 
        fill="none" 
        className="w-[60%] h-[60%] text-white"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 2a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" fill="currentColor" stroke="none" />
        <path d="M19 10v1a7 7 0 0 1-14 0v-1" />
        <line x1="12" y1="19" x2="12" y2="22" />
      </svg>
    </span>
  );
}











