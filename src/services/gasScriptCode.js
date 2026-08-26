export const GAS_SCRIPT_CODE = `/**
 * CASAGRAND ATHENS - SOLAR GENERATION LOG & BACKEND API
 * 
 * Google Apps Script Web App for Google Sheets.
 * Free, serverless REST API that powers the CGSolarLog frontend.
 * 
 * INSTRUCTIONS TO DEPLOY:
 * 1. Open your Google Sheet
 * 2. In top menu, click Extensions > Apps Script
 * 3. Delete any code in Code.gs and paste this entire file
 * 4. Click 'Save' (floppy icon)
 * 5. Click 'Deploy' > 'New deployment'
 * 6. Select type: 'Web app'
 * 7. Set 'Execute as': 'Me'
 * 8. Set 'Who has access': 'Anyone' (Important so the Netlify frontend can reach it)
 * 9. Click 'Deploy', authorize permissions, and copy the Web App URL!
 * 10. Paste the Web App URL into your CGSolarLog Settings modal.
 */

// Tab Names
const LOGS_SHEET_NAME = "DailyLogs";
const BLOCKS_SHEET_NAME = "BlockMetadata";

function doGet(e) {
  try {
    setupSheetsIfMissing();
    const action = (e && e.parameter && e.parameter.action) || "getData";
    
    if (action === "getData") {
      const data = fetchAllData();
      return jsonResponse({ success: true, ...data });
    }
    
    return jsonResponse({ success: false, error: "Unknown action" });
  } catch (err) {
    return jsonResponse({ success: false, error: err.toString() });
  }
}

function doPost(e) {
  try {
    setupSheetsIfMissing();
    const postData = JSON.parse(e.postData.contents);
    const action = postData.action || "addLog";

    if (action === "addLog") {
      const result = recordDailyLog(postData.entry);
      return jsonResponse({ success: true, result });
    }

    if (action === "updateBlock") {
      const result = saveBlockMetadata(postData.block);
      return jsonResponse({ success: true, result });
    }

    return jsonResponse({ success: false, error: "Invalid action" });
  } catch (err) {
    return jsonResponse({ success: false, error: err.toString() });
  }
}

function fetchAllData() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // 1. Fetch Logs
  const logsSheet = ss.getSheetByName(LOGS_SHEET_NAME);
  const logsData = logsSheet.getDataRange().getValues();
  const logs = [];
  
  if (logsData.length > 1) {
    // Skip header row
    for (let i = 1; i < logsData.length; i++) {
      const row = logsData[i];
      if (!row[0]) continue;
      
      const dateVal = row[0] instanceof Date 
        ? Utilities.formatDate(row[0], Session.getScriptTimeZone(), "yyyy-MM-dd") 
        : String(row[0]).substring(0, 10);
        
      logs.push({
        date: dateVal,
        block: String(row[1] || ""),
        cumulativeUnits: Number(row[2] || 0),
        dailyUnits: row[3] !== "" ? Number(row[3]) : null,
        isManualEntry: row[4] === true || String(row[4]).toUpperCase() === "TRUE",
        weather: String(row[5] || ""),
        notes: String(row[6] || ""),
        loggedBy: String(row[7] || "Technician"),
        timestamp: row[8] ? String(row[8]) : new Date().toISOString()
      });
    }
  }

  // 2. Fetch Blocks
  const blocksSheet = ss.getSheetByName(BLOCKS_SHEET_NAME);
  const blocksData = blocksSheet.getDataRange().getValues();
  const blocks = [];
  
  if (blocksData.length > 1) {
    for (let j = 1; j < blocksData.length; j++) {
      const row = blocksData[j];
      if (!row[0]) continue;
      
      const inceptionDateVal = row[3] instanceof Date 
        ? Utilities.formatDate(row[3], Session.getScriptTimeZone(), "yyyy-MM-dd") 
        : String(row[3] || "2026-07-18").substring(0, 10);

      blocks.push({
        id: String(row[0]),
        name: String(row[1] || ("Block " + row[0])),
        capacityKwp: Number(row[2] || 40),
        inceptionDate: inceptionDateVal,
        initialMeterReading: Number(row[4] || 0),
        color: String(row[5] || "#f59e0b"),
        inverterModel: String(row[6] || ""),
        status: String(row[7] || "Active")
      });
    }
  }

  return { logs, blocks };
}

function recordDailyLog(entry) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(LOGS_SHEET_NAME);
  
  const dateStr = entry.date || Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd");
  const block = entry.block;
  const cumulative = Number(entry.cumulativeUnits || 0);
  const daily = entry.dailyUnits !== undefined && entry.dailyUnits !== null ? Number(entry.dailyUnits) : "";
  const isManual = entry.isManualEntry !== false;
  const weather = entry.weather || "Sunny";
  const notes = entry.notes || "";
  const loggedBy = entry.loggedBy || "Staff";
  const timestamp = new Date().toISOString();

  sheet.appendRow([
    dateStr,
    block,
    cumulative,
    daily,
    isManual,
    weather,
    notes,
    loggedBy,
    timestamp
  ]);

  return { recorded: true, date: dateStr, block, cumulative };
}

function setupSheetsIfMissing() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // 1. Setup DailyLogs
  let logsSheet = ss.getSheetByName(LOGS_SHEET_NAME);
  if (!logsSheet) {
    logsSheet = ss.insertSheet(LOGS_SHEET_NAME);
    logsSheet.appendRow([
      "Date", "Block", "CumulativeUnits", "DailyUnits", "IsManualEntry", "Weather", "Notes", "LoggedBy", "Timestamp"
    ]);
    logsSheet.setFrozenRows(1);
    logsSheet.getRange("A1:I1").setFontWeight("bold").setBackground("#fef3c7");
  }

  // 2. Setup BlockMetadata
  let blocksSheet = ss.getSheetByName(BLOCKS_SHEET_NAME);
  if (!blocksSheet) {
    blocksSheet = ss.insertSheet(BLOCKS_SHEET_NAME);
    blocksSheet.appendRow([
      "BlockId", "BlockName", "CapacityKWp", "InceptionDate", "InitialMeterReading", "Color", "InverterModel", "Status"
    ]);
    // Seed default blocks A, B, F
    blocksSheet.appendRow(["A", "Block A (Rooftop Plant)", 8, "2026-07-18", 0, "#f59e0b", "Deye SUN-8K-G04 (BLE)", "Active"]);
    blocksSheet.appendRow(["B", "Block B (Rooftop Plant)", 20, "2026-07-18", 0, "#0284c7", "Deye SUN-20K-G04 (BLE)", "Active"]);
    blocksSheet.appendRow(["F", "Block F (Rooftop Plant)", 31, "2026-07-18", 0, "#10b981", "Deye SUN-31K-G04 (BLE)", "Active"]);
    blocksSheet.setFrozenRows(1);
    blocksSheet.getRange("A1:H1").setFontWeight("bold").setBackground("#e0f2fe");
  }
}

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
`;
