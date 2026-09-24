import React, { useState, useRef } from 'react';
import { Paperclip, ArrowUp } from 'lucide-react';
import { VoiceInputButton } from './VoiceInputButton';
import { SupportedLanguage, VoiceAssistantState } from '../types/assistant';

interface ChatInputBarProps {
  onSendMessage: (text: string) => void;
  onAttachDataset: (file: File) => void;
  isLoading: boolean;
  selectedLanguage: SupportedLanguage;
  onLanguageChange: (lang: SupportedLanguage) => void;
  autoSend?: boolean;
  isAiSpeaking?: boolean;
  onStopAiSpeech?: () => void;
  onVoiceStateChange?: (state: VoiceAssistantState, transcript?: string, error?: string) => void;
}

export const ChatInputBar: React.FC<ChatInputBarProps> = ({
  onSendMessage,
  onAttachDataset,
  isLoading,
  selectedLanguage,
  onLanguageChange,
  autoSend = false,
  isAiSpeaking = false,
  onStopAiSpeech,
  onVoiceStateChange,
}) => {
  const [text, setText] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed || isLoading) return;
    onSendMessage(trimmed);
    setText('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    const target = e.target;
    target.style.height = 'auto';
    target.style.height = `${Math.min(target.scrollHeight, 140)}px`;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onAttachDataset(file);
      e.target.value = '';
    }
  };

  // When voice captures transcript:
  // If autoSend is ON: sends immediately
  // If autoSend is OFF: places in input for user review
  const handleVoiceTranscript = (transcript: string) => {
    setText(transcript);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 140)}px`;
    }
  };

  const handleVoiceSendImmediate = (transcript: string) => {
    onSendMessage(transcript);
    setText('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  return (
    <div className="sticky bottom-0 bg-linear-to-t from-slate-50 via-slate-50/95 to-transparent pt-3 pb-5 px-4 sm:px-6 w-full max-w-3xl mx-auto">
      {/* Hidden File Input for CSV, XLSX, XLS */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,.xlsx,.xls"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Floating ChatGPT-Style Message Input Box */}
      <div className="relative bg-white border border-slate-200/90 hover:border-slate-300 focus-within:border-slate-400 focus-within:ring-2 focus-within:ring-slate-100 rounded-2xl shadow-xs transition-all flex items-end p-2 sm:p-2.5">
        {/* 📎 Attach Dataset */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          title="Attach Dataset (CSV, XLSX, XLS)"
          disabled={isLoading}
          className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer shrink-0 mb-0.5"
        >
          <Paperclip className="w-5 h-5 -rotate-45" />
        </button>

        {/* Textarea */}
        <textarea
          ref={textareaRef}
          rows={1}
          value={text}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          disabled={isLoading}
          placeholder="Message DataMind AI..."
          className="w-full resize-none text-slate-900 text-sm sm:text-base placeholder:text-slate-400 focus:outline-hidden bg-transparent px-2.5 py-1.5 max-h-36 leading-relaxed"
        />

        {/* 🎤 Voice Input Button + Language Selector */}
        <div className="shrink-0 mr-1 mb-0.5">
          <VoiceInputButton
            onTranscript={handleVoiceTranscript}
            onSendImmediate={handleVoiceSendImmediate}
            selectedLanguage={selectedLanguage}
            onLanguageChange={onLanguageChange}
            disabled={isLoading}
            autoSend={autoSend}
            isAiSpeaking={isAiSpeaking}
            onStopAiSpeech={onStopAiSpeech}
            onStateChangeNotify={onVoiceStateChange}
          />
        </div>

        {/* ➤ Send Button */}
        <button
          type="button"
          onClick={handleSend}
          disabled={!text.trim() || isLoading}
          className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:bg-slate-200 disabled:text-slate-400 text-white flex items-center justify-center transition-all shrink-0 cursor-pointer disabled:cursor-not-allowed mb-0.5"
          title="Send"
        >
          <ArrowUp className="w-4 h-4 stroke-[2.5]" />
        </button>
      </div>
    </div>
  );
};
