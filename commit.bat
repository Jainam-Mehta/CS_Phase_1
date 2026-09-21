@echo off
cd /d "c:\Users\Jainam Mehta\OneDrive\Desktop\CS_Project"

echo Staging all changes...
git add -A

echo.
echo Committing changes...
git commit -m "feat: Multi-room architecture refactor - complete

- Refactor single-room per site to multi-room (1-20 rooms per site)
- Database schema: facility_id -> site_id migration (all 13 tables)
- Owner dashboard: room selector, per-room data filtering
- Owner setup: multi-room configuration with per-room sensors
- Farmer inventory: conditional room selector (hidden if 1 room)
- Stakeholder: unchanged, site-level only
- 7 Owner tabs: room filtering (Inventory, Alerts, Energy, Report, Maintenance, Finance, Monitoring)
- RLS policies updated to use site_id
- Geographic data: 36 states, 763 districts, 162,277 localities
- All profile creation fixed and verified
- E2E testing suite created and passed"

echo.
echo Pushing to GitHub...
git push -u origin main

echo.
echo Complete!
