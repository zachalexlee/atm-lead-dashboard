/**
 * CSV Import Tool
 * 
 * Import building permits from manually downloaded CSV files
 * 
 * Usage:
 *   npx tsx scripts/import-csv.ts data/tacoma-permits.csv
 *   npx tsx scripts/import-csv.ts data/pierce-permits.csv
 */

import * as fs from 'fs';
import * as path from 'path';
import { addLead, db } from '../lib/db';

interface PermitCSVRow {
  [key: string]: string;
}

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

function parseCSV(content: string): PermitCSVRow[] {
  const lines = content.split('\n').filter(line => line.trim());
  if (lines.length < 2) return [];
  
  const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/"/g, ''));
  const rows: PermitCSVRow[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
    const row: PermitCSVRow = {};
    
    headers.forEach((header, idx) => {
      row[header] = values[idx] || '';
    });
    
    rows.push(row);
  }
  
  return rows;
}

function getFieldValue(row: PermitCSVRow, ...possibleNames: string[]): string {
  for (const name of possibleNames) {
    const lowerName = name.toLowerCase();
    for (const key in row) {
      if (key.toLowerCase().includes(lowerName)) {
        return row[key];
      }
    }
  }
  return '';
}

function scorePermit(description: string, permitType: string, valuation: number, sqft: number) {
  const descLower = (description + ' ' + permitType).toLowerCase();
  let score = 0;
  let tier: 'TIER_1' | 'TIER_2' | null = null;
  const matchedKeywords: string[] = [];
  let businessType = 'Unknown';

  for (const keyword of TIER_1_KEYWORDS) {
    if (descLower.includes(keyword)) {
      matchedKeywords.push(keyword);
      score += 10;
      tier = 'TIER_1';
      businessType = keyword.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
      break;
    }
  }

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

  if (!tier) {
    return { score: 0, tier: null, matchedKeywords: [], businessType: 'Not ATM Target' };
  }

  if (valuation > 500000) score += 5;
  else if (valuation > 250000) score += 3;
  else if (valuation > 100000) score += 2;
  else if (valuation > 50000) score += 1;

  if (sqft > 5000) score += 3;
  else if (sqft > 2500) score += 2;
  else if (sqft > 1000) score += 1;

  return { score, tier, matchedKeywords, businessType };
}

async function importCSV(filePath: string, source: string) {
  console.log(`\n📂 Importing CSV: ${filePath}`);
  console.log(`   Source: ${source}`);
  
  if (!fs.existsSync(filePath)) {
    console.error(`❌ File not found: ${filePath}`);
    process.exit(1);
  }
  
  const content = fs.readFileSync(filePath, 'utf-8');
  const rows = parseCSV(content);
  
  console.log(`   Found ${rows.length} rows in CSV`);
  
  let added = 0;
  let skipped = 0;
  
  for (const row of rows) {
    const permitNumber = getFieldValue(row, 'permit number', 'permit #', 'number', 'permit_number');
    const permitType = getFieldValue(row, 'permit type', 'type');
    const address = getFieldValue(row, 'address', 'location', 'site address');
    const description = getFieldValue(row, 'description', 'project description', 'work description');
    const valuationStr = getFieldValue(row, 'valuation', 'value', 'project value');
    const sqftStr = getFieldValue(row, 'sq ft', 'sqft', 'square feet', 'size');
    const issueDate = getFieldValue(row, 'issue date', 'issued', 'date issued', 'date');
    const status = getFieldValue(row, 'status', 'permit status');
    
    const valuation = parseFloat(valuationStr.replace(/[^0-9.]/g, '')) || 0;
    const sqft = parseFloat(sqftStr.replace(/[^0-9.]/g, '')) || 0;
    
    const { score, tier, matchedKeywords, businessType } = scorePermit(
      description,
      permitType,
      valuation,
      sqft
    );
    
    if (!tier || score < 5) {
      skipped++;
      continue;
    }
    
    const existing = db.prepare('SELECT id FROM leads WHERE permit_number = ?').get(permitNumber);
    if (existing) {
      console.log(`  ⏭️  Skip (duplicate): ${permitNumber} - ${businessType}`);
      skipped++;
      continue;
    }
    
    console.log(`  ✅ Add ${tier}: ${businessType} - ${address}`);
    console.log(`     Score: ${score} | Valuation: $${valuation.toLocaleString()}`);
    
    // Determine city from source
    const city = source.toLowerCase().includes('tacoma') ? 'Tacoma' : 'Pierce County';
    
    addLead({
      permit_number: permitNumber,
      source,
      date_found: new Date().toISOString().split('T')[0], // Today's date YYYY-MM-DD
      business_name: `${businessType} (Pending)`,
      business_type: businessType,
      address,
      city,
      state: 'WA',
      tier,
      score,
      lead_status: 'NEW',
      valuation,
      square_feet: sqft,
      issue_date: issueDate,
      status: status,
      matched_keywords: matchedKeywords.join(', '),
      description: description
    });
    
    added++;
  }
  
  console.log(`\n📊 Import complete: ${added} added, ${skipped} skipped, ${rows.length} total`);
}

// Main
const args = process.argv.slice(2);

if (args.length === 0) {
  console.log(`
📋 CSV Import Tool

Usage:
  npx tsx scripts/import-csv.ts <file.csv>

Examples:
  npx tsx scripts/import-csv.ts data/tacoma-permits.csv
  npx tsx scripts/import-csv.ts data/pierce-permits.csv

Expected CSV Format:
  - Headers in first row
  - Common column names: permit number, address, description, valuation, sqft, issue date, status
  - Auto-detects column names (case-insensitive, flexible matching)

Getting the CSV:
  1. Visit data.tacoma.gov or open.piercecountywa.gov
  2. Search for "building permits"
  3. Open the dataset
  4. Filter for commercial permits, last 90 days
  5. Export as CSV
  6. Save to this project's data/ folder
  `);
  process.exit(0);
}

const csvFile = args[0];
const sourceName = csvFile.toLowerCase().includes('tacoma') 
  ? 'Tacoma Building Permit (CSV Import)' 
  : 'Pierce County Building Permit (CSV Import)';

importCSV(csvFile, sourceName);
