import {
  ColumnType,
  SemanticRole,
  DetailedDataType,
  PossibleRoleInterpretation,
  InferredColumnSchema,
  SchemaInferenceSummary,
  InferredDatasetSchema,
  ColumnSemanticProfile,
  InferredRelationship,
  DatasetSchemaProfile,
} from '../types/dataset';
import { isDateValue, parseNumericValue } from './schemaDetector';

/**
 * Standard Geographical & Regional Entities for value-based location detection
 */
const KNOWN_GEO_ENTITIES = new Set([
  'south', 'north', 'east', 'west', 'central', 'northeast', 'northwest', 'southeast', 'southwest',
  // Indian Cities & States
  'chennai', 'coimbatore', 'madurai', 'salem', 'trichy', 'bangalore', 'bengaluru', 'mumbai',
  'delhi', 'hyderabad', 'pune', 'kolkata', 'ahmedabad', 'jaipur', 'kochi', 'trivandrum',
  'tamil nadu', 'karnataka', 'maharashtra', 'kerala', 'andhra pradesh', 'telangana', 'gujarat',
  // Global Regions & Countries
  'usa', 'united states', 'uk', 'united kingdom', 'india', 'germany', 'france', 'japan', 'china',
  'apac', 'emea', 'na', 'latam', 'california', 'texas', 'new york', 'florida', 'london', 'tokyo',
  // Standard Store / Area Qualifiers
  'metropolitan', 'bay area', 'pacific', 'midwest', 'northwest', 'urban', 'coast', 'flagship',
  'downtown', 'uptown', 'suburban', 'airport', 'outlet',
]);

/**
 * Tokenize a column name into lowercase component words.
 * Handles snake_case, kebab-case, camelCase, spaces, and numbers.
 */
export function tokenizeColumnName(name: string): string[] {
  if (!name) return [];
  // Split on camelCase transitions: totalAmount -> total Amount
  const unCamel = name.replace(/([a-z])([A-Z])/g, '$1 $2');
  // Split on underscores, hyphens, spaces, periods, slashes
  const tokens = unCamel
    .toLowerCase()
    .split(/[\s_\-./\\]+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 0);
  return tokens;
}

/**
 * Normalize column names internally for consistent semantic matching.
 * Preserves the original column name separately.
 */
export function normalizeColumnName(name: string): string {
  if (!name) return '';
  return tokenizeColumnName(name).join('_');
}

/**
 * Maps semantic roles to human-friendly business display names.
 */
export function getRoleDisplayLabel(role: SemanticRole): string {
  switch (role) {
    case 'sales_revenue':
    case 'revenue':
      return 'Sales / Revenue';
    case 'sales':
      return 'Sales / Net Sales';
    case 'product':
      return 'Product';
    case 'product_id':
      return 'Product Code / SKU';
    case 'quantity':
      return 'Quantity / Volume';
    case 'date':
      return 'Transaction Date';
    case 'timestamp':
      return 'Timestamp / Date-Time';
    case 'time':
      return 'Time / Timestamp';
    case 'region':
      return 'Region';
    case 'location':
      return 'Region / Location';
    case 'customer':
      return 'Customer';
    case 'customer_id':
      return 'Customer ID';
    case 'order_id':
      return 'Order ID';
    case 'profit':
      return 'Profit';
    case 'cost':
      return 'Cost';
    case 'unit_price':
      return 'Unit Price / Rate';
    case 'percentage':
      return 'Percentage';
    case 'category':
      return 'Category';
    case 'department':
      return 'Department';
    case 'status':
      return 'Status';
    case 'employee':
      return 'Employee';
    case 'currency':
      return 'Currency / Amount';
    case 'rating':
      return 'Rating';
    case 'other_numeric':
      return 'Numeric Metric';
    case 'other_categorical':
      return 'Categorical Dimension';
    default:
      return 'Unknown';
  }
}

/**
 * Profiles statistical, temporal, and categorical properties of a single column.
 */
