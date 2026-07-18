/* GreenSpace Herbs — Quantum Concierge
   A self-contained, site-wide AI concierge that answers questions about the whole
   site from a local knowledge base (public/redesign/concierge-kb.json). No server,
   no API keys, no per-message cost — pure client-side TF-IDF retrieval.

   Rendered inside a Shadow DOM so the widget looks identical on every page,
   isolated from the redesigned pages' CSS AND the old-capture WordPress CSS.
   The knowledge base is lazy-fetched only when the user first opens the panel,
   so page-load cost is zero. Design language: gold/green "quantum HUD terminal". */
(function () {
  "use strict";
  if (window.__gsConcierge) return;
  window.__gsConcierge = true;
  // stay out of iframes / embedded previews
  try { if (window.self !== window.top) return; } catch (e) { return; }

  var KB_URL = "/redesign/concierge-kb.json";
  var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;

  var STARTERS = [
    "What is Quantum Ayurveda?",
    "Tell me about CurcuminQA™",
    "What products do you make?",
    "How can I contact you?",
    "Are you hiring?"
  ];

  // ---- state ----
  var host, root, panel, launcher, msgsEl, inputEl, kb = null, docs = null,
      idf = null, loading = false, loaded = false, opened = false, greeted = false;

  // ================= STYLES =================
  var STYLE = "\
:host{all:initial}\
*{box-sizing:border-box;margin:0;padding:0;font-family:'Poppins',ui-sans-serif,system-ui,-apple-system,'Segoe UI',Roboto,sans-serif}\
.mono{font-family:'IBM Plex Mono',ui-monospace,'SF Mono',Menlo,Consolas,monospace}\
.wrap{position:fixed;right:22px;bottom:22px;z-index:2147483000;color:#fff7ea}\
\
/* ---------- launcher ---------- */\
.launch{position:fixed;right:22px;bottom:22px;width:64px;height:64px;border:0;cursor:pointer;\
  background:none;z-index:2147483000;display:grid;place-items:center;-webkit-tap-highlight-color:transparent}\
.launch .core{position:absolute;inset:6px;border-radius:50%;\
  background:radial-gradient(circle at 38% 34%,#0e4a2e,#062015 70%);\
  box-shadow:0 10px 30px rgba(10,40,25,.5),0 0 0 1px rgba(227,191,112,.5),inset 0 0 14px rgba(227,191,112,.22)}\
.launch svg{position:relative;width:40px;height:40px;color:#e3bf70;filter:drop-shadow(0 0 4px rgba(227,191,112,.55))}\
.launch .ring{position:absolute;inset:-3px;border-radius:50%;border:1px solid rgba(227,191,112,.55);\
  animation:pulse 3.2s ease-out infinite}\
.launch .ring.b{animation-delay:1.6s}\
.launch:hover .core{box-shadow:0 12px 34px rgba(10,40,25,.6),0 0 0 1px rgba(227,191,112,.8),inset 0 0 18px rgba(227,191,112,.35)}\
.launch:hover svg{color:#f4dfae}\
.launch .lbl{position:absolute;right:74px;top:50%;transform:translateY(-50%);white-space:nowrap;\
  background:linear-gradient(160deg,#0a3421,#072517);border:1px solid rgba(227,191,112,.4);\
  color:#f0e4c8;font-size:11.5px;letter-spacing:.14em;text-transform:uppercase;padding:8px 12px;border-radius:9px;\
  opacity:0;pointer-events:none;transition:opacity .25s,transform .25s;transform:translateY(-50%) translateX(6px);\
  box-shadow:0 10px 26px rgba(0,0,0,.3)}\
.launch:hover .lbl,.launch:focus-visible .lbl{opacity:1;transform:translateY(-50%) translateX(0)}\
.launch .spark{position:absolute;top:8px;right:9px;width:7px;height:7px;border-radius:50%;background:#7ee0a6;\
  box-shadow:0 0 8px #7ee0a6;animation:blink 2.4s ease-in-out infinite}\
.electron{transform-box:fill-box;transform-origin:center}\
.eA{animation:spin 6s linear infinite}\
.eB{animation:spin 9s linear infinite reverse}\
\
/* ---------- panel ---------- */\
.panel{position:fixed;right:22px;bottom:22px;width:384px;max-width:calc(100vw - 32px);\
  height:min(624px,82vh);display:none;flex-direction:column;overflow:hidden;\
  border-radius:20px;border:1px solid rgba(227,191,112,.32);\
  background:linear-gradient(168deg,rgba(9,44,30,.98),rgba(6,26,18,.99));\
  box-shadow:0 30px 80px rgba(0,0,0,.5),0 0 0 1px rgba(0,0,0,.2),inset 0 1px 0 rgba(227,191,112,.14);\
  z-index:2147483001;backdrop-filter:blur(8px)}\
.panel.open{display:flex;animation:warp .42s cubic-bezier(.2,.9,.25,1)}\
.panel::before{content:'';position:absolute;inset:0;pointer-events:none;z-index:5;\
  background:\
   linear-gradient(rgba(227,191,112,.5) 0 0) 12px 12px/16px 1px no-repeat,\
   linear-gradient(rgba(227,191,112,.5) 0 0) 12px 12px/1px 16px no-repeat,\
   linear-gradient(rgba(227,191,112,.5) 0 0) right 12px top 12px/16px 1px no-repeat,\
   linear-gradient(rgba(227,191,112,.5) 0 0) right 12px top 12px/1px 16px no-repeat,\
   linear-gradient(rgba(227,191,112,.5) 0 0) 12px bottom 12px/16px 1px no-repeat,\
   linear-gradient(rgba(227,191,112,.5) 0 0) 12px bottom 12px/1px 16px no-repeat,\
   linear-gradient(rgba(227,191,112,.5) 0 0) right 12px bottom 12px/16px 1px no-repeat,\
   linear-gradient(rgba(227,191,112,.5) 0 0) right 12px bottom 12px/1px 16px no-repeat}\
.panel::after{content:'';position:absolute;left:0;right:0;top:0;height:40%;pointer-events:none;z-index:4;\
  background:linear-gradient(180deg,rgba(227,191,112,.10),transparent 82%);\
  transform:translateY(-120%);animation:scan 8s ease-in-out infinite}\
.grid{position:absolute;inset:0;z-index:0;pointer-events:none;opacity:.5;\
  background-image:linear-gradient(rgba(227,191,112,.05) 1px,transparent 1px),linear-gradient(90deg,rgba(227,191,112,.05) 1px,transparent 1px);\
  background-size:26px 26px}\
\
/* header */\
.hd{position:relative;z-index:6;display:flex;align-items:center;gap:12px;padding:15px 15px 13px 17px;\
  border-bottom:1px solid rgba(227,191,112,.2);background:linear-gradient(180deg,rgba(6,26,18,.5),transparent)}\
.hd .atom{width:34px;height:34px;flex:0 0 auto;color:#e3bf70}\
.hd .tt{flex:1;min-width:0}\
.hd h3{font-size:13px;letter-spacing:.2em;text-transform:uppercase;color:#f4e6c4;font-weight:600}\
.hd .st{display:flex;align-items:center;gap:6px;margin-top:3px;font-size:10px;letter-spacing:.13em;\
  text-transform:uppercase;color:rgba(150,202,132,.9)}\
.hd .st i{width:6px;height:6px;border-radius:50%;background:#7ee0a6;box-shadow:0 0 7px #7ee0a6;animation:blink 2.4s ease-in-out infinite}\
.eq{display:flex;align-items:flex-end;gap:2px;height:16px;margin-right:2px}\
.eq b{width:2px;background:linear-gradient(#e3bf70,#c2912f);border-radius:2px;animation:eq 1.1s ease-in-out infinite}\
.eq b:nth-child(2){animation-delay:.15s}.eq b:nth-child(3){animation-delay:.3s}.eq b:nth-child(4){animation-delay:.45s}\
.x{flex:0 0 auto;width:30px;height:30px;border-radius:8px;border:1px solid rgba(227,191,112,.28);background:transparent;\
  color:#e3bf70;cursor:pointer;font-size:15px;line-height:1;display:grid;place-items:center;transition:.2s}\
.x:hover{background:rgba(227,191,112,.14);color:#fff}\
\
/* messages */\
.msgs{position:relative;z-index:6;flex:1;overflow-y:auto;padding:18px 15px 8px;display:flex;flex-direction:column;gap:14px;\
  scrollbar-width:thin;scrollbar-color:rgba(227,191,112,.35) transparent}\
.msgs::-webkit-scrollbar{width:7px}.msgs::-webkit-scrollbar-thumb{background:rgba(227,191,112,.3);border-radius:8px}\
.row{display:flex;gap:9px;align-items:flex-start;max-width:100%}\
.row.u{flex-direction:row-reverse}\
.av{width:26px;height:26px;flex:0 0 auto;border-radius:50%;display:grid;place-items:center;margin-top:2px;\
  background:radial-gradient(circle at 38% 34%,#0e4a2e,#062015);border:1px solid rgba(227,191,112,.4);color:#e3bf70}\
.av svg{width:16px;height:16px}\
.bub{position:relative;font-size:13.5px;line-height:1.5;border-radius:13px;padding:11px 13px;max-width:82%;word-wrap:break-word;overflow-wrap:anywhere}\
.b .bub{background:rgba(255,250,240,.055);border:1px solid rgba(227,191,112,.16);border-left:2px solid #c2912f;color:#f2ecdd;border-top-left-radius:4px}\
.u .bub{background:linear-gradient(135deg,#e3bf70,#c2912f);color:#15280f;font-weight:500;border-top-right-radius:4px}\
.bub a.src{display:inline-flex;align-items:center;gap:5px;margin-top:9px;font-size:11px;letter-spacing:.06em;\
  color:#e3bf70;text-decoration:none;border:1px solid rgba(227,191,112,.35);border-radius:20px;padding:4px 10px;transition:.2s}\
.bub a.src:hover{background:rgba(227,191,112,.16);color:#fff7ea}\
.bub a.src b{font-family:'IBM Plex Mono',ui-monospace,monospace;font-weight:600}\
\
/* chips */\
.chips{position:relative;z-index:6;display:flex;flex-wrap:wrap;gap:7px;padding:2px 15px 12px}\
.chip{font-size:12px;color:#efe2c4;background:rgba(227,191,112,.07);border:1px solid rgba(227,191,112,.28);\
  border-radius:20px;padding:7px 12px;cursor:pointer;transition:.18s;line-height:1.3;text-align:left}\
.chip:hover{background:rgba(227,191,112,.18);border-color:rgba(227,191,112,.55);color:#fff}\
.chips .lead{width:100%;font-size:9.5px;letter-spacing:.2em;text-transform:uppercase;color:rgba(227,191,112,.7);margin-bottom:1px}\
\
/* typing */\
.typ{display:flex;gap:4px;align-items:center;padding:12px 13px}\
.typ i{width:6px;height:6px;border-radius:50%;background:#e3bf70;opacity:.5;animation:bob 1.2s ease-in-out infinite}\
.typ i:nth-child(2){animation-delay:.18s}.typ i:nth-child(3){animation-delay:.36s}\
\
/* input */\
.ft{position:relative;z-index:6;padding:11px;border-top:1px solid rgba(227,191,112,.2);\
  background:linear-gradient(0deg,rgba(6,26,18,.6),transparent)}\
.ib{display:flex;align-items:center;gap:8px;background:rgba(3,18,12,.6);border:1px solid rgba(227,191,112,.3);\
  border-radius:12px;padding:6px 6px 6px 14px;transition:.2s}\
.ib:focus-within{border-color:rgba(227,191,112,.7);box-shadow:0 0 0 3px rgba(227,191,112,.1)}\
.ib input{flex:1;background:transparent;border:0;outline:0;color:#fff7ea;font-size:13.5px}\
.ib input::placeholder{color:rgba(255,247,234,.4)}\
.snd{width:36px;height:36px;flex:0 0 auto;border:0;border-radius:9px;cursor:pointer;display:grid;place-items:center;\
  background:linear-gradient(135deg,#e3bf70,#c2912f);color:#15280f;transition:.2s}\
.snd:hover{filter:brightness(1.08)}.snd:disabled{opacity:.4;cursor:default}\
.snd svg{width:18px;height:18px}\
.dis{text-align:center;font-size:9px;letter-spacing:.1em;color:rgba(255,247,234,.32);margin-top:7px}\
\
@media (max-width:560px){\
 .panel{right:8px;left:8px;bottom:8px;width:auto;max-width:none;height:86vh}\
 .launch{right:16px;bottom:16px}\
}\
@keyframes spin{to{transform:rotate(360deg)}}\
@keyframes pulse{0%{transform:scale(1);opacity:.7}100%{transform:scale(1.5);opacity:0}}\
@keyframes blink{0%,100%{opacity:1}50%{opacity:.3}}\
@keyframes bob{0%,100%{transform:translateY(0);opacity:.5}50%{transform:translateY(-4px);opacity:1}}\
@keyframes eq{0%,100%{height:4px}50%{height:15px}}\
@keyframes scan{0%{transform:translateY(-120%)}55%,100%{transform:translateY(320%)}}\
@keyframes warp{from{opacity:0;transform:translateY(14px) scale(.94)}to{opacity:1;transform:none}}\
" + (reduce ? ".launch .ring,.launch .spark,.eA,.eB,.panel::after,.hd .st i,.eq b,.typ i,.launch .core{animation:none!important}.panel.open{animation:none}" : "");

  // atom glyph (launcher / header / avatar)
  function atomSVG(cls) {
    return "<svg class='" + (cls || "") + "' viewBox='0 0 48 48' fill='none' stroke='currentColor' stroke-width='1.5'>"
      + "<circle cx='24' cy='24' r='3.2' fill='currentColor' stroke='none'/>"
      + "<g class='electron eA'><ellipse cx='24' cy='24' rx='20' ry='7.5'/></g>"
      + "<g class='electron eB'><ellipse cx='24' cy='24' rx='20' ry='7.5' transform='rotate(60 24 24)'/></g>"
      + "<ellipse cx='24' cy='24' rx='20' ry='7.5' transform='rotate(120 24 24)'/></svg>";
  }

  // ================= MOUNT =================
  function mount() {
    if (host) return;
    host = document.createElement("div");
    host.id = "gs-concierge-host";
    document.body.appendChild(host);
    root = host.attachShadow({ mode: "open" });

    var style = document.createElement("style");
    style.textContent = STYLE;
    root.appendChild(style);

    // launcher
    launcher = document.createElement("button");
    launcher.className = "launch";
    launcher.setAttribute("aria-label", "Open Quantum Concierge — ask about GreenSpace Herbs");
    launcher.innerHTML =
      "<span class='ring'></span><span class='ring b'></span><span class='core'></span>"
      + atomSVG("") + "<span class='spark'></span>"
      + "<span class='lbl mono'>Ask&nbsp;Quantum</span>";
    root.appendChild(launcher);

    // panel
    panel = document.createElement("div");
    panel.className = "panel";
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-label", "Quantum Concierge");
    panel.setAttribute("aria-modal", "false");
    panel.innerHTML =
      "<span class='grid'></span>"
      + "<div class='hd'>"
      +   "<span class='atom'>" + atomSVG("") + "</span>"
      +   "<div class='tt'><h3 class='mono'>Quantum Concierge</h3>"
      +     "<div class='st mono'><i></i>Online · Knowledge core synced</div></div>"
      +   "<div class='eq'><b></b><b></b><b></b><b></b></div>"
      +   "<button class='x' aria-label='Close'>✕</button>"
      + "</div>"
      + "<div class='msgs' aria-live='polite'></div>"
      + "<div class='chips'></div>"
      + "<div class='ft'><div class='ib'>"
      +   "<input type='text' autocomplete='off' placeholder='Ask about products, science, herbs…' aria-label='Ask a question'>"
      +   "<button class='snd' aria-label='Send'><svg viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='M4 12h15'/><path d='m13 6 7 6-7 6'/></svg></button>"
      + "</div><div class='dis mono'>Local knowledge · answers link to the source page</div></div>";
    root.appendChild(panel);

    msgsEl = panel.querySelector(".msgs");
    inputEl = panel.querySelector("input");

    launcher.addEventListener("click", openPanel);
    panel.querySelector(".x").addEventListener("click", closePanel);
    panel.querySelector(".snd").addEventListener("click", onSend);
    inputEl.addEventListener("keydown", function (e) { if (e.key === "Enter") onSend(); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && opened) closePanel(); });
  }

  function openPanel() {
    opened = true;
    launcher.style.display = "none";
    panel.classList.add("open");
    loadKB();
    if (!greeted) {
      greeted = true;
      botSay("I’m the GreenSpace <b>Quantum Concierge</b>. Ask me anything about our energized botanical extracts, the science, our herbs, the company, or careers.");
      renderChips(STARTERS, "Try asking");
    }
    setTimeout(function () { inputEl.focus(); }, 120);
  }
  function closePanel() {
    opened = false;
    panel.classList.remove("open");
    launcher.style.display = "grid";
    launcher.focus();
  }

  // ================= KNOWLEDGE BASE =================
  function loadKB() {
    if (loaded || loading) return;
    loading = true;
    fetch(KB_URL, { cache: "force-cache" })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (data) {
        loading = false;
        if (!data || !data.entries) return;
        kb = data.entries;
        buildIndex();
        loaded = true;
      })
      .catch(function () { loading = false; });
  }

  var STOP = {};
  ("a an the of to in on for and or is are was be as at by with from this that it its your you we our us they " +
   "what which who how why when where do does can could will would should i me my about into more most " +
   "tell give show know want need please have has had their them there here also than then so such not")
    .split(" ").forEach(function (w) { STOP[w] = 1; });

  function tokenize(s) {
    if (!s) return [];
    var t = (s + "").toLowerCase().replace(/[’']/g, "").replace(/[^a-z0-9]+/g, " ").split(/\s+/);
    var out = [];
    for (var i = 0; i < t.length; i++) {
      var w = t[i];
      if (w.length < 2 || STOP[w]) continue;
      out.push(w);
      // light stemming: fold trailing plural/verb endings so "products" ~ "product"
      if (w.length > 4 && /(ies)$/.test(w)) out.push(w.slice(0, -3) + "y");
      else if (w.length > 4 && /(es|s)$/.test(w) && !/ss$/.test(w)) out.push(w.replace(/e?s$/, ""));
    }
    return out;
  }

  // per-entry weighted term frequencies + corpus IDF
  function buildIndex() {
    docs = [];
    var df = {}, N = kb.length;
    for (var i = 0; i < kb.length; i++) {
      var e = kb[i], tf = {};
      add(tf, e.title, 6);
      (e.keywords || []).forEach(function (k) { add(tf, k, 4); });
      (e.qa || []).forEach(function (q) { add(tf, q.q, 3.5); });
      add(tf, e.summary, 1.6);
      (e.facts || []).forEach(function (f) { add(tf, f, 1); });
      var norm = 0, seenTok = {};
      for (var t in tf) { norm += tf[t] * tf[t]; if (!seenTok[t]) { df[t] = (df[t] || 0) + 1; seenTok[t] = 1; } }
      docs.push({ e: e, tf: tf, norm: Math.sqrt(norm) || 1 });
    }
    idf = {};
    for (var w in df) idf[w] = Math.log(1 + N / df[w]);
    function add(map, text, weight) {
      tokenize(text).forEach(function (tok) { map[tok] = (map[tok] || 0) + weight; });
    }
  }

  // score every entry against the query; return ranked matches
  function search(q) {
    if (!docs) return [];
    var qt = tokenize(q), qset = {};
    qt.forEach(function (t) { qset[t] = 1; });
    var qtok = Object.keys(qset);
    if (!qtok.length) return [];
    var ql = (q + "").toLowerCase();
    var res = [];
    for (var i = 0; i < docs.length; i++) {
      var d = docs[i], s = 0, hits = 0;
      for (var j = 0; j < qtok.length; j++) {
        var t = qtok[j], w = d.tf[t];
        if (w) { s += w * (idf[t] || 1); hits++; }
      }
      if (!s) continue;
      s = s / d.norm;                                   // length-normalise
      s *= 1 + hits / qtok.length;                      // reward covering more of the query
      // phrase / exact bonuses
      var title = (d.e.title || "").toLowerCase();
      if (title && ql.indexOf(title) !== -1) s += 6;
      (d.e.keywords || []).forEach(function (k) {
        k = (k + "").toLowerCase();
        if (k.length > 2 && ql.indexOf(k) !== -1) s += 2.2;
      });
      // best-matching Q&A within this entry
      var bestQA = null, bestOverlap = 0;
      (d.e.qa || []).forEach(function (qa) {
        var qs = tokenize(qa.q), inter = 0, seen = {};
        qs.forEach(function (t) { if (qset[t] && !seen[t]) { inter++; seen[t] = 1; } });
        var ov = qs.length ? inter / Math.max(qs.length, qtok.length) : 0;
        if (ov > bestOverlap) { bestOverlap = ov; bestQA = qa; }
      });
      if (bestOverlap >= 0.34) s += 3 + bestOverlap * 4;
      res.push({ e: d.e, score: s, qa: bestOverlap >= 0.45 ? bestQA : null });
    }
    res.sort(function (a, b) { return b.score - a.score; });
    return res;
  }

  // ================= INTENTS + ANSWER =================
  var CONTACT = "<b>Contact GreenSpace Herbs</b><br>✉ quantum@greenspaceherbs.com<br>"
    + "☎ India (Global HQ): +91 80-22330084<br>☎ USA: +1 908-941-4655<br><br>"
    + "<b>India · HQ</b> — Unit 0401N, 4th Floor, Beacon Tower-2, Brigade Twin Towers, Yeshwanthpur, Bengaluru 560 022<br>"
    + "<b>USA · Office</b> — HNS Nutra LLC, No. 8, 100 Ryan Street, South Plainfield, NJ 07080";

  function localIntent(q) {
    var s = q.toLowerCase();
    if (/^(hi|hii|hey|hello|yo|namaste|hola|greetings|good (morning|afternoon|evening))\b/.test(s.trim()))
      return { text: "Hello ✨ Ask me about our products (like <b>CurcuminQA™</b>), the science behind Quantum Ayurveda, any of our herbs, the company, or careers.", chips: STARTERS, lead: "Try asking" };
    if (/\b(thank|thanks|thx|cheers|great|awesome|perfect|nice)\b/.test(s) && s.length < 34)
      return { text: "Happy to help — anything else you’d like to know about GreenSpace Herbs?" };
    if (/\b(contact|email|e-mail|phone|call|reach|address|located|location|office|where are you)\b/.test(s))
      return { text: CONTACT, source: { title: "Contact Us", url: "/contact-us/" } };
    if (/\b(hiring|jobs?|career|careers|vacanc(y|ies)|opening|openings|apply|work at|join the team|recruit)\b/.test(s))
      return { text: "Yes — GreenSpace Herbs posts its open roles on the Careers page. Browse current openings there, or email <b>quantum@greenspaceherbs.com</b> to introduce yourself.", source: { title: "Careers", url: "/careers/" } };
    return null;
  }

  function respond(q) {
    var intent = localIntent(q);
    if (intent) { botSay(intent.text, intent.source); if (intent.chips) renderChips(intent.chips, intent.lead); return; }

    if (!loaded) {                                     // KB not in yet — wait briefly then retry
      var tries = 0;
      var iv = setInterval(function () {
        tries++;
        if (loaded) { clearInterval(iv); answerFromKB(q); }
        else if (tries > 40) { clearInterval(iv); fallback(); }
      }, 100);
      return;
    }
    answerFromKB(q);
  }

  function answerFromKB(q) {
    var hits = search(q);
    if (!hits.length || hits[0].score < 1.4) return fallback();
    var top = hits[0], e = top.e, text;
    if (top.qa) {
      text = esc(top.qa.a);
    } else {
      text = esc(e.summary || "");
      if (e.facts && e.facts.length && text.length < 150)
        text += "<br><br>" + esc(e.facts[0]);
    }
    botSay(text, { title: e.title, url: e.url });

    // related — distinct titles, skip the one we answered from
    var related = [], seen = {}; seen[norm(e.title)] = 1;
    for (var i = 1; i < hits.length && related.length < 3; i++) {
      if (hits[i].score < 1.2) break;
      var t = norm(hits[i].e.title);
      if (seen[t]) continue; seen[t] = 1;
      related.push(hits[i].e.title);
    }
    if (related.length) renderChips(related, "Related");
  }

  function fallback() {
    botSay("I don’t have a confident answer for that yet. You can explore the site, or reach our team directly:<br><br>" + CONTACT,
      { title: "Contact Us", url: "/contact-us/" });
    renderChips(STARTERS, "Or ask");
  }

  // ================= CHAT RENDERING =================
  function esc(s) { return (s + "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
  function norm(s) { return (s + "").toLowerCase().replace(/[^a-z0-9]/g, ""); }

  function bubble(role) {
    var row = document.createElement("div");
    row.className = "row " + role;
    if (role === "b") row.innerHTML = "<span class='av'>" + atomSVG("") + "</span>";
    var b = document.createElement("div");
    b.className = "bub";
    row.appendChild(b);
    msgsEl.appendChild(row);
    return { row: row, b: b };
  }

  function userSay(t) {
    clearChips();
    var m = bubble("u"); m.b.textContent = t; scroll();
  }
  function botSay(html, source) {
    var m = bubble("b");
    m.b.innerHTML = html;
    if (source && source.url) {
      var a = document.createElement("a");
      a.className = "src";
      a.href = source.url;
      a.innerHTML = "<svg viewBox='0 0 24 24' width='12' height='12' fill='none' stroke='currentColor' stroke-width='2'><path d='M7 17 17 7M9 7h8v8'/></svg><b>" + esc(source.title || "View page") + "</b>";
      m.b.appendChild(a);
    }
    scroll();
  }

  function typing() {
    var row = document.createElement("div");
    row.className = "row b";
    row.innerHTML = "<span class='av'>" + atomSVG("") + "</span><div class='bub'><div class='typ'><i></i><i></i><i></i></div></div>";
    msgsEl.appendChild(row); scroll();
    return row;
  }

  function renderChips(list, lead) {
    clearChips();
    var box = panel.querySelector(".chips");
    if (lead) { var l = document.createElement("div"); l.className = "lead mono"; l.textContent = lead; box.appendChild(l); }
    list.forEach(function (q) {
      var c = document.createElement("button");
      c.className = "chip"; c.textContent = q;
      c.addEventListener("click", function () { submit(q); });
      box.appendChild(c);
    });
  }
  function clearChips() { var box = panel.querySelector(".chips"); if (box) box.innerHTML = ""; }
  function scroll() { msgsEl.scrollTop = msgsEl.scrollHeight; }

  function onSend() { submit(inputEl.value); }
  function submit(text) {
    text = (text || "").trim();
    if (!text) return;
    inputEl.value = "";
    userSay(text);
    var t = typing();
    var delay = reduce ? 120 : 420 + Math.random() * 320;
    setTimeout(function () {
      t.parentNode && t.parentNode.removeChild(t);
      respond(text);
    }, delay);
  }

  // ================= INIT =================
  function init() { mount(); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
