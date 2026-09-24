export type ColumnType = 'text' | 'number' | 'date' | 'boolean';

export type SemanticRole =
  | 'product'
  | 'product_id'
  | 'category'
  | 'sales'
  | 'revenue'
  | 'sales_revenue'
  | 'cost'
  | 'profit'
  | 'unit_price'
  | 'quantity'
  | 'date'
  | 'timestamp'
  | 'time'
  | 'customer'
  | 'customer_id'
  | 'region'
  | 'location'
  | 'order_id'
  | 'employee'
  | 'department'
  | 'status'
  | 'percentage'
  | 'currency'
  | 'rating'
  | 'other_numeric'
  | 'other_categorical'
  | 'unknown';

export type DetailedDataType =
  | 'text'
  | 'integer'
  | 'decimal'
  | 'boolean'
  | 'date'
  | 'datetime'
  | 'categorical'
  | 'identifier'
  | 'currency'
  | 'percentage';

export interface PossibleRoleInterpretation {
  role: SemanticRole;
  label: string;
  confidence: number;
  reason?: string;
}

export interface InferredColumnSchema {
  originalName: string;
  dataType: ColumnType;
  detailedDataType: DetailedDataType;
  semanticRole: SemanticRole;
  semanticLabel: string; // e.g. "Revenue / Sales Amount", "Transaction Date", "Product"
  confidence: number; // 0.0 - 1.0 (e.g. 0.92)
  isAmbiguous: boolean;
  possibleRoles: PossibleRoleInterpretation[];
  sampleValues: Array<string | number | boolean>;
  missingCount: number;
  missingPercentage: number;
  uniqueCount: number;
  statistics?: {
    min?: number | string;
    max?: number | string;
    mean?: number;
    median?: number;
    sum?: number;
  };
  temporal?: {
    earliestDate?: string;
    latestDate?: string;
    yearRange?: string;
    monthRange?: string;
    hasTimeInfo?: boolean;
  };
  categorical?: {
    categories: string[];
    isLowCardinality: boolean;
  };
  evidence: string[];
}

export interface SchemaInferenceSummary {
  totalRows: number;
  totalColumns: number;
  numericColumns: number;
  textColumns: number;
  dateColumns: number;
  categoricalColumns: number;
  identifierColumns: number;
  totalMissingCells: number;
  missingDataPercentage: number;
  detectedBusinessFields: Array<{
    roleName: string;
    columnName: string;
    confidence: number;
  }>;
}

export interface InferredDatasetSchema {
  datasetName: string;
  datasetSummary: {
    rows: number;
    columns: number;
  };
  totalRows: number;
  totalColumns: number;
  columns: InferredColumnSchema[];
  summary: SchemaInferenceSummary;
  relationships: InferredRelationship[];
  roleMap: Partial<Record<SemanticRole, string[]>>;
  inferredAt: string;
}

export interface ColumnSemanticProfile {
  name: string;
  type: ColumnType;
  semanticRole: SemanticRole;
  confidence: number; // 0.0 - 1.0 (e.g. 0.95)
  evidence: string[]; // Reasons why this role was inferred
  stats: {
    rowCount: number;
    uniqueCount: number;
    uniqueRatio: number;
    nullCount: number;
    nullPercentage: number;
    exampleValues: Array<string | number | boolean>;
    min?: number | string;
    max?: number | string;
    mean?: number;
    median?: number;
    sum?: number;
    isMonetaryLike?: boolean;
    isIntegerOnly?: boolean;
  };
}

export interface InferredRelationship {
  type: 'multiplication' | 'subtraction' | 'foreign_key' | 'hierarchy';
  description: string;
  sourceColumns: string[];
  targetColumn: string;
  formula: string; // e.g. "Total_Amount ≈ Qty * Unit_Price"
  confidence: number;
  sampleVerification: string;
}

export interface DatasetSchemaProfile {
  datasetName: string;
  totalRows: number;
  totalColumns: number;
  columns: ColumnSemanticProfile[];
  relationships: InferredRelationship[];
  roleMap: Partial<Record<SemanticRole, string[]>>; // Maps role to column names sorted by confidence
  ambiguousRoles: Array<{
    role: string;
    candidateColumns: string[];
    reason: string;
  }>;
  explanation: string;
}

export interface ColumnMeta {
  name: string;
  type: ColumnType;
  nullCount: number;
  nullPercentage: number;
  uniqueCount: number;
  sampleValues: Array<string | number | boolean | null>;
  exampleValues: Array<string | number | boolean>;
  isCategorical: boolean;
  isNumerical: boolean;
  isDate: boolean;
  isBoolean: boolean;
  isIdOrKey: boolean;
  min?: number | string;
  max?: number | string;
  mean?: number;
  sum?: number;
  semanticProfile?: ColumnSemanticProfile;
}

