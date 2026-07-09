/**
 * BHS Team — Google Apps Script Gateway
 *
 * This is the ONLY thing that touches the spreadsheet. The Angular app never
 * talks to the Google Sheets API directly anymore, so the sheet can (and must)
 * be made PRIVATE — shared with no one but the account that owns this script.
 *
 * It runs as you ("Execute as: Me"), reads/writes the private sheet server-side,
 * and returns JSON. Every request must carry a shared secret (see APP_SECRET
 * below); requests without it get nothing.
 *
 * ── WHY A SECRET, AND WHAT IT DOES / DOESN'T DO ──────────────────────────────
 * The secret is injected into the published web app at build time, so a
 * determined visitor CAN still extract it from the JS bundle — it is
 * obfuscation, not true confidentiality (a static site cannot hold a real
 * secret). What it buys you:
 *   • The raw sheet is no longer world-exportable as CSV (the #1 leak).
 *   • The most sensitive columns (MAC, email, public IP, PC name, birthday)
 *     are never returned in the bulk member list — only via the single-user
 *     `profile` action — so they can't be scraped in one request.
 *   • The secret can be rotated here + in the GitHub secret without touching
 *     Google Cloud, and lets you add rate-limiting/logging later.
 * For real per-user protection you need real authentication — see SECURITY.md.
 *
 * ── DEPLOY ───────────────────────────────────────────────────────────────────
 *   1. Extensions → Apps Script → paste this file, Save.
 *   2. Project Settings → Script properties → add property:
 *        APP_SECRET = <a long random string>   (generate one, keep it secret)
 *   3. Deploy → New deployment → Web app.
 *        Execute as:  Me
 *        Who has access: Anyone
 *   4. Copy the /exec URL → GitHub secret VACATION_API_URL.
 *      Put the same APP_SECRET value → GitHub secret GATEWAY_SECRET.
 *   5. Make the spreadsheet PRIVATE (Share → General access → Restricted).
 *
 * Team-Info columns:
 *   A ID | B Origin | C Team | D Role | E Name | F Username | G IP |
 *   H Public IP | I PC Name | J MAC Address | K BHS Email | L Mobile | M Birthday
 */

var VACATION_SHEET  = 'Vacation-Plan';
var TEAM_INFO_SHEET = 'Team-Info';
var DATABASE_SHEET  = 'Database';
var VALID_TYPES     = ['Vacation', 'Compensation', 'Special Leave'];

// Fields returned to everyone in the bulk directory list. Everything else in a
// member row (dc, ip, publicIp, pcName, macAddress, email, mobile, birthday) is
// withheld and only served by the single-user `profile` action.
// (Nothing here is a real access control while login is username-only — it just
//  keeps the sensitive columns out of the one-shot bulk response.)

// ── Entry points ─────────────────────────────────────────────────────────────

function doGet(e) {
  try {
    var params = (e && e.parameter) || {};
    if (!authorized_(params.secret)) {
      return respond_({ success: false, error: 'unauthorized' });
    }

    var action = String(params.action || '').trim().toLowerCase();
    switch (action) {
      case 'members':      return respond_({ success: true, data: readMembersDirectory_() });
      case 'profile':      return respond_({ success: true, data: readProfile_(params.username) });
      case 'holidays':     return respond_({ success: true, data: readNamedRows_('Holidays', ['date', 'name', 'country']) });
      case 'vacations':    return respond_({ success: true, data: readVacations_() });
      case 'database':     return respond_({ success: true, data: readDatabaseLookups_() });
      case 'releaseplans': return respond_({ success: true, data: readNamedRows_('ReleasePlan', ['date', 'release']) });
      case 'eventplans':   return respond_({ success: true, data: readNamedRows_('EventPlan', ['date', 'description']) });
      default:             return respond_({ success: false, error: 'unknown action: ' + action });
    }
  } catch (err) {
    return respond_({ success: false, error: String(err.message || err) });
  }
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) {
    return respond_({ success: false, error: 'Server busy — please try again in a moment.' });
  }
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return respond_({ success: false, error: 'Missing request body.' });
    }
    var payload = JSON.parse(e.postData.contents);
    if (!authorized_(payload && payload.secret)) {
      return respond_({ success: false, error: 'unauthorized' });
    }

    var action = String((payload && payload.action) || 'vacation').trim().toLowerCase();
    if (action === 'updateprofile') return handleUpdateProfile_(payload);
    return handleVacation_(payload);
  } catch (err) {
    return respond_({ success: false, error: String(err.message || err) });
  } finally {
    lock.releaseLock();
  }
}

