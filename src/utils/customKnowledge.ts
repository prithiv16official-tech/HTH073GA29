import { CustomKnowledgeItem, UserPreferences, SupportedLanguage } from '../types/assistant';

const STORAGE_KEY_KNOWLEDGE = 'datamind_custom_knowledge_v1';
const STORAGE_KEY_PREFS = 'datamind_user_preferences_v1';

// Seed realistic starter custom knowledge items
const INITIAL_KNOWLEDGE: CustomKnowledgeItem[] = [
  {
    id: 'k-1',
    type: 'term',
    title: 'Revenue Definition',
    content: 'Revenue means total net sales value generated from verified transactions.',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'k-2',
    type: 'rule',
    title: 'High-Value Order Threshold',
    content: 'An order with value exceeding ₹1,00,000 (1 Lakh) is considered a High-Value Enterprise order.',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'k-3',
    type: 'term',
    title: 'Tanglish Revenue Term',
    content: 'Revenue na total sales amount nu artham.',
    language: 'tanglish',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'k-4',
    type: 'instruction',
    title: 'Progressive Disclosure Rule',
    content: 'Always give direct, concise answers first. Do not display breakdowns or charts unless requested.',
    createdAt: new Date().toISOString(),
  },
];

export const DEFAULT_PREFERENCES: UserPreferences = {
  preferredLanguage: 'auto',
  responseLength: 'short', // short by default!
  tone: 'casual',
  voiceAutoRead: false,
  preferredChartType: 'bar',
  voiceInputEnabled: true,
  voiceLanguage: 'auto',
  voiceAutoSend: false,
  voiceMode: false,
};

export function getCustomKnowledge(): CustomKnowledgeItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_KNOWLEDGE);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY_KNOWLEDGE, JSON.stringify(INITIAL_KNOWLEDGE));
      return INITIAL_KNOWLEDGE;
    }
    return JSON.parse(raw);
  } catch {
    return INITIAL_KNOWLEDGE;
  }
}

export function saveCustomKnowledge(items: CustomKnowledgeItem[]) {
  try {
    localStorage.setItem(STORAGE_KEY_KNOWLEDGE, JSON.stringify(items));
  } catch (err) {
    console.error('Failed to save custom knowledge:', err);
  }
}

export function addCustomKnowledge(
  title: string,
  content: string,
  type: CustomKnowledgeItem['type'] = 'term',
  language?: SupportedLanguage
): CustomKnowledgeItem {
  const items = getCustomKnowledge();
  const newItem: CustomKnowledgeItem = {
    id: `k-${Date.now()}`,
    type,
    title: title.trim(),
    content: content.trim(),
    language,
    createdAt: new Date().toISOString(),
  };
  const updated = [newItem, ...items];
  saveCustomKnowledge(updated);
  return newItem;
}

export function deleteCustomKnowledge(id: string) {
  const items = getCustomKnowledge();
  const filtered = items.filter((k) => k.id !== id);
  saveCustomKnowledge(filtered);
}

export function getUserPreferences(): UserPreferences {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PREFS);
    if (!raw) return DEFAULT_PREFERENCES;
    return { ...DEFAULT_PREFERENCES, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

export function saveUserPreferences(prefs: UserPreferences) {
  try {
    localStorage.setItem(STORAGE_KEY_PREFS, JSON.stringify(prefs));
  } catch (err) {
    console.error('Failed to save preferences:', err);
  }
}
