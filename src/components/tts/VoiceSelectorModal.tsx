'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { Voice } from '@/lib/tts/types';
import { trackVoicePreviewed } from '@/lib/analytics/events';

interface VoiceSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (voice: Voice) => void;
  voices: Voice[];
  selectedVoiceId?: string;
  languageCode: string;
  allowedLanguages?: string[] | 'all';
}

// Sample text for voice preview
const SAMPLE_TEXTS: Record<string, string> = {
  'en-US': 'Hello! This is a sample of my voice. I hope you like how I sound.',
  'en-GB': 'Hello! This is a sample of my voice. I hope you like how I sound.',
  'es-ES': 'Hola! Esta es una muestra de mi voz. Espero que te guste cómo sueno.',
  'es-MX': 'Hola! Esta es una muestra de mi voz. Espero que te guste cómo sueno.',
  'fr-FR': 'Bonjour! Ceci est un échantillon de ma voix. J\'espère que vous aimez comment je sonne.',
  'de-DE': 'Hallo! Dies ist eine Probe meiner Stimme. Ich hoffe, Ihnen gefällt, wie ich klinge.',
  'it-IT': 'Ciao! Questo è un campione della mia voce. Spero che ti piaccia come suono.',
  'pt-BR': 'Olá! Esta é uma amostra da minha voz. Espero que você goste de como eu soo.',
  'ja-JP': 'こんにちは！これは私の声のサンプルです。気に入っていただけると嬉しいです。',
  'ko-KR': '안녕하세요! 이것은 제 목소리 샘플입니다. 마음에 드셨으면 좋겠습니다.',
  'zh-CN': '你好！这是我声音的样本。希望你喜欢我的声音。',
  'ar-SA': 'مرحبا! هذه عينة من صوتي. أتمنى أن يعجبك صوتي.',
  'hi-IN': 'नमस्ते! यह मेरी आवाज़ का एक नमूना है। मुझे उम्मीद है कि आपको मेरी आवाज़ पसंद आएगी।',
  'ru-RU': 'Привет! Это образец моего голоса. Надеюсь, вам понравится, как я звучу.',
};

function getDefaultSampleText(languageCode: string): string {
  // Try exact match first
  if (SAMPLE_TEXTS[languageCode]) return SAMPLE_TEXTS[languageCode];
  // Try language prefix (e.g., 'es' from 'es-AR')
  const prefix = languageCode.split('-')[0];
  const match = Object.keys(SAMPLE_TEXTS).find(k => k.startsWith(prefix));
  if (match) return SAMPLE_TEXTS[match];
  return SAMPLE_TEXTS['en-US'];
}

function getAvatarColor(name: string, gender: string | null): string {
  const colors = gender === 'Female' 
    ? ['bg-pink-500', 'bg-rose-500', 'bg-fuchsia-500', 'bg-purple-500']
    : ['bg-blue-500', 'bg-indigo-500', 'bg-cyan-500', 'bg-teal-500'];
  
  const index = name.charCodeAt(0) % colors.length;
  return colors[index];
}

