# Formula Map: Shiv Shakti HP Gas Agency Daily Reports

This document lists every formula and dynamic binding mapped across the 4 standard report sheets in the master Google Spreadsheet:
1. `REPORT_SALES` (or `Daily Sales`)
2. `REPORT_CASH` (or `Cash Report`)
3. `REPORT_VENDOR` (or `COLLECTION SUMMARY`)
4. `REPORT_STOCK` (or `Cylinser Stock`)

---

## 0. Master Date Architecture
- **Single Input Cell:** `'COLLECTION SUMMARY'!H2` (or `REPORT_VENDOR!H2`).
- Changing this single date cell triggers instant recomputation across all sheets:
  - **`REPORT_SALES!A1`:** `="SHIV SHAKTI HP GAS AGENCY • DAILY SALES & REVENUE REPORT — DATE: " & TEXT('COLLECTION SUMMARY'!H2, "DD-MM-YYYY")`
  - **`REPORT_CASH!E2`:** `="Date: " & TEXT('COLLECTION SUMMARY'!H2, "DD/MM/YYYY")`
  - **`REPORT_STOCK!B2`:** `='COLLECTION SUMMARY'!H2`

---

## 1. Sheet: `REPORT_SALES` (`Daily Sales`)

### Top KPI Summary Cards (Rows 2–4)
| Cell | Label | Formula / Source | Note |
|:---|:---|:---|:---|
| **B3** | TOTAL BILLING | `=D61` | Daily Gross Sales + Previous Dues Recovered |
| **D3** | CYLINDER REVENUE | `=SUM(D8:D10)` | Sum of 19KG + 14.2KG (Godown + Delivery) Revenue |
| **F3** | DIGITAL COLLECTIONS | `=F61+H61+G61` | Total UPI + HP Pay + NEFT Settlements |
| **H3** | NET CASH INFLOW | `=E61` | Total Physical Cash from All Inflows |
| **J3** | OUTSTANDING DUES | `=H18` | Total Today's Uncollected Cylinder Dues |

### Cylinder & Accessories Sales Report (Rows 8–18)
| Row | Item Description | Rate (Col B) | Qty (Col C) | Total Amount (Col D) | Cash (E), UPI (F), HP Pay (G), Dues (H), Others (I) | Total Settled (Col J) | Audit Status (Col K) |
|:---|:---|:---|:---|:---|:---|:---|:---|
| **8** | 19KG Commercial | `=VLOOKUP(A8, RATES!A:C, 3, 0)` | `=SUMIFS(ENTRY!F:F, ENTRY!B:B, 'COLLECTION SUMMARY'!$H$2, ENTRY!E:E, A8, ENTRY!D:D, "SALE", ENTRY!M:M, "<>TRUE")` | `=B8*C8` | Mode SUMIFS: `=SUMIFS(ENTRY!H:H, ENTRY!B:B, 'COLLECTION SUMMARY'!$H$2, ENTRY!E:E, $A8, ENTRY!I:I, "<MODE>", ENTRY!M:M, "<>TRUE")` | `=SUM(E8:I8)` | — |
| **9** | 14.2KG Domestic (Godown) | `=VLOOKUP("14.2KG Domestic", RATES!A:C, 3, 0)` | `='COLLECTION SUMMARY'!C21` | `=B9*C9` | E9: `='COLLECTION SUMMARY'!D24`<br>F9: `='COLLECTION SUMMARY'!E24`<br>G9: `='COLLECTION SUMMARY'!F24`<br>H9: `='COLLECTION SUMMARY'!G24`<br>I9: `0.00` | `=SUM(E9:I9)` | — |
| **10** | 14.2KG Domestic (Home Delivery) | `=VLOOKUP("14.2KG Domestic", RATES!A:C, 3, 0)` | `='COLLECTION SUMMARY'!C20` | `=B10*C10` | E10: `='COLLECTION SUMMARY'!D23`<br>F10: `='COLLECTION SUMMARY'!E23`<br>G10: `='COLLECTION SUMMARY'!F23`<br>H10: `='COLLECTION SUMMARY'!G23`<br>I10: `0.00` | `=SUM(E10:I10)` | — |
| **12** | Suraksha Hose Pipe | `=VLOOKUP(A12, RATES!A:C, 3, 0)` | `=SUMIFS(ENTRY!F:F, ..., A12, ...)` | `=B12*C12` | Mode SUMIFS from `ENTRY` | `=SUM(E12:I12)` | — |
| **13** | Domestic Regulator | `=VLOOKUP(A13, RATES!A:C, 3, 0)` | `=SUMIFS(ENTRY!F:F, ..., A13, ...)` | `=B13*C13` | Mode SUMIFS from `ENTRY` | `=SUM(E13:I13)` | — |
| **14** | Domestic Pass Book | `=VLOOKUP(A14, RATES!A:C, 3, 0)` | `=SUMIFS(ENTRY!F:F, ..., A14, ...)` | `=B14*C14` | Mode SUMIFS from `ENTRY` | `=SUM(E14:I14)` | — |
| **15** | PMUY Pass Book | `=VLOOKUP(A15, RATES!A:C, 3, 0)` | `=SUMIFS(ENTRY!F:F, ..., A15, ...)` | `=B15*C15` | Mode SUMIFS from `ENTRY` | `=SUM(E15:I15)` | — |
| **16** | 5 Kg Nd Rfl | `=VLOOKUP(A16, RATES!A:C, 3, 0)` | `=SUMIFS(ENTRY!F:F, ..., A16, ...)` | `=IF(OR(B16<>"",C16<>""), B16*C16, "")` | Mode SUMIFS from `ENTRY` | `=IF(OR(B16<>"",C16<>""), SUM(E16:I16), "")` | — |
| **17** | Ftl Rgulator | `=VLOOKUP(A17, RATES!A:C, 3, 0)` | `=SUMIFS(ENTRY!F:F, ..., A17, ...)` | `=IF(OR(B17<>"",C17<>""), B17*C17, "")` | Mode SUMIFS from `ENTRY` | `=IF(OR(B17<>"",C17<>""), SUM(E17:I17), "")` | — |
| **18** | **TOTAL CYLINDER & ACCESSORIES** | — | `=SUM(C8:C10)+SUM(C12:C17)` | `=SUM(D8:D10)+SUM(D12:D17)` | For each column E–I:<br>`=SUM(X8:X10)+SUM(X12:X17)` | `=SUM(J8:J10)+SUM(J12:J17)` | `=IF(D18=J18, "RECONCILED ✓", "DIFF: ₹" & TEXT(D18-J18, "#,##0"))` |

