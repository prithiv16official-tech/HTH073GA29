import React from 'react';
import { X, Sparkles, Database, ArrowRight } from 'lucide-react';
import { SAMPLE_DATASETS } from '../data/sampleDatasets';
import { SampleDatasetDefinition } from '../types/dataset';

interface SampleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectSample: (sample: SampleDatasetDefinition) => void;
  currentDatasetName?: string;
}

export const SampleModal: React.FC<SampleModalProps> = ({
  isOpen,
  onClose,
  onSelectSample,
  currentDatasetName,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-2xl w-full border border-slate-200 shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-100 rounded-lg text-blue-700">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Choose a Sample Business Dataset
              </h3>
              <p className="text-xs text-slate-500">
                Explore schema-agnostic data analytics with diverse business domains.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* List */}
        <div className="p-5 space-y-3 overflow-y-auto custom-scrollbar">
          {SAMPLE_DATASETS.map((sample) => {
            const isCurrent = currentDatasetName === sample.name;
            return (
              <div
                key={sample.id}
                onClick={() => {
                  onSelectSample(sample);
                  onClose();
                }}
                className={`p-4 rounded-xl border transition-all cursor-pointer ${
                  isCurrent
                    ? 'border-blue-500 bg-blue-50/50 ring-1 ring-blue-500'
                    : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-blue-600 uppercase tracking-wider">
                        {sample.domain}
                      </span>
                      {isCurrent && (
                        <span className="text-[10px] bg-blue-100 text-blue-800 font-bold px-1.5 py-0.5 rounded">
                          Currently Active
                        </span>
                      )}
                    </div>
                    <h4 className="text-sm font-bold text-slate-900 mt-0.5">
                      {sample.name}
                    </h4>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                      {sample.description}
                    </p>
                  </div>

                  <button
                    type="button"
                    className="shrink-0 inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-md bg-slate-900 hover:bg-slate-800 text-white transition-colors"
                  >
                    <span>Load</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Sample questions */}
                <div className="mt-3 pt-2.5 border-t border-slate-100 flex flex-wrap gap-1.5">
                  <span className="text-[11px] text-slate-400 mr-1 flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-slate-400" />
                    Try:
                  </span>
                  {sample.suggestedQuestions.slice(0, 2).map((q, i) => (
                    <span
                      key={i}
                      className="text-[11px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded"
                    >
                      "{q}"
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
