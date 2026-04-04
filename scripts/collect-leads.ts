#!/usr/bin/env ts-node
/**
 * ATM Lead Collection Script
 * Runs daily at 5:30 AM PST to collect new leads
 * 
 * Sources:
 * - Tacoma building permits (data.tacoma.gov)
 * - Pierce County building permits (open.piercecountywa.gov)
 * - WA SOS new business registrations (TODO)
 * - Local news monitoring (TODO)
 */

import { addLead, db } from '../lib/db';
import { fetchTacomaPermits } from './tacoma-permits';
import { fetchPiercePermits } from './pierce-permits';
import { scrapeTacomaPermits } from './scrape-tacoma';
import { scrapePiercePermits } from './scrape-pierce';

const TIER_1_KEYWORDS = [
  'convenience store', 'gas station', 'fuel', 'mini mart', 'c-store',
  'grocery', 'market', 'supermarket', 'food store',
  'dispensary', 'cannabis', 'marijuana retail',
  'bar', 'tavern', 'nightclub', 'lounge', 'brewpub',
  'credit union', 'strip club', 'game room'
];

const TIER_2_KEYWORDS = [
  'pharmacy', 'fast food', 'quick service', 'restaurant',
  'liquor store', 'smoke shop', 'vape', 'tobacco'
];

interface PermitScore {
  score: number;
  tier: 'TIER_1' | 'TIER_2' | null;
  matchedKeywords: string[];
  businessType: string;
}

function scorePermit(description: string, permitType: string, valuation: number, sqft: number): PermitScore {
  const descLower = (description + ' ' + permitType).toLowerCase();
  let score = 0;
  let tier: 'TIER_1' | 'TIER_2' | null = null;
  const matchedKeywords: string[] = [];
  let businessType = 'Unknown';

  // Check Tier 1 keywords (highest priority)
  for (const keyword of TIER_1_KEYWORDS) {
    if (descLower.includes(keyword)) {
      matchedKeywords.push(keyword);
      score += 10;
      tier = 'TIER_1';
      businessType = keyword.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
      break; // First match wins
    }
  }

  // Check Tier 2 if no Tier 1 match
  if (!tier) {
    for (const keyword of TIER_2_KEYWORDS) {
      if (descLower.includes(keyword)) {
        matchedKeywords.push(keyword);
        score += 5;
        tier = 'TIER_2';
        businessType = keyword.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
        break;
      }
    }
  }

  // Skip if no tier match
  if (!tier) {
    return { score: 0, tier: null, matchedKeywords: [], businessType: 'Not ATM Target' };
  }

  // Bonus for valuation (bigger project = more serious business)
  if (valuation > 500000) score += 5;
  else if (valuation > 250000) score += 3;
  else if (valuation > 100000) score += 2;
  else if (valuation > 50000) score += 1;

  // Bonus for size
  if (sqft > 5000) score += 3;
  else if (sqft > 2500) score += 2;
  else if (sqft > 1000) score += 1;

  return { score, tier, matchedKeywords, businessType };
}

async function collectTacomaPermits() {
  console.log('\n' + '='.repeat(80));
  console.log('🏙️  TACOMA BUILDING PERMITS');
  console.log('='.repeat(80));
  
  // Try API first
  let permits = await fetchTacomaPermits(90);
  
  // If API failed, try scraping
  if (permits.length === 0) {
    console.log('  → API failed, trying Puppeteer scraper...');
    try {
      permits = await scrapeTacomaPermits(90);
    } catch (error) {
      console.log('  ❌ Scraping also failed:', error instanceof Error ? error.message : String(error));
    }
  }
  
  let added = 0;
  let skipped = 0;

  for (const permit of permits) {
    const { score, tier, matchedKeywords, businessType } = scorePermit(
      permit.description,
      permit.permitType,
      permit.valuation,
      permit.sqft
    );

    // Only add if it matches our target business types
    if (!tier || score < 5) {
      skipped++;
      continue;
    }

    // Check if already exists
    const existing = db.prepare('SELECT id FROM leads WHERE permit_number = ?').get(permit.permitNumber);
    if (existing) {
      console.log(`  ⏭️  Skip (duplicate): ${permit.permitNumber} - ${businessType}`);
      skipped++;
      continue;
    }

    console.log(`  ✅ Add ${tier}: ${businessType} - ${permit.address}`);
    console.log(`     Score: ${score} | Keywords: ${matchedKeywords.join(', ')}`);
    console.log(`     Valuation: $${permit.valuation.toLocaleString()} | ${permit.sqft} sq ft`);

    addLead({
      permit_number: permit.permitNumber,
      source: 'Tacoma Building Permit',
      date_found: new Date().toISOString().split('T')[0],
      business_name: `${businessType} (Pending)`,
      business_type: businessType,
      address: permit.address,
      city: 'Tacoma',
      state: 'WA',
      tier,
      score,
      lead_status: 'NEW',
      valuation: permit.valuation,
      square_feet: permit.sqft,
      issue_date: permit.issueDate,
      status: permit.status,
      matched_keywords: matchedKeywords.join(', '),
      description: permit.description
    });

    added++;
  }

  console.log(`\n📊 Tacoma Results: ${added} added, ${skipped} skipped, ${permits.length} total`);
}