### Sales Return & Replacement Register (Rows 21–24)
- **C21–C23 (Qty):** `=SUMIFS(ENTRY!F:F, ENTRY!B:B, 'COLLECTION SUMMARY'!$H$2, ENTRY!E:E, A{row}, ENTRY!D:D, "RETURN", ENTRY!M:M, "<>TRUE")`
- **D21–D23 (Return Amount):** `=B{row}*C{row}`
- **E21–I23 (Refund Modes):** Mode SUMIFS from `ENTRY` where `category = "RETURN"`
- **J21–J23:** `=SUM(E{row}:I{row})`
- **Row 24 (TOTAL):** Columns C–J: `=SUM(X21:X23)`. Col K: `=IF(D24=J24, "RECONCILED ✓", "DIFF: ₹" & TEXT(D24-J24, "#,##0"))`

### Security Deposit & SV/TV Register (Rows 27–33)
- **D27–D32 (Qty):** From `ENTRY` with `category = "SECURITY_DEPOSIT"`
- **F27–F32 (Amount):** `=D{row}*E{row}`
- **G27–I32 (Mode breakdown):** Cash, UPI, NEFT/RTGS
- **J27–J32:** `=SUM(G{row}:I{row})`
- **Row 33 (TOTAL):** Columns D–J: `=SUM(X27:X32)`

### Security Deposit / TV Out Refund Register (Rows 40–43)
- **D40–D42 (Qty):** From `ENTRY` with `category = "SD_REFUND"`
- **F40–F42 (Refund Amount):** `=D{row}*E{row}`
- **G40–I42 (Refund Modes):** Cash, UPI, NEFT
- **J40–J42:** `=SUM(G{row}:I{row})`
- **Row 43 (TOTAL):** Columns D–J: `=SUM(X40:X42)`

### Service Charges & Misc. Revenue (Rows 46–51)
- Items: *Name change (Death)*, *Truck Opening Charges*, *Administration Charge*, *Safety inspection*.
- **C46–C50 (Qty):** From `ENTRY` with `category = "SERVICE"`
- **D46–D50 (Amount):** `=B{row}*C{row}`
- **E46–G50 (Modes):** Cash, UPI, NEFT/RTGS
- **J46–J50:** `=SUM(E{row}:G{row})`
- **Row 51 (TOTAL):** Columns C–J: `=SUM(X46:X50)`

