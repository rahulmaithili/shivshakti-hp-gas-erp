# SHIV SHAKTI HP GAS ERP — END-TO-END VERIFICATION & TESTING SUITE

Comprehensive QA Test Checklist covering all 50 operational modules for **Shiv Shakti HP Gas (Pandaul)**.

---

## 1. Authentication & Security
- [x] **TC-AUTH-01: First-Time Admin Login**
  - Input: `admin` / `admin123`
  - Expectation: Successful login, token saved to `localStorage`, redirect to Dashboard.
- [x] **TC-AUTH-02: Account Lockout Guard**
  - Attempt 5 consecutive invalid passwords.
  - Expectation: Account locked for 10 minutes with `LOCKED` error response.
- [x] **TC-AUTH-03: Password Change**
  - Change password from User Profile modal.
  - Expectation: New Salted SHA-256 hash written to `Users` sheet, `MustChangePassword` cleared.
- [x] **TC-AUTH-04: Session Expiry (401)**
  - Invalidate token in `localStorage`.
  - Expectation: Next API call triggers auto-logout and redirects to `screen-login`.

---

## 2. Company Profile & Logo Rendering
- [x] **TC-COMP-01: Fetch Company Metadata**
  - Action: `getCompany`
  - Expectation: Correct Distributor code (`HP-124908`), HPCL code, address, GSTIN, and Bank details returned.
- [x] **TC-COMP-02: Base64 Logo Upload**
  - Action: Upload `.png` or `.jpg` logo (< 1MB).
  - Expectation: Logo Base64 stored in `Companies` row, renders instantly in Topbar, POS Receipts, and Print headers without external HTTP requests.
- [x] **TC-COMP-03: Logo Removal**
  - Action: `deleteLogo`
  - Expectation: Fallback HP emblem shown across UI and prints.

---

## 3. POS Billing & Invoicing
- [x] **TC-POS-01: Single Refill Billing**
  - Bill: 1 x 14.2KG Domestic Gas Refill (₹903.00), Paid via UPI.
  - Expectation: Zero paise variance, recorded in `Daily Sales`, bill number generated (`BILL-YYYYMMDD-XXXX`).
- [x] **TC-POS-02: Multi-Line Cart Settlement**
  - Bill: 1 x Refill + 1 x Suraksha Hose Pipe (₹190.00) = ₹1,093.00.
  - Settle: Cash ₹593, UPI ₹500.
  - Expectation: Proportional allocation, zero-paise balance, bill printed.
- [x] **TC-POS-03: Zero-Tolerance Paise Guard**
  - Bill: ₹1,093.00, Settle: Cash ₹1,090.00 (₹3 deficit).
  - Expectation: Submit blocked with SweetAlert warning "Payment breakdown does not equal invoice total in paise."
- [x] **TC-POS-04: Bill Cancellation & Reversal**
  - Cancel previous bill with reason.
  - Expectation: `IsDeleted = true` in `Daily Sales`, dues reversed in `Customer Dues`, audit log recorded.

---

## 4. 7-Item SV New Connection Package Bundle
- [x] **TC-SV-01: Full Package Issue (₹6,070.00)**
  - All 7 default items checked:
    1. Administration Charge: ₹118.00
    2. Cylinder Security (14.2 Kg): ₹2,200.00
    3. Regulator (A-065767): ₹250.00
    4. Hot Plate (Gas Stove): ₹2,350.00
    5. Domestic Pass Book (D.G.C.): ₹59.00
    6. Suraksha Hose Pipe: ₹190.00
    7. Gas Refill (14.2 Kg): ₹903.00
  - Total: ₹6,070.00 exactly.
  - Expectation: Atomic write of 7 rows to `Daily Sales`, customer added to `Customers` sheet, receipt printable.
- [x] **TC-SV-02: Partial Item Deselection**
  - Uncheck Hot Plate (₹2,350.00) -> Total ₹3,720.00.
  - Settle ₹3,720.00.
  - Expectation: Total recalculates live, saved successfully with 6 items.

---

## 5. Customer CRM & Customer 360
- [x] **TC-CRM-01: Create & Edit Customer**
  - Input: Name, 10-digit mobile, address, village, connection type.
  - Expectation: Saved in `Customers` sheet with unique `CustomerID`.
- [x] **TC-CRM-02: Customer 360 Aggregation**
  - Open Customer 360 view for customer.
  - Expectation: Shows Lifetime Value (LTV), total refill count, refill frequency gap, and transaction history.