async function collectPierceCountyPermits() {
  console.log('\n' + '='.repeat(80));
  console.log('🏘️  PIERCE COUNTY BUILDING PERMITS');
  console.log('='.repeat(80));
  
  // Try API first
  let permits = await fetchPiercePermits(90);
  
  // If API failed, try scraping
  if (permits.length === 0) {
    console.log('  → API failed, trying Puppeteer scraper...');
    try {
      permits = await scrapePiercePermits(90);
    } catch (error) {
      console.log('  ❌ Scraping also failed:', error instanceof Error ? error.message : String(error));
    }
  }
  
  let added = 0;
  let skipped = 0;

  for (const permit of permits) {
    const { score, tier, matchedKeywords, businessType } = scorePermit(
      permit.description,
      permit.permitType,
      permit.valuation,
      permit.sqft
    );

    if (!tier || score < 5) {
      skipped++;
      continue;
    }

    const existing = db.prepare('SELECT id FROM leads WHERE permit_number = ?').get(permit.permitNumber);
    if (existing) {
      console.log(`  ⏭️  Skip (duplicate): ${permit.permitNumber} - ${businessType}`);
      skipped++;
      continue;
    }

    console.log(`  ✅ Add ${tier}: ${businessType} - ${permit.address}`);
    console.log(`     Score: ${score} | Keywords: ${matchedKeywords.join(', ')}`);
    console.log(`     Valuation: $${permit.valuation.toLocaleString()} | ${permit.sqft} sq ft`);

    addLead({
      permit_number: permit.permitNumber,
      source: 'Pierce County Building Permit',
      date_found: new Date().toISOString().split('T')[0],
      business_name: `${businessType} (Pending)`,
      business_type: businessType,
      address: permit.address,
      city: 'Pierce County',
      state: 'WA',
      tier,
      score,
      lead_status: 'NEW',
      valuation: permit.valuation,
      square_feet: permit.sqft,
      issue_date: permit.issueDate,
      status: permit.status,
      matched_keywords: matchedKeywords.join(', '),
      description: permit.description
    });

    added++;
  }

  console.log(`\n📊 Pierce County Results: ${added} added, ${skipped} skipped, ${permits.length} total`);
}

async function collectSOSFilings() {
  console.log('\n' + '='.repeat(80));
  console.log('📋 WA SECRETARY OF STATE - NEW BUSINESS FILINGS');
  console.log('='.repeat(80));
  
  console.log('⏸️  Not yet implemented - requires public records request');
  console.log('💡 Next step: File quarterly bulk data request with WA SOS');
}

async function main() {
  const startTime = new Date();
  
  console.log('\n\n');
  console.log('█'.repeat(80));
  console.log('█                                                                              █');
  console.log('█                    ATM LEAD COLLECTION - Daily Update                       █');
  console.log('█                                                                              █');
  console.log('█'.repeat(80));
  console.log(`Started: ${startTime.toLocaleString()}`);
  console.log('');

  try {
    // Collect from all sources
    await collectTacomaPermits();
    await collectPierceCountyPermits();
    await collectSOSFilings();

    // Final summary
    const endTime = new Date();
    const duration = ((endTime.getTime() - startTime.getTime()) / 1000).toFixed(1);

    // Get total lead counts
    const totalLeads = db.prepare('SELECT COUNT(*) as count FROM leads').get() as { count: number };
    const newLeads = db.prepare('SELECT COUNT(*) as count FROM leads WHERE status = "NEW"').get() as { count: number };
    const tier1 = db.prepare('SELECT COUNT(*) as count FROM leads WHERE tier = "TIER_1"').get() as { count: number };

    console.log('\n' + '='.repeat(80));
    console.log('✅ COLLECTION COMPLETE');
    console.log('='.repeat(80));
    console.log(`Total Leads in Database: ${totalLeads.count}`);
    console.log(`New (Uncontacted): ${newLeads.count}`);
    console.log(`Tier 1 (High Priority): ${tier1.count}`);
    console.log(`Duration: ${duration}s`);
    console.log(`Finished: ${endTime.toLocaleString()}`);
    console.log('='.repeat(80));
    console.log('');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ ERROR during lead collection:');
    console.error(error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

export { collectTacomaPermits, collectPierceCountyPermits, collectSOSFilings };
