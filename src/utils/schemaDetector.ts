import {
  ColumnMeta,
  ColumnType,
  DatasetSchema,
  CleanDatasetSchema,
  CleanColumnSchema,
  DatasetSchemaProfile,
  InferredDatasetSchema,
} from '../types/dataset';
import { buildDatasetSchemaProfile, buildInferredDatasetSchema } from './schemaInferenceEngine';

/**
 * Checks whether a single non-null value represents a boolean.
 */
export function isBooleanValue(val: any): boolean {
  if (typeof val === 'boolean') return true;
  if (typeof val === 'string') {
    const trimmed = val.trim().toLowerCase();
    return trimmed === 'true' || trimmed === 'false' || trimmed === 'yes' || trimmed === 'no';
  }
  return false;
}

/**
 * Checks whether a single non-null value represents a date.
 */
export function isDateValue(val: any): boolean {
  if (val instanceof Date) {
    return !isNaN(val.getTime());
  }

  if (typeof val !== 'string') return false;

  const trimmed = val.trim();
  if (trimmed.length < 6 || trimmed.length > 35) return false;

  // Pure digits or purely numeric strings are not dates (e.g. "2024", "1002")
  if (/^\d+$/.test(trimmed)) return false;

  // Date formats: YYYY-MM-DD, YYYY/MM/DD, MM/DD/YYYY, DD/MM/YYYY, ISO 8601, Month D, Yr
  const isDatePattern =
    /^\d{4}[-/.]\d{1,2}[-/.]\d{1,2}/.test(trimmed) ||
    /^\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4}/.test(trimmed) ||
    /^\d{4}-\d{2}-\d{2}T/.test(trimmed) ||
    /^[A-Za-z]{3,9}\s+\d{1,2},?\s+\d{4}/.test(trimmed) ||
    /^\d{1,2}\s+[A-Za-z]{3,9}\s+\d{4}/.test(trimmed);

  if (!isDatePattern) return false;

  const timestamp = Date.parse(trimmed);
  if (isNaN(timestamp) || timestamp <= 0) return false;

  const parsedDate = new Date(timestamp);
  const year = parsedDate.getFullYear();
  return year >= 1900 && year <= 2100;
}

/**
 * Parses a numeric value from string or number, stripping currency symbols and separators.
 */
export function parseNumericValue(val: any): number | null {
  if (typeof val === 'number') {
    return isNaN(val) ? null : val;
  }

  if (typeof val !== 'string') return null;

  const trimmed = val.trim();
  if (trimmed === '') return null;

  // Remove common currency symbols, percent signs, and comma separators
  let clean = trimmed.replace(/[$,€£¥₹%]/g, '').replace(/,/g, '');

  // Handle accounting parentheses negative numbers: (500) -> -500
  if (/^\(.*\)$/.test(clean)) {
    clean = '-' + clean.slice(1, -1).trim();
  }

  if (clean === '' || isNaN(Number(clean))) {
    return null;
  }

  const num = Number(clean);
  return isNaN(num) ? null : num;
}

/**
 * Detects the data type of a column based purely on its observed values.
 * Strictly schema-agnostic: does not check column names.
 */
export function detectColumnType(values: any[]): ColumnType {
  const sample = values.length > 2500 ? values.slice(0, 2500) : values;
  const nonNulls = sample.filter((v) => v !== null && v !== undefined && v !== '');
  if (nonNulls.length === 0) return 'text';

  let booleanCount = 0;
  let dateCount = 0;
  let numberCount = 0;

  for (const val of nonNulls) {
    if (isBooleanValue(val)) {
      booleanCount++;
    } else if (isDateValue(val)) {
      dateCount++;
    } else if (parseNumericValue(val) !== null) {
      numberCount++;
    }
  }

  const count = nonNulls.length;
  const threshold = count * 0.65; // At least 65% match required

  if (booleanCount >= threshold) return 'boolean';
  if (numberCount >= threshold) return 'number';
  if (dateCount >= threshold) return 'date';

  return 'text';
}

/**
 * Primary Schema Inference Engine.
 *
 * When a dataset is uploaded, analyzes every column and determines:
 * - column name
 * - data type
 * - number of unique values
 * - missing values
 * - example values
 * - whether it appears categorical
 * - whether it appears numerical
 * - whether it appears to contain dates
 *
 * Constructs a clean schema object that the rest of the application can use.
 */
