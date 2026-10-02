/**
 * ============================================================================
 * SHIV SHAKTI HP GAS ERP - CYLINDER INVENTORY & STOCK ENGINE
 * Sheet: Cylinder Stock
 * Headers: Date, Type, OpenFull, PlantReceipt, Sold, Defective, SentPlant, CloseFull, CloseEmpty, CreatedAt, CreatedBy, IsDeleted
 * ============================================================================
 */

function getStock(dateStr) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const targetDate = dateStr || getTodayISO();
  const stockSheet = ss.getSheetByName('Cylinder Stock');

  const cylinderTypes = ['14.2KG Domestic', '19KG Commercial', '5KG Commercial', '5KG Domestic', '2KG Commercial'];
  const stockMap = {};

  cylinderTypes.forEach(function(t) {
    stockMap[t] = {
      type: t,
      openFull: 0,
      plantReceipt: 0,
      sold: 0,
      defective: 0,
      sentPlant: 0,
      closeFull: 0,
      closeEmpty: 0
    };
  });

  // Calculate live sales from Daily Sales & Vendor Dispatch for 14.2kg and 19kg
  const salesSheet = ss.getSheetByName('Daily Sales');
  if (salesSheet && salesSheet.getLastRow() > 1) {
    const sData = salesSheet.getDataRange().getValues();
    for (let i = 1; i < sData.length; i++) {
      if (sData[i][18] === true) continue;
      if (formatDateString(sData[i][0]) === targetDate) {
        const item = String(sData[i][1]);
        const qty = Number(sData[i][4]) || 0;
        if (item.indexOf('14.2') > -1) {
          stockMap['14.2KG Domestic'].sold += qty;
        } else if (item.indexOf('19') > -1) {
          stockMap['19KG Commercial'].sold += qty;
        } else if (item.indexOf('5 Kg') > -1 || item.indexOf('5KG') > -1) {
          stockMap['5KG Domestic'].sold += qty;
        } else if (item.indexOf('2 Kg') > -1 || item.indexOf('2KG') > -1) {
          stockMap['2KG Commercial'].sold += qty;
        }
      }
    }
  }

  // Load existing records from Cylinder Stock
  if (stockSheet && stockSheet.getLastRow() > 1) {
    const data = stockSheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (data[i][11] === true) continue;
      if (formatDateString(data[i][0]) === targetDate) {
        const type = String(data[i][1]);
        if (stockMap[type]) {
          stockMap[type].openFull = Number(data[i][2]) || 0;
          stockMap[type].plantReceipt = Number(data[i][3]) || 0;
          // Keep recorded sold or fallback to live
          const recordedSold = Number(data[i][4]);
          if (!isNaN(recordedSold) && recordedSold > 0) {
            stockMap[type].sold = recordedSold;
          }
          stockMap[type].defective = Number(data[i][5]) || 0;
          stockMap[type].sentPlant = Number(data[i][6]) || 0;
          stockMap[type].closeFull = Number(data[i][7]) || 0;
          stockMap[type].closeEmpty = Number(data[i][8]) || 0;
        }
      }
    }
  }

  const result = cylinderTypes.map(function(t) {
    const item = stockMap[t];
    // Recompute closing if not explicit
    if (!item.closeFull && (item.openFull || item.plantReceipt)) {
      item.closeFull = item.openFull + item.plantReceipt - item.sold - item.defective;
    }
    return item;
  });

  return successResponse({ date: targetDate, records: result }, 'Stock data loaded');
}

function saveStock(payload, user) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const stockSheet = ss.getSheetByName('Cylinder Stock');
  if (!stockSheet) return errorResponse('Cylinder Stock sheet not found', 'NOT_FOUND');

  const targetDate = payload.date || getTodayISO();
  const records = payload.records || [];

  if (!records.length) {
    return errorResponse('No stock records provided', 'VALIDATION');
  }

  const sData = stockSheet.getDataRange().getValues();

  records.forEach(function(rec) {
    const type = rec.type;
    const openFull = Number(rec.openFull) || 0;
    const plantReceipt = Number(rec.plantReceipt) || 0;
    const sold = Number(rec.sold) || 0;
    const defective = Number(rec.defective) || 0;
    const sentPlant = Number(rec.sentPlant) || 0;
    const closeFull = openFull + plantReceipt - sold - defective;
    const closeEmpty = Number(rec.closeEmpty) || (sold + defective - sentPlant);

    let foundRow = -1;
    for (let i = 1; i < sData.length; i++) {
      if (sData[i][11] === true) continue;
      if (formatDateString(sData[i][0]) === targetDate && String(sData[i][1]) === type) {
        foundRow = i + 1;
        break;
      }
    }

    if (foundRow > -1) {
      stockSheet.getRange(foundRow, 3, 1, 7).setValues([[
        openFull, plantReceipt, sold, defective, sentPlant, closeFull, closeEmpty
      ]]);
    } else {
      stockSheet.appendRow([
        targetDate, type, openFull, plantReceipt, sold, defective, sentPlant, closeFull, closeEmpty,
        new Date().toISOString(), user.username, false
      ]);
    }
  });

  writeAuditLog(user, 'SAVE_STOCK', 'Cylinder Stock', targetDate, `Updated ${records.length} stock lines`);
  return successResponse({ date: targetDate }, 'Stock updated successfully');
}
