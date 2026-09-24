import React, { useState } from 'react';
import {
  Code,
  Database,
  Cpu,
  Layers,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  Zap,
  Info,
  Hash,
  Type,
} from 'lucide-react';
import { TechnicalDetails } from '../types/assistant';

interface TechnicalDetailsAreaProps {
  details: TechnicalDetails;
  defaultExpanded?: boolean;
}

export const TechnicalDetailsArea: React.FC<TechnicalDetailsAreaProps> = ({
  details,
  defaultExpanded = true,
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [copiedSql, setCopiedSql] = useState(false);

  const handleCopySql = () => {
    if (!details.sqlRepresentation) return;
    navigator.clipboard.writeText(details.sqlRepresentation);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2000);
  };

  return (
    <div className="pt-3 border-t border-slate-200/80">
      {/* Outer Card Container */}
      <div className="bg-slate-50/90 border border-slate-200 rounded-xl overflow-hidden shadow-2xs transition-all">
        {/* Header Bar */}
        <div className="flex items-center justify-between px-3.5 py-2.5 bg-white border-b border-slate-200/80">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="p-1 bg-indigo-50 text-indigo-700 rounded-md">
              <Cpu className="w-3.5 h-3.5" />
            </div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-800">
              Technical Details & Data Used
            </span>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center gap-1">
              <Sparkles className="w-2.5 h-2.5 text-indigo-500" />
              {details.modelUsed || 'Gemini Flash'}
            </span>
            {details.executionTimeMs !== undefined && (
              <span className="text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded font-mono flex items-center gap-1">
                <Zap className="w-2.5 h-2.5" />
                {details.executionTimeMs} ms
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-1 text-[11px] font-medium text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-2.5 py-1 rounded-md transition-colors cursor-pointer"
          >
            <span>{isExpanded ? 'Hide Details' : 'Show Details'}</span>
            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* Collapsible Content */}
        {isExpanded && (
          <div className="p-3.5 sm:p-4 space-y-3.5 text-xs text-slate-700 animate-fadeIn">
            {/* Summary Metrics Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-2xs">
                <div className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
                  <Database className="w-3 h-3 text-blue-500" />
                  Dataset
                </div>
                <div className="font-semibold text-slate-800 truncate text-[11px] mt-0.5" title={details.datasetName}>
                  {details.datasetName}
                </div>
              </div>

              <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-2xs">
                <div className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
                  <Layers className="w-3 h-3 text-emerald-500" />
                  Rows Analyzed
                </div>
                <div className="font-semibold text-slate-800 font-mono text-[11px] mt-0.5">
                  {details.totalRowsAnalyzed.toLocaleString()} rows (100%)
                </div>
              </div>

              <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-2xs">
                <div className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
                  <Hash className="w-3 h-3 text-purple-500" />
                  Columns Used
                </div>
                <div className="font-semibold text-slate-800 font-mono text-[11px] mt-0.5">
                  {details.columnsUsed.length} of {details.totalColumnsCount} cols
                </div>
              </div>

              <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-2xs">
                <div className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-amber-500" />
                  Strategy
                </div>
                <div className="font-semibold text-slate-800 truncate text-[11px] mt-0.5" title={details.generationStrategy}>
                  Dynamic AI Spec
                </div>
              </div>
            </div>

            {/* Section 1: Exact Columns Used */}
            <div className="space-y-1.5">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                <Info className="w-3.5 h-3.5 text-blue-600" />
                Columns & Variables Extracted From Dataset
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {details.columnsUsed.map((col, idx) => (
                  <div
                    key={idx}
                    className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-2xs space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800 font-mono text-[12px]">{col.name}</span>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                        {col.type}
                      </span>
                    </div>

                    {col.role && (
                      <div className="text-[11px] text-slate-600 flex items-center gap-1">
                        <span className="text-slate-400">Role:</span>
                        <span className="font-medium text-slate-700">{col.role}</span>
                      </div>
                    )}

                    {col.sampleValues && col.sampleValues.length > 0 && (
                      <div className="text-[10px] text-slate-500 font-mono truncate">
                        <span className="text-slate-400">Sample:</span> {col.sampleValues.slice(0, 3).map(String).join(', ')}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Section 2: Mathematical Computation & SQL Representation */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <div className="flex items-center gap-1">
                  <Code className="w-3.5 h-3.5 text-indigo-600" />
                  Transformation & Computation Logic
                </div>
                {details.sqlRepresentation && (
                  <button
                    type="button"
                    onClick={handleCopySql}
                    className="flex items-center gap-1 text-[10px] font-medium text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-2 py-0.5 rounded border border-indigo-200 transition-colors cursor-pointer"
                  >
                    {copiedSql ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedSql ? 'Copied' : 'Copy SQL'}</span>
                  </button>
                )}
              </div>

              <div className="bg-slate-900 text-slate-100 rounded-lg p-3 font-mono text-[11px] space-y-1.5 shadow-inner border border-slate-800">
                <div className="text-emerald-400 font-semibold">
                  Operation: <span className="text-white font-normal">{details.operationApplied}</span>
                </div>
                {details.aggregationFormula && (
                  <div className="text-indigo-300">
                    Formula: <span className="text-amber-300 font-normal">{details.aggregationFormula}</span>
                  </div>
                )}
                {details.sqlRepresentation && (
                  <div className="pt-1.5 border-t border-slate-800 text-slate-300 whitespace-pre-wrap">
                    {details.sqlRepresentation}
                  </div>
                )}
              </div>
            </div>

            {/* Section 3: AI Rationale */}
            {details.aiExplanation && (
              <div className="bg-blue-50/60 border border-blue-200/80 rounded-lg p-2.5 text-slate-700 space-y-1">
                <div className="font-semibold text-blue-900 flex items-center gap-1.5 text-[11px]">
                  <Sparkles className="w-3 h-3 text-blue-600" />
                  AI Analytical Rationale
                </div>
                <p className="text-slate-600 leading-relaxed text-[11px]">
                  {details.aiExplanation}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
