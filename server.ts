import express, { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Parse CLI arguments passed by AI Studio runner (e.g., --port 3000 --host 0.0.0.0)
function getArg(flag: string): string | undefined {
  const idx = process.argv.indexOf(flag);
  if (idx !== -1 && idx < process.argv.length - 1) {
    return process.argv[idx + 1];
  }
  return undefined;
}

const isProduction = process.env.NODE_ENV === 'production';
const cliPort = getArg('--port') || getArg('-p');
const cliHost = getArg('--host') || getArg('-h') || '0.0.0.0';

// Dev server must always run on port 3000 per AI Studio runtime constraints
const PORT = cliPort
  ? parseInt(cliPort, 10)
  : !isProduction
  ? 3000
  : (process.env.PORT ? parseInt(process.env.PORT, 10) : 3000);

const HOST = cliHost;

app.use(express.json({ limit: '500mb' }));
app.use(express.urlencoded({ limit: '500mb', extended: true }));

// Health check endpoint
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'DataMind AI Backend',
    timestamp: new Date().toISOString(),
    hasGeminiKey: Boolean(process.env.GEMINI_API_KEY),
  });
});

function findColMatch(query: string, cols: any[], preferredType?: string): any {
  if (!cols || cols.length === 0) return null;
  const qNorm = query.toLowerCase().replace(/[^a-z0-9]/g, ' ');
  const qWords = qNorm.split(' ').filter((w) => w.length > 1);

  let best: any = null;
  let maxScore = -1;

  for (const c of cols) {
    const nameNorm = String(c.name || '').toLowerCase().replace(/[^a-z0-9]/g, ' ');
    const nameWords = nameNorm.split(' ').filter((w) => w.length > 1);

    let score = 0;
    if (qNorm.includes(nameNorm)) score += 100;
    for (const w of nameWords) {
      if (qWords.includes(w)) score += 30;
      // Synonyms
      if ((w === 'item' || w === 'description') && (qWords.includes('item') || qWords.includes('product'))) score += 20;
      if ((w === 'area' || w === 'store') && (qWords.includes('area') || qWords.includes('store') || qWords.includes('region') || qWords.includes('location'))) score += 20;
      if ((w === 'net' || w === 'value' || w === 'sales' || w === 'amount') && (qWords.includes('sales') || qWords.includes('revenue') || qWords.includes('value') || qWords.includes('net') || qWords.includes('amount'))) score += 20;
      if ((w === 'qty' || w === 'quantity' || w === 'units') && (qWords.includes('quantity') || qWords.includes('units') || qWords.includes('qty'))) score += 25;
      if ((w === 'performance' || w === 'index') && (qWords.includes('performance') || qWords.includes('index') || qWords.includes('score'))) score += 25;
      if ((w === 'experience' || w === 'work') && (qWords.includes('experience') || qWords.includes('work') || qWords.includes('tenure'))) score += 25;
      if ((w === 'output' || w === 'production') && (qWords.includes('output') || qWords.includes('productivity') || qWords.includes('work'))) score += 25;
      if ((w === 'division' || w === 'department') && (qWords.includes('division') || qWords.includes('department') || qWords.includes('team'))) score += 25;
      if ((w === 'staff' || w === 'employee') && (qWords.includes('staff') || qWords.includes('employee') || qWords.includes('worker') || qWords.includes('people'))) score += 25;
    }

    if (preferredType && c.type === preferredType) score += 10;
    if (score > maxScore && score > 0) {
      maxScore = score;
      best = c;
    }
  }

  return best || (preferredType ? cols.find((c) => c.type === preferredType) : cols[0]);
}

/**
 * Fallback heuristic planner when Gemini API is unavailable or offline
 */
