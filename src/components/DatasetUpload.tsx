import React, { useRef, useState } from 'react';
import {
  UploadCloud,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Trash2,
  Hash,
  Type,
  Calendar,
  ToggleLeft,
  Download,
  Sparkles,
  ArrowRight,
  FileCheck,
  Layers,
  Table as TableIcon,
  Tag,
  Clock,
  Binary,
} from 'lucide-react';
import { Dataset, ColumnType } from '../types/dataset';
import { parseFile, createDatasetFromSample, downloadDatasetAsCsv, downloadDatasetAsXlsx } from '../utils/fileParser';
import { SAMPLE_DATASETS } from '../data/sampleDatasets';

interface DatasetUploadProps {
  currentDataset: Dataset | null;
  onDatasetLoaded: (dataset: Dataset) => void;
  onRemoveDataset: () => void;
  isLoading: boolean;
  setIsLoading: (val: boolean) => void;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} Bytes`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function getTypeIcon(type: ColumnType) {
  switch (type) {
    case 'number':
      return <Hash className="w-3 h-3 text-blue-600 shrink-0" />;
    case 'date':
      return <Calendar className="w-3 h-3 text-purple-600 shrink-0" />;
    case 'boolean':
      return <ToggleLeft className="w-3 h-3 text-amber-600 shrink-0" />;
    case 'text':
    default:
      return <Type className="w-3 h-3 text-emerald-600 shrink-0" />;
  }
}

export const DatasetUpload: React.FC<DatasetUploadProps> = ({
  currentDataset,
  onDatasetLoaded,
  onRemoveDataset,
  isLoading,
  setIsLoading,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [uploadSuccessNotice, setUploadSuccessNotice] = useState<string | null>(null);
  const [previewTab, setPreviewTab] = useState<'rows' | 'schema'>('rows');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileProcess = async (file: File) => {
    setErrorMessage(null);
    setUploadSuccessNotice(null);
    setIsLoading(true);

    try {
      const parsed = await parseFile(file);
      onDatasetLoaded(parsed);
      setUploadSuccessNotice(
        `"${file.name}" uploaded successfully! Inferred ${parsed.rowCount} rows, ${parsed.columnCount} columns, and complete schema metadata.`
      );
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err?.message || 'Error processing file. Please ensure it is a valid CSV or Excel file.');
    } finally {
      setIsLoading(false);
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileProcess(e.dataTransfer.files[0]);
    }
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const onDragLeave = () => {
    setIsDragOver(false);
  };

  const handleSelectSample = (sampleId: string) => {
    const sample = SAMPLE_DATASETS.find((s) => s.id === sampleId);
    if (!sample) return;

    setErrorMessage(null);
    setIsLoading(true);
    setTimeout(() => {
      const ds = createDatasetFromSample(sample.id, sample.name, sample.data, 'sample');
      onDatasetLoaded(ds);
      setUploadSuccessNotice(`Loaded preset benchmark "${sample.name}" with ${ds.rowCount} rows.`);
      setIsLoading(false);
    }, 100);
  };

  const handleDownloadSampleForTesting = (sampleId: string, format: 'csv' | 'xlsx') => {
    const sample = SAMPLE_DATASETS.find((s) => s.id === sampleId);
    if (!sample) return;

    const ds = createDatasetFromSample(sample.id, sample.name, sample.data, 'sample');
    if (format === 'csv') {
      downloadDatasetAsCsv(ds, `${sample.id}.csv`);
    } else {
      downloadDatasetAsXlsx(ds, `${sample.id}.xlsx`);
    }
  };

  const first10Rows = currentDataset ? currentDataset.previewRows || currentDataset.rawData.slice(0, 10) : [];

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-6">
      {/* Upload Zone & Quick Preset Selectors */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Dropzone Area */}
        <div className="lg:col-span-7 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <UploadCloud className="w-4 h-4 text-blue-600" />
                Upload Tabular Dataset
              </h3>
              <span className="text-[11px] text-slate-500 font-mono">
                Accepts .csv, .xlsx, .xls
              </span>
            </div>
            <p className="text-xs text-slate-500 mb-3">
              Drop any business spreadsheet. Schema types (text, number, date, boolean) and distributions are inferred automatically.
            </p>

            <div
              onDrop={onDrop}
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center min-h-[140px] ${
                isDragOver
                  ? 'border-blue-500 bg-blue-50/70 scale-[0.99]'
                  : 'border-slate-300 hover:border-blue-400 hover:bg-slate-50/60 bg-white'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv, .xlsx, .xls, text/csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files.length > 0) {
                    handleFileProcess(e.target.files[0]);
                  }
                }}
              />

              <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mb-2 shadow-2xs">
                <FileSpreadsheet className="w-5 h-5" />
              </div>

              <div className="text-xs font-semibold text-slate-800">
                <span className="text-blue-600 hover:underline">Click to browse</span> or drag & drop file here
              </div>
              <div className="text-[11px] text-slate-400 mt-1">
                CSV or Excel spreadsheets up to 25 MB
              </div>
            </div>
          </div>

          {/* Success / Error Banners */}
          {errorMessage && (
            <div className="mt-3 p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-start gap-2.5 text-xs text-rose-800 animate-fadeIn">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1 font-medium">{errorMessage}</div>
            </div>
          )}

          {uploadSuccessNotice && (
            <div className="mt-3 p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center justify-between text-xs text-emerald-800 animate-fadeIn">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="font-medium">{uploadSuccessNotice}</span>
              </div>
              <button
                type="button"
                onClick={() => setUploadSuccessNotice(null)}
                className="text-emerald-700 hover:text-emerald-900 text-xs font-bold ml-2"
              >
                ✕
              </button>
            </div>
          )}

          {/* Selected File Metadata Card */}
          {currentDataset && (
            <div className="mt-3 p-3 bg-slate-50 border border-slate-200 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white rounded border border-slate-200 text-blue-600 shrink-0">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900 truncate max-w-[240px]" title={currentDataset.name}>
                    {currentDataset.name}
                  </div>
                  <div className="text-[11px] text-slate-500 font-mono-numbers mt-0.5 flex items-center gap-2">
                    <span>{formatBytes(currentDataset.sizeInBytes)}</span>
                    <span>·</span>
                    <span className="font-semibold text-slate-700">{currentDataset.rowCount.toLocaleString()} rows</span>
                    <span>·</span>
                    <span className="font-semibold text-slate-700">{currentDataset.columnCount} columns</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-center">
                <button
                  type="button"
                  onClick={() => downloadDatasetAsCsv(currentDataset)}
                  title="Export current data as CSV"
                  className="px-2.5 py-1 text-xs text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded hover:bg-slate-100 transition-colors flex items-center gap-1"
                >
                  <Download className="w-3 h-3" />
                  <span>CSV</span>
                </button>
                <button
                  type="button"
                  onClick={() => downloadDatasetAsXlsx(currentDataset)}
                  title="Export current data as Excel XLSX"
                  className="px-2.5 py-1 text-xs text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded hover:bg-slate-100 transition-colors flex items-center gap-1"
                >
                  <Download className="w-3 h-3" />
                  <span>XLSX</span>
                </button>
                <button
                  type="button"
                  onClick={onRemoveDataset}
                  title="Remove this dataset"
                  className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Quick Schema Benchmarks (Schema A, Schema B, Schema C) */}
        <div className="lg:col-span-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800">
                <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                Test Specific Schema Presets
              </div>
            </div>
            <p className="text-xs text-slate-500 mb-3">
              Verify schema-agnostic parsing with the 3 distinct schemas:
            </p>

            <div className="space-y-2">
              {SAMPLE_DATASETS.slice(0, 3).map((sample, idx) => {
                const isSelected = currentDataset?.name === sample.name;
                const schemaLetters = ['A', 'B', 'C'];
                const schemaKey = schemaLetters[idx];

                return (
                  <div
                    key={sample.id}
                    className={`p-3 rounded-lg border transition-all text-xs flex flex-col gap-1.5 ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50/50 shadow-xs ring-1 ring-blue-500/20'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900">
                          Dataset {schemaKey}
                        </span>
                        <span className="text-[11px] text-slate-500 truncate max-w-[150px]">
                          {sample.name}
                        </span>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleSelectSample(sample.id)}
                          className="px-2.5 py-1 text-[11px] font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded transition-colors"
                        >
                          Load
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDownloadSampleForTesting(sample.id, sample.name.endsWith('.xlsx') ? 'xlsx' : 'csv')}
                          title={`Download ${sample.name} to test file upload`}
                          className="p-1 text-slate-500 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded transition-colors"
                        >
                          <Download className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    <div className="text-[11px] text-slate-600 font-mono bg-slate-50 px-2 py-1 rounded border border-slate-100">
                      {sample.description}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Dataset Inspection: Toggle between 10-Row Data Table and Inferred Schema Table */}
      {currentDataset && (
        <div className="pt-4 border-t border-slate-200 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-emerald-600" />
                Dataset Inspection & Inferred Schema
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Automatically discovered {currentDataset.columnCount} columns across {currentDataset.rowCount.toLocaleString()} rows.
              </p>
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs">
              <button
                type="button"
                onClick={() => setPreviewTab('rows')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-md font-medium transition-colors ${
                  previewTab === 'rows'
                    ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <TableIcon className="w-3 h-3" />
                <span>10-Row Preview</span>
              </button>
              <button
                type="button"
                onClick={() => setPreviewTab('schema')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-md font-medium transition-colors ${
                  previewTab === 'schema'
                    ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Layers className="w-3 h-3 text-blue-600" />
                <span>Detected Schema ({currentDataset.columnCount})</span>
              </button>
            </div>
          </div>

          {/* VIEW 1: 10 Rows Preview Table */}
          {previewTab === 'rows' && (
            <div className="overflow-x-auto custom-scrollbar border border-slate-200 rounded-lg">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-700 border-b border-slate-200 font-semibold select-none">
                    <th className="py-2.5 px-3 text-slate-400 w-10 text-center font-mono-numbers border-r border-slate-200">
                      #
                    </th>
                    {currentDataset.columns.map((col) => {
                      const isNum = col.type === 'number';
                      return (
                        <th
                          key={col.name}
                          className={`py-2 px-3 border-r border-slate-200 last:border-r-0 ${
                            isNum ? 'text-right' : 'text-left'
                          }`}
                        >
                          <div className={`flex flex-col gap-0.5 ${isNum ? 'items-end' : 'items-start'}`}>
                            <span className="text-slate-900 font-semibold truncate max-w-[180px]" title={col.name}>
                              {col.name}
                            </span>
                            <span className="inline-flex items-center gap-1 text-[10px] font-mono capitalize text-slate-500 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                              {getTypeIcon(col.type)}
                              <span>{col.type}</span>
                            </span>
                          </div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {first10Rows.map((row, rowIdx) => (
                    <tr key={rowIdx} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2 px-3 text-center text-slate-400 font-mono-numbers text-[11px] border-r border-slate-100">
                        {rowIdx + 1}
                      </td>
                      {currentDataset.columns.map((col) => {
                        const val = row[col.name];
                        const isNum = col.type === 'number';

                        let displayVal = '—';
                        if (val !== null && val !== undefined) {
                          if (typeof val === 'boolean') {
                            displayVal = val ? 'true' : 'false';
                          } else if (val instanceof Date) {
                            displayVal = val.toISOString().split('T')[0];
                          } else if (typeof val === 'number') {
                            displayVal = val.toLocaleString();
                          } else {
                            displayVal = String(val);
                          }
                        }

                        return (
                          <td
                            key={col.name}
                            className={`py-2 px-3 whitespace-nowrap border-r border-slate-100 last:border-r-0 ${
                              isNum
                                ? 'text-right font-mono-numbers text-slate-800'
                                : col.type === 'boolean'
                                ? 'text-center font-mono-numbers'
                                : 'text-left text-slate-700'
                            }`}
                          >
                            {col.type === 'boolean' && val !== null && val !== undefined ? (
                              <span
                                className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                                  val
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'bg-slate-100 text-slate-600'
                                }`}
                              >
                                {String(val)}
                              </span>
                            ) : (
                              displayVal
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* VIEW 2: Inferred Schema Specification Table */}
          {previewTab === 'schema' && (
            <div className="overflow-x-auto custom-scrollbar border border-slate-200 rounded-lg">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-700 border-b border-slate-200 font-semibold select-none">
                    <th className="py-2.5 px-3">Column Name</th>
                    <th className="py-2.5 px-3">Data Type</th>
                    <th className="py-2.5 px-3 text-right">Unique Values</th>
                    <th className="py-2.5 px-3 text-right">Missing Values</th>
                    <th className="py-2.5 px-3">Characteristics</th>
                    <th className="py-2.5 px-3">Example Values</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {currentDataset.columns.map((col) => {
                    const examples = col.exampleValues || col.sampleValues || [];
                    return (
                      <tr key={col.name} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-2.5 px-3 font-semibold text-slate-900 font-mono">
                          {col.name}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono capitalize bg-slate-100 border border-slate-200 text-slate-800">
                            {getTypeIcon(col.type)}
                            {col.type}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono-numbers text-slate-800">
                          {col.uniqueCount.toLocaleString()}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono-numbers">
                          {col.nullCount > 0 ? (
                            <span className="text-amber-600 font-medium">
                              {col.nullCount} ({col.nullPercentage}%)
                            </span>
                          ) : (
                            <span className="text-emerald-600">0 (0%)</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="flex flex-wrap gap-1">
                            {col.isCategorical && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 font-medium">
                                Categorical
                              </span>
                            )}
                            {col.isNumerical && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] bg-blue-50 text-blue-700 border border-blue-200 font-medium">
                                Numerical
                              </span>
                            )}
                            {col.isDate && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] bg-purple-50 text-purple-700 border border-purple-200 font-medium">
                                Date / Time
                              </span>
                            )}
                            {col.isBoolean && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] bg-amber-50 text-amber-700 border border-amber-200 font-medium">
                                Boolean
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-2.5 px-3 font-mono text-[11px] text-slate-600 truncate max-w-xs">
                          {examples.slice(0, 3).map(String).join(', ')}
                          {examples.length > 3 && '…'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
