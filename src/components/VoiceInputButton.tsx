import React, { useState, useEffect, useRef } from 'react';
import { Mic, ChevronDown, Volume2 } from 'lucide-react';
import { SupportedLanguage, VoiceAssistantState } from '../types/assistant';
import { stopSpeech } from '../utils/speechUtils';

interface VoiceInputButtonProps {
  onTranscript: (text: string) => void;
  onSendImmediate?: (text: string) => void;
  selectedLanguage: SupportedLanguage;
  onLanguageChange: (lang: SupportedLanguage) => void;
  disabled?: boolean;
  autoSend?: boolean;
  isAiSpeaking?: boolean;
  onStopAiSpeech?: () => void;
  onStateChangeNotify?: (state: VoiceAssistantState, transcript?: string, error?: string) => void;
}

const VOICE_LANG_MAP: Record<string, { name: string; bcp47: string }> = {
  en: { name: 'English', bcp47: 'en-IN' },
  ta: { name: 'Tamil', bcp47: 'ta-IN' },
  tanglish: { name: 'Tanglish', bcp47: 'ta-IN' },
  hi: { name: 'Hindi', bcp47: 'hi-IN' },
  te: { name: 'Telugu', bcp47: 'te-IN' },
  ml: { name: 'Malayalam', bcp47: 'ml-IN' },
  kn: { name: 'Kannada', bcp47: 'kn-IN' },
  auto: { name: 'Auto', bcp47: 'en-IN' },
};

