/**
 * ============================================================================
 * SHIV SHAKTI HP GAS ERP - GOOGLE DRIVE ARCHIVE & BACKUP ENGINE
 * Sheet: Archives
 * Headers: ArchiveID, Date, FileName, FileType, DriveUrl, CreatedAt, CreatedBy, IsDeleted
 * ============================================================================
 */

function listArchives() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const aSheet = ss.getSheetByName('Archives');
  if (!aSheet || aSheet.getLastRow() <= 1) {
    return successResponse([], 'No archives found');
  }

  const data = aSheet.getDataRange().getValues();
  const archives = [];

  for (let i = 1; i < data.length; i++) {
    if (data[i][7] === true) continue; // IsDeleted
    archives.push({
      archiveId: data[i][0],
      date: formatDateString(data[i][1]),
      fileName: data[i][2],
      fileType: data[i][3],
      driveUrl: data[i][4],
      createdAt: data[i][5],
      createdBy: data[i][6]
    });
  }

  return successResponse(archives.reverse(), 'Archives retrieved');
}

function getOrCreateDriveFolder(folderName) {
  const folders = DriveApp.getFoldersByName(folderName);
  if (folders.hasNext()) {
    return folders.next();
  }
  return DriveApp.createFolder(folderName);
}

function generateArchive(payload, user) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const aSheet = ss.getSheetByName('Archives');
  if (!aSheet) return errorResponse('Archives sheet not found', 'NOT_FOUND');

  const fileType = String(payload.fileType || 'HTML').toUpperCase();
  const dateStr = payload.date || getTodayISO();
  const content = payload.content || '';
  const folder = getOrCreateDriveFolder('Shiv Shakti HP Gas Archives');

  const archiveId = 'arc_' + Utilities.getUuid().slice(0, 8);
  const fileName = `Rojnamcha_${dateStr}_${archiveId}.${fileType.toLowerCase()}`;
  
  let driveFile;
  if (fileType === 'PDF') {
    const blob = Utilities.newBlob(content, 'text/html', fileName + '.html').getAs('application/pdf').setName(fileName);
    driveFile = folder.createFile(blob);
  } else if (fileType === 'CSV') {
    driveFile = folder.createFile(fileName, content, MimeType.CSV);
  } else {
    driveFile = folder.createFile(fileName, content, MimeType.HTML);
  }

  driveFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  const driveUrl = driveFile.getUrl();

  aSheet.appendRow([
    archiveId, dateStr, fileName, fileType, driveUrl,
    new Date().toISOString(), user.username, false
  ]);

  writeAuditLog(user, 'GENERATE_ARCHIVE', 'Archives', archiveId, `Created archive ${fileName}`);
  return successResponse({ archiveId: archiveId, fileName: fileName, driveUrl: driveUrl }, 'Archive generated successfully');
}

function backupDatabase(payload, user) {
  if (user.role !== 'ADMIN') {
    return errorResponse('Admin authorization required for database backup', 'FORBIDDEN');
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const folder = getOrCreateDriveFolder('Shiv Shakti HP Gas Backups');
  const now = new Date();
  const timestamp = Utilities.formatDate(now, 'Asia/Kolkata', 'yyyy-MM-dd_HH-mm');
  const backupName = `ShivShakti_Backup_${timestamp}`;

  const copy = DriveApp.getFileById(ss.getId()).makeCopy(backupName, folder);
  const backupUrl = copy.getUrl();

  const aSheet = ss.getSheetByName('Archives');
  if (aSheet) {
    const archiveId = 'bkp_' + Utilities.getUuid().slice(0, 8);
    aSheet.appendRow([
      archiveId, getTodayISO(), backupName, 'SHEET_BACKUP', backupUrl,
      now.toISOString(), user.username, false
    ]);
  }

  writeAuditLog(user, 'DATABASE_BACKUP', 'Spreadsheet', ss.getId(), `Created backup copy ${backupName}`);
  return successResponse({ backupName: backupName, driveUrl: backupUrl }, 'Full database snapshot created successfully in Google Drive');
}
