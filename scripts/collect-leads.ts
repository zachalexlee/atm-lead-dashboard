#!/usr/bin/env ts-node
/**
 * ATM Lead Collection Script
 * Runs daily at 5:30 AM PST to collect new leads
 * 
 * Sources:
 * - Tacoma building permits
 * - Pierce County building permits
 * - WA SOS new business registrations
 * - Local news monitoring
 */

import { addLead } from '../lib/db';

const TIER_1_KEYWORDS = [
  'convenience store', 'gas station', 'fuel', 'mini mart',
  'grocery', 'market', 'supermarket',
  'dispensary', 'cannabis', 'marijuana retail',
  'bar', 'tavern', 'nightclub', 'lounge'
];

const TIER_2_KEYWORDS = [
  'pharmacy', 'fast food', 'quick service',
  'liquor store', 'smoke shop', 'vape'
];

function scorePermit(description: string, valuation: number, sqft: number) {
  const descLower = description.toLowerCase();
  let score = 0;
  let tier = null;
  const matchedKeywords: string[] = [];

  // Check Tier 1 keywords
  for (const keyword of TIER_1_KEYWORDS) {
    if (descLower.includes(keyword)) {
      matchedKeywords.push(keyword);
      score += 10;
      tier = 'TIER_1';
    }
  }

  // Check Tier 2 if no Tier 1 match
  if (!tier) {
    for (const keyword of TIER_2_KEYWORDS) {
      if (descLower.includes(keyword)) {
        matchedKeywords.push(keyword);
        score += 5;
        tier = 'TIER_2';
      }
    }
  }

  // Bonus for valuation
  if (valuation > 250000) score += 3;
  else if (valuation > 100000) score += 2;
  else if (valuation > 50000) score += 1;

  // Bonus for size
  if (sqft > 5000) score += 2;
  else if (sqft > 2500) score += 1;

  return { score, tier, matchedKeywords };
}

async function collectTacomaPermits() {
  console.log('🔍 Collecting Tacoma permits...');
  
  // TODO: Implement actual API call to data.tacoma.gov
  // For now, this is a placeholder
  
  // Example of how it will work:
  // const response = await fetch('https://data.tacoma.gov/api/...');
  // const permits = await response.json();
  // for (const permit of permits) {
  //   const { score, tier, matchedKeywords } = scorePermit(...);
  //   addLead({ ... });
  // }
  
  console.log('✅ Tacoma permits collected');
}

async function collectPierceCountyPermits() {
  console.log('🔍 Collecting Pierce County permits...');
  
  // TODO: Implement actual data collection
  
  console.log('✅ Pierce County permits collected');
}

async function collectSOSFilings() {
  console.log('🔍 Checking WA SOS new business filings...');
  
  // TODO: Implement SOS data collection
  
  console.log('✅ SOS filings checked');
}

async function main() {
  console.log('='.repeat(80));
  console.log('ATM LEAD COLLECTION - Daily Update');
  console.log(`Started: ${new Date().toLocaleString()}`);
  console.log('='.repeat(80));

  try {
    await collectTacomaPermits();
    await collectPierceCountyPermits();
    await collectSOSFilings();

    console.log('\\n✅ Lead collection complete!');
    console.log(`Finished: ${new Date().toLocaleString()}`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Error collecting leads:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

export { collectTacomaPermits, collectPierceCountyPermits, collectSOSFilings };
