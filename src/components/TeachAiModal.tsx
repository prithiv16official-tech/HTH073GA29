import React, { useState } from 'react';
import {
  X,
  BookOpen,
  Plus,
  Trash2,
  Check,
  Sparkles,
  Info,
  HelpCircle,
  FileText,
  Languages,
} from 'lucide-react';
import {
  getCustomKnowledge,
  addCustomKnowledge,
  deleteCustomKnowledge,
} from '../utils/customKnowledge';
import { CustomKnowledgeItem, SUPPORTED_LANGUAGES, SupportedLanguage } from '../types/assistant';

interface TeachAiModalProps {
  isOpen: boolean;
  onClose: () => void;
  onKnowledgeUpdated: () => void;
}

export const TeachAiModal: React.FC<TeachAiModalProps> = ({
  isOpen,
  onClose,
  onKnowledgeUpdated,
}) => {
  const [items, setItems] = useState<CustomKnowledgeItem[]>(() => getCustomKnowledge());
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [type, setType] = useState<CustomKnowledgeItem['type']>('term');
  const [lang, setLang] = useState<SupportedLanguage>('en');
  const [saveSuccess, setSaveSuccess] = useState(false);

  if (!isOpen) return null;

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    addCustomKnowledge(title, content, type, lang);
    const updated = getCustomKnowledge();
    setItems(updated);
    setTitle('');
    setContent('');
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);
    onKnowledgeUpdated();
  };

  const handleDelete = (id: string) => {
    deleteCustomKnowledge(id);
    const updated = getCustomKnowledge();
    setItems(updated);
    onKnowledgeUpdated();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-xl border border-slate-200 relative max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Teach AI / Custom Knowledge</h3>
              <p className="text-xs text-slate-500">
                Provide custom business definitions, terminology, and instructions in any language.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto py-4 space-y-6 custom-scrollbar pr-1">
          {/* Notice */}
          <div className="p-3 bg-amber-50 border border-amber-200/80 rounded-xl text-xs text-amber-900 flex items-start gap-2">
            <Info className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
            <p>
              Knowledge added here acts as an intelligent context layer for query interpretation and multilingual understanding.
            </p>
          </div>

          {/* Add Form */}
          <form onSubmit={handleAdd} className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 space-y-3">
            <div className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Plus className="w-3.5 h-3.5 text-blue-600" />
              <span>Add Terminology or Instruction</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div className="sm:col-span-2">
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Revenue Definition / Tanglish Term"
                  className="w-full text-xs bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-hidden focus:border-blue-600"
                />
              </div>

              <div>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as any)}
                  className="w-full text-xs bg-white border border-slate-300 rounded-lg px-2.5 py-2 text-slate-800 focus:outline-hidden focus:border-blue-600"
                >
                  <option value="term">Terminology / Term</option>
                  <option value="rule">Business Rule</option>
                  <option value="instruction">Instruction</option>
                  <option value="faq">FAQ</option>
                </select>
              </div>
            </div>

            <div>
              <textarea
                rows={2}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="e.g. 'Revenue means total sales amount' or 'Revenue na total sales amount nu artham.'"
                className="w-full text-xs bg-white border border-slate-300 rounded-lg p-3 text-slate-900 focus:outline-hidden focus:border-blue-600 resize-none leading-relaxed"
              />
            </div>

            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-2">
                <Languages className="w-3.5 h-3.5 text-slate-400" />
                <select
                  value={lang}
                  onChange={(e) => setLang(e.target.value as any)}
                  className="text-xs bg-transparent text-slate-600 border-none focus:outline-hidden cursor-pointer"
                >
                  {SUPPORTED_LANGUAGES.map((l) => (
                    <option key={l.code} value={l.code}>
                      {l.name} ({l.nativeName})
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                disabled={!title.trim() || !content.trim()}
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-lg text-xs font-semibold shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                {saveSuccess ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                <span>{saveSuccess ? 'Saved' : 'Add Knowledge'}</span>
              </button>
            </div>
          </form>

          {/* Current Knowledge Base List */}
          <div className="space-y-2.5">
            <div className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center justify-between">
              <span>Active Knowledge Base ({items.length})</span>
            </div>

            <div className="space-y-2">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="p-3 bg-white border border-slate-200 rounded-xl flex items-start justify-between gap-3 shadow-2xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900">{item.title}</span>
                      <span className="text-[10px] uppercase font-semibold px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded">
                        {item.type}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">{item.content}</p>
                  </div>

                  <button
                    onClick={() => handleDelete(item.id)}
                    className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-slate-100 transition-colors shrink-0"
                    title="Delete knowledge item"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-slate-100 pt-3 flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