export function profileColumnValues(
  colName: string,
  rawValues: any[],
  baseType: ColumnType
): {
  stats: ColumnSemanticProfile['stats'];
  temporal?: InferredColumnSchema['temporal'];
  categorical?: InferredColumnSchema['categorical'];
  detailedDataType: DetailedDataType;
} {
  const rowCount = rawValues.length;
  let nullCount = 0;
  const nonNullsSample: any[] = [];
  const uniqueSet = new Set<string>();
  const exampleValues: Array<string | number | boolean> = [];
  let isHighCardinality = false;

  let min: number | string | undefined;
  let max: number | string | undefined;
  let mean: number | undefined;
  let median: number | undefined;
  let sum: number | undefined;
  let isMonetaryLike = false;
  let isIntegerOnly = false;

  let minVal: number | undefined;
  let maxVal: number | undefined;
  let total = 0;
  let numCount = 0;
  let intCount = 0;
  let hasCurrencySymbol = false;
  const sampleForMedian: number[] = [];
  const sampleMedianCapacity = 1000;
  const medianStep = Math.max(1, Math.floor(rowCount / sampleMedianCapacity));

  let percentMatches = 0;
  let checkedCount = 0;

  for (let i = 0; i < rowCount; i++) {
    const v = rawValues[i];
    if (v === null || v === undefined || v === '') {
      nullCount++;
      continue;
    }

    checkedCount++;

    // Uniqueness capped at 500
    if (!isHighCardinality) {
      const s = typeof v === 'number' || typeof v === 'boolean' ? String(v) : String(v).trim();
      if (!uniqueSet.has(s)) {
        uniqueSet.add(s);
        if (exampleValues.length < 5) {
          exampleValues.push(typeof v === 'number' || typeof v === 'boolean' ? v : s);
        }
        if (uniqueSet.size >= 500) {
          isHighCardinality = true;
        }
      }
    }

    if (nonNullsSample.length < 2500) {
      nonNullsSample.push(v);
    }

    if (typeof v === 'string') {
      if (/[$,€£¥₹]/.test(v)) hasCurrencySymbol = true;
      if (/^\s*[-+]?[0-9]+(\.[0-9]+)?\s*%\s*$/.test(v)) percentMatches++;
    }

    // Numerical stats inline
    if (baseType === 'number') {
      const n = parseNumericValue(v);
      if (n !== null) {
        if (minVal === undefined || n < minVal) minVal = n;
        if (maxVal === undefined || n > maxVal) maxVal = n;
        total += n;
        numCount++;
        if (Number.isInteger(n)) intCount++;

        // Subsample for fast exact-scale median
        if (i % medianStep === 0 && sampleForMedian.length < sampleMedianCapacity) {
          sampleForMedian.push(n);
        }
      }
    }
  }

  const nullPercentage = rowCount > 0 ? Math.round((nullCount / rowCount) * 1000) / 10 : 0;
  const uniqueCount = isHighCardinality ? Math.max(500, Math.floor(rowCount * 0.9)) : uniqueSet.size;
  const uniqueRatio = rowCount > 0 ? Math.round((uniqueCount / rowCount) * 1000) / 1000 : 0;

  let temporal: InferredColumnSchema['temporal'] | undefined;
  let categorical: InferredColumnSchema['categorical'] | undefined;
  let detailedDataType: DetailedDataType = 'text';

  const tokens = tokenizeColumnName(colName);

  // 1. Percentage check
  const isPercentageData = checkedCount > 0 && percentMatches >= checkedCount * 0.7;

  if (isPercentageData) {
    detailedDataType = 'percentage';
  } else if (baseType === 'number') {
    if (numCount > 0) {
      sum = Math.round(total * 100) / 100;
      mean = Math.round((total / numCount) * 100) / 100;
      min = minVal;
      max = maxVal;
      isIntegerOnly = intCount === numCount;

      if (sampleForMedian.length > 0) {
        sampleForMedian.sort((a, b) => a - b);
        const mid = Math.floor(sampleForMedian.length / 2);
        median = sampleForMedian[mid];
      } else {
        median = mean;
      }

      // Check if it's an Identifier
      const isIdName = tokens.some((t) => ['id', 'code', 'num', 'key', 'ref', 'no'].includes(t));
      if (isIdName && (uniqueRatio >= 0.85 || uniqueCount === rowCount)) {
        detailedDataType = 'identifier';
      } else if (hasCurrencySymbol || ((mean ?? 0) > 50 && ((max ?? 0) > 100 || !isIntegerOnly) && !isIdName)) {
        isMonetaryLike = true;
        detailedDataType = 'currency';
      } else if (isIntegerOnly) {
        detailedDataType = 'integer';
      } else {
        detailedDataType = 'decimal';
      }

      // Check for low-cardinality categorical integers (ratings, priority)
      if (uniqueCount <= 6 && rowCount >= 8 && uniqueRatio <= 0.35 && !isMonetaryLike && !isIdName) {
        detailedDataType = 'categorical';
      }
    }
  }
  } else if (baseType === 'date') {
    const timestamps: number[] = [];
    let hasTime = false;

    for (const v of nonNulls) {
      let t: number = NaN;
      if (v instanceof Date && !isNaN(v.getTime())) {
        t = v.getTime();
        if (v.getHours() !== 0 || v.getMinutes() !== 0 || v.getSeconds() !== 0) {
          hasTime = true;
        }
      } else if (typeof v === 'string' && v.trim() !== '') {
        const s = v.trim();
        if (s.includes('T') || s.includes(':')) {
          hasTime = true;
        }
        t = Date.parse(s);
      }

      if (!isNaN(t)) {
        timestamps.push(t);
      }
    }

    if (timestamps.length > 0) {
      timestamps.sort((a, b) => a - b);
      const earliest = new Date(timestamps[0]);
      const latest = new Date(timestamps[timestamps.length - 1]);

      const earliestStr = earliest.toISOString().split('T')[0];
      const latestStr = latest.toISOString().split('T')[0];
      min = earliestStr;
      max = latestStr;

      const minYear = earliest.getFullYear();
      const maxYear = latest.getFullYear();
      const yearRange = minYear === maxYear ? `${minYear}` : `${minYear} - ${maxYear}`;

      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const monthRange = `${monthNames[earliest.getMonth()]} ${minYear} - ${monthNames[latest.getMonth()]} ${maxYear}`;

      temporal = {
        earliestDate: earliestStr,
        latestDate: latestStr,
        yearRange,
        monthRange,
        hasTimeInfo: hasTime,
      };

      detailedDataType = hasTime ? 'datetime' : 'date';
    }
  } else if (baseType === 'boolean') {
    detailedDataType = 'boolean';
  } else {
    // Text inspection
    const isIdToken = tokens.some((t) => ['id', 'code', 'key', 'uuid', 'ref', 'no'].includes(t));
    if (isIdToken && (uniqueRatio >= 0.85 || uniqueCount === rowCount)) {
      detailedDataType = 'identifier';
    } else if (uniqueCount <= 60 && (uniqueRatio < 0.85 || rowCount <= 5)) {
      detailedDataType = 'categorical';
      categorical = {
        categories: Array.from(uniqueSet).slice(0, 15),
        isLowCardinality: uniqueCount <= 20,
      };
    } else {
      detailedDataType = 'text';
    }
  }

  return {
    stats: {
      rowCount,
      uniqueCount,
      uniqueRatio,
      nullCount,
      nullPercentage,
      exampleValues,
      min,
      max,
      mean,
      median,
      sum,
      isMonetaryLike,
      isIntegerOnly,
    },
    temporal,
    categorical,
    detailedDataType,
  };
}

/**
 * Computes semantic role probabilities, multi-candidate interpretations, and ambiguity.
 */
