import { SupportedLanguage, VoiceAssistantState, VoiceDebugInfo } from '../types/assistant';

/**
 * Check if browser supports Web Speech API Recognition
 */
export function isSpeechRecognitionSupported(): boolean {
  if (typeof window === 'undefined') return false;
  return Boolean(
    (window as any).SpeechRecognition ||
    (window as any).webkitSpeechRecognition
  );
}

/**
 * Check if the current context is secure (HTTPS or localhost)
 */
export function isSecureContext(): boolean {
  if (typeof window === 'undefined') return false;
  return Boolean(window.isSecureContext);
}

/**
 * Detect if running inside an iframe (e.g. AI Studio preview environment)
 */
export function isRunningInIframe(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
}

/**
 * Detect browser name and version
 */
export function getBrowserName(): string {
  if (typeof navigator === 'undefined') return 'Unknown';
  const ua = navigator.userAgent;
  if (/Edg\//.test(ua)) return 'Microsoft Edge';
  if (/Chrome\//.test(ua)) return 'Google Chrome';
  if (/Safari\//.test(ua) && !/Chrome\//.test(ua)) return 'Apple Safari';
  if (/Firefox\//.test(ua)) return 'Mozilla Firefox';
  return 'Browser';
}

/**
 * Check if browser supports Web Speech API Synthesis (TTS)
 */
export function isSpeechSynthesisSupported(): boolean {
  if (typeof window === 'undefined') return false;
  return typeof window.speechSynthesis !== 'undefined' && typeof SpeechSynthesisUtterance !== 'undefined';
}

/**
 * Maps application language codes to standard BCP-47 locale tags
 */
export function getVoiceLangCode(lang: SupportedLanguage = 'en'): string {
  switch (lang) {
    case 'ta':
    case 'tanglish':
      return 'ta-IN';
    case 'hi':
      return 'hi-IN';
    case 'te':
      return 'te-IN';
    case 'ml':
      return 'ml-IN';
    case 'kn':
      return 'kn-IN';
    case 'en':
    case 'auto':
    default:
      return 'en-IN';
  }
}

/**
 * Get available synthesis voices with browser cache handling
 */
export function getAvailableVoices(): SpeechSynthesisVoice[] {
  if (!isSpeechSynthesisSupported()) return [];
  try {
    return window.speechSynthesis.getVoices() || [];
  } catch {
    return [];
  }
}

/**
 * Finds the best synthesis voice for a given language code
 */
export function getBestVoiceForLanguage(lang: SupportedLanguage): SpeechSynthesisVoice | null {
  const voices = getAvailableVoices();
  if (!voices.length) return null;

  const targetBcp47 = getVoiceLangCode(lang).toLowerCase();
  const rootLang = targetBcp47.split('-')[0];

  // Tier 1: Exact BCP-47 match (e.g., ta-IN, hi-IN, en-IN)
  const exact = voices.find((v) => v.lang.toLowerCase().replace(/_/g, '-') === targetBcp47);
  if (exact) return exact;

  // Tier 2: Root language prefix match (e.g., 'ta', 'hi', 'te', 'ml', 'kn')
  const prefixMatch = voices.find((v) => v.lang.toLowerCase().startsWith(rootLang));
  if (prefixMatch) return prefixMatch;

  // Tier 3: Match Indian English for subcontinent context
  const indianEn = voices.find((v) => v.lang.toLowerCase() === 'en-in' || v.name.toLowerCase().includes('india'));
  if (indianEn) return indianEn;

  // Tier 4: Default voice
  const defaultVoice = voices.find((v) => v.default);
  return defaultVoice || voices[0] || null;
}

/**
 * Check permission status of microphone using navigator.permissions API
 */
export async function checkMicrophonePermission(): Promise<'granted' | 'prompt' | 'denied' | 'unknown'> {
  if (typeof navigator === 'undefined' || !navigator.permissions?.query) {
    return 'unknown';
  }
  try {
    const status = await navigator.permissions.query({ name: 'microphone' as any });
    if (status.state === 'granted') return 'granted';
    if (status.state === 'denied') return 'denied';
    if (status.state === 'prompt') return 'prompt';
    return 'unknown';
  } catch {
    return 'unknown';
  }
}

/**
 * Check if an audio input device (microphone) is physically detected
 */
export async function checkMicrophoneDeviceAvailable(): Promise<boolean> {
  if (typeof navigator === 'undefined' || !navigator.mediaDevices?.enumerateDevices) {
    return true; // Assume true if API not available
  }
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices.some((d) => d.kind === 'audioinput');
  } catch {
    return true;
  }
}

/**
 * Standalone Microphone Hardware & Permission Test (Diagnostic Utility)
 * Requests navigator.mediaDevices.getUserMedia({ audio: true }) independently of
 * speech recognition, verifies hardware access, and immediately stops all tracks.
 */
export async function testMicrophoneHardware(): Promise<{
  success: boolean;
  message: string;
  deviceName?: string;
  code?: string;
}> {
  // 1. Check secure context
  if (!isSecureContext()) {
    return {
      success: false,
      message: 'Microphone access requires a secure connection (HTTPS or localhost).',
      code: 'insecure_context',
    };
  }

  // 2. Check browser support for mediaDevices
  if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
    return {
      success: false,
      message: 'Microphone API (navigator.mediaDevices.getUserMedia) is not supported in this browser.',
      code: 'api_unsupported',
    };
  }

  // 3. Request audio stream to verify hardware access
  let stream: MediaStream | null = null;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const tracks = stream.getTracks();
    const deviceName = tracks[0]?.label || 'Active Audio Input Device';

    // Ensure the stream is immediately stopped using track.stop() after verification
    tracks.forEach((track) => {
      try {
        track.stop();
      } catch (stopErr) {
        console.warn('Error stopping track during diagnostic test:', stopErr);
      }
    });

    return {
      success: true,
      message: 'Microphone hardware verified and working properly.',
      deviceName: deviceName !== '' ? deviceName : 'Default Microphone',
      code: 'ok',
    };
  } catch (err: any) {
    // If stream was partially acquired, ensure all tracks are stopped
    if (stream) {
      try {
        stream.getTracks().forEach((track) => track.stop());
      } catch {}
    }

    const errName = err?.name || '';
    if (errName === 'NotAllowedError' || errName === 'PermissionDeniedError') {
      return {
        success: false,
        message: 'Microphone permission was denied. Please allow microphone access in your browser settings and try again.',
        code: 'not_allowed',
      };
    }
    if (errName === 'NotFoundError' || errName === 'DevicesNotFoundError') {
      return {
        success: false,
        message: 'No microphone hardware detected on your device. Please plug in or connect an audio input device.',
        code: 'not_found',
      };
    }
    if (errName === 'NotReadableError' || errName === 'TrackStartError') {
      return {
        success: false,
        message: 'Your microphone is currently in use by another application or the operating system.',
        code: 'in_use',
      };
    }
    if (errName === 'SecurityError') {
      return {
        success: false,
        message: 'Microphone access is blocked by browser security settings or iframe permissions.',
        code: 'security',
      };
    }
    return {
      success: false,
      message: `Microphone error: ${err?.message || errName || 'Unable to access audio device'}`,
      code: 'unknown',
    };
  }
}

let activeRecognitionInstance: any = null;
let activeStreamInstance: MediaStream | null = null;

export interface VoiceRecognitionController {
  stop: () => void;
  abort: () => void;
}

/**
 * Starts real browser speech recognition with:
 * Step 1: Real browser permission prompt via navigator.mediaDevices.getUserMedia({ audio: true })
 * Step 2: Immediately stop the temporary getUserMedia stream
 * Step 3: Start window.SpeechRecognition / webkitSpeechRecognition
 */
export function startVoiceRecognition({
  language = 'en',
  onTranscriptChange,
  onFinalTranscript,
  onStateChange,
  onError,
  onEnd,
}: {
  language?: SupportedLanguage;
  onTranscriptChange?: (text: string, isFinal: boolean) => void;
  onFinalTranscript: (transcript: string) => void;
  onStateChange?: (state: VoiceAssistantState, detail?: string) => void;
  onError: (errorMsg: string, code?: string, isPermissionBlocked?: boolean) => void;
  onEnd: () => void;
}): VoiceRecognitionController {
  let isCancelled = false;

  // 1. Interrupt any active speech synthesis before listening (Requirement 16)
  stopSpeech();

  // 2. Abort any previous recognition instance to prevent InvalidStateError
  if (activeRecognitionInstance) {
    try {
      activeRecognitionInstance.abort();
    } catch {}
    activeRecognitionInstance = null;
  }

  // 3. Check browser SpeechRecognition support (Requirement 1 & 4)
  const SpeechRecognitionClass =
    (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

  if (!SpeechRecognitionClass) {
    const msg = 'Voice input is not supported in this browser. Please use Google Chrome or Microsoft Edge.';
    onStateChange?.('error');
    onError(msg, 'speech_unsupported');
    onEnd();
    return { stop: () => {}, abort: () => {} };
  }

  // 4. Check Secure Context (Requirement 4)
  if (typeof window !== 'undefined' && window.isSecureContext === false) {
    const msg = 'Microphone access requires a secure connection such as HTTPS or localhost.';
    onStateChange?.('error');
    onError(msg, 'insecure_context');
    onEnd();
    return { stop: () => {}, abort: () => {} };
  }

  // 5. Check navigator.mediaDevices.getUserMedia
  if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
    const msg = 'Voice input is not supported in this browser. Please use Google Chrome or Microsoft Edge.';
    onStateChange?.('error');
    onError(msg, 'api_unsupported');
    onEnd();
    return { stop: () => {}, abort: () => {} };
  }

  // 6. Direct execution of navigator.mediaDevices.getUserMedia (Requirement 1, 2, 5)
  (async () => {
    let stream: MediaStream;
    try {
      // Trigger Chrome's REAL native permission popup
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      activeStreamInstance = stream;
    } catch (err: any) {
      if (isCancelled) return;
      const errName = err?.name || '';
      console.warn('getUserMedia error:', errName, err);

      let isBlocked = false;
      if (errName === 'NotAllowedError' || errName === 'PermissionDeniedError') {
        try {
          if (navigator.permissions?.query) {
            const perm = await navigator.permissions.query({ name: 'microphone' as any });
            if (perm.state === 'denied') isBlocked = true;
          }
        } catch {}

        if (isBlocked) {
          onError(
            'Microphone permission is blocked for this site.\nChrome → Site settings → Microphone → Allow → Reload the page.',
            'blocked',
            true
          );
        } else {
          onError(
            'Microphone access was denied. Please allow microphone access from Chrome Site Settings and try again.',
            'not_allowed',
            true
          );
        }
      } else if (errName === 'NotFoundError' || errName === 'DevicesNotFoundError') {
        onError('No microphone was detected.', 'not_found');
      } else if (errName === 'NotReadableError' || errName === 'TrackStartError') {
        onError('Your microphone is being used by another application.', 'in_use');
      } else if (errName === 'SecurityError') {
        onError('Microphone access is blocked by the browser security settings.', 'security');
      } else {
        onError(`Microphone error: ${err?.message || errName}`, 'error');
      }

      onStateChange?.('error');
      onEnd();
      return;
    }

    if (isCancelled) {
      stream.getTracks().forEach((track) => track.stop());
      return;
    }

    // Step 2: Stop the temporary permission stream immediately (Requirement 12)
    stream.getTracks().forEach((track) => track.stop());
    activeStreamInstance = null;

    // Step 3: Start SpeechRecognition (Requirement 3, 4, 5, 8, 9, 10)
    try {
      const recognition = new SpeechRecognitionClass();
      activeRecognitionInstance = recognition;

      const langCode = getVoiceLangCode(language);
      recognition.lang = langCode;
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;

      let finalTranscript = '';
      let hasFinished = false;

      recognition.onstart = () => {
        if (isCancelled) return;
        onStateChange?.('listening', `Listening in ${langCode}...`);
      };

      recognition.onresult = (event: any) => {
        if (isCancelled) return;
        let interim = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const item = event.results[i];
          if (item.isFinal) {
            finalTranscript += item[0].transcript;
          } else {
            interim += item[0].transcript;
          }
        }
        const currentText = finalTranscript || interim;
        if (currentText) {
          onTranscriptChange?.(currentText, Boolean(finalTranscript));
        }
      };

      recognition.onerror = (event: any) => {
        if (isCancelled) return;
        console.warn('SpeechRecognition onerror:', event.error);
        if (event.error === 'not-allowed') {
          onError(
            'Microphone access was denied. Please allow microphone access from Chrome Site Settings and try again.',
            'not_allowed',
            true
          );
        } else if (event.error === 'no-speech') {
          onError('No speech was detected. Please try speaking again.', 'no_speech');
        } else if (event.error === 'audio-capture') {
          onError('No microphone was detected.', 'audio_capture');
        } else if (event.error === 'network') {
          onError('Network error occurred during speech recognition.', 'network');
        } else if (event.error !== 'aborted') {
          onError(`Speech recognition error: ${event.error}`, event.error);
        }
        onStateChange?.('error');
      };

      recognition.onend = () => {
        activeRecognitionInstance = null;
        if (!hasFinished && finalTranscript.trim()) {
          hasFinished = true;
          onFinalTranscript(finalTranscript.trim());
        }
        onStateChange?.('idle');
        onEnd();
      };

      recognition.start();
    } catch (err: any) {
      activeRecognitionInstance = null;
      onError(`Failed to start speech recognition: ${err?.message || err}`, 'exception');
      onStateChange?.('error');
      onEnd();
    }
  })();

  return {
    stop: () => {
      isCancelled = true;
      if (activeStreamInstance) {
        try {
          activeStreamInstance.getTracks().forEach((track) => track.stop());
        } catch {}
        activeStreamInstance = null;
      }
      if (activeRecognitionInstance) {
        try {
          activeRecognitionInstance.stop();
        } catch {}
      }
      onStateChange?.('idle');
    },
    abort: () => {
      isCancelled = true;
      if (activeStreamInstance) {
        try {
          activeStreamInstance.getTracks().forEach((track) => track.stop());
        } catch {}
        activeStreamInstance = null;
      }
      if (activeRecognitionInstance) {
        try {
          activeRecognitionInstance.abort();
        } catch {}
        activeRecognitionInstance = null;
      }
      onStateChange?.('idle');
    },
  };
}

