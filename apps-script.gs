/* AfterHarvest plan form -> Google Sheet.
   Paste this whole file into the sheet's Apps Script editor, then redeploy the web app.

   It is self-healing: if COLS gains a key (a new question), the header row grows to
   match on the next save, and rows are written against the sheet's OWN header order,
   so existing columns never shift under old data. */

const SHEET_ID = '1ZKOzQZa7TbH8efFThTkGP39f9vzTvfvf_vkiwL6yQUs';
const TAB = 'Responses';

const COLS = [
  'rid','started','updated','step','of','complete',
  'name','email','anonymous','links','list_size','open_rate',
  'ran_event','event_result','what_you_sell','offer_price','price_type',
  'launch_style','launch_collect','timing','objection',
  'page','referrer',
  // Aug 2026, with the reordered form: the optional site/@handle that replaced the
  // anonymous question, and where the visitor came from.
  'handle','utm_source','utm_medium','utm_campaign'
];

function headers_(sh) {
  const width = Math.max(sh.getLastColumn(), 1);
  return sh.getRange(1, 1, 1, width).getValues()[0]
           .map(function (h) { return String(h).trim(); });
}

function sheet_() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  let sh = ss.getSheetByName(TAB);
  if (!sh) sh = ss.insertSheet(TAB);

  // brand new tab: write the lot
  if (sh.getLastRow() === 0) {
    sh.appendRow(COLS);
    sh.setFrozenRows(1);
    sh.getRange(1, 1, 1, COLS.length).setFontWeight('bold');
    return sh;
  }

  // existing tab: add only the headers it does not already have, on the end, so the
  // columns under the old data stay exactly where they are
  const head = headers_(sh);
  const missing = COLS.filter(function (k) { return head.indexOf(k) === -1; });
  if (missing.length) {
    const at = head.filter(String).length + 1;
    sh.getRange(1, at, 1, missing.length)
      .setValues([missing])
      .setFontWeight('bold');
  }
  return sh;
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const d = JSON.parse(e.postData.contents);
    if (!d.rid) return out_({ ok: false, error: 'no rid' });

    const sh = sheet_();
    const a = d.answers || {};
    const head = headers_(sh);

    // built against the sheet's own header order, not COLS, so a column someone moved
    // or renamed by hand cannot silently shift every value one to the left
    const row = head.map(function (k) {
      if (!k) return '';
      if (Object.prototype.hasOwnProperty.call(d, k)) return d[k];
      return a[k] != null ? a[k] : '';
    });

    // find this visitor's existing row, if any
    const last = sh.getLastRow();
    let at = -1;
    if (last > 1) {
      const rids = sh.getRange(2, 1, last - 1, 1).getValues();
      for (let i = 0; i < rids.length; i++) {
        if (rids[i][0] === d.rid) { at = i + 2; break; }
      }
    }

    // whoever just did something goes to row 2, so the newest activity is always on top
    if (at > 0) sh.deleteRow(at);
    sh.insertRowBefore(2);
    sh.getRange(2, 1, 1, row.length).setValues([row]);

    return out_({ ok: true, row: 2, moved: at > 0, cols: row.length });
  } catch (err) {
    return out_({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

function doGet() { return out_({ ok: true }); }

function out_(o) {
  return ContentService.createTextOutput(JSON.stringify(o))
    .setMimeType(ContentService.MimeType.JSON);
}