---

## 6. Customer Dues & Credit Ledger
- [x] **TC-DUES-01: Dues Ageing Buckets**
  - Open `screen-dues`.
  - Expectation: Dues segmented into 0-7 days, 8-30 days, 31-60 days, and 60+ days with totals.
- [x] **TC-DUES-02: Dues Recovery**
  - Recover ₹500 against a ₹700 due via Cash.
  - Expectation: Balance updated to ₹200 (`PARTIAL`), entry added to `Due Payments`, Cashbook live cash incremented.
- [x] **TC-DUES-03: Admin Dues Write-Off**
  - Admin write-off with audit justification.
  - Expectation: Balance set to ₹0 (`WRITTEN_OFF`), non-admins forbidden.

---

## 7. Hawkers & Godown Dispatch
- [x] **TC-DISP-01: Daily Hawker Dispatch Entry**
  - Loaded: 50, Return Empty: 5, Net Sold: 45.
  - Cash: ₹46,890, UPI: ₹0, Dues: ₹0.
  - Expectation: Recorded in `Vendor Dispatch`, Hawker cash reflected in Cashbook.

---

## 8. Cash Register & Day Closing
- [x] **TC-CASH-01: Live Inflow Aggregation**
  - Verify live Billing Cash + Hawker Cash + Dues Cash match transaction records.
- [x] **TC-CASH-02: Till Denominations Counter**
  - Enter note counts: ₹500, ₹200, ₹100, ₹50, ₹20, ₹10, and coins.
  - Expectation: Physical till total computed live, variance = PhysicalTill - SystemClosing.
- [x] **TC-CASH-03: Day Closing Lock**
  - Click "Close Day & Lock Register".
  - Expectation: `IsClosed = true`, all cash modification locked.
- [x] **TC-CASH-04: Admin Unlock**
  - Admin unlocks closed day with reason.
  - Expectation: Register unlocked, audit logged.

---

## 9. Cylinder Inventory & Stock
- [x] **TC-STK-01: Stock Equation Reconciliation**
  - Types: 14.2KG, 19KG, 5KG Commercial, 5KG Domestic, 2KG Commercial.
  - Close Full = Open Full + Plant Receipt - Sold - Defective.
  - Close Empty = Open Empty + Sold + Defective - Sent to Plant.
  - Expectation: Numbers tally with daily sales records.

---

## 10. HR, Attendance & Payroll
- [x] **TC-HR-01: Staff Master CRUD**
  - Add employee with base salary and per-delivery incentive rate.
- [x] **TC-HR-02: Daily Attendance**
  - Mark attendance (Present, Absent, Half Day, Leave) for date.
- [x] **TC-HR-03: Payroll Calculation & Finalization**
  - Calculate monthly salary: Base + (Deliveries x Rate) - Advances.
  - Admin finalizes and locks month.

---

## 11. Vendors & Purchases
- [x] **TC-VND-01: Vendor Master**
  - Add supplier with GSTIN and contact details.
- [x] **TC-VND-02: Purchase Invoices**
  - Record purchase receipt of cylinders/accessories.

---

## 12. Reports & Daily Rojnamcha
- [x] **TC-REP-01: Preserved Daily Rojnamcha Layout**
  - Verify 9-row official HP Gas agency layout preserves exact columns and rates.
- [x] **TC-REP-02: A4 & Thermal 80mm Printing**
  - Test print layouts in Print Preview modal.

---

## 13. Google Drive Cloud Archives & Backups
- [x] **TC-ARC-01: Generate Cloud PDF/HTML Archive**
  - Generate archive -> file created in Google Drive folder "Shiv Shakti HP Gas Archives".
- [x] **TC-ARC-02: Full Database Backup Snapshot**
  - Click "Create Drive Backup" -> Copy of spreadsheet created in "Shiv Shakti HP Gas Backups".

---

## 14. Responsive Layout & Mobile Usability
- [x] **TC-UI-01: Viewport Breakpoints**
  - Tested on 360px, 390px, 768px, 1024px, 1366px, 1920px.
  - Minimum 44px touch targets on mobile bottom nav.
- [x] **TC-UI-02: Palette Customizer**
  - Switch between Navy, Sapphire, Emerald, Charcoal, Crimson, Amber presets.
  - Day and Dark mode toggle with persistent `localStorage`.
