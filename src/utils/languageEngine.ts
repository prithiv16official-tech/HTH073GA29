import { SupportedLanguage } from '../types/assistant';

// Tanglish lexical markers
const TANGLISH_TOKENS = [
  'evlo', 'evalavu', 'irundhuchu', 'irukku', 'enna', 'solu', 'sollu', 'pannu',
  'kammi', 'adhigham', 'athigam', 'kuduthu', 'machan', 'thala', 'bro', 'da',
  'kadandha', 'pona', 'maasam', 'maasathoda', 'rendu', 'na', 'namma', 'ippo',
  'mudhal', 'edhu', 'yaaru', 'enga', 'parunga'
];

/**
 * Detect language from input string
 */
export function detectLanguage(text: string): SupportedLanguage {
  if (!text || !text.trim()) return 'en';

  const t = text.trim();

  // 1. Unicode script detection
  if (/[\u0B80-\u0BFF]/.test(t)) return 'ta'; // Tamil
  if (/[\u0900-\u097F]/.test(t)) return 'hi'; // Hindi
  if (/[\u0C00-\u0C7F]/.test(t)) return 'te'; // Telugu
  if (/[\u0D00-\u0D7F]/.test(t)) return 'ml'; // Malayalam
  if (/[\u0C80-\u0CFF]/.test(t)) return 'kn'; // Kannada

  // 2. Tanglish check (Latin letters but Tamil words)
  const lowerWords = t.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/);
  const tanglishMatch = lowerWords.some((w) => TANGLISH_TOKENS.includes(w));
  if (tanglishMatch) return 'tanglish';

  return 'en';
}

/**
 * Multilingual Response Templates
 */
interface LocalizedPhrases {
  salesTotal: (period: string, amount: string, growthPct?: number, prevPeriod?: string) => string;
  topProduct: (productName: string, amount: string, sharePct?: number) => string;
  regionSales: (regionName: string, amount: string, sharePct?: number) => string;
  regionComparison: (regionName: string, curAmount: string, prevAmount: string, growthPct: number) => string;
  whyAnalysis: (growthPct: number, reason: string) => string;
  explanation: (orderCount: number, dateRange: string) => string;
  chartIntro: (topic: string) => string;
  detailsIntro: (topic: string) => string;
  noData: string;
}

