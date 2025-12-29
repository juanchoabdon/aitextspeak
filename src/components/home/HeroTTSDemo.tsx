'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { trackDemoPlayed, trackDemoRateLimited, trackCTAClicked } from '@/lib/analytics/events';

// Global audio element - ensures we only have ONE audio playing
let globalAudio: HTMLAudioElement | null = null;

// 3 featured voices to showcase
const DEMO_VOICES = [
  {
    id: 'en-US-AndrewMultilingualNeural',
    name: 'Andrew',
    language: 'English (US)',
    gender: 'Male',
    provider: 'azure',
  },
  {
    id: 'en-US-AvaMultilingualNeural',
    name: 'Ava',
    language: 'English (US)',
    gender: 'Female',
    provider: 'azure',
  },
  {
    id: 'en-GB-RyanNeural',
    name: 'Ryan',
    language: 'English (UK)',
    gender: 'Male',
    provider: 'azure',
  },
];

const DEFAULT_TEXT = "Welcome to AI TextSpeak! Transform your text into natural speech.";

interface HeroTTSDemoProps {
  defaultText?: string;
}

interface SignupModalProps {
  isOpen: boolean;
  onClose: () => void;
}

function SignupModal({ isOpen, onClose }: SignupModalProps) {
  const router = useRouter();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-slate-900 border border-slate-700 rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl animate-in fade-in zoom-in duration-200">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors cursor-pointer"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Content */}
        <div className="text-center">
          <div className="mx-auto w-16 h-16 bg-gradient-to-r from-amber-500 to-orange-600 rounded-full flex items-center justify-center mb-6">
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
          </div>

          <h3 className="text-2xl font-bold text-white mb-2">
            Love what you hear? 🎧
          </h3>
          
          <p className="text-slate-300 mb-6">
            Create a free account and get <span className="text-amber-400 font-semibold">500 characters</span> to start creating your own voiceovers!
          </p>

          <div className="space-y-3">
            <button
              onClick={() => router.push('/auth/signup')}
              className="w-full py-3 px-6 bg-gradient-to-r from-amber-500 to-orange-600 text-white font-semibold rounded-xl hover:from-amber-400 hover:to-orange-500 transition-all hover:scale-[1.02] cursor-pointer"
            >
              Sign Up Free
            </button>
            
            <button
              onClick={() => router.push('/auth/signin')}
              className="w-full py-3 px-6 border border-slate-600 text-slate-300 font-semibold rounded-xl hover:bg-slate-800 hover:text-white transition-all cursor-pointer"
            >
              Already have an account? Sign In
            </button>
          </div>

          <p className="mt-4 text-xs text-slate-500">
            No credit card required • 100+ voices • 50+ languages
          </p>
        </div>
      </div>
    </div>
  );
}

