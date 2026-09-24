import React, { useState, useMemo } from 'react';
import {
  BarChart2,
  PieChart,
  LineChart,
  ScatterChart,
  Activity,
  Columns,
  Sparkles,
  ArrowRight,
  Sliders,
  Database,
  Layers,
  HelpCircle,
} from 'lucide-react';
import { InferredColumnSchema } from '../types/dataset';

interface VisualAnalystStudioProps {
  columns: InferredColumnSchema[];
  datasetName?: string;
  rowCount?: number;
  onTriggerAction?: (query: string) => void;
}

export const VisualAnalystStudio: React.FC<VisualAnalystStudioProps> = ({
  columns,
  datasetName = 'Dataset',
  rowCount,
  onTriggerAction,
}) => {
  const numCols = useMemo(() => columns.filter((c) => c.dataType === 'number'), [columns]);
  const catCols = useMemo(
    () => columns.filter((c) => c.dataType === 'text' || c.dataType === 'boolean' || (c.uniqueCount && c.uniqueCount <= 30)),
    [columns]
  );
  const dateCols = useMemo(() => columns.filter((c) => c.dataType === 'date'), [columns]);

  // Initial column selections
  const defaultCol1 = catCols[0]?.originalName || columns[0]?.originalName || '';
  const defaultCol2 = numCols[0]?.originalName || (columns.length > 1 ? columns[1]?.originalName : '');

  const [col1, setCol1] = useState<string>(defaultCol1);
  const [col2, setCol2] = useState<string>(defaultCol2);
  const [chartType, setChartType] = useState<'bar' | 'pie' | 'histogram' | 'scatter' | 'line' | 'box'>('bar');
  const [aggregation, setAggregation] = useState<'avg' | 'sum' | 'count' | 'raw'>('avg');

  // Dynamically generate tailored analytical questions from the real schema
  const dynamicSuggestions = useMemo(() => {
    const suggestions: Array<{ query: string; type: string; badge: string }> = [];

    if (numCols.length > 0 && catCols.length > 0) {
      suggestions.push({
        query: `Compare ${numCols[0].originalName} by ${catCols[0].originalName} (Bar Chart)`,
        type: 'bar',
        badge: 'Bar',
      });
      suggestions.push({
        query: `Box plot of ${numCols[0].originalName} across ${catCols[0].originalName}`,
        type: 'box',
        badge: 'Box Plot',
      });
    }

    if (numCols.length > 0) {
      suggestions.push({
        query: `Distribution of ${numCols[0].originalName} (Histogram)`,
        type: 'histogram',
        badge: 'Histogram',
      });
    }

    if (numCols.length >= 2) {
      suggestions.push({
        query: `Scatter plot of ${numCols[0].originalName} vs ${numCols[1].originalName}`,
        type: 'scatter',
        badge: 'Scatter',
      });
    }

    if (catCols.length > 0) {
      suggestions.push({
        query: `Breakdown of records by ${catCols[0].originalName} (Pie Chart)`,
        type: 'pie',
        badge: 'Pie',
      });
    }

    if (dateCols.length > 0 && numCols.length > 0) {
      suggestions.push({
        query: `Trend of ${numCols[0].originalName} over ${dateCols[0].originalName} (Line Chart)`,
        type: 'line',
        badge: 'Line',
      });
    }

    // Secondary comparisons if multiple numeric or categorical
    if (catCols.length > 1 && numCols.length > 0) {
      suggestions.push({
        query: `Average ${numCols[0].originalName} grouped by ${catCols[1].originalName}`,
        type: 'bar',
        badge: 'Bar',
      });
    }

    if (numCols.length >= 3) {
      suggestions.push({
        query: `Scatter plot of ${numCols[1].originalName} vs ${numCols[2].originalName}`,
        type: 'scatter',
        badge: 'Scatter',
      });
    }

    return suggestions.slice(0, 6);
  }, [numCols, catCols, dateCols]);

  const handleGenerateChart = () => {
    if (!onTriggerAction || !col1) return;

    let query = '';
    if (chartType === 'histogram') {
      query = `Distribution of ${col2 || col1} (Histogram)`;
    } else if (chartType === 'scatter') {
      query = `Scatter plot of ${col1} vs ${col2 || col1}`;
    } else if (chartType === 'pie') {
      query = `Pie chart showing ${col2 ? `${aggregation} of ${col2} by ${col1}` : `proportions of ${col1}`}`;
    } else if (chartType === 'box') {
      query = `Box plot of ${col2 || col1} grouped by ${col1}`;
    } else if (chartType === 'line') {
      query = `Line chart showing ${col2 ? `${aggregation} of ${col2} over ${col1}` : `trend of ${col1}`}`;
    } else {
      // Bar Chart
      query = `Bar chart: ${col2 ? `${aggregation} of ${col2} grouped by ${col1}` : `count of records by ${col1}`}`;
    }

    onTriggerAction(query);
  };

  return (
    <div className="p-4 sm:p-5 border-t border-slate-200/80 bg-slate-50/80 space-y-4">
      {/* Header Bar */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-blue-600 text-white rounded-xl shrink-0 shadow-xs">
            <BarChart2 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Visual Data Analyst Studio
              </h4>
              <span className="text-[10px] bg-blue-100 text-blue-800 font-bold px-2 py-0.5 rounded-full border border-blue-200 flex items-center gap-1">
                <Sparkles className="w-2.5 h-2.5 text-blue-600" />
                Gemini Flash
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Compare any column with any other column or select analytical chart questions tailored to <span className="font-semibold text-slate-700">{datasetName}</span>.
            </p>
          </div>
        </div>
      </div>

      {/* Part 1: Interactive Column Comparison Builder */}
      <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs space-y-3">
        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
          <Sliders className="w-3.5 h-3.5 text-blue-600" />
          <span>Custom Chart Builder (Compare Any Column)</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {/* Column 1 Picker (X-Axis / Category) */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-slate-600 block">
              Column 1 (X-Axis / Category)
            </label>
            <select
              value={col1}
              onChange={(e) => setCol1(e.target.value)}
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-blue-500 font-medium"
            >
              {columns.map((c) => (
                <option key={c.originalName} value={c.originalName}>
                  {c.originalName} ({c.dataType})
                </option>
              ))}
            </select>
          </div>

          {/* Column 2 Picker (Y-Axis / Metric) */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-slate-600 block">
              Column 2 (Y-Axis / Metric)
            </label>
            <select
              value={col2}
              onChange={(e) => setCol2(e.target.value)}
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-blue-500 font-medium"
            >
              <option value="">-- None (Record Count / Frequency) --</option>
              {columns.map((c) => (
                <option key={c.originalName} value={c.originalName}>
                  {c.originalName} ({c.dataType})
                </option>
              ))}
            </select>
          </div>

          {/* Chart Type Selector */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-slate-600 block">
              Chart Type
            </label>
            <select
              value={chartType}
              onChange={(e) => setChartType(e.target.value as any)}
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-blue-500 font-medium"
            >
              <option value="bar">Bar Chart (Categorical Comparison)</option>
              <option value="pie">Pie / Donut (Composition)</option>
              <option value="histogram">Histogram (Distribution & Bins)</option>
              <option value="scatter">Scatter Plot (Correlation)</option>
              <option value="line">Line Chart (Trend)</option>
              <option value="box">Box Plot (Quartiles & Outliers)</option>
            </select>
          </div>

          {/* Aggregation Selector */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-slate-600 block">
              Aggregation
            </label>
            <div className="flex items-center gap-1.5">
              <select
                value={aggregation}
                onChange={(e) => setAggregation(e.target.value as any)}
                disabled={chartType === 'histogram' || chartType === 'scatter'}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-blue-500 font-medium disabled:opacity-50"
              >
                <option value="avg">Average (Mean)</option>
                <option value="sum">Sum (Total)</option>
                <option value="count">Count (Frequency)</option>
                <option value="raw">Raw Data Values</option>
              </select>

              <button
                type="button"
                onClick={handleGenerateChart}
                className="shrink-0 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs px-3 py-1.5 rounded-lg transition-colors cursor-pointer shadow-2xs flex items-center gap-1"
                title="Generate Chart"
              >
                <span>Plot</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Part 2: Dynamic Schema-Aware Suggested Questions (Replaces hardcoded canned strings) */}
      <div className="space-y-2">
        <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-blue-600" />
          <span>Dynamic Analytical Questions For This Dataset</span>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {dynamicSuggestions.map((item, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => onTriggerAction?.(item.query)}
              className="group text-[11px] bg-white hover:bg-blue-50 hover:border-blue-300 text-slate-700 hover:text-blue-900 px-2.5 py-1.5 rounded-lg border border-slate-200 transition-all cursor-pointer shadow-2xs flex items-center gap-1.5 font-medium"
            >
              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 group-hover:bg-blue-100 group-hover:text-blue-700">
                {item.badge}
              </span>
              <span>"{item.query}"</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
