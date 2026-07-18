/* GreenSpace Command — data layer.
   v2 keeps everything in localStorage so the dashboard is fully usable with no
   backend. Every mutation goes through GSDB so the storage can be swapped for
   a real API/database later without touching the UI code.

   Approval model: every piece of content needs three parallel sign-offs —
     science  · Tahira · scientific accuracy & claims
     design   · Amar   · content design & language
     overall  · Shafi  · overall (CEO)
   All three approved -> approved. Amar can bypass outstanding reviews. */

(function () {
  const KEY = "gs_dash_v3";

  const REVIEWERS = [
    { key: "science", person: "Tahira", scope: "Scientific accuracy & claims" },
    { key: "design",  person: "Amar",   scope: "Content design & language" },
    { key: "overall", person: "Shafi",  scope: "Overall approval (CEO)" }
  ];

  const ROLE_NAMES = {
    shafi: "Shafi (CEO)", amar: "Amar", tahira: "Tahira",
    jamila: "Jamila (PM)", priya: "Priya", rahul: "Rahul", viewer: "Viewer"
  };
  const ROLE_REVIEW_KEY = { tahira: "science", amar: "design", shafi: "overall" };

  function appr(science, design, overall) {
    return { science: science, design: design, overall: overall };
  }
  const A = "approved", P = "pending", X = "changes";

  const seed = {
    meta: { version: 2, company: "GreenSpace Herbs" },

    content: [
      { id: "c1",  title: "AshwagandhaQA™ sleep study recap",      platform: "instagram", date: "2026-07-02", status: "published", owner: "Priya", brief: "Carousel: 3 findings from the bioavailability study.", link: "https://drive.google.com/file/d/1aQ-ashwa-carousel/view", approvals: appr(A, A, A) },
      { id: "c2",  title: "Berberine mechanism explainer",         platform: "website",   date: "2026-07-03", status: "published", owner: "Rahul", brief: "Long-form blog, links to BerberineQA product page.", link: "https://drive.google.com/file/d/1bB-berberine-blog/view", approvals: appr(A, A, A) },
      { id: "c3",  title: "July newsletter — Quantum Ayurveda",    platform: "email",     date: "2026-07-08", status: "published", owner: "Priya", brief: "Monthly digest: new research page + EASI line.", link: "https://drive.google.com/file/d/1cJ-july-newsletter/view", approvals: appr(A, A, A) },
      { id: "c4",  title: "CurcuminQA turmeric sourcing reel",     platform: "instagram", date: "2026-07-11", status: "in_review", owner: "Priya", brief: "30s reel from farm footage.", link: "https://drive.google.com/file/d/1dC-curcumin-reel/view", approvals: appr(A, A, P) },
      { id: "c5",  title: "EASI-Fuse technology deep-dive",        platform: "linkedin",  date: "2026-07-14", status: "in_review", owner: "Rahul", brief: "B2B post targeting formulators, links to EASI page.", link: "https://drive.google.com/file/d/1eE-easifuse-post/view", approvals: appr(A, P, P) },
      { id: "c6",  title: "Ayurveda Science page launch video",    platform: "youtube",   date: "2026-07-16", status: "draft",     owner: "Dev",   brief: "2 min explainer for the redesigned science section.", link: "", approvals: appr(P, P, P) },
      { id: "c7",  title: "AyuQuanta-7 teaser post",               platform: "instagram", date: "2026-07-18", status: "in_review", owner: "Priya", brief: "Teaser #1 of 3 for the AyuQuanta-7 announcement.", link: "https://drive.google.com/file/d/1fA-aq7-teaser1/view", approvals: appr(P, P, P) },
      { id: "c8",  title: "Distributor case study — SE Asia",      platform: "linkedin",  date: "2026-07-21", status: "draft",     owner: "Rahul", brief: "Needs sign-off from partner before publishing.", link: "https://drive.google.com/file/d/1gD-distributor-case/view", approvals: appr(P, P, P) },
      { id: "c9",  title: "Herbal extracts catalogue refresh",     platform: "website",   date: "2026-07-23", status: "approved",  owner: "Dev",   brief: "Updated botanical extracts landing page.", link: "https://drive.google.com/file/d/1hH-catalogue-v3/view", approvals: appr(A, A, A) },
      { id: "c10", title: "Founder Q&A — quantum + tradition",     platform: "youtube",   date: "2026-07-27", status: "draft",     owner: "Priya", brief: "Long-form interview, cut into shorts later.", link: "", approvals: appr(P, P, P) },
      { id: "c11", title: "August pre-launch email — AyuQuanta-7", platform: "email",     date: "2026-07-30", status: "in_review", owner: "Priya", brief: "Waitlist warm-up for the launch.", link: "https://drive.google.com/file/d/1iA-aq7-email/view", approvals: appr(A, P, P) },
      { id: "c12", title: "Careers spotlight — R&D team",          platform: "linkedin",  date: "2026-07-09", status: "changes",   owner: "Dev",   brief: "Photo post for hiring push.", link: "https://drive.google.com/file/d/1jC-careers-photos/view", approvals: appr(P, X, P), changeNote: "Wrong batch of photos — reshoot with lab PPE on.", changeBy: "Amar" }
    ],

    leads: [
      { id: "l1",  company: "NutraBlend GmbH",       contact: "S. Weber",    source: "gmail",    product: "AshwagandhaQA™", stage: "negotiation", temp: "hot",  value: 48000, owner: "Gautham", region: "EU",    lastContact: "2026-07-09", notes: "Waiting on revised MOQ pricing." },
      { id: "l2",  company: "VedaLife Supplements",  contact: "A. Sharma",   source: "crm",      product: "CurcuminQA",     stage: "sample",      temp: "hot",  value: 32000, owner: "Meera",   region: "India", lastContact: "2026-07-08", notes: "Samples shipped 07-05, follow up on assay report." },
      { id: "l3",  company: "Pacific Nutraceuticals",contact: "J. Tanaka",   source: "expo",     product: "EASI-Fuse",      stage: "qualified",   temp: "warm", value: 75000, owner: "Gautham", region: "APAC",  lastContact: "2026-07-01", notes: "Met at Vitafoods. Wants stability data." },
      { id: "l4",  company: "HerbCore Labs",         contact: "M. Ortiz",    source: "website",  product: "Berberine",      stage: "contacted",   temp: "warm", value: 18000, owner: "Meera",   region: "US",    lastContact: "2026-06-28", notes: "Asked for COA + spec sheet." },
      { id: "l5",  company: "Zenith Wellness",       contact: "R. Patel",    source: "gmail",    product: "AyuQuanta-7",    stage: "new",         temp: "warm", value: 25000, owner: "Gautham", region: "India", lastContact: "2026-07-10", notes: "Inbound from newsletter, pre-launch interest." },
      { id: "l6",  company: "BioVeda Inc",           contact: "K. Nair",     source: "crm",      product: "AshwagandhaQA™", stage: "won",         temp: "hot",  value: 56000, owner: "Meera",   region: "US",    lastContact: "2026-07-06", notes: "PO received. Onboarding QC docs." },
      { id: "l7",  company: "GreenLeaf Trading",     contact: "T. Chen",     source: "referral", product: "Botanical extracts", stage: "qualified", temp: "cold", value: 12000, owner: "Gautham", region: "APAC", lastContact: "2026-06-19", notes: "Went quiet after pricing call." },
      { id: "l8",  company: "Solaris Health",        contact: "D. Kim",      source: "website",  product: "CurcuminQA",     stage: "contacted",   temp: "cold", value: 15000, owner: "Meera",   region: "US",    lastContact: "2026-06-22", notes: "Comparing against two other suppliers." },
      { id: "l9",  company: "Aurum Botanicals",      contact: "L. Rossi",    source: "expo",     product: "EASI",           stage: "sample",      temp: "warm", value: 40000, owner: "Gautham", region: "EU",    lastContact: "2026-07-04", notes: "Sample batch in transit." },
      { id: "l10", company: "PrimeVita",             contact: "N. Gupta",    source: "gmail",    product: "Berberine",      stage: "lost",        temp: "cold", value: 20000, owner: "Meera",   region: "India", lastContact: "2026-06-15", notes: "Chose competitor on price." }
    ],

    rnd: [
      { id: "r1", name: "AyuQuanta-7 formulation",        stage: 4, owner: "Dr. Iyer",  milestone: "Pilot batch stability report", due: "2026-07-20", status: "on_track", notes: "3-month accelerated stability at 90%." },
      { id: "r2", name: "AshwagandhaQA™ gummy format",    stage: 2, owner: "Dr. Rao",   milestone: "Excipient compatibility screen", due: "2026-07-15", status: "at_risk",  notes: "Withanolide degradation in two binder systems." },
      { id: "r3", name: "Berberine liposomal upgrade",    stage: 3, owner: "Dr. Iyer",  milestone: "In-vitro dissolution study", due: "2026-08-05", status: "on_track", notes: "Targeting 4x bioavailability vs standard." },
      { id: "r4", name: "Boswellia water-dispersible",    stage: 1, owner: "Dr. Rao",   milestone: "Literature review + patent scan", due: "2026-07-12", status: "behind",   notes: "Patent scan blocked on external counsel." },
      { id: "r5", name: "EASI-Fuse second generation",    stage: 5, owner: "Dr. Iyer",  milestone: "Scale-up run at 200kg", due: "2026-08-18", status: "on_track", notes: "Tech transfer doc in progress." },
      { id: "r6", name: "Brahmi nootropic complex",       stage: 2, owner: "Dr. Menon", milestone: "Bacoside standardisation method", due: "2026-07-28", status: "on_track", notes: "HPLC method 80% validated." }
    ],

    qc: {
      batches: [
        { id: "b1", product: "AshwagandhaQA™", batch: "AQ-2607-14", test: "Assay (withanolides)", result: "pass",    date: "2026-07-08", coa: true },
        { id: "b2", product: "CurcuminQA",     batch: "CQ-2607-09", test: "Heavy metals",         result: "pass",    date: "2026-07-07", coa: true },
        { id: "b3", product: "Berberine",      batch: "BB-2607-03", test: "Microbial limits",     result: "pending", date: "2026-07-10", coa: false },
        { id: "b4", product: "EASI-Fuse",      batch: "EF-2606-21", test: "Assay (curcuminoids)", result: "pass",    date: "2026-07-02", coa: true },
        { id: "b5", product: "Boswellia",      batch: "BW-2607-01", test: "Residual solvents",    result: "fail",    date: "2026-07-06", coa: false },
        { id: "b6", product: "AshwagandhaQA™", batch: "AQ-2607-15", test: "Microbial limits",     result: "pending", date: "2026-07-09", coa: false }
      ],
      deviations: [
        { id: "d1", desc: "BW-2607-01 residual ethanol above spec — batch quarantined", severity: "major", status: "open",   date: "2026-07-06" },
        { id: "d2", desc: "Label misprint on CQ-2606 retail run — relabelled",          severity: "minor", status: "closed", date: "2026-06-24" }
      ]
    },

    /* Ad campaigns — shaped like the Google Ads / Meta / LinkedIn exports so the
       live connector can drop straight into the same fields. */
    ads: [
      { id: "a1", name: "AshwagandhaQA™ — Search (US/EU)",   platform: "Google Ads", status: "active",    start: "2026-06-15", end: "2026-08-15", budget: 4500, spend: 2870, impressions: 182000, clicks: 3420, conversions: 61 },
      { id: "a2", name: "CurcuminQA launch — Feed + Reels",  platform: "Meta",       status: "active",    start: "2026-07-01", end: "2026-07-31", budget: 3000, spend: 1240, impressions: 410000, clicks: 5900, conversions: 38 },
      { id: "a3", name: "EASI-Fuse B2B formulators",         platform: "LinkedIn",   status: "active",    start: "2026-07-05", end: "2026-08-05", budget: 2200, spend: 610,  impressions: 58000,  clicks: 720,  conversions: 12 },
      { id: "a4", name: "Brand search defence",              platform: "Google Ads", status: "active",    start: "2026-05-01", end: "2026-08-31", budget: 1800, spend: 940,  impressions: 44000,  clicks: 1810, conversions: 25 },
      { id: "a5", name: "AyuQuanta-7 teaser boost",          platform: "Instagram",  status: "scheduled", start: "2026-07-18", end: "2026-07-28", budget: 900,  spend: 0,    impressions: 0,      clicks: 0,    conversions: 0 },
      { id: "a6", name: "Berberine retargeting — June",      platform: "Meta",       status: "ended",     start: "2026-06-01", end: "2026-06-30", budget: 1500, spend: 1500, impressions: 260000, clicks: 4100, conversions: 29 }
    ],

    /* Site analytics — GA4-shaped (last 28 days). Replaced by live GA4 data
       once the property is connected. */
    analytics: {
      period: "Last 28 days",
      sessions: 24680, users: 19340, newUsers: 16210, engagementRate: 61, bounceRate: 39,
      enquiries: 87, avgEngagement: "1m 42s", pageviews: 41200, viewsPerSession: 1.7, engagedSessions: 15050,
      topPages: [
        { path: "/ (home)",                    views: 6420 },
        { path: "/ashwagandhaqa",              views: 3910 },
        { path: "/research-and-science",       views: 2730 },
        { path: "/products/botanical-extracts",views: 2140 },
        { path: "/berberineqa",                views: 1820 },
        { path: "/blog",                       views: 1390 }
      ],
      landingPages: [
        { path: "/ (home)",       sessions: 9100 },
        { path: "/ashwagandhaqa", sessions: 3200 },
        { path: "/blog",          sessions: 2100 },
        { path: "/contact-us",    sessions: 1400 }
      ],
      sources: [
        { name: "Organic search", sessions: 11200 },
        { name: "Direct",         sessions: 5300 },
        { name: "Social",         sessions: 3600 },
        { name: "Referral",       sessions: 2400 },
        { name: "Paid ads",       sessions: 1330 },
        { name: "Email",          sessions: 850 }
      ],
      sourceMedium: [
        { name: "google / organic",   sessions: 10400 },
        { name: "(direct) / (none)",  sessions: 5300 },
        { name: "instagram / social", sessions: 2900 },
        { name: "bing / organic",     sessions: 800 }
      ],
      aiReferrals: { total: 120, list: [
        { name: "ChatGPT", sessions: 80 }, { name: "Claude", sessions: 24 },
        { name: "Gemini", sessions: 10 }, { name: "Perplexity", sessions: 6 }
      ] },
      countries: [
        { name: "India", sessions: 14200 }, { name: "United States", sessions: 4100 },
        { name: "Singapore", sessions: 1900 }, { name: "Germany", sessions: 1200 }
      ],
      cities: [
        { name: "Bengaluru", sessions: 5200 }, { name: "Mumbai", sessions: 2400 },
        { name: "Singapore", sessions: 1900 }, { name: "New York", sessions: 900 }
      ],
      devices: [
        { name: "Desktop", sessions: 15800 }, { name: "Mobile", sessions: 8500 }, { name: "Tablet", sessions: 380 }
      ],
      browsers: [
        { name: "Chrome", sessions: 19100 }, { name: "Safari", sessions: 3200 },
        { name: "Edge", sessions: 1400 }, { name: "Firefox", sessions: 600 }
      ],
      newVsReturning: { newSessions: 16800, returning: 7880 },
      hourly: [310,260,240,220,230,280,420,610,880,1150,1380,1460,1420,1350,1440,1500,1390,1280,1050,920,860,720,540,400],
      daily28: null,
      daily: [720, 810, 890, 760, 940, 1010, 870, 790, 980, 1090, 930, 860, 1120, 1040]
    },

    audit: [
      { ts: "2026-07-09T11:20:00", user: "Amar",        role: "amar",   action: "Approved design & language", detail: "CurcuminQA turmeric sourcing reel" },
      { ts: "2026-07-09T09:45:00", user: "Tahira",      role: "tahira", action: "Approved science & claims",  detail: "CurcuminQA turmeric sourcing reel" },
      { ts: "2026-07-08T10:12:00", user: "Shafi (CEO)", role: "shafi",  action: "Approved overall",           detail: "July newsletter — Quantum Ayurveda" },
      { ts: "2026-07-06T09:05:00", user: "Amar",        role: "amar",   action: "Requested changes",          detail: "Careers spotlight — R&D team: wrong photos" }
    ]
  };

  let state = null;

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) { state = JSON.parse(raw); return state; }
    } catch (e) { /* corrupt storage — fall through to seed */ }
    state = JSON.parse(JSON.stringify(seed));
    save();
    return state;
  }

  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {}
  }

  function reset() {
    localStorage.removeItem(KEY);
    return load();
  }

  /* Live-data drop-in: a scheduled job (Windsor.ai / Google Ads / GA4 export)
     writes /dashboard/live-data.json — if present, it overrides the demo
     ads + analytics blocks. The UI never needs to know the difference. */
  function loadLive(cb) {
    try {
      fetch("/dashboard/live-data.json", { cache: "no-store" })
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (d) {
          if (!d) return;
          if (d.ads) state.ads = d.ads;
          if (d.analytics) state.analytics = d.analytics;
          if (d.leads) state.leads = d.leads;   // Zoho CRM export
          if (d.zohoOrgId) state.zohoOrgId = d.zohoOrgId;
          state.live = { ads: !!d.ads, analytics: !!d.analytics, leads: !!d.leads };
          state.liveSyncedAt = d.syncedAt || new Date().toISOString();
          save();
          if (cb) cb(true);
        })
        .catch(function () {});
    } catch (e) {}
  }

  function roleName(role) { return ROLE_NAMES[role] || role; }

  function audit(role, action, detail) {
    state.audit.unshift({ ts: new Date().toISOString(), user: roleName(role), role: role, action: action, detail: detail });
    if (state.audit.length > 200) state.audit.length = 200;
    save();
  }

  function approvedCount(item) {
    return REVIEWERS.filter(function (r) { return item.approvals[r.key] === "approved"; }).length;
  }

  /* ---- content approval engine ----
     draft -> in_review (3 parallel sign-offs) -> approved -> published
     any reviewer can request changes -> changes -> resubmit -> in_review
     Amar can bypass outstanding reviews at any point before publish. */
  const contentActions = {
    submit(item, role) {
      item.status = "in_review";
      audit(role, "Submitted for review", item.title);
    },
    review(item, role, key, decision, note) {
      const reviewer = REVIEWERS.find(function (r) { return r.key === key; });
      if (decision === "approved") {
        item.approvals[key] = "approved";
        audit(role, "Approved " + reviewer.scope.toLowerCase(), item.title);
        if (approvedCount(item) === REVIEWERS.length) {
          item.status = "approved";
          delete item.changeNote; delete item.changeBy;
          audit(role, "All reviews complete — approved", item.title);
        }
      } else {
        item.approvals[key] = "changes";
        item.status = "changes";
        item.changeNote = note || "";
        item.changeBy = reviewer.person;
        audit(role, "Requested changes", item.title + (note ? ": " + note : ""));
      }
    },
    resubmit(item, role) {
      REVIEWERS.forEach(function (r) {
        if (item.approvals[r.key] === "changes") item.approvals[r.key] = "pending";
      });
      item.status = "in_review";
      delete item.changeNote; delete item.changeBy;
      audit(role, "Resubmitted for review", item.title);
    },
    bypass(item, role) {
      item.status = "approved";
      item.bypassed = true;
      delete item.changeNote; delete item.changeBy;
      audit(role, "OVERRIDE — approved without full review", item.title);
    },
    publish(item, role) {
      item.status = "published";
      audit(role, "Marked published", item.title);
    }
  };

  function addContent(role, data) {
    const item = Object.assign(
      { id: "c" + Date.now(), status: "draft", link: "", approvals: appr(P, P, P) },
      data
    );
    state.content.push(item);
    audit(role, "Created content", item.title);
    save();
    return item;
  }

  function updateLead(role, id, patch, label) {
    const lead = state.leads.find(function (l) { return l.id === id; });
    if (!lead) return;
    Object.assign(lead, patch);
    if (label) audit(role, label, lead.company);
    save();
  }

  function contactedToday(role, id) {
    updateLead(role, id, { lastContact: new Date().toISOString().slice(0, 10) }, "Logged contact");
  }

  window.GSDB = {
    load: load, save: save, reset: reset, loadLive: loadLive,
    get state() { return state; },
    REVIEWERS: REVIEWERS, ROLE_REVIEW_KEY: ROLE_REVIEW_KEY, roleName: roleName,
    approvedCount: approvedCount,
    audit: audit, contentActions: contentActions,
    addContent: addContent, updateLead: updateLead, contactedToday: contactedToday
  };
})();
