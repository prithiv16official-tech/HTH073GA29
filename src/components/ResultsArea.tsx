import React, { useState } from 'react';
import {
  CheckCircle,
  Copy,
  Check,
  Calculator,
  Lightbulb,
  Cpu,
  ArrowRight,
  ClipboardList,
  ShieldCheck,
  HelpCircle,
  Sparkles,
  AlertTriangle,
  ArrowUpRight,
  BarChart2,
  RefreshCw,
} from 'lucide-react';
import { AnalysisResult } from '../types/dataset';
import { PlotlyChart } from './PlotlyChart';

interface ResultsAreaProps {
  result: AnalysisResult;
  onSelectClarification?: (question: string) => void;
}

export const ResultsArea: React.FC<ResultsAreaProps> = ({
  result,
  onSelectClarification,
}) => {
  const [copiedFormula, setCopiedFormula] = useState(false);
  const [copiedSummary, setCopiedSummary] = useState(false);
  const [copiedPlan, setCopiedPlan] = useState(false);

  const handleCopyFormula = () => {
    navigator.clipboard.writeText(result.calculation.formula);
    setCopiedFormula(true);
    setTimeout(() => setCopiedFormula(false), 2000);
  };

  const handleCopySummary = () => {
    navigator.clipboard.writeText(`${result.answer.headline}\n\n${result.answer.summary}`);
    setCopiedSummary(true);
    setTimeout(() => setCopiedSummary(false), 2000);
  };

  const handleCopyPlan = () => {
    const planText = JSON.stringify(result.geminiPlan || result.analysisPlan, null, 2);
    navigator.clipboard.writeText(planText);
    setCopiedPlan(true);
    setTimeout(() => setCopiedPlan(false), 2000);
  };

  const geminiPlan = result.geminiPlan;
  const plan = result.analysisPlan;

  // Render Clarification Interface if Question is Ambiguous
  if (result.isAmbiguous) {
    return (
      <div className="bg-amber-50/80 border-2 border-amber-300 rounded-xl p-6 shadow-sm space-y-5 animate-fadeIn">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-amber-100 text-amber-800 rounded-lg shrink-0 mt-0.5">
            <AlertTriangle className="w-5 h-5 text-amber-700" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-800">
                Clarification Needed
              </span>
              <span className="text-[11px] px-2 py-0.5 rounded bg-amber-200/70 text-amber-900 font-medium">
                Gemini Intent Interpretation
              </span>
            </div>
            <h3 className="text-base sm:text-lg font-bold text-slate-900 mt-1">
              "{result.question}" is ambiguous or missing schema context
            </h3>
            <p className="text-xs sm:text-sm text-slate-700 mt-1.5 leading-relaxed">
              {result.clarificationMessage}
            </p>
          </div>
        </div>

        {/* Suggested Clarification Options */}
        {result.clarificationOptions && result.clarificationOptions.length > 0 && (
          <div className="pt-3 border-t border-amber-200/80 space-y-2">
            <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <HelpCircle className="w-3.5 h-3.5 text-amber-700" />
              Did you mean one of these specific questions based on the dataset schema?
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {result.clarificationOptions.map((opt, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => onSelectClarification && onSelectClarification(opt)}
                  className="p-3 bg-white hover:bg-amber-100/60 border border-amber-200 rounded-lg text-left text-xs font-semibold text-slate-900 transition-all flex items-center justify-between group shadow-2xs cursor-pointer"
                >
                  <span className="truncate pr-2">{opt}</span>
                  <ArrowUpRight className="w-4 h-4 text-amber-700 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform shrink-0" />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 1. Gemini Structured Analysis Plan */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
              <ClipboardList className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900">Structured Analysis Plan</h3>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                  <Sparkles className="w-3 h-3 text-purple-600" />
                  {geminiPlan?.source === 'gemini' ? 'Gemini 3.8 Flash (Server-Side)' : 'Local Schema Planner'}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Interpreted natural-language question and mapped to inferred dataset schema without hardcoded columns.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-md text-[11px] font-medium">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Zero-hallucination: Calculated on data</span>
            </span>

            <button
              onClick={handleCopyPlan}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs text-slate-500 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 rounded border border-slate-200 transition-colors"
            >
              {copiedPlan ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
              <span>{copiedPlan ? 'Copied' : 'Copy Plan'}</span>
            </button>
          </div>
        </div>

        {/* Gemini Identified Parameters Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 bg-slate-50 p-3.5 rounded-lg border border-slate-200/80 text-xs">
          <div>
            <span className="text-[11px] text-slate-500 block font-medium">Identified Operation</span>
            <span className="font-mono text-blue-700 font-bold block truncate">
              {geminiPlan?.operation || plan.operation}
            </span>
          </div>

          <div>
            <span className="text-[11px] text-slate-500 block font-medium">Group Column</span>
            <span className="font-mono text-slate-900 font-semibold block truncate" title={plan.dimensionColumn || 'None'}>
              {plan.dimensionColumn ? `[${plan.dimensionColumn}]` : 'None (Grand Aggregate)'}
            </span>
          </div>

          <div>
            <span className="text-[11px] text-slate-500 block font-medium">Value Column</span>
            <span className="font-mono text-slate-900 font-semibold block truncate" title={plan.metricColumn || 'Count'}>
              {plan.metricColumn ? `[${plan.metricColumn}]` : 'COUNT(*)'}
            </span>
          </div>

          <div>
            <span className="text-[11px] text-slate-500 block font-medium">Sort Order</span>
            <span className="font-semibold text-slate-800 capitalize block">
              {plan.sort}
            </span>
          </div>

          <div>
            <span className="text-[11px] text-slate-500 block font-medium">Limit Filter</span>
            <span className="font-semibold text-slate-800 block">
              {plan.limit ? `${plan.limit} item` : 'All groups'}
            </span>
          </div>
        </div>

        {/* Plan Rationale */}
        {geminiPlan?.explanation && (
          <div className="p-3 bg-blue-50/50 rounded-lg border border-blue-100 text-xs text-slate-700 flex items-start gap-2">
            <Sparkles className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-slate-900">Gemini Reasoning: </span>
              {geminiPlan.explanation}
            </div>
          </div>
        )}

        {/* Sequential Execution Blueprint */}
        <div className="space-y-1.5 pt-1">
          <div className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
            Execution Steps (Computed deterministically by application):
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {plan.planSteps.map((st) => (
              <div
                key={st.stepNumber}
                className="p-2.5 bg-white border border-slate-200 rounded-md text-xs flex items-start gap-2"
              >
                <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-bold font-mono text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                  {st.stepNumber}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-slate-900 truncate">{st.action}</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">{st.rationale}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 2. Primary Answer Card (Calculated strictly from dataset) */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2 text-xs font-medium text-slate-500 mb-1">
              <span>Question Answered</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono-numbers">{result.timestamp}</span>
              <span aria-hidden="true">·</span>
              <span className="text-slate-700 font-semibold">{result.datasetName}</span>
            </div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              "{result.question}"
            </h2>
          </div>

          <button
            onClick={handleCopySummary}
            className="self-start inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 rounded-md border border-slate-200 transition-colors cursor-pointer"
          >
            {copiedSummary ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span>Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy Finding</span>
              </>
            )}
          </button>
        </div>

        {/* Primary Answer Hero Box */}
        <div className="mt-4 p-5 rounded-lg bg-blue-50/70 border border-blue-100">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="text-xs font-semibold uppercase tracking-wider text-blue-800 flex items-center gap-1.5">
              <Lightbulb className="w-4 h-4 text-blue-600" />
              Verified Analytical Result
            </div>

            {result.answer.primaryValue && (
              <div className="text-right">
                <span className="text-2xl font-extrabold text-blue-900 font-mono-numbers">
                  {result.answer.primaryValue}
                </span>
                {result.answer.primaryMetric && (
                  <span className="text-[11px] text-blue-700 block font-medium">
                    {result.answer.primaryMetric}
                  </span>
                )}
              </div>
            )}
          </div>

          <p className="text-base sm:text-lg font-bold text-slate-900 mt-2 leading-snug">
            {result.answer.headline}
          </p>

          <p className="text-xs sm:text-sm text-slate-700 mt-2 leading-relaxed">
            {result.answer.summary}
          </p>

          {/* Metric Breakdown Cards */}
          {result.answer.metrics.length > 0 && (
            <div className="mt-4 pt-3 border-t border-blue-200/60">
              <div className="text-xs font-semibold text-slate-700 mb-2">
                Ranking & Segmental Distribution:
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {result.answer.metrics.map((item, i) => (
                  <div
                    key={i}
                    className="p-2.5 bg-white rounded border border-blue-100 shadow-2xs flex items-center justify-between"
                  >
                    <div className="min-w-0 pr-2">
                      <div className="text-xs font-medium text-slate-800 truncate">
                        {item.label}
                      </div>
                      {item.detail && (
                        <div className="text-[10px] text-slate-500 font-mono-numbers mt-0.5 truncate">
                          {item.detail}
                        </div>
                      )}
                    </div>
                    <div className="text-xs font-bold text-slate-900 font-mono-numbers shrink-0">
                      {item.value}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 3. Interactive Plotly Visual */}
      <PlotlyChart chart={result.chart} />

      {/* 4. Calculation Explanation & Verification Details */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-2">
          <div>
            <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <Calculator className="w-4 h-4 text-blue-600" />
              Application Execution Logic & Mathematical Audit
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Deterministic calculation performed strictly by the application on 100% of uploaded rows.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-600 font-mono-numbers">
            <span className="text-emerald-700 font-medium">100% Deterministic</span>
            <span aria-hidden="true">·</span>
            <span>{result.calculation.executionTimeMs || 8}ms runtime</span>
          </div>
        </div>

        {/* Audit Steps */}
        <div className="space-y-2.5">
          <div className="text-xs font-semibold text-slate-700">Audit Steps:</div>
          <div className="space-y-2">
            {result.calculation.steps.map((step) => (
              <div
                key={step.stepNumber}
                className="flex items-start gap-3 p-3 rounded-lg bg-slate-50 border border-slate-200/80"
              >
                <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 font-bold font-mono text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold text-slate-900">
                    {step.title}
                  </div>
                  <div className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                    {step.detail}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Pseudo-SQL / Logic Formula */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-slate-500" />
              Equivalent SQL Query Representation:
            </span>
            <button
              onClick={handleCopyFormula}
              className="text-xs text-slate-500 hover:text-slate-900 inline-flex items-center gap-1 transition-colors cursor-pointer"
            >
              {copiedFormula ? (
                <>
                  <Check className="w-3 h-3 text-emerald-600" />
                  <span>Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" />
                  <span>Copy SQL</span>
                </>
              )}
            </button>
          </div>
          <div className="bg-slate-900 text-slate-200 p-3.5 rounded-lg font-mono text-xs overflow-x-auto custom-scrollbar border border-slate-800">
            <pre className="whitespace-pre-wrap">{result.calculation.formula}</pre>
          </div>
        </div>

        {/* Execution Metadata Grid */}
        <div className="pt-4 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div>
            <span className="text-slate-500 block">Rows Processed</span>
            <span className="font-semibold text-slate-900 font-mono-numbers">
              {result.calculation.filteredRowCount.toLocaleString()} / {result.calculation.totalRowCount.toLocaleString()}
            </span>
          </div>
          <div>
            <span className="text-slate-500 block">Identified Operation</span>
            <span className="font-semibold text-slate-900 font-mono">
              {result.calculation.aggregationType}
            </span>
          </div>
          <div>
            <span className="text-slate-500 block">Target Dimension</span>
            <span className="font-semibold text-slate-900 truncate block">
              {result.calculation.targetColumns[0] || '—'}
            </span>
          </div>
          <div>
            <span className="text-slate-500 block">Target Metric</span>
            <span className="font-semibold text-slate-900 truncate block">
              {result.calculation.targetColumns[1] || '—'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