// ── Auth ─────────────────────────────────────────────────────────────────────

function authorized_(provided) {
  var expected = PropertiesService.getScriptProperties().getProperty('APP_SECRET');
  // Fail closed: if no secret is configured, reject everything.
  if (!expected) return false;
  return typeof provided === 'string' && provided.length > 0 && provided === expected;
}

// ── Reads ──────────────────────────────────────────────────────────────────────

function teamInfoSheet_() {
  var s = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(TEAM_INFO_SHEET);
  if (!s) throw new Error('Sheet "' + TEAM_INFO_SHEET + '" not found.');
  return s;
}

/** Directory list — safe columns only, sensitive fields intentionally omitted. */
function readMembersDirectory_() {
  var rows = teamInfoSheet_().getDataRange().getDisplayValues();
  return rows.slice(1)
    .filter(function (r) { return String(r[5] || '').trim(); }) // has username
    .map(function (r) {
      return {
        id:         String(r[0] || '').trim(),
        department: String(r[2] || '').trim(),
        position:   String(r[3] || '').trim(),
        name:       String(r[4] || '').trim(),
        username:   String(r[5] || '').trim().toLowerCase(),
      };
    });
}

/** Full single row for one username (used by that user's own profile editor). */
function readProfile_(username) {
  var u = String(username || '').trim().toLowerCase();
  if (!u) return null;
  var rows = teamInfoSheet_().getDataRange().getDisplayValues();
  for (var i = 1; i < rows.length; i++) {
    var r = rows[i];
    if (String(r[5] || '').trim().toLowerCase() === u) {
      return {
        id:         String(r[0]  || '').trim(),
        dc:         String(r[1]  || '').trim(),
        department: String(r[2]  || '').trim(),
        position:   String(r[3]  || '').trim(),
        name:       String(r[4]  || '').trim(),
        username:   u,
        ip:         String(r[6]  || '').trim(),
        publicIp:   String(r[7]  || '').trim(),
        pcName:     String(r[8]  || '').trim(),
        macAddress: String(r[9]  || '').trim(),
        email:      String(r[10] || '').trim(),
        mobile:     String(r[11] || '').trim(),
        birthday:   String(r[12] || '').trim(),
      };
    }
  }
  return null;
}

function readVacations_() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(VACATION_SHEET);
  if (!sheet) throw new Error('Sheet "' + VACATION_SHEET + '" not found.');
  var rows = sheet.getDataRange().getDisplayValues();
  return rows.slice(1)
    .filter(function (r) {
      return String(r[1] || '').trim() && String(r[2] || '').trim() &&
             String(r[3] || '').trim().toLowerCase() !== 'deleted';
    })
    .map(function (r) {
      return {
        month:    String(r[0] || '').trim(),
        username: String(r[1] || '').trim().toLowerCase(),
        date:     String(r[2] || '').trim(),
        type:     String(r[3] || 'Vacation').trim(),
      };
    });
}

function readDatabaseLookups_() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(DATABASE_SHEET);
  if (!sheet) throw new Error('Sheet "' + DATABASE_SHEET + '" not found.');
  var rows = sheet.getRange(1, 1, sheet.getLastRow(), 3).getDisplayValues().slice(1);
  var distinct = function (idx) {
    var seen = {}, out = [];
    rows.forEach(function (r) {
      var v = String(r[idx] || '').trim();
      if (v && !seen[v.toLowerCase()]) { seen[v.toLowerCase()] = true; out.push(v); }
    });
    return out;
  };
  return { teams: distinct(0), roles: distinct(1), dcs: distinct(2) };
}

/** Reads a named range (Holidays / ReleasePlan / EventPlan) into keyed objects. */
function readNamedRows_(rangeName, keys) {
  var range = SpreadsheetApp.getActiveSpreadsheet().getRangeByName(rangeName);
  if (!range) throw new Error('Named range "' + rangeName + '" not found.');
  var rows = range.getDisplayValues();
  return rows.slice(1)
    .filter(function (r) { return String(r[0] || '').trim(); })
    .map(function (r) {
      var obj = {};
      keys.forEach(function (k, i) { obj[k] = String(r[i] || '').trim(); });
      return obj;
    });
}

// ── Writes ──────────────────────────────────────────────────────────────────────

