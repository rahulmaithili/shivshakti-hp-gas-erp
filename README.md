# SHIV SHAKTI HP GAS AGENCY (Pandaul Branch)
## Complete Enterprise ERP + POS + CRM + HR + Inventory + Daily Rojnamcha Platform

A production-ready, mission-critical Web ERP, POS Invoicing, and Business Automation platform engineered specifically for **Shiv Shakti HP Gas (Pandaul, Madhubani, Bihar)**.

---

## 🌟 Key Highlights & Modules

1. **Company & Agency Management:**
   - Distributor Code: `HP-124908`, HPCL Code: `HPCL-BIH-PAN-01`.
   - Base64 Logo Storage & Instant Rendering across Topbar, Invoices, and Thermal receipts.
2. **Authentication & RBAC:**
   - Salted SHA-256 Passwords, 12-Hour Encrypted Sessions.
   - Account Lockout Guard (5 failed attempts = 10 min lock).
   - Roles: `ADMIN`, `MANAGER`, `CASHIER`, `AUDITOR`.
3. **Executive Dashboard & Live Reconciliation:**
   - AdminLTE SmallBox KPI metrics (Gross Billing, Inflows, Digital Collections, Dues, Cylinder Sales).
   - Live reconciliation banner showing exact balance between daily transactions and drawer till.
   - Chart.js visual distribution graphs.
4. **POS Billing & Invoicing Counter:**
   - Multi-line product cart with live totals.
   - 5 Payment Settlement Modes: Cash, UPI, HP Pay, Customer Dues, and Others.
   - Zero-Tolerance Paise Settlement Validation (`toPaise()` precision).
   - Atomic bill cancellation with automatic stock and credit ledger reversal.
5. **7-Item SV New Connection Package Bundle:**
   - 1-Click issue with auto-calculation:
     - Administration Charge: ₹118.00
     - Cylinder Security (14.2 Kg): ₹2,200.00
     - Regulator (A-065767): ₹250.00
     - Hot Plate (Gas Stove): ₹2,350.00
     - Domestic Pass Book (D.G.C.): ₹59.00
     - Suraksha Hose Pipe: ₹190.00
     - Gas Refill (14.2 Kg): ₹903.00
     - **Total: ₹6,070.00**
   - Atomic multi-row persistence and automatic CRM profile creation.
6. **Customer CRM & Customer 360:**
   - Comprehensive customer records with Village, Consumer No, and Connection details.
   - Customer 360: Lifetime Value (LTV), refill counts, refill gap frequency, past invoices.
7. **Customer Dues & Credit Ledger:**
   - Ageing analysis buckets (0-7 Days, 8-30 Days, 31-60 Days, 60+ Days).
   - Partial & full payment recovery logging in `Due Payments`.
   - Admin-only write-off with audit logging.
8. **Hawkers & Godown Dispatch:**
   - Daily cylinder issue tracking (Loaded, Return Empty, Net Sold).
   - Cash, UPI, and Dues settlement per delivery personnel.
9. **Cash Register & Day Closing:**
   - Complete denomination breakdown (₹500, ₹200, ₹100, ₹50, ₹20, ₹10, and coins).
   - Physical till calculation vs System Closing with variance detection.
   - Day Closing lock preventing modification unless unlocked by Admin.
10. **Cylinder Stock & Inventory:**
    - Stock tracking for 5 cylinder categories (14.2KG Domestic, 19KG Commercial, 5KG Commercial, 5KG Domestic, 2KG Commercial).
    - Opening Full, Plant Receipts, Sales, Defectives, Sent to Plant, Closing Full, Closing Empty.
11. **HR, Attendance & Payroll:**
    - Staff personnel master with role, base salary, and per-delivery incentive rates.
    - Daily attendance register (Present, Absent, Half Day, Leave).
    - Monthly payroll generation and locking.
12. **Vendors & Purchases:**
    - Supplier directory and purchase invoice logging.
13. **Official HP Gas Daily Rojnamcha:**
    - Preserved 9-row layout matching official agency records.
    - Multi-format printing: A4 Invoice, 80mm Thermal POS Receipt, Payslips.
14. **Google Drive Cloud Archive & Backups:**
    - Automated PDF/HTML archives saved to Google Drive "Shiv Shakti HP Gas Archives".
    - 1-Click full spreadsheet snapshot backup to "Shiv Shakti HP Gas Backups".
15. **Theme Customizer:**
    - 6 Executive Palettes: Enterprise Navy, Royal Sapphire, Emerald Green, Graphite Slate, Ruby Crimson, Sunset Amber.
    - Day & Dark mode switch with instant flash-free loading.

---

## 🛠 Tech Stack

- **Frontend:** Semantic HTML5, CSS3, Vanilla JavaScript ES6 Modules.
- **Allowed CDNs:**
  - Font Awesome 6.5.1
  - SweetAlert2 v11
  - Chart.js v4.4.0
  - Google Fonts (Plus Jakarta Sans, JetBrains Mono)
- **Backend:** Google Apps Script Web App (`doPost(e)` action router with `LockService`).
- **Proxy Layer:** Netlify Serverless Function (`netlify/functions/api.js`).
- **Database:** Google Sheets (Relational 18-sheet schema) + Google Drive Cloud Storage.

---

## 🚀 Setup & Deployment Guide

### 1. Google Sheets & Apps Script Backend
1. Open your Google Sheet in Google Drive.
2. Go to **Extensions** > **Apps Script**.
3. Copy the contents of `Code.gs` (or copy each modular file from `apps-script/`) into the Apps Script editor.
4. Replace `appsscript.json` with the manifest in this repository (includes Drive, Spreadsheet, and Script scopes).
5. Run the `setupDatabase` function once:
   - This idempotently creates all 18 sheets with correct headers.
   - Seeds default company profile (`comp_1`).
   - Seeds default admin account (`admin` / `admin123`).
   - Seeds default items & rates master.
6. Click **Deploy** > **New Deployment** > **Web app**:
   - Execute as: **Me**
   - Who has access: **Anyone**
7. Copy the Web App Executable URL.

### 2. Netlify Proxy & Frontend Deployment
1. Link this repository to your Netlify account.
2. In Netlify Site Settings > **Environment variables**:
   - Key: `APPS_SCRIPT_URL`
   - Value: Paste the Web App Executable URL from Step 1.
3. Deploy the site. Frontend requests to `/api` are automatically proxied through `netlify/functions/api.js` with CORS handling, 302 redirect resolution, and retry mechanisms.

---

## 🧪 Testing & Verification

See [TESTING.md](TESTING.md) for the complete 50-step quality assurance verification checklist covering all modules and failure handling.