export function inferColumnSemanticRole(
  colName: string,
  baseType: ColumnType,
  detailedType: DetailedDataType,
  stats: ColumnSemanticProfile['stats'],
  temporal?: InferredColumnSchema['temporal'],
  allColumnNames: string[] = []
): {
  role: SemanticRole;
  semanticLabel: string;
  confidence: number;
  isAmbiguous: boolean;
  possibleRoles: PossibleRoleInterpretation[];
  evidence: string[];
} {
  const tokens = tokenizeColumnName(colName);
  const colNormalized = normalizeColumnName(colName);
  const evidence: string[] = [];
  const candidateScores: Record<SemanticRole, { score: number; reasons: string[] }> = {
    product: { score: 0, reasons: [] },
    product_id: { score: 0, reasons: [] },
    category: { score: 0, reasons: [] },
    sales: { score: 0, reasons: [] },
    revenue: { score: 0, reasons: [] },
    sales_revenue: { score: 0, reasons: [] },
    cost: { score: 0, reasons: [] },
    profit: { score: 0, reasons: [] },
    unit_price: { score: 0, reasons: [] },
    quantity: { score: 0, reasons: [] },
    date: { score: 0, reasons: [] },
    timestamp: { score: 0, reasons: [] },
    time: { score: 0, reasons: [] },
    customer: { score: 0, reasons: [] },
    customer_id: { score: 0, reasons: [] },
    region: { score: 0, reasons: [] },
    location: { score: 0, reasons: [] },
    order_id: { score: 0, reasons: [] },
    employee: { score: 0, reasons: [] },
    department: { score: 0, reasons: [] },
    status: { score: 0, reasons: [] },
    percentage: { score: 0, reasons: [] },
    currency: { score: 0, reasons: [] },
    rating: { score: 0, reasons: [] },
    other_numeric: { score: 0, reasons: [] },
    other_categorical: { score: 0, reasons: [] },
    unknown: { score: 0.20, reasons: ['No matching business pattern; preserved for analysis'] },
  };

  const isIdName =
    tokens.some((t) => ['id', 'code', 'num', 'key', 'uuid', 'ref', 'no'].includes(t)) ||
    colNormalized.endsWith('_id') ||
    colNormalized.endsWith('id');

  const isHighUniqueness = stats.uniqueRatio >= 0.85 || (stats.rowCount > 1 && stats.uniqueCount === stats.rowCount);

  // -------------------------------------------------------------------------
  // 1. DATE / TEMPORAL ANALYSIS
  // -------------------------------------------------------------------------
  if (baseType === 'date' || tokens.some((t) => ['date', 'time', 'day', 'month', 'year', 'dt', 'period', 'timestamp'].includes(t))) {
    let dateScore = 0;
    const dateReasons: string[] = [];

    if (baseType === 'date') {
      dateScore += 0.55;
      dateReasons.push('Verified calendar date formats');
    }
    if (tokens.some((t) => ['purchase_date', 'order_date', 'transaction_date', 'invoice_date', 'date'].includes(t) || colNormalized.includes('date'))) {
      dateScore += 0.40;
      dateReasons.push(`Name matches transaction date tokens ("${colName}")`);
    }
    if (temporal?.yearRange) {
      dateScore += 0.10;
      dateReasons.push(`Date span covers ${temporal.yearRange}`);
    }

    if (temporal?.hasTimeInfo || tokens.includes('time') || tokens.includes('timestamp')) {
      candidateScores.timestamp.score = Math.min(dateScore + 0.05, 0.98);
      candidateScores.timestamp.reasons = dateReasons;
    } else {
      candidateScores.date.score = Math.min(dateScore, 0.98);
      candidateScores.date.reasons = dateReasons;
    }
  }

  // -------------------------------------------------------------------------
  // 2. IDENTIFIERS (Protects Customer_ID, Order_ID, etc. from measure aggregation)
  // -------------------------------------------------------------------------
  if (isIdName && (isHighUniqueness || detailedType === 'identifier')) {
    const reasons = [
      `High uniqueness (${stats.uniqueCount} distinct across ${stats.rowCount} rows)`,
      'Identifier naming pattern',
    ];

    if (tokens.includes('order') || tokens.includes('invoice') || tokens.includes('txn') || tokens.includes('trans')) {
      candidateScores.order_id.score = 0.97;
      candidateScores.order_id.reasons = [...reasons, 'Order/Transaction identifier token'];
    } else if (tokens.includes('customer') || tokens.includes('client') || tokens.includes('user') || tokens.includes('buyer')) {
      candidateScores.customer_id.score = 0.96;
      candidateScores.customer_id.reasons = [...reasons, 'Customer entity identifier'];
    } else if (tokens.includes('product') || tokens.includes('item') || tokens.includes('sku') || tokens.includes('article')) {
      candidateScores.product_id.score = 0.95;
      candidateScores.product_id.reasons = [...reasons, 'Product/SKU identifier'];
    } else {
      candidateScores.order_id.score = 0.88;
      candidateScores.order_id.reasons = reasons;
    }
  }

  // -------------------------------------------------------------------------
  // 3. NUMERICAL METRICS: REVENUE, SALES, PROFIT, COST, QUANTITY, PRICE, PERCENTAGE
  // -------------------------------------------------------------------------
  if (baseType === 'number' && !isIdName) {
    // A. Quantity / Volume
    const hasQtyToken = tokens.some((t) => ['qty', 'quantity', 'units', 'volume', 'vol', 'count', 'pieces', 'pcs', 'sold'].includes(t));
    if (hasQtyToken || (stats.isIntegerOnly && stats.max !== undefined && Number(stats.max) <= 5000 && !stats.isMonetaryLike)) {
      let qScore = 0;
      const qReasons: string[] = [];
      if (hasQtyToken) {
        qScore += 0.55;
        qReasons.push(`Name contains quantity indicator ("${tokens.filter((t) => ['qty', 'quantity', 'units', 'volume', 'count', 'sold'].includes(t)).join(', ')}")`);
      }
      if (stats.isIntegerOnly) {
        qScore += 0.30;
        qReasons.push('Positive integer values only');
      }
      if (stats.mean && stats.mean < 1000) {
        qScore += 0.12;
        qReasons.push(`Average volume is ${stats.mean} units`);
      }
      candidateScores.quantity.score = Math.min(qScore, 0.97);
      candidateScores.quantity.reasons = qReasons;
    }

    // B. Unit Price
    const hasPriceToken = tokens.some((t) => ['price', 'mrp', 'rate', 'unit_price', 'fee'].includes(t));
    if (hasPriceToken && !tokens.includes('total') && !tokens.includes('net') && !tokens.includes('gross')) {
      candidateScores.unit_price.score = 0.93;
      candidateScores.unit_price.reasons = [
        'Column name indicates unit price or pricing rate',
        stats.mean ? `Continuous monetary values with mean ₹${stats.mean}` : 'Numerical price data',
      ];
    }

    // C. Profit / Margin
    const hasProfitToken = tokens.some((t) => ['profit', 'margin', 'gain', 'net_margin', 'net_profit'].includes(t));
    if (hasProfitToken) {
      candidateScores.profit.score = 0.95;
      candidateScores.profit.reasons = [
        'Name indicates profit or financial gain',
        stats.mean ? `Financial metric distribution with mean ₹${stats.mean}` : 'Monetary values',
      ];
    }

    // D. Cost / Expense
    const hasCostToken = tokens.some((t) => ['cost', 'cogs', 'expense', 'spending', 'expenditure', 'monthly_cost'].includes(t));
    if (hasCostToken) {
      candidateScores.cost.score = 0.94;
      candidateScores.cost.reasons = [
        'Name indicates business cost or expenditure',
        stats.mean ? `Financial metric distribution with mean ₹${stats.mean}` : 'Monetary values',
      ];
    }

    // E. Revenue / Sales Amount / Net Revenue / Total Sales / Total Amount
    const isGenericAmountOnly =
      (colNormalized === 'amount' || colNormalized === 'amt') ||
      (tokens.length === 1 && (tokens[0] === 'amount' || tokens[0] === 'amt'));

    if (isGenericAmountOnly) {
      // Step 6: Specific Ambiguous Column handling
      candidateScores.sales_revenue.score = 0.55;
      candidateScores.sales_revenue.reasons = ['Generic monetary amount: possible sales/revenue (55%)'];
      candidateScores.revenue.score = 0.55;
      candidateScores.revenue.reasons = ['Generic monetary amount: possible sales/revenue (55%)'];
      candidateScores.cost.score = 0.30;
      candidateScores.cost.reasons = ['Generic monetary amount: possible cost/expense (30%)'];
      candidateScores.profit.score = 0.15;
      candidateScores.profit.reasons = ['Generic monetary amount: possible net profit/margin (15%)'];
    } else {
      const hasSalesToken = tokens.some((t) =>
        ['sale', 'sales', 'revenue', 'rev', 'total_amount', 'sales_amount', 'net_revenue', 'total_sales', 'gross_revenue', 'turnover', 'billing'].includes(t)
      ) || colNormalized.includes('revenue') || colNormalized.includes('sales') || colNormalized.includes('total_amount');

      if (hasSalesToken || stats.isMonetaryLike) {
        let revScore = 0;
        let salesScore = 0;
        const reasons: string[] = [];

        if (tokens.some((t) => ['revenue', 'rev', 'net_revenue', 'gross_revenue', 'turnover'].includes(t)) || colNormalized.includes('revenue')) {
          revScore += 0.55;
          salesScore += 0.45;
          reasons.push('Name indicates company revenue / turnover');
        } else if (tokens.some((t) => ['total_amount', 'total'].includes(t)) || colNormalized.includes('total_amount')) {
          revScore += 0.52;
          salesScore += 0.48;
          reasons.push('Name indicates transaction total amount / revenue');
        } else if (tokens.some((t) => ['sale', 'sales', 'net_sales', 'sales_amount', 'total_sales'].includes(t)) || colNormalized.includes('sales')) {
          salesScore += 0.55;
          revScore += 0.50;
          reasons.push('Name indicates sales figures / revenue');
        }

        if (stats.isMonetaryLike || detailedType === 'currency' || detailedType === 'decimal' || detailedType === 'integer') {
          revScore += 0.38;
          salesScore += 0.38;
          reasons.push(`Continuous monetary/numerical distribution (mean: ₹${stats.mean}, median: ₹${stats.median})`);
        }

        if (stats.uniqueRatio < 0.98) {
          revScore += 0.05;
          salesScore += 0.05;
        }

        const topSalesRevScore = Math.min(Math.max(revScore, salesScore), 0.96);
        candidateScores.sales_revenue.score = topSalesRevScore;
        candidateScores.sales_revenue.reasons = reasons;
        candidateScores.revenue.score = topSalesRevScore;
        candidateScores.revenue.reasons = reasons;
        candidateScores.sales.score = Math.min(topSalesRevScore - 0.01, 0.95);
        candidateScores.sales.reasons = reasons;
      }
    }

    // F. Rating / Review Score (Step 4 requirement)
    const hasRatingToken = tokens.some((t) => ['rating', 'score', 'review_score', 'stars', 'satisfaction', 'review'].includes(t));
    if (hasRatingToken && !tokens.includes('cost') && !tokens.includes('sales')) {
      let rScore = 0.55;
      const rReasons = [`Column name indicates rating/score metric ("${colName}")`];
      if (stats.min !== undefined && Number(stats.min) >= 0 && stats.max !== undefined && Number(stats.max) <= 10) {
        rScore += 0.39;
        rReasons.push(`Values range within 0-10 rating scale [${stats.min} → ${stats.max}]`);
      } else if (stats.min !== undefined && Number(stats.min) >= 0 && stats.max !== undefined && Number(stats.max) <= 100) {
        rScore += 0.35;
        rReasons.push(`Values range within 0-100 rating scale [${stats.min} → ${stats.max}]`);
      }
      candidateScores.rating.score = Math.min(rScore, 0.95);
      candidateScores.rating.reasons = rReasons;
    }

    // G. Percentage
    const hasPercentToken = tokens.some((t) => ['percent', 'pct', 'discount', 'ratio', 'share', 'rate'].includes(t));
    if (hasPercentToken || (stats.max !== undefined && Number(stats.max) <= 100 && stats.min !== undefined && Number(stats.min) >= 0 && !stats.isIntegerOnly)) {
      candidateScores.percentage.score = 0.88;
      candidateScores.percentage.reasons = ['Numerical distribution matches percentage / ratio'];
    }

    // H. Generic numeric fallback
    if (!isGenericAmountOnly && candidateScores.other_numeric.score === 0) {
      candidateScores.other_numeric.score = 0.60;
      candidateScores.other_numeric.reasons = [`Continuous numerical metric (mean: ${stats.mean}, median: ${stats.median})`];
    }
  }

  // -------------------------------------------------------------------------
  // 4. CATEGORICAL & TEXT FIELDS: PRODUCT, REGION, CUSTOMER, CATEGORY, STATUS
  // -------------------------------------------------------------------------
  if (baseType === 'text' || baseType === 'boolean' || detailedType === 'categorical') {
    // A. Region / Geography / Location
    const hasRegionToken = tokens.some((t) =>
      ['region', 'area', 'territory', 'zone', 'location', 'city', 'state', 'country', 'branch', 'district', 'store_area', 'customer_area'].includes(t)
    );

    const sampleStrings = stats.exampleValues.map((v) => String(v).toLowerCase().trim());
    const geoMatches = sampleStrings.filter((s) => KNOWN_GEO_ENTITIES.has(s) || Array.from(KNOWN_GEO_ENTITIES).some((g) => s.includes(g)));

    if (hasRegionToken || geoMatches.length >= 1) {
      let regScore = 0;
      const regReasons: string[] = [];

      if (hasRegionToken) {
        regScore += 0.50;
        regReasons.push(`Name contains geographic indicator ("${colName}")`);
      }
      if (geoMatches.length > 0) {
        regScore += 0.40;
        regReasons.push(`Sample values match known geographic locations (${geoMatches.slice(0, 3).join(', ')})`);
      }
      if (stats.uniqueCount <= 60) {
        regScore += 0.08;
        regReasons.push(`Discrete regional categories (${stats.uniqueCount} distinct regions)`);
      }

      candidateScores.region.score = Math.min(regScore, 0.96);
      candidateScores.region.reasons = regReasons;
      candidateScores.location.score = Math.min(regScore - 0.03, 0.94);
      candidateScores.location.reasons = regReasons;
    }

    // B. Product / Item Name / Description
    const hasProductToken = tokens.some((t) =>
      ['product', 'item', 'product_name', 'item_name', 'item_description', 'merchandise', 'goods', 'article', 'model', 'prod', 'itm', 'sku'].includes(t)
    );

    if (!isIdName && (hasProductToken || (stats.uniqueCount >= 2 && stats.uniqueCount <= 600 && stats.uniqueRatio < 0.85 && hasRegionToken === false && geoMatches.length === 0))) {
      let prodScore = 0;
      const prodReasons: string[] = [];

      if (hasProductToken) {
        prodScore += 0.55;
        prodReasons.push(`Name indicates product/item entity ("${colName}")`);
      }
      if (stats.uniqueCount >= 2 && stats.uniqueCount <= 300) {
        prodScore += 0.32;
        prodReasons.push(`Product catalog items (${stats.exampleValues.slice(0, 2).join(', ')})`);
      }
      if (!hasRegionToken && geoMatches.length === 0) {
        prodScore += 0.10;
      }

      candidateScores.product.score = Math.min(prodScore, 0.96);
      candidateScores.product.reasons = prodReasons;
    }

    // C. Category / Segment
    const hasCategoryToken = tokens.some((t) =>
      ['category', 'segment', 'type', 'group', 'class', 'category_type', 'customer_segment'].includes(t)
    );
    if (hasCategoryToken && stats.uniqueCount <= 40) {
      candidateScores.category.score = 0.93;
      candidateScores.category.reasons = [
        `Category classification token ("${colName}")`,
        `Bounded cardinality (${stats.uniqueCount} distinct groups)`,
      ];
    }

    // D. Department / Division
    const hasDeptToken = tokens.some((t) =>
      ['department', 'dept', 'division', 'unit', 'sector', 'branch'].includes(t)
    );
    if (hasDeptToken && stats.uniqueCount <= 40) {
      candidateScores.department.score = 0.94;
      candidateScores.department.reasons = [
        `Department/Division token ("${colName}")`,
        `Bounded cardinality (${stats.uniqueCount} distinct units)`,
      ];
    }

    // E. Customer Name / Client
    const hasCustomerToken = tokens.some((t) => ['customer', 'client', 'buyer', 'user', 'shopper', 'subscriber', 'account', 'customer_name'].includes(t));
    if (hasCustomerToken && !isIdName) {
      candidateScores.customer.score = 0.92;
      candidateScores.customer.reasons = ['Name indicates customer or client identity'];
    }

    // F. Status / State
    const hasStatusToken = tokens.some((t) => ['status', 'state', 'stage', 'condition', 'flag'].includes(t));
    if (hasStatusToken || baseType === 'boolean' || (hasStatusToken && stats.uniqueCount <= 5 && stats.rowCount > 10)) {
      candidateScores.status.score = 0.91;
      candidateScores.status.reasons = [`Discrete status/state flags (${stats.exampleValues.slice(0, 4).join(', ')})`];
    }

    // G. Fallback Categorical (Only when token hints or strong low-cardinality text)
    const hasCategoricalHint = tokens.some((t) =>
      ['name', 'desc', 'description', 'title', 'type', 'group', 'label', 'tag', 'mode', 'method', 'channel'].includes(t)
    );
    if (hasCategoricalHint && stats.uniqueCount <= 50) {
      candidateScores.other_categorical.score = 0.58;
      candidateScores.other_categorical.reasons = [`Categorical text dimension with ${stats.uniqueCount} distinct values`];
    }
  }

  // -------------------------------------------------------------------------
  // 5. SORT CANDIDATES & DETERMINE AMBIGUITY
  // -------------------------------------------------------------------------
  const sortedCandidates = (Object.keys(candidateScores) as SemanticRole[])
    .map((r) => ({
      role: r,
      label: getRoleDisplayLabel(r),
      confidence: Math.round(candidateScores[r].score * 100) / 100,
      reason: candidateScores[r].reasons.join(' · '),
    }))
    .filter((c) => c.confidence > 0.15)
    .sort((a, b) => b.confidence - a.confidence);

  if (sortedCandidates.length === 0) {
    return {
      role: 'unknown',
      semanticLabel: getRoleDisplayLabel('unknown'),
      confidence: 0.20,
      isAmbiguous: false,
      possibleRoles: [{ role: 'unknown', label: getRoleDisplayLabel('unknown'), confidence: 0.20, reason: 'No pattern detected' }],
      evidence: ['Insufficient pattern match for semantic classification'],
    };
  }

  const topCandidate = sortedCandidates[0];
  const secondCandidate = sortedCandidates[1];

  // Ambiguity condition:
  // If top candidate confidence is low (< 0.70) AND second candidate is very close (diff < 0.14)
  let isAmbiguous = false;
  if (secondCandidate && topCandidate.confidence < 0.85 && (topCandidate.confidence - secondCandidate.confidence) < 0.12) {
    isAmbiguous = true;
  }

  const selectedRole = topCandidate.role;
  const confidence = topCandidate.confidence;
  const selectedLabel = topCandidate.label;
  const bestEvidence = candidateScores[selectedRole]?.reasons || [];

  return {
    role: selectedRole,
    semanticLabel: selectedLabel,
    confidence,
    isAmbiguous,
    possibleRoles: sortedCandidates.slice(0, 4),
    evidence: bestEvidence.length > 0 ? bestEvidence : ['Pattern and value distribution matched'],
  };
}

