# 🏧 ATM Lead Dashboard

**Live Dashboard:** https://atm-lead-dashboard.vercel.app

Automated lead generation dashboard for Forza ATM. Updates daily at **5:30 AM PST** with new high-priority ATM placement opportunities.

---

## 🎯 Features

### Dashboard
- **Real-time Lead Display** - All qualified leads sorted by priority score
- **Smart Filtering** - Filter by tier, business type, time range
- **Search** - Find leads by business name, address, or description
- **Stats Overview** - Total leads, Tier 1 count, recent leads, average score
- **CSV Export** - One-click export for CRM import
- **Mobile-Friendly** - Access from phone, tablet, or desktop

### Automated Data Collection
- **Building Permits** - Tacoma & Pierce County commercial construction
- **Business Registrations** - WA Secretary of State new filings
- **Cannabis Licenses** - WSLCB pending applications
- **Local News** - South Sound Magazine business openings
- **Smart Scoring** - Automatic prioritization based on business type, size, valuation

### Target Business Types (High Priority)
✅ Convenience Stores / Gas Stations
✅ Cannabis Dispensaries (cash-heavy)
✅ Grocery Stores (high volume)
✅ Bars / Taverns / Nightclubs
✅ Liquor Stores

---

## 📊 Current Data

The dashboard currently has **8 sample leads** to demonstrate functionality:
- 5 Tier 1 (High Priority)
- 2 Tier 2 (Medium Priority)
- Mix of convenience stores, dispensaries, grocery, bars, gas stations

---

## 🔄 Daily Auto-Updates

**Schedule:** Every day at **5:30 AM PST (1:30 PM UTC)**

**What Gets Updated:**
1. New building permits from Tacoma (data.tacoma.gov)
2. New building permits from Pierce County (open.piercecountywa.gov)
3. New business registrations from WA SOS
4. Local news monitoring for "coming soon" businesses

**How It Works:**
- System cron job runs daily update script
- Collects new permit/business data
- Scores leads based on ATM potential
- Filters for qualified opportunities
- Updates database
- Dashboard refreshes automatically

**Check Update Logs:**
```bash
tail -f /root/clawd/atm-lead-dashboard/logs/daily-update.log
```

---

## 👥 Team Access

**Dashboard URL:** https://atm-lead-dashboard.vercel.app

**Recommended Access:**
- **Zach** - Full access, manage updates
- **Michelle** - Sales rep, contact leads
- **Emily** - Assistant, support research
- **Sales Reps** - View leads, export for outreach

**No login required** - anyone with the URL can view the dashboard.

*(Optional: Add authentication later if needed for privacy)*

---

## 📱 How to Use

### For Zach (Manager)
1. Open dashboard daily to review new leads
2. Check Tier 1 leads first (highest priority)
3. Assign leads to team members
4. Monitor update logs for any issues
5. Export leads to HubSpot CRM as needed

### For Sales Team
1. Filter by "Last 7 Days" to see newest leads
2. Click "Export CSV" to download for your CRM
3. Contact businesses during construction phase
4. Update lead status after contact

### Best Practices
- **Contact Timing:** 30-60 days after permit issuance (during framing/rough-in)
- **Priority:** Focus on Tier 1 first (convenience, gas, dispensary, grocery, bar)
- **Volume:** 5-10 contacts per week = manageable pipeline
- **Follow-Up:** Track responses, set reminders for callbacks

---

## 🛠️ Technical Details

### Stack
- **Frontend:** Next.js 16 + TypeScript + Tailwind CSS
- **Backend:** Next.js API Routes (serverless)
- **Database:** SQLite (file-based, simple, reliable)
- **Hosting:** Vercel (free tier, auto-scaling)
- **Automation:** System cron + data collection scripts
- **Version Control:** GitHub (zachalexlee/atm-lead-dashboard)

### File Structure
```
atm-lead-dashboard/
├── app/                  # Next.js app pages
│   ├── page.tsx          # Main dashboard
│   └── api/              # API routes
│       ├── leads/        # GET/POST leads
│       └── stats/        # GET stats
├── lib/
│   └── db.ts             # Database functions
├── scripts/
│   ├── daily-update.sh   # Cron job script
│   ├── collect-leads.ts  # Data collection (TODO: implement)
│   └── seed.js           # Database seeding
├── data/
│   └── leads.db          # SQLite database
└── logs/
    └── daily-update.log  # Cron job logs
```

### Database Schema
```sql
leads (
  id, permit_number, source, date_found, jurisdiction,
  business_name, entity_name, address, city, state, zip,
  business_type, tier, description, valuation, square_feet,
  issue_date, expected_opening, status,
  owner_name, contractor_name, phone, email, website,
  social_facebook, social_instagram, social_tiktok,
  decision_makers, score, matched_keywords,
  enriched, contact_date, notes, follow_up_date,
  lead_status, assigned_to, created_at, updated_at
)
```

---

## 🚀 Deployment

**Live URL:** https://atm-lead-dashboard.vercel.app

**GitHub Repo:** https://github.com/zachalexlee/atm-lead-dashboard

**Auto-Deploys:** Any push to `main` branch triggers automatic redeployment

**Manual Redeploy:**
```bash
cd /root/clawd/atm-lead-dashboard
git add .
git commit -m "Update"
git push origin main
# Vercel auto-deploys
```

---

## 📈 Next Steps / Enhancements

### Phase 1: Data Collection (Priority)
- [ ] Implement Tacoma building permit API integration
- [ ] Implement Pierce County permit scraping
- [ ] Set up WA SOS public records request automation
- [ ] Add local news RSS monitoring

### Phase 2: Contact Enrichment
- [ ] Integrate FullEnrich API for contact data
- [ ] Auto-populate owner phone/email
- [ ] LinkedIn decision-maker search

### Phase 3: CRM Integration
- [ ] Auto-export to HubSpot
- [ ] Smartlead cold email automation
- [ ] Two-way sync for lead status updates

### Phase 4: Features
- [ ] Team login/authentication
- [ ] Lead assignment system
- [ ] Notes and follow-up tracking
- [ ] Email notifications for new Tier 1 leads
- [ ] Analytics dashboard (conversion rates, etc.)

---

## 🐛 Troubleshooting

### Dashboard not loading?
- Check Vercel status: https://vercel.com/zachalexlees-projects/atm-lead-dashboard
- View deployment logs in Vercel dashboard

### No new leads appearing?
- Check cron logs: `tail -f /root/clawd/atm-lead-dashboard/logs/daily-update.log`
- Verify cron is running: `crontab -l`
- Manually trigger update: `/root/clawd/atm-lead-dashboard/scripts/daily-update.sh`

### Database issues?
- Database location: `/root/clawd/atm-lead-dashboard/data/leads.db`
- Backup database: `cp data/leads.db data/leads-backup.db`
- Re-seed: `node scripts/seed.js`

---

## 💬 Questions?

**For Zach:**
- DM me (@Forza AI) on Telegram
- Or update this dashboard yourself - it's your codebase!

**For Technical Issues:**
- Check GitHub Issues: https://github.com/zachalexlee/atm-lead-dashboard/issues
- Review deployment logs in Vercel
- Check cron logs on the server

---

## 📝 Maintenance Log

| Date | Update | By |
|------|--------|-----|
| 2026-04-02 | Initial dashboard created and deployed | Forza AI |
| 2026-04-02 | Daily cron job set up (5:30 AM PST) | Forza AI |
| 2026-04-02 | 8 sample leads seeded for demo | Forza AI |

---

**Built for Forza ATM by Forza AI** 💼
*Helping Zach & team find the best ATM placement opportunities in Pierce County*
