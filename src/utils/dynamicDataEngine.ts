import { Dataset, ColumnMeta, DatasetSchemaProfile, SemanticRole } from '../types/dataset';
import { getBusinessDataset, TransactionRecord } from '../data/businessData';
import { formatINR, resolveTimePeriod } from './businessAnalyticsEngine';
import { buildDatasetSchemaProfile } from './schemaInferenceEngine';
import { parseNumericValue } from './schemaDetector';

/**
 * Query result data structure for dynamic data execution
 */
export interface DynamicQueryResult {
  totalMetric: number;
  formattedMetric: string;
  metricLabel: string;
  rowCount: number;
  filteredRows: Record<string, any>[];
  topItems: Array<{ name: string; value: number; sharePct: number; quantity?: number }>;
  regionItems: Array<{ name: string; value: number; sharePct: number }>;
  categoryItems?: Array<{ name: string; value: number; sharePct: number }>;
  timeItems?: Array<{ period: string; value: number }>;
  periodLabel: string;
  comparison?: {
    prevMetric: number;
    prevPeriodLabel: string;
    changePct: number;
    formattedPrevMetric: string;
  };
  // Advanced Schema-Agnostic metadata
  resolvedProductColumn?: string;
  resolvedMetricColumn?: string;
  resolvedDateColumn?: string;
  resolvedRegionColumn?: string;
  resolvedCategoryColumn?: string;
  isAmbiguous?: boolean;
  ambiguityClarification?: string;
  missingRequestedMetric?: string;
  schemaExplanation?: string;
}

/**
 * Helper to ensure a dataset has a valid schema profile
 */
export function ensureDatasetSchemaProfile(dataset: Dataset): DatasetSchemaProfile {
  if (dataset.schemaProfile) {
    return dataset.schemaProfile;
  }
  const orderedKeys = dataset.columns.map((c) => c.name);
  const typeMap: Record<string, any> = {};
  for (const c of dataset.columns) {
    typeMap[c.name] = c.type;
  }
  const profile = buildDatasetSchemaProfile(
    dataset.name,
    dataset.rawData,
    orderedKeys,
    typeMap
  );
  dataset.schemaProfile = profile;
  return profile;
}

/**
 * Executes calculation on the provided dataset (or verified built-in dataset if none provided).
 * Genuinely schema-agnostic, using multi-factor semantic profile.
 */