/**
 * Detect derived mathematical relationships across columns on actual rows.
 * Examples:
 * - Quantity * Unit_Price ≈ Total_Amount
 * - Revenue - Cost ≈ Profit
 */
export function detectDerivedRelationships(
  rows: Record<string, any>[],
  columns: InferredColumnSchema[]
): InferredRelationship[] {
  if (rows.length === 0) return [];
  const relationships: InferredRelationship[] = [];
  const numCols = columns.filter((c) => c.dataType === 'number');

  // Test 1: Multiplication (e.g. Quantity * Price ≈ Total_Amount)
  const qtyCols = columns.filter((c) => c.semanticRole === 'quantity' || c.originalName.toLowerCase().includes('qty'));
  const priceCols = columns.filter((c) => c.semanticRole === 'unit_price' || c.originalName.toLowerCase().includes('price') || c.originalName.toLowerCase().includes('rate'));
  const amountCols = columns.filter((c) => c.semanticRole === 'sales' || c.semanticRole === 'revenue' || c.originalName.toLowerCase().includes('amount') || c.originalName.toLowerCase().includes('total'));

  for (const qCol of (qtyCols.length > 0 ? qtyCols : numCols)) {
    for (const pCol of (priceCols.length > 0 ? priceCols : numCols)) {
      if (qCol.originalName === pCol.originalName) continue;

      for (const aCol of (amountCols.length > 0 ? amountCols : numCols)) {
        if (aCol.originalName === qCol.originalName || aCol.originalName === pCol.originalName) continue;

        let matchCount = 0;
        let testCount = 0;
        let sampleFormulaVerification = '';

        for (const r of rows.slice(0, 30)) {
          const qVal = parseNumericValue(r[qCol.originalName]);
          const pVal = parseNumericValue(r[pCol.originalName]);
          const aVal = parseNumericValue(r[aCol.originalName]);

          if (qVal !== null && pVal !== null && aVal !== null && aVal > 0) {
            testCount++;
            const expected = qVal * pVal;
            const diff = Math.abs(expected - aVal);
            if (diff < 1.0 || (diff / aVal) < 0.03) {
              matchCount++;
              if (!sampleFormulaVerification) {
                sampleFormulaVerification = `${qVal} (${qCol.originalName}) × ${pVal} (${pCol.originalName}) = ${aVal} (${aCol.originalName})`;
              }
            }
          }
        }

        if (testCount >= 5 && matchCount / testCount >= 0.80) {
          relationships.push({
            type: 'multiplication',
            description: `${aCol.originalName} is mathematically derived from ${qCol.originalName} multiplied by ${pCol.originalName}`,
            sourceColumns: [qCol.originalName, pCol.originalName],
            targetColumn: aCol.originalName,
            formula: `${aCol.originalName} ≈ ${qCol.originalName} × ${pCol.originalName}`,
            confidence: Math.round((matchCount / testCount) * 100) / 100,
            sampleVerification: sampleFormulaVerification,
          });

          // Reinforce confidence
          aCol.evidence.push(`Verified relationship: ${aCol.originalName} ≈ ${qCol.originalName} × ${pCol.originalName}`);
          if (aCol.confidence < 0.95) {
            aCol.confidence = 0.96;
            aCol.isAmbiguous = false;
          }
        }
      }
    }
  }

  // Test 2: Subtraction (Revenue - Cost ≈ Profit)
  const revCols = columns.filter((c) => c.semanticRole === 'sales' || c.semanticRole === 'revenue');
  const costCols = columns.filter((c) => c.semanticRole === 'cost');
  const profitCols = columns.filter((c) => c.semanticRole === 'profit');

  for (const rCol of revCols) {
    for (const cCol of costCols) {
      for (const pCol of profitCols) {
        let matchCount = 0;
        let testCount = 0;
        let sampleVerify = '';

        for (const r of rows.slice(0, 30)) {
          const rVal = parseNumericValue(r[rCol.originalName]);
          const cVal = parseNumericValue(r[cCol.originalName]);
          const pVal = parseNumericValue(r[pCol.originalName]);

          if (rVal !== null && cVal !== null && pVal !== null) {
            testCount++;
            const expected = rVal - cVal;
            if (Math.abs(expected - pVal) < 1.0) {
              matchCount++;
              if (!sampleVerify) {
                sampleVerify = `${rVal} (${rCol.originalName}) - ${cVal} (${cCol.originalName}) = ${pVal} (${pCol.originalName})`;
              }
            }
          }
        }

        if (testCount >= 5 && matchCount / testCount >= 0.80) {
          relationships.push({
            type: 'subtraction',
            description: `${pCol.originalName} is derived from ${rCol.originalName} minus ${cCol.originalName}`,
            sourceColumns: [rCol.originalName, cCol.originalName],
            targetColumn: pCol.originalName,
            formula: `${pCol.originalName} ≈ ${rCol.originalName} - ${cCol.originalName}`,
            confidence: 0.98,
            sampleVerification: sampleVerify,
          });
        }
      }
    }
  }

  return relationships;
}

