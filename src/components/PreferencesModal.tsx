import React, { useState, useEffect } from 'react';
import {
  X,
  Sliders,
  Check,
  Globe,
  Volume2,
  AlignLeft,
  Mic,
  Send,
  Radio,
  Bug,
  RefreshCw,
  Play,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';
import {
  UserPreferences,
  SUPPORTED_LANGUAGES,
  SupportedLanguage,
  VoiceAssistantState,
  VoiceDebugInfo,
} from '../types/assistant';
import { saveUserPreferences } from '../utils/customKnowledge';
import { getVoiceDebugInfo, testMicrophoneHardware } from '../utils/speechUtils';

interface PreferencesModalProps {
  isOpen: boolean;
  onClose: () => void;
  preferences: UserPreferences;
  onUpdatePreferences: (prefs: UserPreferences) => void;
  currentVoiceState?: VoiceAssistantState;
  lastVoiceTranscript?: string;
  lastVoiceError?: string;
}

export const PreferencesModal: React.FC<PreferencesModalProps> = ({
  isOpen,
  onClose,
  preferences,
  onUpdatePreferences,
  currentVoiceState = 'idle',
  lastVoiceTranscript = '',
  lastVoiceError = '',
}) => {
  const [localPrefs, setLocalPrefs] = useState<UserPreferences>(preferences);
  const [debugInfo, setDebugInfo] = useState<VoiceDebugInfo | null>(null);
  const [showDebug, setShowDebug] = useState(false);
  const [isLoadingDebug, setIsLoadingDebug] = useState(false);

  // Microphone Hardware Test State (Diagnostic Utility)
  const [isTestingMic, setIsTestingMic] = useState(false);
  const [micTestResult, setMicTestResult] = useState<{
    tested: boolean;
    success: boolean;
    message: string;
    deviceName?: string;
    testedAt?: string;
  } | null>(null);

  // Sync when opened
  useEffect(() => {
    if (isOpen) {
      setLocalPrefs(preferences);
      refreshDebugInfo();
      setMicTestResult(null);
    }
  }, [isOpen, preferences]);

  const refreshDebugInfo = async () => {
    setIsLoadingDebug(true);
    try {
      const info = await getVoiceDebugInfo(
        currentVoiceState,
        lastVoiceTranscript,
        lastVoiceError,
        localPrefs.voiceLanguage || localPrefs.preferredLanguage
      );
      setDebugInfo(info);
    } finally {
      setIsLoadingDebug(false);
    }
  };

  // Run hardware test diagnostic utility (independent of speech recognition)
  const handleTestMicrophone = async () => {
    setIsTestingMic(true);
    setMicTestResult(null);
    try {
      // Direct call to verify hardware access independently of speech recognition
      // The media stream is immediately closed and released using track.stop()
      const res = await testMicrophoneHardware();
      setMicTestResult({
        tested: true,
        success: res.success,
        message: res.message,
        deviceName: res.deviceName,
        testedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      });
      // Refresh diagnostic status after test
      refreshDebugInfo();
    } catch (err: any) {
      setMicTestResult({
        tested: true,
        success: false,
        message: err?.message || 'Failed to complete microphone hardware verification.',
        testedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      });
    } finally {
      setIsTestingMic(false);
    }
  };

  if (!isOpen) return null;

  const handleSave = () => {
    saveUserPreferences(localPrefs);
    onUpdatePreferences(localPrefs);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200 relative space-y-5 max-h-[90vh] overflow-y-auto custom-scrollbar">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Personalization & Voice Settings</h3>
              <p className="text-xs text-slate-500">Configure language, responses, and real voice assistant</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Options */}
        <div className="space-y-4 text-xs">
          {/* Section 1: Core AI & Language */}
          <div className="space-y-3">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              General & Language
            </h4>

            {/* Response Language */}
            <div className="space-y-1.5">
              <label className="font-bold text-slate-800 flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-blue-600" />
                <span>Preferred AI Response Language</span>
              </label>
              <select
                value={localPrefs.preferredLanguage}
                onChange={(e) =>
                  setLocalPrefs({ ...localPrefs, preferredLanguage: e.target.value as SupportedLanguage })
                }
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-medium focus:outline-hidden focus:border-blue-600"
              >
                {SUPPORTED_LANGUAGES.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.name} — {l.nativeName}
                  </option>
                ))}
              </select>
            </div>

            {/* Response Length */}
            <div className="space-y-1.5">
              <label className="font-bold text-slate-800 flex items-center gap-1.5">
                <AlignLeft className="w-3.5 h-3.5 text-blue-600" />
                <span>Response Length (Progressive Disclosure)</span>
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['short', 'normal', 'detailed'] as const).map((len) => (
                  <button
                    key={len}
                    type="button"
                    onClick={() => setLocalPrefs({ ...localPrefs, responseLength: len })}
                    className={`py-2 px-3 rounded-lg border text-center font-medium capitalize transition-all cursor-pointer ${
                      localPrefs.responseLength === len
                        ? 'bg-blue-50 border-blue-600 text-blue-800 font-bold shadow-2xs'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {len === 'short' ? 'Short (Direct)' : len}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Section 2: Real Voice Assistant Settings */}
          <div className="space-y-3.5 pt-3 border-t border-slate-100">
            <div>
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                🎙 Voice Assistant Settings
              </h4>
            </div>

            {/* Test Microphone Diagnostic Utility */}
            <div className="p-3.5 bg-slate-50/90 rounded-2xl border border-slate-200 space-y-2.5">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5 font-bold text-slate-800 text-xs">
                    <Mic className="w-4 h-4 text-blue-600" />
                    <span>Test Microphone (Diagnostic Utility)</span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-snug">
                    Verifies physical microphone hardware access via <code className="px-1 py-0.5 bg-slate-200/70 rounded text-[10px] font-mono text-slate-700">getUserMedia</code> independently of speech recognition, then immediately releases the stream.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleTestMicrophone}
                  disabled={isTestingMic}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold rounded-xl text-[11px] flex items-center gap-1.5 cursor-pointer transition-all shadow-xs shrink-0 disabled:opacity-60 disabled:cursor-not-allowed"
                  title="Test microphone hardware access independently"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isTestingMic ? 'animate-spin' : ''}`} />
                  <span>{isTestingMic ? 'Testing...' : micTestResult ? 'Retest Microphone' : 'Test Microphone'}</span>
                </button>
              </div>

              {/* In-Progress Testing Indicator */}
              {isTestingMic && (
                <div className="p-2.5 bg-blue-50 border border-blue-200 text-blue-800 rounded-xl flex items-center gap-2 animate-fadeIn text-xs">
                  <span className="w-2 h-2 rounded-full bg-blue-600 animate-ping shrink-0" />
                  <span className="font-medium text-[11px]">
                    Requesting audio hardware access & checking tracks...
                  </span>
                </div>
              )}

              {/* Test Result Banner */}
              {micTestResult && !isTestingMic && (
                <div
                  className={`p-3 rounded-xl border flex items-start gap-2.5 animate-fadeIn text-xs ${
                    micTestResult.success
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                      : 'bg-rose-50 border-rose-200 text-rose-900'
                  }`}
                >
                  {micTestResult.success ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="font-bold text-xs">
                        {micTestResult.success ? 'Microphone Test Passed' : 'Microphone Test Failed'}
                      </div>
                      {micTestResult.testedAt && (
                        <span className="text-[10px] text-slate-400 font-mono">
                          {micTestResult.testedAt}
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] leading-relaxed">
                      {micTestResult.message}
                    </div>
                    {micTestResult.deviceName && (
                      <div className="text-[10px] font-mono bg-white/80 px-2 py-0.5 rounded-md border border-emerald-200 text-emerald-800 inline-block">
                        Active Input: {micTestResult.deviceName}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* 1. Voice Input ON/OFF */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Mic className="w-4 h-4 text-blue-600" />
                <div>
                  <div className="font-bold text-slate-800">Voice Input</div>
                  <div className="text-[11px] text-slate-500">Enable speech recognition via microphone</div>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={localPrefs.voiceInputEnabled}
                  onChange={(e) => setLocalPrefs({ ...localPrefs, voiceInputEnabled: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            {/* 2. Voice Language */}
            <div className="space-y-1.5">
              <label className="font-bold text-slate-800 flex items-center gap-1.5">
                <Radio className="w-3.5 h-3.5 text-blue-600" />
                <span>Voice Recognition Language</span>
              </label>
              <select
                value={localPrefs.voiceLanguage}
                onChange={(e) =>
                  setLocalPrefs({ ...localPrefs, voiceLanguage: e.target.value as SupportedLanguage })
                }
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-medium focus:outline-hidden focus:border-blue-600"
              >
                {SUPPORTED_LANGUAGES.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.name} ({l.voiceLangCode})
                  </option>
                ))}
              </select>
            </div>

            {/* 3. Voice Auto Send ON/OFF */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Send className="w-4 h-4 text-emerald-600" />
                <div>
                  <div className="font-bold text-slate-800">Voice Auto Send</div>
                  <div className="text-[11px] text-slate-500">
                    Send speech query immediately on silence without review
                  </div>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={localPrefs.voiceAutoSend}
                  onChange={(e) => setLocalPrefs({ ...localPrefs, voiceAutoSend: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
              </label>
            </div>

            {/* 4. Read AI Answers (TTS) ON/OFF */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Volume2 className="w-4 h-4 text-blue-600" />
                <div>
                  <div className="font-bold text-slate-800">Read AI Answers (Text-to-Speech)</div>
                  <div className="text-[11px] text-slate-500">Automatically speak text response aloud</div>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={localPrefs.voiceAutoRead}
                  onChange={(e) => setLocalPrefs({ ...localPrefs, voiceAutoRead: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            {/* 5. Voice Mode (Continuous Hands-Free) */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Radio className="w-4 h-4 text-purple-600" />
                <div>
                  <div className="font-bold text-slate-800">Hands-Free Voice Mode</div>
                  <div className="text-[11px] text-slate-500">
                    Listen → Transcribe → Answer → Speak → Listen again
                  </div>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={localPrefs.voiceMode}
                  onChange={(e) => setLocalPrefs({ ...localPrefs, voiceMode: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-600"></div>
              </label>
            </div>
          </div>

          {/* Section 3: Developer / Debug Panel (Requirements 18 & 26) */}
          <div className="pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => {
                setShowDebug(!showDebug);
                if (!showDebug) refreshDebugInfo();
              }}
              className="flex items-center justify-between w-full p-2.5 bg-slate-100/70 hover:bg-slate-100 rounded-xl text-slate-700 font-bold cursor-pointer transition-colors"
            >
              <div className="flex items-center gap-1.5">
                <Bug className="w-3.5 h-3.5 text-slate-500" />
                <span>Voice Diagnostics & Debug Info</span>
              </div>
              <span className="text-[11px] text-blue-600 font-medium">
                {showDebug ? 'Hide Panel' : 'Show Panel'}
              </span>
            </button>

            {showDebug && (
              <div className="mt-2.5 p-3.5 bg-slate-900 text-slate-200 rounded-xl space-y-2 font-mono text-[11px]">
                <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                  <span className="font-bold text-slate-400">VOICE SUBSYSTEM DIAGNOSTICS</span>
                  <button
                    type="button"
                    onClick={refreshDebugInfo}
                    disabled={isLoadingDebug}
                    className="p-1 hover:text-white transition-colors cursor-pointer"
                    title="Refresh diagnostic status"
                  >
                    <RefreshCw className={`w-3 h-3 ${isLoadingDebug ? 'animate-spin' : ''}`} />
                  </button>
                </div>

                {/* Exact Requirement 18 diagnostics list */}
                <div className="grid grid-cols-2 gap-x-2 gap-y-1.5 pt-1">
                  <div>
                    <span className="text-slate-400">Browser:</span>{' '}
                    <span className="text-white font-semibold">{debugInfo?.browser || 'Detecting...'}</span>
                  </div>

                  <div>
                    <span className="text-slate-400">Speech Recognition:</span>{' '}
                    <span
                      className={
                        debugInfo?.speechRecognitionSupported ? 'text-emerald-400 font-bold' : 'text-rose-400'
                      }
                    >
                      {debugInfo?.speechRecognitionSupported ? 'SUPPORTED' : 'NOT SUPPORTED'}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-400">Secure Context:</span>{' '}
                    <span
                      className={
                        debugInfo?.secureContext ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'
                      }
                    >
                      {debugInfo?.secureContext ? 'YES' : 'NO'}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-400">Microphone API:</span>{' '}
                    <span
                      className={
                        debugInfo?.microphoneApiAvailable ? 'text-emerald-400' : 'text-rose-400'
                      }
                    >
                      {debugInfo?.microphoneApiAvailable ? 'AVAILABLE' : 'NOT AVAILABLE'}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-400">Microphone Permission:</span>{' '}
                    <span
                      className={
                        debugInfo?.microphonePermission === 'granted'
                          ? 'text-emerald-400 font-bold'
                          : debugInfo?.microphonePermission === 'denied'
                          ? 'text-rose-400 font-bold'
                          : debugInfo?.microphonePermission === 'prompt'
                          ? 'text-blue-400'
                          : 'text-amber-400'
                      }
                    >
                      {debugInfo?.microphonePermission?.toUpperCase() || 'UNKNOWN'}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-400">Microphone Device:</span>{' '}
                    <span
                      className={
                        debugInfo?.microphoneDeviceAvailable ? 'text-emerald-400' : 'text-rose-400 font-bold'
                      }
                    >
                      {debugInfo?.microphoneDeviceAvailable ? 'AVAILABLE' : 'NOT FOUND'}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-400">Speech Synthesis:</span>{' '}
                    <span
                      className={
                        debugInfo?.speechSynthesisSupported ? 'text-emerald-400 font-bold' : 'text-rose-400'
                      }
                    >
                      {debugInfo?.speechSynthesisSupported ? 'SUPPORTED' : 'NOT SUPPORTED'}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-400">Selected Language:</span>{' '}
                    <span className="text-blue-400 font-bold">{debugInfo?.selectedLanguage}</span>
                  </div>

                  <div>
                    <span className="text-slate-400">Current State:</span>{' '}
                    <span className="text-amber-400 font-bold">
                      {debugInfo?.currentState?.toUpperCase() || 'IDLE'}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-400">Available Voices:</span>{' '}
                    <span className="text-white">{debugInfo?.availableVoicesCount ?? 0}</span>
                  </div>
                </div>

                <div className="pt-1.5 border-t border-slate-800">
                  <div className="text-slate-400">Selected Voice:</div>
                  <div className="text-slate-300 truncate">
                    {debugInfo?.selectedVoiceName || 'Default System Voice'}
                  </div>
                </div>

                <div className="pt-1">
                  <div className="text-slate-400">Last Transcript:</div>
                  <div className="text-slate-300 italic truncate">
                    {debugInfo?.lastTranscript && debugInfo.lastTranscript !== 'None'
                      ? `"${debugInfo.lastTranscript}"`
                      : 'None'}
                  </div>
                </div>

                <div className="pt-1">
                  <div className="text-slate-400">Last Error:</div>
                  <div className="text-rose-400 truncate">{debugInfo?.lastError || 'None'}</div>
                </div>

                {debugInfo?.inIframe && (
                  <div className="pt-1 text-[10px] text-amber-300 flex items-center justify-between">
                    <span>Note: Embedded inside preview iframe environment.</span>
                    <a
                      href={window.location.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline font-bold text-white flex items-center gap-0.5"
                    >
                      Open in Tab <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Save Preferences</span>
          </button>
        </div>
      </div>
    </div>
  );
};
