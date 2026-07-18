/* GreenSpace Command — dashboard app (vanilla JS, no build step). */

(function () {
  const db = window.GSDB;
  db.load();

  const REVIEWERS = db.REVIEWERS;            // science·Tahira / design·Amar / overall·Shafi
  const ROLE_REVIEW_KEY = db.ROLE_REVIEW_KEY;

  let role = "shafi";        // acting role until the login wall lands
  let view = "overview";
  let calCursor = firstOfMonth(new Date());
  let contentFilter = { platform: "all", status: "all" };

  const $ = function (sel, el) { return (el || document).querySelector(sel); };
  const main = $("#dashMain");

  /* ---------------- helpers ---------------- */

  function firstOfMonth(d) { return new Date(d.getFullYear(), d.getMonth(), 1); }
  function fmtMoney(n) { return "$" + Math.round(n).toLocaleString("en-US"); }
  function todayStr() { return new Date().toISOString().slice(0, 10); }
  function daysSince(dateStr) {
    return Math.floor((new Date(todayStr()) - new Date(dateStr)) / 86400000);
  }
  function daysBetween(a, b) {
    return Math.round((new Date(b) - new Date(a)) / 86400000);
  }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function fmtDate(s) {
    return new Date(s + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }
  function toast(msg) {
    const t = $("#toast");
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(toast._t);
    toast._t = setTimeout(function () { t.classList.remove("show"); }, 2600);
    if (window.GSFX) window.GSFX.pulse();   // gold surge through the swarm
  }
  function safeLink(url) {
    return /^https?:\/\//i.test(url || "") ? url : "";
  }

  const PLATFORMS = {
    website:   { label: "Website" },
    instagram: { label: "Instagram" },
    linkedin:  { label: "LinkedIn" },
    email:     { label: "Email" },
    youtube:   { label: "YouTube" }
  };
  const STATUS = {
    draft:     { label: "Draft",             cls: "st-draft" },
    in_review: { label: "In review",         cls: "st-review" },
    changes:   { label: "Changes requested", cls: "st-changes" },
    approved:  { label: "Approved · queued", cls: "st-approved" },
    published: { label: "Published",         cls: "st-pub" }
  };
  const STAGES = ["new", "contacted", "qualified", "sample", "negotiation", "won", "lost"];
  const STAGE_LABEL = { new: "New", contacted: "Contacted", qualified: "Qualified", sample: "Sample sent", negotiation: "Negotiation", won: "Won", lost: "Lost" };
  const RND_STAGES = ["Concept", "Formulation", "Lab trial", "Stability", "Scale-up", "Launch"];

  /* ---------------- roles & permissions ----------------
     shafi/amar/tahira — reviewers (Amar can override)
     jamila            — project manager: runs everything except sign-offs
     priya/rahul       — creators: content calendar only, own items only
     viewer            — read-only everywhere */
  const CREATORS = ["priya", "rahul"];

  function isCreator() { return CREATORS.indexOf(role) >= 0; }
  function myName() { return db.roleName(role).replace(" (CEO)", "").replace(" (PM)", ""); }
  function myReviewKey() { return ROLE_REVIEW_KEY[role] || null; }

  function allowedViews() {
    if (isCreator()) return ["content"];
    return ["overview", "content", "sales", "ads", "analytics", "rnd", "qc", "audit"];
  }
  function canCreateContent() { return role !== "viewer"; }
  function canActOnItem(c) {   // submit / resubmit
    if (role === "viewer") return false;
    if (isCreator()) return c.owner === myName();
    return true;
  }
  function canPublish() { return ["shafi", "amar", "tahira", "jamila"].indexOf(role) >= 0; }
  function canEditLeads() { return ["shafi", "amar", "tahira", "jamila"].indexOf(role) >= 0; }

  function reviewLabel(item) {
    return STATUS[item.status].label + (item.status === "in_review" ? " · " + db.approvedCount(item) + "/3" : "");
  }

  /* ---------------- nav + badges ---------------- */

  function pendingForRole() {
    const key = myReviewKey();
    return db.state.content.filter(function (c) {
      if (isCreator()) return c.status === "changes" && c.owner === myName();
      if (c.status !== "in_review") return false;
      return key ? c.approvals[key] === "pending" : true; // PM & viewer watch the whole queue
    });
  }
  function staleLeads() {
    return db.state.leads.filter(function (l) {
      return l.stage !== "won" && l.stage !== "lost" && daysSince(l.lastContact) > 7;
    });
  }

  function refreshBadges() {
    $("#badgeContent").textContent = pendingForRole().length || "";
    $("#badgeSales").textContent = staleLeads().length || "";
  }

  function applyRoleNav() {
    const allowed = allowedViews();
    document.querySelectorAll(".nav-item").forEach(function (b) {
      b.style.display = allowed.indexOf(b.dataset.view) >= 0 ? "" : "none";
    });
    if (allowed.indexOf(view) < 0) setView(allowed[0]);
  }

  /* ---------------- overview ---------------- */

  const ROLE_SUB = {
    shafi: "overall approval — CEO",
    amar: "design & language · can override",
    tahira: "scientific accuracy & claims",
    jamila: "project manager — full pipeline",
    priya: "creator — your content only",
    rahul: "creator — your content only",
    viewer: "read-only view"
  };

  function sysChip(label, mode) { // mode: live | demo | alert | ok
    const cls = { live: "sys-live", ok: "sys-live", demo: "sys-demo", alert: "sys-alert" }[mode];
    const suffix = mode === "demo" ? " · demo" : mode === "live" ? " · live" : "";
    return '<span class="sys ' + cls + '"><i></i>' + label + suffix + "</span>";
  }

  function renderOverview() {
    const st = db.state;
    const open = st.leads.filter(function (l) { return l.stage !== "won" && l.stage !== "lost"; });
    const pipeline = open.reduce(function (a, l) { return a + l.value; }, 0);
    const hot = open.filter(function (l) { return l.temp === "hot"; });
    const stale = staleLeads();
    const activeAds = st.ads.filter(function (a) { return a.status === "active"; });
    const adSpend = activeAds.reduce(function (a, c) { return a + c.spend; }, 0);
    const adBudget = activeAds.reduce(function (a, c) { return a + c.budget; }, 0);
    const pending = pendingForRole();
    const qcOpen = st.qc.deviations.filter(function (d) { return d.status === "open"; }).length;
    const liveSrc = st.live || {};

    const statusCounts = {};
    Object.keys(STATUS).forEach(function (s) {
      statusCounts[s] = st.content.filter(function (c) { return c.status === s; }).length;
    });

    // role-aware decision queue
    const items = [];
    pending.forEach(function (c) {
      items.push({ tag: myReviewKey() ? "Your review" : isCreator() ? "Fix & resubmit" : reviewLabel(c), cls: "st-review", text: c.title, go: "content", id: c.id });
    });
    if (!isCreator() && role !== "viewer") {
      st.content.filter(function (c) { return c.status === "changes"; }).forEach(function (c) {
        items.push({ tag: "Changes requested", cls: "st-changes", text: c.title + (c.changeBy ? " — by " + c.changeBy : ""), go: "content", id: c.id });
      });
    }
    stale.slice(0, 6).forEach(function (l) {
      items.push({ tag: daysSince(l.lastContact) + "d silent", cls: "warn", text: l.company + " — " + l.product, go: "sales" });
    });
    if (stale.length > 6) {
      items.push({ tag: "+" + (stale.length - 6) + " more", cls: "warn", text: "stale leads — open the full tracker", go: "sales" });
    }
    st.rnd.filter(function (r) { return r.status === "behind" || (r.status === "at_risk" && r.due <= todayStr()); }).forEach(function (r) {
      items.push({ tag: "R&D " + (r.status === "behind" ? "behind" : "at risk"), cls: "warn", text: r.name + " — " + r.milestone, go: "rnd" });
    });
    st.qc.deviations.filter(function (d) { return d.status === "open"; }).forEach(function (d) {
      items.push({ tag: "QC " + d.severity, cls: "danger", text: d.desc, go: "qc" });
    });

    const hotLeads = open.slice().sort(function (a, b) {
      const t = { hot: 0, warm: 1, cold: 2 };
      return t[a.temp] - t[b.temp] || b.value - a.value;
    }).slice(0, 3);

    const maxDay = Math.max.apply(null, st.analytics.daily);
    const rndDot = { on_track: "rn-ok", at_risk: "rn-warn", behind: "rn-bad" };
    const dateLine = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });

    main.innerHTML =
      /* ---- status ribbon ---- */
      '<div class="cc-ribbon">' +
        '<div class="cc-id"><span class="dataline"><i></i>Command centre</span><span class="cc-date">' + dateLine + '</span><span class="cc-clock mono" id="ccClock"></span></div>' +
        '<div class="cc-sys">' +
          sysChip("Content", "ok") + sysChip("Sales", liveSrc.leads ? "live" : "ok") +
          sysChip("Ads", liveSrc.ads ? "live" : "demo") + sysChip("Analytics", liveSrc.analytics ? "live" : "demo") +
          (qcOpen ? sysChip("QC · " + qcOpen + " open", "alert") : sysChip("QC", "ok")) +
        "</div>" +
        '<span class="greet" id="greetLine"></span>' +
      "</div>" +

      /* ---- hero metrics ---- */
      '<div class="kpis cc-hero">' +
        (pipeline > 0
          ? '<div class="kpi"><div class="kpi-label">Open pipeline</div><div class="kpi-value">' + fmtMoney(pipeline) + '</div><div class="kpi-sub">' + open.length + " leads · " + hot.length + " hot · " + stale.length + " stale</div></div>"
          : '<div class="kpi"><div class="kpi-label">Open leads</div><div class="kpi-value">' + open.length.toLocaleString("en-US") + '</div><div class="kpi-sub">' + hot.length + " hot · " + stale.length + " stale · deal values not set in CRM</div></div>") +
        '<div class="kpi"><div class="kpi-label">Live ad spend</div><div class="kpi-value">' + fmtMoney(adSpend) + '</div><div class="kpi-sub">of ' + fmtMoney(adBudget) + " · " + activeAds.length + " campaigns</div></div>" +
        '<div class="kpi"><div class="kpi-label">Site sessions</div><div class="kpi-value">' + st.analytics.sessions.toLocaleString("en-US") + '</div><div class="kpi-sub">' + st.analytics.enquiries + " enquiries · " + st.analytics.period.toLowerCase() + "</div></div>" +
        '<div class="kpi kpi-you"><div class="kpi-label">Waiting on you</div><div class="kpi-value">' + items.length + '</div><div class="kpi-sub">' + ROLE_SUB[role] + "</div></div>" +
      "</div>" +

      '<div class="cc-grid">' +

      /* ---- left column ---- */
      '<div class="cc-col">' +

        '<div class="panel"><div class="panel-head"><h2>Decision queue</h2><span class="muted">' + ROLE_SUB[role] + "</span></div>" +
        (items.length
          ? '<ul class="attn">' + items.map(function (i, n) {
              return '<li class="attn-item" data-go="' + i.go + '"' + (i.id ? ' data-open="' + i.id + '"' : "") + '>' +
                '<span class="qnum">' + String(n + 1).padStart(2, "0") + "</span>" +
                '<span class="pill ' + i.cls + '">' + esc(i.tag) + "</span><span>" + esc(i.text) + '</span><span class="attn-arrow">›</span></li>';
            }).join("") + "</ul>"
          : '<p class="empty">All clear — nothing waiting on you.</p>') +
        "</div>" +

        '<div class="panel"><div class="panel-head"><h2>Content pipeline</h2><span class="muted">Tahira · Amar · Shafi sign-offs</span></div>' +
        '<div class="pipe-flow">' + ["draft", "in_review", "changes", "approved", "published"].map(function (s, i) {
          return (i ? '<span class="pipe-arrow">›</span>' : "") +
            '<div class="pipe-node' + (s === "in_review" && statusCounts[s] ? " pn-hot" : "") + (s === "changes" && statusCounts[s] ? " pn-alert" : "") + '" data-status="' + s + '">' +
            "<b>" + statusCounts[s] + "</b><span>" + STATUS[s].label + "</span></div>";
        }).join("") + "</div></div>" +

        '<div class="panel"><div class="panel-head"><h2>Recent activity</h2></div><ul class="feed">' +
        st.audit.slice(0, 5).map(function (a) {
          return "<li><span class='feed-ts'>" + new Date(a.ts).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) +
            "</span><strong>" + esc(a.user) + "</strong> " + esc(a.action) + ' <span class="muted">— ' + esc(a.detail) + "</span></li>";
        }).join("") + "</ul></div>" +

      "</div>" +

      /* ---- right column ---- */
      '<div class="cc-col">' +

        '<div class="panel"><div class="panel-head"><h2>Ads monitor</h2><span class="muted">' + (liveSrc.ads ? "live" : "demo") + "</span></div>" +
        (activeAds.length ? activeAds.map(function (a) {
          const pct = Math.min(100, Math.round(100 * a.spend / (a.budget || 1)));
          const left = Math.max(0, daysBetween(todayStr(), a.end));
          return '<div class="ad-mini"><div class="ad-mini-top"><strong>' + esc(a.name) + '</strong><span class="mono sm muted">' + esc(a.platform) + "</span></div>" +
            '<div class="ad-bar"><i style="width:' + pct + '%"></i></div>' +
            '<div class="ad-mini-sub"><span>' + fmtMoney(a.spend) + " / " + fmtMoney(a.budget) + "</span><span>" + left + "d left</span></div></div>";
        }).join("") : '<p class="empty">No active campaigns.</p>') +
        '<button class="btn ghost sm cc-more" data-go="ads">All campaigns ›</button></div>' +

        '<div class="panel"><div class="panel-head"><h2>Sales pulse</h2><span class="muted">' + stale.length + " going stale</span></div>" +
        hotLeads.map(function (l) {
          return '<div class="lead-mini" data-go="sales"><div><strong>' + esc(l.company) + '</strong><div class="muted sm">' + esc(l.product) + " · " + STAGE_LABEL[l.stage] + '</div></div>' +
            '<div class="lead-mini-right"><span class="mono">' + fmtMoney(l.value) + '</span><span class="temp temp-' + l.temp + '">' + l.temp + "</span></div></div>";
        }).join("") +
        '<button class="btn ghost sm cc-more" data-go="sales">Full tracker ›</button></div>' +

        '<div class="panel"><div class="panel-head"><h2>Site pulse</h2><span class="muted">14 days</span></div>' +
        '<div class="spark spark-sm">' + st.analytics.daily.map(function (v) {
          return '<i style="height:' + Math.round(100 * v / maxDay) + '%"></i>';
        }).join("") + "</div>" +
        '<div class="ad-mini-sub"><span>' + st.analytics.users.toLocaleString("en-US") + " users</span><span>" + st.analytics.engagementRate + "% engaged</span><span>" + st.analytics.enquiries + " enquiries</span></div>" +
        '<button class="btn ghost sm cc-more" data-go="analytics">Site analytics ›</button></div>' +

        '<div class="panel"><div class="panel-head"><h2>R&amp;D radar</h2><span class="muted">' + st.rnd.length + " projects</span></div>" +
        st.rnd.map(function (r) {
          return '<div class="rn-row" data-go="rnd"><i class="' + rndDot[r.status] + '"></i><span class="rn-name">' + esc(r.name) + '</span><span class="mono sm muted">' + fmtDate(r.due) + "</span></div>";
        }).join("") + "</div>" +

      "</div></div>";

    main.querySelectorAll(".attn-item").forEach(function (el) {
      el.addEventListener("click", function () {
        setView(el.dataset.go);
        if (el.dataset.open) openContentDrawer(el.dataset.open);
      });
    });
    main.querySelectorAll(".cc-more, .lead-mini, .rn-row").forEach(function (el) {
      el.addEventListener("click", function () { setView(el.dataset.go); });
    });
    main.querySelectorAll(".pipe-node").forEach(function (el) {
      el.addEventListener("click", function () {
        contentFilter.status = el.dataset.status;
        setView("content");
      });
    });
    tickClock();
    typeGreeting(items.length);
  }

  function tickClock() {
    const el = document.getElementById("ccClock");
    if (el) el.textContent = new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  }
  setInterval(tickClock, 1000);

  /* ---------------- content calendar ---------------- */

  function reviewDots(item) {
    return '<span class="prog">' + REVIEWERS.map(function (r) {
      const s = item.approvals[r.key];
      return '<i class="pg-' + s + '" title="' + r.person + " — " + r.scope + " (" + s + ')">' + r.person[0] + "</i>";
    }).join("") + "</span>";
  }

  function renderContent() {
    const y = calCursor.getFullYear(), m = calCursor.getMonth();
    const monthName = calCursor.toLocaleDateString("en-US", { month: "long", year: "numeric" });

    const items = db.state.content.filter(function (c) {
      return (contentFilter.platform === "all" || c.platform === contentFilter.platform) &&
             (contentFilter.status === "all" || c.status === contentFilter.status);
    });

    // Monday-first grid
    const first = new Date(y, m, 1);
    const startOffset = (first.getDay() + 6) % 7;
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    const cells = [];
    for (let i = 0; i < startOffset; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    while (cells.length % 7) cells.push(null);

    const byDate = {};
    items.forEach(function (c) {
      if (c.date.slice(0, 7) === (y + "-" + String(m + 1).padStart(2, "0"))) {
        (byDate[+c.date.slice(8, 10)] = byDate[+c.date.slice(8, 10)] || []).push(c);
      }
    });

    const queue = db.state.content.filter(function (c) { return c.status === "in_review" || c.status === "changes"; })
      .sort(function (a, b) { return a.date < b.date ? -1 : 1; });

    main.innerHTML =
      '<div class="toolbar">' +
        '<div class="cal-nav"><button class="btn ghost" id="calPrev">‹</button><span class="cal-month">' + monthName + '</span><button class="btn ghost" id="calNext">›</button></div>' +
        '<div class="toolbar-right">' +
          '<select id="fPlatform">' + ['<option value="all">All platforms</option>'].concat(Object.keys(PLATFORMS).map(function (p) {
            return '<option value="' + p + '"' + (contentFilter.platform === p ? " selected" : "") + ">" + PLATFORMS[p].label + "</option>";
          })).join("") + "</select>" +
          '<select id="fStatus">' + ['<option value="all">All statuses</option>'].concat(Object.keys(STATUS).map(function (s) {
            return '<option value="' + s + '"' + (contentFilter.status === s ? " selected" : "") + ">" + STATUS[s].label + "</option>";
          })).join("") + "</select>" +
          (canCreateContent() ? '<button class="btn primary" id="newContent">+ New content</button>' : "") +
        "</div>" +
      "</div>" +

      '<div class="legend"><span class="muted sm">Each card names its platform. Border shows review status:</span>' +
      Object.keys(STATUS).map(function (s) {
        return '<span class="pill ' + STATUS[s].cls + '">' + STATUS[s].label + "</span>";
      }).join("") + "</div>" +

      '<div class="cal-scroll"><div class="cal">' +
        ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(function (d) { return '<div class="cal-dow">' + d + "</div>"; }).join("") +
        cells.map(function (d) {
          if (d === null) return '<div class="cal-cell off"></div>';
          const dateStr = y + "-" + String(m + 1).padStart(2, "0") + "-" + String(d).padStart(2, "0");
          const isToday = dateStr === todayStr();
          return '<div class="cal-cell' + (isToday ? " today" : "") + '"><div class="cal-day">' + d + "</div>" +
            (byDate[d] || []).map(function (c) {
              return '<button class="chip ' + STATUS[c.status].cls + '" data-open="' + c.id + '" title="' + esc(c.title) + ' — ' + PLATFORMS[c.platform].label + '">' +
                '<span class="chip-pf">' + PLATFORMS[c.platform].label + '</span><span class="chip-t">' + esc(c.title) + "</span></button>";
            }).join("") + "</div>";
        }).join("") +
      "</div></div>" +

      '<div class="panel"><div class="panel-head"><h2>Review queue</h2><span class="muted">every piece needs Tahira · Amar · Shafi before it goes out</span></div>' +
      (queue.length
        ? '<div class="tbl-scroll"><table class="tbl"><thead><tr><th>Date</th><th>Title</th><th>Platform</th><th>Owner</th><th>Reviews</th><th>Status</th><th></th></tr></thead><tbody>' +
          queue.map(function (c) {
            return "<tr><td>" + fmtDate(c.date) + "</td><td>" + esc(c.title) + "</td><td>" + PLATFORMS[c.platform].label + "</td><td>" + esc(c.owner) +
              "</td><td>" + reviewDots(c) + "</td>" +
              '<td><span class="pill ' + STATUS[c.status].cls + '">' + STATUS[c.status].label + "</span></td>" +
              '<td><button class="btn ghost sm" data-open="' + c.id + '">Review</button></td></tr>';
          }).join("") + "</tbody></table></div>"
        : '<p class="empty">Queue is empty — everything is approved.</p>') +
      "</div>";

    $("#calPrev").addEventListener("click", function () { calCursor = new Date(y, m - 1, 1); renderContent(); });
    $("#calNext").addEventListener("click", function () { calCursor = new Date(y, m + 1, 1); renderContent(); });
    $("#fPlatform").addEventListener("change", function (e) { contentFilter.platform = e.target.value; renderContent(); });
    $("#fStatus").addEventListener("change", function (e) { contentFilter.status = e.target.value; renderContent(); });
    if ($("#newContent")) $("#newContent").addEventListener("click", openNewContentDrawer);
    main.querySelectorAll("[data-open]").forEach(function (el) {
      el.addEventListener("click", function () { openContentDrawer(el.dataset.open); });
    });
  }

  /* ---------------- drawer: content detail + reviews ---------------- */

  const drawer = $("#drawer"), scrim = $("#drawerScrim");
  function openDrawer(html) {
    drawer.innerHTML = html;
    drawer.classList.add("open");
    scrim.classList.add("open");
  }
  function closeDrawer() {
    drawer.classList.remove("open");
    scrim.classList.remove("open");
  }
  scrim.addEventListener("click", closeDrawer);

  function reviewRows(c) {
    const stateLabel = { approved: "Approved", pending: "Pending", changes: "Changes requested" };
    const stateCls = { approved: "ok", pending: "st-draft", changes: "st-changes" };
    return '<div class="rv"><div class="rv-head">Sign-offs — all three required</div>' +
      REVIEWERS.map(function (r) {
        const s = c.approvals[r.key];
        const mine = myReviewKey() === r.key;
        const canAct = mine && c.status === "in_review" && s === "pending";
        return '<div class="rv-row' + (mine ? " mine" : "") + '">' +
          '<div class="rv-who"><strong>' + r.person + '</strong><span class="muted sm">' + r.scope + "</span></div>" +
          '<span class="pill ' + stateCls[s] + '">' + stateLabel[s] + "</span>" +
          (canAct
            ? '<span class="rv-actions"><button class="btn primary sm" data-rv="approved" data-key="' + r.key + '">Approve</button>' +
              '<button class="btn danger sm" data-rv="changes" data-key="' + r.key + '">Request changes</button></span>'
            : "") +
          "</div>";
      }).join("") + "</div>";
  }

  function openContentDrawer(id) {
    const c = db.state.content.find(function (x) { return x.id === id; });
    if (!c) return;

    const link = safeLink(c.link);
    const actions = [];
    if (canActOnItem(c)) {
      if (c.status === "draft") actions.push({ a: "submit", label: "Submit for review", cls: "primary" });
      if (c.status === "changes") actions.push({ a: "resubmit", label: "Resubmit for review", cls: "primary" });
    }
    if (canPublish() && c.status === "approved") actions.push({ a: "publish", label: "Mark published", cls: "primary" });
    const showBypass = role === "amar" && (c.status === "in_review" || c.status === "changes");

    openDrawer(
      '<button class="drawer-x" id="drawerX">×</button>' +
      '<span class="pill ' + STATUS[c.status].cls + '">' + reviewLabel(c) + "</span>" +
      (c.bypassed ? ' <span class="pill warn">Approved via Amar override</span>' : "") +
      "<h2>" + esc(c.title) + "</h2>" +
      (link
        ? '<a class="btn content-link" href="' + esc(link) + '" target="_blank" rel="noopener">▶ Open content (Drive) ↗</a>'
        : '<p class="muted sm">No content link attached yet.</p>') +
      '<dl class="meta"><dt>Platform</dt><dd>' + PLATFORMS[c.platform].label + "</dd>" +
      "<dt>Publish date</dt><dd>" + fmtDate(c.date) + "</dd>" +
      "<dt>Owner</dt><dd>" + esc(c.owner) + "</dd></dl>" +
      '<p class="brief">' + esc(c.brief || "") + "</p>" +
      (c.changeNote ? '<div class="reject-note"><strong>' + esc(c.changeBy || "") + " requested changes:</strong> " + esc(c.changeNote) + "</div>" : "") +
      (c.status === "draft" ? '<p class="muted sm">Submit this draft to start the three sign-offs.</p>' : reviewRows(c)) +
      '<div class="drawer-actions">' + actions.map(function (x) {
        return '<button class="btn ' + x.cls + '" data-act="' + x.a + '">' + x.label + "</button>";
      }).join("") + "</div>" +
      (showBypass
        ? '<div class="bypass"><button class="btn danger" data-act="bypass">⚡ Amar override — approve without remaining reviews</button>' +
          '<span class="muted sm">Use when sign-offs are outstanding but it has to go out. Logged in the audit trail.</span></div>'
        : "") +
      '<div class="flow">' +
        '<span class="' + (c.status === "in_review" ? "now" : ["approved", "published"].indexOf(c.status) >= 0 ? "done" : "") + '">Reviews ' + db.approvedCount(c) + "/3</span>" +
        '<span class="' + (c.status === "approved" ? "now" : c.status === "published" ? "done" : "") + '">Approved</span>' +
        '<span class="' + (c.status === "published" ? "done" : "") + '">Published</span></div>'
    );

    $("#drawerX").addEventListener("click", closeDrawer);

    drawer.querySelectorAll("[data-rv]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        const decision = btn.dataset.rv;
        let note = "";
        if (decision === "changes") {
          note = prompt("What needs to change? (required)");
          if (!note) return;
        }
        db.contentActions.review(c, role, btn.dataset.key, decision, note);
        db.save();
        toast(decision === "approved" ? "Approved — " + reviewLabel(c) : "Changes requested — sent back to " + c.owner);
        refreshBadges();
        render();
        openContentDrawer(c.id); // refresh drawer in place
      });
    });

    drawer.querySelectorAll("[data-act]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        const act = btn.dataset.act;
        if (act === "bypass" && !confirm("Override outstanding reviews and approve? This is recorded in the audit trail.")) return;
        db.contentActions[act](c, role);
        db.save();
        toast(STATUS[c.status].label + " — " + c.title);
        closeDrawer();
        refreshBadges();
        render();
      });
    });
  }

  function openNewContentDrawer() {
    const lockOwner = isCreator();
    openDrawer(
      '<button class="drawer-x" id="drawerX">×</button><h2>New content</h2>' +
      '<div class="form">' +
      '<label>Title<input id="ncTitle" type="text" placeholder="e.g. AyuQuanta-7 teaser #2"></label>' +
      '<label>Content link — Google Drive, video, photo, doc…<input id="ncLink" type="url" placeholder="https://drive.google.com/…"></label>' +
      '<label>Platform<select id="ncPlatform">' + Object.keys(PLATFORMS).map(function (p) { return '<option value="' + p + '">' + PLATFORMS[p].label + "</option>"; }).join("") + "</select></label>" +
      '<label>Publish date<input id="ncDate" type="date" value="' + todayStr() + '"></label>' +
      '<label>Owner' + (lockOwner
        ? '<input id="ncOwner" type="text" value="' + esc(myName()) + '" disabled>'
        : '<input id="ncOwner" type="text" placeholder="Who is producing this?">') + "</label>" +
      '<label>Brief<textarea id="ncBrief" rows="3" placeholder="What is this piece, and what should it achieve?"></textarea></label>' +
      '<div class="drawer-actions"><button class="btn primary" id="ncSave">Create draft</button></div>' +
      "</div>"
    );
    $("#drawerX").addEventListener("click", closeDrawer);
    $("#ncSave").addEventListener("click", function () {
      const title = $("#ncTitle").value.trim();
      if (!title) { toast("Give it a title first."); return; }
      const rawLink = $("#ncLink").value.trim();
      if (rawLink && !safeLink(rawLink)) { toast("The content link must start with http(s)://"); return; }
      db.addContent(role, {
        title: title,
        link: rawLink,
        platform: $("#ncPlatform").value,
        date: $("#ncDate").value || todayStr(),
        owner: lockOwner ? myName() : ($("#ncOwner").value.trim() || "—"),
        brief: $("#ncBrief").value.trim()
      });
      calCursor = firstOfMonth(new Date($("#ncDate").value || todayStr()));
      toast("Draft created — submit it for review when ready.");
      closeDrawer();
      refreshBadges();
      render();
    });
  }

  /* ---------------- sales tracker ---------------- */

  function openLeadDrawer(id) {
    const l = db.state.leads.find(function (x) { return String(x.id) === String(id); });
    if (!l) return;
    const d = l.detail || {};
    const tempCls = l.temp === "hot" ? "danger" : l.temp === "warm" ? "warn" : "st-draft";
    const zohoUrl = db.state.zohoOrgId ? "https://crm.zoho.com/crm/org" + db.state.zohoOrgId + "/tab/Leads/" + l.id : "";
    const loc = [d.city, d.state, l.region !== "—" ? l.region : null].filter(Boolean).join(", ");

    function row(label, value) {
      return value ? "<dt>" + label + "</dt><dd>" + value + "</dd>" : "";
    }

    openDrawer(
      '<button class="drawer-x" id="drawerX">×</button>' +
      '<span class="pill st-review">' + STAGE_LABEL[l.stage] + '</span> <span class="pill ' + tempCls + '">' + l.temp + "</span>" +
      "<h2>" + esc(l.company) + "</h2>" +
      (zohoUrl ? '<a class="btn content-link" href="' + zohoUrl + '" target="_blank" rel="noopener">Open in Zoho CRM ↗</a>' : "") +
      '<dl class="meta">' +
      row("Contact", esc(l.contact) + (d.title ? ' <span class="muted">· ' + esc(d.title) + "</span>" : "")) +
      row("Email", d.email ? '<a href="mailto:' + esc(d.email) + '">' + esc(d.email) + "</a>" : null) +
      row("Phone", [d.phone, d.mobile].filter(Boolean).map(esc).join(" · ") || null) +
      row("Website", d.website ? '<a href="' + esc(safeLink(d.website) || "https://" + d.website) + '" target="_blank" rel="noopener">' + esc(d.website) + "</a>" : null) +
      row("Location", loc ? esc(loc) : null) +
      row("Industry", l.product !== "—" ? esc(l.product) : null) +
      row("Owner", esc(d.ownerFull || l.owner)) +
      row("Source", esc(l.source)) +
      row("Zoho status", d.zohoStatus ? esc(d.zohoStatus) : '<span class="muted">not set</span>') +
      row("Employees", d.employees) +
      row("Created", d.created ? fmtDate(d.created) : null) +
      row("Modified", d.modified ? fmtDate(d.modified) : null) +
      row("Last activity", d.lastActivity ? fmtDate(d.lastActivity) : '<span class="muted">none recorded</span>') +
      "</dl>" +
      (d.description ? '<p class="brief">' + esc(d.description) + "</p>" : "") +
      (canEditLeads()
        ? '<div class="drawer-actions"><button class="btn primary" id="ldContacted">Contacted today</button>' +
          (d.email ? '<a class="btn ghost" href="mailto:' + esc(d.email) + '">Email lead</a>' : "") + "</div>"
        : "")
    );
    $("#drawerX").addEventListener("click", closeDrawer);
    const btn = $("#ldContacted");
    if (btn) btn.addEventListener("click", function () {
      db.contactedToday(role, l.id);
      toast("Contact logged for " + l.company + ".");
      closeDrawer();
      refreshBadges();
      render();
    });
  }

  function renderSales() {
    const leads = db.state.leads.slice().sort(function (a, b) { return a.lastContact < b.lastContact ? -1 : 1; });
    const open = leads.filter(function (l) { return l.stage !== "won" && l.stage !== "lost"; });
    const pipeline = open.reduce(function (a, l) { return a + l.value; }, 0);
    const closed = leads.filter(function (l) { return l.stage === "won" || l.stage === "lost"; });
    const winRate = closed.length ? Math.round(100 * leads.filter(function (l) { return l.stage === "won"; }).length / closed.length) : 0;
    const edit = canEditLeads();

    const kpis = [
      pipeline > 0
        ? { label: "Open pipeline", value: fmtMoney(pipeline), sub: open.length + " leads in play" }
        : { label: "Open leads", value: open.length.toLocaleString("en-US"), sub: "deal values not set in CRM" },
      { label: "Hot / warm / cold", value: ["hot", "warm", "cold"].map(function (t) { return open.filter(function (l) { return l.temp === t; }).length; }).join(" / "), sub: "temperature split" },
      { label: "Stale (>7d no contact)", value: staleLeads().length, sub: "need a follow-up" },
      { label: "Win rate", value: winRate + "%", sub: closed.length + " closed deals" }
    ];

    main.innerHTML =
      '<div class="kpis kpis-4">' + kpis.map(function (k) {
        return '<div class="kpi"><div class="kpi-label">' + k.label + '</div><div class="kpi-value">' + k.value + '</div><div class="kpi-sub">' + k.sub + "</div></div>";
      }).join("") + "</div>" +

      '<div class="stages">' + STAGES.map(function (s) {
        const inStage = leads.filter(function (l) { return l.stage === s; });
        const val = inStage.reduce(function (a, l) { return a + l.value; }, 0);
        return '<div class="stage' + (s === "won" ? " stage-won" : s === "lost" ? " stage-lost" : "") + '"><div class="stage-name">' + STAGE_LABEL[s] +
          '</div><div class="stage-count">' + inStage.length + '</div><div class="stage-val">' + (val ? fmtMoney(val) : "—") + "</div></div>";
      }).join("") + "</div>" +

      '<div class="panel"><div class="panel-head"><h2>All leads</h2><span class="muted">' + ((db.state.live && db.state.live.leads) ? "synced from Zoho CRM" : "sources: CRM · Gmail · website · expo · referral") + "</span></div>" +
      '<div class="tbl-scroll"><table class="tbl"><thead><tr><th>Company</th><th>Product</th><th>Source</th><th>Stage</th><th>Temp</th><th>Value</th><th>Owner</th><th>Last contact</th><th></th></tr></thead><tbody>' +
      leads.map(function (l) {
        const ds = daysSince(l.lastContact);
        const stale = l.stage !== "won" && l.stage !== "lost" && ds > 7;
        return '<tr class="' + (stale ? "stale" : "") + '" data-lead="' + l.id + '"><td><strong>' + esc(l.company) + "</strong><div class='muted sm'>" + esc(l.contact) + "</div></td>" +
          "<td>" + esc(l.product) + "</td><td><span class='src src-" + l.source + "'>" + l.source + "</span></td>" +
          "<td>" + (edit
            ? '<select class="mini" data-stage="' + l.id + '">' + STAGES.map(function (s) { return '<option value="' + s + '"' + (l.stage === s ? " selected" : "") + ">" + STAGE_LABEL[s] + "</option>"; }).join("") + "</select>"
            : STAGE_LABEL[l.stage]) + "</td>" +
          "<td>" + (edit
            ? '<select class="mini temp-' + l.temp + '" data-temp="' + l.id + '">' + ["hot", "warm", "cold"].map(function (t) { return '<option value="' + t + '"' + (l.temp === t ? " selected" : "") + ">" + t + "</option>"; }).join("") + "</select>"
            : '<span class="temp temp-' + l.temp + '">' + l.temp + "</span>") + "</td>" +
          "<td>" + fmtMoney(l.value) + "</td><td>" + esc(l.owner) + "</td>" +
          "<td>" + fmtDate(l.lastContact) + (stale ? ' <span class="pill warn">' + ds + "d</span>" : "") + "</td>" +
          "<td>" + (edit ? '<button class="btn ghost sm" data-contacted="' + l.id + '" title="Log a touch today">Contacted</button>' : "") + "</td></tr>";
      }).join("") + "</tbody></table></div></div>" +

      '<p class="footnote">' + ((db.state.live && db.state.live.leads)
        ? "Live — " + leads.length.toLocaleString("en-US") + " leads synced from Zoho CRM. Temperature is derived from status (qualified = hot, contacted = warm) until ratings and deal values are maintained in Zoho; stage edits here are local only."
        : "Demo data. Goes live once Zoho CRM is authorized (via the Windsor.ai connector) — leads and stages then sync here automatically, with Gmail lead capture alongside.") + "</p>";

    main.querySelectorAll("[data-stage]").forEach(function (el) {
      el.addEventListener("change", function () {
        db.updateLead(role, el.dataset.stage, { stage: el.value }, "Moved lead to " + STAGE_LABEL[el.value]);
        refreshBadges(); renderSales();
      });
    });
    main.querySelectorAll("[data-temp]").forEach(function (el) {
      el.addEventListener("change", function () {
        db.updateLead(role, el.dataset.temp, { temp: el.value }, "Marked lead " + el.value);
        refreshBadges(); renderSales();
      });
    });
    main.querySelectorAll("[data-contacted]").forEach(function (el) {
      el.addEventListener("click", function () {
        db.contactedToday(role, el.dataset.contacted);
        toast("Contact logged for today.");
        refreshBadges(); renderSales();
      });
    });
    main.querySelectorAll("tr[data-lead]").forEach(function (tr) {
      tr.addEventListener("click", function (e) {
        if (e.target.closest("select, button, a")) return;   // inline controls keep working
        openLeadDrawer(tr.dataset.lead);
      });
    });
  }

  /* ---------------- ads ---------------- */

  function adRuntime(a) {
    const total = daysBetween(a.start, a.end);
    if (a.status === "scheduled") {
      const wait = daysBetween(todayStr(), a.start);
      return fmtDate(a.start) + " – " + fmtDate(a.end) + " · " + total + "d · starts in " + wait + "d";
    }
    if (a.status === "ended") return fmtDate(a.start) + " – " + fmtDate(a.end) + " · ran " + total + "d";
    const left = Math.max(0, daysBetween(todayStr(), a.end));
    return fmtDate(a.start) + " – " + fmtDate(a.end) + " · " + total + "d · " + left + "d left";
  }

  function renderAds() {
    const ads = db.state.ads;
    const active = ads.filter(function (a) { return a.status === "active"; });
    const spend = active.reduce(function (s, a) { return s + a.spend; }, 0);
    const budget = active.reduce(function (s, a) { return s + a.budget; }, 0);
    const clicks = active.reduce(function (s, a) { return s + a.clicks; }, 0);
    const leads = ads.reduce(function (s, a) { return s + a.conversions; }, 0);
    const stCls = { active: "ok", scheduled: "st-review", paused: "warn", ended: "st-draft" };

    // spend by platform (active campaigns)
    const byPf = {};
    active.forEach(function (a) { byPf[a.platform] = (byPf[a.platform] || 0) + a.spend; });

    const kpis = [
      { label: "Active campaigns", value: active.length, sub: ads.length + " total this quarter" },
      { label: "Live spend to date", value: fmtMoney(spend), sub: "of " + fmtMoney(budget) + " budgeted" },
      { label: "Avg cost per click", value: clicks ? "$" + (spend / clicks).toFixed(2) : "—", sub: clicks.toLocaleString("en-US") + " clicks (active)" },
      { label: "Leads from ads", value: leads, sub: "all campaigns, 90d" }
    ];

    main.innerHTML =
      '<div class="kpis kpis-4">' + kpis.map(function (k) {
        return '<div class="kpi"><div class="kpi-label">' + k.label + '</div><div class="kpi-value">' + k.value + '</div><div class="kpi-sub">' + k.sub + "</div></div>";
      }).join("") + "</div>" +

      '<div class="panel"><div class="panel-head"><h2>Spend by platform</h2><span class="muted">active campaigns</span></div>' +
      '<div class="bars">' + Object.keys(byPf).map(function (p) {
        const pct = Math.round(100 * byPf[p] / (spend || 1));
        return '<div class="bar-row"><span class="bar-label">' + p + '</span><span class="bar-track"><i style="width:' + pct + '%"></i></span><span class="bar-val">' + fmtMoney(byPf[p]) + "</span></div>";
      }).join("") + "</div></div>" +

      '<div class="panel"><div class="panel-head"><h2>All campaigns</h2><span class="muted">what is running, where, for how long, at what spend</span></div>' +
      '<div class="tbl-scroll"><table class="tbl"><thead><tr><th>Campaign</th><th>Platform</th><th>Status</th><th>Duration</th><th>Budget</th><th>Spend</th><th>CTR</th><th>CPC</th><th>Leads</th></tr></thead><tbody>' +
      ads.map(function (a) {
        const ctr = a.impressions ? (100 * a.clicks / a.impressions).toFixed(1) + "%" : "—";
        const cpc = a.clicks ? "$" + (a.spend / a.clicks).toFixed(2) : "—";
        return "<tr><td><strong>" + esc(a.name) + "</strong></td><td>" + esc(a.platform) + "</td>" +
          '<td><span class="pill ' + stCls[a.status] + '">' + a.status + "</span></td>" +
          "<td class='sm'>" + adRuntime(a) + "</td>" +
          "<td>" + fmtMoney(a.budget) + "</td><td><strong>" + fmtMoney(a.spend) + "</strong></td>" +
          "<td>" + ctr + "</td><td>" + cpc + "</td><td>" + a.conversions + "</td></tr>";
      }).join("") + "</tbody></table></div></div>" +

      '<p class="footnote">' + liveNote("Google Ads, Meta and LinkedIn ad accounts", "ads") + "</p>";
  }

  /* ---------------- site analytics ---------------- */

  function liveNote(what, key) {
    return (db.state.live && db.state.live[key])
      ? "Live data — last synced " + new Date(db.state.liveSyncedAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) + "."
      : "Demo data. To go live: authorize the " + what + " (via the Windsor.ai connector), and a scheduled job will refresh <span class='mono'>/dashboard/live-data.json</span> — this view picks it up automatically.";
  }

  function barList(rows, labelKey, valKey) {
    const max = Math.max.apply(null, rows.map(function (r) { return r[valKey]; })) || 1;
    const total = rows.reduce(function (a, r) { return a + r[valKey]; }, 0) || 1;
    return '<div class="bars">' + rows.map(function (r) {
      return '<div class="bar-row"><span class="bar-label" title="' + esc(r[labelKey]) + '">' + esc(r[labelKey]) +
        '</span><span class="bar-track"><i style="width:' + Math.round(100 * r[valKey] / max) + '%"></i></span>' +
        '<span class="bar-val">' + r[valKey].toLocaleString("en-US") + '</span>' +
        '<span class="bar-pct">' + Math.round(100 * r[valKey] / total) + "%</span></div>";
    }).join("") + "</div>";
  }

  const SPLIT_COLORS = ["#35e0a6", "#d9a23c", "#55695f"];
  function splitBar(parts) {
    const total = parts.reduce(function (a, p) { return a + p.value; }, 0) || 1;
    return '<div class="split">' + parts.map(function (p, i) {
      return '<i style="width:' + (100 * p.value / total) + '%;background:' + SPLIT_COLORS[i % 3] + '" title="' + esc(p.label) + ": " + p.value.toLocaleString("en-US") + '"></i>';
    }).join("") + "</div>" +
    '<div class="split-legend">' + parts.map(function (p, i) {
      return '<span><i style="background:' + SPLIT_COLORS[i % 3] + '"></i>' + esc(p.label) + " <b>" + Math.round(100 * p.value / total) + "%</b></span>";
    }).join("") + "</div>";
  }

  function renderAnalytics() {
    const an = db.state.analytics;

    // 28-day trend (falls back to the 14-day series if daily28 absent)
    const d28 = an.daily28 || an.daily.map(function (s, i) { return { d: "Day " + (i + 1), s: s }; });
    const maxS = Math.max.apply(null, d28.map(function (x) { return x.s; }));
    const bestDay = d28.reduce(function (a, x) { return x.s > a.s ? x : a; }, d28[0]);

    const returningShare = an.newVsReturning
      ? Math.round(100 * an.newVsReturning.returning / (an.newVsReturning.newSessions + an.newVsReturning.returning)) : null;

    const kpis = [
      { label: "Sessions", value: an.sessions.toLocaleString("en-US"), sub: an.period.toLowerCase() },
      { label: "Users", value: an.users.toLocaleString("en-US"), sub: (an.newUsers || 0).toLocaleString("en-US") + " first-time" },
      { label: "Pageviews", value: (an.pageviews || 0).toLocaleString("en-US"), sub: (an.viewsPerSession || "—") + " per session" },
      { label: "Engagement rate", value: an.engagementRate + "%", sub: "avg " + an.avgEngagement + " on site" },
      { label: "Bounce rate", value: (an.bounceRate || 100 - an.engagementRate) + "%", sub: "left without engaging" },
      { label: "Engaged sessions", value: (an.engagedSessions || 0).toLocaleString("en-US"), sub: "10s+, or 2+ pages" },
      { label: "Returning visitors", value: returningShare !== null ? returningShare + "%" : "—", sub: "of identified sessions" },
      { label: "Enquiries", value: an.enquiries, sub: an.enquiries === 0 ? "⚠ no key events set in GA4" : "contact / quote forms" }
    ];

    main.innerHTML =
      '<div class="kpis">' + kpis.map(function (k) {
        return '<div class="kpi"><div class="kpi-label">' + k.label + '</div><div class="kpi-value">' + k.value + '</div><div class="kpi-sub">' + k.sub + "</div></div>";
      }).join("") + "</div>" +

      /* ---- daily trend ---- */
      '<div class="panel"><div class="panel-head"><h2>Daily sessions</h2><span class="muted">' + an.period.toLowerCase() +
      " · best day " + esc(bestDay.d) + " (" + bestDay.s + ")</span></div>" +
      '<div class="trend">' + d28.map(function (x) {
        return '<i style="height:' + Math.max(3, Math.round(100 * x.s / maxS)) + '%"' + (x.s === maxS ? ' class="peak"' : "") +
          ' title="' + esc(x.d) + ": " + x.s + ' sessions"></i>';
      }).join("") + "</div>" +
      '<div class="axis"><span>' + esc(d28[0].d) + "</span><span>" + esc(d28[Math.floor(d28.length / 2)].d) + "</span><span>" + esc(d28[d28.length - 1].d) + "</span></div></div>" +

      /* ---- audience: devices / loyalty / browsers ---- */
      '<div class="cols-3">' +
      '<div class="panel"><div class="panel-head"><h2>Devices</h2></div>' +
      splitBar((an.devices || []).map(function (d) { return { label: d.name, value: d.sessions }; })) + "</div>" +
      '<div class="panel"><div class="panel-head"><h2>New vs returning</h2></div>' +
      (an.newVsReturning
        ? splitBar([{ label: "New visitors", value: an.newVsReturning.newSessions }, { label: "Returning", value: an.newVsReturning.returning }])
        : '<p class="empty">—</p>') + "</div>" +
      '<div class="panel"><div class="panel-head"><h2>Browsers</h2></div>' + barList((an.browsers || []).slice(0, 5), "name", "sessions") + "</div>" +
      "</div>" +

      /* ---- acquisition ---- */
      '<div class="cols-2">' +
      '<div class="panel"><div class="panel-head"><h2>Traffic channels</h2><span class="muted">how people arrive</span></div>' +
      barList(an.sources, "name", "sessions") + "</div>" +
      '<div class="panel"><div class="panel-head"><h2>Top sources</h2><span class="muted">source / medium detail</span></div>' +
      barList((an.sourceMedium || []).slice(0, 8), "name", "sessions") + "</div>" +
      "</div>" +

      /* ---- AI referrals callout ---- */
      (an.aiReferrals && an.aiReferrals.total
        ? '<div class="panel ai-panel"><span class="dataline"><i></i>AI assistants are recommending you</span>' +
          '<p class="ai-text"><strong>' + an.aiReferrals.total + " sessions</strong> arrived from AI tools " + an.period.toLowerCase() + " — " +
          an.aiReferrals.list.map(function (a) { return esc(a.name) + " " + a.sessions; }).join(" · ") +
          ". These visitors found you through AI answers, a channel worth nurturing.</p></div>"
        : "") +

      /* ---- content ---- */
      '<div class="cols-2">' +
      '<div class="panel"><div class="panel-head"><h2>Top pages</h2><span class="muted">by views</span></div>' +
      barList(an.topPages.slice(0, 10), "path", "views") + "</div>" +
      '<div class="panel"><div class="panel-head"><h2>Landing pages</h2><span class="muted">first page of the visit</span></div>' +
      barList((an.landingPages || []).slice(0, 10), "path", "sessions") + "</div>" +
      "</div>" +

      /* ---- geography ---- */
      '<div class="cols-2">' +
      '<div class="panel"><div class="panel-head"><h2>Countries</h2></div>' + barList((an.countries || []).slice(0, 8), "name", "sessions") + "</div>" +
      '<div class="panel"><div class="panel-head"><h2>Cities</h2></div>' + barList((an.cities || []).slice(0, 8), "name", "sessions") + "</div>" +
      "</div>" +

      /* ---- time of day ---- */
      (an.hourly
        ? '<div class="panel"><div class="panel-head"><h2>Time of day</h2><span class="muted">sessions by hour · property time</span></div>' +
          '<div class="trend trend-hours">' + an.hourly.map(function (v, h) {
            const maxH = Math.max.apply(null, an.hourly);
            return '<i style="height:' + Math.max(3, Math.round(100 * v / maxH)) + '%" title="' + String(h).padStart(2, "0") + ':00 — ' + v.toLocaleString("en-US") + ' sessions"></i>';
          }).join("") + "</div>" +
          '<div class="axis"><span>00:00</span><span>06:00</span><span>12:00</span><span>18:00</span><span>23:00</span></div></div>'
        : "") +

      '<p class="footnote">' + liveNote("GA4 property for greenspaceherbs.com", "analytics") + "</p>";
  }

  /* ---------------- R&D ---------------- */

  function renderRnd() {
    const badge = { on_track: ["On track", "ok"], at_risk: ["At risk", "warn"], behind: ["Behind", "danger"] };
    main.innerHTML =
      '<div class="panel-head loose"><h2>Active R&amp;D projects</h2><span class="muted">' + db.state.rnd.length + " in development</span></div>" +
      '<div class="cards">' + db.state.rnd.map(function (r) {
        const overdue = r.due < todayStr() && r.status !== "on_track";
        return '<div class="card"><div class="card-top"><h3>' + esc(r.name) + '</h3><span class="pill ' + badge[r.status][1] + '">' + badge[r.status][0] + "</span></div>" +
          '<div class="gates">' + RND_STAGES.map(function (s, i) {
            return '<div class="gate' + (i < r.stage ? " done" : i === r.stage ? " now" : "") + '"><i></i><span>' + s + "</span></div>";
          }).join("") + "</div>" +
          '<dl class="meta"><dt>Owner</dt><dd>' + esc(r.owner) + "</dd>" +
          "<dt>Next milestone</dt><dd>" + esc(r.milestone) + "</dd>" +
          "<dt>Due</dt><dd" + (overdue ? ' class="late"' : "") + ">" + fmtDate(r.due) + (overdue ? " · overdue" : "") + "</dd></dl>" +
          '<p class="muted sm">' + esc(r.notes) + "</p></div>";
      }).join("") + "</div>";
  }

  /* ---------------- QC ---------------- */

  function renderQc() {
    const st = db.state.qc;
    const res = { pass: ["Pass", "ok"], pending: ["Pending", "warn"], fail: ["Fail", "danger"] };
    main.innerHTML =
      '<div class="panel"><div class="panel-head"><h2>Batch testing</h2><span class="muted">' +
      st.batches.filter(function (b) { return b.result === "pending"; }).length + " awaiting results</span></div>" +
      '<div class="tbl-scroll"><table class="tbl"><thead><tr><th>Product</th><th>Batch</th><th>Test</th><th>Date</th><th>Result</th><th>COA</th></tr></thead><tbody>' +
      st.batches.map(function (b) {
        return "<tr><td>" + esc(b.product) + "</td><td class='mono'>" + esc(b.batch) + "</td><td>" + esc(b.test) + "</td><td>" + fmtDate(b.date) +
          '</td><td><span class="pill ' + res[b.result][1] + '">' + res[b.result][0] + "</span></td>" +
          "<td>" + (b.coa ? '<span class="muted">on file</span>' : "—") + "</td></tr>";
      }).join("") + "</tbody></table></div></div>" +

      '<div class="panel"><div class="panel-head"><h2>Deviations</h2></div><ul class="attn">' +
      st.deviations.map(function (d) {
        return '<li class="attn-item static"><span class="pill ' + (d.severity === "major" ? "danger" : "warn") + '">' + d.severity + "</span><span>" + esc(d.desc) +
          '</span><span class="muted">' + fmtDate(d.date) + " · " + d.status + "</span></li>";
      }).join("") + "</ul></div>" +
      '<p class="footnote">QC is phase 4 — this view is a scaffold. COA PDF extraction and anomaly flags land with the AI layer.</p>';
  }

  /* ---------------- audit trail ---------------- */

  function renderAudit() {
    main.innerHTML =
      '<div class="panel"><div class="panel-head"><h2>Audit trail</h2><span class="muted">every approval, override and change — recorded</span></div>' +
      '<div class="tbl-scroll"><table class="tbl"><thead><tr><th>When</th><th>Who</th><th>Action</th><th>Detail</th></tr></thead><tbody>' +
      db.state.audit.map(function (a) {
        return "<tr><td class='mono sm'>" + new Date(a.ts).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) +
          "</td><td><strong>" + esc(a.user) + "</strong></td><td>" + esc(a.action) + "</td><td class='muted'>" + esc(a.detail) + "</td></tr>";
      }).join("") + "</tbody></table></div></div>";
  }

  /* ---------------- J.A.R.V.I.S fx ---------------- */

  const reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function typeGreeting(decisions) {
    const el = document.getElementById("greetLine");
    if (!el) return;
    const h = new Date().getHours();
    const tod = h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
    const pending = decisions != null ? decisions : pendingForRole().length;
    const qcOpen = db.state.qc.deviations.filter(function (d) { return d.status === "open"; }).length;
    const bits = [];
    bits.push(pending ? pending + (pending === 1 ? " item needs" : " items need") + " your attention" : "nothing needs your attention");
    if (qcOpen) bits.push(qcOpen + " QC deviation open");
    bits.push(db.state.live && db.state.live.analytics ? "telemetry live" : "telemetry in demo mode");
    const msg = tod + ", " + myName() + ". " + bits.join(" · ") + ".";
    if (reduceMotion) { el.textContent = msg; return; }
    el.textContent = "";
    let i = 0;
    clearInterval(typeGreeting._t);
    typeGreeting._t = setInterval(function () {
      el.textContent = msg.slice(0, ++i);
      if (i >= msg.length) clearInterval(typeGreeting._t);
    }, 16);
  }

  function revealPanels() {
    if (reduceMotion) return;
    let i = 0;
    main.querySelectorAll(".panel, .kpi, .cc-ribbon, .stage").forEach(function (el) {
      el.style.animationDelay = Math.min(i++ * 40, 600) + "ms";
      el.classList.add("reveal");
    });
  }

  function countUp() {
    if (reduceMotion) return;
    main.querySelectorAll(".kpi-value, .pipe-node b, .stage-count").forEach(function (el) {
      const raw = el.textContent.trim();
      const m = raw.match(/^([$]?)([\d,]+)(%?)$/);
      if (!m) return;
      const target = parseInt(m[2].replace(/,/g, ""), 10);
      if (!isFinite(target) || target === 0) return;
      const t0 = performance.now(), dur = 700;
      function tick(t) {
        const p = Math.min(1, (t - t0) / dur);
        const eased = 1 - Math.pow(1 - p, 3);
        el.textContent = m[1] + Math.round(target * eased).toLocaleString("en-US") + m[3];
        if (p < 1) requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);
    });
  }

  /* ---------------- shell ---------------- */

  const views = {
    overview: renderOverview, content: renderContent, sales: renderSales,
    ads: renderAds, analytics: renderAnalytics,
    rnd: renderRnd, qc: renderQc, audit: renderAudit
  };

  function render() {
    views[view]();
    const animate = render._last !== view;   // animate on view switches, not on inline edits
    render._last = view;
    if (animate) { revealPanels(); countUp(); }
  }

  function setView(v) {
    const changed = view !== v;
    view = v;
    document.querySelectorAll(".nav-item").forEach(function (b) {
      b.classList.toggle("active", b.dataset.view === v);
    });
    render();
    if (changed && window.GSFX) window.GSFX.warp();   // swarm re-folds on course change
  }

  document.querySelectorAll(".nav-item").forEach(function (b) {
    b.addEventListener("click", function () { setView(b.dataset.view); });
  });

  // brand mark = home: back to the first view this role is allowed to see
  const brand = document.getElementById("brandHome");
  if (brand) {
    function goHome() { setView(allowedViews()[0]); window.scrollTo({ top: 0 }); }
    brand.addEventListener("click", goHome);
    brand.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); goHome(); } });
  }

  $("#roleSelect").addEventListener("change", function (e) {
    role = e.target.value;
    applyRoleNav();
    refreshBadges();
    render();
    toast("Now acting as " + e.target.selectedOptions[0].textContent.trim());
  });

  $("#resetData").addEventListener("click", function () {
    if (!confirm("Reset the dashboard to the demo seed data?")) return;
    db.reset();
    refreshBadges();
    render();
    toast("Demo data restored.");
  });

  /* scroll-progress rail */
  (function rail() {
    const fill = document.getElementById("railFill"), pct = document.getElementById("railPct");
    if (!fill) return;
    let ticking = false;
    function update() {
      ticking = false;
      const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      const p = Math.min(1, window.scrollY / max);
      fill.style.transform = "scaleY(" + p + ")";
      pct.textContent = Math.round(p * 100) + "%";
    }
    addEventListener("scroll", function () {
      if (!ticking) { ticking = true; requestAnimationFrame(update); }
    }, { passive: true });
    update();
  })();

  applyRoleNav();
  refreshBadges();
  render();
  db.loadLive(function () { refreshBadges(); render(); });

  /* ---- boot sequence: once per browser session, always skippable ---- */
  (function bootSeq() {
    const el = document.getElementById("boot");
    if (!el) return;
    let seen = false;
    try { seen = !!sessionStorage.getItem("gs_boot"); } catch (e) {}
    if (seen || reduceMotion) { el.remove(); return; }
    try { sessionStorage.setItem("gs_boot", "1"); } catch (e) {}
    const log = document.getElementById("bootLog");
    const live = db.state.live || {};
    const lines = [
      "QUANTUM COMMAND CENTRE v2.0",
      "INTERNAL SYSTEMS",
      "approval engine ........ [ONLINE]",
      "sales pipeline ......... [ONLINE]",
      "GA4 telemetry .......... " + (live.analytics ? "[LIVE]" : "[DEMO]"),
      "ads monitor ............ " + (live.ads ? "[LIVE]" : "[DEMO]"),
      "audit trail ............ [ARMED]",
      "welcome."
    ];
    let li = 0, timer;
    function finish() { el.classList.add("done"); setTimeout(function () { el.remove(); }, 500); }
    function next() {
      if (li >= lines.length) { timer = setTimeout(finish, 400); return; }
      const line = lines[li++];
      log.innerHTML += line.replace(/\[(.+)\]/, '[<span class="ok">$1</span>]') + "\n";
      timer = setTimeout(next, li <= 2 ? 240 : 140);
    }
    el.addEventListener("click", function () { clearTimeout(timer); finish(); });
    next();
  })();
})();
