import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), 'data', 'leads.db');
const db = new Database(dbPath);

// Initialize database schema
export function initDB() {
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
}

// Get all leads with optional filters
export interface LeadFilters {
  tier?: string;
  businessType?: string;
  jurisdiction?: string;
  leadStatus?: string;
  days?: number;
  search?: string;
}

export function getLeads(filters: LeadFilters = {}) {
  initDB();
  
  let query = 'SELECT * FROM leads WHERE 1=1';
  const params: any[] = [];

  if (filters.tier) {
    query += ' AND tier = ?';
    params.push(filters.tier);
  }

  if (filters.businessType) {
    query += ' AND business_type = ?';
    params.push(filters.businessType);
  }

  if (filters.jurisdiction) {
    query += ' AND jurisdiction = ?';
    params.push(filters.jurisdiction);
  }

  if (filters.leadStatus) {
    query += ' AND lead_status = ?';
    params.push(filters.leadStatus);
  }

  if (filters.days) {
    query += ` AND date_found >= date('now', '-${filters.days} days')`;
  }

  if (filters.search) {
    query += ' AND (business_name LIKE ? OR address LIKE ? OR description LIKE ?)';
    const searchTerm = `%${filters.search}%`;
    params.push(searchTerm, searchTerm, searchTerm);
  }

  query += ' ORDER BY score DESC, date_found DESC';

  const stmt = db.prepare(query);
  return stmt.all(...params);
}

// Add a new lead
export function addLead(lead: any) {
  initDB();
  
  const stmt = db.prepare(`
    INSERT INTO leads (
      permit_number, source, date_found, jurisdiction, business_name, entity_name,
      address, city, state, zip, business_type, tier, description,
      valuation, square_feet, issue_date, expected_opening, status,
      owner_name, contractor_name, score, matched_keywords
    ) VALUES (
      ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?,
      ?, ?, ?, ?
    )
  `);

  return stmt.run(
    lead.permit_number || null,
    lead.source,
    lead.date_found,
    lead.jurisdiction || null,
    lead.business_name || null,
    lead.entity_name || null,
    lead.address || null,
    lead.city || null,
    lead.state || 'WA',
    lead.zip || null,
    lead.business_type || null,
    lead.tier || null,
    lead.description || null,
    lead.valuation || null,
    lead.square_feet || null,
    lead.issue_date || null,
    lead.expected_opening || null,
    lead.status || null,
    lead.owner_name || null,
    lead.contractor_name || null,
    lead.score || 0,
    lead.matched_keywords || null
  );
}

// Update lead
export function updateLead(id: number, updates: any) {
  initDB();
  
  const fields = Object.keys(updates)
    .map(key => `${key} = ?`)
    .join(', ');
  
  const values = Object.values(updates);
  values.push(id);

  const stmt = db.prepare(`
    UPDATE leads 
    SET ${fields}, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `);

  return stmt.run(...values);
}

// Get stats
export function getStats() {
  initDB();
  
  const total = db.prepare('SELECT COUNT(*) as count FROM leads').get() as any;
  const tier1 = db.prepare("SELECT COUNT(*) as count FROM leads WHERE tier = 'TIER_1'").get() as any;
  const last7Days = db.prepare("SELECT COUNT(*) as count FROM leads WHERE date_found >= date('now', '-7 days')").get() as any;
  const avgScore = db.prepare('SELECT AVG(score) as avg FROM leads').get() as any;
  
  return {
    total: total.count,
    tier1: tier1.count,
    last7Days: last7Days.count,
    avgScore: Math.round(avgScore.avg || 0)
  };
}

export { db };
export default db;
