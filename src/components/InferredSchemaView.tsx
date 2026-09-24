import React, { useState } from 'react';
import {
  Database,
  Hash,
  Type,
  Calendar,
  Layers,
  Sparkles,
  HelpCircle,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Clock,
  Key,
  Binary,
  CheckCircle2,
  Percent,
  Coins,
  BarChart2,
} from 'lucide-react';
import { InferredDatasetSchema, InferredColumnSchema, ColumnType, DetailedDataType } from '../types/dataset';
import { VisualAnalystStudio } from './VisualAnalystStudio';

interface InferredSchemaViewProps {
  inferredSchema: InferredDatasetSchema;
  compact?: boolean;
  onTriggerAction?: (query: string) => void;
}

function getTypeIcon(dataType: ColumnType, detailedType?: DetailedDataType) {
  if (detailedType === 'currency') {
    return <Coins className="w-3.5 h-3.5 text-emerald-600 shrink-0" />;
  }
  if (detailedType === 'percentage') {
    return <Percent className="w-3.5 h-3.5 text-purple-600 shrink-0" />;
  }
  if (detailedType === 'identifier') {
    return <Key className="w-3.5 h-3.5 text-slate-600 shrink-0" />;
  }
  switch (dataType) {
    case 'number':
      return <Hash className="w-3.5 h-3.5 text-blue-600 shrink-0" />;
    case 'text':
      return <Type className="w-3.5 h-3.5 text-slate-600 shrink-0" />;
    case 'date':
      return <Calendar className="w-3.5 h-3.5 text-purple-600 shrink-0" />;
    case 'boolean':
      return <Binary className="w-3.5 h-3.5 text-amber-600 shrink-0" />;
    default:
      return <HelpCircle className="w-3.5 h-3.5 text-slate-400 shrink-0" />;
  }
}

