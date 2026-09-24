import { TransactionRecord, getBusinessDataset } from '../data/businessData';

export interface TimePeriodFilter {
  label: string;
  startDate: string; // YYYY-MM-DD
  endDate: string;
  year?: number;
  month?: number;
  isCustom?: boolean;
}

export interface ConversationContext {
  lastTimePeriod?: TimePeriodFilter;
  lastComparisonPeriod?: TimePeriodFilter;
  lastRegion?: string | null;
  lastCategory?: string | null;
  lastProduct?: string | null;
  lastQuery?: string;
  lastMetric?: 'revenue' | 'quantity' | 'orders';
}

export interface MetricCardData {
  label: string;
  currentValue: number;
  formattedCurrent: string;
  previousValue?: number;
  formattedPrevious?: string;
  changeValue?: number;
  formattedChange?: string;
  growthPct?: number;
  isPositive?: boolean;
}

export interface BreakdownItem {
  name: string;
  value: number;
  formattedValue: string;
  quantity?: number;
  sharePct: number;
  growthPct?: number;
}

export interface ChartSpecification {
  type: 'bar' | 'horizontal_bar' | 'line' | 'pie' | 'scatter';
  title: string;
  data: any[];
  layout: any;
}

export interface AnalyticsResponse {
  id: string;
  query: string;
  title: string;
  headline: string;
  timePeriodLabel: string;
  metrics: {
    totalRevenue: MetricCardData;
    totalOrders: MetricCardData;
    unitsSold: MetricCardData;
    avgOrderValue: MetricCardData;
  };
  chart: ChartSpecification;
  productBreakdown: BreakdownItem[];
  regionBreakdown: BreakdownItem[];
  categoryBreakdown: BreakdownItem[];
  keyInsights: string[];
  whyAnalysis?: {
    summary: string;
    productContributions: { name: string; changeAmount: number; changePct: number; text: string }[];
    regionContributions: { name: string; changeAmount: number; changePct: number; text: string }[];
    volumeImpact: string;
  };
  dailyDetails: { date: string; day: string; orders: number; revenue: number; topProduct: string }[];
  followUpSuggestions: string[];
  contextUpdated: ConversationContext;
}

// Format numbers in Indian Lakhs (L) / Crores (Cr) or standard currency
export function formatINR(val: number): string {
  if (isNaN(val)) return '₹0';
  const absVal = Math.abs(val);
  const sign = val < 0 ? '-' : '';

  if (absVal >= 10000000) {
    return `${sign}₹${(absVal / 10000000).toFixed(2)} Cr`;
  }
  if (absVal >= 100000) {
    return `${sign}₹${(absVal / 100000).toFixed(1)}L`;
  }
  if (absVal >= 1000) {
    return `${sign}₹${(absVal / 1000).toFixed(1)}k`;
  }
  return `${sign}₹${Math.round(absVal).toLocaleString('en-IN')}`;
}

export function formatFullINR(val: number): string {
  if (isNaN(val)) return '₹0';
  return `₹${Math.round(val).toLocaleString('en-IN')}`;
}

// Current benchmark date: September 2026
const CURRENT_DATE = new Date(2026, 8, 24); // 2026-09-24

/**
 * Resolve natural language date expressions into date ranges
 */
