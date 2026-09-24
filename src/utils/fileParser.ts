import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { Dataset } from '../types/dataset';
import { inferDatasetSchema } from './schemaDetector';

export async function parseFile(file: File): Promise<Dataset> {
  const extension = file.name.split('.').pop()?.toLowerCase();

  if (extension === 'csv') {
    return parseCsvFile(file);
  } else if (extension === 'xlsx' || extension === 'xls') {
    return parseExcelFile(file);
  } else {
    throw new Error(`Unsupported file type: .${extension}. Please upload a CSV (.csv) or Excel (.xlsx, .xls) file.`);
  }
}

function parseCsvFile(file: File): Promise<Dataset> {
  return new Promise((resolve, reject) => {
    Papa.parse<Record<string, any>>(file, {
      header: true,
      skipEmptyLines: 'greedy',
      dynamicTyping: true,
      worker: true,
      complete: (results) => {
        try {
          if (!results.data || results.data.length === 0) {
            reject(new Error('The uploaded CSV file contains no readable data rows.'));
            return;
          }

          // Zero-allocation row filtering
          const rows = results.data;
          const rawData: Record<string, any>[] = [];
          for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            if (!row) continue;
            let hasValue = false;
            for (const k in row) {
              const v = row[k];
              if (v !== null && v !== undefined && v !== '') {
                hasValue = true;
                break;
              }
            }
            if (hasValue) {
              rawData.push(row);
            }
          }

          if (rawData.length === 0) {
            reject(new Error('The CSV file contains only blank or empty rows.'));
            return;
          }

          const orderedHeaders = results.meta.fields || [];
          const schema = inferDatasetSchema(rawData, orderedHeaders, file.name);

          const dataset: Dataset = {
            id: `ds-${Date.now()}`,
            name: file.name,
            sizeInBytes: file.size,
            rowCount: rawData.length,
            columnCount: schema.columns.length,
            columns: schema.columns,
            schema,
            schemaProfile: schema.schemaProfile,
            inferredSchema: schema.inferredSchema,
            rawData,
            previewRows: rawData.slice(0, 10), // First 10 rows
            uploadedAt: new Date().toISOString(),
            sourceType: 'csv',
          };

          resolve(dataset);
        } catch (err: any) {
          reject(err);
        }
      },
      error: (err) => {
        reject(new Error(`Failed to parse CSV file: ${err.message}`));
      },
    });
  });
}

async function parseExcelFile(file: File): Promise<Dataset> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });

  if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
    throw new Error('The uploaded Excel workbook contains no sheets.');
  }

  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];

  if (!worksheet) {
    throw new Error(`Sheet "${firstSheetName}" could not be read.`);
  }

  // Extract ordered headers from the first row of the sheet
  const orderedHeaders: string[] = [];
  if (worksheet['!ref']) {
    const range = XLSX.utils.decode_range(worksheet['!ref']);
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const cellAddress = XLSX.utils.encode_cell({ r: range.s.r, c: C });
      const cell = worksheet[cellAddress];
      if (cell && cell.v !== undefined && cell.v !== null) {
        orderedHeaders.push(String(cell.v).trim());
      }
    }
  }

  const rawJson = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, {
    defval: null,
    raw: false,
    dateNF: 'yyyy-mm-dd',
  });

  if (!rawJson || rawJson.length === 0) {
    throw new Error(`The Excel sheet "${firstSheetName}" contains no readable data.`);
  }

  const rawData = rawJson.filter((row) => {
    return Object.values(row).some((val) => val !== null && val !== undefined && val !== '');
  });

  if (rawData.length === 0) {
    throw new Error('The Excel sheet contains only blank rows.');
  }

  const schema = inferDatasetSchema(rawData, orderedHeaders.length > 0 ? orderedHeaders : undefined);

  return {
    id: `ds-${Date.now()}`,
    name: file.name,
    sizeInBytes: file.size,
    rowCount: rawData.length,
    columnCount: schema.columns.length,
    columns: schema.columns,
    schema,
    schemaProfile: schema.schemaProfile,
    inferredSchema: schema.inferredSchema,
    rawData,
    previewRows: rawData.slice(0, 10), // First 10 rows
    uploadedAt: new Date().toISOString(),
    sourceType: 'xlsx',
  };
}

export function createDatasetFromSample(
  id: string,
  name: string,
  rows: Record<string, any>[],
  sourceType: 'csv' | 'xlsx' | 'sample' = 'sample'
): Dataset {
  const headers = rows.length > 0 ? Object.keys(rows[0]) : [];
  const schema = inferDatasetSchema(rows, headers);
  const sizeEstimate = JSON.stringify(rows).length;

  return {
    id: `sample-${id}`,
    name,
    sizeInBytes: sizeEstimate,
    rowCount: rows.length,
    columnCount: schema.columns.length,
    columns: schema.columns,
    schema,
    schemaProfile: schema.schemaProfile,
    inferredSchema: schema.inferredSchema,
    rawData: rows,
    previewRows: rows.slice(0, 10), // First 10 rows
    uploadedAt: new Date().toISOString(),
    sourceType,
  };
}

// Download rows as CSV file
export function downloadDatasetAsCsv(dataset: Dataset, filename?: string) {
  const csv = Papa.unparse(dataset.rawData);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename || `${dataset.name.replace(/\.[^/.]+$/, '')}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// Download rows as XLSX file
export function downloadDatasetAsXlsx(dataset: Dataset, filename?: string) {
  const worksheet = XLSX.utils.json_to_sheet(dataset.rawData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Data');
  const xlsxBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([xlsxBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename || `${dataset.name.replace(/\.[^/.]+$/, '')}.xlsx`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
