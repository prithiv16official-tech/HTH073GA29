import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Volume2,
  VolumeX,
  Pause,
  Play,
  Square,
  BarChart2,
  Table as TableIcon,
  HelpCircle,
  TrendingUp,
  CheckCircle2,
  Calculator,
  Code2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { AssistantMessageData } from '../types/assistant';
import { PlotlyChart } from './PlotlyChart';
import { InferredSchemaView } from './InferredSchemaView';
import { TechnicalDetailsArea } from './TechnicalDetailsArea';
import {
  speakTextAloud,
  stopSpeech,
  pauseSpeech,
  resumeSpeech,
  isSpeechPaused,
  isSpeechSpeaking,
} from '../utils/speechUtils';

interface ConversationalMessageProps {
  message: AssistantMessageData;
  onTriggerAction: (query: string) => void;
  isLoading?: boolean;
}

export const ConversationalMessage: React.FC<ConversationalMessageProps> = ({
  message,
  onTriggerAction,
  isLoading = false,
}) => {
  const [speechState, setSpeechState] = useState<'idle' | 'speaking' | 'paused'>('idle');
  const [isPlanOpen, setIsPlanOpen] = useState(false);

  // Sync state if speech ends externally
  useEffect(() => {
    const timer = setInterval(() => {
      if (speechState !== 'idle' && !isSpeechSpeaking() && !isSpeechPaused()) {
        setSpeechState('idle');
      }
    }, 500);
    return () => clearInterval(timer);
  }, [speechState]);

  // User Message
  if (message.sender === 'user') {
    return (
      <div className="flex justify-end mb-5 animate-fadeIn">
        <div className="max-w-2xl bg-blue-600 text-white rounded-2xl rounded-tr-xs px-5 py-3 shadow-xs">
          <p className="text-sm sm:text-base font-normal leading-relaxed whitespace-pre-wrap">
            {message.text}
          </p>
        </div>
      </div>
    );
  }

  // Confirmation for dataset upload or sample load: e.g. "sales_data.csv uploaded successfully." or "Benchmark Dataset loaded successfully."
  if (
    message.text.endsWith('uploaded successfully.') ||
    message.text.endsWith('loaded successfully.') ||
    (Boolean(message.inferredSchema) && !message.hasChart && !message.hasDetailsTable && message.sender === 'assistant')
  ) {
    return (
      <div className="my-4 space-y-3 animate-fadeIn w-full">
        <div className="flex items-center gap-2.5 px-3.5 py-2.5 bg-white border border-slate-200/90 rounded-xl shadow-2xs max-w-md text-xs text-slate-700">
          <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div className="flex-1 truncate">
            <span className="font-semibold text-slate-800">{message.text}</span>
          </div>
        </div>

        {message.inferredSchema && (
          <InferredSchemaView
            inferredSchema={message.inferredSchema}
            compact={false}
            onTriggerAction={onTriggerAction}
          />
        )}
      </div>
    );
  }

  // Assistant Loading State
  if (isLoading) {
    return (
      <div className="flex items-start gap-3 mb-5 animate-fadeIn">
        <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center shrink-0 shadow-2xs mt-0.5">
          <Sparkles className="w-4 h-4 animate-spin text-blue-400" />
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl px-4 py-3 shadow-2xs text-xs text-slate-500 flex items-center gap-2">
          <span className="animate-pulse">Thinking...</span>
        </div>
      </div>
    );
  }

  const handleSpeak = () => {
    if (speechState === 'speaking') {
      stopSpeech();
      setSpeechState('idle');
      return;
    }

    if (speechState === 'paused') {
      resumeSpeech();
      setSpeechState('speaking');
      return;
    }

    const ok = speakTextAloud(
      message.text,
      message.language,
      () => setSpeechState('speaking'),
      () => setSpeechState('idle'),
      () => setSpeechState('idle')
    );

    if (ok) {
      setSpeechState('speaking');
    }
  };

  const handlePause = () => {
    pauseSpeech();
    setSpeechState('paused');
  };

  const handleResume = () => {
    resumeSpeech();
    setSpeechState('speaking');
  };

  const handleStop = () => {
    stopSpeech();
    setSpeechState('idle');
  };

  const langLabels: Record<string, string> = {
    en: 'English',
    ta: 'தமிழ்',
    tanglish: 'Tanglish',
    hi: 'हिन्दी',
    te: 'తెలుగు',
    ml: 'മലയാളம்',
    kn: 'ಕನ್ನಡ',
  };

  return (
    <div className="flex items-start gap-3 sm:gap-4 mb-6 animate-fadeIn w-full">
      {/* Assistant Avatar */}
      <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center shrink-0 shadow-2xs mt-0.5 font-bold text-xs">
        DM
      </div>

      {/* Message Content Container */}
      <div className="flex-1 bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-2xs space-y-3.5 max-w-3xl">
        {/* Header Metadata */}
        <div className="flex items-center justify-between text-xs text-slate-400 border-b border-slate-100 pb-2">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-700">DataMind AI</span>
            <span>·</span>
            <span className="text-[11px] text-slate-500 font-medium">
              {langLabels[message.language] || 'AI Assistant'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px]">{message.timestamp}</span>

            {/* Speech Output Controls (Requirement 24) */}
            {speechState === 'idle' ? (
              <button
                onClick={handleSpeak}
                className="p-1 rounded-md text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                title="Read answer aloud"
              >
                <Volume2 className="w-4 h-4" />
              </button>
            ) : (
              <div className="flex items-center gap-1 bg-blue-50 border border-blue-200 rounded-lg px-2 py-0.5 text-blue-700 text-[11px]">
                <Volume2 className="w-3.5 h-3.5 animate-pulse" />
                <span className="font-medium mr-1">
                  {speechState === 'speaking' ? 'Speaking...' : 'Paused'}
                </span>
                {speechState === 'speaking' ? (
                  <button
                    onClick={handlePause}
                    className="p-0.5 hover:bg-blue-100 rounded cursor-pointer"
                    title="Pause speech"
                  >
                    <Pause className="w-3 h-3 fill-current" />
                  </button>
                ) : (
                  <button
                    onClick={handleResume}
                    className="p-0.5 hover:bg-blue-100 rounded cursor-pointer"
                    title="Resume speech"
                  >
                    <Play className="w-3 h-3 fill-current" />
                  </button>
                )}
                <button
                  onClick={handleStop}
                  className="p-0.5 hover:bg-rose-100 text-rose-600 rounded cursor-pointer ml-0.5"
                  title="Stop speech immediately"
                >
                  <Square className="w-3 h-3 fill-current" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Core Direct Answer Text */}
        <div className="space-y-1">
          {(message.hasChart || Boolean(message.calculationSteps)) && (
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 select-none">
              Answer
            </div>
          )}
          <div className="text-slate-900 text-sm sm:text-base font-normal leading-relaxed whitespace-pre-wrap">
            {message.text}
          </div>
        </div>

        {/* Dedicated VISUALIZATION Area */}
        {message.hasChart && message.chart ? (
          <div className="pt-3 border-t border-slate-100 space-y-2.5">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-1.5">
                <div className="p-1 bg-blue-50 text-blue-600 rounded-md">
                  <BarChart2 className="w-3.5 h-3.5" />
                </div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Visualization
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                  {message.chartAxisInfo?.chartType || 'Real Generated Chart'}
                </span>
              </div>

              {message.chartAxisInfo && (
                <div className="flex items-center gap-2 text-[11px] text-slate-500 font-mono bg-slate-50 px-2 py-0.5 rounded-md border border-slate-200">
                  <span>
                    <strong className="text-slate-700">X-axis:</strong> {message.chartAxisInfo.xAxis}
                  </span>
                  <span>·</span>
                  <span>
                    <strong className="text-slate-700">Y-axis:</strong> {message.chartAxisInfo.yAxis}
                  </span>
                </div>
              )}
            </div>

            <div className="border border-slate-200 rounded-xl p-3 bg-slate-50/50 shadow-2xs">
              <PlotlyChart chart={message.chart as any} />
            </div>
          </div>
        ) : message.visualizationNotice ? (
          <div className="pt-2 border-t border-slate-100">
            <div className="p-3 rounded-xl bg-slate-50 border border-dashed border-slate-200 text-xs text-slate-600 space-y-2">
              <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-slate-700 text-[11px]">
                <BarChart2 className="w-3.5 h-3.5 text-blue-600" />
                <span>Visualization Available</span>
              </div>
              <p className="text-slate-500 text-xs">
                {message.visualizationNotice}
              </p>
              <div className="pt-0.5">
                <button
                  type="button"
                  onClick={() => onTriggerAction('Create data visualization with Gemini Flash')}
                  className="inline-flex items-center gap-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white font-medium px-3 py-1.5 rounded-lg shadow-2xs transition-colors cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Visualize with Gemini Flash</span>
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {/* TECHNICAL DETAILS & DATA USED AREA */}
        {message.technicalDetails && (
          <TechnicalDetailsArea details={message.technicalDetails} />
        )}

        {/* STRUCTURED QUERY PLAN (Requirement 11 - Collapsible / Inspectable in UI) */}
        {message.queryPlan && (
          <div className="pt-3 border-t border-slate-100 space-y-2">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-1.5">
                <div className="p-1 bg-indigo-50 text-indigo-700 rounded-md">
                  <Code2 className="w-3.5 h-3.5" />
                </div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Structured Query Plan
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                  {message.queryPlan.operation} · {message.queryPlan.intent}
                </span>
              </div>

              <button
                type="button"
                onClick={() => setIsPlanOpen(!isPlanOpen)}
                className="flex items-center gap-1 text-[11px] font-medium text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 px-2 py-1 rounded-md border border-slate-200 transition-colors cursor-pointer"
              >
                <span>{isPlanOpen ? 'Hide Plan' : 'Inspect Plan'}</span>
                {isPlanOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-500" />}
              </button>
            </div>

            {/* Plan Summary Badges */}
            <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
              <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-mono">
                <strong>Intent:</strong> {message.queryPlan.intent}
              </span>
              <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-mono">
                <strong>Metric:</strong> {message.queryPlan.metric}
              </span>
              <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-mono">
                <strong>Operation:</strong> {message.queryPlan.operation}
              </span>
              {message.queryPlan.groupBy && (
                <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-mono">
                  <strong>GroupBy:</strong> {message.queryPlan.groupBy}
                </span>
              )}
              {message.queryPlan.timeRange && (
                <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-mono">
                  <strong>TimeRange:</strong> {message.queryPlan.timeRange.type}
                </span>
              )}
              {message.queryPlan.filters.length > 0 && (
                <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 font-mono">
                  <strong>Filters:</strong> {message.queryPlan.filters.map(f => `${f.field} ${f.operator} '${f.value}'`).join(', ')}
                </span>
              )}
            </div>

            {/* Collapsible Detailed JSON & Execution Mapping Inspector */}
            {isPlanOpen && (
              <div className="p-3.5 bg-slate-900 text-slate-100 rounded-xl text-xs font-mono space-y-2.5 overflow-x-auto shadow-inner border border-slate-800 animate-fadeIn">
                <div className="flex items-center justify-between text-slate-400 text-[10px] uppercase tracking-wider pb-1.5 border-b border-slate-800">
                  <span>Interpreted Query Plan JSON</span>
                  <span className="text-emerald-400 font-semibold">Validated & Deterministic</span>
                </div>
                <pre className="text-[11px] leading-relaxed text-indigo-300 whitespace-pre">
                  {JSON.stringify(message.queryPlan, null, 2)}
                </pre>
                {message.executionResult && (
                  <div className="pt-2 border-t border-slate-800 text-[11px] text-emerald-400 space-y-1">
                    <div className="font-semibold text-slate-300">Schema Execution Mapping:</div>
                    <div>Metric Column: <span className="text-white font-medium">{message.executionResult.metricColumn || 'None'}</span></div>
                    {message.executionResult.groupBy && (
                      <div>GroupBy Column: <span className="text-white font-medium">{message.executionResult.groupBy}</span></div>
                    )}
                    {message.executionResult.timeFilter && (
                      <div>Time Window: <span className="text-white font-medium">{message.executionResult.timeFilter}</span></div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* HOW IT WAS CALCULATED Section */}
        {message.calculationSteps && message.calculationSteps.length > 0 && (
          <div className="pt-3 border-t border-slate-100 space-y-2">
            <div className="flex items-center gap-1.5">
              <div className="p-1 bg-amber-50 text-amber-700 rounded-md">
                <Calculator className="w-3.5 h-3.5" />
              </div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                How it was calculated
              </span>
            </div>
            <div className="p-3.5 bg-slate-50/80 rounded-xl border border-slate-200/90 text-xs text-slate-700">
              <ol className="list-decimal list-inside space-y-1.5 text-slate-600 leading-relaxed font-sans">
                {message.calculationSteps.map((step, idx) => (
                  <li key={idx} className="pl-1">
                    <span className="font-medium text-slate-800">{step}</span>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        )}

        {/* Optional Details Table (Displayed ONLY when user requested details) */}
        {message.hasDetailsTable && message.detailsTable && (
          <div className="pt-1">
            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
              <div className="bg-slate-50 px-3.5 py-2 border-b border-slate-200 text-xs font-bold text-slate-800">
                {message.detailsTable.title}
              </div>
              <div className="max-h-60 overflow-y-auto custom-scrollbar">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-100/80 text-slate-600 sticky top-0">
                    <tr>
                      {message.detailsTable.headers.map((h, i) => (
                        <th key={i} className={`py-2 px-3 ${i > 0 ? 'text-right' : ''}`}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {message.detailsTable.rows.map((row, i) => (
                      <tr key={i} className="hover:bg-slate-50">
                        {row.map((cell, j) => (
                          <td
                            key={j}
                            className={`py-2 px-3 ${
                              j === 0 ? 'font-medium text-slate-800' : 'text-right font-mono-numbers text-slate-700'
                            }`}
                          >
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Optional Action Buttons: [Details] [Chart] [Explain] [Compare] [Speak] */}
        {message.availableActions && message.availableActions.length > 0 && (
          <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-1.5">
            {message.availableActions.map((action, idx) => {
              if (action.type === 'speak') {
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={handleSpeak}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
                      speechState !== 'idle'
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                    }`}
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                    <span>{speechState === 'speaking' ? 'Stop 🔊' : '🔊 Speak'}</span>
                  </button>
                );
              }

              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => action.queryToTrigger && onTriggerAction(action.queryToTrigger)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border border-slate-200 bg-slate-50/70 hover:bg-blue-50 hover:border-blue-300 text-slate-700 hover:text-blue-900 transition-all cursor-pointer shadow-2xs"
                >
                  {action.type === 'chart' && <BarChart2 className="w-3.5 h-3.5 text-blue-600" />}
                  {action.type === 'details' && <TableIcon className="w-3.5 h-3.5 text-emerald-600" />}
                  {action.type === 'explain' && <HelpCircle className="w-3.5 h-3.5 text-amber-600" />}
                  {action.type === 'compare' && <TrendingUp className="w-3.5 h-3.5 text-indigo-600" />}
                  <span>{action.label}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
