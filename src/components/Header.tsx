import React from 'react';
import { Database, Sparkles, RefreshCw, BarChart3, FileSpreadsheet } from 'lucide-react';
import { Dataset } from '../types/dataset';

interface HeaderProps {
  currentDataset: Dataset | null;
  activeTab: 'dashboard' | 'preview' | 'schema' | 'history';
  onTabChange: (tab: 'dashboard' | 'preview' | 'schema' | 'history') => void;
  onOpenSampleModal: () => void;
  onResetData: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentDataset,
  activeTab,
  onTabChange,
  onOpenSampleModal,
  onResetData,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Zone 1: Single text element wordmark */}
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-slate-900 flex items-center justify-center text-white shadow-sm">
              <Database className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <a href="/" className="text-lg font-bold tracking-tight text-slate-900 flex items-center gap-2">
                DataMind AI
              </a>
            </div>
          </div>

          {/* Zone 2: 4-5 clean text navigation links */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
            <button
              onClick={() => onTabChange('dashboard')}
              className={`transition-colors pb-1 border-b-2 ${
                activeTab === 'dashboard'
                  ? 'border-slate-900 text-slate-900 font-semibold'
                  : 'border-transparent hover:text-slate-900'
              }`}
            >
              Analysis & Q&A
            </button>
            <button
              onClick={() => onTabChange('preview')}
              className={`transition-colors pb-1 border-b-2 flex items-center gap-1.5 ${
                activeTab === 'preview'
                  ? 'border-slate-900 text-slate-900 font-semibold'
                  : 'border-transparent hover:text-slate-900'
              }`}
            >
              <FileSpreadsheet className="w-4 h-4 text-slate-400" />
              Dataset Table
            </button>
            <button
              onClick={() => onTabChange('schema')}
              className={`transition-colors pb-1 border-b-2 flex items-center gap-1.5 ${
                activeTab === 'schema'
                  ? 'border-slate-900 text-slate-900 font-semibold'
                  : 'border-transparent hover:text-slate-900'
              }`}
            >
              <BarChart3 className="w-4 h-4 text-slate-400" />
              Schema & Stats
            </button>
            <button
              onClick={() => onTabChange('history')}
              className={`transition-colors pb-1 border-b-2 ${
                activeTab === 'history'
                  ? 'border-slate-900 text-slate-900 font-semibold'
                  : 'border-transparent hover:text-slate-900'
              }`}
            >
              Query Log
            </button>
          </nav>

          {/* Zone 3: 1-2 primary actions */}
          <div className="flex items-center gap-3">
            {currentDataset ? (
              <div className="hidden lg:flex items-center gap-2 text-xs text-slate-500 font-mono-numbers">
                <span className="font-medium text-slate-800 truncate max-w-[180px]" title={currentDataset.name}>
                  {currentDataset.name}
                </span>
                <span aria-hidden="true">·</span>
                <span>{currentDataset.rowCount.toLocaleString()} rows</span>
                <span aria-hidden="true">·</span>
                <span>{currentDataset.columnCount} cols</span>
              </div>
            ) : null}

            <button
              type="button"
              onClick={onOpenSampleModal}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5 text-blue-600" />
              Sample Datasets
            </button>

            {currentDataset && (
              <button
                type="button"
                onClick={onResetData}
                title="Change or reload dataset"
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