export function executeDynamicQuery(
  dataset: Dataset | null,
  options: {
    query: string;
    periodFilter?: { label: string; startDate?: string; endDate?: string };
    regionFilter?: string | null;
    productFilter?: string | null;
    categoryFilter?: string | null;
  }
): DynamicQueryResult {
  const { query, periodFilter, regionFilter, productFilter } = options;
  const qLower = query.toLowerCase();

  // If no uploaded custom dataset, use verified business dataset
  if (!dataset || !dataset.rawData || dataset.rawData.length === 0) {
    const rawDefault = getBusinessDataset();
    return executeOnDefaultData(rawDefault, options);
  }

  // 1. Ensure Schema Profile is active (cached once after upload)
  const schemaProfile = ensureDatasetSchemaProfile(dataset);
  const rows = dataset.rawData;
  const roleMap = schemaProfile.roleMap;

  // 2. Check for Missing Metric Test (e.g. User asks for profit, but no profit or cost exists)
  const userAsksProfit = qLower.includes('profit') || qLower.includes('margin') || qLower.includes('laabham');
  const hasProfitCol = (roleMap['profit'] && roleMap['profit']!.length > 0);
  const hasCostCol = (roleMap['cost'] && roleMap['cost']!.length > 0);
  const hasSalesCol = (roleMap['sales'] && roleMap['sales']!.length > 0) || (roleMap['revenue'] && roleMap['revenue']!.length > 0);

  if (userAsksProfit && !hasProfitCol && (!hasCostCol || !hasSalesCol)) {
    return {
      totalMetric: 0,
      formattedMetric: '₹0',
      metricLabel: 'Profit',
      rowCount: 0,
      filteredRows: [],
      topItems: [],
      regionItems: [],
      periodLabel: 'N/A',
      missingRequestedMetric: 'profit',
      schemaExplanation: schemaProfile.explanation,
    };
  }

  // 3. Check for Ambiguity (Requirement 7 & 20):
  // If multiple distinct monetary columns exist (e.g. Gross_Amount, Net_Amount, Profit) and user asked generic "sales" without specifying
  const isGenericSalesQuery =
    (qLower.includes('show sales') || qLower.includes('what is sales') || qLower.includes('total sales') || qLower.includes('sales')) &&
    !qLower.includes('gross') &&
    !qLower.includes('net') &&
    !qLower.includes('profit');

  if (isGenericSalesQuery && schemaProfile.ambiguousRoles.length > 0) {
    const monetaryAmbiguity = schemaProfile.ambiguousRoles.find((a) => a.role === 'monetary_metric');
    if (monetaryAmbiguity && monetaryAmbiguity.candidateColumns.length > 1) {
      const candidates = monetaryAmbiguity.candidateColumns.slice(0, 3);
      // Format friendly clarification prompt
      const formattedCandidates = candidates.join(', ');
      return {
        totalMetric: 0,
        formattedMetric: '₹0',
        metricLabel: candidates[0],
        rowCount: rows.length,
        filteredRows: rows,
        topItems: [],
        regionItems: [],
        periodLabel: 'All Time',
        isAmbiguous: true,
        ambiguityClarification: `Which sales metric do you mean: ${candidates.slice(0, -1).join(', ')} or ${candidates[candidates.length - 1]}?`,
        schemaExplanation: schemaProfile.explanation,
      };
    }
  }

  // 4. Resolve Columns Dynamically from Semantic Roles
  // A. Metric Column
  let metricKey = '';
  if (userAsksProfit && hasProfitCol) {
    metricKey = roleMap['profit']![0];
  } else {
    // Specific requests (e.g. gross, net, profit, revenue)
    const allNumeric = [
      ...(roleMap['sales_revenue'] || []),
      ...(roleMap['sales'] || []),
      ...(roleMap['revenue'] || []),
      ...(roleMap['profit'] || []),
      ...(roleMap['cost'] || []),
      ...(roleMap['other_numeric'] || []),
    ];

    // Check if query specifically mentioned one of the column names
    const exactNamedCol = allNumeric.find((c) => qLower.includes(c.toLowerCase()));
    if (exactNamedCol) {
      metricKey = exactNamedCol;
    } else {
      // Pick best supported sales/revenue column
      metricKey =
        roleMap['sales_revenue']?.[0] ||
        roleMap['sales']?.[0] ||
        roleMap['revenue']?.[0] ||
        roleMap['profit']?.[0] ||
        roleMap['other_numeric']?.[0] ||
        '';
    }
  }

  // B. Date Column
  const dateKey =
    roleMap['date']?.[0] ||
    roleMap['timestamp']?.[0] ||
    roleMap['time']?.[0] ||
    '';

  // C. Product Column
  const productKey =
    roleMap['product']?.[0] ||
    roleMap['product_id']?.[0] ||
    '';

  // D. Category Column
  const categoryKey =
    roleMap['category']?.[0] ||
    '';

  // E. Region Column
  const regionKey =
    roleMap['region']?.[0] ||
    roleMap['location']?.[0] ||
    '';

  // F. Quantity Column
  const qtyKey = roleMap['quantity']?.[0] || '';

  // 5. Filter rows based on conditions
  let filtered = rows;

  // A. Filter by Region if specified
  if (regionFilter && regionKey) {
    const regLower = regionFilter.toLowerCase();
    filtered = filtered.filter((r) => {
      const val = String(r[regionKey] || '').toLowerCase();
      return val.includes(regLower);
    });
  }

  // B. Filter by Product if specified
  if (productFilter && (productKey || categoryKey)) {
    const targetKey = productKey || categoryKey;
    const prodLower = productFilter.toLowerCase();
    filtered = filtered.filter((r) => {
      const val = String(r[targetKey] || '').toLowerCase();
      return val.includes(prodLower);
    });
  }

  // C. Filter by Date range if date column exists
  let curPeriodLabel = periodFilter?.label || 'All Time';
  let prevPeriodLabel = 'Previous Period';
  let prevFiltered: Record<string, any>[] = [];

  const isTimeTrendQuery =
    qLower.includes('monthly') ||
    qLower.includes('trend') ||
    qLower.includes('over time') ||
    qLower.includes('by month') ||
    qLower.includes('per month') ||
    qLower.includes('sales trend') ||
    qLower.includes('revenue over time') ||
    qLower.includes('sales over time');

  if (dateKey && rows.length > 0 && !isTimeTrendQuery) {
    const isLastMonth = qLower.includes('last month') || qLower.includes('pona maasam') || qLower.includes('pichle mahine');
    const isThisMonth = qLower.includes('this month') || qLower.includes('intha maasam') || qLower.includes('is mahine');

    if (isLastMonth || isThisMonth || periodFilter?.startDate) {
      const parsedDates = rows
        .map((r) => new Date(r[dateKey]))
        .filter((d) => !isNaN(d.getTime()))
        .sort((a, b) => a.getTime() - b.getTime());

      if (parsedDates.length > 0) {
        const maxDate = parsedDates[parsedDates.length - 1];
        const targetYear = maxDate.getFullYear();
        const targetMonth = isLastMonth ? maxDate.getMonth() - 1 : maxDate.getMonth();

        const currentStart = new Date(targetYear, targetMonth, 1);
        const currentEnd = new Date(targetYear, targetMonth + 1, 0, 23, 59, 59);

        const prevStart = new Date(targetYear, targetMonth - 1, 1);
        const prevEnd = new Date(targetYear, targetMonth, 0, 23, 59, 59);

        curPeriodLabel = currentStart.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        prevPeriodLabel = prevStart.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

        filtered = rows.filter((r) => {
          const d = new Date(r[dateKey]);
          return !isNaN(d.getTime()) && d >= currentStart && d <= currentEnd;
        });

        prevFiltered = rows.filter((r) => {
          const d = new Date(r[dateKey]);
          return !isNaN(d.getTime()) && d >= prevStart && d <= prevEnd;
        });
      }
    }
  }

  // 6. Calculate Aggregations
  const calculateSum = (data: Record<string, any>[]) => {
    if (!metricKey) return data.length;
    return data.reduce((sum, r) => {
      const n = parseNumericValue(r[metricKey]);
      return sum + (n !== null ? n : 0);
    }, 0);
  };

  const totalMetric = calculateSum(filtered);
  const prevMetric = calculateSum(prevFiltered);

  // Group by Product
  const effectiveProductKey = productKey || (categoryKey && !productKey ? categoryKey : '');
  const topItemsMap = new Map<string, { value: number; quantity: number }>();
  if (effectiveProductKey) {
    for (const r of filtered) {
      const name = String(r[effectiveProductKey] || 'Unknown');
      const val = metricKey ? parseNumericValue(r[metricKey]) || 0 : 1;
      const q = qtyKey ? parseNumericValue(r[qtyKey]) || 1 : 1;

      const ex = topItemsMap.get(name) || { value: 0, quantity: 0 };
      topItemsMap.set(name, { value: ex.value + val, quantity: ex.quantity + q });
    }
  }

  const topItems = Array.from(topItemsMap.entries())
    .map(([name, s]) => ({
      name,
      value: s.value,
      quantity: s.quantity,
      sharePct: totalMetric > 0 ? Math.round((s.value / totalMetric) * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.value - a.value);

  // Group by Region
  const regionMap = new Map<string, { value: number }>();
  if (regionKey) {
    for (const r of filtered) {
      const name = String(r[regionKey] || 'Unknown');
      const val = metricKey ? parseNumericValue(r[metricKey]) || 0 : 1;
      const ex = regionMap.get(name) || { value: 0 };
      regionMap.set(name, { value: ex.value + val });
    }
  }

  const regionItems = Array.from(regionMap.entries())
    .map(([name, s]) => ({
      name,
      value: s.value,
      sharePct: totalMetric > 0 ? Math.round((s.value / totalMetric) * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.value - a.value);

  // Group by Category (if distinct category column exists)
  const categoryItemsMap = new Map<string, { value: number }>();
  if (categoryKey) {
    for (const r of filtered) {
      const name = String(r[categoryKey] || 'Unknown');
      const val = metricKey ? parseNumericValue(r[metricKey]) || 0 : 1;
      const ex = categoryItemsMap.get(name) || { value: 0 };
      categoryItemsMap.set(name, { value: ex.value + val });
    }
  }

  const categoryItems = Array.from(categoryItemsMap.entries())
    .map(([name, s]) => ({
      name,
      value: s.value,
      sharePct: totalMetric > 0 ? Math.round((s.value / totalMetric) * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.value - a.value);

  // Group by Time / Monthly trend
  const timeItemsMap = new Map<string, { value: number; timestamp: number }>();
  if (dateKey) {
    const dataForTime = isTimeTrendQuery ? rows : filtered;
    for (const r of dataForTime) {
      const rawDate = r[dateKey];
      if (!rawDate) continue;
      const d = new Date(rawDate);
      if (isNaN(d.getTime())) continue;
      const monthLabel = d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      const val = metricKey ? parseNumericValue(r[metricKey]) || 0 : 1;
      const ex = timeItemsMap.get(monthLabel) || { value: 0, timestamp: d.getTime() };
      timeItemsMap.set(monthLabel, {
        value: ex.value + val,
        timestamp: Math.min(ex.timestamp, d.getTime()),
      });
    }
  }

  const timeItems = Array.from(timeItemsMap.entries())
    .map(([period, s]) => ({
      period,
      value: s.value,
      timestamp: s.timestamp,
    }))
    .sort((a, b) => a.timestamp - b.timestamp)
    .map(({ period, value }) => ({ period, value }));

  const formattedMetric = formatINR(totalMetric);
  const formattedPrevMetric = formatINR(prevMetric);
  const changePct = prevMetric > 0 ? ((totalMetric - prevMetric) / prevMetric) * 100 : 0;

  return {
    totalMetric,
    formattedMetric,
    metricLabel: metricKey || 'Total',
    rowCount: filtered.length,
    filteredRows: filtered,
    topItems,
    regionItems,
    categoryItems: categoryItems.length > 0 ? categoryItems : undefined,
    timeItems: timeItems.length > 0 ? timeItems : undefined,
    periodLabel: curPeriodLabel,
    comparison:
      prevFiltered.length > 0
        ? {
            prevMetric,
            prevPeriodLabel,
            changePct: Math.round(changePct * 10) / 10,
            formattedPrevMetric,
          }
        : undefined,
    resolvedProductColumn: effectiveProductKey,
    resolvedMetricColumn: metricKey,
    resolvedDateColumn: dateKey,
    resolvedRegionColumn: regionKey,
    resolvedCategoryColumn: categoryKey,
    schemaExplanation: schemaProfile.explanation,
  };
}

/**
 * Fallback to verified default 24-month business dataset
 */
function executeOnDefaultData(
  records: TransactionRecord[],
  options: {
    query: string;
    periodFilter?: { label: string; startDate?: string; endDate?: string };
    regionFilter?: string | null;
    productFilter?: string | null;
    categoryFilter?: string | null;
  }
): DynamicQueryResult {
  const { query, periodFilter, regionFilter, productFilter } = options;

  let currentStart = '2026-08-01';
  let currentEnd = '2026-08-31';
  let periodLabel = 'Last Month (August 2026)';
  let prevStart = '2026-07-01';
  let prevEnd = '2026-07-31';
  let prevPeriodLabel = 'July 2026';

  if (periodFilter?.startDate && periodFilter?.endDate) {
    currentStart = periodFilter.startDate;
    currentEnd = periodFilter.endDate;
    periodLabel = periodFilter.label;
  } else {
    const resolved = resolveTimePeriod(query);
    currentStart = resolved.current.startDate;
    currentEnd = resolved.current.endDate;
    periodLabel = resolved.current.label;
    if (resolved.previous) {
      prevStart = resolved.previous.startDate;
      prevEnd = resolved.previous.endDate;
      prevPeriodLabel = resolved.previous.label;
    }
  }

  let filtered = records.filter((r) => r.Date >= currentStart && r.Date <= currentEnd);
  let prevFiltered = records.filter((r) => r.Date >= prevStart && r.Date <= prevEnd);

  if (regionFilter) {
    const regLower = regionFilter.toLowerCase();
    filtered = filtered.filter((r) => r.Region.toLowerCase() === regLower);
    prevFiltered = prevFiltered.filter((r) => r.Region.toLowerCase() === regLower);
  }

  if (productFilter) {
    const prodLower = productFilter.toLowerCase();
    filtered = filtered.filter((r) => r.Product.toLowerCase().includes(prodLower));
    prevFiltered = prevFiltered.filter((r) => r.Product.toLowerCase().includes(prodLower));
  }

  const curRevenue = filtered.reduce((s, r) => s + r.Revenue, 0);
  const prevRevenue = prevFiltered.reduce((s, r) => s + r.Revenue, 0);

  // Top products
  const prodMap = new Map<string, { value: number; quantity: number }>();
  for (const r of filtered) {
    const ex = prodMap.get(r.Product) || { value: 0, quantity: 0 };
    prodMap.set(r.Product, { value: ex.value + r.Revenue, quantity: ex.quantity + r.Quantity });
  }

  const topItems = Array.from(prodMap.entries())
    .map(([name, s]) => ({
      name,
      value: s.value,
      quantity: s.quantity,
      sharePct: curRevenue > 0 ? Math.round((s.value / curRevenue) * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.value - a.value);

  // Regions
  const regMap = new Map<string, { value: number }>();
  for (const r of filtered) {
    const ex = regMap.get(r.Region) || { value: 0 };
    regMap.set(r.Region, { value: ex.value + r.Revenue });
  }

  const regionItems = Array.from(regMap.entries())
    .map(([name, s]) => ({
      name,
      value: s.value,
      sharePct: curRevenue > 0 ? Math.round((s.value / curRevenue) * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.value - a.value);

  // Categories
  const catMap = new Map<string, { value: number }>();
  for (const r of filtered) {
    const cat = (r as any).Category || 'General';
    const ex = catMap.get(cat) || { value: 0 };
    catMap.set(cat, { value: ex.value + r.Revenue });
  }

  const categoryItems = Array.from(catMap.entries())
    .map(([name, s]) => ({
      name,
      value: s.value,
      sharePct: curRevenue > 0 ? Math.round((s.value / curRevenue) * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.value - a.value);

  // Time / Monthly Trend (all records for trend questions)
  const timeMap = new Map<string, { value: number; timestamp: number }>();
  const isTimeTrend =
    query.toLowerCase().includes('monthly') ||
    query.toLowerCase().includes('trend') ||
    query.toLowerCase().includes('over time') ||
    query.toLowerCase().includes('by month');

  const recordsForTime = isTimeTrend ? records : filtered;
  for (const r of recordsForTime) {
    const d = new Date(r.Date);
    if (isNaN(d.getTime())) continue;
    const monthLabel = d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    const ex = timeMap.get(monthLabel) || { value: 0, timestamp: d.getTime() };
    timeMap.set(monthLabel, {
      value: ex.value + r.Revenue,
      timestamp: Math.min(ex.timestamp, d.getTime()),
    });
  }

  const timeItems = Array.from(timeMap.entries())
    .map(([period, s]) => ({
      period,
      value: s.value,
      timestamp: s.timestamp,
    }))
    .sort((a, b) => a.timestamp - b.timestamp)
    .map(({ period, value }) => ({ period, value }));

  const changePct = prevRevenue > 0 ? ((curRevenue - prevRevenue) / prevRevenue) * 100 : 0;

  return {
    totalMetric: curRevenue,
    formattedMetric: formatINR(curRevenue),
    metricLabel: 'Total Sales',
    rowCount: filtered.length,
    filteredRows: filtered,
    topItems,
    regionItems,
    categoryItems: categoryItems.length > 0 ? categoryItems : undefined,
    timeItems: timeItems.length > 0 ? timeItems : undefined,
    periodLabel,
    comparison: {
      prevMetric: prevRevenue,
      prevPeriodLabel,
      changePct: Math.round(changePct * 10) / 10,
      formattedPrevMetric: formatINR(prevRevenue),
    },
    resolvedProductColumn: 'Product',
    resolvedMetricColumn: 'Revenue',
    resolvedRegionColumn: 'Region',
    resolvedCategoryColumn: 'Category',
    resolvedDateColumn: 'Date',
    schemaExplanation:
      'I identified Product, Revenue, Region, Date, and Quantity from the verified 24-month e-commerce dataset.',
  };
}
