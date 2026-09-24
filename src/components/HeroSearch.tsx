import React, { useState, useRef } from 'react';
import { Paperclip, ArrowUp, Sparkles, Database } from 'lucide-react';
import { VoiceInputButton } from './VoiceInputButton';
import { SupportedLanguage, VoiceAssistantState } from '../types/assistant';

interface HeroSearchProps {
  onSearch: (query: string) => void;
  onAttachDataset: (file: File) => void;
  isSearching: boolean;
  selectedLanguage: SupportedLanguage;
  onLanguageChange: (lang: SupportedLanguage) => void;
  autoSend?: boolean;
  isAiSpeaking?: boolean;
  onStopAiSpeech?: () => void;
  onVoiceStateChange?: (state: VoiceAssistantState, transcript?: string, error?: string) => void;
  onSelectBenchmark?: (schemaId: string) => void;
  onOpenSampleModal?: () => void;
}

export const HeroSearch: React.FC<HeroSearchProps> = ({
  onSearch,
  onAttachDataset,
  isSearching,
  selectedLanguage,
  onLanguageChange,
  autoSend = false,
  isAiSpeaking = false,
  onStopAiSpeech,
  onVoiceStateChange,
  onSelectBenchmark,
  onOpenSampleModal,
}) => {
  const [inputVal, setInputVal] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const q = inputVal.trim();
    if (!q || isSearching) return;
    onSearch(q);
    setInputVal('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onAttachDataset(file);
      e.target.value = '';
    }
  };

  const handleVoiceTranscript = (text: string) => {
    setInputVal(text);
  };

  const handleVoiceSendImmediate = (text: string) => {
    onSearch(text);
    setInputVal('');
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 py-10 max-w-3xl mx-auto w-full animate-fadeIn select-none">
      {/* Hidden File Input for CSV, XLSX, XLS */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,.xlsx,.xls"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Center of Screen: DataMind AI & Subtitle */}
      <div className="text-center space-y-2.5 mb-7">
        <h1 className="text-3xl sm:text-4xl font-semibold text-slate-800 tracking-tight font-display">
          DataMind AI
        </h1>
        <p className="text-base text-slate-500 font-normal">
          Schema-Agnostic Natural Language Data Analyst
        </p>
      </div>

      {/* Large ChatGPT-Style Input Box */}
      <div className="w-full max-w-2xl">
        <form
          onSubmit={handleSubmit}
          className="relative bg-white border border-slate-200/90 hover:border-slate-300 focus-within:border-slate-400 focus-within:ring-2 focus-within:ring-slate-100 rounded-2xl shadow-xs transition-all flex items-center px-3 py-2.5 sm:py-3"
        >
          {/* 📎 Attach Dataset */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            title="Attach Dataset (CSV, XLSX, XLS)"
            disabled={isSearching}
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer shrink-0 mr-1"
          >
            <Paperclip className="w-5 h-5 -rotate-45" />
          </button>

          {/* Input text */}
          <input
            type="text"
            autoFocus
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isSearching}
            placeholder="Ask anything or attach a dataset..."
            className="w-full text-slate-900 text-sm sm:text-base placeholder:text-slate-400 focus:outline-hidden bg-transparent px-2"
          />

          {/* 🎤 Voice Input */}
          <div className="shrink-0 mr-1.5">
            <VoiceInputButton
              onTranscript={handleVoiceTranscript}
              onSendImmediate={handleVoiceSendImmediate}
              selectedLanguage={selectedLanguage}
              onLanguageChange={onLanguageChange}
              disabled={isSearching}
              autoSend={autoSend}
              isAiSpeaking={isAiSpeaking}
              onStopAiSpeech={onStopAiSpeech}
              onStateChangeNotify={onVoiceStateChange}
            />
          </div>

          {/* ➤ Send */}
          <button
            type="submit"
            disabled={!inputVal.trim() || isSearching}
            className="w-8 h-8 sm:w-9 sm:h-9 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-xl flex items-center justify-center transition-all shrink-0 cursor-pointer disabled:cursor-not-allowed"
            title="Send"
          >
            <ArrowUp className="w-4 h-4 stroke-[2.5]" />
          </button>
        </form>

        {/* Quick Benchmark Datasets & Upload Notice (Step 18) */}
        <div className="mt-4 pt-3 border-t border-slate-200/70">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
            <span className="font-semibold text-slate-700 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-blue-600" />
              Test Unseen Schemas (Step 18 Benchmarks)
            </span>
            {onOpenSampleModal && (
              <button
                type="button"
                onClick={onOpenSampleModal}
                className="text-blue-600 hover:text-blue-800 text-[11px] font-semibold cursor-pointer flex items-center gap-1"
              >
                <Database className="w-3 h-3" />
                <span>All Datasets</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
            <button
              type="button"
              onClick={() => onSelectBenchmark?.('unseen-schema-1')}
              className="p-2.5 bg-white hover:bg-slate-50 border border-slate-200/90 hover:border-blue-300 rounded-xl text-left transition-all cursor-pointer group shadow-2xs"
            >
              <div className="font-bold text-slate-900 group-hover:text-blue-600 text-[12px]">Schema 1: Standard</div>
              <div className="text-[10px] text-slate-500 font-mono mt-0.5 truncate">
                Product · Sales · Region · Date · Quantity
              </div>
            </button>

            <button
              type="button"
              onClick={() => onSelectBenchmark?.('unseen-schema-2')}
              className="p-2.5 bg-white hover:bg-slate-50 border border-slate-200/90 hover:border-blue-300 rounded-xl text-left transition-all cursor-pointer group shadow-2xs"
            >
              <div className="font-bold text-slate-900 group-hover:text-blue-600 text-[12px]">Schema 2: Unseen A</div>
              <div className="text-[10px] text-slate-500 font-mono mt-0.5 truncate">
                Item_Name · Total_Amount · Area · Qty_Sold
              </div>
            </button>

            <button
              type="button"
              onClick={() => onSelectBenchmark?.('unseen-schema-3')}
              className="p-2.5 bg-white hover:bg-slate-50 border border-slate-200/90 hover:border-blue-300 rounded-xl text-left transition-all cursor-pointer group shadow-2xs"
            >
              <div className="font-bold text-slate-900 group-hover:text-blue-600 text-[12px]">Schema 3: Unseen B</div>
              <div className="text-[10px] text-slate-500 font-mono mt-0.5 truncate">
                Product_Name · Net_Revenue · Location · Units
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
