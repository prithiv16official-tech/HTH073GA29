import { SampleDatasetDefinition } from '../types/dataset';

// Seeded pseudo-random number generator for 100% deterministic, reproducible sample datasets
function createSeededRandom(seed: number) {
  let s = seed;
  return function () {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

// ---------------------------------------------------------------------------
// DATASET 1: E-COMMERCE SALES (520 Rows)
// Columns: Order_ID, Order_Date, Item_Name, Category_Type, Units, Total_Amount, Customer_Area, Payment_Type
// ---------------------------------------------------------------------------
function generateEcommerceDataset(): Record<string, any>[] {
  const rand = createSeededRandom(42);

  const catalog = [
    { item: 'MacBook Pro M3 Max 16-inch', cat: 'Computing Hardware', basePrice: 2499.0 },
    { item: 'Sony WH-1000XM5 Noise-Canceling', cat: 'Audio Equipment', basePrice: 399.0 },
    { item: 'Logitech MX Master 3S Mouse', cat: 'Workstation Gear', basePrice: 99.0 },
    { item: 'Keychron Q1 Pro Mechanical Keyboard', cat: 'Workstation Gear', basePrice: 199.0 },
    { item: 'Samsung Galaxy S24 Ultra 512GB', cat: 'Mobile Devices', basePrice: 1299.0 },
    { item: 'Dell UltraSharp 32-inch 4K Monitor', cat: 'Displays & Visuals', basePrice: 799.0 },
    { item: 'Kindle Paperwhite Signature 32GB', cat: 'Mobile Devices', basePrice: 189.0 },
    { item: 'Anker 737 GaN Power Bank 24000mAh', cat: 'Power & Charging', basePrice: 149.0 },
    { item: 'Apple iPad Air 11-inch M2', cat: 'Mobile Devices', basePrice: 599.0 },
    { item: 'Bose QuietComfort 45 Headphones', cat: 'Audio Equipment', basePrice: 329.0 },
    { item: 'LG C3 42-inch 4K OLED Gaming Monitor', cat: 'Displays & Visuals', basePrice: 999.0 },
    { item: 'Elgato Stream Deck MK.2', cat: 'Gaming & Streaming', basePrice: 149.0 },
    { item: 'Secretlab Titan Evo Ergonomic Chair', cat: 'Workstation Gear', basePrice: 549.0 },
    { item: 'Razer DeathAdder V3 Pro Wireless', cat: 'Gaming & Streaming', basePrice: 149.0 },
    { item: 'SanDisk 2TB Extreme Portable SSD', cat: 'Storage & Memory', basePrice: 179.0 },
    { item: 'Apple Watch Ultra 2 Titanium', cat: 'Mobile Devices', basePrice: 799.0 },
    { item: 'Shure SM7B Dynamic Studio Mic', cat: 'Audio Equipment', basePrice: 399.0 },
    { item: 'CalDigit TS4 Thunderbolt 4 Dock', cat: 'Workstation Gear', basePrice: 399.0 },
  ];

  const areas = [
    'Metropolitan Bay Area',
    'Pacific Northwest',
    'Midwest Metro',
    'Greater London Hub',
    'Berlin Urban District',
    'Tokyo Central',
    'Nordic Corridor',
    'Sydney Coast',
  ];

  const paymentMethods = [
    'Corporate Wire',
    'Direct Debit',
    'Digital Wallet',
    'Credit Card Platinum',
    'Crypto Settlement',
  ];

  const rows: Record<string, any>[] = [];
  const startDate = new Date(2024, 0, 15).getTime();
  const endDate = new Date(2025, 2, 28).getTime();

  for (let i = 1; i <= 520; i++) {
    const id = `ORD-${1000 + i}`;
    const productIdx = Math.floor(rand() * catalog.length);
    const prod = catalog[productIdx];

    // Pick date uniformly across range
    const t = startDate + rand() * (endDate - startDate);
    const d = new Date(t);
    const orderDate = d.toISOString().split('T')[0];

    const area = areas[Math.floor(rand() * areas.length)];
    const payment = paymentMethods[Math.floor(rand() * paymentMethods.length)];

    let units = Math.floor(rand() * 4) + 1;
    let totalAmount = Math.round(prod.basePrice * units * (0.95 + rand() * 0.1) * 100) / 100;

    // Inject explicit statistical outliers so "Are there unusual sales values?" detects genuine anomalies
    if (i === 42) {
      units = 18;
      totalAmount = 24890.0; // Corporate bulk workstation rollout
    } else if (i === 175) {
      units = 25;
      totalAmount = 31250.0; // Enterprise datacenter upgrade
    } else if (i === 310) {
      units = 15;
      totalAmount = 18750.0; // Media production studio order
    } else if (i === 460) {
      units = 22;
      totalAmount = 27500.0; // University lab procurement
    }

    rows.push({
      Order_ID: id,
      Order_Date: orderDate,
      Item_Name: prod.item,
      Category_Type: prod.cat,
      Units: units,
      Total_Amount: totalAmount,
      Customer_Area: area,
      Payment_Type: payment,
    });
  }

  return rows;
}

// ---------------------------------------------------------------------------
// DATASET 2: RETAIL SALES (520 Rows)
// Columns: Transaction_No, Purchase_Date, Store_Area, Item_Description, Qty_Sold, Net_Value, Customer_Segment
// ---------------------------------------------------------------------------
function generateRetailDataset(): Record<string, any>[] {
  const rand = createSeededRandom(137);

  const inventory = [
    { desc: 'Organic Fair-Trade Espresso Blend 1kg', price: 28.5 },
    { desc: 'Artisanal Sourdough Country Loaf', price: 7.5 },
    { desc: 'Cold-Pressed Almond Milk Unsweetened 1L', price: 5.8 },
    { desc: 'Single-Origin Dark Chocolate 85% Bar', price: 6.5 },
    { desc: 'Gourmet White Truffle Infused Olive Oil', price: 34.0 },
    { desc: 'Sparkling Mineral Spring Water 6-Pack', price: 11.2 },
    { desc: 'Aged Reserve White Cheddar 500g', price: 14.5 },
    { desc: 'Gluten-Free Organic Rolled Oats 1kg', price: 8.9 },
    { desc: 'Cold Brew Concentrate Bottle 32oz', price: 15.0 },
    { desc: 'Ceremonial Grade Japanese Matcha 100g', price: 32.0 },
    { desc: 'Extra Virgin Avocado Oil Cold-Pressed 750ml', price: 19.5 },
    { desc: 'Raw Organic Forest Honeycomb 400g', price: 22.0 },
    { desc: 'Italian Prosciutto di Parma 200g', price: 16.8 },
    { desc: 'Wild Alaskan Smoked Salmon 250g', price: 18.5 },
    { desc: 'Greek Kalamata Olives in Brine 350g', price: 9.4 },
  ];

  const stores = [
    'Downtown Flagship',
    'Uptown Mall Store',
    'Airport Concourse B',
    'Suburban Plaza',
    'Harbor Galleria',
    'Express Outlet West',
  ];

  const segments = [
    'Loyalty VIP',
    'Walk-In Shopper',
    'Corporate Bulk',
    'First-Time Visitor',
    'Weekend Regular',
  ];

  const rows: Record<string, any>[] = [];
  const startDate = new Date(2024, 3, 1).getTime();
  const endDate = new Date(2025, 4, 30).getTime();

  for (let i = 1; i <= 520; i++) {
    const txn = `TXN-${88000 + i}`;
    const item = inventory[Math.floor(rand() * inventory.length)];
    const store = stores[Math.floor(rand() * stores.length)];
    const segment = segments[Math.floor(rand() * segments.length)];

    const t = startDate + rand() * (endDate - startDate);
    const d = new Date(t);
    const purchaseDate = d.toISOString().split('T')[0];

    // Qty sold between 1 and 12
    let qty = Math.floor(rand() * 5) + 1;
    if (segment === 'Corporate Bulk' && rand() > 0.4) {
      qty = Math.floor(rand() * 10) + 6;
    }

    const netValue = Math.round(qty * item.price * (0.97 + rand() * 0.06) * 100) / 100;

    rows.push({
      Transaction_No: txn,
      Purchase_Date: purchaseDate,
      Store_Area: store,
      Item_Description: item.desc,
      Qty_Sold: qty,
      Net_Value: netValue,
      Customer_Segment: segment,
    });
  }

  return rows;
}

// ---------------------------------------------------------------------------
// DATASET 3: BUSINESS PERFORMANCE (520 Rows)
// Columns: Staff_ID, Division, Work_Experience, Performance_Index, Monthly_Output, Monthly_Cost, Review_Score
// ---------------------------------------------------------------------------
function generateBusinessPerformanceDataset(): Record<string, any>[] {
  const rand = createSeededRandom(909);

  const divisions = [
    'Cloud Infrastructure',
    'Algorithmic Trading',
    'Customer Success',
    'Security Operations',
    'Product Engineering',
    'Strategic Marketing',
  ];

  const rows: Record<string, any>[] = [];

  for (let i = 1; i <= 520; i++) {
    const staffId = `EMP-${2000 + i}`;
    const division = divisions[Math.floor(rand() * divisions.length)];

    // Experience: 1 to 20 years
    const exp = Math.floor(rand() * 18) + 1;

    // Genuine statistical positive correlation between Work_Experience and Performance_Index (r ≈ 0.76)
    const basePerf = 62.0 + exp * 1.55;
    const noise = (rand() * 8.0 - 4.0);
    const perfIndex = Math.min(99.4, Math.max(58.0, Math.round((basePerf + noise) * 10) / 10));

    // Output: 120 to 650 units (also correlated with experience and division)
    const baseOutput = 160 + exp * 18 + Math.floor(rand() * 140);
    const monthlyOutput = Math.min(680, baseOutput);

    // Cost: $5,200 to $19,500
    const baseCost = 5400 + exp * 620 + Math.floor(rand() * 2200);
    const monthlyCost = Math.round(baseCost);

    // Review Score: 3.2 to 5.0
    const score = Math.min(5.0, Math.max(3.0, Math.round((3.2 + (perfIndex - 60) / 40 * 1.6 + (rand() * 0.4 - 0.2)) * 10) / 10));

    rows.push({
      Staff_ID: staffId,
      Division: division,
      Work_Experience: exp,
      Performance_Index: perfIndex,
      Monthly_Output: monthlyOutput,
      Monthly_Cost: monthlyCost,
      Review_Score: score,
    });
  }

  return rows;
}

// ---------------------------------------------------------------------------
// BENCHMARK DATASET 1 (Step 18): Product, Sales, Region, Date, Quantity
// ---------------------------------------------------------------------------
function generateUnseenSchema1Dataset(): Record<string, any>[] {
  return [
    { Product: 'Industrial Laptop X1', Sales: 24000.0, Region: 'North', Date: '2025-01-15', Quantity: 10 },
    { Product: 'Wireless Mechanical Keyboard', Sales: 3800.0, Region: 'South', Date: '2025-01-18', Quantity: 25 },
    { Product: 'Ultra HD 4K Monitor', Sales: 18500.0, Region: 'East', Date: '2025-01-22', Quantity: 15 },
    { Product: 'Noise-Canceling Headset', Sales: 9200.0, Region: 'West', Date: '2025-02-05', Quantity: 20 },
    { Product: 'Ergonomic Standing Desk', Sales: 15600.0, Region: 'Central', Date: '2025-02-12', Quantity: 8 },
    { Product: 'USB-C Universal Dock', Sales: 6400.0, Region: 'North', Date: '2025-02-20', Quantity: 30 },
    { Product: 'High-Speed NVMe 2TB SSD', Sales: 8900.0, Region: 'South', Date: '2025-03-02', Quantity: 40 },
    { Product: 'Industrial Laptop X1', Sales: 36000.0, Region: 'West', Date: '2025-03-10', Quantity: 15 },
    { Product: 'Smart AI Security Camera', Sales: 12400.0, Region: 'East', Date: '2025-03-18', Quantity: 12 },
    { Product: 'Ultra HD 4K Monitor', Sales: 24600.0, Region: 'Central', Date: '2025-03-25', Quantity: 20 },
  ];
}

// ---------------------------------------------------------------------------
// BENCHMARK DATASET 2 (Step 18): Item_Name, Total_Amount, Area, Purchase_Date, Qty_Sold
// ---------------------------------------------------------------------------
function generateUnseenSchema2Dataset(): Record<string, any>[] {
  return [
    { Item_Name: 'Cloud Server Blade Pro', Total_Amount: 48000.0, Area: 'Metropolitan Bay Area', Purchase_Date: '2025-01-10', Qty_Sold: 4 },
    { Item_Name: 'Managed Ethernet Switch 48P', Total_Amount: 14200.0, Area: 'Pacific Northwest', Purchase_Date: '2025-01-19', Qty_Sold: 12 },
    { Item_Name: 'Hardware Firewall Appliance', Total_Amount: 22500.0, Area: 'Midwest Metro', Purchase_Date: '2025-01-28', Qty_Sold: 6 },
    { Item_Name: 'Rackmount UPS Battery 3kVA', Total_Amount: 18900.0, Area: 'Greater London Hub', Purchase_Date: '2025-02-08', Qty_Sold: 9 },
    { Item_Name: 'Direct-Attached Storage 100TB', Total_Amount: 39500.0, Area: 'Tokyo Central', Purchase_Date: '2025-02-16', Qty_Sold: 3 },
    { Item_Name: 'Cat6A Ethernet Bulk Cable 1000ft', Total_Amount: 4600.0, Area: 'Sydney Coast', Purchase_Date: '2025-02-24', Qty_Sold: 20 },
    { Item_Name: 'Cloud Server Blade Pro', Total_Amount: 72000.0, Area: 'Berlin Urban District', Purchase_Date: '2025-03-05', Qty_Sold: 6 },
    { Item_Name: 'Managed Ethernet Switch 48P', Total_Amount: 21300.0, Area: 'Metropolitan Bay Area', Purchase_Date: '2025-03-14', Qty_Sold: 18 },
    { Item_Name: 'Hardware Firewall Appliance', Total_Amount: 37500.0, Area: 'Pacific Northwest', Purchase_Date: '2025-03-21', Qty_Sold: 10 },
    { Item_Name: 'Rackmount UPS Battery 3kVA', Total_Amount: 25200.0, Area: 'Nordic Corridor', Purchase_Date: '2025-03-29', Qty_Sold: 12 },
  ];
}

// ---------------------------------------------------------------------------
// BENCHMARK DATASET 3 (Step 18): Product_Name, Net_Revenue, Location, Transaction_Date, Units
// ---------------------------------------------------------------------------
function generateUnseenSchema3Dataset(): Record<string, any>[] {
  return [
    { Product_Name: 'Enterprise CRM Suite', Net_Revenue: 65000.0, Location: 'Chennai', Transaction_Date: '2025-01-12', Units: 15 },
    { Product_Name: 'Automated Billing Portal', Net_Revenue: 28400.0, Location: 'Bangalore', Transaction_Date: '2025-01-20', Units: 8 },
    { Product_Name: 'API Security Gateway', Net_Revenue: 34200.0, Location: 'Mumbai', Transaction_Date: '2025-02-02', Units: 10 },
    { Product_Name: 'Data Analytics Dashboard', Net_Revenue: 49000.0, Location: 'Hyderabad', Transaction_Date: '2025-02-14', Units: 12 },
    { Product_Name: 'AI Voice Transcription Core', Net_Revenue: 52500.0, Location: 'Delhi', Transaction_Date: '2025-02-26', Units: 18 },
    { Product_Name: 'Multi-Cloud Backup Engine', Net_Revenue: 39800.0, Location: 'Pune', Transaction_Date: '2025-03-07', Units: 9 },
    { Product_Name: 'Enterprise CRM Suite', Net_Revenue: 86000.0, Location: 'Chennai', Transaction_Date: '2025-03-15', Units: 20 },
    { Product_Name: 'Automated Billing Portal', Net_Revenue: 42600.0, Location: 'Bangalore', Transaction_Date: '2025-03-22', Units: 12 },
    { Product_Name: 'API Security Gateway', Net_Revenue: 51300.0, Location: 'Mumbai', Transaction_Date: '2025-03-28', Units: 15 },
    { Product_Name: 'Data Analytics Dashboard', Net_Revenue: 61250.0, Location: 'Hyderabad', Transaction_Date: '2025-03-31', Units: 15 },
  ];
}

// ---------------------------------------------------------------------------
// BENCHMARK DATASET 4 (Step 6 & 16): Ambiguous "Amount" & Unknown "XYZ_123"
// ---------------------------------------------------------------------------
function generateAmbiguousAndUnknownDataset(): Record<string, any>[] {
  return [
    { Item_ID: 'ITM-901', Item: 'Solar Inverter 5kW', Amount: 35000.0, Purchase_Date: '2025-01-10', XYZ_123: 'QX-9842-ALPHA' },
    { Item_ID: 'ITM-902', Item: 'Lithium Battery Pack', Amount: 42000.0, Purchase_Date: '2025-01-16', XYZ_123: 'QX-1104-BETA' },
    { Item_ID: 'ITM-903', Item: 'Photovoltaic Panel 400W', Amount: 18500.0, Purchase_Date: '2025-02-04', XYZ_123: 'QX-7721-GAMMA' },
    { Item_ID: 'ITM-904', Item: 'Solar Inverter 5kW', Amount: 52500.0, Purchase_Date: '2025-02-18', XYZ_123: 'QX-3490-DELTA' },
    { Item_ID: 'ITM-905', Item: 'Charge Controller 60A', Amount: 12800.0, Purchase_Date: '2025-03-12', XYZ_123: 'QX-5512-EPSILON' },
  ];
}

// ---------------------------------------------------------------------------
// DATASET 5: CREDIT CARD TRANSACTIONS (Benchmark for large datasets & fraud analysis)
// Columns: Time, V1, V2, V3, V4, Amount, Class (0 = Legitimate, 1 = Fraud)
// ---------------------------------------------------------------------------
function generateCreditCardDataset(): Record<string, any>[] {
  const rand = createSeededRandom(101);
  const rows: Record<string, any>[] = [];
  const rowCount = 600;

  for (let i = 0; i < rowCount; i++) {
    const isFraud = rand() < 0.08 ? 1 : 0;
    const timeSec = Math.round(i * 14.2);
    const v1 = Math.round((rand() * 4 - 2 + (isFraud ? -1.5 : 0)) * 1000) / 1000;
    const v2 = Math.round((rand() * 4 - 2 + (isFraud ? 2.1 : 0)) * 1000) / 1000;
    const v3 = Math.round((rand() * 4 - 2 + (isFraud ? -2.4 : 0)) * 1000) / 1000;
    const v4 = Math.round((rand() * 4 - 2 + (isFraud ? 1.8 : 0)) * 1000) / 1000;
    const baseAmt = isFraud ? 280 + rand() * 1200 : 15 + rand() * 320;
    const amount = Math.round(baseAmt * 100) / 100;

    rows.push({
      Time: timeSec,
      V1: v1,
      V2: v2,
      V3: v3,
      V4: v4,
      Amount: amount,
      Class: isFraud,
    });
  }
  return rows;
}

// Generate the datasets once
const ecommerceData = generateEcommerceDataset();
const retailData = generateRetailDataset();
const businessData = generateBusinessPerformanceDataset();
const unseen1Data = generateUnseenSchema1Dataset();
const unseen2Data = generateUnseenSchema2Dataset();
const unseen3Data = generateUnseenSchema3Dataset();
const ambiguousData = generateAmbiguousAndUnknownDataset();
const creditCardData = generateCreditCardDataset();

export const SAMPLE_DATASETS: SampleDatasetDefinition[] = [
  {
    id: 'unseen-schema-1',
    name: 'dataset_1_product_sales.csv',
    domain: 'Benchmark 1: Product · Sales · Region · Date · Quantity',
    description: 'Schema: Product, Sales, Region, Date, Quantity. Verifies standard business schema inference.',
    suggestedQuestions: [
      'Which product has the highest sales?',
      'Show sales by region.',
      'What is the total quantity sold?',
    ],
    data: unseen1Data,
  },
  {
    id: 'unseen-schema-2',
    name: 'dataset_2_item_total.csv',
    domain: 'Benchmark 2: Item_Name · Total_Amount · Area · Purchase_Date · Qty_Sold',
    description: 'Schema: Item_Name, Total_Amount, Area, Purchase_Date, Qty_Sold. Verifies unseen alternate schema mapping.',
    suggestedQuestions: [
      'Which item has the highest total amount?',
      'Show total amount by area.',
      'What is the total qty sold?',
    ],
    data: unseen2Data,
  },
  {
    id: 'unseen-schema-3',
    name: 'dataset_3_net_revenue.csv',
    domain: 'Benchmark 3: Product_Name · Net_Revenue · Location · Transaction_Date · Units',
    description: 'Schema: Product_Name, Net_Revenue, Location, Transaction_Date, Units. Verifies enterprise unseen schema mapping.',
    suggestedQuestions: [
      'Which product name has the highest net revenue?',
      'Show net revenue by location.',
      'What are the total units sold?',
    ],
    data: unseen3Data,
  },
  {
    id: 'ambiguous-and-unknown',
    name: 'dataset_ambiguous_unknown.csv',
    domain: 'Benchmark 4: Ambiguous Amount & Unknown Column (Step 6 & 16)',
    description: 'Schema: Item_ID, Item, Amount (ambiguous 55%/30%/15%), Purchase_Date, XYZ_123 (unknown field).',
    suggestedQuestions: [
      'Show the detected schema.',
      'What is the total amount?',
    ],
    data: ambiguousData,
  },
  {
    id: 'ecommerce-sales',
    name: 'ecommerce_sales.csv',
    domain: 'E-Commerce Sales (520 Rows)',
    description: 'Schema: Order_ID, Order_Date, Item_Name, Category_Type, Units, Total_Amount, Customer_Area, Payment_Type.',
    suggestedQuestions: [
      'Which item generated the highest sales?',
      'Which area has the highest sales?',
      'Show monthly sales.',
    ],
    data: ecommerceData,
  },
  {
    id: 'retail-sales',
    name: 'retail_sales.csv',
    domain: 'Retail Store Sales (520 Rows)',
    description: 'Schema: Transaction_No, Purchase_Date, Store_Area, Item_Description, Qty_Sold, Net_Value, Customer_Segment.',
    suggestedQuestions: [
      'Which store area has the highest net value?',
      'Which item has the highest quantity sold?',
    ],
    data: retailData,
  },
  {
    id: 'business-performance',
    name: 'business_performance.csv',
    domain: 'Business Performance (520 Rows)',
    description: 'Schema: Staff_ID, Division, Work_Experience, Performance_Index, Monthly_Output, Monthly_Cost, Review_Score.',
    suggestedQuestions: [
      'Which division has the highest average performance?',
      'What is the average monthly cost by division?',
    ],
    data: businessData,
  },
  {
    id: 'credit-card-transactions',
    name: 'creditcard.csv',
    domain: 'Credit Card Transactions & Fraud Detection',
    description: 'Schema: Time, V1, V2, V3, V4, Amount, Class. High-dimensional financial dataset for fraud pattern visualization and statistical variance analysis.',
    suggestedQuestions: [
      'Compare average Amount between fraud (Class 1) and legitimate (Class 0)',
      'Show distribution of transaction Amount',
      'Scatter plot of Time vs Amount',
      'Count of transactions by Class',
    ],
    data: creditCardData,
  },
];