/**
 * Builds the complete InferredDatasetSchema with profiling, semantic reasoning,
 * statistics, ambiguity detection, relationships, and compact summary.
 */
export function buildInferredDatasetSchema(
  datasetName: string,
  rows: Record<string, any>[],
  columnKeys: string[],
  columnBaseTypes: Record<string, ColumnType>
): InferredDatasetSchema {
  const columns: InferredColumnSchema[] = [];
  const roleMap: Partial<Record<SemanticRole, string[]>> = {};

  let numericCount = 0;
  let textCount = 0;
  let dateCount = 0;
  let categoricalCount = 0;
  let identifierCount = 0;
  let totalMissingCells = 0;

  for (const colName of columnKeys) {
    const baseType = columnBaseTypes[colName] || 'text';
    const rawValues = rows.map((r) => r[colName]);

    const { stats, temporal, categorical, detailedDataType } = profileColumnValues(colName, rawValues, baseType);
    totalMissingCells += stats.nullCount;

    const { role, semanticLabel, confidence, isAmbiguous, possibleRoles, evidence } = inferColumnSemanticRole(
      colName,
      baseType,
      detailedDataType,
      stats,
      temporal,
      columnKeys
    );

    // Count types for summary
    if (detailedDataType === 'identifier' || role === 'order_id' || role === 'customer_id' || role === 'product_id') {
      identifierCount++;
    } else if (baseType === 'number') {
      numericCount++;
    } else if (baseType === 'date') {
      dateCount++;
    } else if (detailedDataType === 'categorical' || baseType === 'boolean') {
      categoricalCount++;
    } else {
      textCount++;
    }

    const colSchema: InferredColumnSchema = {
      originalName: colName,
      dataType: baseType,
      detailedDataType,
      semanticRole: role,
      semanticLabel,
      confidence,
      isAmbiguous,
      possibleRoles,
      sampleValues: stats.exampleValues,
      missingCount: stats.nullCount,
      missingPercentage: stats.nullPercentage,
      uniqueCount: stats.uniqueCount,
      statistics: {
        min: stats.min,
        max: stats.max,
        mean: stats.mean,
        median: stats.median,
        sum: stats.sum,
      },
      temporal,
      categorical,
      evidence,
    };

    columns.push(colSchema);

    // Populate roleMap
    if (!roleMap[role]) {
      roleMap[role] = [];
    }
    roleMap[role]!.push(colName);

    // Cross-populate aliases so downstream query parser always finds columns
    if (role === 'sales_revenue' || role === 'revenue' || role === 'sales') {
      const aliases: SemanticRole[] = ['sales_revenue', 'revenue', 'sales'];
      for (const a of aliases) {
        if (!roleMap[a]) roleMap[a] = [];
        if (!roleMap[a]!.includes(colName)) roleMap[a]!.push(colName);
      }
    }
    if (role === 'region' || role === 'location') {
      const aliases: SemanticRole[] = ['region', 'location'];
      for (const a of aliases) {
        if (!roleMap[a]) roleMap[a] = [];
        if (!roleMap[a]!.includes(colName)) roleMap[a]!.push(colName);
      }
    }
    if (role === 'date' || role === 'timestamp') {
      const aliases: SemanticRole[] = ['date', 'timestamp'];
      for (const a of aliases) {
        if (!roleMap[a]) roleMap[a] = [];
        if (!roleMap[a]!.includes(colName)) roleMap[a]!.push(colName);
      }
    }
    if (role === 'product' || role === 'product_id') {
      if (!roleMap['product']) roleMap['product'] = [];
      if (!roleMap['product']!.includes(colName)) roleMap['product']!.push(colName);
    }
    if (role === 'quantity') {
      if (!roleMap['quantity']) roleMap['quantity'] = [];
      if (!roleMap['quantity']!.includes(colName)) roleMap['quantity']!.push(colName);
    }
  }

  // Sort roleMap columns by confidence descending
  for (const role of Object.keys(roleMap) as SemanticRole[]) {
    roleMap[role]!.sort((a, b) => {
      const confA = columns.find((c) => c.originalName === a)?.confidence || 0;
      const confB = columns.find((c) => c.originalName === b)?.confidence || 0;
      return confB - confA;
    });
  }

  // Detect derived relationships
  const relationships = detectDerivedRelationships(rows, columns);

  // Business fields detected
  const detectedBusinessFields: SchemaInferenceSummary['detectedBusinessFields'] = [];
  const primaryBusinessRoles: SemanticRole[] = [
    'sales_revenue', 'revenue', 'sales', 'quantity', 'product', 'region', 'location', 'date', 'customer', 'profit', 'cost', 'rating', 'department',
  ];

  for (const r of primaryBusinessRoles) {
    const matchingCols = columns.filter((c) => c.semanticRole === r);
    for (const c of matchingCols) {
      if (!detectedBusinessFields.some((f) => f.columnName === c.originalName)) {
        detectedBusinessFields.push({
          roleName: c.semanticLabel,
          columnName: c.originalName,
          confidence: c.confidence,
        });
      }
    }
  }

  const totalCells = rows.length * columnKeys.length;
  const missingDataPercentage = totalCells > 0 ? Math.round((totalMissingCells / totalCells) * 1000) / 10 : 0;

  const summary: SchemaInferenceSummary = {
    totalRows: rows.length,
    totalColumns: columns.length,
    numericColumns: numericCount,
    textColumns: textCount,
    dateColumns: dateCount,
    categoricalColumns: categoricalCount,
    identifierColumns: identifierCount,
    totalMissingCells,
    missingDataPercentage,
    detectedBusinessFields,
  };

  return {
    datasetName,
    datasetSummary: {
      rows: rows.length,
      columns: columns.length,
    },
    totalRows: rows.length,
    totalColumns: columns.length,
    columns,
    summary,
    relationships,
    roleMap,
    inferredAt: new Date().toISOString(),
  };
}