export function HeroTTSDemo({ defaultText }: HeroTTSDemoProps = {}) {
  const router = useRouter();
  const [text, setText] = useState(defaultText || DEFAULT_TEXT);
  const [selectedVoice, setSelectedVoice] = useState(DEMO_VOICES[0]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [hasPlayedOnce, setHasPlayedOnce] = useState(false);
  const [showSignupModal, setShowSignupModal] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rateLimitHit, setRateLimitHit] = useState(false);
  const [progress, setProgress] = useState(0);
  const animationRef = useRef<number | null>(null);

  // Stop any playing audio
  const stopAudio = useCallback(() => {
    if (globalAudio) {
      globalAudio.pause();
      globalAudio.currentTime = 0;
    }
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    setIsPlaying(false);
    setProgress(0);
  }, []);

  // Progress animation loop
  const startProgressAnimation = useCallback(() => {
    const animate = () => {
      if (globalAudio && !globalAudio.paused) {
        // Only update progress if duration is available
        if (globalAudio.duration && globalAudio.duration > 0 && isFinite(globalAudio.duration)) {
          const currentProgress = (globalAudio.currentTime / globalAudio.duration) * 100;
          setProgress(currentProgress);
        }
        // Keep animating as long as audio is playing
        animationRef.current = requestAnimationFrame(animate);
      }
    };
    // Start immediately
    animationRef.current = requestAnimationFrame(animate);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopAudio();
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl, stopAudio]);

  const handlePause = () => {
    stopAudio();
  };

  const handlePlay = async () => {
    if (isLoading || rateLimitHit) return;

    // If we have existing audio with same URL, resume it
    if (globalAudio && audioUrl && globalAudio.src === audioUrl) {
      try {
        if (globalAudio.ended) {
          globalAudio.currentTime = 0;
        }
        await globalAudio.play();
        setIsPlaying(true);
        startProgressAnimation();
        return;
      } catch (e) {
        console.error('Resume failed, regenerating:', e);
      }
    }

    // Generate new audio
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/tts/demo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: text.slice(0, 150),
          voiceId: selectedVoice.id,
          provider: selectedVoice.provider,
        }),
      });

      if (response.status === 429) {
        setRateLimitHit(true);
        setShowSignupModal(true);
        trackDemoRateLimited();
        return;
      }

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to generate speech');
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      
      trackDemoPlayed(selectedVoice.id, text.length);
      
      // Stop and cleanup any existing audio
      stopAudio();
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }

      setAudioUrl(url);

      // Create new global audio element
      globalAudio = new Audio(url);

      // Set up event handlers
      globalAudio.onended = () => {
        setIsPlaying(false);
        setProgress(0);
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current);
          animationRef.current = null;
        }
        if (!hasPlayedOnce) {
          setHasPlayedOnce(true);
        }
      };

      globalAudio.onerror = () => {
        setIsPlaying(false);
        setProgress(0);
        setError('Failed to play audio');
      };

      // Wait for audio to be ready
      await new Promise<void>((resolve, reject) => {
        if (!globalAudio) return reject(new Error('No audio'));
        globalAudio.oncanplaythrough = () => resolve();
        globalAudio.onerror = () => reject(new Error('Failed to load audio'));
        globalAudio.load();
      });

      // Play the audio
      if (globalAudio) {
        await globalAudio.play();
        setIsPlaying(true);
        startProgressAnimation();
      }
    } catch (err) {
      console.error('Error generating demo:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate speech');
    } finally {
      setIsLoading(false);
    }
  };

  // Reset audio when voice changes
  const handleVoiceChange = (voice: typeof DEMO_VOICES[0]) => {
    stopAudio();
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
    }
    globalAudio = null;
    setSelectedVoice(voice);
  };

  return (
    <>
      <div className="mt-12 max-w-2xl mx-auto">
        {/* Demo Card */}
        <div className="relative rounded-2xl border border-slate-700/50 bg-slate-900/80 backdrop-blur-xl p-6 shadow-2xl">
          {/* Glow effect */}
          <div className="absolute -inset-1 bg-gradient-to-r from-amber-500/20 via-orange-500/20 to-red-500/20 rounded-2xl blur-xl opacity-50" />
          
          <div className="relative">
            {/* Text Input */}
            <div className="mb-4">
              <textarea
                value={text}
                onChange={(e) => {
                  setText(e.target.value);
                  // Reset audio when text changes
                  stopAudio();
                  if (audioUrl) {
                    URL.revokeObjectURL(audioUrl);
                    setAudioUrl(null);
                  }
                  globalAudio = null;
                  setError(null);
                }}
                placeholder="Type something to hear it spoken..."
                className="w-full h-24 px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50 resize-none text-sm"
                maxLength={150}
                disabled={rateLimitHit}
              />
              <div className="flex justify-between items-center mt-1 text-xs text-slate-500">
                <span>Try the demo with up to 150 characters</span>
                <span>{text.length}/150</span>
              </div>
            </div>

            {/* Error message */}
            {error && (
              <div className="mb-4 px-3 py-2 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
                {error}
              </div>
            )}

            {/* Rate limit message */}
            {rateLimitHit && (
              <div className="mb-4 px-3 py-2 bg-amber-500/10 border border-amber-500/30 rounded-lg text-amber-400 text-sm">
                Demo limit reached! Sign up free to continue generating voices.
              </div>
            )}

            {/* Voice Selection */}
            <div className="mb-4">
              <div className="flex items-center gap-2 flex-wrap">
                {DEMO_VOICES.map((voice) => (
                  <button
                    key={voice.id}
                    onClick={() => handleVoiceChange(voice)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all text-sm cursor-pointer ${
                      selectedVoice.id === voice.id
                        ? 'border-amber-500 bg-amber-500/20 text-amber-400'
                        : 'border-slate-700 bg-slate-800/50 text-slate-300 hover:border-slate-600'
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full ${
                      voice.gender === 'Male' ? 'bg-blue-400' : 'bg-pink-400'
                    }`} />
                    <span>{voice.name}</span>
                    <span className="text-slate-500 text-xs">({voice.language})</span>
                  </button>
                ))}
                
                {/* More voices indicator */}
                <span className="text-slate-500 text-sm ml-2">
                  +100 more voices
                </span>
              </div>
            </div>

            {/* Play Button */}
            {rateLimitHit ? (
              <button
                onClick={() => {
                  trackCTAClicked('Sign Up Free to Continue', 'demo_rate_limited');
                  router.push('/auth/signup');
                }}
                className="w-full py-4 rounded-xl font-semibold text-white flex items-center justify-center gap-3 transition-all cursor-pointer bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 hover:scale-[1.02]"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                </svg>
                Sign Up Free to Continue
              </button>
            ) : hasPlayedOnce && !isPlaying && !isLoading ? (
              <button
                onClick={() => {
                  trackCTAClicked('Get Started Free', 'demo_after_play');
                  router.push('/auth/signup');
                }}
                className="w-full py-4 rounded-xl font-semibold text-white flex items-center justify-center gap-3 transition-all cursor-pointer bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 hover:scale-[1.02]"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Get Started Free
              </button>
            ) : isPlaying ? (
              <button
                onClick={handlePause}
                className="relative w-full py-4 rounded-xl font-semibold text-white flex items-center justify-center gap-3 transition-all overflow-hidden bg-slate-700 cursor-pointer"
              >
                {/* Progress bar overlay */}
                <div 
                  className="absolute left-0 top-0 bottom-0 bg-gradient-to-r from-amber-500 to-orange-500"
                  style={{ width: `${progress}%`, transition: 'width 150ms ease-out' }}
                />
                <span className="relative z-10 flex items-center gap-3">
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                  </svg>
                  Pause
                </span>
              </button>
            ) : (
              <button
                onClick={handlePlay}
                disabled={isLoading || !text.trim()}
                className={`relative w-full py-4 rounded-xl font-semibold text-white flex items-center justify-center gap-3 transition-all overflow-hidden ${
                  isLoading || !text.trim()
                    ? 'bg-slate-700 cursor-not-allowed'
                    : 'bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 hover:scale-[1.02] cursor-pointer'
                }`}
              >
                <span className="relative z-10 flex items-center gap-3">
                  {isLoading ? (
                    <>
                      <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Generating...
                    </>
                  ) : (
                    <>
                      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                      Play Demo
                    </>
                  )}
                </span>
              </button>
            )}
          </div>
        </div>

        {/* Trust indicators */}
        <div className="mt-6 flex items-center justify-center gap-6 text-sm text-slate-500">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span>No signup required</span>
          </div>
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span>100% free to try</span>
          </div>
        </div>
      </div>

      {/* Signup Modal */}
      <SignupModal 
        isOpen={showSignupModal} 
        onClose={() => setShowSignupModal(false)} 
      />
    </>
  );
}

