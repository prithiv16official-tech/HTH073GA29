import React from 'react';
import { History, ArrowUpRight, Trash2, HelpCircle } from 'lucide-react';
import { AnalysisResult } from '../types/dataset';

interface RecentQuestionsProps {
  history: AnalysisResult[];
  onSelectResult: (result: AnalysisResult) => void;
  onClearHistory: () => void;
}

export const RecentQuestions: React.FC<RecentQuestionsProps> = ({
  history,
  onSelectResult,
  onClearHistory,
}) => {
  if (history.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-8 text-center shadow-sm">
        <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center mb-2">
          <History className="w-5 h-5" />
        </div>
        <h4 className="text-sm font-semibold text-slate-800">No Query History Yet</h4>
        <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
          Questions asked will be recorded here for instant review, comparison, and verification.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-blue-600" />
          <h3 className="text-sm font-semibold text-slate-900">
            Recent Questions & Analysis History
          </h3>
          <span className="text-xs text-slate-500 font-mono-numbers">
            ({history.length})
          </span>
        </div>

        <button
          onClick={onClearHistory}
          className="text-xs text-slate-500 hover:text-rose-600 transition-colors flex items-center gap-1"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Clear All</span>
        </button>
      </div>

      <div className="space-y-2">
        {history.map((item) => (
          <div
            key={item.id}
            onClick={() => onSelectResult(item)}
            className="p-3 rounded-lg border border-slate-200 hover:border-blue-300 hover:bg-blue-50/30 transition-all cursor-pointer group flex items-start justify-between gap-3"
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 text-[11px] text-slate-500 mb-1">
                <span className="font-medium text-slate-700">{item.datasetName}</span>
                <span aria-hidden="true">·</span>
                <span className="font-mono-numbers">{item.timestamp}</span>
                <span aria-hidden="true">·</span>
                <span className="capitalize">{item.calculation.aggregationType} Aggregation</span>
              </div>
              <p className="text-xs font-semibold text-slate-900 group-hover:text-blue-700 transition-colors truncate">
                "{item.question}"
              </p>
              <p className="text-[11px] text-slate-600 mt-1 truncate">
                {item.answer.headline}
              </p>
            </div>

            <div className="shrink-0 p-1 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
