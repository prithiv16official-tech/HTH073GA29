import React, { useState, useMemo } from 'react';
import { Search, ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { Dataset } from '../types/dataset';

interface DatasetPreviewProps {
  dataset: Dataset;
}

export const DatasetPreview: React.FC<DatasetPreviewProps> = ({ dataset }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [pageSize, setPageSize] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Filtered rows
  const filteredRows = useMemo(() => {
    let result = dataset.rawData;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((row) =>
        Object.values(row).some((val) =>
          String(val ?? '').toLowerCase().includes(q)
        )
      );
    }

    if (sortColumn) {
      result = [...result].sort((a, b) => {
        const valA = a[sortColumn];
        const valB = b[sortColumn];

        if (valA === valB) return 0;
        if (valA === null || valA === undefined) return 1;
        if (valB === null || valB === undefined) return -1;

        if (typeof valA === 'number' && typeof valB === 'number') {
          return sortDirection === 'asc' ? valA - valB : valB - valA;
        }

        const strA = String(valA).toLowerCase();
        const strB = String(valB).toLowerCase();
        return sortDirection === 'asc'
          ? strA.localeCompare(strB)
          : strB.localeCompare(strA);
      });
    }

    return result;
  }, [dataset.rawData, searchQuery, sortColumn, sortDirection]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const validCurrentPage = Math.min(currentPage, totalPages);
  const paginatedRows = useMemo(() => {
    const start = (validCurrentPage - 1) * pageSize;
    return filteredRows.slice(start, start + pageSize);
  }, [filteredRows, validCurrentPage, pageSize]);

  const handleSort = (colName: string) => {
    if (sortColumn === colName) {
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else {
        setSortColumn(null);
      }
    } else {
      setSortColumn(colName);
      setSortDirection('asc');
    }
  };

  const getColType = (colName: string) => {
    return dataset.columns.find((c) => c.name === colName)?.type || 'text';
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
      {/* Controls Bar */}
      <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search records across all fields..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-md focus:outline-hidden focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center gap-4 text-xs text-slate-600">
          <div className="flex items-center gap-2">
            <span>Rows per page:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="border border-slate-200 rounded px-2 py-1 text-xs bg-white text-slate-800"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>

          <div className="font-mono-numbers">
            Showing{' '}
            <span className="font-semibold text-slate-900">
              {filteredRows.length === 0 ? 0 : (validCurrentPage - 1) * pageSize + 1}
            </span>
            -
            <span className="font-semibold text-slate-900">
              {Math.min(validCurrentPage * pageSize, filteredRows.length)}
            </span>{' '}
            of <span className="font-semibold text-slate-900">{filteredRows.length.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* High-Density Data Grid */}
      <div className="overflow-x-auto custom-scrollbar">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-50 text-slate-700 border-b border-slate-200 font-semibold select-none">
              <th className="py-2.5 px-3 text-slate-400 w-12 text-center font-mono-numbers">#</th>
              {dataset.columns.map((col) => {
                const isNumeric = col.type === 'number';
                const isSorted = sortColumn === col.name;
                return (
                  <th
                    key={col.name}
                    onClick={() => handleSort(col.name)}
                    className={`py-2.5 px-4 cursor-pointer hover:bg-slate-100 transition-colors whitespace-nowrap ${
                      isNumeric ? 'text-right' : 'text-left'
                    }`}
                  >
                    <div
                      className={`inline-flex items-center gap-1.5 ${
                        isNumeric ? 'justify-end w-full' : ''
                      }`}
                    >
                      <span className="truncate max-w-[180px]">{col.name}</span>
                      {isSorted ? (
                        sortDirection === 'asc' ? (
                          <ArrowUp className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                        ) : (
                          <ArrowDown className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                        )
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-slate-300 opacity-60 hover:opacity-100 shrink-0" />
                      )}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {paginatedRows.length === 0 ? (
              <tr>
                <td
                  colSpan={dataset.columns.length + 1}
                  className="py-12 text-center text-slate-500"
                >
                  No matching records found for "{searchQuery}".
                </td>
              </tr>
            ) : (
              paginatedRows.map((row, idx) => {
                const rowNum = (validCurrentPage - 1) * pageSize + idx + 1;
                return (
                  <tr
                    key={idx}
                    className="hover:bg-blue-50/30 transition-colors"
                  >
                    <td className="py-2 px-3 text-center text-slate-400 font-mono-numbers text-[11px]">
                      {rowNum}
                    </td>
                    {dataset.columns.map((col) => {
                      const val = row[col.name];
                      const isNumeric = col.type === 'number';
                      const formattedVal =
                        val === null || val === undefined
                          ? '—'
                          : typeof val === 'number'
                          ? val.toLocaleString()
                          : String(val);

                      return (
                        <td
                          key={col.name}
                          className={`py-2 px-4 whitespace-nowrap ${
                            isNumeric
                              ? 'text-right font-mono-numbers text-slate-800'
                              : 'text-left text-slate-700'
                          }`}
                        >
                          {formattedVal}
                        </td>
                      );
                    })}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="p-3 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600 bg-slate-50/50">
        <div>
          Page <span className="font-semibold text-slate-900 font-mono-numbers">{validCurrentPage}</span> of{' '}
          <span className="font-semibold text-slate-900 font-mono-numbers">{totalPages}</span>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={validCurrentPage <= 1}
            className="p-1 rounded border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-white text-slate-700 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={validCurrentPage >= totalPages}
            className="p-1 rounded border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-white text-slate-700 transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
