import { ChartSpecification } from '../utils/businessAnalyticsEngine';
import { InferredDatasetSchema } from './dataset';

export type SupportedLanguage =
  | 'auto'
  | 'en'
  | 'ta'
  | 'tanglish'
  | 'hi'
  | 'te'
  | 'ml'
  | 'kn';

export interface LanguageMeta {
  code: SupportedLanguage;
  name: string;
  nativeName: string;
  voiceLangCode: string;
}

export const SUPPORTED_LANGUAGES: LanguageMeta[] = [
  { code: 'auto', name: 'Auto-Detect', nativeName: 'Auto Detect (தானாக)', voiceLangCode: 'en-IN' },
  { code: 'en', name: 'English', nativeName: 'English (India)', voiceLangCode: 'en-IN' },
  { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்', voiceLangCode: 'ta-IN' },
  { code: 'tanglish', name: 'Tanglish', nativeName: 'Tanglish (தமிழ்+Eng)', voiceLangCode: 'ta-IN' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', voiceLangCode: 'hi-IN' },
  { code: 'te', name: 'Telugu', nativeName: 'తెలుగు', voiceLangCode: 'te-IN' },
  { code: 'ml', name: 'Malayalam', nativeName: 'മലയാളം', voiceLangCode: 'ml-IN' },
  { code: 'kn', name: 'Kannada', nativeName: 'ಕನ್ನಡ', voiceLangCode: 'kn-IN' },
];

export interface CustomKnowledgeItem {
  id: string;
  type: 'term' | 'rule' | 'faq' | 'instruction';
  title: string;
  content: string;
  language?: SupportedLanguage;
  createdAt: string;
}

export type VoiceAssistantState =
  | 'idle'
  | 'checking_permission'
  | 'listening'
  | 'processing'
  | 'speaking'
  | 'error';

export interface VoiceDebugInfo {
  browser: string;
  speechRecognitionSupported: boolean;
  secureContext: boolean;
  microphoneApiAvailable: boolean;
  microphonePermission: 'granted' | 'prompt' | 'denied' | 'unknown';
  microphoneDeviceAvailable: boolean;
  speechSynthesisSupported: boolean;
  selectedLanguage: string;
  availableVoicesCount: number;
  selectedVoiceName: string;
  currentState: VoiceAssistantState;
  lastTranscript: string;
  lastError: string;
  inIframe: boolean;
}

export interface UserPreferences {
  preferredLanguage: SupportedLanguage;
  responseLength: 'short' | 'normal' | 'detailed'; // default: 'short'
  tone: 'casual' | 'formal';
  voiceAutoRead: boolean;
  preferredChartType: 'bar' | 'line' | 'pie';
  voiceInputEnabled: boolean;
  voiceLanguage: SupportedLanguage;
  voiceAutoSend: boolean;
  voiceMode: boolean;
}

export interface ConversationTurnState {
  currentPeriodLabel?: string;
  startDate?: string;
  endDate?: string;
  year?: number;
  month?: number;
  region?: string | null;
  category?: string | null;
  product?: string | null;
  lastMetric?: 'revenue' | 'quantity' | 'orders' | 'aov';
  lastAnswerValue?: number;
  lastAnswerLabel?: string;
  comparisonPeriodLabel?: string;
  comparisonStartDate?: string;
  comparisonEndDate?: string;
  detectedLanguage?: SupportedLanguage;
}

export interface ConversationalAction {
  type: 'details' | 'chart' | 'explain' | 'compare' | 'translate' | 'speak';
  label: string;
  queryToTrigger?: string;
}

export type QueryIntent =
  | 'aggregation'
  | 'comparison'
  | 'ranking'
  | 'grouping'
  | 'trend'
  | 'filtering'
  | 'counting'
  | 'descriptive_statistics';

export type QueryOperation =
  | 'SUM'
  | 'AVG'
  | 'COUNT'
  | 'COUNT_DISTINCT'
  | 'MIN'
  | 'MAX';

export type FilterOperator =
  | 'equals'
  | 'not_equals'
  | 'contains'
  | 'greater_than'
  | 'less_than'
  | 'greater_than_or_equal'
  | 'less_than_or_equal';

export interface QueryPlanFilter {
  field: string;
  operator: FilterOperator;
  value: string | number;
}

export interface QueryTimeRange {
  type:
    | 'today'
    | 'yesterday'
    | 'this_week'
    | 'last_week'
    | 'this_month'
    | 'last_month'
    | 'this_year'
    | 'last_year'
    | 'specific_month'
    | 'specific_year'
    | 'date_range'
    | 'all_time';
  value?: string;
  startDate?: string;
  endDate?: string;
}

export interface StructuredQueryPlan {
  intent: QueryIntent;
  metric: string;
  operation: QueryOperation;
  filters: QueryPlanFilter[];
  timeRange?: QueryTimeRange | null;
  groupBy?: string | null;
  sort?: 'asc' | 'desc' | null;
  limit?: number | null;
  chartPreference?: 'bar' | 'line' | 'pie' | null;
  comparisonTarget?: string | null;
}

export interface AnswerabilityResult {
  answerable: boolean;
  partiallyAnswerable?: boolean;
  partialDetails?: {
    availablePartAnswer?: string;
    availablePartMetric?: string;
    availablePartValue?: number;
    unanswerablePartReason?: string;
    missingPartField?: string;
  };
  reason?: string;
  question: string;
  requiredFields: string[];
  availableFields: string[];
  missingFields: string[];
  canDerive: boolean;
  derivationFormula?: string;
  emptyColumnDetected?: string;
  isAmbiguous?: boolean;
  ambiguousCandidates?: string[];
  ambiguityPrompt?: string;
}

export interface QueryValidationResult {
  isValid: boolean;
  reason?: string;
  unanswerable?: boolean;
  answerability?: AnswerabilityResult;
  isAmbiguous?: boolean;
  ambiguousCandidates?: string[];
  ambiguityPrompt?: string;
  mappedPlan?: {
    metricColumn?: string;
    groupByColumn?: string;
    dateColumn?: string;
    filters: Array<{
      column: string;
      operator: FilterOperator;
      value: string | number;
    }>;
    operation: QueryOperation;
    sort?: 'asc' | 'desc';
    limit?: number;
    timeRange?: QueryTimeRange;
    chartPreference?: 'bar' | 'line' | 'pie';
    derivedMetric?: 'profit' | 'profit_margin';
    costColumn?: string;
  };
}

export interface QueryExecutionResult {
  success: boolean;
  operation: QueryOperation;
  metricColumn?: string;
  groupBy?: string;
  filters?: Array<{ column: string; operator: string; value: any }>;
  timeFilter?: string;
  result?: number;
  formattedResult?: string;
  rows?: Array<{ group: string; value: number; formattedValue?: string; percentage?: number }>;
  comparison?: {
    groupA: { name: string; value: number; formatted: string };
    groupB: { name: string; value: number; formatted: string };
    difference: number;
    percentDiff: number;
  };
  explanationSteps: string[];
  error?: string;
}

export interface TechnicalColumnInfo {
  name: string;
  type: string;
  role?: string;
  uniqueCount?: number;
  sampleValues?: any[];
  min?: number | string;
  max?: number | string;
}

export interface TechnicalDetails {
  datasetName: string;
  totalRowsAnalyzed: number;
  totalColumnsCount: number;
  columnsUsed: TechnicalColumnInfo[];
  operationApplied: string;
  aggregationFormula?: string;
  filtersApplied?: string[];
  sampleDataPointsCount?: number;
  executionTimeMs?: number;
  modelUsed?: string;
  generationStrategy: string;
  sqlRepresentation?: string;
  aiExplanation?: string;
}

export interface AssistantMessageData {
  id: string;
  sender: 'user' | 'assistant';
  timestamp: string;
  text: string;
  language: SupportedLanguage;
  // If progressive disclosure expands to chart or details:
  hasChart?: boolean;
  chart?: ChartSpecification;
  chartAxisInfo?: {
    xAxis: string;
    yAxis: string;
    chartType: string;
  };
  calculationSteps?: string[];
  isAnalyticalResult?: boolean;
  visualizationNotice?: string;
  technicalDetails?: TechnicalDetails;
  hasDetailsTable?: boolean;
  detailsTable?: {
    title: string;
    headers: string[];
    rows: (string | number)[][];
  };
  explanation?: string;
  comparisonText?: string;
  inferredSchema?: InferredDatasetSchema;
  queryPlan?: StructuredQueryPlan;
  executionResult?: QueryExecutionResult;
  answerability?: AnswerabilityResult;
  availableActions: ConversationalAction[];
  isSpeaking?: boolean;
}
