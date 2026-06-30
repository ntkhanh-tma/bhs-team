/**
 * Vacation Planner — Google Apps Script Web App
 *
 * This acts as a write proxy for the "Vacation-Plan" sheet because the
 * Sheets API v4 with an API key is read-only.
 *
 * HOW TO DEPLOY:
 *   1. Open the Google Spreadsheet that contains your vacation data.
 *   2. Extensions → Apps Script → paste this file's contents, save.
 *   3. Deploy → New deployment → Web app.
 *        Execute as:  Me
 *        Who can access: Anyone
 *   4. Copy the deployment URL and store it as:
 *        • .env.local  →  VACATION_API_URL=https://script.google.com/macros/s/xxx/exec
 *        • GitHub secret  →  VACATION_API_URL
 *
 * Sheet structure for "Vacation-Plan":
 *   Row 1 (header): Month | Username | Date
 *   Row 2+:         MM/YYYY | username | YYYY-MM-DD
 */

var VACATION_SHEET = 'Vacation-Plan';

// ── GET — return all vacation rows ──────────────────────────────────────────
function doGet() {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(VACATION_SHEET);
    if (!sheet) return respond({ success: false, error: 'Sheet "Vacation-Plan" not found.' });

    var rows = sheet.getDataRange().getValues();
    var data = rows.slice(1) // skip header
      .filter(function(r) { return r[0] && r[1] && r[2]; })
      .map(function(r) {
        return {
          month:    String(r[0]).trim(),
          username: String(r[1]).trim().toLowerCase(),
          date:     String(r[2]).trim(),
        };
      });

    return respond({ success: true, data: data });
  } catch (e) {
    return respond({ success: false, error: e.message });
  }
}

// ── POST — upsert/delete vacation rows ──────────────────────────────────────
//
// Payload (JSON stringified, sent as text/plain to avoid CORS preflight):
//   { username: string, month: "MM/YYYY", addDates: string[], removeDates: string[] }
//
function doPost(e) {
  try {
    var payload = JSON.parse(e.postData.contents);
    var username   = (payload.username   || '').trim().toLowerCase();
    var month      = (payload.month      || '').trim();
    var addDates   = payload.addDates   || [];
    var removeDates = payload.removeDates || [];

    if (!username || !month) {
      return respond({ success: false, error: '"username" and "month" are required.' });
    }

    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(VACATION_SHEET);
    if (!sheet) return respond({ success: false, error: 'Sheet "Vacation-Plan" not found.' });

    // Delete matching rows (iterate bottom-to-top so row indices stay valid)
    if (removeDates.length > 0) {
      var all = sheet.getDataRange().getValues();
      for (var i = all.length - 1; i >= 1; i--) {
        var rowUser  = String(all[i][1]).trim().toLowerCase();
        var rowMonth = String(all[i][0]).trim();
        var rowDate  = String(all[i][2]).trim();
        if (rowUser === username && rowMonth === month && removeDates.indexOf(rowDate) >= 0) {
          sheet.deleteRow(i + 1); // sheet rows are 1-indexed
        }
      }
    }

    // Append new rows (skip duplicates)
    if (addDates.length > 0) {
      // Re-read after deletions
      var current = sheet.getDataRange().getValues().slice(1)
        .filter(function(r) {
          return String(r[1]).trim().toLowerCase() === username && String(r[0]).trim() === month;
        })
        .map(function(r) { return String(r[2]).trim(); });

      for (var j = 0; j < addDates.length; j++) {
        if (current.indexOf(addDates[j]) < 0) {
          sheet.appendRow([month, username, addDates[j]]);
          current.push(addDates[j]); // prevent re-adding within this loop
        }
      }
    }

    return respond({ success: true });
  } catch (e) {
    return respond({ success: false, error: e.message });
  }
}

function respond(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