/**
 * Adapter building DatasetSchemaProfile for backwards compatibility with existing components.
 */
export function buildDatasetSchemaProfile(
  datasetName: string,
  rows: Record<string, any>[],
  columnKeys: string[],
  columnTypes: Record<string, ColumnType>
): DatasetSchemaProfile {
  const inferred = buildInferredDatasetSchema(datasetName, rows, columnKeys, columnTypes);

  const legacyColumns: ColumnSemanticProfile[] = inferred.columns.map((c) => ({
    name: c.originalName,
    type: c.dataType,
    semanticRole: c.semanticRole,
    confidence: c.confidence,
    evidence: c.evidence,
    stats: {
      rowCount: inferred.totalRows,
      uniqueCount: c.uniqueCount,
      uniqueRatio: inferred.totalRows > 0 ? Math.round((c.uniqueCount / inferred.totalRows) * 1000) / 1000 : 0,
      nullCount: c.missingCount,
      nullPercentage: c.missingPercentage,
      exampleValues: c.sampleValues,
      min: c.statistics?.min,
      max: c.statistics?.max,
      mean: c.statistics?.mean,
      median: c.statistics?.median,
      sum: c.statistics?.sum,
      isMonetaryLike: c.detailedDataType === 'currency',
      isIntegerOnly: c.detailedDataType === 'integer',
    },
  }));

  const keyRoles = inferred.columns.filter((c) =>
    ['product', 'sales', 'revenue', 'date', 'region', 'quantity', 'profit'].includes(c.semanticRole)
  );

  const explanationLines = keyRoles.map((col) => {
    return `• **${col.originalName}** as **${col.semanticLabel}** (${Math.round(col.confidence * 100)}% confidence): ${col.evidence[col.evidence.length - 1] || `${col.dataType} data`}.`;
  });

  if (inferred.relationships.length > 0) {
    explanationLines.push(`• **Verified Relationship**: ${inferred.relationships[0].formula}.`);
  }

  const explanation =
    explanationLines.length > 0
      ? `I analyzed your dataset and identified:\n\n${explanationLines.join('\n')}`
      : `Identified ${inferred.columns.length} columns in ${datasetName}.`;

  return {
    datasetName,
    totalRows: inferred.totalRows,
    totalColumns: inferred.totalColumns,
    columns: legacyColumns,
    relationships: inferred.relationships,
    roleMap: inferred.roleMap,
    ambiguousRoles: inferred.columns
      .filter((c) => c.isAmbiguous)
      .map((c) => ({
        role: c.semanticRole,
        candidateColumns: [c.originalName],
        reason: `Potential ambiguity between ${c.possibleRoles.map((p) => `${p.label} (${Math.round(p.confidence * 100)}%)`).join(', ')}`,
      })),
    explanation,
  };
}