export const VoiceInputButton: React.FC<VoiceInputButtonProps> = ({
  onTranscript,
  onSendImmediate,
  selectedLanguage,
  onLanguageChange,
  disabled = false,
  autoSend = false,
  isAiSpeaking = false,
  onStopAiSpeech,
  onStateChangeNotify,
}) => {
  const [isListening, setIsListening] = useState(false);
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Single reusable SpeechRecognition instance
  const recognitionRef = useRef<any>(null);
  const isListeningRef = useRef<boolean>(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close language menu on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowLangMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Cleanup reusable recognition instance on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {}
        recognitionRef.current = null;
      }
      isListeningRef.current = false;
    };
  }, []);

  // Helper to get or initialize the single reusable SpeechRecognition instance
  const getOrCreateRecognition = () => {
    if (recognitionRef.current) {
      return recognitionRef.current;
    }
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      return null;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognitionRef.current = recognition;
    return recognition;
  };

  const handleToggleListening = async () => {
    // If currently listening, toggle off: stop recognition and return to 🎤
    if (isListeningRef.current || isListening) {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
      }
      isListeningRef.current = false;
      setIsListening(false);
      onStateChangeNotify?.('idle');
      return;
    }

    // Stop AI speech if speaking
    if (isAiSpeaking) {
      stopSpeech();
      onStopAiSpeech?.();
    }

    // 1. Check browser SpeechRecognition support
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setErrorMessage('Voice input is not supported in this browser.');
      setTimeout(() => setErrorMessage(null), 4000);
      return;
    }

    // 2. Check navigator.mediaDevices support
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setErrorMessage('Voice input is not supported in this browser.');
      setTimeout(() => setErrorMessage(null), 4000);
      return;
    }

    setErrorMessage(null);

    // 3. Request native browser microphone permission directly from user click
    let stream: MediaStream | null = null;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Clean up: immediately stop and release audio tracks
      stream.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {}
      });
    } catch (err: any) {
      const errName = err?.name || '';

      if (errName === 'NotAllowedError' || errName === 'PermissionDeniedError') {
        setErrorMessage('Microphone permission denied.');
      } else if (errName === 'NotFoundError' || errName === 'DevicesNotFoundError') {
        setErrorMessage('No microphone detected.');
      } else if (errName === 'NotReadableError' || errName === 'TrackStartError') {
        setErrorMessage('Microphone is unavailable or being used elsewhere.');
      } else if (errName === 'SecurityError') {
        setErrorMessage('Microphone access blocked by browser security.');
      } else {
        setErrorMessage(`Microphone error: ${err?.message || errName || 'Unable to access microphone'}`);
      }

      isListeningRef.current = false;
      setIsListening(false);
      onStateChangeNotify?.('idle');
      setTimeout(() => setErrorMessage(null), 4000);
      return;
    }

    // 4. Start Real Speech Recognition using the reusable instance
    const recognition = getOrCreateRecognition();
    if (!recognition) {
      setErrorMessage('Voice input is not supported in this browser.');
      setTimeout(() => setErrorMessage(null), 4000);
      return;
    }

    // Multilingual configuration before recognition starts
    const langConfig = VOICE_LANG_MAP[selectedLanguage] || VOICE_LANG_MAP.en;
    recognition.lang = langConfig.bcp47;

    let finalTranscript = '';

    recognition.onstart = () => {
      isListeningRef.current = true;
      setIsListening(true);
      onStateChangeNotify?.('listening');
    };

    // Receive actual speech in real-time
    recognition.onresult = (event: any) => {
      let interimTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const item = event.results[i];
        if (item.isFinal) {
          finalTranscript += item[0].transcript;
        } else {
          interimTranscript += item[0].transcript;
        }
      }
      const textToDisplay = finalTranscript || interimTranscript;
      if (textToDisplay) {
        onTranscript(textToDisplay);
      }
    };

    // Simple error handling: return microphone button to 🎤
    recognition.onerror = (event: any) => {
      console.warn('SpeechRecognition error:', event.error);
      isListeningRef.current = false;
      setIsListening(false);
      onStateChangeNotify?.('idle');

      if (event.error === 'not-allowed') {
        setErrorMessage('Microphone permission denied.');
        setTimeout(() => setErrorMessage(null), 4000);
      } else if (event.error === 'audio-capture') {
        setErrorMessage('No microphone detected.');
        setTimeout(() => setErrorMessage(null), 4000);
      } else if (event.error === 'not-readable') {
        setErrorMessage('Microphone is unavailable or being used elsewhere.');
        setTimeout(() => setErrorMessage(null), 4000);
      } else if (event.error === 'no-speech') {
        // User didn't speak before silence timeout, reset cleanly
      } else if (event.error !== 'aborted') {
        setErrorMessage(`Speech recognition error: ${event.error}`);
        setTimeout(() => setErrorMessage(null), 4000);
      }
    };

    // When speech recognition ends, return button to 🎤 and finalize transcript
    recognition.onend = () => {
      isListeningRef.current = false;
      setIsListening(false);
      onStateChangeNotify?.('idle');

      if (finalTranscript.trim()) {
        if (autoSend && onSendImmediate) {
          onSendImmediate(finalTranscript.trim());
        } else {
          onTranscript(finalTranscript.trim());
        }
      }
    };

    try {
      recognition.start();
      isListeningRef.current = true;
      setIsListening(true);
    } catch (startErr: any) {
      if (startErr?.name === 'InvalidStateError') {
        // Reusable instance reset if in transition
        try {
          recognition.abort();
          setTimeout(() => {
            try {
              recognition.start();
              isListeningRef.current = true;
              setIsListening(true);
            } catch {}
          }, 80);
        } catch {}
      } else {
        console.warn('Recognition start exception:', startErr);
        isListeningRef.current = false;
        setIsListening(false);
        onStateChangeNotify?.('idle');
        setErrorMessage('Failed to start speech recognition.');
        setTimeout(() => setErrorMessage(null), 4000);
      }
    }
  };

  const currentLang = VOICE_LANG_MAP[selectedLanguage] || VOICE_LANG_MAP.en;

  return (
    <div className="relative inline-flex items-center gap-1.5" ref={menuRef}>
      {/* Multilingual Selector */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setShowLangMenu(!showLangMenu)}
          disabled={disabled || isListening}
          title="Select Voice Language"
          className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-colors cursor-pointer disabled:opacity-50"
        >
          <span>{currentLang.name}</span>
          <ChevronDown className="w-3 h-3 text-slate-400" />
        </button>

        {showLangMenu && (
          <div className="absolute bottom-full mb-1.5 left-0 z-50 bg-white border border-slate-200 rounded-xl shadow-lg p-1 min-w-[140px] text-xs">
            <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 mb-1">
              Language
            </div>
            {Object.entries(VOICE_LANG_MAP)
              .filter(([code]) => code !== 'auto')
              .map(([code, meta]) => (
                <button
                  key={code}
                  type="button"
                  onClick={() => {
                    onLanguageChange(code as SupportedLanguage);
                    setShowLangMenu(false);
                  }}
                  className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center justify-between transition-colors cursor-pointer ${
                    selectedLanguage === code
                      ? 'bg-blue-50 text-blue-700 font-bold'
                      : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <span>{meta.name}</span>
                  <span className="text-[10px] text-slate-400 font-mono">{meta.bcp47}</span>
                </button>
              ))}
          </div>
        )}
      </div>

      {/* Microphone Button Toggle:
          - If listening: 🔴 Listening... (Click to stop)
          - If AI speaking: Volume indicator (Click to interrupt)
          - If idle: 🎤 (Click to start)
      */}
      {isListening ? (
        <button
          type="button"
          onClick={handleToggleListening}
          title="Listening... Click to stop"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-semibold text-xs shadow-xs animate-pulse cursor-pointer transition-all shrink-0"
        >
          <span className="text-xs">🔴</span>
          <span>Listening...</span>
        </button>
      ) : isAiSpeaking ? (
        <button
          type="button"
          onClick={handleToggleListening}
          title="AI is speaking. Click to talk"
          className="p-2 rounded-xl bg-blue-100 hover:bg-blue-200 text-blue-700 animate-pulse transition-all flex items-center justify-center cursor-pointer shrink-0"
        >
          <Volume2 className="w-4 h-4 text-blue-600" />
        </button>
      ) : (
        <button
          type="button"
          onClick={handleToggleListening}
          disabled={disabled}
          title={`Click to Speak (${currentLang.name})`}
          className="p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-all flex items-center justify-center cursor-pointer shrink-0 disabled:opacity-50"
        >
          <Mic className="w-4 h-4" />
        </button>
      )}

      {/* Error Message Bubble */}
      {errorMessage && (
        <div className="absolute bottom-full mb-2 right-0 z-50 bg-slate-900 text-white text-xs px-3 py-1.5 rounded-lg shadow-lg whitespace-nowrap animate-fadeIn">
          {errorMessage}
        </div>
      )}
    </div>
  );
};
