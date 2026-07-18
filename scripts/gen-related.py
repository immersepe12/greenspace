#!/usr/bin/env python3
"""Generate content/related.json: per-page "Explore more" internal links.
Sibling rotation within a category + cross-lane bridges (herb->product->pillar),
following docs/seo/keyword-architecture.md. Re-run after adding pages."""
import os, re, json

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
HTML = os.path.join(ROOT, "content", "html")
cfg = json.load(open(os.path.join(ROOT, "content", "build-config.json")))
cats = json.load(open(os.path.join(ROOT, "content", "_categories.json")))
skip = set(cfg["redirectRepos"]) | set(cfg["exclude"])
canon = cfg.get("canonicals", {})

def path(repo):
    return "/" if repo == "__home" else "/" + repo.replace("_", "/") + "/"

def title(repo):
    t = open(os.path.join(HTML, repo + ".html"), encoding="utf-8").read()
    m = re.search(r"<title>(.*?)</title>", t, re.S)
    x = re.sub(r"\s+", " ", m.group(1)).strip() if m else repo
    x = re.split(r"\s[—-]\sGreenSpace|\s\|\s", x)[0].strip()
    return x[:60]

repos = [r for r in cats if r not in skip]
by = {}
for r in repos:
    by.setdefault(cats[r], []).append(r)
for k in by:
    by[k].sort()

# herb -> matching branded product landing
HERB_PRODUCT = {
    "withania-somnifera-ashwagandha": ("/ashwagandhaqaTM/", "AshwagandhaQA™"),
    "gymnema": ("/products/easi/", "EASI™ Energized Actives"),
}
def herb_product(r):
    if r.startswith("withania"): return ("/ashwagandhaqaTM/", "AshwagandhaQA™")
    if "curcum" in r: return ("/curcuminqa/", "CurcuminQA™")
    return None

PILLARS = {
    "botanical": ("/products/botanical-extracts/", "Botanical Extracts"),
    "library": ("/consumer/", "Herb Library"),
    "easi": ("/products/easi/", "EASI™ Energized Actives"),
    "qa": ("/research-and-science/quantum-ayurveda/", "Quantum Ayurveda"),
    "science": ("/research-and-science/science/", "The Science"),
    "blog": ("/blog/", "Blog"),
    "careers": ("/careers/", "Careers"),
}

def siblings(r, cat, n=5):
    lst = by.get(cat, [])
    if r not in lst: return lst[:n]
    i = lst.index(r)
    out = []
    for k in range(1, len(lst)):
        cand = lst[(i + k) % len(lst)]
        if cand != r and cand not in canon:
            out.append(cand)
        if len(out) >= n: break
    return out

def link(repo_or_pair):
    if isinstance(repo_or_pair, tuple):
        return {"href": repo_or_pair[0], "label": repo_or_pair[1]}
    return {"href": path(repo_or_pair), "label": title(repo_or_pair)}

related = {}
for r in repos:
    cat = cats[r]
    if cat in ("HOME", "ARCHIVE"): continue
    items = []
    if cat == "HERB":
        items += [link(s) for s in siblings(r, "HERB", 4)]
        hp = herb_product(r)
        if hp: items.append(link(hp))
        items += [link(PILLARS["botanical"]), link(PILLARS["library"])]
    elif cat == "PRODUCT":
        items += [link(s) for s in siblings(r, "PRODUCT", 4)]
        items += [link(PILLARS["easi"]), link(PILLARS["qa"]), link(PILLARS["science"])]
    elif cat == "SCIENCE":
        items += [link(s) for s in siblings(r, "SCIENCE", 4)]
        items += [link(PILLARS["easi"]), link(PILLARS["botanical"])]
    elif cat == "BLOG":
        items += [link(s) for s in siblings(r, "BLOG", 5)]
        items += [link(PILLARS["blog"]), link(PILLARS["qa"])]
    elif cat == "CAREERS":
        items += [link(s) for s in siblings(r, "CAREERS", 4)]
        items += [link(PILLARS["careers"]), link(("/culture-values/", "Culture & Values"))]
    elif cat == "CORP":
        # hubs/library link into their domain
        if r == "consumer":
            items += [link(s) for s in by["HERB"][:6]] + [link(PILLARS["botanical"])]
        elif r == "hcps":
            items += [link(PILLARS["science"]), link(PILLARS["easi"]), link(PILLARS["qa"]),
                      link(("/products/botanical-extracts/", "Botanical Extracts"))]
        elif r in ("news-media", "news-letter", "blog"):
            items += [link(s) for s in by["BLOG"][:5]] + [link(PILLARS["blog"])]
        else:
            items += [link(("/about/", "About GreenSpace")), link(("/leadership/", "Leadership")),
                      link(PILLARS["qa"]), link(PILLARS["easi"])]
    # de-dupe by href, drop self
    seen, clean = set(), []
    selfp = path(r)
    for it in items:
        if it["href"] == selfp or it["href"] in seen: continue
        seen.add(it["href"]); clean.append(it)
    if clean:
        related[r] = clean[:7]

json.dump(related, open(os.path.join(ROOT, "content", "related.json"), "w"), indent=1)
print(f"related.json: {len(related)} pages with Explore-more links")