export function resolveTimePeriod(
  query: string,
  context?: ConversationContext
): { current: TimePeriodFilter; previous?: TimePeriodFilter } {
  const q = query.toLowerCase();

  // 1. "last month" / "previous month" -> August 2026 (comparing to July 2026)
  if (
    q.includes('last month') ||
    q.includes('previous month') ||
    q.includes('past month') ||
    q.includes('august')
  ) {
    return {
      current: {
        label: 'Last Month (August 2026)',
        startDate: '2026-08-01',
        endDate: '2026-08-31',
        year: 2026,
        month: 8,
      },
      previous: {
        label: 'Previous Month (July 2026)',
        startDate: '2026-07-01',
        endDate: '2026-07-31',
        year: 2026,
        month: 7,
      },
    };
  }

  // 2. "month before" / "month before last" / "july"
  if (
    q.includes('month before last') ||
    q.includes('two months ago') ||
    q.includes('july')
  ) {
    return {
      current: {
        label: 'July 2026',
        startDate: '2026-07-01',
        endDate: '2026-07-31',
        year: 2026,
        month: 7,
      },
      previous: {
        label: 'June 2026',
        startDate: '2026-06-01',
        endDate: '2026-06-30',
        year: 2026,
        month: 6,
      },
    };
  }

  // 3. "this month" / "current month" / "mtd" -> September 2026
  if (
    q.includes('this month') ||
    q.includes('current month') ||
    q.includes('month to date') ||
    q.includes('mtd') ||
    q.includes('september')
  ) {
    return {
      current: {
        label: 'This Month (September 2026 MTD)',
        startDate: '2026-09-01',
        endDate: '2026-09-24',
        year: 2026,
        month: 9,
      },
      previous: {
        label: 'August 2026 (Same Period)',
        startDate: '2026-08-01',
        endDate: '2026-08-24',
        year: 2026,
        month: 8,
      },
    };
  }

  // 4. "last 6 months" / "past 6 months"
  if (q.includes('last 6 months') || q.includes('past 6 months') || q.includes('6 months') || q.includes('six months')) {
    return {
      current: {
        label: 'Last 6 Months (March – August 2026)',
        startDate: '2026-03-01',
        endDate: '2026-08-31',
      },
      previous: {
        label: 'Prior 6 Months (Sep 2025 – Feb 2026)',
        startDate: '2025-09-01',
        endDate: '2026-02-28',
      },
    };
  }

  // 5. "last 3 months" / "quarter" / "q2"
  if (q.includes('last 3 months') || q.includes('past 3 months') || q.includes('last quarter')) {
    return {
      current: {
        label: 'Last 3 Months (June – August 2026)',
        startDate: '2026-06-01',
        endDate: '2026-08-31',
      },
      previous: {
        label: 'Prior 3 Months (March – May 2026)',
        startDate: '2026-03-01',
        endDate: '2026-05-31',
      },
    };
  }

  // 6. "this year" / "ytd" / "2026"
  if (q.includes('this year') || q.includes('year to date') || q.includes('ytd') || q.includes('2026')) {
    return {
      current: {
        label: 'This Year (2026 YTD)',
        startDate: '2026-01-01',
        endDate: '2026-09-24',
      },
      previous: {
        label: 'Last Year (2025 Same Period)',
        startDate: '2025-01-01',
        endDate: '2025-09-24',
      },
    };
  }

  // 7. "last year" / "2025"
  if (q.includes('last year') || q.includes('2025')) {
    return {
      current: {
        label: 'Last Year (Full 2025)',
        startDate: '2025-01-01',
        endDate: '2025-12-31',
      },
      previous: {
        label: 'Prior Year (2024)',
        startDate: '2024-01-01',
        endDate: '2024-12-31',
      },
    };
  }

  // 8. Follow-up context inheritance:
  // If query doesn't explicitly mention time, but user has an active conversation context, keep that period!
  if (context?.lastTimePeriod) {
    return {
      current: context.lastTimePeriod,
      previous: context.lastComparisonPeriod,
    };
  }

  // Default fallback: Last Month (August 2026) as primary business reference
  return {
    current: {
      label: 'Last Month (August 2026)',
      startDate: '2026-08-01',
      endDate: '2026-08-31',
      year: 2026,
      month: 8,
    },
    previous: {
      label: 'Previous Month (July 2026)',
      startDate: '2026-07-01',
      endDate: '2026-07-31',
      year: 2026,
      month: 7,
    },
  };
}

/**
 * Filter dataset by date range and optional dimension filters
 */
export function filterRecords(
  data: TransactionRecord[],
  period: TimePeriodFilter,
  regionFilter?: string | null,
  categoryFilter?: string | null,
  productFilter?: string | null
): TransactionRecord[] {
  return data.filter((row) => {
    if (row.Date < period.startDate || row.Date > period.endDate) return false;
    if (regionFilter && row.Region.toLowerCase() !== regionFilter.toLowerCase()) return false;
    if (categoryFilter && row.Category.toLowerCase() !== categoryFilter.toLowerCase()) return false;
    if (productFilter && !row.Product.toLowerCase().includes(productFilter.toLowerCase())) return false;
    return true;
  });
}

/**
 * Main Deterministic Analytics Engine for DataMind AI
 */