let activeUtterance: SpeechSynthesisUtterance | null = null;

/**
 * Speaks text aloud using real browser SpeechSynthesisUtterance.
 * NOTE: TTS is independent from microphone input.
 */
export function speakTextAloud(
  text: string,
  lang: SupportedLanguage = 'en',
  onStart?: () => void,
  onEnd?: () => void,
  onError?: (err: any) => void
): boolean {
  if (!isSpeechSynthesisSupported()) return false;

  try {
    window.speechSynthesis.cancel();

    const cleanText = text
      .replace(/[*#_`]/g, '')
      .replace(/₹\s*/g, 'Rupees ')
      .replace(/\+\s*/g, 'plus ')
      .replace(/%\s*/g, ' percent ')
      .replace(/\|\s*/g, ' ')
      .trim();

    if (!cleanText) return false;

    const utterance = new SpeechSynthesisUtterance(cleanText);
    const targetCode = getVoiceLangCode(lang);
    utterance.lang = targetCode;
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    const matchedVoice = getBestVoiceForLanguage(lang);
    if (matchedVoice) {
      utterance.voice = matchedVoice;
    }

    utterance.onstart = () => {
      if (onStart) onStart();
    };

    utterance.onend = () => {
      activeUtterance = null;
      if (onEnd) onEnd();
    };

    utterance.onerror = (e) => {
      activeUtterance = null;
      if (onError) onError(e);
      if (onEnd) onEnd();
    };

    activeUtterance = utterance;
    window.speechSynthesis.speak(utterance);
    return true;
  } catch (err) {
    console.error('Speech synthesis error:', err);
    activeUtterance = null;
    if (onError) onError(err);
    return false;
  }
}

export function pauseSpeech(): void {
  if (isSpeechSynthesisSupported() && window.speechSynthesis.speaking) {
    window.speechSynthesis.pause();
  }
}

export function resumeSpeech(): void {
  if (isSpeechSynthesisSupported() && window.speechSynthesis.paused) {
    window.speechSynthesis.resume();
  }
}

export function stopSpeech(): void {
  if (isSpeechSynthesisSupported()) {
    try {
      window.speechSynthesis.cancel();
    } catch {}
    activeUtterance = null;
  }
}

export function isSpeechSpeaking(): boolean {
  if (!isSpeechSynthesisSupported()) return false;
  return window.speechSynthesis.speaking;
}

export function isSpeechPaused(): boolean {
  if (!isSpeechSynthesisSupported()) return false;
  return window.speechSynthesis.paused;
}

/**
 * Compiles real-time debug info for the Settings diagnostic section
 */
export async function getVoiceDebugInfo(
  currentState: VoiceAssistantState,
  lastTranscript: string,
  lastError: string,
  selectedLang: SupportedLanguage
): Promise<VoiceDebugInfo> {
  const micPermission = await checkMicrophonePermission();
  const micDeviceAvailable = await checkMicrophoneDeviceAvailable();
  const voices = getAvailableVoices();
  const selectedVoice = getBestVoiceForLanguage(selectedLang);
  const secure = isSecureContext();
  const inIframe = isRunningInIframe();
  const browser = getBrowserName();
  const micApiAvailable = typeof navigator !== 'undefined' && Boolean(navigator.mediaDevices?.getUserMedia);

  return {
    browser,
    speechRecognitionSupported: isSpeechRecognitionSupported(),
    secureContext: secure,
    microphoneApiAvailable: micApiAvailable,
    microphonePermission: micPermission,
    microphoneDeviceAvailable: micDeviceAvailable,
    speechSynthesisSupported: isSpeechSynthesisSupported(),
    selectedLanguage: getVoiceLangCode(selectedLang),
    availableVoicesCount: voices.length,
    selectedVoiceName: selectedVoice ? `${selectedVoice.name} (${selectedVoice.lang})` : 'Default System Voice',
    currentState,
    lastTranscript: lastTranscript || 'None',
    lastError: lastError || 'None',
    inIframe,
  };
}
