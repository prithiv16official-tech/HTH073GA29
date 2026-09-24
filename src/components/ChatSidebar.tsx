import React from 'react';
import {
  Plus,
  MessageSquare,
  Trash2,
  Database,
  ChevronLeft,
  BookOpen,
  Sliders,
} from 'lucide-react';

export interface ChatSessionHistory {
  id: string;
  title: string;
  timestamp: string;
}

interface ChatSidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  history: ChatSessionHistory[];
  activeId: string | null;
  activeDatasetName?: string;
  onSelectSession: (id: string) => void;
  onNewChat: () => void;
  onClearHistory: () => void;
  onOpenTeachAi: () => void;
  onOpenPreferences: () => void;
}

export const ChatSidebar: React.FC<ChatSidebarProps> = ({
  isOpen,
  onToggle,
  history,
  activeId,
  activeDatasetName,
  onSelectSession,
  onNewChat,
  onClearHistory,
  onOpenTeachAi,
  onOpenPreferences,
}) => {
  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onToggle}
          className="fixed inset-0 bg-slate-900/30 z-30 lg:hidden backdrop-blur-2xs transition-opacity"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed lg:static top-0 bottom-0 left-0 z-40 w-72 bg-slate-900 text-slate-200 flex flex-col transition-transform duration-300 ease-in-out border-r border-slate-800 ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0 lg:w-72'
        }`}
      >
        {/* Top Header / New Chat */}
        <div className="p-3.5 border-b border-slate-800 flex items-center justify-between">
          <button
            onClick={() => {
              onNewChat();
              if (window.innerWidth < 1024) onToggle();
            }}
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>New Chat</span>
          </button>

          <button
            onClick={onToggle}
            className="lg:hidden ml-2 p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            title="Close sidebar"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        </div>

        {/* History List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1 custom-scrollbar">
          <div className="flex items-center justify-between px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            <span>Recent Conversations</span>
            {history.length > 0 && (
              <button
                onClick={onClearHistory}
                className="text-slate-500 hover:text-rose-400 transition-colors cursor-pointer"
                title="Clear all chat history"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {history.length === 0 ? (
            <div className="px-3 py-8 text-center text-xs text-slate-500 space-y-2">
              <MessageSquare className="w-5 h-5 mx-auto text-slate-600 opacity-60" />
              <p>No recent conversations.</p>
              <p className="text-[11px] text-slate-600">
                Ask a question to begin.
              </p>
            </div>
          ) : (
            history.map((item) => {
              const isActive = item.id === activeId;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    onSelectSession(item.id);
                    if (window.innerWidth < 1024) onToggle();
                  }}
                  className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-medium transition-all flex items-center gap-2.5 group cursor-pointer ${
                    isActive
                      ? 'bg-slate-800 text-white shadow-2xs font-semibold'
                      : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
                  }`}
                >
                  <MessageSquare
                    className={`w-3.5 h-3.5 shrink-0 ${
                      isActive ? 'text-blue-400' : 'text-slate-500 group-hover:text-slate-400'
                    }`}
                  />
                  <div className="flex-1 truncate">
                    <div className="truncate">{item.title}</div>
                    <div className="text-[10px] text-slate-500">{item.timestamp}</div>
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Bottom Sidebar Tools */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/40 space-y-2">
          {/* Active Dataset Status */}
          <div className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700/60 text-xs">
            <div className="flex items-center justify-between text-slate-300 font-semibold mb-0.5">
              <div className="flex items-center gap-1.5 truncate">
                <Database className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                <span className="truncate">{activeDatasetName || '24M Sales Dataset'}</span>
              </div>
              <span className="text-[10px] text-emerald-400">Active</span>
            </div>
            <div className="text-[11px] text-slate-400">
              {activeDatasetName ? 'Custom Dataset Loaded' : 'Verified Dataset: Aug 2026 (₹24.8L)'}
            </div>
          </div>

          {/* Quick Action Links */}
          <div className="grid grid-cols-2 gap-1.5 pt-1">
            <button
              onClick={onOpenTeachAi}
              className="inline-flex items-center justify-center gap-1.5 px-2 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-xs font-medium transition-colors cursor-pointer border border-slate-700/60"
            >
              <BookOpen className="w-3.5 h-3.5 text-blue-400" />
              <span>Teach AI</span>
            </button>

            <button
              onClick={onOpenPreferences}
              className="inline-flex items-center justify-center gap-1.5 px-2 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-xs font-medium transition-colors cursor-pointer border border-slate-700/60"
            >
              <Sliders className="w-3.5 h-3.5 text-slate-400" />
              <span>Settings</span>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};