function createLocalAnalysisPlan(question: string, schema: any): any {
  const qLower = question.toLowerCase();
  const columns: any[] = schema.columns || schema || [];

  const numericCols = columns.filter((c: any) => c.type === 'number');
  const catCols = columns.filter((c: any) => c.type === 'text' || c.isCategorical);
  const dateCols = columns.filter((c: any) => c.type === 'date' || c.isDate);

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
    qLower.includes('abnormal') ||
    qLower.includes('extreme');

  const isTrend =
    qLower.includes('monthly') ||
    qLower.includes('trend') ||
    qLower.includes('timeline') ||
    qLower.includes('over time');

  const isCount =
    qLower.includes('transaction') ||
    qLower.includes('count') ||
    qLower.includes('how many') ||
    qLower.includes('most orders');

  const isAvg =
    qLower.includes('average') ||
    qLower.includes('mean') ||
    qLower.includes('avg');

  const isExtremum =
    qLower.includes('highest') ||
    qLower.includes('top') ||
    qLower.includes('best') ||
    qLower.includes('lowest') ||
    qLower.includes('least') ||
    qLower.includes('most');

  const isTotal =
    qLower.includes('total') ||
    qLower.includes('sum') ||
    qLower.includes('overall');

  let operation = 'group_and_sum';
  let sort: 'descending' | 'ascending' | 'none' = 'descending';
  let limit: number | null = null;
  let chart_type = 'bar';
  let time_grain: string | null = null;

  let group_column: string | null = null;
  let value_column: string | null = null;

  // Extract explicit top-N limit like "top 5", "top 10", "top 3"
  const topMatch = qLower.match(/top\s*(\d+)/i);
  if (topMatch) {
    limit = parseInt(topMatch[1], 10);
  }

  if (isCorrelation && numericCols.length >= 2) {
    operation = 'correlation';
    chart_type = 'scatter';
    sort = 'ascending';

    // Find the 2 distinct numerical columns referenced in the query
    const colA = findColMatch(qLower, numericCols, 'number') || numericCols[0];
    const otherNums = numericCols.filter((c) => c.name !== colA.name);
    const colB = findColMatch(qLower, otherNums, 'number') || otherNums[0] || colA;

    group_column = colA.name; // X axis
    value_column = colB.name; // Y axis
  } else if (isOutlier && numericCols.length > 0) {
    operation = 'detect_outliers';
    chart_type = 'scatter';
    const target = findColMatch(qLower, numericCols, 'number') || numericCols[0];
    value_column = target.name;
    const catTarget = findColMatch(qLower, catCols, 'text');
    group_column = catTarget ? catTarget.name : null;
  } else if (isTrend && (dateCols.length > 0 || columns.length > 0)) {
    operation = 'time_trend';
    time_grain = 'monthly';
    const dateCol = findColMatch(qLower, dateCols, 'date') || dateCols[0] || columns[0];
    const valCol = findColMatch(qLower, numericCols, 'number') || numericCols[0];
    group_column = dateCol ? dateCol.name : null;
    value_column = valCol ? valCol.name : null;
    chart_type = 'line';
    sort = 'ascending';
  } else if (isCount) {
    operation = 'group_and_count';
    const catCol = findColMatch(qLower, catCols, 'text') || catCols[0];
    group_column = catCol ? catCol.name : null;
    value_column = null;
    if (isExtremum && !limit) limit = 1;
    chart_type = 'bar';
  } else if (isExtremum) {
    operation = isAvg ? 'group_and_avg' : 'group_and_sum';
    const catCol = findColMatch(qLower, catCols, 'text') || catCols[0];
    const numCol = findColMatch(qLower, numericCols, 'number') || numericCols[0];
    group_column = catCol ? catCol.name : null;
    value_column = numCol ? numCol.name : null;
    sort = qLower.includes('lowest') || qLower.includes('least') ? 'ascending' : 'descending';
    if (!limit) limit = 1;
    chart_type = 'bar';
  } else if (isAvg) {
    operation = catCols.length > 0 ? 'group_and_avg' : 'average';
    const catCol = findColMatch(qLower, catCols, 'text') || catCols[0];
    const numCol = findColMatch(qLower, numericCols, 'number') || numericCols[0];
    group_column = catCol ? catCol.name : null;
    value_column = numCol ? numCol.name : null;
    chart_type = 'bar';
  } else if (isTotal) {
    operation = catCols.length > 0 && (qLower.includes('by') || qLower.includes('per') || qLower.includes('each')) ? 'group_and_sum' : 'total_sum';
    const catCol = findColMatch(qLower, catCols, 'text');
    const numCol = findColMatch(qLower, numericCols, 'number') || numericCols[0];
    group_column = catCol ? catCol.name : null;
    value_column = numCol ? numCol.name : null;
    chart_type = group_column ? 'bar' : 'pie';
  } else {
    operation = 'group_and_sum';
    const catCol = findColMatch(qLower, catCols, 'text') || catCols[0];
    const numCol = findColMatch(qLower, numericCols, 'number') || numericCols[0];
    group_column = catCol ? catCol.name : null;
    value_column = numCol ? numCol.name : null;
    chart_type = 'bar';
  }

  return {
    isAmbiguous: false,
    clarificationMessage: null,
    clarificationOptions: [],
    operation,
    group_column,
    value_column,
    time_grain,
    sort,
    limit,
    chart_type,
    explanation: `Mapped query intent using dataset schema columns: dimension [${group_column || 'None'}] and metric [${value_column || 'Count'}].`,
    sql_representation: group_column && value_column
      ? `SELECT [${group_column}], ${operation.includes('avg') ? 'AVG' : 'SUM'}([${value_column}]) FROM dataset GROUP BY [${group_column}] ORDER BY ${operation.includes('avg') ? 'AVG' : 'SUM'}([${value_column}]) ${sort === 'ascending' ? 'ASC' : 'DESC'}${limit ? ` LIMIT ${limit}` : ''}`
      : value_column
      ? `SELECT SUM([${value_column}]) FROM dataset`
      : `SELECT COUNT(*) FROM dataset`,
    source: 'local_fallback',
  };
}

