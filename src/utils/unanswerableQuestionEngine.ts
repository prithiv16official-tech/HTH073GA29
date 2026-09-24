import {
  StructuredQueryPlan,
  AnswerabilityResult,
  QueryValidationResult,
  SupportedLanguage,
} from '../types/assistant';
import { InferredDatasetSchema, DatasetSchemaProfile, SemanticRole } from '../types/dataset';
import { parseNumericValue } from './schemaDetector';

/**
 * Normalized helper to extract column names and role maps from any schema representation
 */
export function extractDatasetFieldCatalog(
  schema: InferredDatasetSchema | DatasetSchemaProfile | any,
  rows: Record<string, any>[] = []
) {
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

  // Also discover from sample row keys if schema columns list is minimal
  if (rows.length > 0) {
    const rowKeys = Object.keys(rows[0] || {});
    for (const k of rowKeys) {
      if (!allColumnNames.includes(k)) {
        allColumnNames.push(k);
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

  // Check which columns have strictly zero usable values across all dataset rows
  const emptyColumns: string[] = [];
  if (rows.length > 0) {
    for (const col of allColumnNames) {
      const hasAnyNonEmpty = rows.some((r) => {
        const val = r[col];
        if (val === null || val === undefined) return false;
        const str = String(val).trim();
        return str !== '' && str !== 'null' && str !== 'undefined' && str !== 'NaN';
      });
      if (!hasAnyNonEmpty) {
        emptyColumns.push(col);
      }
    }
  }

  // Date column validation (check if rows have parseable dates)
  const candidateDateCol =
    roleMap['date']?.[0] ||
    roleMap['timestamp']?.[0] ||
    roleMap['time']?.[0] ||
    findColByName(['transaction_date', 'purchase_date', 'order_date', 'date', 'created_at']);

  let isDateUsable = false;
  let dateValuesCount = 0;
  if (candidateDateCol && rows.length > 0) {
    const validDates = rows.filter((r) => {
      const val = r[candidateDateCol];
      if (!val) return false;
      const d = new Date(val);
      return !isNaN(d.getTime());
    });
    dateValuesCount = validDates.length;
    isDateUsable = dateValuesCount > 0 && dateValuesCount >= Math.min(rows.length * 0.3, 1);
  }

  // Resolved primary fields
  const salesCol =
    roleMap['sales_revenue']?.[0] ||
    roleMap['sales']?.[0] ||
    roleMap['revenue']?.[0] ||
    findColByName(['total_amount', 'net_revenue', 'sales', 'revenue', 'turnover', 'amount']);

  const costCol =
    roleMap['cost']?.[0] ||
    findColByName(['unit_cost', 'total_cost', 'cost', 'expense', 'expenses', 'monthly_cost']);

  const directProfitCol =
    roleMap['profit']?.[0] ||
    findColByName(['net_profit', 'gross_profit', 'profit', 'margin_amount']);

  const customerCol =
    roleMap['customer_id']?.[0] ||
    roleMap['customer']?.[0] ||
    findColByName(['customer_id', 'customer_name', 'customer', 'buyer', 'client', 'user_id', 'client_name']);

  const regionCol =
    roleMap['region']?.[0] ||
    roleMap['location']?.[0] ||
    findColByName(['region', 'area', 'location', 'country', 'city', 'customer_area', 'store_area']);

  const productCol =
    roleMap['product']?.[0] ||
    roleMap['product_id']?.[0] ||
    findColByName(['item_name', 'item_description', 'product_name', 'product', 'item', 'sku']);

  const categoryCol =
    roleMap['category']?.[0] ||
    findColByName(['category_type', 'category', 'department', 'segment', 'type']);

  const quantityCol =
    roleMap['quantity']?.[0] ||
    findColByName(['units', 'quantity', 'qty_sold', 'units_sold', 'qty']);

  // Human-readable available fields list for responses
  const availableRelevantFields: string[] = [];
  if (salesCol) availableRelevantFields.push(`Sales / Revenue (${salesCol})`);
  if (costCol) availableRelevantFields.push(`Cost (${costCol})`);
  if (directProfitCol) availableRelevantFields.push(`Profit (${directProfitCol})`);
  if (productCol) availableRelevantFields.push(`Product (${productCol})`);
  if (regionCol) availableRelevantFields.push(`Region (${regionCol})`);
  if (candidateDateCol && isDateUsable) availableRelevantFields.push(`Date (${candidateDateCol})`);
  if (customerCol) availableRelevantFields.push(`Customer (${customerCol})`);
  if (quantityCol) availableRelevantFields.push(`Quantity (${quantityCol})`);
  if (categoryCol) availableRelevantFields.push(`Category (${categoryCol})`);

  // If few specific roles, list other prominent columns
  if (availableRelevantFields.length === 0) {
    allColumnNames.slice(0, 5).forEach((col) => availableRelevantFields.push(col));
  }

  return {
    roleMap,
    allColumnNames,
    findColByName,
    emptyColumns,
    salesCol,
    costCol,
    directProfitCol,
    customerCol,
    regionCol,
    productCol,
    categoryCol,
    quantityCol,
    dateCol: candidateDateCol,
    isDateUsable,
    availableRelevantFields,
  };
}

/**
 * 1. UNANSWERABLE QUESTION EVALUATOR
 * Compares required question semantics against the actual dataset and schema.
 * NEVER hallucinates or assumes missing fields.
 */
export function evaluateQuestionAnswerability(
  question: string,
  plan: StructuredQueryPlan,
  schema: InferredDatasetSchema | DatasetSchemaProfile | any,
  rows: Record<string, any>[] = []
): AnswerabilityResult {
  const catalog = extractDatasetFieldCatalog(schema, rows);
  const qLower = question.toLowerCase();

  const requiredFields: string[] = [];
  const missingFields: string[] = [];
  let canDerive = false;
  let derivationFormula: string | undefined = undefined;

  // Check 1: AMBIGUITY CHECK (Section 10 - Ambiguous vs Unanswerable)
  // When multiple columns could match sales without disambiguation
  const salesCandidates = [
    ...(catalog.roleMap['sales_revenue'] || []),
    ...(catalog.roleMap['sales'] || []),
    ...(catalog.roleMap['revenue'] || []),
  ];
  const uniqueSalesCols = Array.from(new Set(salesCandidates));
  if (plan.metric === 'sales' && uniqueSalesCols.length > 1) {
    const hasGross = uniqueSalesCols.some((c) => c.toLowerCase().includes('gross'));
    const hasNet = uniqueSalesCols.some((c) => c.toLowerCase().includes('net'));
    if (hasGross && hasNet) {
      return {
        answerable: false,
        isAmbiguous: true,
        ambiguousCandidates: uniqueSalesCols,
        ambiguityPrompt: `Which sales measure do you mean: ${uniqueSalesCols.join(' or ')}?`,
        question,
        requiredFields: ['sales'],
        availableFields: catalog.availableRelevantFields,
        missingFields: [],
        canDerive: false,
      };
    }
  }

  // Check 2: MULTI-METRIC PARTIAL ANSWERABILITY (Section 7)
  // E.g. "What were last month's sales and profit?"
  const asksSalesAndProfit =
    (qLower.includes('sales') || qLower.includes('revenue')) &&
    qLower.includes('profit');

  if (asksSalesAndProfit) {
    requiredFields.push('sales', 'profit');
    const hasSales = Boolean(catalog.salesCol);
    const hasProfitOrDerivable = Boolean(catalog.directProfitCol) || (Boolean(catalog.salesCol) && Boolean(catalog.costCol));

    if (hasSales && !hasProfitOrDerivable) {
      return {
        answerable: false,
        partiallyAnswerable: true,
        partialDetails: {
          availablePartMetric: 'sales',
          missingPartField: 'profit',
          unanswerablePartReason:
            'Profit cannot be calculated because the uploaded dataset does not contain a Profit field or Cost information to derive it.',
        },
        question,
        requiredFields: ['sales', 'profit'],
        availableFields: catalog.availableRelevantFields,
        missingFields: ['profit', 'cost (required to derive profit)'],
        canDerive: false,
      };
    }
  }

  // Check 3: PROFIT & PROFIT MARGIN DERIVATION (Section 6A, 6D, 8, 19)
  const isProfitQuery =
    plan.metric === 'profit' ||
    qLower.includes('profit') ||
    qLower.includes('லாபம்') ||
    qLower.includes('labham') ||
    qLower.includes('munafa') ||
    qLower.includes('munafah');

  const isProfitMarginQuery =
    qLower.includes('profit margin') ||
    qLower.includes('margin percentage') ||
    qLower.includes('operating margin');

  if (isProfitMarginQuery) {
    requiredFields.push('profit margin', 'revenue');
    const hasDirectProfit = Boolean(catalog.directProfitCol);
    const hasSales = Boolean(catalog.salesCol);
    const hasCost = Boolean(catalog.costCol);

    if (hasDirectProfit && hasSales) {
      canDerive = true;
      derivationFormula = `Profit Margin = (${catalog.directProfitCol} / ${catalog.salesCol}) × 100`;
    } else if (hasSales && hasCost) {
      canDerive = true;
      derivationFormula = `Profit Margin = ((${catalog.salesCol} - ${catalog.costCol}) / ${catalog.salesCol}) × 100`;
    } else {
      missingFields.push('profit');
      if (!hasCost) missingFields.push('cost (required to derive profit)');
      if (!hasSales) missingFields.push('revenue/sales');

      return {
        answerable: false,
        reason:
          'The dataset does not contain a Profit field or the Cost and Revenue information required to derive profit margin.',
        question,
        requiredFields: ['profit', 'revenue'],
        availableFields: catalog.availableRelevantFields,
        missingFields,
        canDerive: false,
      };
    }
  } else if (isProfitQuery) {
    requiredFields.push('profit');
    const hasDirectProfit = Boolean(catalog.directProfitCol);
    const hasSales = Boolean(catalog.salesCol);
    const hasCost = Boolean(catalog.costCol);

    if (hasDirectProfit) {
      // Direct profit column exists
      if (catalog.emptyColumns.includes(catalog.directProfitCol!)) {
        // Section 6E: Empty column check
        return {
          answerable: false,
          reason: `The Profit column ('${catalog.directProfitCol}') exists, but it does not contain usable values.`,
          question,
          requiredFields: ['profit'],
          availableFields: catalog.availableRelevantFields,
          missingFields: ['usable profit values'],
          emptyColumnDetected: catalog.directProfitCol,
          canDerive: false,
        };
      }
    } else if (hasSales && hasCost) {
      // Derivation allowed: Profit = Revenue - Cost
      canDerive = true;
      derivationFormula = `Profit = ${catalog.salesCol} - ${catalog.costCol}`;
    } else {
      // Unanswerable: Profit missing and cannot be derived
      missingFields.push('profit');
      missingFields.push('cost (if required to derive profit)');

      return {
        answerable: false,
        reason:
          'The dataset does not contain a Profit field or the information required to derive Profit.',
        question,
        requiredFields: ['profit'],
        availableFields: catalog.availableRelevantFields,
        missingFields,
        canDerive: false,
      };
    }
  }

  // Check 4: COST METRIC
  if (plan.metric === 'cost' || qLower.includes('cost') || qLower.includes('expenses') || qLower.includes('expense')) {
    requiredFields.push('cost');
    if (!catalog.costCol) {
      return {
        answerable: false,
        reason: 'The dataset does not contain a Cost or Expense field.',
        question,
        requiredFields: ['cost'],
        availableFields: catalog.availableRelevantFields,
        missingFields: ['cost'],
        canDerive: false,
      };
    }
    if (catalog.emptyColumns.includes(catalog.costCol)) {
      return {
        answerable: false,
        reason: `The Cost column ('${catalog.costCol}') exists, but it does not contain usable values.`,
        question,
        requiredFields: ['cost'],
        availableFields: catalog.availableRelevantFields,
        missingFields: ['usable cost values'],
        emptyColumnDetected: catalog.costCol,
        canDerive: false,
      };
    }
  }

  // Check 5: CUSTOMER FIELD (Section 6C)
  // E.g. "Which customer purchased the most?", "Show sales by customer"
  const asksCustomer =
    plan.metric === 'customers' ||
    plan.groupBy === 'customer' ||
    qLower.includes('customer') ||
    qLower.includes('buyer') ||
    qLower.includes('client') ||
    qLower.includes('bought the most') ||
    qLower.includes('purchased the most');

  if (asksCustomer) {
    requiredFields.push('customer');
    if (!catalog.customerCol) {
      return {
        answerable: false,
        reason:
          'The dataset does not contain a Customer field to identify customers or group transactions by customer.',
        question,
        requiredFields: ['customer'],
        availableFields: catalog.availableRelevantFields,
        missingFields: ['customer'],
        canDerive: false,
      };
    }
    if (catalog.emptyColumns.includes(catalog.customerCol)) {
      return {
        answerable: false,
        reason: `The Customer column ('${catalog.customerCol}') exists, but it does not contain usable values.`,
        question,
        requiredFields: ['customer'],
        availableFields: catalog.availableRelevantFields,
        missingFields: ['usable customer values'],
        emptyColumnDetected: catalog.customerCol,
        canDerive: false,
      };
    }
  }

  // Check 6: GROUPING FIELD (Section 6C)
  // E.g. "Show sales by region", "Show sales by category", "Show sales by product"
  if (plan.groupBy) {
    requiredFields.push(plan.groupBy);
    let matchedGroupCol: string | undefined;

    if (plan.groupBy === 'region') matchedGroupCol = catalog.regionCol;
    if (plan.groupBy === 'product') matchedGroupCol = catalog.productCol;
    if (plan.groupBy === 'category') matchedGroupCol = catalog.categoryCol;
    if (plan.groupBy === 'customer') matchedGroupCol = catalog.customerCol;
    if (plan.groupBy === 'date') matchedGroupCol = catalog.dateCol;

    if (!matchedGroupCol) {
      return {
        answerable: false,
        reason: `The dataset does not contain a column representing '${plan.groupBy}' to perform the requested breakdown.`,
        question,
        requiredFields: [plan.metric, plan.groupBy],
        availableFields: catalog.availableRelevantFields,
        missingFields: [plan.groupBy],
        canDerive: false,
      };
    }
  }

  // Check 7: DATE INFORMATION (Section 6B & 6F)
  // E.g. "What were last month's sales?", "sales trend", "Compare sales between January and February"
  const requiresDate =
    (plan.timeRange && plan.timeRange.type !== 'all_time') ||
    plan.intent === 'trend' ||
    qLower.includes('last month') ||
    qLower.includes('this month') ||
    qLower.includes('last year') ||
    qLower.includes('monthly') ||
    qLower.includes('trend') ||
    qLower.includes('january') ||
    qLower.includes('february') ||
    qLower.includes('march') ||
    qLower.includes('between');

  if (requiresDate) {
    requiredFields.push('date');
    if (!catalog.dateCol) {
      // Section 6B: Missing date field with available metric
      const metricLabel = plan.metric === 'profit' ? 'profit' : 'sales';
      return {
        answerable: false,
        reason: `I can calculate total ${metricLabel}, but I cannot determine time-filtered ${metricLabel} because the dataset does not contain a usable date field.`,
        question,
        requiredFields: [metricLabel, 'date'],
        availableFields: catalog.availableRelevantFields,
        missingFields: ['date'],
        canDerive: false,
      };
    }

    if (!catalog.isDateUsable) {
      // Section 6F: Insufficient date information / unparseable
      return {
        answerable: false,
        reason: `The dataset has a Date column ('${catalog.dateCol}'), but its values cannot be reliably parsed as dates to support the requested time comparison.`,
        question,
        requiredFields: ['date'],
        availableFields: catalog.availableRelevantFields,
        missingFields: ['parseable date values'],
        emptyColumnDetected: catalog.dateCol,
        canDerive: false,
      };
    }
  }

  // Check 8: PRIMARY METRIC NUMERIC FIELD
  const activeMetricCol =
    plan.metric === 'profit'
      ? catalog.directProfitCol || catalog.salesCol
      : plan.metric === 'cost'
      ? catalog.costCol
      : plan.metric === 'quantity'
      ? catalog.quantityCol
      : catalog.salesCol;

  if (!activeMetricCol && plan.operation !== 'COUNT') {
    return {
      answerable: false,
      reason: `Could not identify a numeric column in the dataset to calculate ${plan.metric}.`,
      question,
      requiredFields: [plan.metric],
      availableFields: catalog.availableRelevantFields,
      missingFields: [plan.metric],
      canDerive: false,
    };
  }

  // Check 9: Empty Primary Metric Column (Section 6E)
  if (activeMetricCol && catalog.emptyColumns.includes(activeMetricCol)) {
    return {
      answerable: false,
      reason: `The column '${activeMetricCol}' exists in the dataset schema, but it does not contain usable non-empty values.`,
      question,
      requiredFields: [plan.metric],
      availableFields: catalog.availableRelevantFields,
      missingFields: [`usable values in ${activeMetricCol}`],
      emptyColumnDetected: activeMetricCol,
      canDerive: false,
    };
  }

  // ALL CHECKS PASSED: QUESTION IS FULLY ANSWERABLE
  return {
    answerable: true,
    question,
    requiredFields,
    availableFields: catalog.availableRelevantFields,
    missingFields: [],
    canDerive: canDerive || Boolean(activeMetricCol),
    derivationFormula,
  };
}

/**
 * 2. STANDARDIZED UNANSWERABLE RESPONSE BUILDER (Section 5)
 * Builds the exact structured message format required:
 *
 * ❌ Cannot answer this question from the uploaded dataset.
 *
 * Question:
 * "..."
 *
 * Reason:
 * "..."
 *
 * Available relevant fields:
 * - Field 1
 * - Field 2
 *
 * Missing information:
 * - Missing 1
 * - Missing 2
 */
export function formatUnanswerableResponse(
  answerability: AnswerabilityResult,
  activeLang: SupportedLanguage = 'en'
): string {
  // If partial answerability (Section 7)
  if (answerability.partiallyAnswerable && answerability.partialDetails) {
    const details = answerability.partialDetails;
    const answerPart = details.availablePartAnswer
      ? `${details.availablePartAnswer}\n\n`
      : '';

    return `${answerPart}⚠️ Partial Information Available:\n${details.unanswerablePartReason}\n\nAvailable relevant fields:\n${answerability.availableFields.map((f) => `• ${f}`).join('\n')}\n\nMissing information:\n${answerability.missingFields.map((f) => `• ${f}`).join('\n')}`;
  }

  // Standard Unanswerable Format
  const lines: string[] = [
    '❌ Cannot answer this question from the uploaded dataset.',
    '',
    'Question:',
    `"${answerability.question}"`,
    '',
    'Reason:',
    `"${answerability.reason || 'The uploaded dataset does not contain the required fields to answer this question.'}"`,
    '',
    'Available relevant fields:',
    ...answerability.availableFields.map((f) => `- ${f}`),
    '',
    'Missing information:',
    ...answerability.missingFields.map((m) => `- ${m}`),
  ];

  return lines.join('\n');
}
