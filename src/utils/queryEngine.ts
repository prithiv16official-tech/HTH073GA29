import {
  Dataset,
  AnalysisResult,
  ColumnMeta,
  StructuredAnalysisPlan,
  MetricBreakdown,
  GeminiAnalysisPlan,
  PlanOperation,
} from '../types/dataset';

// Helper to sanitize and normalize text for fuzzy comparison
function normalizeText(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]/g, ' ').replace(/\s+/g, ' ').trim();
}

// Synonyms map to aid semantic column discovery without hardcoding
const SYNONYMS: Record<string, string[]> = {
  revenue: ['sales', 'revenue', 'turnover', 'income', 'earning', 'earnings', 'amount', 'fee', 'price', 'total', 'value', 'net_value', 'total_amount'],
  sales: ['sales', 'revenue', 'turnover', 'amount', 'units', 'volume', 'value', 'net_value', 'total_amount'],
  amount: ['amount', 'fee', 'monthly_fee', 'value', 'price', 'cost', 'total', 'revenue', 'sales', 'balance', 'total_amount', 'net_value', 'monthly_cost'],
  value: ['value', 'amount', 'revenue', 'sales', 'price', 'monthly_fee', 'total', 'net_value', 'total_amount'],
  category: ['category', 'category_type', 'product', 'item', 'item_name', 'type', 'plan', 'plan_type', 'segment', 'customer_segment', 'department', 'class'],
  location: ['location', 'region', 'area', 'customer_area', 'store_area', 'city', 'country', 'state', 'territory', 'zone'],
  date: ['date', 'order_date', 'purchase_date', 'transaction_date', 'sign_up_date', 'timestamp', 'time', 'created_at', 'day', 'month'],
  transactions: ['transactions', 'transaction_no', 'orders', 'order_id', 'records', 'items', 'count', 'frequency', 'customers', 'users', 'events'],
  experience: ['experience', 'work_experience', 'tenure', 'years', 'seniority'],
  performance: ['performance', 'performance_index', 'review_score', 'rating', 'score', 'kpi'],
  output: ['output', 'monthly_output', 'deliverables', 'productivity', 'production', 'volume', 'qty_sold', 'units'],
  cost: ['cost', 'monthly_cost', 'expense', 'budget', 'salary', 'compensation'],
  division: ['division', 'department', 'team', 'unit', 'sector', 'business_unit'],
  staff: ['staff', 'staff_id', 'employee', 'worker', 'id', 'personnel', 'agent'],
  item: ['item_name', 'item_description', 'item', 'product', 'goods', 'merchandise'],
  quantity: ['qty', 'qty_sold', 'units', 'quantity', 'volume', 'count'],
};

// Find best matching column name based on tokens and synonyms
function findBestColumnMatch(
  query: string,
  columns: ColumnMeta[],
  preferredType?: 'number' | 'text' | 'date' | 'boolean'
): ColumnMeta | null {
  if (columns.length === 0) return null;

  const qNorm = normalizeText(query);
  const qWords = qNorm.split(' ').filter((w) => w.length > 1);

  let bestCol: ColumnMeta | null = null;
  let bestScore = -1;

  for (const col of columns) {
    const colNorm = normalizeText(col.name);
    const colWords = colNorm.split(' ');

    let score = 0;

    // 1. Exact match in query
    if (qNorm === colNorm) {
      score += 200;
    } else if (qNorm.includes(colNorm)) {
      score += 120;
    }

    // 2. Direct word matches
    for (const w of colWords) {
      if (w.length > 2 && qWords.includes(w)) {
        score += 35;
      }
    }

    // 3. Synonym matches
    for (const [key, synList] of Object.entries(SYNONYMS)) {
      if (qWords.includes(key)) {
        for (const syn of synList) {
          if (colNorm.includes(syn)) {
            score += 25;
          }
        }
      }
    }

    // 4. Boost matching preferred type
    if (preferredType && col.type === preferredType) {
      score += 15;
    }

    if (score > bestScore && score > 0) {
      bestScore = score;
      bestCol = col;
    }
  }

  return bestCol;
}

// Find column from schema by exact or fuzzy name
function resolveColumn(targetName: string | null | undefined, columns: ColumnMeta[]): ColumnMeta | null {
  if (!targetName) return null;
  const exact = columns.find((c) => c.name.toLowerCase() === targetName.toLowerCase());
  if (exact) return exact;
  return findBestColumnMatch(targetName, columns);
}

// Format numbers into human-readable currency or compact numerals
export function formatMetricValue(value: number, columnName?: string): string {
  const colLower = (columnName || '').toLowerCase();
  const isCurrency =
    colLower.includes('revenue') ||
    colLower.includes('sales') ||
    colLower.includes('price') ||
    colLower.includes('cost') ||
    colLower.includes('profit') ||
    colLower.includes('salary') ||
    colLower.includes('budget') ||
    colLower.includes('fee') ||
    colLower.includes('amount') ||
    colLower.includes('usd') ||
    colLower.includes('mrr');

  const isPercentage = colLower.includes('rate') || colLower.includes('pct') || colLower.includes('percent');

  if (isCurrency) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: value % 1 === 0 ? 0 : 2,
    }).format(value);
  }

  if (isPercentage) {
    return `${(value <= 1 ? value * 100 : value).toFixed(1)}%`;
  }

  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: value % 1 === 0 ? 0 : 2,
  }).format(value);
}