function handleVacation_(payload) {
  var username    = String(payload.username || '').trim().toLowerCase();
  var month       = String(payload.month    || '').trim();
  var rawType     = String(payload.type     || '').trim();
  var type        = VALID_TYPES.indexOf(rawType) >= 0 ? rawType : 'Vacation';
  var addDates    = Array.isArray(payload.addDates)    ? payload.addDates    : [];
  var removeDates = Array.isArray(payload.removeDates) ? payload.removeDates : [];

  if (!username) return respond_({ success: false, error: '"username" is required.' });
  if (!month)    return respond_({ success: false, error: '"month" is required.' });
  if (addDates.length === 0 && removeDates.length === 0) {
    return respond_({ success: false, error: 'Nothing to add or remove.' });
  }
  // Reject anything that isn't a plausible YYYY-MM-DD date.
  var isDate = function (d) { return /^\d{4}-\d{2}-\d{2}$/.test(String(d).trim()); };
  if (!addDates.every(isDate) || !removeDates.every(isDate)) {
    return respond_({ success: false, error: 'Dates must be YYYY-MM-DD.' });
  }

  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(VACATION_SHEET);
  if (!sheet) return respond_({ success: false, error: 'Sheet "' + VACATION_SHEET + '" not found.' });

  if (removeDates.length > 0) {
    var allRows = sheet.getDataRange().getValues();
    for (var i = 1; i < allRows.length; i++) {
      var rowUser = String(allRows[i][1] || '').trim().toLowerCase();
      var rowDate = String(allRows[i][2] || '').trim();
      if (rowUser === username && removeDates.indexOf(rowDate) >= 0) {
        sheet.getRange(i + 1, 4).setValue('Deleted');
      }
    }
  }

  if (addDates.length > 0) {
    var currentRows = sheet.getDataRange().getValues().slice(1);
    var existingKeys = {};
    for (var k = 0; k < currentRows.length; k++) {
      var u = String(currentRows[k][1] || '').trim().toLowerCase();
      var d = String(currentRows[k][2] || '').trim();
      var t = String(currentRows[k][3] || '').trim();
      if (u && d && t !== 'Deleted') existingKeys[u + '|' + d] = true;
    }
    for (var j = 0; j < addDates.length; j++) {
      var key = username + '|' + String(addDates[j]).trim();
      if (!existingKeys[key]) {
        sheet.appendRow([month, username, String(addDates[j]).trim(), type]);
        existingKeys[key] = true;
      }
    }
  }

  return respond_({ success: true });
}

function handleUpdateProfile_(payload) {
  var id           = String(payload.id           || '').trim();
  var authUsername = String(payload.authUsername || '').trim().toLowerCase();
  var updates      = payload.updates || {};

  if (!id || !authUsername) {
    return respond_({ success: false, error: '"id" and "authUsername" are required.' });
  }

  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(TEAM_INFO_SHEET);
  if (!sheet) return respond_({ success: false, error: 'Sheet "' + TEAM_INFO_SHEET + '" not found.' });

  var rows = sheet.getDataRange().getValues();
  var targetRow = -1;
  for (var i = 1; i < rows.length; i++) {
    if (String(rows[i][0] || '').trim() === id &&
        String(rows[i][5] || '').trim().toLowerCase() === authUsername) {
      targetRow = i + 1;
      break;
    }
  }
  if (targetRow === -1) {
    return respond_({ success: false, error: 'Profile not found or unauthorized.' });
  }

  if (updates.dc         !== undefined) sheet.getRange(targetRow, 2).setValue(String(updates.dc));
  if (updates.department !== undefined) sheet.getRange(targetRow, 3).setValue(String(updates.department));
  if (updates.role       !== undefined) sheet.getRange(targetRow, 4).setValue(String(updates.role));
  if (updates.username   !== undefined) sheet.getRange(targetRow, 6).setValue(String(updates.username).trim().toLowerCase());
  if (updates.ip         !== undefined) sheet.getRange(targetRow, 7).setValue(String(updates.ip));
  if (updates.publicIp   !== undefined) sheet.getRange(targetRow, 8).setValue(String(updates.publicIp));
  if (updates.pcName     !== undefined) sheet.getRange(targetRow, 9).setValue(String(updates.pcName));
  if (updates.macAddress !== undefined) sheet.getRange(targetRow, 10).setValue(String(updates.macAddress));
  if (updates.email      !== undefined) sheet.getRange(targetRow, 11).setValue(String(updates.email));
  if (updates.mobile     !== undefined) sheet.getRange(targetRow, 12).setValue(String(updates.mobile));
  if (updates.birthday   !== undefined) sheet.getRange(targetRow, 13).setValue(String(updates.birthday));

  return respond_({ success: true });
}

// ── Helper ────────────────────────────────────────────────────────────────────

function respond_(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
