# SHIV SHAKTI HP GAS AGENCY (Pandaul Branch)
## Daily Rojnamcha & Automation System

A production-ready, error-free web application and reporting engine tailored specifically for **Shiv Shakti HP Gas Agency (Pandaul branch)** to automate daily sales, cash book, vendor reconciliation, dues, stock, and PDF/Excel daily archives.

---

## Architecture Overview

- **Database:** Google Sheets
  - **Data Tabs:** `USERS`, `RATES`, `ENTRY`, `VENDOR_LOG`, `CASHBOOK`, `DUES`, `STOCK`, `AUDIT_LOG`, `SESSIONS`, `ARCHIVES`
  - **Report Sheets (Preserved Layout):** `REPORT_SALES` (`Daily Sales`), `REPORT_CASH` (`Cash Report`), `REPORT_VENDOR` (`COLLECTION SUMMARY`), `REPORT_STOCK` (`Cylinser Stock`)
- **Backend:** Google Apps Script Web App (JSON API with `LockService`, salted SHA-256 session tokens, and automated Drive PDF/Excel exporter).
- **Serverless Proxy:** Netlify Function (`netlify/functions/api.js`) to securely hide the Google Apps Script Web App URL and resolve CORS preflights without browser friction.
- **Frontend:** Plain HTML5 + CSS + Vanilla JS (No build step, mobile-first 360px+, 44px+ touch targets, bilingual English + Hindi hints).

---

## Step-by-Step Setup Guide

### Step 1: Set up the Google Spreadsheet
1. Open your master Google Sheet (e.g. `Daily Sales Report 29.09.26.xlsx` uploaded to Google Drive as a Google Sheet).
2. Ensure your 4 report tabs are present with their standard names:
   - `Daily Sales` (or `REPORT_SALES`)
   - `Cash Report` (or `REPORT_CASH`)
   - `COLLECTION SUMMARY` (or `REPORT_VENDOR`)
   - `Cylinser Stock` (or `REPORT_STOCK`)

### Step 2: Configure Apps Script Backend
1. In your Google Sheet, click **Extensions** > **Apps Script**.
2. Replace the contents of `Code.gs` with the code from `Code.gs` in this repository.
3. In Project Settings (gear icon on the left menu), check **"Show 'appsscript.json' manifest file in editor"**.
4. Switch to `appsscript.json` and paste the contents from `appsscript.json` (includes OAuth scopes for spreadsheets, drive, and scripts).
5. Click **Save** (floppy disk icon).

### Step 3: Run Database Initialization & Verification
1. In the Apps Script toolbar, select the function **`setup`** from the function dropdown and click **Run**.
   - Review and accept authorization permissions when prompted.
   - `setup()` automatically creates the 10 data tabs without modifying your report layout, seeds default rates, and initializes the master admin.
2. Select the function **`runTests`** and click **Run**.
   - Inspect the Execution Log: It creates temporary test transactions, verifies that sums and audit reconciliations balance, and cleanly removes the test records.
3. *(Optional)* Select **`createDailyArchiveTrigger`** and click **Run** to schedule an automated daily archive at 11:30 PM (Asia/Kolkata).

### Step 4: Deploy the Apps Script Web App
1. Click the blue **Deploy** button > **New deployment**.
2. Select type: **Web app** (click the gear icon).
3. Set configuration:
   - **Description:** `Shiv Shakti Rojnamcha Production v1`
   - **Execute as:** `Me (your Google account)`
   - **Who has access:** `Anyone`
4. Click **Deploy**.
5. Copy the generated **Web App URL** (e.g., `https://script.google.com/macros/s/.../exec`).

### Step 5: Deploy Frontend on Netlify
#### Option A: Automatic Deployment via Git (Recommended)
1. Push this folder to your GitHub / GitLab repository.
2. Link the repository to Netlify.
3. In Netlify Site Settings > **Environment variables**, add:
   - **Key:** `APPS_SCRIPT_URL`
   - **Value:** Paste the Web App URL from Step 4.
4. Deploy the site.

#### Option B: Direct / Local / Static Drop
1. If hosting purely statically without serverless proxy, open the web app in the browser.
2. Click the gear icon (**⚙️ API Settings**) or click **Configure Apps Script Web App URL** on the login screen.
3. Paste the Apps Script Web App URL directly. The app will persist it in `localStorage`.

---

## First Login & Master Data

### Default Superadmin Credentials
- **Username:** `admin`
- **Default Password:** `Admin@123`
*(Please reset your password in the Admin screen immediately after first login)*

### Seed Rates Catalog
The database comes pre-seeded with the agency's live catalog:
- `14.2KG Domestic`: ₹1,042.00
- `19KG Commercial`: ₹3,049.00
- `Suraksha Hose Pipe`: ₹190.00
- `Domestic Regulator (Leak/Defective)`: ₹100.00
- `Domestic Pass Book`: ₹59.00
- `PMUY Pass Book`: ₹50.00
- `5 Kg Nd Rfl`: ₹845.00
- `Ftl Rgulator`: ₹350.00
- `19KG Commercial (SD)`: ₹2,400.00
- `5 Kg ftl Security Refund`: ₹800.00
- `Name change (Death)`: ₹118.00
- `Truck Opening Charges`: ₹200.00
- `Administration Charge`: ₹118.00
- `Safety inspection`: ₹236.00

### Seed Delivery Vendors
- *Monu, Saroj, Bhogendra, Ravi Prakash, Gena Lal, Bechan, Dinesh, Mantun, Bajrangi, Sujit, Sanjay, Raja Faiyazi, Faiyaz, plus GODOWN*.

---

## Daily Workflow for Staff

1. **Morning / Throughout the day:**
   - **Billing Entries:** Counter cashier adds sales, accessories, returns, and services in the **Entry** tab. Supports split payments (e.g. Cash + UPI).
   - **Delivery Vendors:** Enter cylinders issued to each vendor and their collections (Cash, UPI, HP Pay, Dues) in the **Vendors** tab.
2. **Evening Closing:**
   - **Dues Ledger:** Review uncollected dues and record payments from schools or hotels.
   - **Cash Book:** Enter bank deposits, cash transfers to Madhubani/Thakur Ji, and petty expenses.
   - **Denominations Counter:** Count physical notes in the till (500, 200, 100, 50, 20, 10, 5, 2, 1). The app immediately displays the variance against book closing cash.
   - **Stock:** Verify filled and empty cylinders in the godown.
3. **Report & Archive:**
   - Go to the **Report** tab to inspect the 4-page layout.
   - Click **Generate PDF & Excel**: Flushes all formulas, exports A4 portrait PDFs, and archives them to the Google Drive folder `Shiv Shakti HP Gas - Daily Archives`.

---

## Troubleshooting & Verification

| Issue | Cause | Solution |
|:---|:---|:---|
| `NetworkError / CORS blocked` | Direct browser call blocked by Google redirect | Use the Netlify proxy (`/api`) with `APPS_SCRIPT_URL` set, or verify redirect follow headers. |
| `Script authorization required` | First run in Apps Script editor | In Apps Script editor, run `setup()`, click **Review Permissions** > **Advanced** > **Go to Rojnamcha (unsafe)**. |
| `Account temporarily locked` | 5 wrong passwords entered | Wait 5 minutes for automatic lockout expiration, or have an admin reset password. |
| `Report formulas show #REF!` | Sheet name mismatch | Run `setupFormulas()` from Apps Script; it automatically detects both standard and legacy sheet names. |
| `Drive archive export error` | Drive permission missing | Ensure `https://www.googleapis.com/auth/drive` is declared in `appsscript.json`. |