### Summary Revenue (A) Breakdown (Row 53)
- **D53 (Total Invoiced):** `=D18+F33+D51+F43-D24`
- **E53 (Cash):** `=E18+G33+E51+G43-E24`
- **F53 (UPI):** `=F18+H33+F51+H43-F24`
- **G53 (NEFT/RTGS):** `=I33+G51+I43`
- **H53 (HP Pay):** `=G18-G24`
- **I53 (Others/MDB):** `=I18+H18-I24`
- **J53 (Total Received):** `=E53+F53+G53+H53+I53`
- **K53 (Audit Status):** `=IF(D53=J53, "BALANCED ✓", "DIFF: ₹" & TEXT(D53-J53, "#,##0"))`

### Previous Outstanding Dues Recovered (B) (Rows 56–59)
- **D56–D58:** Recoveries recorded in `ENTRY` (`category = "DUES_RECEIVED"`) / `DUES` tab.
- **Row 59 (TOTAL):** `=SUM(D56:D58)`, `=SUM(E56:E58)`, `=SUM(F56:F58)`, `=SUM(G56:G58)`, K59: `=IF(D59=J59, "RECOVERED ✓", "DIFF")`

### Grand Total Amount Including Dues [A+B] (Row 61)
- **D61:** `=D53+D59`
- **E61:** `=E53+E59`
- **F61:** `=F53+F59`
- **G61:** `=G53+G59`
- **H61:** `=H53+H59`
- **I61:** `=I53+I59`
- **J61:** `=J53+J59`
- **K61 (Audit Status):** `=IF(D61=J61, "BALANCED ✓", "DIFF: ₹" & TEXT(D61-J61, "#,##0"))`

---

## 2. Sheet: `REPORT_CASH` (`Cash Report`)

### Top KPI Banner (Rows 3–5)
- **B4 (Total Sales Bill):** `='Daily Sales'!D61`
- **C4 (Net Receipts):** `=C15`
- **D4 (Cash Collected):** `=F8` (points to `='Daily Sales'!E61`)
- **E4 (Bank Deposit):** `=E19`
- **F4 (Closing Cash):** `=E25`

### Sales & Adjustments vs Payment Channels (Rows 8–15)
- **C8:** `='Daily Sales'!D61`
- **C9 (HP PAY Adjustment):** `='Daily Sales'!G18`
- **C10 (Cash in Madhubani):** `='Daily Sales'!I18`
- **C11 (Advances):** `0.00`
- **C12 (Total Adjusted [D]):** `=SUM(C9:C11)`
- **C13 (Dues on Vendor):** `='Daily Sales'!H18`
- **C14 (Dues on Customer):** From `ENTRY`
- **C15 (Net Sales Receipt [C-D]):** `=C8-C12-C13-C14`
- **F8 (CASH):** `='Daily Sales'!E61`
- **F9 (UPI):** `='Daily Sales'!F61`
- **F10 (NEFT/RTGS):** `='Daily Sales'!G61`
- **F11 (Total Actual Receipts [E]):** `=SUM(F8:F10)`
- **F12 (Net Dues & Deductions):** `=C12+C13+C14`
- **F13 (Settlement Check):** `=IF(C15=F11,"RECONCILED ✓",IF(C15>F11,"RECEIPT DEFICIT: ₹" & TEXT(C15-F11,"#,##0"),"SURPLUS: ₹" & TEXT(F11-C15,"#,##0")))`
- **F14 (Expected Parity Difference):** `=C15-F11`

### Daily Cash Book Account (Rows 18–27)
- **C19 (Opening Cash Balance):** Previous day's closing cash from `CASHBOOK`.
- **C20 (Cash Received from Sales):** `=F8`
- **C27 (Total Cash Inflows & Opening):** `=SUM(C19:C24)`
- **E19 (Bank Deposit at Pandual):** Pulled from `CASHBOOK`
- **E20 (Cash Tfr Thakur Ji):** Pulled from `CASHBOOK`
- **E21 (Cash Sent to Madhubani):** Pulled from `CASHBOOK`
- **E22 (Petty Cash & Misc):** Pulled from `CASHBOOK`
- **E25 (Closing Cash Balance in Hand):** `=C27-SUM(E19:E24)`
- **E27 (Total Outflows & Closing):** `=SUM(E19:E25)`
- **F27 (Reconciliation):** `=IF(ROUND(C27,2)=ROUND(E27,2),"BALANCED ✓","MISMATCH ✗")`

### Physical Cash Denominations (Rows 30–41)
- **E31–E39:** `=C{row}*D{row}` for notes 500, 200, 100, 50, 20, 10, 5, 2, 1.
- **D40 (Total Notes):** `=SUM(D31:D39)`
- **E40 (Total Physical Cash):** `=SUM(E31:E39)`
- **C41 (Book Closing):** `=E25`
- **D41 (Variance Text):** `="Variance: ₹" & TEXT(E40-E25,"#,##0")`
- **F41 (Verification):** `=IF(ROUND(E40-E25,2)=0,"MATCHED & BALANCED ✓","DISCREPANCY: ₹" & TEXT(E40-E25,"#,##0"))`

