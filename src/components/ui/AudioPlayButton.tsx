'use client';

import { useState, useRef, useEffect } from 'react';

interface AudioPlayButtonProps {
  src: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'amber' | 'green';
  showTime?: boolean;
  onPlay?: () => void;
  onPause?: () => void;
  onEnded?: () => void;
  autoPlay?: boolean;
  className?: string;
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function AudioPlayButton({
  src,
  size = 'md',
  variant = 'default',
  showTime = true,
  onPlay,
  onPause,
  onEnded,
  autoPlay = false,
  className = '',
}: AudioPlayButtonProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    if (autoPlay && audioRef.current) {
      audioRef.current.play();
    }
  }, [autoPlay, src]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
      setProgress((audio.currentTime / audio.duration) * 100 || 0);
    };

    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
    };

    const handlePlay = () => {
      setIsPlaying(true);
      onPlay?.();
    };

    const handlePause = () => {
      setIsPlaying(false);
      onPause?.();
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setProgress(0);
      setCurrentTime(0);
      onEnded?.();
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [onPlay, onPause, onEnded]);

  function togglePlayback() {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
  }

  const sizeClasses = {
    sm: 'px-3 py-1.5 text-xs gap-1.5',
    md: 'px-4 py-2 text-sm gap-2',
    lg: 'px-5 py-2.5 text-base gap-2',
  };

  const iconSizes = {
    sm: 'w-3.5 h-3.5',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };

  const variantClasses = {
    default: isPlaying 
      ? 'bg-slate-600 text-white' 
      : 'bg-slate-700 text-slate-300 hover:bg-slate-600 hover:text-white',
    amber: isPlaying
      ? 'bg-amber-600 text-white'
      : 'bg-amber-500 text-white hover:bg-amber-400',
    green: isPlaying
      ? 'bg-green-600 text-white'
      : 'bg-green-500 text-white hover:bg-green-400',
  };

  return (
    <div className={`relative inline-flex flex-col items-center ${className}`}>
      <audio ref={audioRef} src={src} className="hidden" />
      
      <button
        onClick={togglePlayback}
        className={`relative overflow-hidden flex items-center rounded-lg font-medium transition-colors ${sizeClasses[size]} ${variantClasses[variant]}`}
      >
        {/* Progress bar background */}
        {isPlaying && (
          <div 
            className="absolute inset-0 bg-black/20 transition-all duration-100"
            style={{ 
              clipPath: `inset(0 ${100 - progress}% 0 0)`,
            }}
          />
        )}
        
        <span className="relative flex items-center gap-2">
          {isPlaying ? (
            <svg className={iconSizes[size]} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6" />
            </svg>
          ) : (
            <svg className={iconSizes[size]} fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          )}
          
          {isPlaying && showTime && duration > 0 ? (
            <span className="tabular-nums">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          ) : (
            <span>{isPlaying ? 'Pause' : 'Play'}</span>
          )}
        </span>
      </button>

      {/* Progress bar below button */}
      {isPlaying && (
        <div className="w-full h-1 bg-slate-700 rounded-full mt-1 overflow-hidden">
          <div 
            className={`h-full transition-all duration-100 ${
              variant === 'amber' ? 'bg-amber-400' : 
              variant === 'green' ? 'bg-green-400' : 
              'bg-slate-400'
            }`}
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </div>
  );
}

// Simpler inline progress button for lists
export function AudioPlayButtonInline({
  src,
  onEnded,
  className = '',
}: {
  src: string;
  onEnded?: () => void;
  className?: string;
}) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
      setProgress((audio.currentTime / audio.duration) * 100 || 0);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setProgress(0);
      onEnded?.();
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [onEnded]);

  function togglePlayback() {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  }

  return (
    <button
      onClick={togglePlayback}
      className={`relative overflow-hidden flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
        isPlaying
          ? 'bg-amber-500 text-white'
          : 'bg-slate-700 text-slate-300 hover:bg-slate-600 hover:text-white'
      } ${className}`}
    >
      <audio ref={audioRef} src={src} className="hidden" />
      
      {/* Progress overlay */}
      {isPlaying && (
        <div 
          className="absolute inset-0 bg-amber-600 transition-all duration-100"
          style={{ 
            clipPath: `inset(0 ${100 - progress}% 0 0)`,
          }}
        />
      )}
      
      <span className="relative flex items-center gap-2">
        {isPlaying ? (
          <>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6" />
            </svg>
            Pause
          </>
        ) : (
          <>
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
            Play
          </>
        )}
      </span>
    </button>
  );
}

