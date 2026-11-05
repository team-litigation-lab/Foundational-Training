/**
 * 📧 EOD emails → the Foundational Training platform
 *
 * Runs inside the team-litigation@legalsupporthelp.com Gmail (Google Apps Script). The trainees CC that address on their EOD
 * email; every 5 minutes this finds the new ones and sends each to the platform, which matches it to its trainee, checks it
 * against the EOD template and counts it in 📋 Batch Sheet → 📤 Daily outputs (worker.js /api/eod/inbound → receiveEod).
 *
 * Only EOD emails leave the mailbox: the search below (SEARCH) takes emails to or CC'd to this address whose subject names an
 * EOD or Daily Report, from the last 3 days, not sent by this account. Each one sent is remembered (and its thread labelled
 * EOD-sent), so nothing is sent twice. Nothing in the mailbox is changed apart from that label.
 *
 * SET UP (once, signed in as team-litigation@legalsupporthelp.com):
 *   1. Go to https://script.google.com → New project. Name it "EOD to the platform".
 *   2. Delete what is in Code.gs, paste this whole file, and Save.
 *   3. Project Settings (⚙) → Script Properties → Add script property:
 *        EOD_KEY = the same key saved on the Worker as the secret EOD_KEY (Cloudflare → Workers & Pages →
 *                  foundational-training → Settings → Variables and Secrets → Add → Secret).
 *   4. Back in the editor, pick the function "sendEods" and press Run. Allow it to read the Gmail and connect to the platform.
 *   5. Triggers (⏰) → Add Trigger → function sendEods, event source "Time-driven", "Minutes timer", "Every 5 minutes" → Save.
 * The Executions page (☰) shows each run and what it sent.
 */
const PLATFORM = 'https://foundational-training.legalsupporthelp.workers.dev/api/eod/inbound';
const ADDRESS = 'team-litigation@legalsupporthelp.com';
const SEARCH = '{to:' + ADDRESS + ' cc:' + ADDRESS + '} subject:(EOD OR "Daily Report" OR "EOD Report") newer_than:3d -from:me';
const LABEL = 'EOD-sent';

function sendEods() {
  const props = PropertiesService.getScriptProperties();
  const key = props.getProperty('EOD_KEY');
  if (!key) throw new Error('Add the script property EOD_KEY first (Project Settings → Script Properties).');
  // the emails already sent (their Gmail ids), the last 500
  const done = JSON.parse(props.getProperty('SENT') || '[]');
  const seen = new Set(done);
  const label = GmailApp.getUserLabelByName(LABEL) || GmailApp.createLabel(LABEL);
  let sent = 0, failed = 0;
  GmailApp.search(SEARCH, 0, 100).forEach(function (thread) {
    let all = true;
    thread.getMessages().forEach(function (m) {
      const id = m.getId();
      if (seen.has(id)) return;
      const subject = m.getSubject() || '';
      if (!/\b(EOD|Daily Report)\b/i.test(subject)) return;   // (a reply in the thread that isn't an EOD)
      const res = UrlFetchApp.fetch(PLATFORM, {
        method: 'post', contentType: 'application/json', muteHttpExceptions: true,
        headers: { 'X-EOD-Key': key },
        payload: JSON.stringify({ from: m.getFrom(), subject: subject, date: m.getDate().toISOString(), text: m.getPlainBody() })
      });
      if (res.getResponseCode() === 200) { seen.add(id); done.push(id); sent++; }
      else { all = false; failed++; console.warn('Not sent (' + res.getResponseCode() + '): ' + subject + ' — ' + res.getContentText().slice(0, 200)); }
    });
    if (all) thread.addLabel(label);
  });
  props.setProperty('SENT', JSON.stringify(done.slice(-500)));
  console.log('EODs sent: ' + sent + (failed ? ', not sent: ' + failed + ' (tried again next run)' : ''));
}
