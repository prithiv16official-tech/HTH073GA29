import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Sparkles,
  HelpCircle,
  Loader2,
  TrendingUp,
  DollarSign,
  BarChart2,
  MapPin,
  Calculator,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { Dataset } from '../types/dataset';

interface QuestionBoxProps {
  dataset: Dataset | null;
  onAnalyze: (question: string) => void;
  isAnalyzing: boolean;
  suggestedQuestions?: string[];
}

export const REQUIRED_EXAMPLE_QUESTIONS = [
  {
    text: 'What is the total revenue?',
    icon: DollarSign,
    category: 'Aggregate Sum',
  },
  {
    text: 'Which category has the highest value?',
    icon: BarChart2,
    category: 'Extremum / Top Segment',
  },
  {
    text: 'What is the average amount?',
    icon: Calculator,
    category: 'Mean / Distribution',
  },
  {
    text: 'Which location has the most transactions?',
    icon: MapPin,
    category: 'Frequency / Count',
  },
  {
    text: 'Show the monthly trend.',
    icon: TrendingUp,
    category: 'Time-Series Trend',
  },
];

export const QuestionBox: React.FC<QuestionBoxProps> = ({
  dataset,
  onAnalyze,
  isAnalyzing,
  suggestedQuestions = [],
}) => {
  const [question, setQuestion] = useState('');
  const [recentlyInserted, setRecentlyInserted] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const query = question.trim();
    if (!query || isAnalyzing || !dataset) return;
    onAnalyze(query);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleExampleClick = (exampleText: string) => {
    // When the user clicks an example question, place it into the question box
    setQuestion(exampleText);
    setRecentlyInserted(exampleText);

    // Focus the input box so the user can review, edit, or immediately click Analyze
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  // Auto-clear recentlyInserted badge after 3 seconds
  useEffect(() => {
    if (recentlyInserted) {
      const timer = setTimeout(() => setRecentlyInserted(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [recentlyInserted]);

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
      {/* Header and Integrity Notice */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">Natural-Language Data Analyst</h3>
            <p className="text-xs text-slate-500">
              Ask questions in plain English. Calculations are computed deterministically from uploaded rows.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-md text-[11px] font-medium self-start sm:self-auto">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>Zero-hallucination guarantee: 100% computed from data</span>
        </div>
      </div>

      {/* Main Input Form */}
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="relative flex items-center">
          <input
            ref={inputRef}
            id="question-input"
            type="text"
            disabled={!dataset || isAnalyzing}
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              dataset
                ? `Ask about "${dataset.name}" (e.g., What is the total revenue? or Which category has the highest value?)`
                : 'Upload or select a dataset above to start asking questions...'
            }
            className="w-full pl-4 pr-32 py-3.5 text-sm text-slate-900 border border-slate-300 rounded-lg shadow-inner focus:outline-hidden focus:border-blue-600 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed placeholder:text-slate-400 transition-all"
          />

          <button
            type="submit"
            disabled={!question.trim() || !dataset || isAnalyzing}
            className="absolute right-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white text-xs font-semibold rounded-md shadow-xs transition-colors flex items-center gap-2"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Analyzing...</span>
              </>
            ) : (
              <>
                <span>Analyze</span>
                <Send className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </div>

        {recentlyInserted && (
          <div className="text-[11px] text-blue-700 bg-blue-50/70 border border-blue-100 px-3 py-1.5 rounded-md flex items-center justify-between animate-fadeIn">
            <span>
              Placed <span className="font-semibold">"{recentlyInserted}"</span> into the question box. Click <strong>Analyze</strong> or press <strong>Enter ↵</strong>.
            </span>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isAnalyzing || !dataset}
              className="text-xs font-bold text-blue-700 hover:text-blue-900 underline ml-2 cursor-pointer"
            >
              Analyze now →
            </button>
          </div>
        )}
      </form>

      {/* Dataset-Specific Sample Questions (Front & Center) */}
      {dataset && suggestedQuestions.length > 0 && (
        <div className="pt-2 border-t border-slate-100 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-700 font-bold">
            <span className="flex items-center gap-1.5 text-blue-700">
              <Sparkles className="w-3.5 h-3.5 text-blue-600" />
              Sample Questions for {dataset.name} (click to analyze):
            </span>
            <span className="text-[11px] text-slate-400 font-normal">Schema-agnostic inference</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {suggestedQuestions.map((q, i) => (
              <button
                key={i}
                type="button"
                onClick={() => {
                  setQuestion(q);
                  setRecentlyInserted(q);
                  onAnalyze(q);
                }}
                disabled={isAnalyzing}
                className="text-xs font-medium bg-blue-50/70 hover:bg-blue-100 text-blue-900 border border-blue-200 px-3 py-1.5 rounded-lg transition-all shadow-2xs hover:scale-[1.01] active:scale-[0.99] flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <span>"{q}"</span>
                <ArrowRight className="w-3 h-3 text-blue-600 shrink-0" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Generic Cross-Schema Question Templates */}
      <div className="pt-2 border-t border-slate-100 space-y-2">
        <div className="flex items-center justify-between text-xs text-slate-600 font-semibold">
          <span className="flex items-center gap-1.5">
            <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
            Universal Analytical Templates (click to place into box):
          </span>
          <span className="text-[11px] text-slate-400 font-normal">Works on any uploaded CSV or Excel</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {REQUIRED_EXAMPLE_QUESTIONS.map((item, idx) => {
            const Icon = item.icon;
            const isSelected = question === item.text;
            return (
              <button
                key={idx}
                type="button"
                onClick={() => handleExampleClick(item.text)}
                disabled={!dataset || isAnalyzing}
                className={`text-left p-2.5 rounded-lg border text-xs transition-all flex items-start gap-2.5 disabled:opacity-50 disabled:cursor-not-allowed group ${
                  isSelected
                    ? 'bg-blue-50 border-blue-400 text-blue-900 ring-1 ring-blue-300'
                    : 'bg-slate-50/80 hover:bg-blue-50/60 border-slate-200 hover:border-blue-200 text-slate-800'
                }`}
              >
                <div
                  className={`p-1.5 rounded-md shrink-0 transition-colors ${
                    isSelected
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-slate-600 border border-slate-200 group-hover:text-blue-600 group-hover:border-blue-200'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-slate-900 group-hover:text-blue-950 truncate">
                    {item.text}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">{item.category}</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
