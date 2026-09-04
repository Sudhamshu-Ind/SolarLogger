export const GAS_SCRIPT_CODE = `/**
 * CASAGRAND ATHENS - SOLAR GENERATION LOG & BACKEND API
 * 
 * Google Apps Script Web App for Google Sheets.
 * Free, serverless REST API that powers the CGSolarLog frontend.
 * 
 * INSTRUCTIONS TO UPDATE / DEPLOY:
 * 1. Open your Google Sheet
 * 2. In top menu, click Extensions > Apps Script
 * 3. Replace all code in Code.gs with this file
 * 4. Click 'Save' (floppy icon)
 * 5. Click 'Deploy' > 'Manage deployments' > Click Edit (pencil icon) > Version: 'New version' > Click 'Deploy'
 *    (OR 'Deploy' > 'New deployment' > Web app > Execute as: 'Me' > Who has access: 'Anyone')
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

    if (action === "addLog" && e && e.parameter && e.parameter.entry) {
      const entry = JSON.parse(decodeURIComponent(e.parameter.entry));
      const result = recordDailyLog(entry);
      return jsonResponse({ success: true, result });
    }

    if (action === "updateBlocks" && e && e.parameter && e.parameter.blocks) {
      const blocks = JSON.parse(decodeURIComponent(e.parameter.blocks));
      updateAllBlocks(blocks);
      return jsonResponse({ success: true, message: "Block metadata updated" });
    }

    if (action === "syncAll" && e && e.parameter && e.parameter.payload) {
      const payload = JSON.parse(decodeURIComponent(e.parameter.payload));
      if (payload.blocks && Array.isArray(payload.blocks)) {
        updateAllBlocks(payload.blocks);
      }
      if (payload.logs && Array.isArray(payload.logs)) {
        syncMultipleLogs(payload.logs);
      }
      return jsonResponse({ success: true, message: "Synced all data successfully" });
    }
    
    return jsonResponse({ success: false, error: "Unknown action" });
  } catch (err) {
    return jsonResponse({ success: false, error: err.toString() });
  }
}

function doPost(e) {
  try {
    setupSheetsIfMissing();
    let postData = {};
    if (e && e.postData && e.postData.contents) {
      try {
        postData = JSON.parse(e.postData.contents);
      } catch (pe) {
        postData = { action: "addLog", raw: e.postData.contents };
      }
    }

    const action = postData.action || (e && e.parameter && e.parameter.action) || "addLog";

    if (action === "addLog") {
      const entry = postData.entry || (e && e.parameter && e.parameter.entry ? JSON.parse(decodeURIComponent(e.parameter.entry)) : null);
      if (entry) {
        const result = recordDailyLog(entry);
        return jsonResponse({ success: true, result });
      }
    }

    if (action === "syncAll") {
      if (postData.blocks && Array.isArray(postData.blocks)) {
        updateAllBlocks(postData.blocks);
      }
      if (postData.logs && Array.isArray(postData.logs)) {
        syncMultipleLogs(postData.logs);
      }
      return jsonResponse({ success: true, message: "Batch sync completed" });
    }

    if (action === "updateBlocks" && postData.blocks) {
      updateAllBlocks(postData.blocks);
      return jsonResponse({ success: true, message: "Block metadata updated" });
    }

    return jsonResponse({ success: false, error: "Invalid action or empty payload" });
  } catch (err) {
    return jsonResponse({ success: false, error: err.toString() });
  }
}

function fetchAllData() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // 1. Fetch Logs
  const logsSheet = ss.getSheetByName(LOGS_SHEET_NAME);
  const logsData = logsSheet ? logsSheet.getDataRange().getValues() : [];
  const logs = [];
  
  if (logsData.length > 1) {
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
        dailyUnits: row[3] !== "" && row[3] !== null && row[3] !== undefined ? Number(row[3]) : null,
        isManualEntry: row[4] === true || String(row[4]).toUpperCase() === "TRUE",
        weather: String(row[5] || ""),
        notes: String(row[6] || ""),
        loggedBy: String(row[7] || "Staff"),
        timestamp: row[8] ? String(row[8]) : new Date().toISOString()
      });
    }
  }

  // 2. Fetch Blocks
  const blocksSheet = ss.getSheetByName(BLOCKS_SHEET_NAME);
  const blocksData = blocksSheet ? blocksSheet.getDataRange().getValues() : [];
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
        capacityKwp: Number(row[2] || 20),
        inceptionDate: inceptionDateVal,
        initialMeterReading: Number(row[4] || 0),
        color: String(row[5] || "#f59e0b"),
        inverterModel: String(row[6] || "Deye Inverter"),
        status: String(row[7] || "Active"),
        phase: Number(row[8] || (["A", "B", "F"].includes(String(row[0])) ? 1 : 2))
      });
    }
  }

  return { logs, blocks };
}

function recordDailyLog(entry) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(LOGS_SHEET_NAME);
  if (!sheet) {
    setupSheetsIfMissing();
    sheet = ss.getSheetByName(LOGS_SHEET_NAME);
  }
  
  const dateStr = entry.date || Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd");
  const block = entry.block;
  const cumulative = Number(entry.cumulativeUnits || 0);
  const daily = entry.dailyUnits !== undefined && entry.dailyUnits !== null ? Number(entry.dailyUnits) : "";
  const isManual = entry.isManualEntry !== false;
  const weather = entry.weather || "Sunny";
  const notes = entry.notes || "";
  const loggedBy = entry.loggedBy || "Staff";
  const timestamp = entry.timestamp || new Date().toISOString();

  // Check if date + block already exists; update row if found
  const data = sheet.getDataRange().getValues();
  let rowToUpdate = -1;
  for (let i = 1; i < data.length; i++) {
    const rowDate = data[i][0] instanceof Date 
      ? Utilities.formatDate(data[i][0], Session.getScriptTimeZone(), "yyyy-MM-dd")
      : String(data[i][0]).substring(0, 10);
    const rowBlock = String(data[i][1]);
    if (rowDate === dateStr && rowBlock === block) {
      rowToUpdate = i + 1; // 1-indexed
      break;
    }
  }

  if (rowToUpdate > 0) {
    sheet.getRange(rowToUpdate, 1, 1, 9).setValues([[
      dateStr, block, cumulative, daily, isManual, weather, notes, loggedBy, timestamp
    ]]);
  } else {
    sheet.appendRow([
      dateStr, block, cumulative, daily, isManual, weather, notes, loggedBy, timestamp
    ]);
  }

  return { recorded: true, date: dateStr, block, cumulative };
}

function syncMultipleLogs(logsList) {
  logsList.forEach(entry => {
    if (entry && entry.block && entry.date) {
      recordDailyLog(entry);
    }
  });
}

function updateAllBlocks(blocksList) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(BLOCKS_SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(BLOCKS_SHEET_NAME);
  } else {
    sheet.clear();
  }

  sheet.appendRow([
    "BlockId", "BlockName", "CapacityKWp", "InceptionDate", "InitialMeterReading", "Color", "InverterModel", "Status", "Phase"
  ]);

  blocksList.forEach(b => {
    sheet.appendRow([
      b.id,
      b.name,
      Number(b.capacityKwp || 20),
      b.inceptionDate || "2026-07-18",
      Number(b.initialMeterReading || 0),
      b.color || "#f59e0b",
      b.inverterModel || "Deye Inverter",
      b.status || "Active",
      Number(b.phase || (["A", "B", "F"].includes(String(b.id)) ? 1 : 2))
    ]);
  });

  sheet.setFrozenRows(1);
  sheet.getRange("A1:I1").setFontWeight("bold").setBackground("#e0f2fe");
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
    updateAllBlocks([
      { id: "A", name: "Block A (Rooftop Plant)", capacityKwp: 8, inceptionDate: "2026-07-18", initialMeterReading: 0, color: "#f59e0b", inverterModel: "Deye SUN-8K-G04 (BLE)", status: "Active" },
      { id: "B", name: "Block B (Rooftop Plant)", capacityKwp: 20, inceptionDate: "2026-07-18", initialMeterReading: 0, color: "#0284c7", inverterModel: "Deye SUN-20K-G04 (BLE)", status: "Active" },
      { id: "F", name: "Block F (Rooftop Plant)", capacityKwp: 31, inceptionDate: "2026-07-18", initialMeterReading: 0, color: "#10b981", inverterModel: "Deye SUN-31K-G04 (BLE)", status: "Active" },
    ]);
  }
}

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
`;
