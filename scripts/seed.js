const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Ensure data directory exists
const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'leads.db');
const db = new Database(dbPath);

// Initialize schema
db.exec(`
  CREATE TABLE IF NOT EXISTS leads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    permit_number TEXT,
    source TEXT NOT NULL,
    date_found TEXT NOT NULL,
    jurisdiction TEXT,
    business_name TEXT,
    entity_name TEXT,
    address TEXT,
    city TEXT,
    state TEXT DEFAULT 'WA',
    zip TEXT,
    business_type TEXT,
    tier TEXT,
    description TEXT,
    valuation INTEGER,
    square_feet INTEGER,
    issue_date TEXT,
    expected_opening TEXT,
    status TEXT,
    owner_name TEXT,
    contractor_name TEXT,
    phone TEXT,
    email TEXT,
    website TEXT,
    social_facebook TEXT,
    social_instagram TEXT,
    social_tiktok TEXT,
    decision_makers TEXT,
    score INTEGER DEFAULT 0,
    matched_keywords TEXT,
    enriched BOOLEAN DEFAULT 0,
    contact_date TEXT,
    notes TEXT,
    follow_up_date TEXT,
    lead_status TEXT DEFAULT 'new',
    assigned_to TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_leads_tier ON leads(tier);
  CREATE INDEX IF NOT EXISTS idx_leads_score ON leads(score);
  CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(lead_status);
  CREATE INDEX IF NOT EXISTS idx_leads_date ON leads(date_found);
  CREATE INDEX IF NOT EXISTS idx_leads_type ON leads(business_type);
`);