export const LOCALIZED_RESPONSES: Record<SupportedLanguage, LocalizedPhrases> = {
  en: {
    salesTotal: (period, amount, growthPct, prevPeriod) => {
      let msg = `${period} sales were ${amount}`;
      if (growthPct !== undefined && prevPeriod) {
        const sign = growthPct >= 0 ? '+' : '';
        const dir = growthPct >= 0 ? 'up' : 'down';
        msg += `, ${dir} ${Math.abs(growthPct).toFixed(1)}% (${sign}${growthPct.toFixed(1)}%) from ${prevPeriod}.`;
      } else {
        msg += '.';
      }
      return msg;
    },
    topProduct: (productName, amount, sharePct) =>
      `The top selling product was ${productName}, generating ${amount}${sharePct ? ` (${sharePct}% of total)` : ''}.`,
    regionSales: (regionName, amount, sharePct) =>
      `${regionName} region generated ${amount}${sharePct ? ` (${sharePct}% of total sales)` : ''}.`,
    regionComparison: (regionName, curAmount, prevAmount, growthPct) => {
      const dir = growthPct >= 0 ? 'increased' : 'decreased';
      return `In the ${regionName} region, sales ${dir} from ${prevAmount} to ${curAmount} (${growthPct >= 0 ? '+' : ''}${growthPct.toFixed(1)}%).`;
    },
    whyAnalysis: (growthPct, reason) =>
      `Sales ${growthPct >= 0 ? 'increased' : 'decreased'} by ${Math.abs(growthPct).toFixed(1)}%. Primary factors: ${reason}`,
    explanation: (orderCount, dateRange) =>
      `Calculated from ${orderCount} verified transaction records recorded between ${dateRange}.`,
    chartIntro: (topic) => `Here is the requested chart for ${topic}:`,
    detailsIntro: (topic) => `Here is the detailed breakdown for ${topic}:`,
    noData: `No matching records found for that criteria in the dataset.`,
  },

  tanglish: {
    salesTotal: (period, amount, growthPct, prevPeriod) => {
      let msg = `${period} sales ${amount} irundhuchu`;
      if (growthPct !== undefined && prevPeriod) {
        const dir = growthPct >= 0 ? 'increase aagirukku' : 'kammi aagirukku';
        msg += `, ${prevPeriod}-oda compare pannumbodhu ${Math.abs(growthPct).toFixed(1)}% ${dir} da.`;
      } else {
        msg += ' da.';
      }
      return msg;
    },
    topProduct: (productName, amount, sharePct) =>
      `Top product ${productName} thaan, adhu mattum ${amount} revenue kuduthurukku (${sharePct}% share).`,
    regionSales: (regionName, amount, sharePct) =>
      `${regionName} region-la total sales ${amount} vanthurukku (${sharePct}% share).`,
    regionComparison: (regionName, curAmount, prevAmount, growthPct) => {
      const dir = growthPct >= 0 ? 'adhigam aagirukku' : 'koranjirukku';
      return `${regionName} region-la sales ${prevAmount}-la irundhu ${curAmount}-ku ${growthPct >= 0 ? '+' : ''}${growthPct.toFixed(1)}% ${dir}.`;
    },
    whyAnalysis: (growthPct, reason) =>
      `Sales ${Math.abs(growthPct).toFixed(1)}% ${growthPct >= 0 ? 'increase' : 'decrease'} aachu. Mukkiya karanam: ${reason}`,
    explanation: (orderCount, dateRange) =>
      `${dateRange} kaalathula irundha ${orderCount} unmaiyaana order records vachi calculate panniyathu.`,
    chartIntro: (topic) => `${topic}-kku chart paaru:`,
    detailsIntro: (topic) => `${topic}-kku complete details:`,
    noData: `Data-la match aagura mathiri records ethuvum kedaikala bro.`,
  },

  ta: {
    salesTotal: (period, amount, growthPct, prevPeriod) => {
      let msg = `${period} விற்பனை ${amount} ஆகும்`;
      if (growthPct !== undefined && prevPeriod) {
        const dir = growthPct >= 0 ? 'அதிகம்' : 'குறைவு';
        msg += `, இது ${prevPeriod} விட ${Math.abs(growthPct).toFixed(1)}% ${dir}.`;
      } else {
        msg += '.';
      }
      return msg;
    },
    topProduct: (productName, amount, sharePct) =>
      `அதிகம் விற்பனையான பொருள் ${productName}, இது ${amount} வருவாயை ஈட்டியுள்ளது (${sharePct}% பங்கு).`,
    regionSales: (regionName, amount, sharePct) =>
      `${regionName} மண்டலத்தில் மொத்தம் ${amount} விற்பனை நடந்துள்ளது (${sharePct}% பங்கு).`,
    regionComparison: (regionName, curAmount, prevAmount, growthPct) => {
      const dir = growthPct >= 0 ? 'அதிகரித்துள்ளது' : 'குறைந்துள்ளது';
      return `${regionName} மண்டலத்தில் விற்பனை ${prevAmount} இலிருந்து ${curAmount} ஆக ${dir} (${growthPct >= 0 ? '+' : ''}${growthPct.toFixed(1)}%).`;
    },
    whyAnalysis: (growthPct, reason) =>
      `விற்பனை ${Math.abs(growthPct).toFixed(1)}% ${growthPct >= 0 ? 'அதிகரித்துள்ளது' : 'குறைந்துள்ளது'}. முக்கியக் காரணிகள்: ${reason}`,
    explanation: (orderCount, dateRange) =>
      `${dateRange} இடையே பதிவு செய்யப்பட்ட ${orderCount} உண்மையான பரிவர்த்தனைகளின் அடிப்படையில் கணக்கிடப்பட்டது.`,
    chartIntro: (topic) => `${topic} க்கான வரைபடம்:`,
    detailsIntro: (topic) => `${topic} க்கான விரிவான விவரங்கள்:`,
    noData: `குறிப்பிட்ட அளவுகோல்களுடன் தரவு எதுவும் கிடைக்கவில்லை.`,
  },

  hi: {
    salesTotal: (period, amount, growthPct, prevPeriod) => {
      let msg = `${period} की कुल बिक्री ${amount} थी`;
      if (growthPct !== undefined && prevPeriod) {
        const dir = growthPct >= 0 ? 'अधिक' : 'कम';
        msg += `, जो ${prevPeriod} की तुलना में ${Math.abs(growthPct).toFixed(1)}% ${dir} है।`;
      } else {
        msg += '।';
      }
      return msg;
    },
    topProduct: (productName, amount, sharePct) =>
      `सबसे अधिक बिकने वाला उत्पाद ${productName} रहा, जिसने ${amount} का राजस्व अर्जित किया (${sharePct}% हिस्सा)।`,
    regionSales: (regionName, amount, sharePct) =>
      `${regionName} क्षेत्र से कुल ${amount} की बिक्री हुई (${sharePct}% हिस्सा)।`,
    regionComparison: (regionName, curAmount, prevAmount, growthPct) => {
      const dir = growthPct >= 0 ? 'बढ़ी' : 'घटी';
      return `${regionName} क्षेत्र में बिक्री ${prevAmount} से बढ़कर ${curAmount} हो गई (${growthPct >= 0 ? '+' : ''}${growthPct.toFixed(1)}%)।`;
    },
    whyAnalysis: (growthPct, reason) =>
      `बिक्री में ${Math.abs(growthPct).toFixed(1)}% का बदलाव देखा गया। मुख्य कारण: ${reason}`,
    explanation: (orderCount, dateRange) =>
      `${dateRange} के बीच दर्ज किए गए ${orderCount} वास्तविक लेनदेन से गणना की गई।`,
    chartIntro: (topic) => `${topic} के लिए चार्ट:`,
    detailsIntro: (topic) => `${topic} का विस्तृत विवरण:`,
    noData: `दिए गए मानदंडों के लिए कोई डेटा नहीं मिला।`,
  },

  te: {
    salesTotal: (period, amount, growthPct, prevPeriod) => {
      let msg = `${period} అమ్మకాలు ${amount} నమోదయ్యాయి`;
      if (growthPct !== undefined && prevPeriod) {
        const dir = growthPct >= 0 ? 'పెరిగింది' : 'తగ్గింది';
        msg += `, ఇది ${prevPeriod} కంటే ${Math.abs(growthPct).toFixed(1)}% ${dir}.`;
      } else {
        msg += '.';
      }
      return msg;
    },
    topProduct: (productName, amount, sharePct) =>
      `అత్యధికంగా అమ్ముడైన ఉత్పత్తి ${productName}, ఇది ${amount} ఆదాయాన్ని ఆర్జించింది (${sharePct}% వాటా).`,
    regionSales: (regionName, amount, sharePct) =>
      `${regionName} ప్రాంతంలో మొత్తం ${amount} అమ్మకాలు జరిగాయి (${sharePct}% వాటా).`,
    regionComparison: (regionName, curAmount, prevAmount, growthPct) => {
      const dir = growthPct >= 0 ? 'పెరిగాయి' : 'తగ్గాయి';
      return `${regionName} ప్రాంతంలో అమ్మకాలు ${prevAmount} నుండి ${curAmount}కి ${dir} (${growthPct >= 0 ? '+' : ''}${growthPct.toFixed(1)}%).`;
    },
    whyAnalysis: (growthPct, reason) =>
      `అమ్మకాలు ${Math.abs(growthPct).toFixed(1)}% మారాయి. ప్రధాన కారణాలు: ${reason}`,
    explanation: (orderCount, dateRange) =>
      `${dateRange} మధ్య నమోదైన ${orderCount} వాస్తవ లావాదేవీల ఆధారంగా లెక్కించబడింది.`,
    chartIntro: (topic) => `${topic} కోసం చార్ట్:`,
    detailsIntro: (topic) => `${topic} సమగ్ర వివరాలు:`,
    noData: `ఈ వివరాలతో రికార్డులు ఏవీ లభించలేదు.`,
  },

  ml: {
    salesTotal: (period, amount, growthPct, prevPeriod) => {
      let msg = `${period} വിൽപ്പന ${amount} ആയിരുന്നു`;
      if (growthPct !== undefined && prevPeriod) {
        const dir = growthPct >= 0 ? 'വർദ്ധനവ്' : 'കുറവ്';
        msg += `, ഇത് ${prevPeriod}-നേക്കാൾ ${Math.abs(growthPct).toFixed(1)}% ${dir} ആണ്.`;
      } else {
        msg += '.';
      }
      return msg;
    },
    topProduct: (productName, amount, sharePct) =>
      `ഏറ്റവും കൂടുതൽ വിറ്റഴിക്കപ്പെട്ട ഉൽപ്പന്നം ${productName} ആണ്, ഇത് ${amount} വരുമാനം നേടി (${sharePct}% പങ്ക്).`,
    regionSales: (regionName, amount, sharePct) =>
      `${regionName} മേഖലയിൽ ആകെ ${amount} വിൽപ്പന നടന്നു (${sharePct}% പങ്ക്).`,
    regionComparison: (regionName, curAmount, prevAmount, growthPct) => {
      const dir = growthPct >= 0 ? 'വർദ്ധിച്ചു' : 'കുറഞ്ഞു';
      return `${regionName} മേഖലയിൽ വിൽപ്പന ${prevAmount}-ൽ നിന്ന് ${curAmount}-ലേക്ക് ${dir} (${growthPct >= 0 ? '+' : ''}${growthPct.toFixed(1)}%).`;
    },
    whyAnalysis: (growthPct, reason) =>
      `വിൽപ്പനയിൽ ${Math.abs(growthPct).toFixed(1)}% മാറ്റം ഉണ്ടായി. പ്രധാന കാരണങ്ങൾ: ${reason}`,
    explanation: (orderCount, dateRange) =>
      `${dateRange} കാലയളവിലെ ${orderCount} ഇടപാടുകളിൽ നിന്ന് കണക്കാക്കിയത്.`,
    chartIntro: (topic) => `${topic} നായുള്ള ചാർട്ട്:`,
    detailsIntro: (topic) => `${topic} സംബന്ധിച്ച വിശദാംശങ്ങൾ:`,
    noData: `ഈ നിബന്ധനകൾക്ക് അനുയോജ്യമായ ഡാറ്റ ലഭ്യമല്ല.`,
  },

  kn: {
    salesTotal: (period, amount, growthPct, prevPeriod) => {
      let msg = `${period} ಮಾರಾಟ ${amount} ಆಗಿತ್ತು`;
      if (growthPct !== undefined && prevPeriod) {
        const dir = growthPct >= 0 ? 'ಹೆಚ್ಚಳ' : 'ಇಳಿಕೆ';
        msg += `, ಇದು ${prevPeriod} ಗಿಂತ ${Math.abs(growthPct).toFixed(1)}% ${dir} ಆಗಿದೆ.`;
      } else {
        msg += '.';
      }
      return msg;
    },
    topProduct: (productName, amount, sharePct) =>
      `ಅತಿ ಹೆಚ್ಚು ಮಾರಾಟವಾದ ಉತ್ಪನ್ನ ${productName}, ಇದು ${amount} ಆದಾಯ ಗಳಿಸಿದೆ (${sharePct}% ಪಾಲು).`,
    regionSales: (regionName, amount, sharePct) =>
      `${regionName} ಪ್ರದೇಶದಲ್ಲಿ ಒಟ್ಟು ${amount} ಮಾರಾಟವಾಗಿದೆ (${sharePct}% ಪಾಲು).`,
    regionComparison: (regionName, curAmount, prevAmount, growthPct) => {
      const dir = growthPct >= 0 ? 'ಹೆಚ್ಚಾಗಿದೆ' : 'ಕಡಿಮೆಯಾಗಿದೆ';
      return `${regionName} ಪ್ರದೇಶದಲ್ಲಿ ಮಾರಾಟ ${prevAmount} ರಿಂದ ${curAmount} ಕ್ಕೆ ${dir} (${growthPct >= 0 ? '+' : ''}${growthPct.toFixed(1)}%).`;
    },
    whyAnalysis: (growthPct, reason) =>
      `ಮಾರಾಟದಲ್ಲಿ ${Math.abs(growthPct).toFixed(1)}% ಬದಲಾವಣೆಯಾಗಿದೆ. ಮುಖ್ಯ ಅಂಶಗಳು: ${reason}`,
    explanation: (orderCount, dateRange) =>
      `${dateRange} ನಡುವೆ ದಾಖಲಾದ ${orderCount} ವಾಸ್ತವಿಕ ಆರ್ಡರ್‌ಗಳ ಆಧಾರದ ಮೇಲೆ ಲೆಕ್ಕಹಾಕಲಾಗಿದೆ.`,
    chartIntro: (topic) => `${topic} ಗಾಗಿ ಚಾರ್ಟ್:`,
    detailsIntro: (topic) => `${topic} ವಿವರವಾದ ಮಾಹಿತಿ:`,
    noData: `ನೀಡಿರುವ ಮಾನದಂಡಗಳಿಗೆ ಹೊಂದಿಕೆಯಾಗುವ ಯಾವುದೇ ಡೇಟಾ ಕಂಡುಬಂದಿಲ್ಲ.`,
  },

  auto: {} as any, // resolved dynamically
};
