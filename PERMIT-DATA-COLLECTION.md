# Building Permit Data Collection Guide

## ✅ What's Built

**Scripts ready to use:**
- `scripts/tacoma-permits.ts` - API collector (needs endpoint)
- `scripts/pierce-permits.ts` - API collector (needs endpoint)
- `scripts/scrape-tacoma.ts` - Puppeteer web scraper (needs Chrome)
- `scripts/scrape-pierce.ts` - Puppeteer web scraper (needs Chrome)
- **`scripts/import-csv.ts`** - CSV import tool ✨ **RECOMMENDED**
- `scripts/collect-leads.ts` - Main orchestrator (ready to run)

**Lead scoring system:**
- Tier 1: Convenience stores, gas stations, dispensaries, bars, grocery stores
- Tier 2: Restaurants, pharmacies, liquor stores
- Priority scoring: business type + valuation + square footage
- Auto-adds qualified leads to database
- Duplicate detection

---

## 🎯 RECOMMENDED: Manual CSV Import

This is the **fastest, most reliable method** right now.

### Step 1: Download Permit Data

#### Tacoma:
1. Visit https://data.tacoma.gov/
2. Search for "building permits"
3. Open the dataset
4. Filter:
   - Date: Last 90 days
   - Type: Commercial, Tenant Improvement
   - Valuation: > $50,000 (if filter available)
5. Click "Export" → CSV
6. Save to `/root/clawd/atm-lead-dashboard/data/tacoma-permits.csv`

#### Pierce County:
1. Visit https://open.piercecountywa.gov/
2. Complete CAPTCHA if prompted
3. Search for "building permits"
4. Open the dataset
5. Same filters as Tacoma
6. Export as CSV
7. Save to `/root/clawd/atm-lead-dashboard/data/pierce-permits.csv`

### Step 2: Import to Database

```bash
cd /root/clawd/atm-lead-dashboard

# Import Tacoma permits
npx tsx scripts/import-csv.ts data/tacoma-permits.csv

# Import Pierce County permits
npx tsx scripts/import-csv.ts data/pierce-permits.csv
```

### Step 3: View on Dashboard

Visit https://atm-lead-dashboard.vercel.app

Leads will appear automatically, sorted by priority.

---

## 🤖 ALTERNATIVE: Automated API Collection

If you can find the correct API endpoints, automated collection will work.

### Finding API Endpoints

**For Tacoma:**
1. Visit https://data.tacoma.gov/
2. Search for "building permits"
3. Open the dataset page
4. Press F12 (open DevTools)
5. Go to Network tab
6. Refresh the page
7. Look for requests containing "FeatureServer" or "/query"
8. Copy the full URL
9. Update `scripts/tacoma-permits.ts` with the endpoint

**For Pierce County:**
Same process at https://open.piercecountywa.gov/

### Run Automated Collection

Once endpoints are configured:

```bash
cd /root/clawd/atm-lead-dashboard
npx tsx scripts/collect-leads.ts
```

This will:
- Try API first
- Fall back to Puppeteer scraper if API fails
- Score and filter permits
- Add qualified leads to database
- Log detailed results

---

## 🕷️ ALTERNATIVE: Puppeteer Web Scraping

Requires Chrome/Chromium installation (heavy on servers).

### Install Chrome

```bash
# Option 1: Standalone Chrome (recommended for servers)
cd /tmp
wget https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb
dpkg -i google-chrome-stable_current_amd64.deb
apt-get install -f -y

# Option 2: Chromium via snap (slower)
snap install chromium
```

### Update Puppeteer Config

Edit `scripts/scrape-tacoma.ts` and `scripts/scrape-pierce.ts`:

```typescript
const browser = await puppeteer.launch({
  headless: true,
  executablePath: '/usr/bin/google-chrome-stable', // or '/snap/bin/chromium'
  args: ['--no-sandbox', '--disable-setuid-sandbox']
});
```

### Run Scraper

```bash
cd /root/clawd/atm-lead-dashboard

# Test Tacoma scraper
npx tsx scripts/scrape-tacoma.ts

# Test Pierce scraper
npx tsx scripts/scrape-pierce.ts

# Run full collection (tries API, then scraper)
npx tsx scripts/collect-leads.ts
```

---

## 📅 Daily Automation

Once data collection works, automate it:

### Current Cron Job

```bash
crontab -l
# Shows: 30 13 * * * /root/clawd/atm-lead-dashboard/scripts/daily-update.sh
```

Runs at 5:30 AM PST (13:30 UTC) daily.

### Update daily-update.sh

Edit `/root/clawd/atm-lead-dashboard/scripts/daily-update.sh`:

```bash
#!/bin/bash
cd /root/clawd/atm-lead-dashboard

echo "=== ATM Lead Collection - $(date) ===" >> logs/daily-update.log

# If using CSV import (manual download to /data folder)
if [ -f data/tacoma-permits.csv ]; then
  npx tsx scripts/import-csv.ts data/tacoma-permits.csv >> logs/daily-update.log 2>&1
  rm data/tacoma-permits.csv
fi

if [ -f data/pierce-permits.csv ]; then
  npx tsx scripts/import-csv.ts data/pierce-permits.csv >> logs/daily-update.log 2>&1
  rm data/pierce-permits.csv
fi

# OR if using automated collection
npx tsx scripts/collect-leads.ts >> logs/daily-update.log 2>&1

echo "=== Completed - $(date) ===" >> logs/daily-update.log
```

---

## 🎯 Recommended Workflow

**Phase 1: Manual CSV Import (this week)**
- Download CSVs weekly from Tacoma/Pierce County portals
- Import via `import-csv.ts`
- Get familiar with lead quality and scoring

**Phase 2: Find API Endpoints (next week)**
- Investigate data portal APIs
- Update API collector scripts
- Test automated collection

**Phase 3: Full Automation (future)**
- Set up daily cron job
- Monitor logs
- Refine scoring/filtering as needed

---

## 📊 Current Status

- **Database:** ✅ Ready
- **Dashboard:** ✅ Live (https://atm-lead-dashboard.vercel.app)
- **CSV Import:** ✅ Ready to use
- **API Collection:** ⚠️ Needs endpoint discovery
- **Web Scraping:** ⚠️ Needs Chrome installation
- **Daily Automation:** ✅ Cron job scheduled

---

## 🔧 Troubleshooting

**"No permits found"**
- API endpoints need to be discovered manually
- Use CSV import method instead

**"Chromium not found"**
- Install Chrome/Chromium (see Puppeteer section)
- Or use CSV import method

**"No leads added to database"**
- Check if permits match Tier 1/Tier 2 keywords
- Lower score threshold in `collect-leads.ts` if needed
- Verify CSV has expected columns (permit number, description, address, etc.)

**"Duplicate permit number"**
- Leads already in database, skipping is correct behavior
- Delete from database if you want to re-import

---

## 📝 Next Steps

1. **Try CSV import first** (easiest, most reliable)
2. Download sample permit data from Tacoma
3. Import and verify leads show up on dashboard
4. If satisfied, proceed with weekly manual imports
5. Later: investigate API endpoints for automation

---

**Questions?** Ping Zach in Telegram.