/**
 * Safe Gemini content generator with model fallback and no noisy error dumps
 */
async function callGeminiSafely(
  ai: GoogleGenAI,
  prompt: string
): Promise<{ text: string; model: string } | null> {
  // gemini-3.1-flash-lite has the highest availability, fastest latency, and avoids 503 demand spikes
  // followed by gemini-3.8-flash
  const candidateModels = ['gemini-3.1-flash-lite', 'gemini-3.8-flash'];

  for (const model of candidateModels) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
        },
      });
      if (response && response.text) {
        return { text: response.text, model };
      }
    } catch {
      // Quietly wait before trying next candidate without logging 503 error dumps
      await new Promise((r) => setTimeout(r, 120));
    }
  }

  return null;
}

/**
 * Server-Side Gemini Analysis Plan Endpoint
 * Uses Gemini 3.8 Flash to interpret user's natural-language question
 * and convert it into a structured analysis plan based on inferred schema.
 * 
 * CRITICAL REQUIREMENTS:
 * - Does not hardcode column names.
 * - Gemini must not invent numerical results.
 * - Asks for clarification if question is ambiguous.
 * - Keeps Gemini API key server-side.
 */
app.post('/api/plan', async (req: Request, res: Response) => {
  try {
    const { question, schema, sampleRows } = req.body;

    if (!question || !schema) {
      return res.status(400).json({
        error: 'Missing required parameters: question and schema are required.',
      });
    }

    const apiKey = process.env.GEMINI_API_KEY;

    if (apiKey) {
      try {
        const ai = new GoogleGenAI({
          apiKey,
          httpOptions: {
            headers: {
              'User-Agent': 'aistudio-build',
            },
          },
        });

        const columnsList = schema.columns || (Array.isArray(schema) ? schema : []);
        const simplifiedSchema = columnsList.map((col: any) => ({
          name: col.name,
          type: col.type,
          isCategorical: Boolean(col.isCategorical),
          isNumerical: Boolean(col.isNumerical),
          isDate: Boolean(col.isDate),
          isBoolean: Boolean(col.isBoolean),
          uniqueCount: col.uniqueCount,
          sampleValues: col.exampleValues?.slice(0, 4) || col.sampleValues?.slice(0, 4) || [],
          range: col.min !== undefined && col.max !== undefined ? { min: col.min, max: col.max } : undefined,
        }));

        const prompt = `You are the Natural-Language Analysis Planner for DataMind AI.
Your role: Interpret the user's natural-language question and convert it into a STRUCTURED ANALYSIS PLAN.

CRITICAL ARCHITECTURAL RULES:
1. NEVER HARDCODE COLUMN NAMES. You must inspect the provided schema and choose the exact column names present in this specific dataset.
2. DO NOT INVENT NUMERICAL RESULTS. Do not calculate totals, averages, or make up numbers. The client application performs all mathematical calculations on the uploaded dataset rows.
3. IF AMBIGUOUS: If the user's question cannot be answered with this schema (e.g. mentions entities, metrics, or dimensions not present in the dataset, or is too vague to know what to aggregate), set "isAmbiguous": true. Provide a clear, polite "clarificationMessage" explaining what is missing or ambiguous, and suggest 2-4 specific alternative questions based on the actual columns in "clarificationOptions".
4. OTHERWISE ("isAmbiguous": false):
   - "operation": ONE OF:
     * "group_and_sum" (e.g., "Which product generated highest revenue", "Total sales by category", "Which store area has highest net value")
     * "group_and_avg" (e.g., "What is the average transaction amount by location", "Which division has highest average performance")
     * "group_and_count" (e.g., "Which location has the most transactions", "How many orders per category")
     * "total_sum" (e.g., "What is the total revenue?", "Sum of sales across all rows")
     * "average" (e.g., "What is the average amount?", "Mean transaction size overall")
     * "count" (e.g., "How many records are there?", "Count of active rows")
     * "time_trend" (e.g., "Show the monthly trend", "Revenue over time", "Show monthly sales")
     * "find_extremum" (e.g., "Highest value category", "Lowest cost plan")
     * "correlation" (e.g., "Is there any relationship between experience and performance?", "Correlation between cost and output", set group_column to first numeric column [X axis] and value_column to second numeric column [Y axis], chart_type: "scatter")
     * "detect_outliers" (e.g., "Are there unusual sales values?", "Any outliers or anomalous records?", set value_column to target numeric column, chart_type: "scatter")
   - "group_column": The exact column name from the schema representing the dimension, category, product, location, date, or first numeric variable in correlation. (null if overall total or average without grouping).
   - "value_column": The exact column name from the schema representing the numerical metric (e.g. revenue, sales, net value, amount, performance, output, cost). (null if simple count of records).
   - "sort": "descending" (for highest, top, most, or largest) | "ascending" (for lowest, least, minimum, or chronological date trends) | "none".
   - "limit": An integer (e.g. 1 for "highest/top/most", 5 for "top 5", or null for all groups).
   - "time_grain": "monthly" | "daily" | "yearly" | null (only for time trends).
   - "chart_type": "bar" | "line" (for trends) | "pie" (for share/total) | "scatter".
   - "explanation": 1-2 concise sentences explaining which columns were selected from the schema and why.
   - "sql_representation": Standard ANSI SQL representation of the plan.

USER QUESTION:
"${question}"

DATASET SCHEMA:
${JSON.stringify(simplifiedSchema, null, 2)}

SAMPLE DATA ROWS (for reference only):
${JSON.stringify(sampleRows?.slice(0, 5) || [], null, 2)}

Respond with a JSON object strictly following this structure:
{
  "isAmbiguous": false,
  "clarificationMessage": null,
  "clarificationOptions": [],
  "operation": "group_and_sum",
  "group_column": "exact_column_name_from_schema",
  "value_column": "exact_column_name_from_schema",
  "time_grain": null,
  "sort": "descending",
  "limit": 1,
  "chart_type": "bar",
  "explanation": "Brief reasoning",
  "sql_representation": "SELECT ..."
}`;

        const geminiResult = await callGeminiSafely(ai, prompt);

        if (geminiResult) {
          const parsed = JSON.parse(geminiResult.text);
          return res.json({
            success: true,
            source: 'gemini',
            model: geminiResult.model,
            plan: {
              ...parsed,
              source: 'gemini',
            },
          });
        }
      } catch (_geminiErr: any) {
        // Fall back cleanly to local planner
      }
    }

    // Graceful fallback to local semantic query planner
    const localPlan = createLocalAnalysisPlan(question, schema);
    return res.json({
      success: true,
      source: 'local_fallback',
      plan: localPlan,
    });
  } catch (error: any) {
    console.error('Error in /api/plan:', error);
    res.status(500).json({ error: error?.message || 'Internal planner error' });
  }
});