### Amount Dues Register & Receivables C/F (Rows 44–49)
- **E45 (Opening Back Dues):** Previous day's closing dues from `DUES` master.
- **E46 (Add: Today's Dues):** `=C13+C14`
- **E47 (Less: Dues Collected):** `='Daily Sales'!J59`
- **E49 (Total Outstanding Closing):** `=E45+E46-E47`
- **F49 (Audit Status):** `=IF(E49=(E45+E46-E47),"RECONCILED C/F ✓","AUDIT MISMATCH ✗")`

---

## 3. Sheet: `REPORT_VENDOR` (`COLLECTION SUMMARY`)

### Top Summary Cards (Rows 2–4)
- **B3 (Total Cylinders):** `=C22`
- **C3 (Cash Collections):** `=D22`
- **D3 (Digital Payments):** `=E22+F22`
- **F3 (Total Dues):** `=G22`

### Vendor Log Rows (Rows 7–19)
For each vendor row:
- **C{row} (Gas Given):** `=SUMIFS(VENDOR_LOG!D:D, VENDOR_LOG!B:B, $H$2, VENDOR_LOG!C:C, B{row})`
- **D{row} (Cash):** `=SUMIFS(VENDOR_LOG!E:E, VENDOR_LOG!B:B, $H$2, VENDOR_LOG!C:C, B{row})`
- **E{row} (UPI):** `=SUMIFS(VENDOR_LOG!F:F, VENDOR_LOG!B:B, $H$2, VENDOR_LOG!C:C, B{row})`
- **F{row} (HP Pay):** `=SUMIFS(VENDOR_LOG!G:G, VENDOR_LOG!B:B, $H$2, VENDOR_LOG!C:C, B{row})`
- **G{row} (Dues):** `=SUMIFS(VENDOR_LOG!H:H, VENDOR_LOG!B:B, $H$2, VENDOR_LOG!C:C, B{row})`
- **H{row} (Reconciliation):** `=IF(C{row}=SUM(D{row}:G{row}), "Balanced", "Mismatch (" & (C{row}-SUM(D{row}:G{row})) & ")")`

### Group Totals & Value Conversion (Rows 20–24)
- **Row 20 (DELIVERY TOTAL):** `=SUM(C7:C19)`, `=SUM(D7:D19)`, `=SUM(E7:E19)`, `=SUM(F7:F19)`, `=SUM(G7:G19)`
- **Row 21 (GODOWN):** `=SUMIFS(VENDOR_LOG!X:X, VENDOR_LOG!B:B, $H$2, VENDOR_LOG!C:C, "GODOWN")`
- **Row 22 (GRAND TOTAL):** `=C20+C21`, `=D20+D21`, `=E20+E21`, `=F20+F21`, `=G20+G21`
- **Row 23 (Hd - Home Delivery Value):** Rate C23 `=1042`. D23: `=C23*D20`, E23: `=C23*E20`, F23: `=C23*F20`, G23: `=C23*G20`
- **Row 24 (Gd - Godown Value):** Rate C24 `=1042`. D24: `=C24*D21`, E24: `=C24*E21`, F24: `=C24*F21`, G24: `=C24*G21`

---

## 4. Sheet: `REPORT_STOCK` (`Cylinser Stock`)

### Stock Rows (Rows 5–9)
For cylinder types (14.2 KG Domestic, 19 KG Commercial, 5 KG Commercial, 5 KG Domestic, 2 KG Commercial):
- **C{row} (Opening Filled):** From `STOCK` table.
- **D{row} (Received from HPCL - Filled):** From `STOCK` table.
- **E{row} (Total Filled):** `=SUM(C{row}:D{row})`
- **F{row} (Sold / Delivered):**
  - Row 5 (14.2 KG Domestic): `='COLLECTION SUMMARY'!C22`
  - Rows 6–9: SUMIFS from `ENTRY` by cylinder type.
- **G{row} (Adjustment):** From `STOCK` table.
- **H{row} (Closing Filled):** `=E{row}-F{row}+N(G{row})`
- **I{row} (Opening Empty):** From `STOCK` table.
- **J{row} (Customer Empty Received):** `=F{row}`
- **K{row} (Returned Empty):** From `STOCK` table.
- **L{row} (Total Empty):** `=SUM(I{row}:K{row})`
- **M{row} (Empty Sent to Plant):** From `STOCK` table.
- **N{row} (Closing Empty):** `=L{row}-M{row}`
- **Row 10 (TOTAL):** `=SUM(X5:X9)` for every column C through N.
