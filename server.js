const http = require('http');
const url = require('url');

function pad(n) { return String(n).padStart(2, '0'); }

function toICSDate(dateStr, timeStr) {
  if (!dateStr) return '';
  var dp = dateStr.split('-');
  var tp = (timeStr || '00:00').split(':');
  return dp[0] + pad(dp[1]) + pad(dp[2]) + 'T' + pad(tp[0]) + pad(tp[1]) + '00';
}

function addHours(dateStr, timeStr, hrs) {
  var dp = dateStr.split('-');
  var tp = (timeStr || '18:00').split(':');
  var h = parseInt(tp[0]) + hrs;
  var days = Math.floor(h / 24);
  h = h % 24;
  var day = parseInt(dp[2]) + days;
  return dp[0] + pad(dp[1]) + pad(String(day)) + 'T' + pad(String(h)) + pad(tp[1]) + '00';
}

function buildICS(p) {
  var name     = p.name     || 'Event';
  var date     = p.date     || '';
  var time     = p.time     || '18:00';
  var endTime  = p.endtime  || '';
  var location = p.location || '';
  var hosted   = p.hosted   || '';
  var dress    = p.dress    || '';
  var desc     = p.desc     || '';
  var rems     = p.reminders ? p.reminders.split(',') : [];

  var startDT = toICSDate(date, time);
  var endDT   = (endTime && endTime > time)
    ? toICSDate(date, endTime)
    : addHours(date, time, 3);

  var descParts = [];
  if (desc)   descParts.push(desc);
  if (dress)  descParts.push('Dress Code: ' + dress);
  if (hosted) descParts.push('Hosted by: ' + hosted);
  var fullDesc = descParts.join('\\n');

  var lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//EventLink//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    'UID:' + Date.now() + '@eventlink',
    'DTSTAMP:' + new Date().toISOString().replace(/[-:]/g,'').split('.')[0] + 'Z',
    'DTSTART:' + startDT,
    'DTEND:'   + endDT,
    'SUMMARY:' + name,
    'LOCATION:' + location,
    'DESCRIPTION:' + fullDesc
  ];

  rems.forEach(function(mins) {
    mins = parseInt(mins);
    if (!mins) return;
    var trigger = (mins >= 1440 && mins % 1440 === 0)
      ? '-P' + (mins / 1440) + 'D'
      : '-PT' + mins + 'M';
    lines.push('BEGIN:VALARM');
    lines.push('ACTION:DISPLAY');
    lines.push('DESCRIPTION:Reminder: ' + name);
    lines.push('TRIGGER:' + trigger);
    lines.push('END:VALARM');
  });

  lines.push('END:VEVENT');
  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

const HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>EventLink</title>
<style>
*{margin:0;padding:0;box-sizing:border-box;}
:root{--gold:#b8922a;--warm:#3d2b0e;--cream:#faf7f2;--border:#ddd3bb;--muted:#8a7a62;--green:#2d6a4f;}
body{background:var(--cream);font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:var(--warm);min-height:100vh;}
.wrap{max-width:640px;margin:0 auto;padding:20px 16px 80px;}
h1{font-family:Georgia,serif;font-size:2rem;font-weight:300;font-style:italic;text-align:center;margin-bottom:4px;}
h1 span{color:var(--gold);}
.sub{text-align:center;color:var(--muted);font-size:0.85rem;margin-bottom:22px;}
.tabs{display:flex;border:1.5px solid var(--border);border-radius:6px;overflow:hidden;margin-bottom:18px;}
.tab{flex:1;padding:13px 8px;border:none;background:#fffdf8;color:var(--muted);font-size:0.82rem;font-weight:600;cursor:pointer;}
.tab.active{background:var(--warm);color:#f0ead8;}
.card{background:#fffdf8;border:1px solid var(--border);border-radius:6px;padding:20px 16px;margin-bottom:14px;}
.ct{font-size:0.68rem;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:var(--muted);margin-bottom:12px;}
.lbl{display:block;font-size:0.68rem;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:var(--muted);margin-bottom:5px;}
input,textarea{width:100%;padding:10px 12px;border:1px solid var(--border);border-radius:4px;background:var(--cream);font-size:0.9rem;color:var(--warm);font-family:inherit;outline:none;box-sizing:border-box;}
input:focus,textarea:focus{border-color:var(--gold);}
textarea{resize:vertical;}
.row{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px;}
.grp{margin-bottom:12px;}
.chips{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:8px;}
.chip{border:1.5px solid var(--border);background:transparent;border-radius:4px;padding:8px 10px;cursor:pointer;font-size:0.75rem;color:var(--muted);font-family:inherit;text-align:left;line-height:1.3;}
.chip.on{border-color:var(--gold);background:rgba(184,146,42,0.1);color:var(--gold);font-weight:600;}
.tgrid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:16px;}
.tc{border:1.5px solid var(--border);background:transparent;border-radius:4px;padding:10px 4px;cursor:pointer;font-size:0.74rem;color:var(--muted);font-family:inherit;display:flex;flex-direction:column;align-items:center;gap:4px;}
.tc.on{border-color:var(--gold);background:rgba(184,146,42,0.1);color:var(--gold);font-weight:600;}
.tc .e{font-size:1.4rem;}
.btn{width:100%;padding:15px;background:var(--warm);color:#f0ead8;border:none;border-radius:4px;font-family:Georgia,serif;font-size:1rem;font-style:italic;cursor:pointer;margin-top:4px;}
.bsm{background:var(--warm);color:#f0ead8;border:none;border-radius:3px;padding:9px 16px;font-size:0.82rem;font-family:inherit;cursor:pointer;margin-right:8px;margin-top:6px;display:inline-block;}
.note{padding:10px 14px;border-radius:4px;font-size:0.8rem;line-height:1.6;margin-bottom:10px;}
.note.gold{background:#fff8e6;border:1px solid var(--gold);color:var(--warm);}
.note.red{background:#fff0f0;border:1px solid #e99;color:#c00;}
.msg-ta{width:100%;min-height:160px;padding:12px;border:2px solid var(--gold);border-radius:4px;background:var(--cream);font-size:0.84rem;font-family:inherit;line-height:1.75;color:var(--warm);resize:none;box-sizing:border-box;}
.sel-btn{width:100%;margin-top:8px;padding:13px;background:var(--warm);color:#f0ead8;border:none;border-radius:4px;font-size:0.88rem;font-family:inherit;font-weight:600;cursor:pointer;}
.ri{background:var(--cream);border:1px solid var(--border);border-radius:4px;padding:10px 12px;}
.rl{font-size:0.62rem;letter-spacing:0.1em;text-transform:uppercase;color:var(--muted);display:block;margin-bottom:2px;}
.rv{font-size:0.88rem;color:var(--warm);word-break:break-word;}
.hr{height:1px;background:var(--border);margin:14px 0;}
</style>
</head>
<body>
<div class="wrap">
  <h1>Event<span>Link</span></h1>
  <p class="sub">Smart calendar invitations</p>

  <div class="tabs">
    <button class="tab active" onclick="showTab('create',this)">✉️ Create Invitation</button>
    <button class="tab" onclick="showTab('scan',this)">📋 Save an Invitation</button>
  </div>

  <!-- ═══ CREATE TAB ═══ -->
  <div id="tab-create">
    <div class="card">
      <div class="ct">Event Type</div>
      <div class="tgrid">
        <button class="tc on" onclick="pickType(this)"><span class="e">💍</span>Wedding</button>
        <button class="tc" onclick="pickType(this)"><span class="e">🎉</span>Party</button>
        <button class="tc" onclick="pickType(this)"><span class="e">🤝</span>Fundraiser</button>
        <button class="tc" onclick="pickType(this)"><span class="e">🎂</span>Birthday</button>
        <button class="tc" onclick="pickType(this)"><span class="e">✨</span>Gala</button>
        <button class="tc" onclick="pickType(this)"><span class="e">📅</span>Other</button>
      </div>

      <div class="ct">Event Details</div>
      <div class="grp"><label class="lbl">Event Name *</label><input id="c-name" placeholder="e.g. Sarah & David's Wedding"/></div>
      <div class="grp"><label class="lbl">Hosted By</label><input id="c-hosted" placeholder="e.g. The Johnson Family"/></div>
      <div class="row">
        <div><label class="lbl">Date *</label><input id="c-date" type="date"/></div>
        <div><label class="lbl">Start Time</label><input id="c-time" type="time" value="18:00"/></div>
      </div>
      <div class="row">
        <div><label class="lbl">End Time</label><input id="c-endtime" type="time"/></div>
        <div><label class="lbl">Dress Code</label><input id="c-dress" placeholder="e.g. Black Tie"/></div>
      </div>

      <div class="grp">
        <label class="lbl">Venue / Location</label>
        <div class="chips" id="venue-chips">
          <button class="chip" onclick="pickChip(this,'c-location','venue-chips')">Shaare Zion</button>
          <button class="chip" onclick="pickChip(this,'c-location','venue-chips')">Kol Yaakab</button>
          <button class="chip" onclick="pickChip(this,'c-location','venue-chips')">SLC Congregation</button>
          <button class="chip" onclick="pickChip(this,'c-location','venue-chips')">Har Halebanon</button>
          <button class="chip" onclick="pickChip(this,'c-location','venue-chips')">Shevet Achim</button>
          <button class="chip" onclick="clearChipGroup('venue-chips');document.getElementById('c-location').value=''">✏️ Custom</button>
        </div>
        <input id="c-location" placeholder="Or type a custom address..."/>
      </div>

      <div class="grp">
        <label class="lbl">Personal Message</label>
        <div class="chips" id="msg-chips">
          <button class="chip" onclick="pickChip(this,'c-desc','msg-chips')">Joyful 💛</button>
          <button class="chip" onclick="pickChip(this,'c-desc','msg-chips')">Warm 🤍</button>
          <button class="chip" onclick="pickChip(this,'c-desc','msg-chips')">Formal 🎩</button>
          <button class="chip" onclick="pickChip(this,'c-desc','msg-chips')">Casual 🎉</button>
          <button class="chip" onclick="pickChip(this,'c-desc','msg-chips')">Heartfelt ❤️</button>
          <button class="chip" onclick="clearChipGroup('msg-chips');document.getElementById('c-desc').value=''">✏️ Custom</button>
        </div>
        <textarea id="c-desc" rows="3" placeholder="Choose a template or type your own..."></textarea>
      </div>
    </div>

    <div class="card">
      <div class="ct">Reminder Timing</div>
      <div class="chips" id="rem-chips">
        <button class="chip" data-mins="43200" onclick="toggleChip(this)">1 Month before</button>
        <button class="chip on" data-mins="10080" onclick="toggleChip(this)">1 Week before</button>
        <button class="chip" data-mins="4320" onclick="toggleChip(this)">3 Days before</button>
        <button class="chip" data-mins="2880" onclick="toggleChip(this)">2 Days before</button>
        <button class="chip on" data-mins="1440" onclick="toggleChip(this)">1 Day before</button>
        <button class="chip" data-mins="120" onclick="toggleChip(this)">2 Hours before</button>
      </div>
    </div>

    <button class="btn" onclick="generate()">✦ Generate Invitation ✦</button>

    <div id="c-results" style="display:none;margin-top:14px;">
      <div class="card" id="c-preview"></div>
      <div class="card">
        <div class="ct">Save to Calendar</div>
        <div style="border:1px solid var(--border);border-radius:4px;padding:14px;margin-bottom:10px;">
          <div style="font-weight:600;font-size:0.88rem;margin-bottom:3px;">📅 iPhone (.ics) <span style="color:var(--green);font-size:0.75rem;font-weight:400;">✓ All reminders included</span></div>
          <div style="font-size:0.76rem;color:var(--muted);margin-bottom:8px;">Download and open — saves to Apple Calendar with reminders.</div>
          <button class="bsm" onclick="dlICS()">⬇ Download .ics</button>
        </div>
        <div style="border:1px solid var(--border);border-radius:4px;padding:14px;">
          <div style="font-weight:600;font-size:0.88rem;margin-bottom:3px;">🔗 Android (Google Calendar)</div>
          <div style="font-size:0.76rem;color:var(--muted);margin-bottom:8px;">Opens Google Calendar to save the event.</div>
          <button class="bsm" onclick="openGoogle()">Open Google Calendar</button>
        </div>
      </div>
      </div>
      <div class="card">
        <div class="ct">📲 Your Calendar Links</div>

        <div style="margin-bottom:14px;">
          <div style="font-weight:700;font-size:0.85rem;margin-bottom:6px;">🤖 Android — Google Calendar</div>
          <textarea id="android-link" readonly rows="3" style="width:100%;padding:10px;border:1.5px solid var(--border);border-radius:4px;background:var(--cream);font-size:0.72rem;color:var(--warm);font-family:monospace;resize:none;box-sizing:border-box;"></textarea>
          <button onclick="copyField('android-link','android-copied')" style="width:100%;margin-top:6px;padding:12px;background:var(--warm);color:#f0ead8;border:none;border-radius:4px;font-size:0.88rem;font-family:inherit;font-weight:600;cursor:pointer;">📋 Copy Android Link</button>
          <div id="android-copied" style="display:none;margin-top:4px;padding:8px;background:#f0fff4;border:1px solid var(--green);border-radius:4px;color:var(--green);font-size:0.8rem;text-align:center;">✓ Copied! Paste into your WhatsApp message.</div>
        </div>

        <div style="margin-bottom:4px;">
          <div style="font-weight:700;font-size:0.85rem;margin-bottom:6px;">🍎 iPhone — Apple Calendar</div>
          <div style="font-size:0.78rem;color:var(--muted);margin-bottom:6px;">Person taps this link → iPhone opens Apple Calendar directly.</div>
          <textarea id="iphone-link" readonly rows="2" style="width:100%;padding:10px;border:1.5px solid var(--border);border-radius:4px;background:var(--cream);font-size:0.72rem;color:var(--warm);font-family:monospace;resize:none;box-sizing:border-box;word-break:break-all;"></textarea>
          <button onclick="copyField('iphone-link','iphone-copied')" style="width:100%;margin-top:6px;padding:12px;background:var(--warm);color:#f0ead8;border:none;border-radius:4px;font-size:0.88rem;font-family:inherit;font-weight:600;cursor:pointer;">📋 Copy iPhone Link</button>
          <div id="iphone-copied" style="display:none;margin-top:4px;padding:8px;background:#f0fff4;border:1px solid var(--green);border-radius:4px;color:var(--green);font-size:0.8rem;text-align:center;">✓ Copied! Paste into WhatsApp — they tap it to save to Apple Calendar.</div>
        </div>

        <div style="margin-top:12px;padding:10px 14px;background:#fff8e6;border:1px solid var(--gold);border-radius:4px;font-size:0.78rem;color:var(--warm);line-height:1.6;">
          💡 Copy each link and paste it separately into your WhatsApp or text message. The person taps it and their calendar opens automatically.
        </div>
      </div>

      <div class="card">
        <div class="ct">✉️ Invitation Message</div>
        <div class="note gold" style="margin-bottom:8px;">Tap to select all → press &amp; hold → Copy → paste into WhatsApp.</div>
        <textarea class="msg-ta" id="c-msg" readonly></textarea>
        <button class="sel-btn" onclick="selAll('c-msg')">👆 Tap to Select All → Copy</button>
      </div>
    </div>
  </div>

  <!-- ═══ SCAN TAB ═══ -->
  <div id="tab-scan" style="display:none;">
    <div class="card">
      <div class="ct">How to copy text from an invitation photo</div>
      <div style="border:1px solid var(--border);border-radius:6px;padding:14px;margin-bottom:10px;">
        <div style="font-weight:700;font-size:0.88rem;margin-bottom:6px;">🍎 iPhone</div>
        <div style="font-size:0.82rem;color:var(--muted);line-height:1.9;">
          1. Open the photo in <strong>Photos</strong><br/>
          2. Tap the <strong>✨ Live Text</strong> button (bottom right corner)<br/>
          3. Tap <strong>Select All → Copy</strong><br/>
          4. Come back here and paste below
        </div>
      </div>
      <div style="border:1px solid var(--border);border-radius:6px;padding:14px;margin-bottom:16px;">
        <div style="font-weight:700;font-size:0.88rem;margin-bottom:6px;">🤖 Android</div>
        <div style="font-size:0.82rem;color:var(--muted);line-height:1.9;">
          1. Open the photo in <strong>Google Photos</strong><br/>
          2. Tap the <strong>🔍 Lens</strong> icon<br/>
          3. Tap <strong>Select All → Copy</strong><br/>
          4. Come back here and paste below
        </div>
      </div>
      <label class="lbl">📋 Paste Invitation Text Here</label>
      <textarea id="s-text" rows="6" placeholder="Paste the invitation text here..." style="border:2px solid var(--gold);font-size:0.88rem;line-height:1.7;margin-bottom:10px;"></textarea>
      <div class="note red" id="s-err" style="display:none;"></div>
      <button class="btn" onclick="scanIt()">✨ Extract & Save to Calendar</button>
    </div>

    <div id="s-results" style="display:none;">
      <div class="card">
        <div class="ct">Confirm Details</div>
        <div class="chips" id="s-grid" style="margin-bottom:0;"></div>
        <div class="hr"></div>
        <div class="ct">Reminders</div>
        <div class="chips" id="s-rem-chips">
          <button class="chip" data-mins="43200" onclick="toggleChip(this)">1 Month before</button>
          <button class="chip on" data-mins="10080" onclick="toggleChip(this)">1 Week before</button>
          <button class="chip" data-mins="4320" onclick="toggleChip(this)">3 Days before</button>
          <button class="chip" data-mins="2880" onclick="toggleChip(this)">2 Days before</button>
          <button class="chip on" data-mins="1440" onclick="toggleChip(this)">1 Day before</button>
          <button class="chip" data-mins="120" onclick="toggleChip(this)">2 Hours before</button>
        </div>
        <div class="hr"></div>
        <div class="ct">Save to Calendar</div>
        <button class="bsm" onclick="sDlICS()">⬇ iPhone (.ics)</button>
        <button class="bsm" onclick="sOpenGoogle()">🔗 Android (Google)</button>
        <div style="font-size:0.75rem;color:var(--muted);margin-top:10px;line-height:1.6;">
          📱 <strong>iPhone:</strong> Download .ics → open → "Add to Calendar"<br/>
          🤖 <strong>Android:</strong> Tap Google link → save event
        </div>
      </div>
    </div>
  </div>

  <!-- FOOTER -->
  <div style="margin-top:40px;padding:24px 16px;background:#fffdf8;border-top:1px solid #ddd3bb;border-radius:8px;text-align:center;">

  <!-- Charity section -->
  <div style="background:#fff8e6;border:1px solid #b8922a;border-radius:8px;padding:20px 16px;margin-bottom:20px;">
    <div style="font-size:1.3rem;margin-bottom:6px;">🕍</div>
    <div style="font-family:Georgia,serif;font-size:1.1rem;font-weight:600;color:#3d2b0e;margin-bottom:8px;">Support Kol Yaakab</div>
    <div style="font-size:0.82rem;color:#8a7a62;line-height:1.7;margin-bottom:16px;">
      Kol Yaakab is a Torah institution dedicated to helping families who cannot afford yeshiva tuition. Every donation goes directly to ensuring that no child is turned away from a Jewish education due to financial hardship. Your generosity makes a real difference.
    </div>
    <a href="https://secure.cardknox.com/hkykolyaakab" target="_blank"
      style="display:block;padding:14px;background:#b8922a;color:white;border-radius:6px;text-decoration:none;font-weight:700;font-size:0.95rem;margin-bottom:10px;">
      ❤️ Donate to Kol Yaakab
    </a>
    <div style="font-size:0.75rem;color:#8a7a62;">Credit card accepted via secure payment link</div>
  </div>

  <!-- Developer credit -->
  <div style="font-size:0.78rem;color:#8a7a62;line-height:1.8;">
    <div style="font-family:Georgia,serif;font-size:0.9rem;color:#3d2b0e;margin-bottom:4px;">Developed by <strong>Dibo Jaradeh</strong></div>
    If this app saved you time, consider supporting Kol Yaakab above 🙏
  </div>
</div>

<script>
// ── Venues & Messages ─────────────────────────────────────
var VENUES = {
  'Shaare Zion':      'Congregation Shaare Zion, 2030 Ocean Pkwy, Brooklyn, NY 11223',
  'Kol Yaakab':       'Kol Yaakab, 1703 McDonald Ave, Brooklyn, NY 11230',
  'SLC Congregation': 'SLC Congregation, 805 Avenue T, Brooklyn, NY 11223',
  'Har Halebanon':    'Congregation Har Halebanon, 820 Ave. S, Brooklyn, NY 11223',
  'Shevet Achim':     'Congregation Shevet Achim, 704-708 Avenue T, Brooklyn, NY 11223'
};
var MSGS = {
  'Joyful 💛':   "We joyfully invite you to celebrate this special moment with us. Your presence would mean the world!",
  'Warm 🤍':     "With hearts full of joy, we warmly invite you to share in our celebration. We'd love to have you there!",
  'Formal 🎩':   "We cordially request the honor of your presence at this special occasion.",
  'Casual 🎉':   "Hey! We're throwing a celebration and it wouldn't be the same without you. Come join the fun! 🎉",
  'Heartfelt ❤️':"Some moments are only complete when shared with the people who matter most. You are one of those people ❤️"
};

// ── Init ──────────────────────────────────────────────────
window.onload = function() {
  var d = new Date();
  d.setDate(d.getDate() + 30);
  document.getElementById('c-date').value = d.toISOString().split('T')[0];
};

// ── Tabs ──────────────────────────────────────────────────
function showTab(name, btn) {
  document.getElementById('tab-create').style.display = name === 'create' ? '' : 'none';
  document.getElementById('tab-scan').style.display   = name === 'scan'   ? '' : 'none';
  var tabs = document.querySelectorAll('.tab');
  for (var i = 0; i < tabs.length; i++) tabs[i].classList.remove('active');
  btn.classList.add('active');
}

// ── Type picker ───────────────────────────────────────────
function pickType(btn) {
  var all = document.querySelectorAll('.tc');
  for (var i = 0; i < all.length; i++) all[i].classList.remove('on');
  btn.classList.add('on');
}

// ── Chip helpers ──────────────────────────────────────────
function clearChipGroup(groupId) {
  var chips = document.querySelectorAll('#' + groupId + ' .chip');
  for (var i = 0; i < chips.length; i++) chips[i].classList.remove('on');
}

function pickChip(btn, inputId, groupId) {
  clearChipGroup(groupId);
  btn.classList.add('on');
  var label = btn.textContent.trim();
  var val = VENUES[label] || MSGS[label] || label;
  document.getElementById(inputId).value = val;
}

function toggleChip(btn) {
  btn.classList.toggle('on');
}

function getRems(groupId) {
  var result = [];
  var chips = document.querySelectorAll('#' + groupId + ' .chip.on');
  for (var i = 0; i < chips.length; i++) {
    result.push(parseInt(chips[i].getAttribute('data-mins')));
  }
  return result;
}

// ── Date / Time helpers ───────────────────────────────────
function pad(n) { return String(n).padStart(2, '0'); }

function toICSDate(dateStr, timeStr) {
  if (!dateStr) return '';
  var dp = dateStr.split('-');
  var tp = (timeStr || '00:00').split(':');
  return dp[0] + pad(dp[1]) + pad(dp[2]) + 'T' + pad(tp[0]) + pad(tp[1]) + '00';
}

function addHours(dateStr, timeStr, hrs) {
  var dp = dateStr.split('-');
  var tp = (timeStr || '18:00').split(':');
  var h = parseInt(tp[0]) + hrs;
  var days = Math.floor(h / 24);
  h = h % 24;
  var day = parseInt(dp[2]) + days;
  return dp[0] + pad(dp[1]) + pad(String(day)) + 'T' + pad(String(h)) + pad(tp[1]) + '00';
}

function fmtDate(ds) {
  if (!ds) return '—';
  var p = ds.split('-');
  var mn = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  return mn[parseInt(p[1]) - 1] + ' ' + parseInt(p[2]) + ', ' + p[0];
}

function fmtTime(ts) {
  if (!ts) return '—';
  var p = ts.split(':');
  var h = parseInt(p[0]);
  var ap = h >= 12 ? 'PM' : 'AM';
  var h12 = h % 12 || 12;
  return h12 + ':' + p[1] + ' ' + ap;
}

// ── ICS builder ───────────────────────────────────────────
function buildICS(f, rems) {
  var startDT = toICSDate(f.date, f.time);
  // Only use endTime if it is actually after startTime
  var useEndTime = f.endTime && f.endTime > f.time;
  var endDT = useEndTime ? toICSDate(f.date, f.endTime) : addHours(f.date, f.time, 3);
  var descParts = [];
  if (f.desc) descParts.push(f.desc);
  if (f.dress) descParts.push('Dress Code: ' + f.dress);
  if (f.hosted) descParts.push('Hosted by: ' + f.hosted);
  var desc = descParts.join('\\n');
  var lines = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//EventLink//EN',
    'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    'UID:' + Date.now() + '@eventlink',
    'DTSTAMP:' + new Date().toISOString().replace(/[-:]/g,'').split('.')[0] + 'Z',
    'DTSTART:' + startDT,
    'DTEND:' + endDT,
    'SUMMARY:' + f.name,
    'LOCATION:' + (f.location || ''),
    'DESCRIPTION:' + desc
  ];
  for (var i = 0; i < rems.length; i++) {
    var mins = rems[i];
    var trigger = (mins >= 1440 && mins % 1440 === 0) ? '-P' + (mins/1440) + 'D' : '-PT' + mins + 'M';
    lines.push('BEGIN:VALARM');
    lines.push('ACTION:DISPLAY');
    lines.push('DESCRIPTION:Reminder: ' + f.name);
    lines.push('TRIGGER:' + trigger);
    lines.push('END:VALARM');
  }
  lines.push('END:VEVENT');
  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

function buildGoogleUrl(f, rems) {
  var startDT = toICSDate(f.date, f.time);
  // Only use endTime if it is actually after startTime
  var useEndTime = f.endTime && f.endTime > f.time;
  var endDT = useEndTime ? toICSDate(f.date, f.endTime) : addHours(f.date, f.time, 3);
  var lm = {120:'2 hours',1440:'1 day',2880:'2 days',4320:'3 days',10080:'1 week',43200:'1 month'};
  var remLabels = [];
  for (var i = 0; i < rems.length; i++) remLabels.push(lm[rems[i]] || rems[i] + 'min');
  var descParts = [];
  if (f.desc) descParts.push(f.desc);
  if (f.dress) descParts.push('Dress Code: ' + f.dress);
  if (f.hosted) descParts.push('Hosted by: ' + f.hosted);
  if (remLabels.length) descParts.push('\n⏰ Reminders: ' + remLabels.join(', ') + ' before');
  var p = new URLSearchParams({
    action: 'TEMPLATE', text: f.name,
    dates: startDT + '/' + endDT,
    location: f.location || '',
    details: descParts.join('\n')
  });
  return 'https://calendar.google.com/calendar/render?' + p.toString();
}

function doDownload(f, rems) {
  var ics = buildICS(f, rems);
  var blob = new Blob([ics], {type: 'text/calendar;charset=utf-8'});
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.style.display = 'none';
  a.href = url;
  a.download = (f.name || 'event').replace(/\s+/g, '-') + '.ics';
  document.body.appendChild(a);
  a.click();
  setTimeout(function() {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 1000);
}

// ── Select All ────────────────────────────────────────────
function downloadICSForIphone() {
  if (!window._icsContent) return;
  var blob = new Blob([window._icsContent], {type: 'text/calendar;charset=utf-8'});
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.style.display = 'none';
  a.href = url;
  a.download = window._icsName || 'event.ics';
  document.body.appendChild(a);
  a.click();
  setTimeout(function() {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 1000);
  var flash = document.getElementById('iphone-copied');
  if (flash) { flash.style.display = ''; setTimeout(function(){ flash.style.display='none'; }, 4000); }
}

function copyField(id, flashId) {
  var ta = document.getElementById(id);
  var text = ta.value;
  var flash = document.getElementById(flashId);

  // Method 1: modern clipboard API
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(function() {
      flash.textContent = '✓ Copied! Paste into WhatsApp or SMS.';
      flash.style.display = '';
      setTimeout(function(){ flash.style.display = 'none'; }, 3000);
    }).catch(function() {
      // fallback
      ta.focus(); ta.select(); ta.setSelectionRange(0, 99999);
      var ok = false;
      try { ok = document.execCommand('copy'); } catch(e) {}
      flash.textContent = ok ? '✓ Copied! Paste into WhatsApp.' : '👆 Press & hold the text above → Copy';
      flash.style.display = '';
      setTimeout(function(){ flash.style.display = 'none'; }, 4000);
    });
    return;
  }

  // Method 2: execCommand
  ta.focus(); ta.select(); ta.setSelectionRange(0, 99999);
  var ok = false;
  try { ok = document.execCommand('copy'); } catch(e) {}
  flash.textContent = ok ? '✓ Copied! Paste into WhatsApp.' : '👆 Press & hold the text above → Copy';
  flash.style.display = '';
  setTimeout(function(){ flash.style.display = 'none'; }, 4000);
}

function selAll(id) {
  var ta = document.getElementById(id);
  ta.focus();
  ta.select();
  ta.setSelectionRange(0, 99999);
  try { navigator.clipboard.writeText(ta.value); } catch(e) {}
}

// ── CREATE ────────────────────────────────────────────────
var cFields = null;

function generate() {
  var name = document.getElementById('c-name').value.trim();
  var date = document.getElementById('c-date').value;
  if (!name || !date) { alert('Please enter Event Name and Date.'); return; }

  cFields = {
    name:     name,
    date:     date,
    time:     document.getElementById('c-time').value,
    endTime:  document.getElementById('c-endtime').value,
    location: document.getElementById('c-location').value.trim(),
    hosted:   document.getElementById('c-hosted').value.trim(),
    dress:    document.getElementById('c-dress').value.trim(),
    desc:     document.getElementById('c-desc').value.trim()
  };

  var typeBtn = document.querySelector('.tc.on');
  var typeLabel = typeBtn ? typeBtn.textContent.trim() : 'Event';

  document.getElementById('c-preview').innerHTML =
    '<div style="text-align:center;">' +
    '<div style="display:inline-block;border:1px solid var(--gold);color:var(--gold);font-size:0.68rem;letter-spacing:0.1em;text-transform:uppercase;padding:3px 12px;border-radius:2px;margin-bottom:10px;">' + typeLabel + '</div>' +
    '<div style="font-family:Georgia,serif;font-size:1.6rem;font-weight:300;font-style:italic;margin-bottom:4px;">' + name + '</div>' +
    (cFields.hosted ? '<div style="color:var(--muted);font-size:0.82rem;margin-bottom:10px;">Hosted by ' + cFields.hosted + '</div>' : '') +
    '<div style="height:1px;background:var(--border);margin:10px 0;"></div>' +
    '<div style="display:flex;justify-content:center;gap:18px;flex-wrap:wrap;font-size:0.88rem;">' +
    '<div><div style="font-size:0.6rem;letter-spacing:0.1em;text-transform:uppercase;color:var(--muted);">Date</div>' + fmtDate(date) + '</div>' +
    '<div><div style="font-size:0.6rem;letter-spacing:0.1em;text-transform:uppercase;color:var(--muted);">Time</div>' + fmtTime(cFields.time) + (cFields.endTime && cFields.endTime > cFields.time ? ' – ' + fmtTime(cFields.endTime) : '') + '</div>' +
    (cFields.location ? '<div><div style="font-size:0.6rem;letter-spacing:0.1em;text-transform:uppercase;color:var(--muted);">Location</div>' + cFields.location + '</div>' : '') +
    (cFields.dress ? '<div><div style="font-size:0.6rem;letter-spacing:0.1em;text-transform:uppercase;color:var(--muted);">Dress Code</div>' + cFields.dress + '</div>' : '') +
    '</div>' +
    (cFields.desc ? '<div style="margin-top:10px;font-size:0.83rem;color:var(--muted);font-style:italic;">' + cFields.desc + '</div>' : '') +
    '</div>';

  var rems = getRems('rem-chips');
  var lm = {120:'2 hours',1440:'1 day',2880:'2 days',4320:'3 days',10080:'1 week',43200:'1 month'};
  var remLabels = [];
  for (var i = 0; i < rems.length; i++) remLabels.push(lm[rems[i]] || rems[i] + 'min');
  var googleUrl = buildGoogleUrl(cFields, rems);
  var emoji = typeLabel.indexOf('Wedding') >= 0 ? '💍' : '🎉';

  var msg = emoji + " You're invited to " + name + "!\n";
  if (cFields.hosted) msg += "Hosted by " + cFields.hosted + "\n";
  msg += "\n📅 " + fmtDate(date) + " at " + fmtTime(cFields.time);
  if (cFields.endTime) msg += " – " + fmtTime(cFields.endTime);
  msg += "\n📍 " + (cFields.location || 'Location TBD');
  if (cFields.dress) msg += "\n👗 Dress Code: " + cFields.dress;
  if (cFields.desc) msg += "\n\n" + cFields.desc;
  if (remLabels.length) msg += "\n\n🔔 Reminders: " + remLabels.join(', ') + " before";
  msg += "\n\nSee you there! 🥂";
  msg += "\n\n📲 Save to your calendar:";
  msg += "\n🤖 Android: " + googleUrl;
  // iPhone: build a real server URL that returns the .ics file
  var rems = getRems('rem-chips');
  var iphoneParams = new URLSearchParams({
    name:      cFields.name,
    date:      cFields.date,
    time:      cFields.time,
    endtime:   cFields.endTime,
    location:  cFields.location,
    hosted:    cFields.hosted,
    dress:     cFields.dress,
    desc:      cFields.desc,
    reminders: rems.join(',')
  });
  var iphoneUrl = 'https://eventlink-1h1t.onrender.com/cal?' + iphoneParams.toString();

  document.getElementById('android-link').value = googleUrl;
  document.getElementById('iphone-link').value = iphoneUrl;

  msg += "\n🍎 iPhone link & 🤖 Android link below ↓";

  document.getElementById('c-msg').value = msg;

  document.getElementById('c-results').style.display = '';
  setTimeout(function() { document.getElementById('c-results').scrollIntoView({behavior:'smooth'}); }, 100);
}

function dlICS() {
  if (!cFields) return;
  doDownload(cFields, getRems('rem-chips'));
}

function openGoogle() {
  if (!cFields) return;
  window.open(buildGoogleUrl(cFields, getRems('rem-chips')), '_blank');
}

// ── SCAN ──────────────────────────────────────────────────
var sFields = null;

function scanIt() {
  var text = document.getElementById('s-text').value.trim();
  var err = document.getElementById('s-err');
  err.style.display = 'none';
  if (!text) { err.textContent = 'Please paste the invitation text first.'; err.style.display = ''; return; }
  sFields = parseInvite(text);
  showScan(sFields);
}

function parseInvite(t) {
  var MONTHS = {january:1,february:2,march:3,april:4,may:5,june:6,july:7,august:8,
    september:9,october:10,november:11,december:12,
    jan:1,feb:2,mar:3,apr:4,jun:6,jul:7,aug:8,sep:9,oct:10,nov:11,dec:12};

  var name = 'Event';
  if (/brit.milah/i.test(t))    name = 'Brit Milah';
  else if (/bar.mitzvah/i.test(t)) name = 'Bar Mitzvah';
  else if (/bat.mitzvah/i.test(t)) name = 'Bat Mitzvah';
  else if (/wedding/i.test(t))  name = 'Wedding';
  else if (/birthday/i.test(t)) name = 'Birthday';
  else if (/fundraiser/i.test(t)) name = 'Fundraiser';
  else if (/gala/i.test(t))     name = 'Gala';
  else if (/party|celebration/i.test(t)) name = 'Celebration';

  var date = '';
  var dm = t.match(/([A-Za-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?[,\s]+(\d{4})/i) ||
            t.match(/([A-Za-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?/i);
  if (dm) {
    var mo = MONTHS[dm[1].toLowerCase()];
    if (mo) {
      var yr = dm[3] ? parseInt(dm[3]) : new Date().getFullYear();
      date = yr + '-' + pad(mo) + '-' + pad(parseInt(dm[2]));
    }
  }

  var time = '';
  var tm = t.match(/(\d{1,2})(?::(\d{2}))?\s*(a\.?m\.?|p\.?m\.?)/i);
  if (tm) {
    var h = parseInt(tm[1]);
    var m = tm[2] ? parseInt(tm[2]) : 0;
    var ap = tm[3].replace(/\./g,'').toLowerCase();
    if (ap === 'pm' && h < 12) h += 12;
    if (ap === 'am' && h === 12) h = 0;
    time = pad(h) + ':' + pad(m);
  }

  var location = '';
  var lm2 = t.match(/\d+\s+[A-Za-z0-9\s\.]+(?:street|st|avenue|ave|blvd|road|rd|drive|dr|place|pl|way|court|ct)[^\n]*/i);
  if (lm2) location = lm2[0].trim();

  var hosted = '';
  var hm = t.match(/([A-Z][a-z]+\s+(?:&|and)\s+[A-Z][a-z]+\s+[A-Z][a-z]+)/);
  if (hm) hosted = hm[1].trim();

  var dress = '';
  var drm = t.match(/dress.code[:\s]+([^\n]+)/i) || t.match(/(black.tie|white.tie|formal|cocktail)/i);
  if (drm) dress = drm[1].trim();

  return {name:name, date:date, time:time, endTime:'', location:location, hosted:hosted, dress:dress, desc:''};
}

function showScan(p) {
  var grid = document.getElementById('s-grid');
  grid.innerHTML = '';
  var items = [['Event',p.name],['Date',fmtDate(p.date)],['Time',fmtTime(p.time)],
               ['Location',p.location||'—'],['Hosted By',p.hosted||'—'],['Dress Code',p.dress||'—']];
  for (var i = 0; i < items.length; i++) {
    var div = document.createElement('div');
    div.className = 'ri';
    div.innerHTML = '<span class="rl">' + items[i][0] + '</span><span class="rv">' + items[i][1] + '</span>';
    grid.appendChild(div);
  }
  document.getElementById('s-results').style.display = '';
  setTimeout(function() { document.getElementById('s-results').scrollIntoView({behavior:'smooth'}); }, 100);
}

function sDlICS() {
  if (!sFields) return;
  doDownload(sFields, getRems('s-rem-chips'));
}

function sOpenGoogle() {
  if (!sFields) return;
  window.open(buildGoogleUrl(sFields, getRems('s-rem-chips')), '_blank');
}
</script>
</body>
</html>
`;

const server = http.createServer(function(req, res) {
  var parsed = url.parse(req.url, true);

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

  if (req.method === 'OPTIONS') {
    res.writeHead(200); res.end(); return;
  }

  // Serve the app at root
  if (parsed.pathname === '/' || parsed.pathname === '') {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.writeHead(200);
    res.end(HTML);
    return;
  }

  // Serve ICS file
  if (parsed.pathname === '/cal') {
    var ics = buildICS(parsed.query);
    var filename = (parsed.query.name || 'event').replace(/\s+/g, '-') + '.ics';
    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="' + filename + '"');
    res.writeHead(200);
    res.end(ics);
    return;
  }

  if (parsed.pathname === '/health') {
    res.writeHead(200); res.end('OK'); return;
  }

  res.writeHead(404); res.end('Not found');
});

var PORT = process.env.PORT || 3000;
server.listen(PORT, function() {
  console.log('EventLink running on port ' + PORT);
});



