# Plan form backend (Google Sheet)

The form on the landing page saves as people type, not only when they press
**get my plan**. Every save carries the same `rid`, so a person is **one row**
that keeps updating, and you can see exactly where someone stopped.

## 1. The sheet

Already created, in your Drive:

**AfterHarvest Plan Form Responses**
https://docs.google.com/spreadsheets/d/1ZKOzQZa7TbH8efFThTkGP39f9vzTvfvf_vkiwL6yQUs/edit

It is empty on purpose. The script below creates the `Responses` tab and the
header row by itself on the first save.

## 2. Add the script

Open that sheet, then **Extensions → Apps Script**. Delete whatever is in the
editor and paste this whole thing. The sheet ID is already filled in.

```js
const SHEET_ID = '1ZKOzQZa7TbH8efFThTkGP39f9vzTvfvf_vkiwL6yQUs';
const TAB = 'Responses';

const COLS = [
  'rid','started','updated','step','of','complete',
  'name','email','anonymous','links','list_size','open_rate',
  'ran_event','event_result','what_you_sell','offer_price','price_type',
  'launch_style','launch_collect','timing','objection',
  'page','referrer',
  // added Aug 2026 with the reordered form. New keys go on the END so the
  // existing sheet's header row stays aligned; type these four into the next
  // empty header cells (X, Y, Z, AA) by hand, since the script only writes a
  // header row when the tab is empty.
  'handle','utm_source','utm_medium','utm_campaign'
];

function sheet_() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  let sh = ss.getSheetByName(TAB);
  if (!sh) sh = ss.insertSheet(TAB);
  if (sh.getLastRow() === 0) {
    sh.appendRow(COLS);
    sh.setFrozenRows(1);
    sh.getRange(1, 1, 1, COLS.length).setFontWeight('bold');
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
    const row = COLS.map(function (k) {
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
    sh.getRange(2, 1, 1, COLS.length).setValues([row]);

    return out_({ ok: true, row: 2, moved: at > 0 });
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
```

## 3. Deploy it

**Deploy → New deployment → Web app**

- Execute as: **Me**
- Who has access: **Anyone**

Copy the `/exec` URL it gives you.

## 4. Point the page at it

In `index.html`, find `var ENDPOINT = '';` in the plan-form script near the
bottom and paste the URL between the quotes.

Until you do that, the form still works and answers are held in the visitor's
browser, but nothing is sent anywhere.

## What lands in the sheet

| column | meaning |
| --- | --- |
| `rid` | stable id for one visitor, the key the row updates on |
| row order | newest activity is always row 2; no sorting needed |
| `started` / `updated` | first touch and most recent keystroke |
| `step` / `of` | how far they got, e.g. `4` of `11` |
| `complete` | `TRUE` only if they pressed **get my plan** |
| everything else | one column per question |
| `handle` | the optional site / @handle from the last screen; blank means they chose anonymous |
| `utm_source` / `utm_medium` / `utm_campaign` | read from the URL on first load and kept with the rid, so a return visit still shows where they first came from |
| `referrer` | `document.referrer` on first load, kept the same way, as a backup for untagged links |

A row with `complete = FALSE` is someone who walked away. That is the point:
you can follow up on a half-filled form because you already have their email
from screen two.

## Notes

- The newsletter link is `theafterharvest.com/?utm_source=creatorscience&utm_medium=newsletter`.
- The email is posted the moment the email screen is submitted, so an abandon on any
  later screen still leaves a contactable row.
- Saves fire on a short debounce while typing, on every step change, and again
  when the tab is hidden or closed (via `sendBeacon`), so a closed tab still lands.
- The request is sent as `text/plain` on purpose. That keeps it a CORS simple
  request, which is what lets a static page post to Apps Script without a preflight.
- The browser cannot read the response (`no-cors`), so failures are silent by
  design. Check the sheet to confirm it is wired up.
- To change a question, edit the `SCREENS` array in `index.html`. If you add a
  field, add its key to `COLS` here too or it will not get a column.