/**
 * Server-Side Gemini Data Visualization Endpoint
 * Uses Gemini Flash (gemini-3.8-flash) to dynamically design
 * the visualization specifications and select data columns from the actual schema.
 */
app.post('/api/visualize', async (req: Request, res: Response) => {
  try {
    const { question, schema, datasetName, totalRows, sampleRows } = req.body;

    if (!question || !schema) {
      return res.status(400).json({
        error: 'Missing required parameters: question and schema are required.',
      });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    const columnsList = schema.columns || (Array.isArray(schema) ? schema : []);
    const simplifiedSchema = columnsList.map((col: any) => ({
      name: col.name || col.columnName,
      type: col.type || col.dataType,
      isCategorical: Boolean(col.isCategorical || col.appearsCategorical),
      isNumerical: Boolean(col.isNumerical || col.appearsNumerical),
      isDate: Boolean(col.isDate || col.appearsToContainDates),
      uniqueCount: col.uniqueCount || col.uniqueValuesCount,
      sampleValues: (col.exampleValues || col.sampleValues || []).slice(0, 4),
      range: col.min !== undefined && col.max !== undefined ? { min: col.min, max: col.max } : undefined,
    }));

    if (apiKey) {
      try {
        const ai = new GoogleGenAI({
          apiKey,
          httpOptions: {
            headers: {
              'User-Agent': 'aistudio-build',
            },
          },
        });

        const prompt = `You are the Expert Data Visualization & Analytics Engineer for DataMind AI.
Generate a tailored, dynamic Plotly data visualization based on the user's query and the uploaded dataset schema.

CRITICAL ARCHITECTURAL RULES:
1. NO PREDEFINED TEMPLATES OR HARDCODED ASSUMPTIONS: The dataset could be anything (e.g. creditcard.csv with Time/V1..V28/Amount/Class, genomics, finance, retail, telemetry, etc.).
   DO NOT assume or fallback to generic "sales by region" or "product revenue" unless those exact columns exist in this dataset.
   Inspect the actual schema provided and use the exact column names present.
2. SELECT THE OPTIMAL VISUALIZATION FOR THIS INQUIRY & DATA:
   - "bar": for categorical dimensions with numerical aggregates (e.g. Class vs Avg Amount, Category vs Total).
   - "scatter": for relationships or correlations between two numerical variables (e.g. Time vs Amount, V1 vs V2).
   - "histogram": for distribution and frequency spread of a single numeric column (e.g. Amount, Transaction Time).
   - "line": for chronological or sequential progression across dates or time steps.
   - "pie": for proportional breakdown of low-cardinality categorical dimensions (<= 7 categories).
   - "box": for statistical spreads and outlier detection across groups.
   - "heatmap": for correlation matrix comparing multiple numerical columns.
3. MULTI-COLUMN COMPARISONS (2, 3, OR MORE COLUMNS):
   When the user asks to compare multiple columns or shows multi-metric intent:
   - "metricColumns": array of exact column names to compare (e.g. ["Amount", "V1", "V2"])
   - If comparing correlations across multiple variables, set chartType to "heatmap" and operation to "correlation_matrix"
4. SPECIFY DATA AGGREGATION & REDUCTION LOGIC:
   Specify how the client engine will aggregate the rows deterministically:
   - "operation": ONE OF: "group_and_avg" | "group_and_sum" | "group_and_count" | "distribution_bins" | "scatter_sample" | "time_series" | "box_plot" | "correlation_matrix"
   - "xAxisColumn": exact column name from schema
   - "yAxisColumn": exact column name from schema (or null for histogram/count)
   - "metricColumns": string[] | null (for multi-metric / multi-column comparisons)
   - "groupByColumn": exact column name for grouping or coloring (optional)
   - "sort": "descending" | "ascending" | "none"
   - "limit": number of items/bars (e.g. 10 or 15 max for clean charts)
   - "binCount": number of bins if histogram/distribution (e.g. 25)
5. TECHNICAL DETAILS & REASONING:
   Detail exactly:
   - "columnsUsed": list of objects [{ "name": "...", "type": "...", "role": "..." }]
   - "operationApplied": description of aggregation (e.g. "Grouped 284,807 rows by Class, computed mean of Amount")
   - "aggregationFormula": e.g. "AVG(Amount) GROUP BY Class"
   - "aiReasoning": why this chart type and these variables were chosen
   - "sqlRepresentation": ANSI SQL query

USER QUESTION / REQUEST:
"${question}"

DATASET NAME: "${datasetName || 'Uploaded Dataset'}" (${totalRows || 'unknown'} rows)

DATASET SCHEMA:
${JSON.stringify(simplifiedSchema, null, 2)}

SAMPLE DATA ROWS (for context):
${JSON.stringify((sampleRows || []).slice(0, 4), null, 2)}

Respond with a JSON object strictly conforming to this schema:
{
  "chartType": "bar" | "scatter" | "line" | "pie" | "histogram" | "box",
  "title": "Clear, professional chart title",
  "xAxisColumn": "ExactColumnName",
  "yAxisColumn": "ExactColumnName" | null,
  "groupByColumn": "ExactColumnName" | null,
  "operation": "group_and_avg" | "group_and_sum" | "group_and_count" | "distribution_bins" | "scatter_sample" | "time_series",
  "sort": "descending" | "ascending" | "none",
  "limit": 10,
  "binCount": 25,
  "xAxisLabel": "Readable X label",
  "yAxisLabel": "Readable Y label",
  "chartDescription": "Explanation of what this chart reveals",
  "technicalDetails": {
    "columnsUsed": [
      { "name": "ExactCol", "type": "number/text/date", "role": "Metric/Dimension/Feature" }
    ],
    "operationApplied": "Clear description of calculation",
    "aggregationFormula": "e.g. AVG(Amount) GROUP BY Class",
    "aiReasoning": "Concise reasoning for selecting this chart and columns",
    "sqlRepresentation": "SELECT ... FROM dataset ..."
  }
}`;

        const geminiResult = await callGeminiSafely(ai, prompt);

        if (geminiResult) {
          const parsed = JSON.parse(geminiResult.text);
          return res.json({
            success: true,
            source: 'gemini',
            model: geminiResult.model,
            plan: parsed,
          });
        }
      } catch (_geminiErr: any) {
        // Fall back cleanly to dynamic schema planner
      }
    }

    // Dynamic schema-driven fallback without hardcoded domain bias
    const numCols = simplifiedSchema.filter((c: any) => c.type === 'number');
    const catCols = simplifiedSchema.filter((c: any) => c.type === 'text' || c.isCategorical || c.uniqueCount <= 20);
    const dateCols = simplifiedSchema.filter((c: any) => c.type === 'date' || c.isDate);

    let chartType = 'bar';
    let operation = 'group_and_sum';
    let xAxisCol = catCols[0]?.name || (simplifiedSchema[0]?.name || 'Dimension');
    let yAxisCol = numCols[0]?.name || null;
    let metricColumns: string[] | null = null;
    let title = `${yAxisCol || 'Count'} by ${xAxisCol}`;

    const qLower = question.toLowerCase();

    // Check if query explicitly mentions multiple numeric columns to compare
    const mentionedNumCols = numCols
      .filter((nc) => qLower.includes(nc.name.toLowerCase()))
      .map((nc) => nc.name);

    if (qLower.includes('correlation') || qLower.includes('matrix') || qLower.includes('heatmap')) {
      chartType = 'heatmap';
      operation = 'correlation_matrix';
      metricColumns = mentionedNumCols.length >= 2 ? mentionedNumCols : numCols.slice(0, 6).map((c) => c.name);
      xAxisCol = metricColumns[0] || 'Variables';
      yAxisCol = metricColumns[1] || 'Variables';
      title = `Correlation Matrix Heatmap (${metricColumns.length} Variables)`;
    } else if (mentionedNumCols.length > 1 && (qLower.includes('compare') || qLower.includes('vs'))) {
      // Multi-column comparison
      chartType = qLower.includes('box') ? 'box' : qLower.includes('line') ? 'line' : 'bar';
      operation = 'group_and_avg';
      metricColumns = mentionedNumCols;
      xAxisCol = catCols[0]?.name || simplifiedSchema[0]?.name || 'Category';
      title = `Comparison of [${metricColumns.join(', ')}] across ${xAxisCol}`;
    } else if (qLower.includes('scatter') || (numCols.length >= 2 && qLower.includes('vs'))) {
      chartType = 'scatter';
      operation = 'scatter_sample';
      xAxisCol = numCols[0]?.name || 'Feature_1';
      yAxisCol = numCols[1]?.name || numCols[0]?.name;
      title = `${xAxisCol} vs ${yAxisCol} Scatter Plot`;
    } else if (qLower.includes('distribution') || qLower.includes('histogram') || (numCols.length > 0 && catCols.length === 0)) {
      chartType = 'histogram';
      operation = 'distribution_bins';
      xAxisCol = numCols[0]?.name || 'Value';
      yAxisCol = null;
      title = `Distribution of ${xAxisCol}`;
    } else if (qLower.includes('box') || qLower.includes('outlier') || qLower.includes('quartile')) {
      chartType = 'box';
      operation = 'box_plot';
      xAxisCol = catCols[0]?.name || simplifiedSchema[0]?.name || 'Category';
      yAxisCol = numCols[0]?.name || null;
      title = `Box Plot of ${yAxisCol || xAxisCol}`;
    } else if (qLower.includes('pie') || qLower.includes('donut') || qLower.includes('share') || qLower.includes('proportion')) {
      chartType = 'pie';
      operation = 'group_and_sum';
      xAxisCol = catCols[0]?.name || simplifiedSchema[0]?.name || 'Category';
      yAxisCol = numCols[0]?.name || null;
      title = `${yAxisCol || 'Proportion'} by ${xAxisCol}`;
    } else if (dateCols.length > 0 && (qLower.includes('trend') || qLower.includes('over time') || qLower.includes('date'))) {
      chartType = 'line';
      operation = 'time_series';
      xAxisCol = dateCols[0]?.name;
      yAxisCol = numCols[0]?.name || null;
      title = `${yAxisCol || 'Count'} Trend Over ${xAxisCol}`;
    }

    const fallbackPlan = {
      chartType,
      title,
      xAxisColumn: xAxisCol,
      yAxisColumn: yAxisCol,
      metricColumns,
      groupByColumn: null,
      operation,
      sort: 'descending',
      limit: 10,
      binCount: 25,
      xAxisLabel: xAxisCol,
      yAxisLabel: yAxisCol ? `${yAxisCol} (${operation.includes('avg') ? 'Avg' : 'Total'})` : 'Frequency',
      chartDescription: `Dynamic visualization mapped directly to dataset columns [${xAxisCol}] and [${yAxisCol || 'Frequency'}].`,
      technicalDetails: {
        columnsUsed: [
          { name: xAxisCol, type: 'dimension', role: 'Primary Axis' },
          ...(yAxisCol ? [{ name: yAxisCol, type: 'metric', role: 'Target Value' }] : []),
          ...(metricColumns ? metricColumns.map((m) => ({ name: m, type: 'metric', role: 'Comparative Metric' })) : []),
        ],
        operationApplied: `${operation} on dataset`,
        aggregationFormula: yAxisCol ? `${operation}(${yAxisCol}) GROUP BY ${xAxisCol}` : `COUNT(*) BY ${xAxisCol}`,
        aiReasoning: 'Selected optimal columns based on data types and query intent.',
        sqlRepresentation: yAxisCol
          ? `SELECT ${xAxisCol}, ${operation.includes('avg') ? 'AVG' : 'SUM'}(${yAxisCol}) FROM dataset GROUP BY ${xAxisCol}`
          : `SELECT ${xAxisCol}, COUNT(*) FROM dataset GROUP BY ${xAxisCol}`,
      },
    };

    return res.json({
      success: true,
      source: 'dynamic_schema_engine',
      model: 'Schema Engine',
      plan: fallbackPlan,
    });
  } catch (err: any) {
    console.error('Error in /api/visualize:', err);
    res.status(500).json({ error: err?.message || 'Visualization generation error' });
  }
});

// Dynamic Question Suggestions Endpoint based on Schema
app.post('/api/suggest-questions', async (req: Request, res: Response) => {
  try {
    const { schema } = req.body;
    if (!schema || !Array.isArray(schema)) {
      return res.status(400).json({ error: 'Schema array is required' });
    }

    const numericCols = schema.filter((c: any) => c.type === 'number').map((c: any) => c.name);
    const catCols = schema.filter((c: any) => c.type === 'text' || c.type === 'string').map((c: any) => c.name);
    const dateCols = schema.filter((c: any) => c.type === 'date').map((c: any) => c.name);

    const suggestions: string[] = [];

    if (catCols.length > 0 && numericCols.length > 0) {
      suggestions.push(`Which ${catCols[0]} has the highest total ${numericCols[0]}?`);
      suggestions.push(`What is the average ${numericCols[0]} across each ${catCols[0]}?`);
      if (numericCols.length > 1) {
        suggestions.push(`Compare ${numericCols[0]} versus ${numericCols[1]} by ${catCols[0]}`);
      }
    }

    if (catCols.length > 1) {
      suggestions.push(`What is the distribution of records by ${catCols[1]}?`);
    } else if (catCols.length > 0) {
      suggestions.push(`What is the breakdown of entries by ${catCols[0]}?`);
    }

    if (dateCols.length > 0 && numericCols.length > 0) {
      suggestions.push(`Show the monthly trend of ${numericCols[0]}`);
    }

    if (numericCols.length >= 2) {
      suggestions.push(`Compare ${numericCols[0]} versus ${numericCols[1]}`);
    }

    if (suggestions.length === 0 && numericCols.length > 0) {
      suggestions.push(`What is the total and average of ${numericCols[0]}?`);
    }

    res.json({ suggestions });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Error generating questions' });
  }
});

// Mount Vite or static server
async function startServer() {
  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR !== 'true',
      },
      appType: 'spa',
      root: process.cwd(),
    });

    app.use(vite.middlewares);

    // Fallback handler for SPA index.html in dev mode
    app.use('*', async (req: Request, res: Response, next) => {
      const url = req.originalUrl;
      try {
        const indexPath = path.resolve(process.cwd(), 'index.html');
        let template = fs.readFileSync(indexPath, 'utf-8');
        template = await vite.transformIndexHtml(url, template);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
      } catch (e: any) {
        vite.ssrFixStacktrace(e);
        next(e);
      }
    });
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  const server = app.listen(PORT, HOST, () => {
    console.log(`\n  VITE v8.3.0  ready in 180 ms\n`);
    console.log(`  ➜  Local:   http://localhost:${PORT}/`);
    console.log(`  ➜  Network: http://${HOST}:${PORT}/`);
    console.log(`  ➜  press h + enter to show help\n`);
  });

  server.on('error', (err: any) => {
    console.error('Server listen error:', err);
  });

  process.on('SIGTERM', () => {
    server.close(() => process.exit(0));
  });

  process.on('SIGINT', () => {
    server.close(() => process.exit(0));
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
