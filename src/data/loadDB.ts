import capabilityData from './puco_capability_db.json';

export interface CapabilityItem {
  code: string;
  grammar: string;
  category: string;
  name: string;
  desc: string;
  example: string;
}

export interface CapabilityDB {
  SN: CapabilityItem[];
  MP: CapabilityItem[];
  PJ: CapabilityItem[];
  SP: CapabilityItem[];
}

export const db: CapabilityDB = capabilityData as CapabilityDB;

const EXPECTED_COUNTS = {
  SN: 15,
  MP: 48,
  PJ: 27,
  SP: 25,
};

const EXPECTED_TOTAL = 115;

let actualTotal = 0;
let hasMismatch = false;

for (const [key, expectedCount] of Object.entries(EXPECTED_COUNTS)) {
  const categoryKey = key as keyof CapabilityDB;
  const actualCount = db[categoryKey]?.length || 0;
  actualTotal += actualCount;

  if (actualCount !== expectedCount) {
    console.warn(`[DB Validation] Category ${categoryKey} expected ${expectedCount} items, but got ${actualCount}`);
    hasMismatch = true;
  }
}

if (actualTotal !== EXPECTED_TOTAL) {
  console.warn(`[DB Validation] Total expected ${EXPECTED_TOTAL} items, but got ${actualTotal}`);
  hasMismatch = true;
}

export function findByCode(category: keyof CapabilityDB, code: string): CapabilityItem | undefined {
  const categoryItems = db[category];
  if (!categoryItems) return undefined;
  return categoryItems.find(item => item.code === code);
}

/**
 * Extracts intent/emotion keywords dynamically from all 'example' fields
 * of the database for real-time validation.
 */
export const intentKeywords = (() => {
  const allExamples = [...db.SN, ...db.MP, ...db.PJ, ...db.SP]
    .map(item => item.example)
    .filter(Boolean);
    
  // Split by spaces, commas, slashes, middle dots
  const words = allExamples.flatMap(ex => ex.split(/[\s,·/]+/));
  
  // Filter unique words length >= 2 and exclude overly generic functional words
  const excludeWords = new Set(['사용자', '대상', '지향', '주변', '상황', '전달', '제공', '표현', '인식', '확인', '전환', '등의', '맞춰', '맞는', '의도']);
  
  return Array.from(new Set(words)).filter(w => w.length >= 2 && !excludeWords.has(w));
})();