function getInitials(name: string): string {
  const parts = name.split(' ');
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

export function VoiceSelectorModal({
  isOpen,
  onClose,
  onSelect,
  voices,
  selectedVoiceId,
  languageCode,
  allowedLanguages = 'all',
}: VoiceSelectorModalProps) {
  const router = useRouter();
  const [genderFilter, setGenderFilter] = useState<'all' | 'Male' | 'Female'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
  const [loadingVoiceId, setLoadingVoiceId] = useState<string | null>(null);
  const [previewUrls, setPreviewUrls] = useState<Record<string, string>>({});
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Check if a language is allowed for the current plan
  function isLanguageAllowed(langCode: string): boolean {
    if (allowedLanguages === 'all') return true;
    const langPrefix = langCode.toLowerCase().split('-')[0];
    return allowedLanguages.some(allowed => 
      allowed.toLowerCase().startsWith(langPrefix) || 
      langPrefix === allowed.toLowerCase().split('-')[0]
    );
  }

  const isCurrentLanguageAllowed = isLanguageAllowed(languageCode);

  // Filter voices by language, gender, and search
  const filteredVoices = voices.filter((v) => {
    if (v.language_code !== languageCode) return false;
    if (genderFilter !== 'all' && v.gender !== genderFilter) return false;
    if (searchQuery && !v.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  // Close modal on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }
    
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  // Stop audio when modal closes
  useEffect(() => {
    if (!isOpen && audioRef.current) {
      audioRef.current.pause();
      setPlayingVoiceId(null);
    }
  }, [isOpen]);

  async function handlePreviewVoice(voice: Voice, e: React.MouseEvent) {
    e.stopPropagation(); // Don't trigger select when clicking preview

    // If already playing this voice, stop it
    if (playingVoiceId === voice.voice_id) {
      audioRef.current?.pause();
      setPlayingVoiceId(null);
      return;
    }

    // Stop any currently playing audio
    if (audioRef.current) {
      audioRef.current.pause();
    }

    // Check if we already have a preview URL
    if (previewUrls[voice.voice_id]) {
      playAudio(voice.voice_id, previewUrls[voice.voice_id], voice);
      return;
    }

    // Generate preview (will be cached for future users)
    setLoadingVoiceId(voice.voice_id);
    
    try {
      const response = await fetch('/api/tts/sample', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          voice_id: voice.voice_id,
          provider: voice.provider,
          language_code: voice.language_code,
          text: getDefaultSampleText(voice.language_code),
        }),
      });

      const data = await response.json();
      
      if (data.success && data.audioUrl) {
        setPreviewUrls(prev => ({ ...prev, [voice.voice_id]: data.audioUrl }));
        playAudio(voice.voice_id, data.audioUrl, voice);
      }
    } catch (error) {
      console.error('Failed to generate sample:', error);
    } finally {
      setLoadingVoiceId(null);
    }
  }

  function playAudio(voiceId: string, url: string, voice?: Voice) {
    if (audioRef.current) {
      audioRef.current.src = url;
      audioRef.current.play();
      setPlayingVoiceId(voiceId);
      if (voice) {
        trackVoicePreviewed({
          voiceId: voice.voice_id,
          voiceName: voice.name,
          provider: voice.provider,
          gender: voice.gender || 'Unknown',
          language: voice.language_code,
        });
      }
    }
  }

  function handleAudioEnded() {
    setPlayingVoiceId(null);
  }

  function handleSelectVoice(voice: Voice) {
    // Check if language is allowed
    if (!isLanguageAllowed(voice.language_code)) {
      setShowUpgradePrompt(true);
      return;
    }

    // Stop any playing audio
    if (audioRef.current) {
      audioRef.current.pause();
    }
    setPlayingVoiceId(null);
    onSelect(voice);
    onClose();
  }

  function handleUpgrade() {
    onClose();
    router.push('/pricing');
  }

  if (!isOpen) return null;

  // Show upgrade prompt if language not allowed
  if (showUpgradePrompt || !isCurrentLanguageAllowed) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div 
          className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          onClick={() => {
            setShowUpgradePrompt(false);
            onClose();
          }}
        />
        <div className="relative w-full max-w-md bg-slate-900 rounded-2xl border border-amber-500/30 shadow-2xl p-6">
          {/* Lock Icon */}
          <div className="flex justify-center mb-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-r from-amber-500 to-orange-600">
              <svg className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
          </div>

          <h2 className="text-2xl font-bold text-white text-center mb-2">
            Upgrade to Unlock
          </h2>
          
          <p className="text-slate-400 text-center mb-6">
            This language is only available on paid plans. Upgrade to access all 50+ languages and premium voices!
          </p>

          <div className="bg-slate-800/50 rounded-xl p-4 mb-6">
            <p className="text-sm font-medium text-white mb-2">Free plan includes:</p>
            <ul className="space-y-2 text-sm text-slate-400">
              <li className="flex items-center gap-2">
                <svg className="h-4 w-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                English (US) voices
              </li>
              <li className="flex items-center gap-2">
                <svg className="h-4 w-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                English (UK) voices
              </li>
            </ul>
            
            <div className="border-t border-slate-700 mt-3 pt-3">
              <p className="text-sm font-medium text-amber-400 mb-2">Paid plans include:</p>
              <ul className="space-y-2 text-sm text-slate-300">
                <li className="flex items-center gap-2">
                  <svg className="h-4 w-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  50+ languages
                </li>
                <li className="flex items-center gap-2">
                  <svg className="h-4 w-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Premium neural voices
                </li>
                <li className="flex items-center gap-2">
                  <svg className="h-4 w-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Up to 1M characters/month
                </li>
              </ul>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <button
              onClick={handleUpgrade}
              className="w-full rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 py-3 font-semibold text-white hover:from-amber-400 hover:to-orange-500 transition-all"
            >
              View Upgrade Options
            </button>
            <button
              onClick={() => {
                setShowUpgradePrompt(false);
                onClose();
              }}
              className="w-full rounded-xl border border-slate-700 py-3 font-medium text-slate-400 hover:text-white hover:border-slate-600 transition-all"
            >
              Maybe Later
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-3xl max-h-[85vh] bg-slate-900 rounded-2xl border border-slate-800 shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-800">
          <div>
            <h2 className="text-xl font-bold text-white">Select Voice</h2>
            <p className="text-sm text-slate-400 mt-1">
              {filteredVoices.length} voices available
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Filters */}
        <div className="p-4 border-b border-slate-800 space-y-3">
          {/* Search */}
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search voices..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-700 bg-slate-800/50 text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none"
            />
          </div>

          {/* Gender Filter */}
          <div className="flex gap-2">
            <button
              onClick={() => setGenderFilter('all')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                genderFilter === 'all'
                  ? 'bg-amber-500 text-white'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setGenderFilter('Female')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                genderFilter === 'Female'
                  ? 'bg-pink-500 text-white'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="8" r="5" />
                <path d="M12 13v8m-3-3h6" />
              </svg>
              Female
            </button>
            <button
              onClick={() => setGenderFilter('Male')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                genderFilter === 'Male'
                  ? 'bg-blue-500 text-white'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="10" cy="14" r="5" />
                <path d="M14 10l6-6m0 0v4m0-4h-4" />
              </svg>
              Male
            </button>
          </div>
        </div>

        {/* Voice List */}
        <div className="flex-1 overflow-y-auto p-4">
          <audio ref={audioRef} onEnded={handleAudioEnded} className="hidden" />
          
          {filteredVoices.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-slate-400">No voices found</p>
            </div>
          ) : (
            <div className="grid gap-3">
              {filteredVoices.map((voice) => {
                const isSelected = voice.voice_id === selectedVoiceId;
                const isPlaying = voice.voice_id === playingVoiceId;
                const isLoading = voice.voice_id === loadingVoiceId;

                return (
                  <div
                    key={voice.voice_id}
                    className={`flex items-center gap-4 p-4 rounded-xl border transition-all ${
                      isSelected
                        ? 'border-amber-500 bg-amber-500/10'
                        : 'border-slate-700 bg-slate-800/30 hover:border-slate-600'
                    }`}
                  >
                    {/* Avatar */}
                    <div className={`flex-shrink-0 w-12 h-12 rounded-full ${getAvatarColor(voice.name, voice.gender)} flex items-center justify-center`}>
                      <span className="text-white font-bold text-lg">
                        {getInitials(voice.name)}
                      </span>
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-white truncate">{voice.name}</h3>
                        {isSelected && (
                          <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 text-xs">
                            Selected
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs ${
                          voice.gender === 'Female' 
                            ? 'bg-pink-500/20 text-pink-400' 
                            : 'bg-blue-500/20 text-blue-400'
                        }`}>
                          {voice.gender}
                        </span>
                        <span className="text-xs text-slate-500">
                          Neural Voice
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      {/* Preview Button */}
                      <button
                        onClick={(e) => handlePreviewVoice(voice, e)}
                        disabled={isLoading}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                          isPlaying
                            ? 'bg-amber-500 text-white'
                            : 'bg-slate-700 text-slate-300 hover:bg-slate-600 hover:text-white'
                        } disabled:opacity-50`}
                      >
                        {isLoading ? (
                          <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                        ) : isPlaying ? (
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
                          </svg>
                        ) : (
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M8 5v14l11-7z" />
                          </svg>
                        )}
                        {isPlaying ? 'Stop' : 'Listen'}
                      </button>

                      {/* Select Button */}
                      <button
                        onClick={() => handleSelectVoice(voice)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                          isSelected
                            ? 'bg-amber-500 text-white'
                            : 'bg-gradient-to-r from-amber-500 to-orange-600 text-white hover:from-amber-400 hover:to-orange-500'
                        }`}
                      >
                        {isSelected ? 'Selected' : 'Select'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
