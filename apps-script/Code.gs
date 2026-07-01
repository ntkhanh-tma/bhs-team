/**
 * Vacation Planner — Google Apps Script Web App
 *
 * Write proxy for the "Vacation-Plan" sheet (Sheets API v4 with API key is read-only).
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
 *   Row 1 (header): Month | Username | Date | Type
 *   Row 2+:         MM/YYYY | username | YYYY-MM-DD | Vacation|Compensation|Event
 */

var VACATION_SHEET = 'Vacation-Plan';
var VALID_TYPES    = ['Vacation', 'Compensation', 'Event'];

// ── GET — return all vacation rows (diagnostic / manual read) ────────────────
function doGet() {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(VACATION_SHEET);
    if (!sheet) return respond({ success: false, error: 'Sheet "' + VACATION_SHEET + '" not found.' });

    var rows = sheet.getDataRange().getValues();
    var data = rows.slice(1)
      .filter(function(r) { return r[1] && r[2]; })
      .map(function(r) {
        return {
          month:    String(r[0] || '').trim(),
          username: String(r[1] || '').trim().toLowerCase(),
          date:     String(r[2] || '').trim(),
          type:     String(r[3] || 'Vacation').trim(),
        };
      });

    return respond({ success: true, data: data });
  } catch (err) {
    return respond({ success: false, error: String(err.message || err) });
  }
}

// ── POST — add / remove vacation rows ───────────────────────────────────────
//
// Payload (JSON stringified, sent as Content-Type: text/plain to avoid CORS preflight):
//   {
//     username:    string,          // lowercase username
//     month:       "MM/YYYY",       // e.g. "08/2026"
//     type:        string,          // "Vacation" | "Compensation" | "Event"
//     addDates:    string[],        // YYYY-MM-DD dates to add
//     removeDates: string[],        // YYYY-MM-DD dates to remove
//   }
//
function doPost(e) {
  // tryLock returns false (no throw) if lock cannot be acquired within the timeout.
  // This serialises concurrent executions so two near-simultaneous requests
  // cannot both read an empty sheet and both insert the same rows.
  var lock = LockService.getScriptLock();
  var lockAcquired = lock.tryLock(10000);
  if (!lockAcquired) {
    return respond({ success: false, error: 'Server busy — please try again in a moment.' });
  }

  try {
    // Guard: Apps Script passes null e.postData when there is no request body.
    if (!e || !e.postData || !e.postData.contents) {
      return respond({ success: false, error: 'Missing request body.' });
    }

    var payload     = JSON.parse(e.postData.contents);
    var username    = String(payload.username    || '').trim().toLowerCase();
    var month       = String(payload.month       || '').trim();
    var rawType     = String(payload.type        || '').trim();
    var type        = VALID_TYPES.indexOf(rawType) >= 0 ? rawType : 'Vacation';
    var addDates    = Array.isArray(payload.addDates)    ? payload.addDates    : [];
    var removeDates = Array.isArray(payload.removeDates) ? payload.removeDates : [];

    if (!username) return respond({ success: false, error: '"username" is required.' });
    if (!month)    return respond({ success: false, error: '"month" is required.' });
    if (addDates.length === 0 && removeDates.length === 0) {
      return respond({ success: false, error: 'Nothing to add or remove.' });
    }

    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(VACATION_SHEET);
    if (!sheet) return respond({ success: false, error: 'Sheet "' + VACATION_SHEET + '" not found.' });

    // ── Soft-delete: set Type = "Deleted" instead of removing rows ───────────
    // Rows are kept so history is preserved; the client filters them out at read time.
    if (removeDates.length > 0) {
      var allRows = sheet.getDataRange().getValues();
      for (var i = 1; i < allRows.length; i++) {
        var rowUser = String(allRows[i][1] || '').trim().toLowerCase();
        var rowDate = String(allRows[i][2] || '').trim();
        if (rowUser === username && removeDates.indexOf(rowDate) >= 0) {
          sheet.getRange(i + 1, 4).setValue('Deleted'); // column D = Type, rows are 1-indexed
        }
      }
    }

    // ── Append new rows (re-read after deletions; skip exact duplicates) ──────
    if (addDates.length > 0) {
      var currentRows = sheet.getDataRange().getValues().slice(1);
      var existingKeys = {};
      for (var k = 0; k < currentRows.length; k++) {
        var u = String(currentRows[k][1] || '').trim().toLowerCase();
        var d = String(currentRows[k][2] || '').trim();
        if (u && d) existingKeys[u + '|' + d] = true;
      }

      for (var j = 0; j < addDates.length; j++) {
        var key = username + '|' + String(addDates[j]).trim();
        if (!existingKeys[key]) {
          sheet.appendRow([month, username, String(addDates[j]).trim(), type]);
          existingKeys[key] = true; // prevent re-adding within this same loop
        }
      }
    }

    return respond({ success: true });

  } catch (err) {
    return respond({ success: false, error: String(err.message || err) });
  } finally {
    lock.releaseLock();
  }
}

// ── Helper ───────────────────────────────────────────────────────────────────

function respond(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