/**
 * STEP 19 — PREPARE FOR FUTURE QUERY PARSER MODULE
 * Resolves a semantic role to the actual column name present in the dataset.
 * Supports unseen schemas and aliases (e.g. Sales, Total_Amount, Net_Revenue -> 'sales_revenue').
 */
export function resolveColumnBySemanticRole(
  inferredSchema: InferredDatasetSchema,
  targetRole: SemanticRole | 'sales' | 'revenue' | 'sales_revenue' | 'product' | 'date' | 'region' | 'location' | 'quantity'
): string | null {
  if (!inferredSchema || !inferredSchema.columns) return null;

  const directList = inferredSchema.roleMap[targetRole as SemanticRole];
  if (directList && directList.length > 0) {
    return directList[0];
  }

  // Cross-role aliases
  if (targetRole === 'sales' || targetRole === 'revenue' || targetRole === 'sales_revenue') {
    const candidate =
      inferredSchema.roleMap['sales_revenue']?.[0] ||
      inferredSchema.roleMap['revenue']?.[0] ||
      inferredSchema.roleMap['sales']?.[0];
    if (candidate) return candidate;
  }

  if (targetRole === 'region' || targetRole === 'location') {
    const candidate =
      inferredSchema.roleMap['region']?.[0] ||
      inferredSchema.roleMap['location']?.[0];
    if (candidate) return candidate;
  }

  if (targetRole === 'date' || targetRole === 'timestamp') {
    const candidate =
      inferredSchema.roleMap['date']?.[0] ||
      inferredSchema.roleMap['timestamp']?.[0];
    if (candidate) return candidate;
  }

  if (targetRole === 'product' || targetRole === 'product_id' || targetRole === 'category') {
    const candidate =
      inferredSchema.roleMap['product']?.[0] ||
      inferredSchema.roleMap['product_id']?.[0] ||
      inferredSchema.roleMap['category']?.[0];
    if (candidate) return candidate;
  }

  if (targetRole === 'quantity') {
    const candidate = inferredSchema.roleMap['quantity']?.[0];
    if (candidate) return candidate;
  }

  const found = inferredSchema.columns.find((c) => c.semanticRole === targetRole);
  return found ? found.originalName : null;
}

