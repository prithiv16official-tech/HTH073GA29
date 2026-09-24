import React, { useRef, useState } from 'react';
import { X, Upload, FileSpreadsheet, Check, AlertCircle, RefreshCw, Database } from 'lucide-react';
import { parseFile } from '../utils/fileParser';
import { Dataset } from '../types/dataset';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDatasetLoaded: (dataset: Dataset) => void;
  onResetToBuiltIn: () => void;
  isCustomLoaded: boolean;
}

export const UploadModal: React.FC<UploadModalProps> = ({
  isOpen,
  onClose,
  onDatasetLoaded,
  onResetToBuiltIn,
  isCustomLoaded,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);

  if (!isOpen) return null;

  const handleFileChange = async (file: File) => {
    try {
      setIsUploading(true);
      setErrorMessage(null);
      const ds = await parseFile(file);
      onDatasetLoaded(ds);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to parse file. Please upload a valid CSV or Excel file.');
    } finally {
      setIsUploading(false);
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200 relative space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Custom Dataset Source</h3>
              <p className="text-xs text-slate-500">Optional: analyze your own CSV or Excel tabular file</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current status */}
        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-blue-600" />
            <div>
              <div className="font-semibold text-slate-800">
                {isCustomLoaded ? 'Custom File Active' : 'Built-in 24-Month Dataset Active'}
              </div>
              <div className="text-[11px] text-slate-500">
                {isCustomLoaded ? 'Using uploaded data' : 'Includes 24 months of sales records, August 2026 calibration'}
              </div>
            </div>
          </div>

          {isCustomLoaded && (
            <button
              onClick={() => {
                onResetToBuiltIn();
                onClose();
              }}
              className="px-2.5 py-1 text-xs font-semibold text-blue-600 hover:bg-blue-50 border border-blue-200 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Reset to Built-in</span>
            </button>
          )}
        </div>

        {/* File Dropzone */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragActive(true);
          }}
          onDragLeave={() => setDragActive(false)}
          onDrop={onDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
            dragActive
              ? 'border-blue-500 bg-blue-50/60'
              : 'border-slate-300 hover:border-blue-400 hover:bg-slate-50'
          }`}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={(e) => {
              if (e.target.files?.[0]) handleFileChange(e.target.files[0]);
            }}
            accept=".csv,.xlsx,.xls"
            className="hidden"
          />

          <FileSpreadsheet className="w-10 h-10 text-slate-400 mx-auto mb-3" />
          <p className="text-sm font-semibold text-slate-800">
            {isUploading ? 'Parsing file schema...' : 'Click to upload or drag & drop'}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            Supports CSV (.csv) or Microsoft Excel (.xlsx, .xls)
          </p>
        </div>

        {errorMessage && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        <div className="flex justify-end pt-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
