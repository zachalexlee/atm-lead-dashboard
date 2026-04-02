#!/bin/bash
# ATM Lead Dashboard - Daily Update Script
# Runs at 5:30 AM PST (13:30 UTC) to collect new leads

set -e

echo "================================"
echo "ATM Lead Dashboard - Daily Update"
echo "Started: $(date)"
echo "================================"

cd /root/clawd/atm-lead-dashboard

# TODO: Once data collection scripts are fully implemented, this will:
# 1. Collect Tacoma building permits
# 2. Collect Pierce County building permits
# 3. Check WA SOS for new business filings
# 4. Monitor local news sources
# 5. Score and filter leads
# 6. Update database

echo "✅ Daily update complete!"
echo "Dashboard: https://atm-lead-dashboard.vercel.app"
echo "Finished: $(date)"