/**
 * Maps natural language query concepts to actual dataset column names.
 * Prepares the schema inference layer for the downstream Natural Language -> Query Parser module.
 */
export function mapQueryTermsToColumns(
  inferredSchema: InferredDatasetSchema,
  query?: string
): {
  metricColumn: string | null;
  dateColumn: string | null;
  productColumn: string | null;
  regionColumn: string | null;
  quantityColumn: string | null;
} {
  return {
    metricColumn: resolveColumnBySemanticRole(inferredSchema, 'sales_revenue'),
    dateColumn: resolveColumnBySemanticRole(inferredSchema, 'date'),
    productColumn: resolveColumnBySemanticRole(inferredSchema, 'product'),
    regionColumn: resolveColumnBySemanticRole(inferredSchema, 'region'),
    quantityColumn: resolveColumnBySemanticRole(inferredSchema, 'quantity'),
  };
}

/**
 * Returns column schema details by original column name.
 */
export function getInferredColumn(
  inferredSchema: InferredDatasetSchema,
  columnName: string
): InferredColumnSchema | undefined {
  return inferredSchema.columns.find((c) => c.originalName.toLowerCase() === columnName.toLowerCase());
}

/**
 * Generates an executive textual summary of the inferred schema for AI prompts / logs.
 */
export function getSchemaSummaryForPrompt(inferredSchema: InferredDatasetSchema): string {
  const lines = inferredSchema.columns.map((c) => {
    return `- ${c.originalName} [Type: ${c.dataType}/${c.detailedDataType}, Role: ${c.semanticRole} (${c.semanticLabel}), Conf: ${Math.round(c.confidence * 100)}%]`;
  });
  return `Dataset: ${inferredSchema.datasetName} (${inferredSchema.totalRows} rows, ${inferredSchema.totalColumns} columns)\n` + lines.join('\n');
}
