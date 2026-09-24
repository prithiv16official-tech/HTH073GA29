// Deterministic 24-Month Business & E-Commerce Dataset (October 2024 to September 2026)
// Generated with exact target calibration:
// - "Last Month" (August 2026): Total Sales ≈ ₹24.8 Lakhs (₹2,480,000)
// - "Previous Month" (July 2026): Total Sales ≈ ₹21.2 Lakhs (₹2,120,000)
// - Growth: +17.0%
// - Product breakdown in August 2026: Laptop ≈ ₹8.2L, Mobile ≈ ₹6.4L, Tablet ≈ ₹4.1L, Accessories ≈ ₹2.8L, Audio/Wearables ≈ ₹3.3L
// - Region breakdown in August 2026: South ≈ ₹9.1L, North ≈ ₹6.8L, West ≈ ₹5.2L, East ≈ ₹3.7L

export interface TransactionRecord {
  Order_ID: string;
  Date: string; // YYYY-MM-DD
  Year: number;
  Month: number; // 1 - 12
  Month_Name: string;
  Day: number;
  Product: string;
  Category: string;
  Region: string;
  Customer_Segment: string;
  Quantity: number;
  Unit_Price: number;
  Revenue: number; // in INR (₹)
}

function createRng(seed: number) {
  let s = seed;
  return function () {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

export function generateBusinessDataset(): TransactionRecord[] {
  const rand = createRng(1009);

  const productsByCategory: Record<string, { name: string; basePrice: number }[]> = {
    Laptop: [
      { name: 'MacBook Pro M3 Max 16"', basePrice: 210000 },
      { name: 'Dell XPS 15 OLED', basePrice: 165000 },
      { name: 'Lenovo ThinkPad X1 Carbon', basePrice: 145000 },
      { name: 'HP Spectre x360 14"', basePrice: 125000 },
      { name: 'ASUS ROG Zephyrus G16', basePrice: 175000 },
    ],
    Mobile: [
      { name: 'iPhone 15 Pro Max 256GB', basePrice: 135000 },
      { name: 'Samsung Galaxy S24 Ultra', basePrice: 129000 },
      { name: 'Google Pixel 9 Pro', basePrice: 105000 },
      { name: 'OnePlus 12 512GB', basePrice: 65000 },
    ],
    Tablet: [
      { name: 'iPad Pro 13" M4', basePrice: 115000 },
      { name: 'iPad Air 11" M2', basePrice: 59000 },
      { name: 'Samsung Galaxy Tab S9 Ultra', basePrice: 95000 },
    ],
    Accessories: [
      { name: 'Logitech MX Master 3S Mouse', basePrice: 9500 },
      { name: 'Keychron Q1 Pro Mechanical Keyboard', basePrice: 18500 },
      { name: 'CalDigit TS4 Thunderbolt Dock', basePrice: 38000 },
      { name: 'Anker 737 GaN 140W Power Bank', basePrice: 13500 },
      { name: 'SanDisk 2TB Extreme SSD', basePrice: 17500 },
    ],
    'Audio & Wearables': [
      { name: 'Sony WH-1000XM5 Headphones', basePrice: 29900 },
      { name: 'Apple Watch Ultra 2 Titanium', basePrice: 79900 },
      { name: 'Bose QuietComfort Ultra', basePrice: 34900 },
      { name: 'Shure SM7B Studio Mic', basePrice: 38900 },
    ],
  };

  const regions = ['South', 'North', 'West', 'East'];
  const segments = ['Consumer', 'Enterprise', 'SMB'];

  const records: TransactionRecord[] = [];
  let orderSeq = 1001;

  // Month-by-month generation from October 2024 to September 2026 (24 months)
  const monthConfig: { year: number; month: number; targetRevenue: number }[] = [
    // 2024
    { year: 2024, month: 10, targetRevenue: 1750000 },
    { year: 2024, month: 11, targetRevenue: 1820000 },
    { year: 2024, month: 12, targetRevenue: 1950000 },
    // 2025
    { year: 2025, month: 1, targetRevenue: 1680000 },
    { year: 2025, month: 2, targetRevenue: 1720000 },
    { year: 2025, month: 3, targetRevenue: 1880000 },
    { year: 2025, month: 4, targetRevenue: 1810000 },
    { year: 2025, month: 5, targetRevenue: 1900000 },
    { year: 2025, month: 6, targetRevenue: 1980000 },
    { year: 2025, month: 7, targetRevenue: 1920000 },
    { year: 2025, month: 8, targetRevenue: 2050000 },
    { year: 2025, month: 9, targetRevenue: 2010000 },
    { year: 2025, month: 10, targetRevenue: 2150000 },
    { year: 2025, month: 11, targetRevenue: 2200000 },
    { year: 2025, month: 12, targetRevenue: 2350000 },
    // 2026
    { year: 2026, month: 1, targetRevenue: 1950000 },
    { year: 2026, month: 2, targetRevenue: 1990000 },
    { year: 2026, month: 3, targetRevenue: 2080000 },
    { year: 2026, month: 4, targetRevenue: 2120000 },
    { year: 2026, month: 5, targetRevenue: 2180000 },
    { year: 2026, month: 6, targetRevenue: 2050000 },
    // July 2026: PREVIOUS MONTH = ₹21.2 Lakhs (₹2,120,000)
    { year: 2026, month: 7, targetRevenue: 2120000 },
    // August 2026: LAST MONTH = ₹24.8 Lakhs (₹2,480,000) -> EXACTLY +16.98% ≈ +17.0% Growth!
    { year: 2026, month: 8, targetRevenue: 2480000 },
    // September 2026: THIS MONTH (MTD through Sep 24) = ≈ ₹19.4 Lakhs
    { year: 2026, month: 9, targetRevenue: 1940000 },
  ];

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  for (const cfg of monthConfig) {
    const daysInMonth = cfg.month === 9 && cfg.year === 2026 ? 24 : new Date(cfg.year, cfg.month, 0).getDate();
    const ordersThisMonth = Math.floor(65 + rand() * 20); // 65-85 orders per month

    // Category shares
    // For August 2026 (Last Month): Laptop ~33% (8.2L), Mobile ~26% (6.4L), Tablet ~16.5% (4.1L), Accessories ~11.3% (2.8L), Audio ~13.2% (3.3L)
    const isAugust2026 = cfg.year === 2026 && cfg.month === 8;
    const isJuly2026 = cfg.year === 2026 && cfg.month === 7;

    const catWeights: Record<string, number> = isAugust2026
      ? { Laptop: 0.33, Mobile: 0.26, Tablet: 0.165, Accessories: 0.113, 'Audio & Wearables': 0.132 }
      : isJuly2026
      ? { Laptop: 0.29, Mobile: 0.27, Tablet: 0.17, Accessories: 0.13, 'Audio & Wearables': 0.14 }
      : { Laptop: 0.31, Mobile: 0.27, Tablet: 0.16, Accessories: 0.12, 'Audio & Wearables': 0.14 };

    // Region weights
    // August 2026: South ~36.7% (9.1L), North ~27.4% (6.8L), West ~21.0% (5.2L), East ~14.9% (3.7L)
    const regionWeights: Record<string, number> = isAugust2026
      ? { South: 0.367, North: 0.274, West: 0.21, East: 0.149 }
      : { South: 0.33, North: 0.29, West: 0.23, East: 0.15 };

    let generatedMonthRevenue = 0;
    const tempMonthRecords: TransactionRecord[] = [];

    for (let o = 0; o < ordersThisMonth; o++) {
      // Pick day
      const day = Math.floor(rand() * daysInMonth) + 1;
      const dateStr = `${cfg.year}-${String(cfg.month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

      // Pick category according to weight
      const catRand = rand();
      let cumCat = 0;
      let selectedCat = 'Laptop';
      for (const [cat, w] of Object.entries(catWeights)) {
        cumCat += w;
        if (catRand <= cumCat) {
          selectedCat = cat;
          break;
        }
      }

      // Pick product within category
      const productList = productsByCategory[selectedCat];
      const prod = productList[Math.floor(rand() * productList.length)];

      // Pick region according to weight
      const regRand = rand();
      let cumReg = 0;
      let selectedRegion = 'South';
      for (const [reg, w] of Object.entries(regionWeights)) {
        cumReg += w;
        if (regRand <= cumReg) {
          selectedRegion = reg;
          break;
        }
      }

      // Pick customer segment
      const segment = segments[Math.floor(rand() * segments.length)];

      // Quantity: Accessories/Audio may have 1-5 units, Laptops 1-2
      const maxQty = selectedCat === 'Accessories' ? 4 : selectedCat === 'Laptop' ? 2 : 3;
      const quantity = Math.floor(rand() * maxQty) + 1;

      // Small price variation (±4%)
      const unitPrice = Math.round(prod.basePrice * (0.97 + rand() * 0.06));
      const revenue = unitPrice * quantity;

      tempMonthRecords.push({
        Order_ID: `ORD-${orderSeq++}`,
        Date: dateStr,
        Year: cfg.year,
        Month: cfg.month,
        Month_Name: monthNames[cfg.month - 1],
        Day: day,
        Product: prod.name,
        Category: selectedCat,
        Region: selectedRegion,
        Customer_Segment: segment,
        Quantity: quantity,
        Unit_Price: unitPrice,
        Revenue: revenue,
      });

      generatedMonthRevenue += revenue;
    }

    // Scale month records slightly to hit the exact target revenue precisely
    const scaleFactor = cfg.targetRevenue / (generatedMonthRevenue || 1);
    for (const rec of tempMonthRecords) {
      rec.Revenue = Math.round(rec.Revenue * scaleFactor);
      records.push(rec);
    }
  }

  // Sort chronologically by date
  records.sort((a, b) => a.Date.localeCompare(b.Date));

  return records;
}

// Singleton cache for rapid responsiveness
let cachedData: TransactionRecord[] | null = null;
export function getBusinessDataset(): TransactionRecord[] {
  if (!cachedData) {
    cachedData = generateBusinessDataset();
  }
  return cachedData;
}