export function analyzeBusinessQuery(
  rawQuery: string,
  context?: ConversationContext,
  customData?: TransactionRecord[]
): AnalyticsResponse {
  const dataset = customData || getBusinessDataset();
  const query = rawQuery.trim();
  const qLower = query.toLowerCase();

  // 1. Detect Dimension Filters (with context carry-forward)
  let regionFilter: string | null = null;
  const regions = ['South', 'North', 'West', 'East'];
  for (const r of regions) {
    if (qLower.includes(r.toLowerCase())) {
      regionFilter = r;
      break;
    }
  }

  let categoryFilter: string | null = null;
  const categories = ['Laptop', 'Mobile', 'Tablet', 'Accessories', 'Audio & Wearables'];
  for (const c of categories) {
    if (qLower.includes(c.toLowerCase()) || (c === 'Audio & Wearables' && (qLower.includes('audio') || qLower.includes('headphone')))) {
      categoryFilter = c;
      break;
    }
  }

  // Multi-turn context inheritance for dimensions
  if (!regionFilter && context?.lastRegion && (qLower.includes('it') || qLower.includes('there') || qLower.includes('compare'))) {
    regionFilter = context.lastRegion;
  }
  if (!categoryFilter && context?.lastCategory && (qLower.includes('it') || qLower.includes('this category') || qLower.includes('compare'))) {
    categoryFilter = context.lastCategory;
  }

  // 2. Resolve Time Period (with context inheritance)
  const { current: currentPeriod, previous: prevPeriod } = resolveTimePeriod(query, context);

  // 3. Filter Records for Current and Comparison Periods
  const currentRows = filterRecords(dataset, currentPeriod, regionFilter, categoryFilter);
  const prevRows = prevPeriod ? filterRecords(dataset, prevPeriod, regionFilter, categoryFilter) : [];

  // 4. Calculate Core Metrics
  const curRevenue = currentRows.reduce((sum, r) => sum + r.Revenue, 0);
  const curOrders = currentRows.length;
  const curUnits = currentRows.reduce((sum, r) => sum + r.Quantity, 0);
  const curAOV = curOrders > 0 ? Math.round(curRevenue / curOrders) : 0;

  const prevRevenue = prevRows.reduce((sum, r) => sum + r.Revenue, 0);
  const prevOrders = prevRows.length;
  const prevUnits = prevRows.reduce((sum, r) => sum + r.Quantity, 0);
  const prevAOV = prevOrders > 0 ? Math.round(prevRevenue / prevOrders) : 0;

  const revGrowth = prevRevenue > 0 ? ((curRevenue - prevRevenue) / prevRevenue) * 100 : 0;
  const ordersGrowth = prevOrders > 0 ? ((curOrders - prevOrders) / prevOrders) * 100 : 0;
  const unitsGrowth = prevUnits > 0 ? ((curUnits - prevUnits) / prevUnits) * 100 : 0;
  const aovGrowth = prevAOV > 0 ? ((curAOV - prevAOV) / prevAOV) * 100 : 0;

  // 5. Product Breakdown Calculation
  const prodMap = new Map<string, { revenue: number; quantity: number }>();
  for (const r of currentRows) {
    const existing = prodMap.get(r.Product) || { revenue: 0, quantity: 0 };
    prodMap.set(r.Product, {
      revenue: existing.revenue + r.Revenue,
      quantity: existing.quantity + r.Quantity,
    });
  }

  // Product previous period map for growth calculation
  const prevProdMap = new Map<string, number>();
  for (const r of prevRows) {
    prevProdMap.set(r.Product, (prevProdMap.get(r.Product) || 0) + r.Revenue);
  }

  const productBreakdown: BreakdownItem[] = Array.from(prodMap.entries())
    .map(([name, stats]) => {
      const pRev = prevProdMap.get(name) || 0;
      const growth = pRev > 0 ? ((stats.revenue - pRev) / pRev) * 100 : undefined;
      return {
        name,
        value: stats.revenue,
        formattedValue: formatINR(stats.revenue),
        quantity: stats.quantity,
        sharePct: curRevenue > 0 ? Math.round((stats.revenue / curRevenue) * 1000) / 10 : 0,
        growthPct: growth !== undefined ? Math.round(growth * 10) / 10 : undefined,
      };
    })
    .sort((a, b) => b.value - a.value);

  // 6. Region Breakdown Calculation
  const regionMap = new Map<string, { revenue: number; quantity: number }>();
  for (const r of currentRows) {
    const existing = regionMap.get(r.Region) || { revenue: 0, quantity: 0 };
    regionMap.set(r.Region, {
      revenue: existing.revenue + r.Revenue,
      quantity: existing.quantity + r.Quantity,
    });
  }
  const prevRegionMap = new Map<string, number>();
  for (const r of prevRows) {
    prevRegionMap.set(r.Region, (prevRegionMap.get(r.Region) || 0) + r.Revenue);
  }

  const regionBreakdown: BreakdownItem[] = Array.from(regionMap.entries())
    .map(([name, stats]) => {
      const pRev = prevRegionMap.get(name) || 0;
      const growth = pRev > 0 ? ((stats.revenue - pRev) / pRev) * 100 : undefined;
      return {
        name,
        value: stats.revenue,
        formattedValue: formatINR(stats.revenue),
        quantity: stats.quantity,
        sharePct: curRevenue > 0 ? Math.round((stats.revenue / curRevenue) * 1000) / 10 : 0,
        growthPct: growth !== undefined ? Math.round(growth * 10) / 10 : undefined,
      };
    })
    .sort((a, b) => b.value - a.value);

  // 7. Category Breakdown Calculation
  const catMap = new Map<string, { revenue: number; quantity: number }>();
  for (const r of currentRows) {
    const existing = catMap.get(r.Category) || { revenue: 0, quantity: 0 };
    catMap.set(r.Category, {
      revenue: existing.revenue + r.Revenue,
      quantity: existing.quantity + r.Quantity,
    });
  }
  const prevCatMap = new Map<string, number>();
  for (const r of prevRows) {
    prevCatMap.set(r.Category, (prevCatMap.get(r.Category) || 0) + r.Revenue);
  }

  const categoryBreakdown: BreakdownItem[] = Array.from(catMap.entries())
    .map(([name, stats]) => {
      const pRev = prevCatMap.get(name) || 0;
      const growth = pRev > 0 ? ((stats.revenue - pRev) / pRev) * 100 : undefined;
      return {
        name,
        value: stats.revenue,
        formattedValue: formatINR(stats.revenue),
        quantity: stats.quantity,
        sharePct: curRevenue > 0 ? Math.round((stats.revenue / curRevenue) * 1000) / 10 : 0,
        growthPct: growth !== undefined ? Math.round(growth * 10) / 10 : undefined,
      };
    })
    .sort((a, b) => b.value - a.value);

  // 8. Daily Details Calculation
  const dailyMap = new Map<string, { orders: number; revenue: number; products: Record<string, number> }>();
  for (const r of currentRows) {
    const existing = dailyMap.get(r.Date) || { orders: 0, revenue: 0, products: {} };
    existing.orders += 1;
    existing.revenue += r.Revenue;
    existing.products[r.Product] = (existing.products[r.Product] || 0) + r.Revenue;
    dailyMap.set(r.Date, existing);
  }

  const dailyDetails = Array.from(dailyMap.entries())
    .map(([date, d]) => {
      const dObj = new Date(date);
      const dayName = dObj.toLocaleDateString('en-US', { weekday: 'short' });
      let topProd = '';
      let topRev = -1;
      for (const [p, rev] of Object.entries(d.products)) {
        if (rev > topRev) {
          topRev = rev;
          topProd = p;
        }
      }
      return {
        date,
        day: dayName,
        orders: d.orders,
        revenue: d.revenue,
        topProduct: topProd,
      };
    })
    .sort((a, b) => a.date.localeCompare(b.date));

  // 9. Automatic Chart Selection
  // - "sales trend" / "last 6 months" / "over time" -> Line chart
  // - "share" / "contribution" -> Pie chart
  // - "top 10" / "top products" -> Horizontal bar chart
  // - "sales vs quantity" -> Scatter chart
  // - Default -> Vertical Bar chart (Category/Product or Region)
  let chart: ChartSpecification;

  const isTrendQuery = qLower.includes('trend') || qLower.includes('6 months') || qLower.includes('over time') || qLower.includes('monthly');
  const isShareQuery = qLower.includes('share') || qLower.includes('percentage') || qLower.includes('proportion');
  const isScatterQuery = (qLower.includes('versus') || qLower.includes(' vs ')) && (qLower.includes('quantity') || qLower.includes('units'));
  const isRegionFocus = qLower.includes('region') || qLower.includes('area') || qLower.includes('location');
  const isTopProductsQuery = qLower.includes('top 5') || qLower.includes('top 10') || qLower.includes('top products') || qLower.includes('sold the most');

  if (isTrendQuery) {
    // Generate monthly time-series across the last 6-12 months
    const monthAgg = new Map<string, number>();
    for (const r of dataset) {
      if (r.Date >= '2026-03-01' && r.Date <= '2026-09-24') {
        const key = `${r.Year}-${String(r.Month).padStart(2, '0')}`;
        monthAgg.set(key, (monthAgg.get(key) || 0) + r.Revenue);
      }
    }
    const monthsSorted = Array.from(monthAgg.entries()).sort((a, b) => a[0].localeCompare(b[0]));
    const monthLabels = monthsSorted.map(([k]) => {
      const parts = k.split('-');
      const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, 1);
      return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    });
    const monthValues = monthsSorted.map(([_, v]) => Math.round(v / 100000 * 10) / 10); // in Lakhs

    chart = {
      type: 'line',
      title: 'Monthly Revenue Trend (Last 6 Months in ₹ Lakhs)',
      data: [
        {
          x: monthLabels,
          y: monthValues,
          type: 'scatter',
          mode: 'lines+markers',
          name: 'Revenue (₹L)',
          line: { color: '#2563eb', width: 3, shape: 'spline' },
          marker: { color: '#1d4ed8', size: 8 },
        },
      ],
      layout: {
        title: { text: 'Monthly Revenue Trend (₹ Lakhs)', font: { size: 13, color: '#0f172a' } },
        xaxis: { title: 'Month', tickangle: -20 },
        yaxis: { title: 'Revenue (₹ Lakhs)', rangemode: 'tozero' },
        margin: { l: 45, r: 20, t: 40, b: 50 },
        height: 280,
      },
    };
  } else if (isShareQuery) {
    const pieItems = isRegionFocus ? regionBreakdown : categoryBreakdown;
    chart = {
      type: 'pie',
      title: `${isRegionFocus ? 'Region' : 'Category'} Revenue Share`,
      data: [
        {
          labels: pieItems.map((i) => i.name),
          values: pieItems.map((i) => i.value),
          type: 'pie',
          hole: 0.4,
          textinfo: 'label+percent',
          hoverinfo: 'label+value+percent',
          marker: {
            colors: ['#2563eb', '#3b82f6', '#60a5fa', '#93c5fd', '#bfdbfe'],
          },
        },
      ],
      layout: {
        title: { text: 'Revenue Share Distribution', font: { size: 13, color: '#0f172a' } },
        margin: { l: 20, r: 20, t: 40, b: 20 },
        height: 280,
      },
    };
  } else if (isScatterQuery) {
    chart = {
      type: 'scatter',
      title: 'Sales Value vs Quantity Sold',
      data: [
        {
          x: currentRows.map((r) => r.Quantity),
          y: currentRows.map((r) => r.Revenue / 1000),
          mode: 'markers',
          type: 'scatter',
          text: currentRows.map((r) => `${r.Product} (${r.Region})`),
          marker: { color: '#2563eb', size: 8, opacity: 0.7 },
        },
      ],
      layout: {
        title: { text: 'Revenue (₹k) vs Quantity', font: { size: 13, color: '#0f172a' } },
        xaxis: { title: 'Units Sold' },
        yaxis: { title: 'Revenue (₹ Thousands)' },
        margin: { l: 50, r: 20, t: 40, b: 40 },
        height: 280,
      },
    };
  } else if (isTopProductsQuery) {
    const top10 = productBreakdown.slice(0, 10).reverse();
    chart = {
      type: 'horizontal_bar',
      title: 'Top Performing Products by Revenue',
      data: [
        {
          y: top10.map((p) => p.name.length > 20 ? p.name.slice(0, 20) + '…' : p.name),
          x: top10.map((p) => Math.round(p.value / 100000 * 10) / 10),
          type: 'bar',
          orientation: 'h',
          marker: { color: '#2563eb' },
          text: top10.map((p) => formatINR(p.value)),
          textposition: 'auto',
        },
      ],
      layout: {
        title: { text: 'Top Products by Revenue (₹ Lakhs)', font: { size: 13, color: '#0f172a' } },
        xaxis: { title: 'Revenue (₹ Lakhs)' },
        yaxis: { automargin: true },
        margin: { l: 140, r: 20, t: 40, b: 40 },
        height: 320,
      },
    };
  } else {
    // Default: Bar chart of either Region or Category / Products
    const items = isRegionFocus ? regionBreakdown : categoryBreakdown;
    chart = {
      type: 'bar',
      title: isRegionFocus ? 'Region-wise Sales Performance' : 'Category-wise Sales Performance',
      data: [
        {
          x: items.map((i) => i.name),
          y: items.map((i) => Math.round(i.value / 100000 * 10) / 10),
          type: 'bar',
          marker: {
            color: ['#2563eb', '#3b82f6', '#0284c7', '#0d9488', '#059669'],
          },
          text: items.map((i) => formatINR(i.value)),
          textposition: 'auto',
        },
      ],
      layout: {
        title: {
          text: isRegionFocus ? 'Sales by Region (₹ Lakhs)' : 'Sales by Category (₹ Lakhs)',
          font: { size: 13, color: '#0f172a' },
        },
        xaxis: { title: isRegionFocus ? 'Region' : 'Category' },
        yaxis: { title: 'Revenue (₹ Lakhs)', rangemode: 'tozero' },
        margin: { l: 45, r: 20, t: 40, b: 40 },
        height: 280,
      },
    };
  }

  // 10. Generate Key Insights
  const topProduct = productBreakdown[0] || { name: 'N/A', formattedValue: '₹0' };
  const topCategory = categoryBreakdown[0] || { name: 'N/A', formattedValue: '₹0' };
  const topRegion = regionBreakdown[0] || { name: 'N/A', formattedValue: '₹0' };
  const growthSign = revGrowth >= 0 ? '+' : '';

  const keyInsights: string[] = [];

  if (prevRevenue > 0) {
    keyInsights.push(
      `Sales ${revGrowth >= 0 ? 'increased' : 'decreased'} by ${Math.abs(revGrowth).toFixed(1)}% compared with the previous month (${formatINR(curRevenue)} vs ${formatINR(prevRevenue)}).`
    );
  } else {
    keyInsights.push(`Total revenue reached ${formatINR(curRevenue)} across ${curOrders} transactions.`);
  }

  keyInsights.push(`${topProduct.name} generated the highest revenue among individual items (${topProduct.formattedValue}).`);
  keyInsights.push(`${topRegion.name} region generated the highest sales, contributing ${topRegion.formattedValue} (${topRegion.sharePct}% of total revenue).`);

  if (topCategory) {
    keyInsights.push(`The strongest category was ${topCategory.name}, capturing ${topCategory.formattedValue} (${topCategory.sharePct}% share).`);
  }

  // 11. "Why Analysis" Decomposition (when user asks "why did sales decrease/increase/change?")
  const isWhyQuery = qLower.includes('why') || qLower.includes('reason') || qLower.includes('cause') || qLower.includes('driver');
  let whyAnalysis: AnalyticsResponse['whyAnalysis'] = undefined;

  if (isWhyQuery || qLower.includes('increase') || qLower.includes('decrease') || qLower.includes('summary')) {
    const productContributions = productBreakdown.slice(0, 4).map((p) => {
      const pRev = prevProdMap.get(p.name) || 0;
      const diff = p.value - pRev;
      const pct = pRev > 0 ? (diff / pRev) * 100 : 0;
      return {
        name: p.name,
        changeAmount: diff,
        changePct: Math.round(pct * 10) / 10,
        text: `${diff >= 0 ? '+' : ''}${formatINR(diff)} (${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%)`,
      };
    });

    const regionContributions = regionBreakdown.map((r) => {
      const pRev = prevRegionMap.get(r.name) || 0;
      const diff = r.value - pRev;
      const pct = pRev > 0 ? (diff / pRev) * 100 : 0;
      return {
        name: r.name,
        changeAmount: diff,
        changePct: Math.round(pct * 10) / 10,
        text: `${diff >= 0 ? '+' : ''}${formatINR(diff)} (${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%)`,
      };
    });

    const volumeText = `Total units sold shifted from ${prevUnits} to ${curUnits} (${unitsGrowth >= 0 ? '+' : ''}${unitsGrowth.toFixed(1)}%), while average order value changed by ${aovGrowth >= 0 ? '+' : ''}${aovGrowth.toFixed(1)}%.`;

    whyAnalysis = {
      summary: `Overall sales changed by ${growthSign}${revGrowth.toFixed(1)}% (${formatINR(curRevenue - prevRevenue)}). The primary observed variance was driven by volume growth and strong demand in the ${topCategory.name} category. Note: These figures represent observed mathematical contributions from actual transaction records.`,
      productContributions,
      regionContributions,
      volumeImpact: volumeText,
    };
  }

  // 12. Context-Aware Follow-Up Suggestions
  const followUpSuggestions: string[] = [];
  if (!qLower.includes('compare')) {
    followUpSuggestions.push('Compare last month with the previous month');
  }
  if (!qLower.includes('product') && !qLower.includes('item')) {
    followUpSuggestions.push("Show last month's sales by product");
    followUpSuggestions.push('Which product sold the most last month?');
  }
  if (!qLower.includes('region')) {
    followUpSuggestions.push("Show last month's sales by region");
    followUpSuggestions.push('What about South region?');
  }
  if (!isTrendQuery) {
    followUpSuggestions.push('Show the sales trend for the last 6 months');
  }
  if (!isWhyQuery) {
    followUpSuggestions.push('Why did sales change last month?');
  }

  // 13. Create Conversational Headline & Title
  let headline = `Here is the sales analysis for ${currentPeriod.label}`;
  if (regionFilter) headline += ` in the ${regionFilter} region`;
  if (categoryFilter) headline += ` for ${categoryFilter}`;
  headline += `. Total revenue reached ${formatINR(curRevenue)}, representing a ${growthSign}${revGrowth.toFixed(1)}% change vs previous month.`;

  return {
    id: `ans-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    query,
    title: `${currentPeriod.label.toUpperCase()} SALES`,
    headline,
    timePeriodLabel: currentPeriod.label,
    metrics: {
      totalRevenue: {
        label: 'Total Revenue',
        currentValue: curRevenue,
        formattedCurrent: formatINR(curRevenue),
        previousValue: prevRevenue,
        formattedPrevious: formatINR(prevRevenue),
        changeValue: curRevenue - prevRevenue,
        formattedChange: `${growthSign}${formatINR(curRevenue - prevRevenue)}`,
        growthPct: Math.round(revGrowth * 10) / 10,
        isPositive: revGrowth >= 0,
      },
      totalOrders: {
        label: 'Total Orders',
        currentValue: curOrders,
        formattedCurrent: curOrders.toLocaleString(),
        previousValue: prevOrders,
        formattedPrevious: prevOrders.toLocaleString(),
        growthPct: Math.round(ordersGrowth * 10) / 10,
        isPositive: ordersGrowth >= 0,
      },
      unitsSold: {
        label: 'Units Sold',
        currentValue: curUnits,
        formattedCurrent: curUnits.toLocaleString(),
        previousValue: prevUnits,
        formattedPrevious: prevUnits.toLocaleString(),
        growthPct: Math.round(unitsGrowth * 10) / 10,
        isPositive: unitsGrowth >= 0,
      },
      avgOrderValue: {
        label: 'Avg Order Value',
        currentValue: curAOV,
        formattedCurrent: formatINR(curAOV),
        previousValue: prevAOV,
        formattedPrevious: formatINR(prevAOV),
        growthPct: Math.round(aovGrowth * 10) / 10,
        isPositive: aovGrowth >= 0,
      },
    },
    chart,
    productBreakdown,
    regionBreakdown,
    categoryBreakdown,
    keyInsights,
    whyAnalysis,
    dailyDetails,
    followUpSuggestions: followUpSuggestions.slice(0, 5),
    contextUpdated: {
      lastTimePeriod: currentPeriod,
      lastComparisonPeriod: prevPeriod,
      lastRegion: regionFilter,
      lastCategory: categoryFilter,
      lastQuery: query,
    },
  };
}
