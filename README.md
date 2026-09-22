# ParkSphere India — Smart Parking Management System

## What this is
A working full-stack demo of the ParkSphere India spec: Node/Express backend + JWT auth + a vanilla JS frontend with a custom "highway signage" visual theme, covering registration/login, live parking maps, slot booking, simulated online payment, QR-code entry/exit, Find My Car, notifications, analytics, and admin/staff management — across 4 roles (Super Admin, Property Manager, Security Guard, Customer).

## A few honest substitutions (read this first)
The original spec calls for MySQL, Razorpay, and React. In this sandboxed environment there's no MySQL server or live payment gateway to connect to, and no build pipeline for React, so:
- **Database:** a JSON-file store (`backend/data/db.json`) with the same get/insert/update access pattern a real SQL layer would use. Swapping in MySQL later means rewriting `backend/db.js` only — no route code changes.
- **Payments:** a simulated Razorpay flow (`backend/routes/payments.js`) — create-order → verify — that mimics the real checkout shape so swapping in the real SDK is a drop-in change once you have API keys.
- **Frontend:** vanilla HTML/CSS/JS instead of React, for zero build-step setup. Same component boundaries (map, booking, dashboard, etc.) so porting to React later is straightforward.

Everything else — JWT auth, roles/permissions, QR generation, live occupancy, analytics — is fully functional, real code, not mocked.

## Quick start
```bash
cd backend
npm install
npm run seed      # (optional — auto-runs on first server start anyway)
npm start
```
Then open **http://localhost:4000** in your browser.

## Demo logins
| Role | Email | Password |
|---|---|---|
| Super Admin | superadmin@parksphere.in | admin123 |
| Property Manager | manager@parksphere.in | manager123 |
| Security Guard | guard@parksphere.in | guard123 |
| Customer | user@parksphere.in | user123 |

You can also register a brand-new customer account from the login screen.

## Suggested demo flow (2 minutes)
1. Log in as **Customer** → Book Parking → pick a property/floor/available slot → confirm → payment auto-completes → QR modal appears.
2. Log in as **Security Guard** (open a new incognito tab, or log out) → Scan/Verify → paste the booking reference shown in the QR modal → vehicle checks in.
3. Log in as **Customer** again → Find My Car → search the vehicle number → see live slot location.
4. Log in as **Super Admin** → Org Setup (add a property), Staff & Users, Reports & Analytics, Activity Logs.

## Project structure
```
backend/
  server.js          Express app entry, static file serving
  db.js               JSON-file data layer (swap for MySQL later)
  seed.js             Demo data generator
  middleware/auth.js  JWT verification + role guard
  routes/             auth, properties, slots, bookings, payments, analytics, notifications, users
frontend/
  index.html          Login / Register
  dashboard.html       Role-based app shell (all modules)
  css/style.css        Visual theme
  js/api.js            Fetch wrapper + formatting helpers
  js/auth.js            Login/register logic
  js/dashboard.js       All module logic (map, booking, analytics, etc.)
```

## Known limitations to mention if asked in review/demo
- Single JSON file as "DB" — fine for a hackathon demo, not for concurrent production writes.
- Payment is simulated, not connected to real Razorpay.
- No automated test suite included.
- No file upload / image handling (e.g. no vehicle photos).
