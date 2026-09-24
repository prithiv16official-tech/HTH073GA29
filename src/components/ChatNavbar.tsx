import React from 'react';
import {
  Menu,
  Plus,
  BookOpen,
  Sliders,
  Languages,
  Database,
} from 'lucide-react';
import {
  SupportedLanguage,
  SUPPORTED_LANGUAGES,
  UserPreferences,
} from '../types/assistant';

interface ChatNavbarProps {
  onToggleSidebar: () => void;
  onNewChat: () => void;
  onOpenTeachAi: () => void;
  onOpenPreferences: () => void;
  onOpenSampleModal?: () => void;
  selectedLanguage: SupportedLanguage;
  onChangeLanguage: (lang: SupportedLanguage) => void;
  hasMessages: boolean;
}

export const ChatNavbar: React.FC<ChatNavbarProps> = ({
  onToggleSidebar,
  onNewChat,
  onOpenTeachAi,
  onOpenPreferences,
  onOpenSampleModal,
  selectedLanguage,
  onChangeLanguage,
  hasMessages,
}) => {
  return (
    <header className="h-14 bg-white border-b border-slate-200/80 px-3 sm:px-4 flex items-center justify-between shrink-0 z-20">
      {/* Left: Sidebar toggle & Logo */}
      <div className="flex items-center gap-2 sm:gap-3">
        <button
          onClick={onToggleSidebar}
          className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
          title="Toggle chat history"
        >
          <Menu className="w-5 h-5" />
        </button>

        <button
          onClick={onNewChat}
          className="flex items-center gap-2 text-left group cursor-pointer"
        >
          <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-xs shadow-xs">
            DM
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors leading-none">
              DataMind AI
            </span>
            <span className="text-[10px] text-slate-400 font-medium leading-tight mt-0.5 hidden xs:inline">
              Schema-Agnostic Analyst
            </span>
          </div>
        </button>
      </div>

      {/* Right Controls: Datasets, Language Selector, Teach AI, Preferences, New Chat */}
      <div className="flex items-center gap-1.5 sm:gap-2">
        {/* Datasets / Benchmark Schemas Button */}
        {onOpenSampleModal && (
          <button
            onClick={onOpenSampleModal}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg shadow-2xs transition-colors cursor-pointer"
            title="Choose Dataset / Unseen Benchmark Schemas"
          >
            <Database className="w-3.5 h-3.5 text-blue-600" />
            <span className="hidden sm:inline">Datasets</span>
          </button>
        )}

        {/* Language Selector Dropdown */}
        <div className="relative flex items-center bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs">
          <Languages className="w-3.5 h-3.5 text-blue-600 mr-1.5 shrink-0" />
          <select
            value={selectedLanguage}
            onChange={(e) => onChangeLanguage(e.target.value as SupportedLanguage)}
            className="bg-transparent text-slate-700 font-medium focus:outline-hidden cursor-pointer text-xs pr-1"
            title="Switch Language"
          >
            {SUPPORTED_LANGUAGES.map((l) => (
              <option key={l.code} value={l.code}>
                {l.nativeName}
              </option>
            ))}
          </select>
        </div>

        {/* Teach AI Button */}
        <button
          onClick={onOpenTeachAi}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:text-blue-700 bg-white border border-slate-200 hover:border-blue-300 rounded-lg shadow-2xs transition-colors cursor-pointer"
          title="Teach AI / Custom Knowledge"
        >
          <BookOpen className="w-3.5 h-3.5 text-blue-600" />
          <span className="hidden sm:inline">Teach AI</span>
        </button>

        {/* Preferences Button */}
        <button
          onClick={onOpenPreferences}
          className="p-1.5 sm:px-2.5 sm:py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg shadow-2xs transition-colors cursor-pointer flex items-center gap-1"
          title="Preferences & Personalization"
        >
          <Sliders className="w-3.5 h-3.5 text-slate-600" />
          <span className="hidden md:inline">Settings</span>
        </button>

        {/* New Chat Button */}
        {hasMessages && (
          <button
            onClick={onNewChat}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-2xs transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">New Chat</span>
          </button>
        )}
      </div>
    </header>
  );
};