const sampleLeads = [
  {
    permit_number: 'COM2026-00234',
    source: 'tacoma-permits',
    date_found: '2026-04-01',
    jurisdiction: 'Tacoma',
    business_name: 'Quick Stop Convenience',
    address: '7215 Pacific Ave',
    city: 'Tacoma',
    zip: '98408',
    business_type: 'Convenience Store',
    tier: 'TIER_1',
    description: 'New construction - convenience store with fuel dispensers',
    valuation: 580000,
    square_feet: 2800,
    issue_date: '2026-02-12',
    status: 'Under Construction',
    owner_name: 'Pacific Retail LLC',
    contractor_name: 'BuildCo Construction',
    score: 18,
    matched_keywords: 'convenience store, gas station',
    lead_status: 'new'
  },
  {
    permit_number: 'TI2026-00156',
    source: 'tacoma-permits',
    date_found: '2026-03-28',
    jurisdiction: 'Tacoma',
    business_name: 'Green Leaf Dispensary',
    address: '3402 S 38th St',
    city: 'Tacoma',
    zip: '98409',
    business_type: 'Cannabis Dispensary',
    tier: 'TIER_1',
    description: 'Tenant improvement for retail cannabis sales',
    valuation: 125000,
    square_feet: 1500,
    issue_date: '2026-01-28',
    status: 'Final Inspection',
    owner_name: 'Green Ventures Inc',
    contractor_name: 'Apex Builders',
    score: 15,
    matched_keywords: 'dispensary, cannabis',
    lead_status: 'new'
  },
  {
    permit_number: 'COM2026-00089',
    source: 'pierce-permits',
    date_found: '2026-03-15',
    jurisdiction: 'Pierce County',
    business_name: 'Lakewood Market',
    address: '12234 Pacific Highway SW',
    city: 'Lakewood',
    zip: '98499',
    business_type: 'Grocery Store',
    tier: 'TIER_1',
    description: 'New grocery market building',
    valuation: 1850000,
    square_feet: 12000,
    issue_date: '2025-12-15',
    status: 'Issued',
    owner_name: 'Lakewood Retail Properties',
    contractor_name: 'Premier Construction Group',
    score: 20,
    matched_keywords: 'grocery, market',
    lead_status: 'new'
  },
  {
    permit_number: 'COM2026-00198',
    source: 'tacoma-permits',
    date_found: '2026-03-22',
    jurisdiction: 'Tacoma',
    business_name: 'The Downtown Lounge',
    address: '1920 Pacific Ave',
    city: 'Tacoma',
    zip: '98402',
    business_type: 'Bar',
    tier: 'TIER_1',
    description: 'Convert retail space to restaurant with full bar',
    valuation: 320000,
    square_feet: 3200,
    issue_date: '2026-02-28',
    status: 'Under Review',
    owner_name: 'Downtown Hospitality LLC',
    contractor_name: 'Remodel Pro',
    score: 16,
    matched_keywords: 'bar, lounge',
    lead_status: 'new'
  },
  {
    permit_number: 'ALT2026-00267',
    source: 'pierce-permits',
    date_found: '2026-03-30',
    jurisdiction: 'Pierce County',
    business_name: '76 Gas Station - Puyallup',
    address: '5115 Center St',
    city: 'Puyallup',
    zip: '98372',
    business_type: 'Gas Station',
    tier: 'TIER_1',
    description: 'Remodel existing gas station convenience store',
    valuation: 95000,
    square_feet: 1800,
    issue_date: '2026-03-05',
    status: 'Issued',
    owner_name: '76 Franchising',
    contractor_name: 'Quick Build Services',
    score: 14,
    matched_keywords: 'gas station, convenience',
    lead_status: 'new'
  },
  {
    permit_number: 'COM2026-00301',
    source: 'tacoma-permits',
    date_found: '2026-04-01',
    jurisdiction: 'Tacoma',
    business_name: 'Walgreens Pharmacy',
    address: '6705 Sixth Avenue',
    city: 'Tacoma',
    zip: '98406',
    business_type: 'Pharmacy',
    tier: 'TIER_2',
    description: 'New pharmacy retail location',
    valuation: 750000,
    square_feet: 5000,
    issue_date: '2026-03-10',
    status: 'Issued',
    owner_name: 'Walgreens Co',
    contractor_name: 'National Retail Builders',
    score: 10,
    matched_keywords: 'pharmacy',
    lead_status: 'new'
  },
  {
    permit_number: 'TI2026-00189',
    source: 'pierce-permits',
    date_found: '2026-03-25',
    jurisdiction: 'Pierce County',
    business_name: 'The Smoke Shop',
    address: '8924 S Tacoma Way',
    city: 'Lakewood',
    zip: '98499',
    business_type: 'Smoke Shop',
    tier: 'TIER_2',
    description: 'Tenant improvement for smoke and vape retail',
    valuation: 65000,
    square_feet: 1200,
    issue_date: '2026-02-20',
    status: 'Final Inspection',
    owner_name: 'Smoke & Mirrors LLC',
    contractor_name: 'Fast Finish Construction',
    score: 8,
    matched_keywords: 'smoke shop, vape',
    lead_status: 'new'
  },
  {
    permit_number: 'COM2026-00412',
    source: 'tacoma-permits',
    date_found: '2026-03-18',
    jurisdiction: 'Tacoma',
    business_name: 'Stadium Thriftway Expansion',
    address: '2925 E 27th St',
    city: 'Tacoma',
    zip: '98404',
    business_type: 'Grocery Store',
    tier: 'TIER_1',
    description: 'Grocery store expansion and remodel',
    valuation: 450000,
    square_feet: 3500,
    issue_date: '2026-01-15',
    status: 'Under Construction',
    owner_name: 'Thriftway Markets Inc',
    contractor_name: 'Grocery Builders Co',
    score: 19,
    matched_keywords: 'grocery, market',
    lead_status: 'new'
  }
];

console.log('🌱 Seeding database with sample leads...');

const stmt = db.prepare(`
  INSERT INTO leads (
    permit_number, source, date_found, jurisdiction, business_name,
    address, city, state, zip, business_type, tier, description,
    valuation, square_feet, issue_date, status, owner_name, contractor_name,
    score, matched_keywords, lead_status
  ) VALUES (
    ?, ?, ?, ?, ?,
    ?, ?, ?, ?, ?, ?, ?,
    ?, ?, ?, ?, ?, ?,
    ?, ?, ?
  )
`);

let count = 0;
for (const lead of sampleLeads) {
  try {
    stmt.run(
      lead.permit_number,
      lead.source,
      lead.date_found,
      lead.jurisdiction,
      lead.business_name,
      lead.address,
      lead.city,
      lead.state || 'WA',
      lead.zip,
      lead.business_type,
      lead.tier,
      lead.description,
      lead.valuation,
      lead.square_feet,
      lead.issue_date,
      lead.status,
      lead.owner_name,
      lead.contractor_name,
      lead.score,
      lead.matched_keywords,
      lead.lead_status
    );
    count++;
    console.log(`  ✓ Added: ${lead.business_name}`);
  } catch (error) {
    console.error(`  ✗ Failed to add ${lead.business_name}:`, error.message);
  }
}

db.close();

console.log(`\n✅ Seeded ${count} sample leads`);
console.log(`📊 Database: ${dbPath}`);
