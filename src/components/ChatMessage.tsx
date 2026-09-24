import React, { useState } from 'react';
import {
  TrendingUp,
  TrendingDown,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Sparkles,
  BarChart3,
  Lightbulb,
  HelpCircle,
  Calendar,
  Layers,
  Table as TableIcon,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';
import { AnalyticsResponse, formatFullINR } from '../utils/businessAnalyticsEngine';
import { PlotlyChart } from './PlotlyChart';

export interface ChatMessageItem {
  id: string;
  sender: 'user' | 'assistant';
  timestamp: string;
  text?: string;
  analytics?: AnalyticsResponse;
  isLoading?: boolean;
}

interface ChatMessageProps {
  message: ChatMessageItem;
  onSelectFollowUp: (question: string) => void;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({ message, onSelectFollowUp }) => {
  const [expandedSection, setExpandedSection] = useState<'none' | 'products' | 'regions' | 'daily'>('none');

  if (message.sender === 'user') {
    return (
      <div className="flex justify-end mb-6 animate-fadeIn">
        <div className="max-w-2xl bg-blue-600 text-white rounded-2xl rounded-tr-xs px-5 py-3.5 shadow-md">
          <div className="text-xs text-blue-200 font-medium mb-1 flex items-center justify-between gap-4">
            <span>You</span>
            <span className="text-[10px] opacity-75">{message.timestamp}</span>
          </div>
          <p className="text-sm sm:text-base font-medium leading-relaxed whitespace-pre-wrap">
            {message.text}
          </p>
        </div>
      </div>
    );
  }

  // Assistant Loading State
  if (message.isLoading || !message.analytics) {
    return (
      <div className="flex items-start gap-3 mb-6 animate-fadeIn">
        <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
          <Sparkles className="w-4 h-4 animate-spin" />
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs max-w-xl">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
            <span>DataMind AI</span>
            <span className="text-slate-400">·</span>
            <span className="text-slate-400">Analyzing historical records...</span>
          </div>
          <div className="mt-3 space-y-2">
            <div className="h-4 bg-slate-100 rounded w-3/4 animate-pulse" />
            <div className="h-4 bg-slate-100 rounded w-1/2 animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  const data = message.analytics;
  const isPositiveGrowth = (data.metrics.totalRevenue.growthPct ?? 0) >= 0;

  return (
    <div className="flex items-start gap-3 sm:gap-4 mb-8 animate-fadeIn w-full">
      {/* Assistant Avatar */}
      <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-sm mt-1">
        <Sparkles className="w-4 h-4 sm:w-5 sm:h-5" />
      </div>

      {/* Main Analytics Container */}
      <div className="flex-1 bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden space-y-6 p-5 sm:p-7 max-w-4xl">
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-2">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-600 flex items-center gap-1.5">
                <BarChart3 className="w-4 h-4" />
                {data.title}
              </span>
              <span className="text-slate-300">·</span>
              <span className="text-xs text-slate-500 font-medium">
                {data.timePeriodLabel}
              </span>
            </div>
            <p className="text-sm sm:text-base font-semibold text-slate-900 mt-1 leading-snug">
              {data.headline}
            </p>
          </div>

          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-medium self-start sm:self-center shrink-0">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>100% Calculated</span>
          </div>
        </div>

        {/* 1. TOP METRIC STRIP (Total Sales, Previous Month, Growth %) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {/* Total Revenue */}
          <div className="bg-slate-50/80 border border-slate-200 rounded-xl p-4">
            <div className="text-xs font-medium text-slate-500">Total Revenue</div>
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-mono-numbers mt-1">
              {data.metrics.totalRevenue.formattedCurrent}
            </div>
            <div className="mt-2 flex items-center gap-1.5 text-xs font-semibold">
              {data.metrics.totalRevenue.previousValue !== undefined && (
                <>
                  <span
                    className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[11px] font-bold ${
                      isPositiveGrowth
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    {isPositiveGrowth ? (
                      <TrendingUp className="w-3 h-3" />
                    ) : (
                      <TrendingDown className="w-3 h-3" />
                    )}
                    {isPositiveGrowth ? '+' : ''}
                    {data.metrics.totalRevenue.growthPct?.toFixed(1)}%
                  </span>
                  <span className="text-slate-400 font-normal truncate">
                    vs {data.metrics.totalRevenue.formattedPrevious}
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Orders */}
          <div className="bg-slate-50/80 border border-slate-200 rounded-xl p-4">
            <div className="text-xs font-medium text-slate-500">Total Orders</div>
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-mono-numbers mt-1">
              {data.metrics.totalOrders.formattedCurrent}
            </div>
            <div className="mt-2 text-xs text-slate-500 flex items-center gap-1 font-mono-numbers">
              {data.metrics.totalOrders.growthPct !== undefined && (
                <span className={data.metrics.totalOrders.isPositive ? 'text-emerald-700' : 'text-rose-700'}>
                  {data.metrics.totalOrders.isPositive ? '+' : ''}
                  {data.metrics.totalOrders.growthPct}% vs prior
                </span>
              )}
            </div>
          </div>

          {/* Units Sold */}
          <div className="bg-slate-50/80 border border-slate-200 rounded-xl p-4">
            <div className="text-xs font-medium text-slate-500">Units Sold</div>
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-mono-numbers mt-1">
              {data.metrics.unitsSold.formattedCurrent}
            </div>
            <div className="mt-2 text-xs text-slate-500 font-mono-numbers">
              {data.metrics.unitsSold.growthPct !== undefined && (
                <span className={data.metrics.unitsSold.isPositive ? 'text-emerald-700' : 'text-rose-700'}>
                  {data.metrics.unitsSold.isPositive ? '+' : ''}
                  {data.metrics.unitsSold.growthPct}% vs prior
                </span>
              )}
            </div>
          </div>

          {/* Avg Order Value */}
          <div className="bg-slate-50/80 border border-slate-200 rounded-xl p-4">
            <div className="text-xs font-medium text-slate-500">Avg Order Value</div>
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-mono-numbers mt-1">
              {data.metrics.avgOrderValue.formattedCurrent}
            </div>
            <div className="mt-2 text-xs text-slate-500 font-mono-numbers">
              {data.metrics.avgOrderValue.growthPct !== undefined && (
                <span className={data.metrics.avgOrderValue.isPositive ? 'text-emerald-700' : 'text-rose-700'}>
                  {data.metrics.avgOrderValue.isPositive ? '+' : ''}
                  {data.metrics.avgOrderValue.growthPct}% vs prior
                </span>
              )}
            </div>
          </div>
        </div>

        {/* 2. AUTOMATIC PLOTLY CHART */}
        <div className="border border-slate-200 rounded-xl p-3 sm:p-4 bg-white shadow-2xs">
          <PlotlyChart chart={data.chart as any} />
        </div>

        {/* 3. PRODUCT & REGION BREAKDOWN CARDS */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Product-wise Sales */}
          <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/40">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-blue-600" />
                Product-wise Sales
              </h4>
              <span className="text-[11px] text-slate-400">Share of Total</span>
            </div>

            <div className="space-y-2.5">
              {data.productBreakdown.slice(0, 5).map((item, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-medium">
                    <span className="text-slate-800 font-semibold truncate max-w-[200px]" title={item.name}>
                      {item.name}
                    </span>
                    <span className="font-mono-numbers text-slate-900 font-bold ml-2">
                      {item.formattedValue}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-slate-200 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-blue-600 h-1.5 rounded-full transition-all"
                        style={{ width: `${Math.min(100, item.sharePct * 2.5)}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-slate-500 font-mono-numbers w-10 text-right">
                      {item.sharePct}%
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setExpandedSection(expandedSection === 'products' ? 'none' : 'products')}
              className="mt-3 text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1 transition-colors cursor-pointer"
            >
              <span>{expandedSection === 'products' ? 'Hide Details' : 'View Product Details'}</span>
              {expandedSection === 'products' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
          </div>

          {/* Region-wise Sales */}
          <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/40">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <BarChart3 className="w-3.5 h-3.5 text-blue-600" />
                Region-wise Sales
              </h4>
              <span className="text-[11px] text-slate-400">Performance</span>
            </div>

            <div className="space-y-2.5">
              {data.regionBreakdown.map((item, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-medium">
                    <span className="text-slate-800 font-semibold">{item.name}</span>
                    <span className="font-mono-numbers text-slate-900 font-bold">
                      {item.formattedValue}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-slate-200 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-emerald-600 h-1.5 rounded-full transition-all"
                        style={{ width: `${Math.min(100, item.sharePct * 2.5)}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-slate-500 font-mono-numbers w-10 text-right">
                      {item.sharePct}%
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setExpandedSection(expandedSection === 'regions' ? 'none' : 'regions')}
              className="mt-3 text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1 transition-colors cursor-pointer"
            >
              <span>{expandedSection === 'regions' ? 'Hide Details' : 'View Region Details'}</span>
              {expandedSection === 'regions' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
          </div>
        </div>

        {/* 4. EXPANDABLE TABLES (Products, Regions, Daily) */}
        {expandedSection === 'products' && (
          <div className="border border-slate-200 rounded-xl overflow-hidden animate-fadeIn">
            <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200 text-xs font-bold text-slate-800 flex items-center justify-between">
              <span>Full Product Revenue Ledger ({data.productBreakdown.length} items)</span>
              <button
                onClick={() => setExpandedSection('none')}
                className="text-slate-400 hover:text-slate-700 text-xs"
              >
                ✕ Close
              </button>
            </div>
            <div className="max-h-60 overflow-y-auto custom-scrollbar">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-100/70 text-slate-600 sticky top-0">
                  <tr>
                    <th className="py-2 px-3">Product</th>
                    <th className="py-2 px-3 text-right">Units</th>
                    <th className="py-2 px-3 text-right">Revenue</th>
                    <th className="py-2 px-3 text-right">Share</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.productBreakdown.map((p, i) => (
                    <tr key={i} className="hover:bg-slate-50">
                      <td className="py-2 px-3 font-medium text-slate-800">{p.name}</td>
                      <td className="py-2 px-3 text-right font-mono-numbers text-slate-600">{p.quantity}</td>
                      <td className="py-2 px-3 text-right font-mono-numbers font-bold text-slate-900">{p.formattedValue}</td>
                      <td className="py-2 px-3 text-right font-mono-numbers text-slate-600">{p.sharePct}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {expandedSection === 'regions' && (
          <div className="border border-slate-200 rounded-xl overflow-hidden animate-fadeIn">
            <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200 text-xs font-bold text-slate-800 flex items-center justify-between">
              <span>Regional Revenue Performance Ledger</span>
              <button
                onClick={() => setExpandedSection('none')}
                className="text-slate-400 hover:text-slate-700 text-xs"
              >
                ✕ Close
              </button>
            </div>
            <div className="max-h-60 overflow-y-auto custom-scrollbar">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-100/70 text-slate-600 sticky top-0">
                  <tr>
                    <th className="py-2 px-3">Region</th>
                    <th className="py-2 px-3 text-right">Units</th>
                    <th className="py-2 px-3 text-right">Total Revenue</th>
                    <th className="py-2 px-3 text-right">Share</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.regionBreakdown.map((r, i) => (
                    <tr key={i} className="hover:bg-slate-50">
                      <td className="py-2 px-3 font-semibold text-slate-800">{r.name}</td>
                      <td className="py-2 px-3 text-right font-mono-numbers text-slate-600">{r.quantity}</td>
                      <td className="py-2 px-3 text-right font-mono-numbers font-bold text-slate-900">{r.formattedValue}</td>
                      <td className="py-2 px-3 text-right font-mono-numbers text-slate-600">{r.sharePct}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 5. "WHY ANALYSIS" (If relevant or requested) */}
        {data.whyAnalysis && (
          <div className="bg-amber-50/50 border border-amber-200/80 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2">
              <div className="p-1 bg-amber-100 text-amber-800 rounded-md">
                <HelpCircle className="w-4 h-4" />
              </div>
              <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wider">
                Variance & Contributing Factors Analysis
              </h4>
            </div>

            <p className="text-xs text-amber-900/90 leading-relaxed">
              {data.whyAnalysis.summary}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1">
              <div className="bg-white/80 p-2.5 rounded-lg border border-amber-200/60">
                <div className="font-semibold text-slate-800 mb-1">Top Product Variances:</div>
                <ul className="space-y-1">
                  {data.whyAnalysis.productContributions.map((item, i) => (
                    <li key={i} className="text-slate-600 flex justify-between">
                      <span className="truncate max-w-[140px]">{item.name}:</span>
                      <span className={item.changeAmount >= 0 ? 'text-emerald-700 font-semibold' : 'text-rose-700 font-semibold'}>
                        {item.text}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="bg-white/80 p-2.5 rounded-lg border border-amber-200/60">
                <div className="font-semibold text-slate-800 mb-1">Regional Variances:</div>
                <ul className="space-y-1">
                  {data.whyAnalysis.regionContributions.map((item, i) => (
                    <li key={i} className="text-slate-600 flex justify-between">
                      <span>{item.name}:</span>
                      <span className={item.changeAmount >= 0 ? 'text-emerald-700 font-semibold' : 'text-rose-700 font-semibold'}>
                        {item.text}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="text-[11px] text-amber-800/80 italic">
              {data.whyAnalysis.volumeImpact}
            </div>
          </div>
        )}

        {/* 6. KEY INSIGHTS */}
        <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-4 space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-bold text-blue-900 uppercase tracking-wider">
            <Lightbulb className="w-4 h-4 text-blue-600" />
            <span>Key Insights</span>
          </div>

          <ul className="space-y-1.5 text-xs text-slate-700">
            {data.keyInsights.map((insight, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="text-blue-500 font-bold shrink-0 mt-0.5">•</span>
                <span className="leading-relaxed">{insight}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* 7. QUICK ACTION / EXPANDABLE BUTTONS */}
        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-100 text-xs">
          <button
            type="button"
            onClick={() => setExpandedSection(expandedSection === 'daily' ? 'none' : 'daily')}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Calendar className="w-3.5 h-3.5 text-slate-500" />
            <span>{expandedSection === 'daily' ? 'Hide Daily Details' : 'View Daily Details'}</span>
          </button>
        </div>

        {expandedSection === 'daily' && (
          <div className="border border-slate-200 rounded-xl overflow-hidden animate-fadeIn">
            <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200 text-xs font-bold text-slate-800 flex items-center justify-between">
              <span>Daily Transaction Breakdown</span>
              <button
                onClick={() => setExpandedSection('none')}
                className="text-slate-400 hover:text-slate-700 text-xs"
              >
                ✕ Close
              </button>
            </div>
            <div className="max-h-60 overflow-y-auto custom-scrollbar">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-100/70 text-slate-600 sticky top-0">
                  <tr>
                    <th className="py-2 px-3">Date</th>
                    <th className="py-2 px-3 text-right">Orders</th>
                    <th className="py-2 px-3 text-right">Daily Revenue</th>
                    <th className="py-2 px-3">Top Product</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.dailyDetails.map((day, i) => (
                    <tr key={i} className="hover:bg-slate-50">
                      <td className="py-2 px-3 font-medium text-slate-800">
                        {day.date} ({day.day})
                      </td>
                      <td className="py-2 px-3 text-right font-mono-numbers text-slate-600">{day.orders}</td>
                      <td className="py-2 px-3 text-right font-mono-numbers font-bold text-slate-900">
                        {formatFullINR(day.revenue)}
                      </td>
                      <td className="py-2 px-3 text-slate-600 truncate max-w-xs">{day.topProduct}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 8. FOLLOW-UP SUGGESTIONS (Clickable Chips) */}
        {data.followUpSuggestions && data.followUpSuggestions.length > 0 && (
          <div className="pt-3 border-t border-slate-100 space-y-2">
            <div className="text-[11px] font-semibold text-slate-500 flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-blue-600" />
              <span>Suggested follow-up questions:</span>
            </div>

            <div className="flex flex-wrap gap-2">
              {data.followUpSuggestions.map((sug, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => onSelectFollowUp(sug)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50/80 hover:bg-blue-50 hover:border-blue-300 text-slate-700 hover:text-blue-900 text-xs font-medium transition-all shadow-2xs hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
                >
                  <span>{sug}</span>
                  <ArrowRight className="w-3 h-3 text-slate-400 group-hover:text-blue-600 shrink-0" />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
