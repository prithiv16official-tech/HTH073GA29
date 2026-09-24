import React, { useEffect, useRef, useState, useCallback } from 'react';
import Plotly from 'plotly.js-dist-min';
import {
  BarChart2,
  LineChart,
  PieChart,
  ScatterChart,
  Download,
  Activity,
  Columns,
  Maximize2,
  Minimize2,
  X,
  ZoomIn,
} from 'lucide-react';
import { ChartSpecification } from '../types/dataset';

interface PlotlyChartProps {
  chart: ChartSpecification;
}

const COLOR_PALETTE = [
  '#2563eb', // Blue
  '#0d9488', // Teal
  '#f59e0b', // Amber
  '#8b5cf6', // Violet
  '#ec4899', // Pink
  '#06b6d4', // Cyan
  '#10b981', // Emerald
  '#6366f1', // Indigo
  '#f97316', // Orange
];

export const PlotlyChart: React.FC<PlotlyChartProps> = ({ chart }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const fullscreenContainerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [activeChartType, setActiveChartType] = useState<string>(
    (chart.type as any) || 'bar'
  );

  // Sync when prop updates
  useEffect(() => {
    setActiveChartType((chart.type as any) || 'bar');
  }, [chart.type, chart.title]);

  // Handle ESC key to exit fullscreen
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen]);

  const renderPlot = useCallback(
    (targetEl: HTMLDivElement | null, inFullscreen = false) => {
      if (!targetEl) return;

      let chartData: any[] = chart.data;
      const isMultiTrace = chart.data && chart.data.length > 1;
      const isHeatmap = chart.type === ('heatmap' as any) || (chart.data[0] && chart.data[0].type === 'heatmap');

      // Preserve multi-trace or heatmap directly
      if (isHeatmap) {
        chartData = chart.data;
      } else if (isMultiTrace) {
        // Multi-column trace comparison: preserve each trace's name and values while adjusting mode
        chartData = chart.data.map((trace: any, idx: number) => {
          const color = trace.marker?.color || COLOR_PALETTE[idx % COLOR_PALETTE.length];
          if (activeChartType === 'line') {
            return {
              ...trace,
              type: 'scatter',
              mode: 'lines+markers',
              line: { color, width: inFullscreen ? 3 : 2.5 },
              marker: { size: inFullscreen ? 7 : 6, color },
            };
          } else if (activeChartType === 'scatter') {
            return {
              ...trace,
              type: 'scatter',
              mode: 'markers',
              marker: { size: inFullscreen ? 8 : 6, color, opacity: 0.8 },
            };
          } else if (activeChartType === 'box') {
            return {
              ...trace,
              type: 'box',
              marker: { color },
              boxpoints: 'outliers',
            };
          } else {
            // Default grouped bar
            return {
              ...trace,
              type: 'bar',
              marker: { color, opacity: 0.9 },
            };
          }
        });
      } else if (chart.data.length > 0) {
        // Single trace transformations
        const base = chart.data[0];

        if (activeChartType === 'pie') {
          const labels = base.x || base.labels || [];
          const values = base.y || base.values || [];
          chartData = [
            {
              type: 'pie',
              labels,
              values,
              hole: 0.45,
              marker: {
                colors: COLOR_PALETTE,
              },
              textinfo: 'label+percent',
              hoverinfo: 'label+value+percent',
            },
          ];
        } else if (activeChartType === 'line') {
          const x = base.x || base.labels || [];
          const y = base.y || base.values || [];
          chartData = [
            {
              type: 'scatter',
              mode: 'lines+markers',
              x,
              y,
              line: { color: '#2563eb', width: inFullscreen ? 3.5 : 2.5 },
              marker: { size: inFullscreen ? 8 : 6, color: '#1d4ed8' },
              hovertemplate: '<b>%{x}</b>: %{y:,.2f}<extra></extra>',
            },
          ];
        } else if (activeChartType === 'scatter') {
          const x = base.x || base.labels || [];
          const y = base.y || base.values || [];
          chartData = [
            {
              type: 'scatter',
              mode: 'markers',
              x,
              y,
              marker: { size: inFullscreen ? 8 : 7, color: '#2563eb', opacity: 0.8 },
              hovertemplate: '<b>%{x}</b>: %{y:,.2f}<extra></extra>',
            },
          ];
        } else if (activeChartType === 'histogram') {
          const x = base.x || base.labels || [];
          const y = base.y || base.values || [];
          chartData = [
            {
              type: 'bar',
              x,
              y,
              marker: {
                color: '#3b82f6',
                opacity: 0.9,
                line: { color: '#1d4ed8', width: 1 },
              },
              hovertemplate: '<b>Bin %{x}</b>: %{y}<extra></extra>',
            },
          ];
        } else if (activeChartType === 'box') {
          const y = base.y || base.values || [];
          const x = base.x || [];
          chartData = [
            {
              type: 'box',
              y,
              x: x.length === y.length ? x : undefined,
              marker: { color: '#2563eb' },
              boxpoints: 'outliers',
            },
          ];
        } else {
          // default bar
          const x = base.x || base.labels || [];
          const y = base.y || base.values || [];
          chartData = [
            {
              type: 'bar',
              x,
              y,
              marker: {
                color: y.map((_: any, i: number) => (i === 0 ? '#2563eb' : '#3b82f6')),
                opacity: 0.9,
                line: { color: '#1d4ed8', width: 1 },
              },
              hovertemplate: '<b>%{x}</b>: %{y:,.2f}<extra></extra>',
            },
          ];
        }
      }

      const layout = {
        ...chart.layout,
        autosize: true,
        paper_bgcolor: 'transparent',
        plot_bgcolor: 'transparent',
        font: {
          family: 'Plus Jakarta Sans, sans-serif',
          size: inFullscreen ? 13 : 11,
          color: '#334155',
        },
        margin: inFullscreen ? { l: 80, r: 40, t: 50, b: 70 } : { l: 65, r: 25, t: 35, b: 55 },
        barmode: isMultiTrace ? 'group' : (chart.layout?.barmode || undefined),
        showlegend: isMultiTrace,
        legend: isMultiTrace
          ? {
              orientation: 'h',
              yanchor: 'bottom',
              y: 1.02,
              xanchor: 'right',
              x: 1,
            }
          : undefined,
      };

      const config: Partial<Plotly.Config> = {
        responsive: true,
        displayModeBar: inFullscreen,
        displaylogo: false,
        modeBarButtonsToRemove: ['lasso2d'],
      };

      Plotly.react(targetEl, chartData, layout, config);
    },
    [chart, activeChartType]
  );

  useEffect(() => {
    renderPlot(containerRef.current, false);

    const handleResize = () => {
      if (containerRef.current) {
        Plotly.Plots.resize(containerRef.current);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [renderPlot]);

  // When fullscreen opens, render chart in the modal container
  useEffect(() => {
    if (isFullscreen && fullscreenContainerRef.current) {
      setTimeout(() => {
        renderPlot(fullscreenContainerRef.current, true);
        if (fullscreenContainerRef.current) {
          Plotly.Plots.resize(fullscreenContainerRef.current);
        }
      }, 50);
    }
  }, [isFullscreen, renderPlot]);

  const handleDownloadPng = (inFullscreen = false) => {
    const el = inFullscreen ? fullscreenContainerRef.current : containerRef.current;
    if (!el) return;
    Plotly.downloadImage(el, {
      format: 'png',
      width: inFullscreen ? 1920 : 1200,
      height: inFullscreen ? 1080 : 700,
      filename: `${chart.title.toLowerCase().replace(/[^a-z0-9]/g, '_')}_datamind`,
    });
  };

  const isHeatmap = chart.type === ('heatmap' as any) || (chart.data[0] && chart.data[0].type === 'heatmap');
  const isMultiTrace = chart.data && chart.data.length > 1;

  return (
    <>
      <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 shadow-sm">
        {/* Header and Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 mb-2 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-semibold text-slate-900 tracking-tight flex items-center gap-2">
              <span>{chart.title}</span>
              {isMultiTrace && (
                <span className="text-[10px] font-bold bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                  Multi-Column Comparison ({chart.data.length} Series)
                </span>
              )}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Plotly interactive visualization · {activeChartType.toUpperCase()} Mode
            </p>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            {/* Chart Type Segmented Control */}
            {!isHeatmap && (
              <div className="inline-flex items-center p-0.5 bg-slate-100 rounded-lg text-xs">
                <button
                  onClick={() => setActiveChartType('bar')}
                  title="Bar Chart"
                  className={`p-1.5 rounded-md transition-colors ${
                    activeChartType === 'bar'
                      ? 'bg-white text-slate-900 shadow-xs font-medium'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  <BarChart2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setActiveChartType('line')}
                  title="Line Chart"
                  className={`p-1.5 rounded-md transition-colors ${
                    activeChartType === 'line'
                      ? 'bg-white text-slate-900 shadow-xs font-medium'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  <LineChart className="w-3.5 h-3.5" />
                </button>
                {!isMultiTrace && (
                  <button
                    onClick={() => setActiveChartType('pie')}
                    title="Donut / Pie Chart"
                    className={`p-1.5 rounded-md transition-colors ${
                      activeChartType === 'pie'
                        ? 'bg-white text-slate-900 shadow-xs font-medium'
                        : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    <PieChart className="w-3.5 h-3.5" />
                  </button>
                )}
                <button
                  onClick={() => setActiveChartType('scatter')}
                  title="Scatter Chart"
                  className={`p-1.5 rounded-md transition-colors ${
                    activeChartType === 'scatter'
                      ? 'bg-white text-slate-900 shadow-xs font-medium'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  <ScatterChart className="w-3.5 h-3.5" />
                </button>
                {!isMultiTrace && (
                  <button
                    onClick={() => setActiveChartType('histogram')}
                    title="Histogram / Distribution"
                    className={`p-1.5 rounded-md transition-colors ${
                      activeChartType === 'histogram'
                        ? 'bg-white text-slate-900 shadow-xs font-medium'
                        : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    <Columns className="w-3.5 h-3.5" />
                  </button>
                )}
                <button
                  onClick={() => setActiveChartType('box')}
                  title="Box Plot"
                  className={`p-1.5 rounded-md transition-colors ${
                    activeChartType === 'box'
                      ? 'bg-white text-slate-900 shadow-xs font-medium'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  <Activity className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Fullscreen Button */}
            <button
              onClick={() => setIsFullscreen(true)}
              title="Fullscreen Chart View (Esc to exit)"
              className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-blue-50 border border-slate-200 rounded-md transition-colors text-xs flex items-center gap-1 cursor-pointer font-medium"
            >
              <Maximize2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Full Screen</span>
            </button>

            {/* Export PNG */}
            <button
              onClick={() => handleDownloadPng(false)}
              title="Export High-Res PNG"
              className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors text-xs flex items-center gap-1 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Export</span>
            </button>
          </div>
        </div>

        {/* Plotly Canvas Container */}
        <div ref={containerRef} className="w-full h-[360px] min-h-[300px]" />
      </div>

      {/* Fullscreen Modal Portal Overlay */}
      {isFullscreen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md p-3 sm:p-6 flex flex-col items-center justify-center animate-fadeIn">
          <div className="w-full max-w-7xl h-[92vh] bg-white rounded-2xl p-5 sm:p-6 shadow-2xl flex flex-col border border-slate-200">
            {/* Fullscreen Header */}
            <div className="flex items-center justify-between gap-4 pb-4 mb-3 border-b border-slate-200 shrink-0">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                    {chart.title}
                  </h3>
                  <span className="text-[11px] font-bold bg-blue-100 text-blue-800 px-2.5 py-0.5 rounded-full border border-blue-200">
                    Full Screen Mode · {activeChartType.toUpperCase()}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Interactive analytical view with zoom, pan, box select, and high-precision hover
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDownloadPng(true)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Download 1080p PNG</span>
                </button>

                <button
                  onClick={() => setIsFullscreen(false)}
                  title="Exit Full Screen (Esc)"
                  className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Fullscreen Canvas Container */}
            <div ref={fullscreenContainerRef} className="w-full flex-1 min-h-0" />

            {/* Footer with shortcut hint */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400 shrink-0">
              <span>Tip: Click and drag to zoom into any region · Double click to reset axes</span>
              <span>Press <kbd className="px-1.5 py-0.5 bg-slate-100 border border-slate-300 rounded text-slate-700 font-mono text-[10px]">Esc</kbd> to exit full screen</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