export interface CleanColumnSchema {
  columnName: string;
  dataType: ColumnType;
  uniqueValuesCount: number;
  missingValuesCount: number;
  missingValuesPercentage: number;
  exampleValues: Array<string | number | boolean>;
  appearsCategorical: boolean;
  appearsNumerical: boolean;
  appearsToContainDates: boolean;
  appearsBoolean: boolean;
  isPrimaryKeyCandidate: boolean;
  stats?: {
    min?: number | string;
    max?: number | string;
    mean?: number;
    sum?: number;
  };
}

export interface CleanDatasetSchema {
  datasetName: string;
  totalRows: number;
  totalColumns: number;
  columns: CleanColumnSchema[];
  categoricalColumns: string[];
  numericalColumns: string[];
  dateColumns: string[];
  booleanColumns: string[];
  primaryKeyCandidate: string | null;
  overallCompleteness: number;
  inferredAt: string;
}

export interface DatasetSchema {
  columns: ColumnMeta[];
  totalRows: number;
  totalColumns: number;
  columnNames: string[];
  categoricalColumns: string[];
  numericalColumns: string[];
  dateColumns: string[];
  booleanColumns: string[];
  primaryKeyCandidate: string | null;
  overallCompleteness: number; // 0 - 100%
  inferredAt: string;
  cleanSchema: CleanDatasetSchema;
  schemaProfile?: DatasetSchemaProfile;
  inferredSchema?: InferredDatasetSchema;
}

export interface Dataset {
  id: string;
  name: string;
  sizeInBytes: number;
  rowCount: number;
  columnCount: number;
  columns: ColumnMeta[];
  schema: DatasetSchema;
  schemaProfile?: DatasetSchemaProfile;
  inferredSchema?: InferredDatasetSchema;
  rawData: Record<string, any>[];
  previewRows: Record<string, any>[];
  uploadedAt: string;
  sourceType: 'csv' | 'xlsx' | 'sample';
}

export interface MetricBreakdown {
  label: string;
  value: string | number;
  change?: string;
  detail?: string;
}

export interface ChartSpecification {
  type: 'bar' | 'line' | 'pie' | 'scatter';
  title: string;
  xAxisLabel: string;
  yAxisLabel: string;
  data: Array<any>;
  layout: Record<string, any>;
}

export interface CalculationStep {
  stepNumber: number;
  title: string;
  detail: string;
  status: 'completed' | 'info';
}

export interface CalculationExplanation {
  formula: string;
  steps: CalculationStep[];
  filteredRowCount: number;
  totalRowCount: number;
  targetColumns: string[];
  aggregationType: string;
  confidenceScore: number;
  executionTimeMs?: number;
}

export type PlanOperation =
  | 'group_and_sum'
  | 'group_and_avg'
  | 'group_and_count'
  | 'total_sum'
  | 'average'
  | 'count'
  | 'time_trend'
  | 'find_extremum'
  | 'filter_and_aggregate'
  | 'correlation'
  | 'detect_outliers';

export interface PlanFilter {
  column: string;
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains';
  value: string | number;
}

export interface GeminiAnalysisPlan {
  isAmbiguous: boolean;
  clarificationMessage?: string | null;
  clarificationOptions?: string[];
  operation: PlanOperation;
  group_column: string | null;
  value_column: string | null;
  time_grain?: 'monthly' | 'daily' | 'yearly' | null;
  sort: 'descending' | 'ascending' | 'none';
  limit: number | null;
  filters?: PlanFilter[];
  chart_type: 'bar' | 'line' | 'pie' | 'scatter';
  explanation: string;
  sql_representation: string;
  source: 'gemini' | 'local_fallback';
}

export interface StructuredAnalysisPlan {
  intent: string;
  goalDescription: string;
  operation: PlanOperation;
  metricColumn: string | null;
  metricColumnType?: ColumnType;
  dimensionColumn: string | null;
  dimensionColumnType?: ColumnType;
  timeGrain?: 'monthly' | 'daily' | 'yearly';
  aggregationFunction: string;
  sort: 'descending' | 'ascending' | 'none';
  limit: number | null;
  filterDescription?: string;
  plannedVisualization: 'bar' | 'line' | 'pie' | 'scatter';
  deterministicExecutionStatement: string;
  source: 'gemini' | 'local_fallback';
  planSteps: Array<{
    stepNumber: number;
    action: string;
    target: string;
    rationale: string;
  }>;
}

export interface AnalysisResult {
  id: string;
  question: string;
  datasetName: string;
  datasetId?: string;
  timestamp: string;
  isAmbiguous?: boolean;
  clarificationMessage?: string | null;
  clarificationOptions?: string[];
  geminiPlan?: GeminiAnalysisPlan;
  analysisPlan: StructuredAnalysisPlan;
  answer: {
    headline: string;
    primaryValue?: string;
    primaryMetric?: string;
    summary: string;
    metrics: MetricBreakdown[];
  };
  chart: ChartSpecification;
  calculation: CalculationExplanation;
}

export interface SampleDatasetDefinition {
  id: string;
  name: string;
  domain: string;
  description: string;
  suggestedQuestions: string[];
  data: Record<string, any>[];
}
