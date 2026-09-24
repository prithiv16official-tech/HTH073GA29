import {
  ConversationTurnState,
  StructuredQueryPlan,
  QueryValidationResult,
  QueryExecutionResult,
  QueryIntent,
  QueryOperation,
  FilterOperator,
  QueryPlanFilter,
  QueryTimeRange,
  AssistantMessageData,
  SupportedLanguage,
  ConversationalAction,
} from '../types/assistant';
import { InferredDatasetSchema, DatasetSchemaProfile, SemanticRole, Dataset } from '../types/dataset';
import { formatINR } from './businessAnalyticsEngine';
import { parseNumericValue } from './schemaDetector';

/**
 * Normalizes text to assist in natural language pattern recognition across English,
 * Tamil, Tanglish, and Hindi input.
 */
function normalizeQueryText(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[?!.,;:'"()[\]{}]/g, ' ')
    .replace(/\s+/g, ' ');
}

/**
 * Helper to build real Plotly chart specification
 */
function buildChartSpecification(
  type: 'bar' | 'line' | 'pie',
  title: string,
  items: Array<{ name?: string; period?: string; group?: string; value: number }>,
  xAxisTitle: string,
  yAxisTitle: string
): any {
  const xLabels = items.map((i) => String(i.name || i.period || i.group || 'Unknown'));
  const yValues = items.map((i) => Math.round(i.value * 100) / 100);
  const formattedLabels = items.map((i) => formatINR(i.value));

  if (type === 'line') {
    return {
      type: 'line',
      title,
      data: [
        {
          x: xLabels,
          y: yValues,
          type: 'scatter',
          mode: 'lines+markers',
          line: { color: '#2563eb', width: 3 },
          marker: { size: 8, color: '#1d4ed8' },
          text: formattedLabels,
          hovertemplate: '<b>%{x}</b>: %{text}<extra></extra>',
        },
      ],
      layout: {
        title: { text: title, font: { size: 14, family: 'Plus Jakarta Sans, sans-serif' } },
        xaxis: { title: xAxisTitle, automargin: true },
        yaxis: { title: yAxisTitle, rangemode: 'tozero', automargin: true },
        margin: { l: 65, r: 25, t: 45, b: 60 },
        height: 290,
      },
    };
  }

  if (type === 'pie') {
    return {
      type: 'pie',
      title,
      data: [
        {
          labels: xLabels,
          values: yValues,
          type: 'pie',
          hole: 0.45,
          marker: {
            colors: ['#2563eb', '#0d9488', '#f59e0b', '#8b5cf6', '#ec4899', '#64748b', '#06b6d4', '#10b981'],
          },
          textinfo: 'label+percent',
          hoverinfo: 'label+value+percent',
        },
      ],
      layout: {
        title: { text: title, font: { size: 14 } },
        margin: { l: 20, r: 20, t: 40, b: 25 },
        height: 290,
      },
    };
  }

  // Default Bar Chart
  return {
    type: 'bar',
    title,
    data: [
      {
        x: xLabels,
        y: yValues,
        type: 'bar',
        marker: {
          color: '#2563eb',
          opacity: 0.88,
        },
        text: formattedLabels,
        textposition: 'auto',
        hovertemplate: '<b>%{x}</b>: %{text}<extra></extra>',
      },
    ],
    layout: {
      title: { text: title, font: { size: 14, family: 'Plus Jakarta Sans, sans-serif' } },
      xaxis: { title: xAxisTitle, automargin: true },
      yaxis: { title: yAxisTitle, rangemode: 'tozero', automargin: true },
      margin: { l: 65, r: 25, t: 45, b: 60 },
      height: 290,
    },
  };
}

/**
 * 1. NATURAL LANGUAGE QUERY PARSER
 * Converts user's natural language question into a semantic Structured Query Plan.
 * Never assumes fixed column names; uses abstract semantic concepts.
 */
export function parseNaturalLanguageToQueryPlan(
  rawQuery: string,
  prevContext: ConversationTurnState = {}
): StructuredQueryPlan {
  const q = normalizeQueryText(rawQuery);

  // 1. Detect Intent
  let intent: QueryIntent = 'aggregation';

  const isTrend =
    q.includes('trend') ||
    q.includes('monthly') ||
    q.includes('over time') ||
    q.includes('over-time') ||
    q.includes('by month') ||
    q.includes('per month') ||
    q.includes('month wise') ||
    q.includes('month-wise') ||
    q.includes('sales trend') ||
    q.includes('revenue trend');

  const isRanking =
    q.includes('highest') ||
    q.includes('top') ||
    q.includes('best') ||
    q.includes('most') ||
    q.includes('lowest') ||
    q.includes('bottom') ||
    q.includes('least') ||
    q.includes('worst') ||
    q.includes('sold the most') ||
    q.includes('which product') ||
    q.includes('adhiga') ||
    q.includes('kammi');

  const isGrouping =
    q.includes('by region') ||
    q.includes('by area') ||
    q.includes('by location') ||
    q.includes('by country') ||
    q.includes('by product') ||
    q.includes('by item') ||
    q.includes('by category') ||
    q.includes('by territory') ||
    q.includes('region-wise') ||
    q.includes('region wise') ||
    q.includes('product-wise') ||
    q.includes('product wise') ||
    q.includes('category-wise') ||
    q.includes('category wise') ||
    q.includes('item-wise') ||
    q.includes('item wise') ||
    q.includes('area-wise') ||
    q.includes('area wise') ||
    q.includes('breakdown');

  const isComparison =
    q.includes('compare') ||
    q.includes('comparison') ||
    q.includes(' vs ') ||
    q.includes('versus') ||
    q.includes('difference between') ||
    q.includes('which is higher') ||
    q.includes('which is more') ||
    q.includes('oppidu');

  const isCounting =
    q.includes('how many') ||
    q.includes('count of') ||
    q.includes('number of') ||
    q.includes('ethana') ||
    q.includes('kitne') ||
    q.includes('total orders') ||
    q.includes('total customers');

  if (isComparison) {
    intent = 'comparison';
  } else if (isTrend) {
    intent = 'trend';
  } else if (isRanking) {
    intent = 'ranking';
  } else if (isGrouping) {
    intent = 'grouping';
  } else if (isCounting) {
    intent = 'counting';
  }

  // 2. Detect Operation
  let operation: QueryOperation = 'SUM';

  if (q.includes('average') || q.includes('avg') || q.includes('mean') || q.includes('saradari')) {
    operation = 'AVG';
  } else if (q.includes('unique') || q.includes('distinct') || q.includes('count distinct')) {
    operation = 'COUNT_DISTINCT';
  } else if (isCounting || q.includes('count') || q.includes('how many') || q.includes('number of')) {
    operation = 'COUNT';
  } else if (q.includes('maximum') || q.includes('highest sale') || q.includes('max sale') || q.includes('peak sale') || (q.includes('highest') && !isRanking && !isGrouping)) {
    operation = 'MAX';
  } else if (q.includes('minimum') || q.includes('lowest sale') || q.includes('min sale') || q.includes('least sale') || (q.includes('lowest') && !isRanking && !isGrouping)) {
    operation = 'MIN';
  }

  // 3. Detect Metric
  let metric = 'sales';

  if (q.includes('profit') || q.includes('margin') || q.includes('laabham')) {
    metric = 'profit';
  } else if (q.includes('cost') || q.includes('expense') || q.includes('spending')) {
    metric = 'cost';
  } else if (q.includes('quantity') || q.includes('units') || q.includes('volume') || q.includes('qty')) {
    metric = 'quantity';
  } else if (q.includes('order') || q.includes('orders') || q.includes('transactions')) {
    metric = 'orders';
    if (!q.includes('sales') && !q.includes('revenue') && !q.includes('amount')) {
      operation = 'COUNT';
    }
  } else if (q.includes('customer') || q.includes('customers') || q.includes('users') || q.includes('buyers')) {
    metric = 'customers';
    if (!q.includes('sales') && !q.includes('revenue')) {
      operation = q.includes('unique') || q.includes('distinct') ? 'COUNT_DISTINCT' : 'COUNT';
    }
  } else if (q.includes('rating') || q.includes('score') || q.includes('review')) {
    metric = 'rating';
    operation = 'AVG';
  } else if (
    q.includes('sales') ||
    q.includes('revenue') ||
    q.includes('amount') ||
    q.includes('turnover') ||
    q.includes('billing') ||
    q.includes('evlo') ||
    q.includes('evalavu') ||
    q.includes('how much')
  ) {
    metric = 'sales';
  } else if (prevContext.lastMetric) {
    // Inherit metric from conversational memory
    metric = prevContext.lastMetric;
  }

  // 4. Detect Time Range
  let timeRange: QueryTimeRange | null = null;

  if (q.includes('today')) {
    timeRange = { type: 'today' };
  } else if (q.includes('yesterday')) {
    timeRange = { type: 'yesterday' };
  } else if (q.includes('this week') || q.includes('intha vaaram')) {
    timeRange = { type: 'this_week' };
  } else if (q.includes('last week') || q.includes('pona vaaram')) {
    timeRange = { type: 'last_week' };
  } else if (q.includes('this month') || q.includes('intha maasam') || q.includes('is mahine')) {
    timeRange = { type: 'this_month' };
  } else if (q.includes('last month') || q.includes('pona maasam') || q.includes('pichle mahine') || q.includes('previous month')) {
    timeRange = { type: 'last_month' };
  } else if (q.includes('this year') || q.includes('intha varusham')) {
    timeRange = { type: 'this_year' };
  } else if (q.includes('last year') || q.includes('pona varusham')) {
    timeRange = { type: 'last_year' };
  } else if (q.includes('july')) {
    timeRange = { type: 'specific_month', value: 'July' };
  } else if (q.includes('august')) {
    timeRange = { type: 'specific_month', value: 'August' };
  } else if (q.includes('september')) {
    timeRange = { type: 'specific_month', value: 'September' };
  } else if (q.includes('2026')) {
    timeRange = { type: 'specific_year', value: '2026' };
  } else if (q.includes('2025')) {
    timeRange = { type: 'specific_year', value: '2025' };
  } else if (q.includes('2024')) {
    timeRange = { type: 'specific_year', value: '2024' };
  } else if (prevContext.currentPeriodLabel && (q.startsWith('what about') || q.startsWith('how about') || q.length < 25)) {
    // Inherit time range from multi-turn follow-up question
    if (prevContext.currentPeriodLabel.toLowerCase().includes('last month')) {
      timeRange = { type: 'last_month' };
    } else if (prevContext.currentPeriodLabel.toLowerCase().includes('this month')) {
      timeRange = { type: 'this_month' };
    }
  }

  // 5. Detect Filters
  const filters: QueryPlanFilter[] = [];

  // Regional filters
  const knownRegions = [
    { name: 'South', triggers: ['south', 'தெற்கு', 'dakshin', 'south region'] },
    { name: 'North', triggers: ['north', 'வடக்கு', 'uttar', 'north region'] },
    { name: 'East', triggers: ['east', 'கிழக்கு', 'poorv', 'east region'] },
    { name: 'West', triggers: ['west', 'மேற்கு', 'paschim', 'west region'] },
    { name: 'Central', triggers: ['central'] },
    { name: 'Chennai', triggers: ['chennai'] },
    { name: 'Bangalore', triggers: ['bangalore', 'bengaluru'] },
    { name: 'Mumbai', triggers: ['mumbai', 'bombay'] },
    { name: 'Delhi', triggers: ['delhi'] },
  ];

  for (const reg of knownRegions) {
    if (reg.triggers.some((t) => q.includes(t))) {
      filters.push({
        field: 'region',
        operator: 'equals',
        value: reg.name,
      });
      break;
    }
  }

  // Follow-up context for region
  if (filters.length === 0 && prevContext.region && (q.startsWith('what about') || q.length < 25 || isRanking)) {
    // Inherit region from previous turn if not overriding with another region
    if (!knownRegions.some((r) => r.triggers.some((t) => q.includes(t)))) {
      filters.push({
        field: 'region',
        operator: 'equals',
        value: prevContext.region,
      });
    }
  }

  // Product keyword filters
  const knownProductKeywords = [
    'laptop',
    'mobile',
    'tablet',
    'accessories',
    'audio',
    'desktop',
    'keyboard',
    'mouse',
    'monitor',
    'phone',
    'chair',
    'desk',
    'headphone',
  ];

  for (const prod of knownProductKeywords) {
    if (q.includes(prod)) {
      filters.push({
        field: 'product',
        operator: 'contains',
        value: prod,
      });
      break;
    }
  }

  // Numeric threshold filters (e.g. "sales above 50000", "sales below 20000", "sales > 50000")
  const aboveMatch = q.match(/(?:above|greater than|>|exceeding)\s+(\d+(?:,\d+)*(?:\.\d+)?|\d+k)/i);
  if (aboveMatch) {
    let valStr = aboveMatch[1].replace(/,/g, '');
    let numVal = valStr.toLowerCase().endsWith('k')
      ? parseFloat(valStr) * 1000
      : parseFloat(valStr);
    if (!isNaN(numVal)) {
      filters.push({
        field: metric,
        operator: 'greater_than',
        value: numVal,
      });
    }
  }

  const belowMatch = q.match(/(?:below|less than|<|under)\s+(\d+(?:,\d+)*(?:\.\d+)?|\d+k)/i);
  if (belowMatch) {
    let valStr = belowMatch[1].replace(/,/g, '');
    let numVal = valStr.toLowerCase().endsWith('k')
      ? parseFloat(valStr) * 1000
      : parseFloat(valStr);
    if (!isNaN(numVal)) {
      filters.push({
        field: metric,
        operator: 'less_than',
        value: numVal,
      });
    }
  }

  // 6. Detect GroupBy
  let groupBy: string | null = null;

  if (isTrend || q.includes('by month') || q.includes('monthly') || q.includes('over time')) {
    groupBy = 'date';
  } else if (
    q.includes('by region') ||
    q.includes('by area') ||
    q.includes('by location') ||
    q.includes('by country') ||
    q.includes('region-wise') ||
    q.includes('region wise') ||
    q.includes('area-wise') ||
    q.includes('area wise')
  ) {
    groupBy = 'region';
  } else if (
    q.includes('by category') ||
    q.includes('category-wise') ||
    q.includes('category wise') ||
    q.includes('compare sales by category')
  ) {
    groupBy = 'category';
  } else if (
    q.includes('by product') ||
    q.includes('by item') ||
    q.includes('product-wise') ||
    q.includes('product wise') ||
    q.includes('item-wise') ||
    q.includes('item wise') ||
    isRanking
  ) {
    groupBy = 'product';
  }

  // 7. Detect Sort & Limit
  let sort: 'asc' | 'desc' | null = null;
  let limit: number | null = null;

  if (isRanking) {
    const isLowest = q.includes('lowest') || q.includes('bottom') || q.includes('least') || q.includes('worst');
    sort = isLowest ? 'asc' : 'desc';

    const limitMatch = q.match(/(?:top|bottom|first|last)\s+(\d+)/i);
    if (limitMatch) {
      limit = parseInt(limitMatch[1], 10);
    } else if (q.includes('highest') || q.includes('which product') || q.includes('sold the most') || q.includes('best seller')) {
      limit = 1;
    } else {
      limit = 5;
    }
  } else if (isGrouping) {
    sort = 'desc';
  }

  // 8. Detect Chart Preference
  let chartPreference: 'bar' | 'line' | 'pie' | null = null;
  if (q.includes('bar chart') || q.includes('bar graph')) {
    chartPreference = 'bar';
  } else if (q.includes('line chart') || q.includes('line graph') || q.includes('trend chart')) {
    chartPreference = 'line';
  } else if (q.includes('pie chart') || q.includes('donut chart') || q.includes('share chart')) {
    chartPreference = 'pie';
  } else if (isTrend) {
    chartPreference = 'line';
  } else if (isGrouping || (isRanking && (limit === null || limit > 1))) {
    chartPreference = 'bar';
  }

  return {
    intent,
    metric,
    operation,
    filters,
    timeRange,
    groupBy,
    sort,
    limit,
    chartPreference,
  };
}

/**
 * Helper to build comprehensive roleMap and column lookup
 */
function extractSchemaHelpers(schema: InferredDatasetSchema | DatasetSchemaProfile | any) {
  const roleMap: Partial<Record<SemanticRole, string[]>> = { ...(schema.roleMap || {}) };
  const allColumnNames: string[] = [];

  if (schema.columns && Array.isArray(schema.columns)) {
    for (const c of schema.columns) {
      const role = c.semanticRole || c.role;
      const name = c.originalName || c.name || c.columnName;
      if (name) {
        allColumnNames.push(name);
        if (role) {
          if (!roleMap[role as SemanticRole]) roleMap[role as SemanticRole] = [];
          if (!roleMap[role as SemanticRole]!.includes(name)) {
            roleMap[role as SemanticRole]!.push(name);
          }
        }
      }
    }
  }

  const findColByName = (candidates: string[]): string | undefined => {
    for (const cand of candidates) {
      const found = allColumnNames.find((col) => col.toLowerCase().includes(cand.toLowerCase()));
      if (found) return found;
    }
    return undefined;
  };

  return { roleMap, allColumnNames, findColByName };
}

/**
 * 2. SCHEMA MAPPING & VALIDATION
 * Validates whether the semantic query plan can be executed on the inferred schema.
 * Rejects unanswerable queries (e.g. asking profit when no profit/cost fields exist)
 * and detects ambiguous columns (e.g. Gross_Sales vs Net_Sales).
 */
export function validateQueryPlan(
  plan: StructuredQueryPlan,
  schema: InferredDatasetSchema | DatasetSchemaProfile | any
): QueryValidationResult {
  const { roleMap, allColumnNames, findColByName } = extractSchemaHelpers(schema);

  // A. Check for Ambiguity (Requirement 13)
  // If multiple distinct columns match the requested metric without clarification
  const salesCandidates = [
    ...(roleMap['sales_revenue'] || []),
    ...(roleMap['sales'] || []),
    ...(roleMap['revenue'] || []),
  ];

  const uniqueSalesCols = Array.from(new Set(salesCandidates));
  if (plan.metric === 'sales' && uniqueSalesCols.length > 1) {
    const hasGross = uniqueSalesCols.some((c) => c.toLowerCase().includes('gross'));
    const hasNet = uniqueSalesCols.some((c) => c.toLowerCase().includes('net'));
    if (hasGross && hasNet) {
      return {
        isValid: false,
        isAmbiguous: true,
        ambiguousCandidates: uniqueSalesCols,
        ambiguityPrompt: `Which sales measure do you mean: ${uniqueSalesCols.join(' or ')}?`,
      };
    }
  }

  // B. Check for Unanswerable Queries (Requirement 5 & 14)
  // If user requests profit, but neither profit nor (both sales AND cost) exist
  if (plan.metric === 'profit') {
    const hasProfit = (roleMap['profit'] && roleMap['profit']!.length > 0) || findColByName(['profit', 'margin', 'net_profit']);
    const hasSales = (roleMap['sales'] && roleMap['sales']!.length > 0) || (roleMap['revenue'] && roleMap['revenue']!.length > 0) || (roleMap['sales_revenue'] && roleMap['sales_revenue']!.length > 0) || findColByName(['sales', 'revenue', 'total_amount']);
    const hasCost = (roleMap['cost'] && roleMap['cost']!.length > 0) || findColByName(['cost', 'expense', 'unit_cost']);

    if (!hasProfit && (!hasSales || !hasCost)) {
      return {
        isValid: false,
        unanswerable: true,
        reason:
          'I cannot calculate profit because the uploaded dataset does not contain a profit field or the cost and sales information required to derive profit.',
      };
    }
  }

  // If user requests cost, but no cost column exists
  if (plan.metric === 'cost') {
    const hasCost = (roleMap['cost'] && roleMap['cost']!.length > 0) || findColByName(['cost', 'expense']);
    if (!hasCost) {
      return {
        isValid: false,
        unanswerable: true,
        reason:
          'I cannot calculate cost because the uploaded dataset does not contain a cost or expense field.',
      };
    }
  }

  // If user requests customer statistics, but no customer column exists
  if (plan.metric === 'customers') {
    const hasCustomer = (roleMap['customer_id'] && roleMap['customer_id']!.length > 0) ||
      (roleMap['customer'] && roleMap['customer']!.length > 0) ||
      findColByName(['customer', 'buyer', 'client', 'user']);
    if (!hasCustomer) {
      return {
        isValid: false,
        unanswerable: true,
        reason:
          'I cannot calculate customer information because the uploaded dataset does not contain customer or client data.',
      };
    }
  }

  // C. Map Metric Column
  let metricColumn: string | undefined;
  if (plan.metric === 'profit') {
    metricColumn = roleMap['profit']?.[0] || findColByName(['profit', 'margin']);
  } else if (plan.metric === 'cost') {
    metricColumn = roleMap['cost']?.[0] || findColByName(['cost', 'expense']);
  } else if (plan.metric === 'quantity') {
    metricColumn = roleMap['quantity']?.[0] || findColByName(['units', 'qty', 'quantity', 'units_sold']);
  } else if (plan.metric === 'rating') {
    metricColumn = roleMap['rating']?.[0] || findColByName(['rating', 'score']);
  } else if (plan.metric === 'customers') {
    metricColumn = roleMap['customer_id']?.[0] || roleMap['customer']?.[0] || findColByName(['customer_id', 'customer', 'user_id']);
  } else if (plan.metric === 'orders') {
    metricColumn = roleMap['order_id']?.[0] || findColByName(['order_id', 'order', 'transaction_id']);
  } else {
    // Sales / Revenue default
    metricColumn =
      roleMap['sales_revenue']?.[0] ||
      roleMap['sales']?.[0] ||
      roleMap['revenue']?.[0] ||
      roleMap['quantity']?.[0] ||
      roleMap['other_numeric']?.[0] ||
      findColByName(['total_amount', 'sales', 'revenue', 'net_revenue', 'amount', 'turnover']);
  }

  if (!metricColumn && plan.operation !== 'COUNT') {
    return {
      isValid: false,
      unanswerable: true,
      reason: `Could not identify a numeric column in the dataset to calculate ${plan.metric}.`,
    };
  }

  // D. Map GroupBy Column
  let groupByColumn: string | undefined;
  if (plan.groupBy === 'region') {
    groupByColumn = roleMap['region']?.[0] || roleMap['location']?.[0] || findColByName(['region', 'area', 'location', 'country', 'city', 'customer_area']);
  } else if (plan.groupBy === 'product') {
    groupByColumn = roleMap['product']?.[0] || roleMap['product_id']?.[0] || roleMap['category']?.[0] || findColByName(['product', 'item', 'item_name', 'sku', 'product_name']);
  } else if (plan.groupBy === 'category') {
    groupByColumn = roleMap['category']?.[0] || roleMap['product']?.[0] || findColByName(['category', 'category_type', 'department', 'type']);
  } else if (plan.groupBy === 'date') {
    groupByColumn = roleMap['date']?.[0] || roleMap['timestamp']?.[0] || roleMap['time']?.[0] || findColByName(['date', 'order_date', 'purchase_date', 'created_at', 'transaction_date']);
  }

  if (plan.groupBy && !groupByColumn) {
    return {
      isValid: false,
      unanswerable: true,
      reason: `The dataset does not contain a column representing '${plan.groupBy}' to group by.`,
    };
  }

  // E. Map Date Column
  const dateColumn =
    roleMap['date']?.[0] ||
    roleMap['timestamp']?.[0] ||
    roleMap['time']?.[0] ||
    findColByName(['date', 'order_date', 'purchase_date', 'created_at', 'transaction_date']);

  if (plan.timeRange && plan.timeRange.type !== 'all_time' && !dateColumn) {
    return {
      isValid: false,
      unanswerable: true,
      reason: 'The dataset does not contain a date column to apply the requested time filter.',
    };
  }

  // F. Map Filter Columns
  const mappedFilters: Array<{ column: string; operator: FilterOperator; value: string | number }> = [];
  for (const f of plan.filters) {
    let colName: string | undefined;
    if (f.field === 'region') {
      colName = roleMap['region']?.[0] || roleMap['location']?.[0] || findColByName(['region', 'area', 'location', 'country', 'city', 'customer_area']);
    } else if (f.field === 'product') {
      colName = roleMap['product']?.[0] || roleMap['product_id']?.[0] || roleMap['category']?.[0] || findColByName(['product', 'item', 'item_name', 'sku']);
    } else if (f.field === 'category') {
      colName = roleMap['category']?.[0] || findColByName(['category', 'category_type']);
    } else if (f.field === 'sales' || f.field === plan.metric) {
      colName = metricColumn;
    }

    if (colName) {
      mappedFilters.push({
        column: colName,
        operator: f.operator,
        value: f.value,
      });
    }
  }

  return {
    isValid: true,
    mappedPlan: {
      metricColumn,
      groupByColumn,
      dateColumn,
      filters: mappedFilters,
      operation: plan.operation,
      sort: plan.sort || undefined,
      limit: plan.limit || undefined,
      timeRange: plan.timeRange || undefined,
      chartPreference: plan.chartPreference || undefined,
    },
  };
}

/**
 * 3. ACTUAL QUERY EXECUTOR
 * Executes the validated plan strictly against the actual dataset rows.
 * Deterministic, no LLM hallucinations or dummy values.
 */
export function executeQueryPlan(
  validation: QueryValidationResult,
  datasetRows: Record<string, any>[]
): QueryExecutionResult {
  if (!validation.isValid || !validation.mappedPlan) {
    return {
      success: false,
      operation: 'SUM',
      explanationSteps: [validation.reason || 'Query plan validation failed.'],
      error: validation.reason,
    };
  }

  const { metricColumn, groupByColumn, dateColumn, filters, operation, sort, limit, timeRange } =
    validation.mappedPlan;

  const explanationSteps: string[] = [];

  // Step 1: Metric identification
  if (metricColumn) {
    explanationSteps.push(`Mapped metric to column '${metricColumn}' using inferred schema.`);
  }

  let filteredRows = [...datasetRows];

  // Step 2: Date Filtering (Requirement 8)
  let timeFilterLabel = 'All Time';
  if (timeRange && dateColumn && filteredRows.length > 0) {
    const dates = filteredRows
      .map((r) => new Date(r[dateColumn]))
      .filter((d) => !isNaN(d.getTime()))
      .sort((a, b) => a.getTime() - b.getTime());

    if (dates.length > 0) {
      // Find calendar boundaries dynamically relative to the latest date in the dataset
      const latestDate = dates[dates.length - 1];
      const targetYear = latestDate.getFullYear();
      let startBoundary: Date | null = null;
      let endBoundary: Date | null = null;

      if (timeRange.type === 'last_month') {
        const targetMonth = latestDate.getMonth() - 1;
        startBoundary = new Date(targetYear, targetMonth, 1);
        endBoundary = new Date(targetYear, targetMonth + 1, 0, 23, 59, 59);
        timeFilterLabel = startBoundary.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      } else if (timeRange.type === 'this_month') {
        const targetMonth = latestDate.getMonth();
        startBoundary = new Date(targetYear, targetMonth, 1);
        endBoundary = new Date(targetYear, targetMonth + 1, 0, 23, 59, 59);
        timeFilterLabel = startBoundary.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      } else if (timeRange.type === 'specific_month' && timeRange.value) {
        startBoundary = new Date(`${timeRange.value} 1, ${targetYear}`);
        endBoundary = new Date(targetYear, startBoundary.getMonth() + 1, 0, 23, 59, 59);
        timeFilterLabel = timeRange.value;
      } else if (timeRange.type === 'last_year') {
        startBoundary = new Date(targetYear - 1, 0, 1);
        endBoundary = new Date(targetYear - 1, 11, 31, 23, 59, 59);
        timeFilterLabel = `${targetYear - 1}`;
      } else if (timeRange.type === 'this_year') {
        startBoundary = new Date(targetYear, 0, 1);
        endBoundary = new Date(targetYear, 11, 31, 23, 59, 59);
        timeFilterLabel = `${targetYear}`;
      }

      if (startBoundary && endBoundary) {
        const prevCount = filteredRows.length;
        const matchingRows = filteredRows.filter((r) => {
          const d = new Date(r[dateColumn]);
          return !isNaN(d.getTime()) && d >= startBoundary! && d <= endBoundary!;
        });

        // If dataset has rows within that window, filter to them
        if (matchingRows.length > 0) {
          filteredRows = matchingRows;
          explanationSteps.push(
            `Filtered rows by '${dateColumn}' for ${timeFilterLabel} (${filteredRows.length} matching rows out of ${prevCount}).`
          );
        } else {
          explanationSteps.push(
            `Evaluated date window for ${timeFilterLabel} relative to latest date (${latestDate.toLocaleDateString()}). No rows fell strictly within window, using full dataset scope.`
          );
        }
      }
    }
  }

  // Step 3: Attribute Filters (Requirement 7)
  for (const f of filters) {
    const countBefore = filteredRows.length;
    filteredRows = filteredRows.filter((r) => {
      const val = r[f.column];
      if (val === null || val === undefined) return false;

      if (f.operator === 'equals') {
        return String(val).toLowerCase() === String(f.value).toLowerCase();
      }
      if (f.operator === 'not_equals') {
        return String(val).toLowerCase() !== String(f.value).toLowerCase();
      }
      if (f.operator === 'contains') {
        return String(val).toLowerCase().includes(String(f.value).toLowerCase());
      }

      const numA = parseNumericValue(val) ?? 0;
      const numB = typeof f.value === 'number' ? f.value : parseFloat(String(f.value)) || 0;

      if (f.operator === 'greater_than') return numA > numB;
      if (f.operator === 'less_than') return numA < numB;
      if (f.operator === 'greater_than_or_equal') return numA >= numB;
      if (f.operator === 'less_than_or_equal') return numA <= numB;
      return true;
    });

    explanationSteps.push(
      `Applied filter ${f.column} ${f.operator} '${f.value}' (${filteredRows.length} rows remaining out of ${countBefore}).`
    );
  }

  // Helper to compute aggregation on numeric array or distinct strings
  const aggregate = (nums: number[], op: QueryOperation): number => {
    if (nums.length === 0) return 0;
    if (op === 'COUNT') return nums.length;
    if (op === 'COUNT_DISTINCT') return new Set(nums).size;
    if (op === 'AVG') return nums.reduce((s, n) => s + n, 0) / nums.length;
    if (op === 'MIN') {
      let m = nums[0];
      for (let i = 1; i < nums.length; i++) if (nums[i] < m) m = nums[i];
      return m;
    }
    if (op === 'MAX') {
      let m = nums[0];
      for (let i = 1; i < nums.length; i++) if (nums[i] > m) m = nums[i];
      return m;
    }
    // default SUM
    return nums.reduce((s, n) => s + n, 0);
  };

  // Step 4: Grouped Query Execution (Requirement 9 & 10)
  if (groupByColumn) {
    explanationSteps.push(`Grouped remaining rows by '${groupByColumn}'.`);

    const groupMap = new Map<string, number[]>();
    for (const r of filteredRows) {
      const groupVal = String(r[groupByColumn] || 'Unknown');
      const val = metricColumn ? parseNumericValue(r[metricColumn]) ?? 0 : 1;
      const ex = groupMap.get(groupVal) || [];
      ex.push(val);
      groupMap.set(groupVal, ex);
    }

    let rows = Array.from(groupMap.entries()).map(([group, valArray]) => {
      const computed = aggregate(valArray, operation);
      return {
        group,
        value: Math.round(computed * 100) / 100,
        formattedValue: formatINR(computed),
      };
    });

    // Sorting
    if (sort === 'asc') {
      rows.sort((a, b) => a.value - b.value);
    } else {
      rows.sort((a, b) => b.value - a.value);
    }

    // Limit
    if (limit && limit > 0) {
      rows = rows.slice(0, limit);
    }

    explanationSteps.push(
      `Calculated ${operation} of '${metricColumn || 'rows'}' for each '${groupByColumn}' and ordered ${sort || 'desc'}.`
    );

    return {
      success: true,
      operation,
      metricColumn,
      groupBy: groupByColumn,
      filters,
      timeFilter: timeFilterLabel,
      rows,
      explanationSteps,
    };
  }

  // Step 5: Scalar Aggregation Query Execution
  let rawResult = 0;
  if (operation === 'COUNT_DISTINCT' && metricColumn) {
    const distinctSet = new Set(
      filteredRows
        .map((r) => String(r[metricColumn] ?? '').trim())
        .filter((v) => v !== '' && v !== 'null' && v !== 'undefined')
    );
    rawResult = distinctSet.size;
  } else {
    const numbers = filteredRows.map((r) => (metricColumn ? parseNumericValue(r[metricColumn]) ?? 0 : 1));
    rawResult = aggregate(numbers, operation);
  }

  const roundedResult = Math.round(rawResult * 100) / 100;
  const formatted =
    operation === 'COUNT' || operation === 'COUNT_DISTINCT'
      ? roundedResult.toLocaleString()
      : formatINR(roundedResult);

  explanationSteps.push(
    `Calculated ${operation} across all ${filteredRows.length} matching rows.`
  );
  explanationSteps.push(`Final result: ${formatted}.`);

  return {
    success: true,
    operation,
    metricColumn,
    filters,
    timeFilter: timeFilterLabel,
    result: roundedResult,
    formattedResult: formatted,
    explanationSteps,
  };
}

/**
 * 4. FULL NATURAL LANGUAGE ANALYSIS PIPELINE
 * USER QUESTION → PARSER → QUERY PLAN → SCHEMA MAPPING → VALIDATION → EXECUTOR → ACTUAL RESULT → ANSWER + CHART + EXPLANATION
 */
export function processNaturalLanguageAnalysis(
  rawQuery: string,
  dataset: Dataset,
  prevTurnState: ConversationTurnState = {},
  activeLang: SupportedLanguage = 'en'
): { message: AssistantMessageData; updatedState: ConversationTurnState } {
  const schema = dataset.inferredSchema || dataset.schema?.inferredSchema || dataset.schemaProfile || { roleMap: {} };
  const rawRows = dataset.rawData || [];

  // Step 1: Parse Natural Language to Structured Query Plan
  const plan = parseNaturalLanguageToQueryPlan(rawQuery, prevTurnState);

  // Step 2: Validate against Inferred Schema
  const validation = validateQueryPlan(plan, schema);

  const nextState: ConversationTurnState = {
    ...prevTurnState,
    detectedLanguage: activeLang,
  };

  const defaultActions: ConversationalAction[] = [
    { type: 'details', label: 'Details', queryToTrigger: 'Show details' },
    { type: 'chart', label: 'Chart', queryToTrigger: 'Make a bar chart' },
    { type: 'speak', label: 'Read Aloud 🔊' },
  ];

  // If Query is Ambiguous (Requirement 13)
  if (validation.isAmbiguous) {
    return {
      message: {
        id: `asst-${Date.now()}`,
        sender: 'assistant',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        text: validation.ambiguityPrompt || 'The requested query maps to multiple columns. Which one would you prefer?',
        language: activeLang,
        queryPlan: plan,
        availableActions: [
          ...(validation.ambiguousCandidates || []).map((col) => ({
            type: 'details' as const,
            label: `Use ${col}`,
            queryToTrigger: `Show ${col}`,
          })),
          { type: 'speak' as const, label: 'Read Aloud 🔊' },
        ],
      },
      updatedState: nextState,
    };
  }

  // If Query is Unanswerable (Requirement 14)
  if (!validation.isValid && validation.unanswerable) {
    return {
      message: {
        id: `asst-${Date.now()}`,
        sender: 'assistant',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        text: validation.reason || 'I cannot answer this query based on the uploaded dataset.',
        language: activeLang,
        queryPlan: plan,
        availableActions: [
          { type: 'explain', label: 'How did you understand my data?', queryToTrigger: 'How did you understand my data?' },
          { type: 'speak', label: 'Read Aloud 🔊' },
        ],
      },
      updatedState: nextState,
    };
  }

  // Step 3: Execute Query Deterministically on Actual Dataset
  const execResult = executeQueryPlan(validation, rawRows);

  if (!execResult.success) {
    return {
      message: {
        id: `asst-${Date.now()}`,
        sender: 'assistant',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        text: execResult.error || 'Query execution encountered an issue with dataset rows.',
        language: activeLang,
        queryPlan: plan,
        executionResult: execResult,
        calculationSteps: execResult.explanationSteps,
        availableActions: defaultActions,
      },
      updatedState: nextState,
    };
  }

  // Track conversational memory state
  if (execResult.result !== undefined) {
    nextState.lastAnswerValue = execResult.result;
  }
  if (plan.filters.some((f) => f.field === 'region')) {
    nextState.region = String(plan.filters.find((f) => f.field === 'region')?.value);
  }
  if (plan.filters.some((f) => f.field === 'product')) {
    nextState.product = String(plan.filters.find((f) => f.field === 'product')?.value);
  }
  if (plan.timeRange) {
    nextState.currentPeriodLabel = execResult.timeFilter || plan.timeRange.type;
  }
  if (plan.metric) {
    nextState.lastMetric = plan.metric as any;
  }

  // Step 4: Format Answer, Real Chart, and Calculation Steps
  let answerText = '';
  let hasChart = false;
  let chartSpec: any = null;
  let chartAxisInfo: { xAxis: string; yAxis: string; chartType: string } | undefined = undefined;

  // CASE A: Grouped / Ranked rows (Bar or Line Chart)
  if (execResult.rows && execResult.rows.length > 0) {
    const isSingleRank = plan.limit === 1 && plan.intent === 'ranking';

    if (isSingleRank) {
      // E.g. "Which product sold the most?"
      const topRow = execResult.rows[0];
      answerText = `${topRow.group} generated the highest sales (${topRow.formattedValue || formatINR(topRow.value)}).`;
      nextState.product = topRow.group;
    } else {
      // Grouping breakdown (e.g. "Show sales by region", "revenue by product", "Compare sales by category")
      answerText = execResult.rows
        .map((r) => `${r.group}: ${r.formattedValue || formatINR(r.value)}`)
        .join('\n');

      const chartType = plan.chartPreference || (plan.intent === 'trend' ? 'line' : 'bar');
      const xAxisCol = execResult.groupBy || 'Dimension';
      const yAxisCol = execResult.metricColumn || 'Metric';

      chartSpec = buildChartSpecification(
        chartType,
        `${yAxisCol} by ${xAxisCol}`,
        execResult.rows.map((r) => ({ name: r.group, value: r.value })),
        xAxisCol,
        yAxisCol
      );

      hasChart = true;
      chartAxisInfo = {
        xAxis: xAxisCol,
        yAxis: yAxisCol,
        chartType: chartType === 'line' ? 'Line Chart' : chartType === 'pie' ? 'Pie Chart' : 'Bar Chart',
      };
    }
  } else {
    // CASE B: Scalar Aggregation (e.g. "last month south region sales evlo?", "What is the average sales?", "How many orders?")
    const op = execResult.operation;
    const metricCol = execResult.metricColumn || 'Metric';
    const formattedVal = execResult.formattedResult || '0';

    const filterDescriptions: string[] = [];
    if (execResult.timeFilter && execResult.timeFilter !== 'All Time') {
      filterDescriptions.push(`for ${execResult.timeFilter}`);
    }
    for (const f of execResult.filters || []) {
      filterDescriptions.push(`in ${f.column} = '${f.value}'`);
    }
    const filterContext = filterDescriptions.length > 0 ? ` (${filterDescriptions.join(', ')})` : '';

    if (op === 'COUNT') {
      answerText = `There are ${formattedVal} total matching records${filterContext}.`;
    } else if (op === 'COUNT_DISTINCT') {
      answerText = `There are ${formattedVal} unique ${plan.metric}${filterContext}.`;
    } else if (op === 'AVG') {
      answerText = `The average ${plan.metric} is ${formattedVal}${filterContext}.`;
    } else if (op === 'MAX') {
      answerText = `The highest recorded ${plan.metric} is ${formattedVal}${filterContext}.`;
    } else if (op === 'MIN') {
      answerText = `The lowest recorded ${plan.metric} is ${formattedVal}${filterContext}.`;
    } else {
      // Default SUM
      if (activeLang === 'ta') {
        answerText = `மொத்த ${plan.metric} ${formattedVal} ஆகும்${filterContext}.`;
      } else if (activeLang === 'tanglish') {
        answerText = `Total ${plan.metric} vandhu ${formattedVal} da${filterContext}.`;
      } else if (activeLang === 'hi') {
        answerText = `कुल ${plan.metric} ${formattedVal} रहा${filterContext}।`;
      } else {
        answerText = `Total ${plan.metric} was ${formattedVal}${filterContext}.`;
      }
    }
  }

  return {
    message: {
      id: `asst-${Date.now()}`,
      sender: 'assistant',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      text: answerText,
      language: activeLang,
      hasChart,
      chart: chartSpec,
      chartAxisInfo,
      calculationSteps: execResult.explanationSteps,
      isAnalyticalResult: true,
      queryPlan: plan,
      executionResult: execResult,
      visualizationNotice: !hasChart
        ? 'Ask a question or request a chart (e.g., compare any columns, show histogram distribution, or plot trends) to generate an AI visualization.'
        : undefined,
      availableActions: defaultActions,
    },
    updatedState: nextState,
  };
}