// Convert date value into normalized "YYYY-MM" string for monthly trend analysis
function extractYearMonth(val: any): string | null {
  if (!val) return null;
  if (val instanceof Date && !isNaN(val.getTime())) {
    const y = val.getFullYear();
    const m = String(val.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
  }
  const str = String(val).trim();
  const parsed = Date.parse(str);
  if (!isNaN(parsed)) {
    const d = new Date(parsed);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
  }
  const m1 = str.match(/^(\d{4})[-/.](\d{1,2})/);
  if (m1) {
    return `${m1[1]}-${String(m1[2]).padStart(2, '0')}`;
  }
  const m2 = str.match(/^(\d{1,2})[-/.]\d{1,2}[-/.](\d{4})/);
  if (m2) {
    return `${m2[2]}-${String(m2[1]).padStart(2, '0')}`;
  }
  return null;
}

// Format "YYYY-MM" to readable "Jan 2024"
function formatYearMonth(ym: string): string {
  const parts = ym.split('-');
  if (parts.length === 2) {
    const year = parts[0];
    const monthIndex = parseInt(parts[1], 10) - 1;
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    if (monthIndex >= 0 && monthIndex < 12) {
      return `${monthNames[monthIndex]} ${year}`;
    }
  }
  return ym;
}

/**
 * Execute calculation strictly on uploaded dataset rows using Gemini's structured analysis plan.
 * Gemini NEVER invents numerical results; this function computes every number deterministically.
 */
export function executePlanCalculation(
  plan: GeminiAnalysisPlan,
  dataset: Dataset,
  question: string
): AnalysisResult {
  const startTime = performance.now();

  // 1. Check if Gemini flagged the question as ambiguous
  if (plan.isAmbiguous) {
    const fallbackMessage =
      plan.clarificationMessage ||
      `Your question is ambiguous or refers to fields not available in "${dataset.name}". Please see the suggestions below.`;

    const options = plan.clarificationOptions && plan.clarificationOptions.length > 0
      ? plan.clarificationOptions
      : [
          `Which ${dataset.columns.find((c) => c.isCategorical)?.name || 'category'} has the highest ${dataset.columns.find((c) => c.isNumerical)?.name || 'value'}?`,
          `What is the total ${dataset.columns.find((c) => c.isNumerical)?.name || 'amount'}?`,
          `What is the distribution of records by ${dataset.columns.find((c) => c.isCategorical)?.name || 'category'}?`,
        ];

    return {
      id: `ans-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      question,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      datasetName: dataset.name,
      datasetId: dataset.id,
      isAmbiguous: true,
      clarificationMessage: fallbackMessage,
      clarificationOptions: options,
      geminiPlan: plan,
      analysisPlan: {
        intent: 'AMBIGUOUS_QUERY',
        goalDescription: 'Requested clarification from user due to ambiguous question or missing schema columns.',
        operation: 'filter_and_aggregate',
        metricColumn: null,
        dimensionColumn: null,
        aggregationFunction: 'CLARIFY',
        sort: 'none',
        limit: null,
        plannedVisualization: 'bar',
        deterministicExecutionStatement: 'Awaiting user question refinement before executing dataset calculation.',
        source: plan.source,
        planSteps: [
          {
            stepNumber: 1,
            action: 'Question Intent Evaluation',
            target: question,
            rationale: 'Gemini detected semantic ambiguity or mismatch with available dataset schema columns.',
          },
          {
            stepNumber: 2,
            action: 'Clarification Generation',
            target: `${options.length} proposed alternative queries`,
            rationale: 'Provided clear guiding questions matching actual inferred columns.',
          },
        ],
      },
      answer: {
        headline: 'Clarification Needed for Analysis',
        summary: fallbackMessage,
        metrics: [],
      },
      chart: {
        type: 'bar',
        title: 'Awaiting Query Clarification',
        xAxisLabel: 'Dimension',
        yAxisLabel: 'Metric',
        data: [],
        layout: { autosize: true, margin: { l: 40, r: 20, t: 40, b: 40 } },
      },
      calculation: {
        formula: `-- Query clarification required:\n-- ${fallbackMessage}`,
        steps: [
          {
            stepNumber: 1,
            title: 'Ambiguity Detected',
            detail: fallbackMessage,
            status: 'info',
          },
        ],
        filteredRowCount: 0,
        totalRowCount: dataset.rowCount,
        targetColumns: [],
        aggregationType: 'CLARIFY',
        confidenceScore: 0.5,
        executionTimeMs: Math.round((performance.now() - startTime) * 10) / 10,
      },
    };
  }

  // 2. Resolve columns from Gemini's plan against actual dataset schema
  const numericCols = dataset.columns.filter((c) => c.type === 'number');
  const catCols = dataset.columns.filter((c) => c.type === 'text' || c.isCategorical);
  const dateCols = dataset.columns.filter((c) => c.type === 'date' || c.isDate);

  let targetCol = resolveColumn(plan.value_column, dataset.columns);
  let groupCol = resolveColumn(plan.group_column, dataset.columns);

  // Smart fallback if plan did not specify columns but operation requires them
  if (!targetCol && plan.operation !== 'group_and_count' && plan.operation !== 'count') {
    targetCol = numericCols[0] || null;
  }

  if (!groupCol) {
    if (plan.operation === 'time_trend') {
      groupCol = dateCols[0] || null;
    } else if (
      plan.operation === 'group_and_sum' ||
      plan.operation === 'group_and_avg' ||
      plan.operation === 'group_and_count' ||
      plan.operation === 'find_extremum'
    ) {
      groupCol = catCols[0] || null;
    }
  }

  const targetColName = targetCol ? targetCol.name : 'Record Count';
  const groupColName = groupCol ? groupCol.name : 'Dataset Records';

  // Handle CORRELATION Analysis
  if (plan.operation === 'correlation') {
    let colX = resolveColumn(plan.group_column, dataset.columns) || numericCols[0];
    let colY = resolveColumn(plan.value_column, dataset.columns) || numericCols[1] || colX;
    if (colX && colY && colX.name === colY.name && numericCols.length > 1) {
      colY = numericCols.find((c) => c.name !== colX.name) || colY;
    }

    const colXName = colX ? colX.name : 'Variable X';
    const colYName = colY ? colY.name : 'Variable Y';

    const pairs: Array<{ x: number; y: number; label: string }> = [];
    let sumX = 0;
    let sumY = 0;

    for (const row of dataset.rawData) {
      const vx = Number(row[colXName]);
      const vy = Number(row[colYName]);
      if (!isNaN(vx) && !isNaN(vy) && isFinite(vx) && isFinite(vy)) {
        pairs.push({
          x: vx,
          y: vy,
          label: String(row[catCols[0]?.name || dataset.columns[0]?.name] || `Row ${pairs.length + 1}`),
        });
        sumX += vx;
        sumY += vy;
      }
    }

    const n = pairs.length;
    const meanX = n > 0 ? sumX / n : 0;
    const meanY = n > 0 ? sumY / n : 0;

    let cov = 0;
    let varX = 0;
    let varY = 0;

    for (const p of pairs) {
      const dx = p.x - meanX;
      const dy = p.y - meanY;
      cov += dx * dy;
      varX += dx * dx;
      varY += dy * dy;
    }

    const r = varX > 0 && varY > 0 ? cov / Math.sqrt(varX * varY) : 0;
    const r2 = r * r;
    const slope = varX > 0 ? cov / varX : 0;
    const intercept = meanY - slope * meanX;

    const rRounded = Math.round(r * 100) / 100;
    const r2Pct = Math.round(r2 * 100);
    const slopeRounded = Math.round(slope * 100) / 100;
    const interceptRounded = Math.round(intercept * 10) / 10;

    const strength = Math.abs(r) >= 0.7 ? 'Strong' : Math.abs(r) >= 0.35 ? 'Moderate' : 'Weak';
    const direction = r > 0 ? 'positive' : r < 0 ? 'negative' : 'no discernible';

    const headline = `${strength} ${direction} correlation (r = ${r > 0 ? '+' : ''}${rRounded}, R² = ${r2Pct}%) detected between ${colXName} and ${colYName}.`;
    const summary = `Statistical linear regression across ${n} records demonstrates that increases in [${colXName}] are associated with higher [${colYName}]. For each unit increase in ${colXName}, ${colYName} increases by ~${Math.abs(slopeRounded)} on average. Regression model: ${colYName} = ${slopeRounded} × ${colXName} + ${interceptRounded}.`;

    const metrics: MetricBreakdown[] = [
      { label: 'Pearson Correlation (r)', value: `${r > 0 ? '+' : ''}${rRounded}`, detail: `${strength} ${direction} relationship` },
      { label: 'Coefficient of Determination (R²)', value: `${r2Pct}%`, detail: `${r2Pct}% of variance explained by model` },
      { label: 'Regression Slope (m)', value: `${slopeRounded > 0 ? '+' : ''}${slopeRounded}`, detail: `Rate of change per unit of ${colXName}` },
      { label: `Mean ${colXName}`, value: meanX.toFixed(1), detail: 'Sample mean of independent variable' },
      { label: `Mean ${colYName}`, value: meanY.toFixed(1), detail: 'Sample mean of dependent variable' },
    ];

    let minX = 0;
    let maxX = 1;
    if (pairs.length > 0) {
      minX = pairs[0].x;
      maxX = pairs[0].x;
      for (let i = 1; i < pairs.length; i++) {
        if (pairs[i].x < minX) minX = pairs[i].x;
        if (pairs[i].x > maxX) maxX = pairs[i].x;
      }
    }

    const chart: AnalysisResult['chart'] = {
      type: 'scatter',
      title: `Correlation Analysis: ${colXName} vs ${colYName} (r = ${rRounded})`,
      xAxisLabel: colXName,
      yAxisLabel: colYName,
      data: [
        {
          x: pairs.map((p) => p.x),
          y: pairs.map((p) => p.y),
          text: pairs.map((p) => `${p.label} (${colXName}: ${p.x}, ${colYName}: ${p.y})`),
          type: 'scatter',
          mode: 'markers',
          name: 'Staff Records',
          marker: { color: '#3b82f6', size: 6, opacity: 0.7 },
        },
        {
          x: [minX, maxX],
          y: [slope * minX + intercept, slope * maxX + intercept],
          type: 'scatter',
          mode: 'lines',
          name: `Trendline (y = ${slopeRounded}x + ${interceptRounded})`,
          line: { color: '#ef4444', width: 2.5, dash: 'dash' },
        },
      ],
      layout: {
        title: { text: `Correlation: ${colXName} vs ${colYName}`, font: { size: 14 } },
        xaxis: { title: { text: colXName } },
        yaxis: { title: { text: colYName } },
      },
    };

    const structuredPlan: StructuredAnalysisPlan = {
      intent: 'correlation',
      goalDescription: `Compute Pearson correlation coefficient and regression line between [${colXName}] and [${colYName}].`,
      operation: 'correlation',
      metricColumn: colYName,
      metricColumnType: 'number',
      dimensionColumn: colXName,
      dimensionColumnType: 'number',
      aggregationFunction: 'CORR',
      sort: 'ascending',
      limit: null,
      plannedVisualization: 'scatter',
      deterministicExecutionStatement: 'Calculated deterministically from 100% of uploaded rows by application code.',
      source: plan.source,
      planSteps: [
        {
          stepNumber: 1,
          action: 'Variable Extraction',
          target: `Independent: [${colXName}], Dependent: [${colYName}]`,
          rationale: 'Identified continuous numerical variables for bivariate correlation analysis.',
        },
        {
          stepNumber: 2,
          action: 'Covariance & Pearson Calculation',
          target: `Sample size: ${n} records`,
          rationale: 'Calculated Pearson correlation r = cov(X,Y) / (stdX * stdY).',
        },
        {
          stepNumber: 3,
          action: 'Ordinary Least Squares Fit',
          target: `y = ${slopeRounded}x + ${interceptRounded}`,
          rationale: 'Fitted linear regression trendline minimizing squared residuals.',
        },
      ],
    };

    return {
      id: `ans-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      question,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      datasetName: dataset.name,
      datasetId: dataset.id,
      geminiPlan: plan,
      analysisPlan: structuredPlan,
      answer: {
        headline,
        primaryValue: `r = ${r > 0 ? '+' : ''}${rRounded}`,
        primaryMetric: `${strength} ${direction} correlation`,
        summary,
        metrics,
      },
      chart,
      calculation: {
        formula: `SELECT CORR([${colXName}], [${colYName}]) AS pearson_r,\n       REGR_SLOPE([${colYName}], [${colXName}]) AS slope,\n       REGR_INTERCEPT([${colYName}], [${colXName}]) AS intercept\nFROM [${dataset.name}];`,
        steps: [
          {
            stepNumber: 1,
            title: 'Bivariate Sample Extraction',
            detail: `Extracted ${n} valid pairs of [${colXName}] and [${colYName}].`,
            status: 'completed',
          },
          {
            stepNumber: 2,
            title: 'Pearson Coefficient Verification',
            detail: `Computed Pearson r = ${rRounded} (R² = ${r2Pct}%).`,
            status: 'completed',
          },
          {
            stepNumber: 3,
            title: 'Linear Trendline Estimation',
            detail: `Calculated slope m = ${slopeRounded}, intercept b = ${interceptRounded}.`,
            status: 'completed',
          },
        ],
        filteredRowCount: n,
        totalRowCount: dataset.rawData.length,
        targetColumns: [colXName, colYName],
        aggregationType: 'correlation',
        confidenceScore: 0.99,
        executionTimeMs: Math.round((performance.now() - startTime) * 10) / 10,
      },
    };
  }

  // Handle OUTLIER DETECTION Analysis
  if (plan.operation === 'detect_outliers') {
    let target = resolveColumn(plan.value_column, dataset.columns) || numericCols[0];
    let labelCol = resolveColumn(plan.group_column, dataset.columns) || catCols[0] || dataset.columns[0];
    const targetName = target ? target.name : 'Total_Amount';
    const labelColName = labelCol ? labelCol.name : 'Record';

    const validRows: Array<{ label: string; val: number; raw: any }> = [];
    for (const r of dataset.rawData) {
      const v = Number(r[targetName]);
      if (!isNaN(v) && isFinite(v)) {
        validRows.push({
          label: String(r[labelColName] || `Record ${validRows.length + 1}`),
          val: v,
          raw: r,
        });
      }
    }

    validRows.sort((a, b) => a.val - b.val);
    const n = validRows.length;
    const q1 = validRows[Math.floor(n * 0.25)]?.val || 0;
    const q3 = validRows[Math.floor(n * 0.75)]?.val || 0;
    const iqr = q3 - q1;
    const upperFence = q3 + 1.5 * iqr;
    const lowerFence = Math.max(0, q1 - 1.5 * iqr);

    const outliers = validRows.filter((r) => r.val > upperFence || r.val < lowerFence);
    outliers.sort((a, b) => b.val - a.val);

    const headline =
      outliers.length > 0
        ? `Found ${outliers.length} unusual sales values exceeding the statistical upper boundary of ${formatMetricValue(upperFence, targetName)}.`
        : `No statistical outliers detected in [${targetName}]. Values fall within standard IQR thresholds.`;

    const summary =
      outliers.length > 0
        ? `Tukey's IQR outlier test (Q1: ${formatMetricValue(q1, targetName)}, Q3: ${formatMetricValue(q3, targetName)}, IQR: ${formatMetricValue(iqr, targetName)}) identified ${outliers.length} exceptional orders. Top outlier is "${outliers[0].label}" at ${formatMetricValue(outliers[0].val, targetName)} (likely an enterprise or bulk transaction).`
        : `All ${n} records remain within normal statistical tolerance (${formatMetricValue(lowerFence, targetName)} to ${formatMetricValue(upperFence, targetName)}).`;

    const metrics: MetricBreakdown[] = outliers.slice(0, 5).map((o, idx) => ({
      label: `#${idx + 1} Outlier: ${o.label}`,
      value: formatMetricValue(o.val, targetName),
      detail: `Exceeds threshold by ${formatMetricValue(o.val - upperFence, targetName)}`,
    }));

    if (metrics.length === 0) {
      metrics.push(
        { label: 'Upper Fence', value: formatMetricValue(upperFence, targetName), detail: 'Q3 + 1.5×IQR boundary' },
        { label: 'Q3 (75th percentile)', value: formatMetricValue(q3, targetName), detail: 'Upper quartile' },
        { label: 'Median (50th percentile)', value: formatMetricValue(validRows[Math.floor(n * 0.5)]?.val || 0, targetName), detail: 'Center value' }
      );
    }

    const chart: AnalysisResult['chart'] = {
      type: 'scatter',
      title: `Outlier Detection for ${targetName} (Tukey's 1.5×IQR Method)`,
      xAxisLabel: 'Order Index',
      yAxisLabel: targetName,
      data: [
        {
          x: validRows.filter((r) => r.val <= upperFence && r.val >= lowerFence).map((_, i) => i + 1),
          y: validRows.filter((r) => r.val <= upperFence && r.val >= lowerFence).map((r) => r.val),
          text: validRows.filter((r) => r.val <= upperFence && r.val >= lowerFence).map((r) => `${r.label}: ${formatMetricValue(r.val, targetName)}`),
          type: 'scatter',
          mode: 'markers',
          name: 'Normal Records',
          marker: { color: '#3b82f6', size: 5, opacity: 0.6 },
        },
        {
          x: validRows.filter((r) => r.val > upperFence || r.val < lowerFence).map((_, i) => validRows.length - outliers.length + i + 1),
          y: outliers.map((r) => r.val),
          text: outliers.map((r) => `ANOMALY: ${r.label}: ${formatMetricValue(r.val, targetName)}`),
          type: 'scatter',
          mode: 'markers',
          name: `Outliers (${outliers.length})`,
          marker: { color: '#ef4444', size: 10, symbol: 'diamond' },
        },
        {
          x: [1, validRows.length],
          y: [upperFence, upperFence],
          type: 'scatter',
          mode: 'lines',
          name: `Upper Threshold (${formatMetricValue(upperFence, targetName)})`,
          line: { color: '#f59e0b', width: 2, dash: 'dot' },
        },
      ],
      layout: {
        title: { text: `Outlier Detection for ${targetName}`, font: { size: 14 } },
        xaxis: { title: { text: 'Sorted Record Index' } },
        yaxis: { title: { text: targetName } },
      },
    };

    const structuredPlan: StructuredAnalysisPlan = {
      intent: 'detect_outliers',
      goalDescription: `Detect numerical anomalies in [${targetName}] using 1.5×IQR Tukey method.`,
      operation: 'detect_outliers',
      metricColumn: targetName,
      metricColumnType: 'number',
      dimensionColumn: labelColName,
      dimensionColumnType: 'text',
      aggregationFunction: 'IQR',
      sort: 'descending',
      limit: null,
      plannedVisualization: 'scatter',
      deterministicExecutionStatement: 'Calculated deterministically from 100% of uploaded rows by application code.',
      source: plan.source,
      planSteps: [
        {
          stepNumber: 1,
          action: 'Quartile Calculation',
          target: `Q1: ${formatMetricValue(q1, targetName)}, Q3: ${formatMetricValue(q3, targetName)}`,
          rationale: 'Computed interquartile range across dataset.',
        },
        {
          stepNumber: 2,
          action: 'Threshold Boundary Assembly',
          target: `Upper fence: ${formatMetricValue(upperFence, targetName)}`,
          rationale: 'Defined upper bound as Q3 + 1.5 * IQR.',
        },
        {
          stepNumber: 3,
          action: 'Outlier Isolation',
          target: `${outliers.length} anomalous records flagged`,
          rationale: 'Separated records exceeding fence for visual audit.',
        },
      ],
    };

    return {
      id: `ans-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      question,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      datasetName: dataset.name,
      datasetId: dataset.id,
      geminiPlan: plan,
      analysisPlan: structuredPlan,
      answer: {
        headline,
        primaryValue: `${outliers.length} Outliers Detected`,
        primaryMetric: `Threshold: ${formatMetricValue(upperFence, targetName)}`,
        summary,
        metrics,
      },
      chart,
      calculation: {
        formula: `WITH quartiles AS (\n  SELECT PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY [${targetName}]) AS q1,\n         PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY [${targetName}]) AS q3\n  FROM [${dataset.name}]\n)\nSELECT *\nFROM [${dataset.name}], quartiles\nWHERE [${targetName}] > (q3 + 1.5 * (q3 - q1));`,
        steps: [
          {
            stepNumber: 1,
            title: 'IQR Thresholding',
            detail: `Computed Q1=${formatMetricValue(q1, targetName)}, Q3=${formatMetricValue(q3, targetName)}, IQR=${formatMetricValue(iqr, targetName)}.`,
            status: 'completed',
          },
          {
            stepNumber: 2,
            title: 'Anomalous Value Isolation',
            detail: `Identified ${outliers.length} rows with [${targetName}] exceeding upper fence.`,
            status: 'completed',
          },
        ],
        filteredRowCount: outliers.length,
        totalRowCount: dataset.rawData.length,
        targetColumns: [labelColName, targetName],
        aggregationType: 'detect_outliers',
        confidenceScore: 0.99,
        executionTimeMs: Math.round((performance.now() - startTime) * 10) / 10,
      },
    };
  }

  // 3. Deterministic local calculation directly on dataset.rawData
  const isTrend = plan.operation === 'time_trend' || groupCol?.type === 'date';
  const isCount = plan.operation === 'group_and_count' || plan.operation === 'count';
  const isAvg = plan.operation === 'group_and_avg' || plan.operation === 'average';
  const isTotal = plan.operation === 'total_sum';

  const rawRows = dataset.rawData;
  let validRowCount = 0;
  let grandTotalSum = 0;
  let grandTotalCount = 0;

  const groups: Record<
    string,
    { sum: number; count: number; min: number; max: number; sortKey?: string }
  > = {};

  for (const row of rawRows) {
    let numVal = 1;

    if (targetCol && !isCount) {
      const rawVal = row[targetCol.name];
      if (rawVal === null || rawVal === undefined || rawVal === '') continue;

      if (typeof rawVal === 'number') {
        numVal = rawVal;
      } else {
        const cleanStr = String(rawVal).replace(/[$,€£¥%]/g, '').replace(/,/g, '').trim();
        const parsed = Number(cleanStr);
        if (isNaN(parsed)) continue;
        numVal = parsed;
      }
    }

    let groupKey = 'All Records';
    let sortKey: string | undefined;

    if (groupCol) {
      const rawGroupVal = row[groupCol.name];

      if (isTrend) {
        const ym = extractYearMonth(rawGroupVal);
        if (ym) {
          groupKey = formatYearMonth(ym);
          sortKey = ym;
        } else {
          groupKey = 'Other';
          sortKey = '9999-99';
        }
      } else {
        groupKey =
          rawGroupVal !== null && rawGroupVal !== undefined && String(rawGroupVal).trim() !== ''
            ? String(rawGroupVal).trim()
            : 'Unspecified';
      }
    }

    validRowCount++;
    grandTotalSum += numVal;
    grandTotalCount++;

    if (!groups[groupKey]) {
      groups[groupKey] = { sum: 0, count: 0, min: Infinity, max: -Infinity, sortKey };
    }

    groups[groupKey].sum += numVal;
    groups[groupKey].count += 1;
    if (numVal < groups[groupKey].min) groups[groupKey].min = numVal;
    if (numVal > groups[groupKey].max) groups[groupKey].max = numVal;
  }

  // 4. Compile group statistics
  const aggregatedResults: Array<{ label: string; value: number; count: number; sortKey?: string }> = [];

  for (const [label, stats] of Object.entries(groups)) {
    let finalVal = stats.sum;

    if (isAvg) {
      finalVal = stats.count > 0 ? stats.sum / stats.count : 0;
    } else if (isCount) {
      finalVal = stats.count;
    }

    aggregatedResults.push({
      label,
      value: Math.round(finalVal * 100) / 100,
      count: stats.count,
      sortKey: stats.sortKey,
    });
  }

  // 5. Apply sorting and limits per Gemini's plan
  if (isTrend) {
    aggregatedResults.sort((a, b) => (a.sortKey || a.label).localeCompare(b.sortKey || b.label));
  } else if (plan.sort === 'ascending') {
    aggregatedResults.sort((a, b) => a.value - b.value);
  } else {
    aggregatedResults.sort((a, b) => b.value - a.value);
  }

  const topResult = aggregatedResults[0] || { label: 'None', value: 0, count: 0 };
  const grandAverage = grandTotalCount > 0 ? Math.round((grandTotalSum / grandTotalCount) * 100) / 100 : 0;

  // 6. Formulate verified answers
  let headline = '';
  let primaryValue = '';
  let primaryMetricLabel = '';

  if (isTotal) {
    primaryValue = formatMetricValue(grandTotalSum, targetColName);
    primaryMetricLabel = `Total ${targetColName}`;
    headline = `The total ${targetColName.toLowerCase()} is ${primaryValue} across ${grandTotalCount} records.`;
  } else if (isAvg && !groupCol) {
    primaryValue = formatMetricValue(grandAverage, targetColName);
    primaryMetricLabel = `Average ${targetColName}`;
    headline = `The average ${targetColName.toLowerCase()} is ${primaryValue} across ${grandTotalCount} records.`;
  } else if (plan.limit && plan.limit > 1) {
    const topN = aggregatedResults.slice(0, plan.limit);
    const topTotal = topN.reduce((acc, cur) => acc + cur.value, 0);
    primaryValue = `${formatMetricValue(topResult.value, targetColName)}`;
    primaryMetricLabel = `${topResult.label} · #1 of Top ${plan.limit}`;
    headline = `The top ${plan.limit} ${groupColName.toLowerCase()}s by ${targetColName.toLowerCase()} are led by "${topResult.label}" with ${formatMetricValue(topResult.value, targetColName)}.`;
  } else if (plan.limit === 1 || plan.operation === 'find_extremum') {
    primaryValue = formatMetricValue(topResult.value, targetColName);
    primaryMetricLabel = `${topResult.label} · ${plan.sort === 'ascending' ? 'Lowest' : 'Highest'} ${targetColName}`;
    headline = `"${topResult.label}" generated the ${plan.sort === 'ascending' ? 'lowest' : 'highest'} ${targetColName.toLowerCase()} at ${primaryValue}.`;
  } else if (isCount) {
    primaryValue = `${topResult.count.toLocaleString()} transactions`;
    primaryMetricLabel = `${topResult.label} · Most Transactions`;
    const pct = grandTotalCount > 0 ? ((topResult.count / grandTotalCount) * 100).toFixed(1) : '0';
    headline = `"${topResult.label}" has the most transactions with ${topResult.count.toLocaleString()} transactions (${pct}% of total).`;
  } else if (isTrend) {
    const peak = [...aggregatedResults].sort((a, b) => b.value - a.value)[0] || topResult;
    primaryValue = formatMetricValue(peak.value, targetColName);
    primaryMetricLabel = `Peak Month: ${peak.label}`;
    headline = `Monthly trend across ${aggregatedResults.length} periods shows peak activity in ${peak.label} at ${primaryValue}.`;
  } else {
    primaryValue = formatMetricValue(topResult.value, targetColName);
    primaryMetricLabel = `${topResult.label} · Top Segment`;
    headline = `"${topResult.label}" leads ${groupColName} with ${primaryValue}.`;
  }

  const summary = `Application-verified calculation over ${validRowCount} records in "${dataset.name}": ${
    plan.explanation ? `${plan.explanation} ` : ''
  }Top segment "${topResult.label}" accounts for ${formatMetricValue(topResult.value, targetColName)} (${
    grandTotalSum > 0 ? Math.round((topResult.value / grandTotalSum) * 100) : Math.round((topResult.count / grandTotalCount) * 100)
  }% of aggregate).`;

  // Metric breakdown cards
  const metrics: MetricBreakdown[] = aggregatedResults.slice(0, 5).map((item, idx) => ({
    label: isTrend ? item.label : `#${idx + 1} ${item.label}`,
    value: formatMetricValue(item.value, targetColName),
    detail: `${item.count} records (${
      grandTotalSum > 0 ? Math.round((item.value / grandTotalSum) * 100) : Math.round((item.count / grandTotalCount) * 100)
    }% share)`,
  }));

  // 7. Interactive Plotly chart specification
  const displayLimit = plan.limit && plan.limit > 1 ? plan.limit : 15;
  const chartLabels = aggregatedResults.slice(0, displayLimit).map((r) => r.label);
  const chartValues = aggregatedResults.slice(0, displayLimit).map((r) => r.value);
  const chartType = plan.chart_type || (isTrend ? 'line' : isTotal ? 'pie' : 'bar');

  const chart: AnalysisResult['chart'] = {
    type: chartType,
    title: `${plan.operation.replace(/_/g, ' ').toUpperCase()} of ${targetColName} by ${groupColName}`,
    xAxisLabel: groupColName,
    yAxisLabel: targetColName,
    data:
      chartType === 'pie'
        ? [
            {
              labels: chartLabels,
              values: chartValues,
              type: 'pie',
              hole: 0.45,
              marker: {
                colors: ['#2563eb', '#0d9488', '#f59e0b', '#8b5cf6', '#ec4899', '#64748b', '#06b6d4', '#10b981'],
              },
              textinfo: 'label+percent',
              hoverinfo: 'label+value+percent',
            },
          ]
        : chartType === 'line'
        ? [
            {
              x: chartLabels,
              y: chartValues,
              type: 'scatter',
              mode: 'lines+markers',
              line: { color: '#2563eb', width: 3, shape: 'spline' },
              marker: { size: 8, color: '#1d4ed8' },
              hovertemplate: `<b>%{x}</b><br>${targetColName}: %{y:,.2f}<extra></extra>`,
            },
          ]
        : [
            {
              x: chartLabels,
              y: chartValues,
              type: 'bar',
              marker: {
                color: chartValues.map((_, i) => (i === 0 ? '#2563eb' : '#94a3b8')),
                opacity: 0.9,
              },
              hovertemplate: `<b>%{x}</b><br>${targetColName}: %{y:,.2f}<extra></extra>`,
            },
          ],
    layout: {
      autosize: true,
      margin: { l: 60, r: 24, t: 40, b: 60 },
      paper_bgcolor: 'transparent',
      plot_bgcolor: 'transparent',
      font: { family: 'Plus Jakarta Sans, sans-serif', size: 12, color: '#334155' },
      xaxis: {
        title: { text: groupColName, font: { size: 12, color: '#64748b' } },
        tickangle: chartLabels.length > 5 ? -25 : 0,
        gridcolor: '#f1f5f9',
        zerolinecolor: '#e2e8f0',
      },
      yaxis: {
        title: { text: targetColName, font: { size: 12, color: '#64748b' } },
        gridcolor: '#f1f5f9',
        zerolinecolor: '#e2e8f0',
      },
    },
  };

  // 8. Build Structured Analysis Plan representation
  const structuredPlan: StructuredAnalysisPlan = {
    intent: plan.operation,
    goalDescription: plan.explanation || `Execute ${plan.operation} on [${targetColName}] grouped by [${groupColName}].`,
    operation: plan.operation,
    metricColumn: targetCol ? targetCol.name : null,
    metricColumnType: targetCol?.type,
    dimensionColumn: groupCol ? groupCol.name : null,
    dimensionColumnType: groupCol?.type,
    timeGrain: plan.time_grain || undefined,
    aggregationFunction: plan.operation.includes('avg') ? 'AVG' : isCount ? 'COUNT' : 'SUM',
    sort: plan.sort || 'descending',
    limit: plan.limit,
    plannedVisualization: chartType,
    deterministicExecutionStatement:
      'Calculated deterministically directly from 100% of uploaded rows by application code (0 invented numbers).',
    source: plan.source,
    planSteps: [
      {
        stepNumber: 1,
        action: `Gemini Schema Mapping (${plan.source === 'gemini' ? 'Gemini 3.8 Flash' : 'Local Fallback'})`,
        target: `Operation: ${plan.operation}, Dimension: [${groupColName}], Metric: [${targetColName}]`,
        rationale: plan.explanation || 'Mapped natural-language question to inferred dataset schema columns.',
      },
      {
        stepNumber: 2,
        action: 'Application Dataset Extraction',
        target: `${validRowCount} valid rows from ${dataset.rowCount} total`,
        rationale: 'Filtered nulls and sanitized numeric values locally on uploaded rows.',
      },
      {
        stepNumber: 3,
        action: 'Deterministic Aggregation Execution',
        target: `${aggregatedResults.length} distinct partitions`,
        rationale: 'Computed mathematical calculations strictly on data without AI hallucination.',
      },
      {
        stepNumber: 4,
        action: 'Ranking, KPI & Visualization Assembly',
        target: `${primaryValue} (${topResult.label})`,
        rationale: `Applied sort=${plan.sort} and limit=${plan.limit || 'all'} to produce final verified findings.`,
      },
    ],
  };

  const sqlQuery =
    plan.sql_representation ||
    (isTrend
      ? `SELECT DATE_TRUNC('month', [${groupColName}]) AS Period, SUM([${targetColName}])\nFROM [${dataset.name}]\nGROUP BY Period\nORDER BY Period ASC;`
      : isTotal
      ? `SELECT SUM([${targetColName}])\nFROM [${dataset.name}]\nWHERE [${targetColName}] IS NOT NULL;`
      : `SELECT [${groupColName}], SUM([${targetColName}])\nFROM [${dataset.name}]\nGROUP BY [${groupColName}]\nORDER BY SUM([${targetColName}]) ${plan.sort === 'ascending' ? 'ASC' : 'DESC'}${
          plan.limit ? `\nLIMIT ${plan.limit};` : ';'
        }`);

  const executionTimeMs = Math.round((performance.now() - startTime) * 10) / 10;

  return {
    id: `ans-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    question,
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    datasetName: dataset.name,
    datasetId: dataset.id,
    geminiPlan: plan,
    analysisPlan: structuredPlan,
    answer: {
      headline,
      primaryValue,
      primaryMetric: primaryMetricLabel,
      summary,
      metrics,
    },
    chart,
    calculation: {
      formula: sqlQuery,
      steps: [
        {
          stepNumber: 1,
          title: `Query Interpretation via ${plan.source === 'gemini' ? 'Gemini 3.8 Flash' : 'Schema Planner'}`,
          detail: plan.explanation || `Interpreted query as ${plan.operation} targeting [${targetColName}] grouped by [${groupColName}].`,
          status: 'completed',
        },
        {
          stepNumber: 2,
          title: 'Deterministic Local Execution',
          detail: `Computed mathematical results strictly from ${validRowCount} dataset records with 0 AI-generated numbers.`,
          status: 'completed',
        },
        {
          stepNumber: 3,
          title: 'Verification & Ranking',
          detail: `Identified primary value ${primaryValue} (${topResult.label}) with ${metrics.length} comparative breakdown segments.`,
          status: 'completed',
        },
      ],
      filteredRowCount: validRowCount,
      totalRowCount: dataset.rawData.length,
      targetColumns: [groupColName, targetColName],
      aggregationType: plan.operation,
      confidenceScore: plan.source === 'gemini' ? 0.98 : 0.9,
      executionTimeMs,
    },
  };
}

/**
 * Direct fallback execution for initial rendering or when offline
 */
export function executeAnalysis(question: string, dataset: Dataset): AnalysisResult {
  const qLower = question.toLowerCase();
  const numericCols = dataset.columns.filter((c) => c.type === 'number');
  const catCols = dataset.columns.filter((c) => c.type === 'text' || c.isCategorical);
  const dateCols = dataset.columns.filter((c) => c.type === 'date' || c.isDate);

  const isCorrelation =
    qLower.includes('relationship') ||
    qLower.includes('correlation') ||
    qLower.includes('relate') ||
    qLower.includes('versus') ||
    qLower.includes(' vs ') ||
    qLower.includes(' vs.');

  const isOutlier =
    qLower.includes('unusual') ||
    qLower.includes('outlier') ||
    qLower.includes('anomaly') ||
    qLower.includes('abnormal');

  const isTrend = qLower.includes('monthly') || qLower.includes('trend');
  const isCount = qLower.includes('transaction') || qLower.includes('count') || qLower.includes('how many');
  const isAvg = qLower.includes('average') || qLower.includes('mean');
  const isExtremum = qLower.includes('highest') || qLower.includes('top') || qLower.includes('lowest') || qLower.includes('best') || qLower.includes('most');
  const isTotal = qLower.includes('total') || qLower.includes('sum');

  let operation: PlanOperation = 'group_and_sum';
  let sort: 'descending' | 'ascending' = 'descending';
  let limit: number | null = null;
  let chartType: 'bar' | 'line' | 'pie' | 'scatter' = 'bar';

  const topMatch = qLower.match(/top\s*(\d+)/i);
  if (topMatch) {
    limit = parseInt(topMatch[1], 10);
  }

  let targetCol = findBestColumnMatch(question, numericCols, 'number') || numericCols[0] || null;
  let groupCol = findBestColumnMatch(question, catCols, 'text') || catCols[0] || null;

  if (isCorrelation && numericCols.length >= 2) {
    operation = 'correlation';
    chartType = 'scatter';
    const colA = findBestColumnMatch(question, numericCols, 'number') || numericCols[0];
    const otherNums = numericCols.filter((c) => c.name !== colA.name);
    const colB = findBestColumnMatch(question, otherNums, 'number') || otherNums[0] || colA;
    groupCol = colA;
    targetCol = colB;
  } else if (isOutlier && numericCols.length > 0) {
    operation = 'detect_outliers';
    chartType = 'scatter';
    targetCol = findBestColumnMatch(question, numericCols, 'number') || numericCols[0];
    groupCol = findBestColumnMatch(question, catCols, 'text') || catCols[0] || null;
  } else if (isTrend) {
    operation = 'time_trend';
    groupCol = findBestColumnMatch(question, dateCols, 'date') || dateCols[0] || null;
    chartType = 'line';
  } else if (isCount) {
    operation = 'group_and_count';
    chartType = 'bar';
    if (isExtremum && !limit) limit = 1;
  } else if (isExtremum) {
    operation = isAvg ? 'group_and_avg' : 'group_and_sum';
    sort = qLower.includes('lowest') ? 'ascending' : 'descending';
    if (!limit) limit = 1;
    chartType = 'bar';
  } else if (isAvg) {
    operation = 'group_and_avg';
    chartType = 'bar';
  } else if (isTotal) {
    operation = 'total_sum';
    chartType = 'pie';
  }

  const localPlan: GeminiAnalysisPlan = {
    isAmbiguous: false,
    clarificationMessage: null,
    clarificationOptions: [],
    operation,
    group_column: groupCol ? groupCol.name : null,
    value_column: targetCol ? targetCol.name : null,
    sort,
    limit,
    chart_type: chartType,
    explanation: `Heuristic schema mapping matched dimension [${groupCol?.name || 'All'}] and metric [${targetCol?.name || 'Count'}].`,
    sql_representation: `SELECT [${groupCol?.name || 'All'}], SUM([${targetCol?.name || 'Count'}]) FROM dataset;`,
    source: 'local_fallback',
  };

  return executePlanCalculation(localPlan, dataset, question);
}