export function inferDatasetSchema(
  rows: Record<string, any>[],
  orderedHeaders?: string[],
  datasetName?: string
): DatasetSchema {
  if (!rows || rows.length === 0) {
    const emptyCleanSchema: CleanDatasetSchema = {
      datasetName: datasetName || 'Empty Dataset',
      totalRows: 0,
      totalColumns: 0,
      columns: [],
      categoricalColumns: [],
      numericalColumns: [],
      dateColumns: [],
      booleanColumns: [],
      primaryKeyCandidate: null,
      overallCompleteness: 100,
      inferredAt: new Date().toISOString(),
    };

    return {
      columns: [],
      totalRows: 0,
      totalColumns: 0,
      columnNames: [],
      categoricalColumns: [],
      numericalColumns: [],
      dateColumns: [],
      booleanColumns: [],
      primaryKeyCandidate: null,
      overallCompleteness: 100,
      inferredAt: new Date().toISOString(),
      cleanSchema: emptyCleanSchema,
    };
  }

  const totalRows = rows.length;

  // Extract ordered column names
  let columnKeys: string[] = [];
  if (orderedHeaders && orderedHeaders.length > 0) {
    columnKeys = orderedHeaders.filter((h) => h && h.trim() !== '');
  } else {
    const keySet = new Set<string>();
    for (const row of rows) {
      for (const key of Object.keys(row)) {
        if (key && key.trim() !== '') {
          keySet.add(key);
        }
      }
    }
    columnKeys = Array.from(keySet);
  }

  const totalCells = totalRows * columnKeys.length;
  let nonNullCells = 0;

  const columns: ColumnMeta[] = [];
  const cleanColumns: CleanColumnSchema[] = [];

  for (const colName of columnKeys) {
    let nullCount = 0;
    let nonNullCount = 0;
    const sampleValuesForType: any[] = [];
    const uniqueFormattedSet = new Set<string>();
    const exampleValues: (string | number | boolean)[] = [];
    let isHighCardinality = false;

    let minVal: number | undefined;
    let maxVal: number | undefined;
    let sumVal = 0;
    let numCount = 0;

    let minTs: number | undefined;
    let maxTs: number | undefined;

    // Single fast pass over rows without allocating huge intermediate arrays
    for (let rIdx = 0; rIdx < totalRows; rIdx++) {
      const val = rows[rIdx][colName];
      if (val === null || val === undefined || val === '') {
        nullCount++;
        continue;
      }

      nonNullCount++;

      // Collect sample for type detection (at most 2,500 items)
      if (sampleValuesForType.length < 2500) {
        sampleValuesForType.push(val);
      }

      // Collect unique formatted values up to 500 distinct items (sufficient for categorical & cardinality detection)
      if (!isHighCardinality) {
        let formatted: string;
        let cleanExampleVal: string | number | boolean;

        if (val instanceof Date) {
          formatted = val.toISOString().split('T')[0];
          cleanExampleVal = formatted;
        } else if (typeof val === 'boolean' || typeof val === 'number') {
          formatted = String(val);
          cleanExampleVal = val;
        } else {
          formatted = String(val).trim();
          cleanExampleVal = formatted;
        }

        if (!uniqueFormattedSet.has(formatted)) {
          uniqueFormattedSet.add(formatted);
          if (exampleValues.length < 5) {
            exampleValues.push(cleanExampleVal);
          }
          if (uniqueFormattedSet.size >= 500) {
            isHighCardinality = true;
          }
        }
      }

      // Running numerical accumulation
      const num = parseNumericValue(val);
      if (num !== null) {
        if (minVal === undefined || num < minVal) minVal = num;
        if (maxVal === undefined || num > maxVal) maxVal = num;
        sumVal += num;
        numCount++;
      }

      // Running date timestamp detection
      if (val instanceof Date && !isNaN(val.getTime())) {
        const t = val.getTime();
        if (minTs === undefined || t < minTs) minTs = t;
        if (maxTs === undefined || t > maxTs) maxTs = t;
      } else if (typeof val === 'string' && val.length >= 6 && val.length <= 35) {
        const parsed = Date.parse(val.trim());
        if (!isNaN(parsed)) {
          if (minTs === undefined || parsed < minTs) minTs = parsed;
          if (maxTs === undefined || parsed > maxTs) maxTs = parsed;
        }
      }
    }

    nonNullCells += nonNullCount;
    const nullPercentage = totalRows > 0 ? Math.round((nullCount / totalRows) * 1000) / 10 : 0;

    // 1. Fast schema-agnostic Data Type Detection
    const dataType = detectColumnType(sampleValuesForType);

    // 2. Cardinality
    const uniqueValuesCount = isHighCardinality ? Math.max(500, Math.floor(totalRows * 0.9)) : uniqueFormattedSet.size;

    // 3. Whether it appears numerical, date, boolean
    const appearsNumerical = dataType === 'number';
    const appearsToContainDates = dataType === 'date';
    const appearsBoolean = dataType === 'boolean';

    // 4. Categorical detection
    let appearsCategorical = false;
    if (appearsBoolean) {
      appearsCategorical = true;
    } else if (dataType === 'text') {
      if (totalRows <= 5) {
        appearsCategorical = true;
      } else if (uniqueValuesCount <= 50 && (uniqueValuesCount < totalRows * 0.85 || uniqueValuesCount <= 20)) {
        appearsCategorical = true;
      }
    } else if (dataType === 'number') {
      if (uniqueValuesCount <= 8 && totalRows >= 8 && uniqueValuesCount < totalRows * 0.35) {
        appearsCategorical = true;
      }
    }

    // 5. Unique ID / primary key candidate
    const isPrimaryKeyCandidate =
      !isHighCardinality && uniqueValuesCount === totalRows && totalRows > 1 && (dataType === 'text' || dataType === 'number');

    // 6. Statistics
    let min: number | string | undefined;
    let max: number | string | undefined;
    let mean: number | undefined;
    let sum: number | undefined;

    if (appearsNumerical && numCount > 0) {
      sum = Math.round(sumVal * 100) / 100;
      mean = Math.round((sumVal / numCount) * 100) / 100;
      min = minVal;
      max = maxVal;
    } else if (appearsToContainDates && minTs !== undefined && maxTs !== undefined) {
      min = new Date(minTs).toISOString().split('T')[0];
      max = new Date(maxTs).toISOString().split('T')[0];
    }

    // Standard ColumnMeta (for backwards compatibility and existing components)
    columns.push({
      name: colName,
      type: dataType,
      nullCount,
      nullPercentage,
      uniqueCount: uniqueValuesCount,
      sampleValues: exampleValues,
      exampleValues,
      isCategorical: appearsCategorical,
      isNumerical: appearsNumerical,
      isDate: appearsToContainDates,
      isBoolean: appearsBoolean,
      isIdOrKey: isPrimaryKeyCandidate,
      min,
      max,
      mean,
      sum,
    });

    // Clean Column Schema (structured clean representation for modules & AI prompts)
    cleanColumns.push({
      columnName: colName,
      dataType,
      uniqueValuesCount,
      missingValuesCount: nullCount,
      missingValuesPercentage: nullPercentage,
      exampleValues,
      appearsCategorical,
      appearsNumerical,
      appearsToContainDates,
      appearsBoolean,
      isPrimaryKeyCandidate,
      stats: {
        min,
        max,
        mean,
        sum,
      },
    });
  }

  const categoricalColumns = cleanColumns.filter((c) => c.appearsCategorical).map((c) => c.columnName);
  const numericalColumns = cleanColumns.filter((c) => c.appearsNumerical).map((c) => c.columnName);
  const dateColumns = cleanColumns.filter((c) => c.appearsToContainDates).map((c) => c.columnName);
  const booleanColumns = cleanColumns.filter((c) => c.appearsBoolean).map((c) => c.columnName);

  const pkCandidate = cleanColumns.find((c) => c.isPrimaryKeyCandidate)?.columnName || null;

  const overallCompleteness =
    totalCells > 0 ? Math.round((nonNullCells / totalCells) * 1000) / 10 : 100;

  // Build complete semantic schema profile (schema-agnostic, with confidence and relationships)
  const columnTypeMap: Record<string, ColumnType> = {};
  for (const c of cleanColumns) {
    columnTypeMap[c.columnName] = c.dataType;
  }

  const inferredSchema: InferredDatasetSchema = buildInferredDatasetSchema(
    datasetName || 'Uploaded Dataset',
    rows,
    columnKeys,
    columnTypeMap
  );

  const schemaProfile: DatasetSchemaProfile = buildDatasetSchemaProfile(
    datasetName || 'Uploaded Dataset',
    rows,
    columnKeys,
    columnTypeMap
  );

  // Attach semantic profile to each ColumnMeta
  for (const col of columns) {
    const sem = schemaProfile.columns.find((p) => p.name === col.name);
    if (sem) {
      col.semanticProfile = sem;
    }
  }

  const cleanSchema: CleanDatasetSchema = {
    datasetName: datasetName || 'Uploaded Dataset',
    totalRows,
    totalColumns: cleanColumns.length,
    columns: cleanColumns,
    categoricalColumns,
    numericalColumns,
    dateColumns,
    booleanColumns,
    primaryKeyCandidate: pkCandidate,
    overallCompleteness,
    inferredAt: new Date().toISOString(),
  };

  return {
    columns,
    totalRows,
    totalColumns: columns.length,
    columnNames: columns.map((c) => c.name),
    categoricalColumns,
    numericalColumns,
    dateColumns,
    booleanColumns,
    primaryKeyCandidate: pkCandidate,
    overallCompleteness,
    inferredAt: cleanSchema.inferredAt,
    cleanSchema,
    schemaProfile,
    inferredSchema,
  };
}

/**
 * Returns clean schema object directly for use by any application service.
 */
export function getCleanDatasetSchema(
  rows: Record<string, any>[],
  orderedHeaders?: string[],
  datasetName?: string
): CleanDatasetSchema {
  return inferDatasetSchema(rows, orderedHeaders, datasetName).cleanSchema;
}

/**
 * Backwards compatibility helper returning ColumnMeta array.
 */
export function analyzeSchema(
  rows: Record<string, any>[],
  orderedHeaders?: string[]
): ColumnMeta[] {
  return inferDatasetSchema(rows, orderedHeaders).columns;
}
