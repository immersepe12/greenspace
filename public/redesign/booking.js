/* GreenSpace Herbs — Appointment Booking → WhatsApp
   A self-contained modal that collects a client's name, a date (custom pop-out
   calendar) and a time (IST slot picker), then hands off to the sales team via a
   PREFILLED WhatsApp message to +91 97311 79546 (wa.me deep link — opens the app
   on mobile, WhatsApp Web/desktop otherwise).

   Trigger from ANY element: add data-gs-book, class "gs-book-btn", or an anchor
   with href="#book"/"#book-appointment"; or call window.gsBook() directly.
   Rendered in a Shadow DOM so it looks identical on every page, isolated from
   both the redesigned CSS and the old-capture WordPress CSS. */
(function () {
  "use strict";
  if (window.__gsBooking) return;
  window.__gsBooking = true;
  try { if (window.self !== window.top) return; } catch (e) { return; }

  var WA = "919731179546";                 // sales WhatsApp (+91 97311 79546)
  var WA_DISPLAY = "+91 97311 79546";
  var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;

  var MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  var MON = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  var WD = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
  var DOW = ["S","M","T","W","T","F","S"];

  var host, root, overlay, nameEl, dateBtn, timeBtn, topicEl, confirmA, calWrap, timeWrap, errEl;
  var today = new Date(); today.setHours(0, 0, 0, 0);
  var maxDate = new Date(today.getTime()); maxDate.setDate(maxDate.getDate() + 120);
  var view = new Date(today.getFullYear(), today.getMonth(), 1);
  var selDate = null, selTime = null;

  // time slots 09:00–18:30 IST, half-hour
  var SLOTS = [];
  for (var h = 9; h <= 18; h++) { SLOTS.push(h * 60); if (h < 18) SLOTS.push(h * 60 + 30); }
  SLOTS.push(18 * 60 + 30);
  function slotLabel(mins) {
    var h = Math.floor(mins / 60), m = mins % 60, ap = h < 12 ? "AM" : "PM", hh = h % 12 || 12;
    return hh + ":" + (m < 10 ? "0" + m : m) + " " + ap;
  }

  var STYLE = "\
:host{all:initial}\
*{box-sizing:border-box;margin:0;padding:0;font-family:'Poppins',ui-sans-serif,system-ui,-apple-system,'Segoe UI',Roboto,sans-serif}\
.mono{font-family:'IBM Plex Mono',ui-monospace,'SF Mono',Menlo,Consolas,monospace}\
.ov{position:fixed;inset:0;z-index:2147483040;display:none;overflow-y:auto;padding:18px;\
  background:rgba(3,14,9,.74);backdrop-filter:blur(6px)}\
.ov.open{display:flex;animation:fade .28s ease}\
.card{position:relative;margin:auto;width:412px;max-width:100%;overflow:visible;display:flex;flex-direction:column;\
  border-radius:20px;border:1px solid rgba(227,191,112,.34);color:#fff7ea;\
  background:linear-gradient(168deg,rgba(9,44,30,.99),rgba(6,26,18,.995));\
  box-shadow:0 40px 100px rgba(0,0,0,.55),inset 0 1px 0 rgba(227,191,112,.14)}\
.ov.open .card{animation:pop .4s cubic-bezier(.2,.9,.25,1)}\
.card::before{content:'';position:absolute;inset:0;pointer-events:none;border-radius:20px;z-index:6;\
  background:\
   linear-gradient(rgba(227,191,112,.55) 0 0) 12px 12px/16px 1px no-repeat,\
   linear-gradient(rgba(227,191,112,.55) 0 0) 12px 12px/1px 16px no-repeat,\
   linear-gradient(rgba(227,191,112,.55) 0 0) right 12px top 12px/16px 1px no-repeat,\
   linear-gradient(rgba(227,191,112,.55) 0 0) right 12px top 12px/1px 16px no-repeat,\
   linear-gradient(rgba(227,191,112,.55) 0 0) 12px bottom 12px/16px 1px no-repeat,\
   linear-gradient(rgba(227,191,112,.55) 0 0) 12px bottom 12px/1px 16px no-repeat,\
   linear-gradient(rgba(227,191,112,.55) 0 0) right 12px bottom 12px/16px 1px no-repeat,\
   linear-gradient(rgba(227,191,112,.55) 0 0) right 12px bottom 12px/1px 16px no-repeat}\
.hd{display:flex;align-items:center;gap:12px;padding:18px 18px 14px}\
.hd .atom{width:34px;height:34px;color:#e3bf70;flex:0 0 auto}\
.hd .tt{flex:1;min-width:0}\
.hd h3{font-size:14px;letter-spacing:.18em;text-transform:uppercase;color:#f4e6c4;font-weight:600}\
.hd p{font-size:11.5px;color:rgba(255,247,234,.6);margin-top:3px}\
.x{width:30px;height:30px;flex:0 0 auto;border-radius:8px;border:1px solid rgba(227,191,112,.28);background:transparent;\
  color:#e3bf70;cursor:pointer;font-size:15px;display:grid;place-items:center;transition:.2s}\
.x:hover{background:rgba(227,191,112,.14);color:#fff}\
.bd{padding:4px 18px 6px;position:relative;z-index:2;display:flex;flex-direction:column;gap:14px}\
.f{display:flex;flex-direction:column;gap:6px;position:relative}\
.f>label{font-size:10px;letter-spacing:.16em;text-transform:uppercase;color:rgba(227,191,112,.85)}\
.f .req{color:#e3bf70}\
.ipt{width:100%;background:rgba(3,18,12,.6);border:1px solid rgba(227,191,112,.3);border-radius:11px;\
  padding:12px 13px;color:#fff7ea;font-size:14px;outline:0;transition:.2s;text-align:left;cursor:text}\
.ipt::placeholder{color:rgba(255,247,234,.38)}\
.ipt:focus,.ipt.on{border-color:rgba(227,191,112,.7);box-shadow:0 0 0 3px rgba(227,191,112,.1)}\
button.ipt{cursor:pointer;display:flex;align-items:center;justify-content:space-between;gap:8px}\
button.ipt .ph{color:rgba(255,247,234,.5)}\
button.ipt .val{color:#fff7ea}\
button.ipt svg{width:17px;height:17px;color:#e3bf70;flex:0 0 auto}\
.two{display:grid;grid-template-columns:1fr 1fr;gap:12px}\
.err{border-color:#e08a6a!important}\
.errmsg{font-size:11px;color:#f0a488;min-height:0}\
\
/* pop-out */\
.pop{position:absolute;top:100%;left:0;right:0;margin-top:8px;z-index:30;display:none;\
  background:linear-gradient(168deg,rgba(11,50,34,.99),rgba(5,24,16,.995));\
  border:1px solid rgba(227,191,112,.4);border-radius:14px;padding:12px;\
  box-shadow:0 26px 60px rgba(0,0,0,.5)}\
.pop.open{display:block;animation:drop .2s ease}\
.calhd{display:flex;align-items:center;justify-content:space-between;margin-bottom:9px}\
.calhd .mlabel{font-size:12.5px;letter-spacing:.08em;color:#f4e6c4;font-weight:600}\
.nav{width:30px;height:30px;border-radius:8px;border:1px solid rgba(227,191,112,.3);background:transparent;color:#e3bf70;\
  cursor:pointer;display:grid;place-items:center;transition:.18s}\
.nav:hover:not(:disabled){background:rgba(227,191,112,.15)}\
.nav:disabled{opacity:.28;cursor:default}\
.nav svg{width:15px;height:15px}\
.dow{display:grid;grid-template-columns:repeat(7,1fr);margin-bottom:4px}\
.dow span{text-align:center;font-size:9.5px;letter-spacing:.06em;color:rgba(227,191,112,.6);padding:4px 0}\
.days{display:grid;grid-template-columns:repeat(7,1fr);gap:3px}\
.day{aspect-ratio:1;border:0;background:transparent;color:#eadfc9;font-size:12.5px;border-radius:8px;cursor:pointer;\
  display:grid;place-items:center;transition:.14s;position:relative}\
.day:hover:not(:disabled):not(.sel){background:rgba(227,191,112,.16)}\
.day:disabled{color:rgba(255,247,234,.2);cursor:default}\
.day.today{box-shadow:inset 0 0 0 1px rgba(227,191,112,.5)}\
.day.sel{background:linear-gradient(135deg,#e3bf70,#c2912f);color:#15280f;font-weight:600}\
.day.blank{visibility:hidden}\
.tzn{margin-top:9px;font-size:9.5px;letter-spacing:.1em;color:rgba(227,191,112,.55);text-align:center}\
.slots{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;max-height:200px;overflow-y:auto;\
  scrollbar-width:thin;scrollbar-color:rgba(227,191,112,.35) transparent}\
.slots::-webkit-scrollbar{width:6px}.slots::-webkit-scrollbar-thumb{background:rgba(227,191,112,.3);border-radius:8px}\
.slot{border:1px solid rgba(227,191,112,.24);background:rgba(227,191,112,.05);color:#eadfc9;font-size:12px;\
  padding:8px 4px;border-radius:8px;cursor:pointer;transition:.14s}\
.slot:hover{background:rgba(227,191,112,.16)}\
.slot.sel{background:linear-gradient(135deg,#e3bf70,#c2912f);color:#15280f;font-weight:600;border-color:transparent}\
\
.ft{padding:8px 18px 18px;position:relative;z-index:1;display:flex;flex-direction:column;gap:10px}\
.go{display:flex;align-items:center;justify-content:center;gap:9px;width:100%;text-decoration:none;cursor:pointer;\
  background:linear-gradient(135deg,#37b24d,#1f9d40);color:#04240f;font-weight:600;font-size:14.5px;letter-spacing:.01em;\
  padding:14px;border:0;border-radius:12px;transition:.18s;box-shadow:0 12px 30px rgba(31,157,64,.3)}\
.go:hover{filter:brightness(1.06)}\
.go svg{width:20px;height:20px}\
.note{text-align:center;font-size:10.5px;color:rgba(255,247,234,.45);line-height:1.5}\
.note b{color:rgba(227,191,112,.85);font-weight:600}\
\
@media (max-width:460px){.card{width:100%}.two{grid-template-columns:1fr}}\
@keyframes fade{from{opacity:0}to{opacity:1}}\
@keyframes pop{from{opacity:0;transform:translateY(16px) scale(.95)}to{opacity:1;transform:none}}\
@keyframes drop{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:none}}\
" + (reduce ? ".ov.open,.ov.open .card,.pop.open{animation:none}" : "");

  function atomSVG() {
    return "<svg class='atom' viewBox='0 0 48 48' fill='none' stroke='currentColor' stroke-width='1.5'>"
      + "<circle cx='24' cy='24' r='3.2' fill='currentColor' stroke='none'/>"
      + "<ellipse cx='24' cy='24' rx='20' ry='7.5'/>"
      + "<ellipse cx='24' cy='24' rx='20' ry='7.5' transform='rotate(60 24 24)'/>"
      + "<ellipse cx='24' cy='24' rx='20' ry='7.5' transform='rotate(120 24 24)'/></svg>";
  }
  var CAL_ICON = "<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='1.8' stroke-linecap='round'><rect x='3' y='4.5' width='18' height='16' rx='2.5'/><path d='M3 9h18M8 2.5v4M16 2.5v4'/></svg>";
  var CLK_ICON = "<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='1.8' stroke-linecap='round'><circle cx='12' cy='12' r='9'/><path d='M12 7.5V12l3 2'/></svg>";
  var WA_ICON = "<svg viewBox='0 0 24 24' fill='currentColor'><path d='M17.5 14.4c-.3-.15-1.8-.9-2.06-1-.28-.1-.48-.15-.68.15s-.78.98-.96 1.18c-.17.2-.35.22-.65.07a8.3 8.3 0 0 1-2.44-1.5 9.2 9.2 0 0 1-1.7-2.1c-.17-.3 0-.46.13-.6.13-.14.3-.35.44-.53.14-.18.19-.3.29-.5.1-.2.05-.38-.02-.53-.08-.15-.68-1.64-.93-2.24-.24-.58-.49-.5-.68-.51h-.58c-.2 0-.53.08-.8.38-.28.3-1.05 1.03-1.05 2.5s1.07 2.9 1.22 3.1c.15.2 2.1 3.2 5.1 4.49.71.3 1.27.49 1.7.63.72.23 1.37.2 1.88.12.58-.09 1.8-.74 2.05-1.45.25-.7.25-1.31.18-1.44-.07-.13-.27-.2-.57-.35z'/><path d='M12 2a10 10 0 0 0-8.6 15.06L2 22l5.06-1.33A10 10 0 1 0 12 2zm0 18.2c-1.5 0-2.97-.4-4.25-1.16l-.3-.18-3 .79.8-2.93-.2-.31A8.2 8.2 0 1 1 12 20.2z'/></svg>";

  function mount() {
    if (host) return;
    host = document.createElement("div");
    host.id = "gs-booking-host";
    document.body.appendChild(host);
    root = host.attachShadow({ mode: "open" });
    var style = document.createElement("style"); style.textContent = STYLE; root.appendChild(style);

    overlay = document.createElement("div");
    overlay.className = "ov";
    overlay.innerHTML =
      "<div class='card' role='dialog' aria-modal='true' aria-label='Book an appointment'>"
      + "<div class='hd'>" + atomSVG()
      +   "<div class='tt'><h3 class='mono'>Book an Appointment</h3><p>Pick a time — we'll continue on WhatsApp with our sales team.</p></div>"
      +   "<button class='x' aria-label='Close'>✕</button></div>"
      + "<div class='bd'>"
      +   "<div class='f'><label>Your name <span class='req'>*</span></label>"
      +     "<input class='ipt nm' type='text' autocomplete='name' placeholder='e.g. Priya Sharma' aria-label='Your name'></div>"
      +   "<div class='two'>"
      +     "<div class='f'><label>Date <span class='req'>*</span></label>"
      +       "<button type='button' class='ipt db' aria-haspopup='dialog' aria-expanded='false'><span class='ph'>Select date</span>" + CAL_ICON + "</button>"
      +       "<div class='pop cal'></div></div>"
      +     "<div class='f'><label>Time (IST) <span class='req'>*</span></label>"
      +       "<button type='button' class='ipt tb' aria-haspopup='dialog' aria-expanded='false'><span class='ph'>Select time</span>" + CLK_ICON + "</button>"
      +       "<div class='pop tim'><div class='slots'></div><div class='tzn mono'>Times shown in IST (India)</div></div></div>"
      +   "</div>"
      +   "<div class='f'><label>Topic <span style='color:rgba(255,247,234,.4)'>(optional)</span></label>"
      +     "<input class='ipt tp' type='text' placeholder='e.g. CurcuminQA™ samples, partnership…' aria-label='Topic'></div>"
      +   "<div class='errmsg mono'></div>"
      + "</div>"
      + "<div class='ft'>"
      +   "<a class='go' target='_blank' rel='noopener' href='#'>" + WA_ICON + "Confirm on WhatsApp</a>"
      +   "<div class='note'>You'll be handed to our sales team on WhatsApp <b>" + WA_DISPLAY + "</b> with your details prefilled.</div>"
      + "</div></div>";
    root.appendChild(overlay);

    nameEl = q(".nm"); dateBtn = q(".db"); timeBtn = q(".tb"); topicEl = q(".tp");
    confirmA = q(".go"); calWrap = q(".cal"); timeWrap = q(".tim"); errEl = q(".errmsg");

    q(".x").addEventListener("click", close);
    overlay.addEventListener("mousedown", function (e) { if (e.target === overlay) close(); });
    dateBtn.addEventListener("click", function (e) { e.stopPropagation(); togglePop(calWrap, dateBtn); });
    timeBtn.addEventListener("click", function (e) { e.stopPropagation(); togglePop(timeWrap, timeBtn); });
    overlay.addEventListener("click", function () { closePops(); });
    [calWrap, timeWrap].forEach(function (p) { p.addEventListener("click", function (e) { e.stopPropagation(); }); });
    nameEl.addEventListener("input", updateLink);
    topicEl.addEventListener("input", updateLink);
    confirmA.addEventListener("click", onConfirm);
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && overlay.classList.contains("open")) close(); });

    buildSlots();
    renderCal();
    function q(s) { return overlay.querySelector(s); }
  }

  // ---------- calendar ----------
  function renderCal() {
    var y = view.getFullYear(), m = view.getMonth();
    var first = new Date(y, m, 1).getDay();
    var days = new Date(y, m + 1, 0).getDate();
    var prevDisabled = (y === today.getFullYear() && m === today.getMonth());
    var nextLimit = new Date(maxDate.getFullYear(), maxDate.getMonth(), 1);
    var nextDisabled = (y === nextLimit.getFullYear() && m === nextLimit.getMonth());

    var html = "<div class='calhd'>"
      + "<button class='nav pv' " + (prevDisabled ? "disabled" : "") + " aria-label='Previous month'><svg viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round'><path d='m15 6-6 6 6 6'/></svg></button>"
      + "<span class='mlabel'>" + MONTHS[m] + " " + y + "</span>"
      + "<button class='nav nx' " + (nextDisabled ? "disabled" : "") + " aria-label='Next month'><svg viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round'><path d='m9 6 6 6-6 6'/></svg></button>"
      + "</div><div class='dow'>";
    for (var d = 0; d < 7; d++) html += "<span>" + DOW[d] + "</span>";
    html += "</div><div class='days'>";
    for (var b = 0; b < first; b++) html += "<button class='day blank' disabled tabindex='-1'></button>";
    for (var day = 1; day <= days; day++) {
      var dt = new Date(y, m, day);
      var dis = dt < today || dt > maxDate;
      var isToday = dt.getTime() === today.getTime();
      var isSel = selDate && dt.getTime() === selDate.getTime();
      html += "<button class='day" + (isToday ? " today" : "") + (isSel ? " sel" : "") + "' data-day='" + day + "'"
        + (dis ? " disabled" : "") + ">" + day + "</button>";
    }
    html += "</div><div class='tzn mono'>Appointments Mon–Sat</div>";
    calWrap.innerHTML = html;

    calWrap.querySelector(".pv").addEventListener("click", function (e) { e.stopPropagation(); view = new Date(y, m - 1, 1); renderCal(); });
    calWrap.querySelector(".nx").addEventListener("click", function (e) { e.stopPropagation(); view = new Date(y, m + 1, 1); renderCal(); });
    [].forEach.call(calWrap.querySelectorAll(".day[data-day]"), function (btn) {
      btn.addEventListener("click", function (e) {
        e.stopPropagation();
        selDate = new Date(y, m, +btn.getAttribute("data-day"));
        dateBtn.classList.add("on"); dateBtn.classList.remove("err");
        dateBtn.querySelector("span").className = "val";
        dateBtn.querySelector("span").textContent = fmtDate(selDate);
        renderCal(); closePops(); updateLink(); clearErr();
      });
    });
  }

  function buildSlots() {
    var box = timeWrap.querySelector(".slots"), html = "";
    for (var i = 0; i < SLOTS.length; i++) html += "<button class='slot' data-m='" + SLOTS[i] + "'>" + slotLabel(SLOTS[i]) + "</button>";
    box.innerHTML = html;
    [].forEach.call(box.querySelectorAll(".slot"), function (btn) {
      btn.addEventListener("click", function (e) {
        e.stopPropagation();
        selTime = slotLabel(+btn.getAttribute("data-m"));
        [].forEach.call(box.querySelectorAll(".slot"), function (s) { s.classList.remove("sel"); });
        btn.classList.add("sel");
        timeBtn.classList.add("on"); timeBtn.classList.remove("err");
        timeBtn.querySelector("span").className = "val";
        timeBtn.querySelector("span").textContent = selTime + " IST";
        closePops(); updateLink(); clearErr();
      });
    });
  }

  // ---------- pop-out helpers ----------
  function togglePop(pop, btn) {
    var open = pop.classList.contains("open");
    closePops();
    if (!open) { pop.classList.add("open"); btn.setAttribute("aria-expanded", "true"); }
  }
  function closePops() {
    [calWrap, timeWrap].forEach(function (p) { p.classList.remove("open"); });
    dateBtn.setAttribute("aria-expanded", "false"); timeBtn.setAttribute("aria-expanded", "false");
  }

  // ---------- message + link ----------
  function fmtDate(d) { return WD[d.getDay()] + ", " + d.getDate() + " " + MON[d.getMonth()] + " " + d.getFullYear(); }
  function buildMsg() {
    var name = nameEl.value.trim() || "—";
    var lines = ["Hello GreenSpace Herbs 👋", "", "I'd like to book an appointment:", "",
      "• Name: " + name,
      "• Date: " + (selDate ? fmtDate(selDate) : "—"),
      "• Time: " + (selTime ? selTime + " (IST)" : "—")];
    var topic = topicEl.value.trim();
    if (topic) lines.push("• Topic: " + topic);
    lines.push("", "Sent via greenspaceherbs.com");
    return lines.join("\n");
  }
  function waLink() { return "https://wa.me/" + WA + "?text=" + encodeURIComponent(buildMsg()); }
  function updateLink() { confirmA.href = waLink(); }

  function onConfirm(e) {
    var errs = [];
    if (!nameEl.value.trim()) { errs.push("name"); nameEl.classList.add("err"); }
    if (!selDate) { errs.push("date"); dateBtn.classList.add("err"); }
    if (!selTime) { errs.push("time"); timeBtn.classList.add("err"); }
    if (errs.length) {
      e.preventDefault();
      errEl.textContent = "Please add your " + errs.join(", ") + " to continue.";
      return;
    }
    updateLink();                            // ensure freshest message
    clearErr();
    setTimeout(close, 400);                  // link opens WhatsApp in a new tab; tidy up the modal
  }
  function clearErr() { errEl.textContent = ""; }

  // ---------- open / close ----------
  function open() {
    mount();
    overlay.classList.add("open");
    updateLink();
    setTimeout(function () { nameEl.focus(); }, 120);
    document.documentElement.style.overflow = "hidden";
  }
  function close() {
    if (!overlay) return;
    overlay.classList.remove("open");
    closePops();
    document.documentElement.style.overflow = "";
  }

  // ---------- triggers ----------
  document.addEventListener("click", function (e) {
    var t = e.target.closest && e.target.closest('[data-gs-book], .gs-book-btn, a[href="#book"], a[href="#book-appointment"]');
    if (t) { e.preventDefault(); open(); }
  });
  window.gsBook = open;
})();