function getConfidenceBadge(confidence: number) {
  const pct = Math.round(confidence * 100);
  let colorClass = 'bg-emerald-50 text-emerald-700 border-emerald-200';
  if (pct < 70) {
    colorClass = 'bg-amber-50 text-amber-700 border-amber-200';
  } else if (pct < 85) {
    colorClass = 'bg-blue-50 text-blue-700 border-blue-200';
  }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold border font-mono-numbers ${colorClass}`}>
      {pct}%
    </span>
  );
}

export const InferredSchemaView: React.FC<InferredSchemaViewProps> = ({
  inferredSchema,
  compact = false,
  onTriggerAction,
}) => {
  const [isExpanded, setIsExpanded] = useState(!compact);
  const [viewMode, setViewMode] = useState<'cards' | 'table' | 'json'>('cards');
  const [copiedJson, setCopiedJson] = useState(false);
  const { summary, columns, relationships } = inferredSchema;

  const handleCopyJson = () => {
    const cleanObject = {
      datasetSummary: inferredSchema.datasetSummary || {
        rows: inferredSchema.totalRows,
        columns: inferredSchema.totalColumns,
      },
      columns: inferredSchema.columns.map((c) => ({
        originalName: c.originalName,
        dataType: c.dataType,
        detailedDataType: c.detailedDataType,
        semanticRole: c.semanticRole,
        semanticLabel: c.semanticLabel,
        confidence: c.confidence,
        possibleRoles: c.possibleRoles,
        sampleValues: c.sampleValues,
        missingCount: c.missingCount,
        missingPercentage: c.missingPercentage,
        uniqueCount: c.uniqueCount,
      })),
    };
    navigator.clipboard.writeText(JSON.stringify(cleanObject, null, 2));
    setCopiedJson(true);
    setTimeout(() => setCopiedJson(false), 2000);
  };

  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl shadow-xs overflow-hidden text-slate-800 transition-all">
      {/* 1. SCHEMA INFERENCE HEADER & SUMMARY */}
      <div className="p-4 sm:p-5 bg-gradient-to-b from-slate-50/80 to-white border-b border-slate-100">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100 shadow-2xs">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-bold text-slate-900 tracking-tight">Detected Schema</h3>
                <span className="text-[11px] font-mono text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded-md border border-slate-200 font-semibold">
                  {inferredSchema.datasetName}
                </span>
                <span className="text-[10px] bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded border border-emerald-200">
                  Schema-Agnostic
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Automatically inspected and inferred column meanings from actual dataset values & statistics
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {/* View Mode Switcher */}
            <div className="inline-flex items-center bg-slate-100 p-0.5 rounded-lg text-[11px] font-medium border border-slate-200">
              <button
                type="button"
                onClick={() => { setViewMode('cards'); setIsExpanded(true); }}
                className={`px-2 py-1 rounded-md transition-colors cursor-pointer ${
                  viewMode === 'cards' && isExpanded
                    ? 'bg-white text-blue-700 font-semibold shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Cards
              </button>
              <button
                type="button"
                onClick={() => { setViewMode('table'); setIsExpanded(true); }}
                className={`px-2 py-1 rounded-md transition-colors cursor-pointer ${
                  viewMode === 'table' && isExpanded
                    ? 'bg-white text-blue-700 font-semibold shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Table
              </button>
              <button
                type="button"
                onClick={() => { setViewMode('json'); setIsExpanded(true); }}
                className={`px-2 py-1 rounded-md transition-colors cursor-pointer ${
                  viewMode === 'json' && isExpanded
                    ? 'bg-white text-blue-700 font-semibold shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                JSON
              </button>
            </div>

            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer shrink-0"
            >
              <span>{isExpanded ? 'Collapse' : 'Expand'}</span>
              {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Compact Summary Metrics Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2 mt-4 pt-3 border-t border-slate-200/70 text-xs">
          <div className="bg-white p-2.5 rounded-xl border border-slate-200/80 shadow-2xs">
            <span className="text-[10px] text-slate-400 uppercase font-semibold block">Total Rows</span>
            <span className="text-base font-bold text-slate-900 font-mono-numbers">
              {summary.totalRows.toLocaleString()}
            </span>
          </div>

          <div className="bg-white p-2.5 rounded-xl border border-slate-200/80 shadow-2xs">
            <span className="text-[10px] text-slate-400 uppercase font-semibold block">Columns</span>
            <span className="text-base font-bold text-slate-900 font-mono-numbers">
              {summary.totalColumns}
            </span>
          </div>

          <div className="bg-white p-2.5 rounded-xl border border-slate-200/80 shadow-2xs">
            <span className="text-[10px] text-blue-500 uppercase font-semibold block">Numeric</span>
            <span className="text-base font-bold text-blue-700 font-mono-numbers">
              {summary.numericColumns}
            </span>
          </div>

          <div className="bg-white p-2.5 rounded-xl border border-slate-200/80 shadow-2xs">
            <span className="text-[10px] text-slate-500 uppercase font-semibold block">Text</span>
            <span className="text-base font-bold text-slate-800 font-mono-numbers">
              {summary.textColumns}
            </span>
          </div>

          <div className="bg-white p-2.5 rounded-xl border border-slate-200/80 shadow-2xs">
            <span className="text-[10px] text-purple-500 uppercase font-semibold block">Date</span>
            <span className="text-base font-bold text-purple-700 font-mono-numbers">
              {summary.dateColumns}
            </span>
          </div>

          <div className="bg-white p-2.5 rounded-xl border border-slate-200/80 shadow-2xs">
            <span className="text-[10px] text-emerald-500 uppercase font-semibold block">Categorical</span>
            <span className="text-base font-bold text-emerald-700 font-mono-numbers">
              {summary.categoricalColumns}
            </span>
          </div>

          <div className="bg-white p-2.5 rounded-xl border border-slate-200/80 shadow-2xs col-span-2 sm:col-span-1">
            <span className="text-[10px] text-slate-500 uppercase font-semibold block">Identifier</span>
            <span className="text-base font-bold text-slate-700 font-mono-numbers">
              {summary.identifierColumns}
            </span>
          </div>
        </div>

        {/* Missing Data & Detected Business Fields summary */}
        <div className="mt-3 space-y-2">
          {/* Missing data indicator */}
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <span className="text-slate-400 font-medium">Missing Data:</span>
            <span className="font-mono-numbers font-semibold text-slate-800">
              {summary.totalMissingCells === 0 ? (
                <span className="text-emerald-600 flex items-center gap-1 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5 inline" /> 0 cells (0.0% missing)
                </span>
              ) : (
                <span className="text-amber-600 font-medium">
                  {summary.totalMissingCells} cells ({summary.missingDataPercentage}% missing)
                </span>
              )}
            </span>
          </div>

          {/* Detected business fields pills */}
          {summary.detectedBusinessFields.length > 0 && (
            <div className="flex items-baseline gap-2 flex-wrap text-xs">
              <span className="text-slate-400 font-medium shrink-0">Inferred Mapping:</span>
              <div className="flex flex-wrap gap-1.5">
                {summary.detectedBusinessFields.map((field, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 hover:bg-slate-200/70 border border-slate-200 rounded-lg text-xs transition-colors"
                  >
                    <span className="font-bold text-slate-900">{field.roleName}</span>
                    <span className="text-blue-600 font-mono text-[11px] font-semibold">({field.columnName})</span>
                    <span className="text-emerald-700 font-mono-numbers font-semibold text-[10px]">
                      {Math.round(field.confidence * 100)}%
                    </span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Derived Mathematical Relationships */}
          {relationships.length > 0 && (
            <div className="mt-2 p-2.5 rounded-xl bg-blue-50/70 border border-blue-200 text-xs text-blue-900 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-blue-600 shrink-0" />
              <div>
                <span className="font-semibold">Verified Relationship: </span>
                <span className="font-mono text-blue-800 font-medium">{relationships[0].formula}</span>
                {relationships[0].sampleVerification && (
                  <span className="text-slate-500 text-[11px] ml-2 font-mono">
                    ({relationships[0].sampleVerification})
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 2. DETECTED SCHEMA DETAILS (Step 14) */}
      {isExpanded && (
        <div>
          {/* A. CARDS VIEW (Clean, step-14 formatted layout) */}
          {viewMode === 'cards' && (
            <div className="p-4 sm:p-5 grid grid-cols-1 sm:grid-cols-2 gap-3.5 bg-slate-50/50">
              {columns.map((col) => {
                return (
                  <div
                    key={col.originalName}
                    className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs hover:border-slate-300 transition-all flex flex-col justify-between space-y-2.5"
                  >
                    {/* Header: Column Name & Confidence */}
                    <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-2.5">
                      <div className="flex items-center gap-2">
                        {getTypeIcon(col.dataType, col.detailedDataType)}
                        <div>
                          <div className="font-mono font-bold text-slate-900 text-sm">
                            {col.originalName}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            Original Column
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        {getConfidenceBadge(col.confidence)}
                        <div className="text-[9px] text-slate-400 uppercase tracking-wider font-semibold mt-0.5">
                          Confidence
                        </div>
                      </div>
                    </div>

                    {/* Metadata lines matching Step 14 specification */}
                    <div className="grid grid-cols-2 gap-x-2 gap-y-1.5 text-xs">
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase font-semibold">Type</span>
                        <span className="font-mono capitalize font-medium text-slate-800">
                          {col.dataType}
                          {col.detailedDataType !== col.dataType && (
                            <span className="text-[10px] text-slate-500 font-normal ml-1">
                              ({col.detailedDataType})
                            </span>
                          )}
                        </span>
                      </div>

                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase font-semibold">Detected Meaning</span>
                        <span className="font-bold text-slate-900 text-xs">
                          {col.semanticLabel}
                        </span>
                      </div>

                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase font-semibold">Missing %</span>
                        <span className="font-mono-numbers font-medium text-slate-800">
                          {col.missingCount > 0 ? (
                            <span className="text-amber-600 font-semibold">
                              {col.missingPercentage}% ({col.missingCount} nulls)
                            </span>
                          ) : (
                            <span className="text-emerald-600">0.0%</span>
                          )}
                        </span>
                      </div>

                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase font-semibold">Unique Count</span>
                        <span className="font-mono-numbers font-medium text-slate-800">
                          {col.uniqueCount.toLocaleString()}
                        </span>
                      </div>
                    </div>

                    {/* Ambiguity notice (Step 6) */}
                    {col.isAmbiguous && col.possibleRoles.length > 1 && (
                      <div className="bg-amber-50 border border-amber-200 rounded-lg p-2 text-xs text-amber-800 space-y-1">
                        <div className="flex items-center gap-1 font-semibold text-[11px] text-amber-900">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                          <span>Ambiguous Column Detected</span>
                        </div>
                        <div className="text-[11px] text-amber-800">
                          Possible interpretations:
                        </div>
                        <div className="flex flex-wrap gap-1 pt-0.5">
                          {col.possibleRoles.map((p, idx) => (
                            <span
                              key={idx}
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-white border border-amber-200 rounded text-[10px] font-mono text-amber-900"
                            >
                              <span>{p.label}</span>
                              <span className="font-bold font-mono-numbers text-amber-700">
                                {Math.round(p.confidence * 100)}%
                              </span>
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Sample Values */}
                    <div className="pt-1.5 border-t border-slate-100">
                      <div className="text-[10px] text-slate-400 uppercase font-semibold mb-1">
                        Sample Values
                      </div>
                      <div className="flex flex-wrap gap-1 font-mono text-xs">
                        {col.sampleValues && col.sampleValues.length > 0 ? (
                          col.sampleValues.slice(0, 4).map((val, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-0.5 bg-slate-100 rounded text-slate-700 border border-slate-200/80 text-[11px]"
                            >
                              {String(val)}
                            </span>
                          ))
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">No sample data</span>
                        )}
                      </div>
                    </div>

                    {/* Numeric stats or Date span if available */}
                    {col.statistics && col.statistics.mean !== undefined && (
                      <div className="text-[10px] text-slate-500 font-mono-numbers pt-1 border-t border-slate-100">
                        Min: {col.statistics.min} · Max: {col.statistics.max} · Mean: {col.statistics.mean}
                        {col.statistics.median !== undefined && ` · Median: ${col.statistics.median}`}
                      </div>
                    )}
                    {col.temporal && (
                      <div className="text-[10px] text-purple-700 font-mono pt-1 border-t border-slate-100">
                        Calendar Range: {col.temporal.monthRange || col.temporal.yearRange}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* B. TABLE VIEW */}
          {viewMode === 'table' && (
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold select-none">
                    <th className="py-3 px-4">Original Column</th>
                    <th className="py-3 px-4">Data Type</th>
                    <th className="py-3 px-4">Detected Meaning</th>
                    <th className="py-3 px-4 text-center">Confidence</th>
                    <th className="py-3 px-4">Sample Values</th>
                    <th className="py-3 px-4 text-right">Missing %</th>
                    <th className="py-3 px-4 text-right">Unique Count</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {columns.map((col) => {
                    return (
                      <tr key={col.originalName} className="hover:bg-slate-50/80 transition-colors">
                        {/* Original Column Name */}
                        <td className="py-3.5 px-4 font-semibold text-slate-900">
                          <div className="flex items-center gap-2">
                            {getTypeIcon(col.dataType, col.detailedDataType)}
                            <span className="font-mono text-slate-900 text-[13px]">{col.originalName}</span>
                            {col.detailedDataType === 'identifier' && (
                              <span className="inline-flex items-center px-1.5 py-0.5 text-[9px] bg-slate-100 text-slate-600 rounded border border-slate-200 font-mono">
                                ID
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Data Type */}
                        <td className="py-3.5 px-4">
                          <div className="space-y-0.5">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono capitalize bg-slate-100 text-slate-800 border border-slate-200">
                              {col.dataType}
                            </span>
                            {col.detailedDataType !== col.dataType && (
                              <div className="text-[10px] text-slate-500 font-mono">
                                {col.detailedDataType}
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Detected Meaning */}
                        <td className="py-3.5 px-4">
                          <div className="space-y-1">
                            <div className="font-semibold text-slate-900 text-[13px]">
                              {col.semanticLabel}
                            </div>

                            {/* Ambiguity notice */}
                            {col.isAmbiguous && col.possibleRoles.length > 1 && (
                              <div className="flex items-center gap-1 text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                                <AlertTriangle className="w-3 h-3 shrink-0" />
                                <span>
                                  Also possible:{' '}
                                  {col.possibleRoles
                                    .slice(1, 3)
                                    .map((p) => `${p.label} (${Math.round(p.confidence * 100)}%)`)
                                    .join(', ')}
                                </span>
                              </div>
                            )}

                            {/* Temporal info for dates */}
                            {col.temporal && (
                              <div className="text-[10px] text-purple-700 font-mono">
                                Span: {col.temporal.monthRange || col.temporal.yearRange}
                              </div>
                            )}

                            {/* Statistics for numbers */}
                            {col.statistics && col.statistics.min !== undefined && col.statistics.max !== undefined && (
                              <div className="text-[10px] text-slate-500 font-mono-numbers">
                                Range: [{col.statistics.min} → {col.statistics.max}]
                                {col.statistics.mean !== undefined && ` · Mean: ${col.statistics.mean}`}
                                {col.statistics.median !== undefined && ` · Median: ${col.statistics.median}`}
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Confidence */}
                        <td className="py-3.5 px-4 text-center">
                          {getConfidenceBadge(col.confidence)}
                        </td>

                        {/* Sample Values */}
                        <td className="py-3.5 px-4">
                          <div className="text-[11px] text-slate-600 font-mono truncate max-w-xs">
                            {col.sampleValues && col.sampleValues.length > 0 ? (
                              col.sampleValues.slice(0, 3).map((val, idx) => (
                                <span
                                  key={idx}
                                  className="inline-block bg-slate-100 px-1.5 py-0.5 rounded mr-1 text-slate-700 border border-slate-200/60"
                                >
                                  {String(val)}
                                </span>
                              ))
                            ) : (
                              <span className="text-slate-400 italic">None</span>
                            )}
                          </div>
                        </td>

                        {/* Missing % */}
                        <td className="py-3.5 px-4 text-right font-mono-numbers">
                          {col.missingCount > 0 ? (
                            <span className="text-amber-600 font-semibold">
                              {col.missingPercentage}%
                              <span className="text-[10px] text-slate-400 block font-normal">
                                ({col.missingCount} nulls)
                              </span>
                            </span>
                          ) : (
                            <span className="text-emerald-600 font-medium">0.0%</span>
                          )}
                        </td>

                        {/* Unique Count */}
                        <td className="py-3.5 px-4 text-right font-mono-numbers text-slate-900 font-medium">
                          {col.uniqueCount.toLocaleString()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* C. JSON SCHEMA VIEW (Step 13 structure) */}
          {viewMode === 'json' && (
            <div className="p-4 bg-slate-900 text-slate-100 font-mono text-xs overflow-x-auto relative">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
                <span className="text-[11px] text-slate-400">Internal Schema Object (Step 13 Compliant)</span>
                <button
                  type="button"
                  onClick={handleCopyJson}
                  className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[11px] transition-colors cursor-pointer"
                >
                  {copiedJson ? 'Copied ✓' : 'Copy JSON'}
                </button>
              </div>
              <pre className="custom-scrollbar max-h-96 overflow-y-auto leading-relaxed">
                {JSON.stringify(
                  {
                    datasetSummary: inferredSchema.datasetSummary || {
                      rows: inferredSchema.totalRows,
                      columns: inferredSchema.totalColumns,
                    },
                    columns: inferredSchema.columns.map((c) => ({
                      originalName: c.originalName,
                      dataType: c.dataType,
                      detailedDataType: c.detailedDataType,
                      semanticRole: c.semanticRole,
                      semanticLabel: c.semanticLabel,
                      confidence: c.confidence,
                      isAmbiguous: c.isAmbiguous,
                      possibleRoles: c.possibleRoles,
                      sampleValues: c.sampleValues,
                      missingCount: c.missingCount,
                      missingPercentage: c.missingPercentage,
                      uniqueCount: c.uniqueCount,
                      statistics: c.statistics,
                      temporal: c.temporal,
                    })),
                  },
                  null,
                  2
                )}
              </pre>
            </div>
          )}
        </div>
      )}

      {/* 3. DYNAMIC VISUAL DATA ANALYST STUDIO (Replaces predefined constraints with schema-derived questions & custom comparison studio) */}
      <VisualAnalystStudio
        columns={columns}
        datasetName={inferredSchema.datasetName}
        rowCount={inferredSchema.totalRows}
        onTriggerAction={onTriggerAction}
      />
    </div>
  );
};
