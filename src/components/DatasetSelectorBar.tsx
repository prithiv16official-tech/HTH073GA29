import React, { useRef } from 'react';
import {
  Sparkles,
  Upload,
  RefreshCw,
  Table,
  CheckCircle2,
  Layers,
  FileSpreadsheet,
  BarChart3,
  HelpCircle,
} from 'lucide-react';
import { Dataset, SampleDatasetDefinition } from '../types/dataset';
import { SAMPLE_DATASETS } from '../data/sampleDatasets';

interface DatasetSelectorBarProps {
  currentDataset: Dataset | null;
  onSelectSample: (sampleId: string) => void;
  onUploadFile: (file: File) => void;
  onResetDataset: () => void;
  onTabChange: (tab: 'dashboard' | 'preview' | 'schema' | 'history') => void;
  activeTab: 'dashboard' | 'preview' | 'schema' | 'history';
}

export const DatasetSelectorBar: React.FC<DatasetSelectorBarProps> = ({
  currentDataset,
  onSelectSample,
  onUploadFile,
  onResetDataset,
  onTabChange,
  activeTab,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onUploadFile(file);
    }
    // reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Determine which sample is active
  const activeSample = SAMPLE_DATASETS.find(
    (s) =>
      currentDataset?.name === s.name ||
      currentDataset?.id === `sample-${s.id}` ||
      currentDataset?.id === s.id
  );

  return (
    <div className="bg-white border-b border-slate-200 shadow-2xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Left: Try with Sample Dataset Dropdown & Actions */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1.5 text-xs font-bold text-slate-800 uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                Try with Sample Dataset:
              </span>

              {/* Sample Dataset Dropdown */}
              <div className="relative">
                <select
                  value={activeSample ? activeSample.id : 'custom'}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val !== 'custom') {
                      onSelectSample(val);
                    }
                  }}
                  className="appearance-none bg-slate-50 hover:bg-slate-100 border border-slate-300 text-slate-900 font-semibold text-xs rounded-lg pl-3 pr-8 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 cursor-pointer transition-colors shadow-2xs"
                >
                  <option value="ecommerce-sales">1. E-Commerce Sales (520 rows · 8 cols)</option>
                  <option value="retail-sales">2. Retail Sales (520 rows · 7 cols)</option>
                  <option value="business-performance">3. Business Performance (520 rows · 7 cols)</option>
                  {!activeSample && currentDataset && (
                    <option value="custom">Uploaded: {currentDataset.name}</option>
                  )}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-500">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Upload My CSV/Excel Button */}
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleFileChange}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg shadow-2xs transition-colors cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5 text-blue-400" />
                <span>Upload My CSV/Excel</span>
              </button>
            </div>

            {/* Reset Dataset Button */}
            <button
              type="button"
              onClick={onResetDataset}
              title="Reset or reload the default sample dataset"
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg border border-slate-200 transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
              <span>Reset Dataset</span>
            </button>
          </div>

          {/* Right: Live Dataset Health, Stats & Quick Tabs */}
          {currentDataset && (
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs">
              {/* Row & Column Count Badges */}
              <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1.5 rounded-md border border-slate-200 font-mono-numbers">
                <Table className="w-3.5 h-3.5 text-slate-500" />
                <span className="font-bold text-slate-900">{currentDataset.rowCount.toLocaleString()}</span>
                <span className="text-slate-500">rows</span>
                <span className="text-slate-300">·</span>
                <span className="font-bold text-slate-900">{currentDataset.columnCount}</span>
                <span className="text-slate-500">cols</span>
              </div>

              {/* Data Quality Status */}
              <div className="flex items-center gap-1.5 bg-emerald-50 px-2.5 py-1.5 rounded-md border border-emerald-200 text-emerald-800 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Data Quality: 100% Valid</span>
              </div>

              {/* Quick Tab Switchers */}
              <div className="hidden sm:flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                <button
                  type="button"
                  onClick={() => onTabChange('dashboard')}
                  className={`px-2.5 py-1 text-xs rounded-md transition-all font-medium flex items-center gap-1 ${
                    activeTab === 'dashboard'
                      ? 'bg-white text-slate-900 font-bold shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Sparkles className="w-3 h-3 text-blue-600" />
                  Q&A
                </button>
                <button
                  type="button"
                  onClick={() => onTabChange('preview')}
                  className={`px-2.5 py-1 text-xs rounded-md transition-all font-medium flex items-center gap-1 ${
                    activeTab === 'preview'
                      ? 'bg-white text-slate-900 font-bold shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <FileSpreadsheet className="w-3 h-3 text-slate-500" />
                  Data Preview
                </button>
                <button
                  type="button"
                  onClick={() => onTabChange('schema')}
                  className={`px-2.5 py-1 text-xs rounded-md transition-all font-medium flex items-center gap-1 ${
                    activeTab === 'schema'
                      ? 'bg-white text-slate-900 font-bold shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <BarChart3 className="w-3 h-3 text-slate-500" />
                  Schema & Quality
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
