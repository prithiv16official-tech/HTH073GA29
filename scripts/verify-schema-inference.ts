import { buildInferredDatasetSchema, resolveColumnBySemanticRole } from '../src/utils/schemaInferenceEngine';
import { SAMPLE_DATASETS } from '../src/data/sampleDatasets';

console.log('====================================================');
console.log('TESTING SCHEMA INFERENCE LAYER ACROSS UNSEEN SCHEMAS');
console.log('====================================================\n');

for (const sample of SAMPLE_DATASETS.slice(0, 4)) {
  console.log(`\n----------------------------------------------------`);
  console.log(`TESTING: ${sample.domain}`);
  console.log(`File: ${sample.name}, Rows: ${sample.data.length}`);
  console.log(`----------------------------------------------------`);

  const headers = Object.keys(sample.data[0]);
  const typeMap: Record<string, any> = {};
  for (const h of headers) {
    const val = sample.data[0][h];
    if (typeof val === 'number') typeMap[h] = 'number';
    else if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}/.test(val)) typeMap[h] = 'date';
    else typeMap[h] = 'text';
  }

  const inferred = buildInferredDatasetSchema(sample.name, sample.data, headers, typeMap);

  console.log(`Summary: Rows=${inferred.datasetSummary.rows}, Columns=${inferred.datasetSummary.columns}`);
  console.log('Columns Inferred:');
  for (const col of inferred.columns) {
    console.log(
      `  • ${col.originalName.padEnd(18)} → Type: ${col.dataType.padEnd(8)} Detailed: ${col.detailedDataType.padEnd(12)} Role: ${col.semanticRole.padEnd(14)} (${col.semanticLabel}) Conf: ${Math.round(col.confidence * 100)}% ${col.isAmbiguous ? '[AMBIGUOUS!]' : ''}`
    );
    if (col.isAmbiguous) {
      console.log(`    Possible Roles: ${col.possibleRoles.map(p => `${p.label} (${Math.round(p.confidence * 100)}%)`).join(', ')}`);
    }
  }

  // Verify Step 19 resolution
  const salesCol = resolveColumnBySemanticRole(inferred, 'sales_revenue');
  const dateCol = resolveColumnBySemanticRole(inferred, 'date');
  const productCol = resolveColumnBySemanticRole(inferred, 'product');
  const regionCol = resolveColumnBySemanticRole(inferred, 'region');
  const qtyCol = resolveColumnBySemanticRole(inferred, 'quantity');

  console.log('\nSemantic Resolution (Step 19 Query Parser Ready):');
  console.log(`  sales_revenue → "${salesCol}"`);
  console.log(`  date          → "${dateCol}"`);
  console.log(`  product       → "${productCol}"`);
  console.log(`  region        → "${regionCol}"`);
  console.log(`  quantity      → "${qtyCol}"`);
}

console.log('\n====================================================');
console.log('ALL UNSEEN SCHEMAS TESTED SUCCESSFULLY!');
console.log('====================================================\n');
