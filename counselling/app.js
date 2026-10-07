// drbull.in/counselling: MCC's rounds beside one state's, round by round (design approved 2026-09-29).
// Each body's rules live in data/<code>.json, written from the verified notes and gated by
// pg_dataset/tools/guide_check_page.py. A state's file is loaded only when it is picked.
(function () {
  "use strict";
  const ROWS = [["r1", "Round 1"], ["r2", "Round 2"], ["r3", "Round 3"], ["stray", "Stray round"], ["after", "After counselling"]];
  const ALL22 = [["AP", "Andhra Pradesh"], ["AS", "Assam"], ["BR", "Bihar"], ["CG", "Chhattisgarh"], ["GA", "Goa"], ["GJ", "Gujarat"],
    ["HR", "Haryana"], ["HP", "Himachal Pradesh"], ["JK", "Jammu & Kashmir"], ["JH", "Jharkhand"], ["KA", "Karnataka"], ["KL", "Kerala"],
    ["MP", "Madhya Pradesh"], ["MH", "Maharashtra"], ["OD", "Odisha"], ["PY", "Puducherry"], ["PB", "Punjab"], ["RJ", "Rajasthan"],
    ["TN", "Tamil Nadu"], ["TS", "Telangana"], ["TR", "Tripura"], ["WB", "West Bengal"]];
  const READY = ["AP", "AS", "BR", "CG", "GA", "GJ", "HR", "HP", "JK", "JH", "KA", "KL", "MP", "MH", "OD", "PY", "PB", "RJ", "TN", "TS", "TR", "WB"];   // states with a data file; the build list grows state by state
  const $ = (s, r = document) => r.querySelector(s);
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const chip = ([t, tone]) => `<span class="chip ${tone}">${esc(t)}</span>`;
  const cache = {};
  let MCC = null, S = null, current = "HR", open = null;

  function load(code) {
    if (!cache[code]) cache[code] = fetch(`data/${code.toLowerCase()}.json`).then(r => { if (!r.ok) throw new Error(r.status); return r.json(); });
    return cache[code];
  }

  // A reference is "p.49, Q14", or "key: 2.6, p.3" for a body with several documents; parts are joined by ";".
  function refParts(side, ref) {
    const out = [];
    let key = side.doc;
    String(ref || "").split(";").map(x => x.trim()).filter(Boolean).forEach(part => {
      const m = part.match(/^([a-z0-9]+):\s*(.*)$/);
      if (m && side.docs[m[1]]) { key = m[1]; part = m[2]; }
      out.push([key, part]);
    });
    return out;
  }
  function docUrl(doc, part) {
    const p = (part.match(/\bpp?\.\s*(\d+)/) || [])[1];
    return p && /\.pdf$/i.test(doc.url) ? `${doc.url}#page=${p}` : doc.url;
  }
  // a document the authority has since taken off its site has no url: it is named, not linked; a body whose documents
  // are all off the official site ("offline": "notes") says so once in its notes box instead of after every reference
  const GONE = " (no longer on the official site)";
  const gone = side => side.offline === "notes" ? "" : GONE;
  function src(side, ref) {
    const parts = refParts(side, ref);
    if (!parts.length) return "";
    return `<span class="src">${parts.map(([k, part]) => {
      const d = side.docs[k];
      const name = d.url ? `<a href="${esc(docUrl(d, part))}" target="_blank" rel="noopener">${esc(d.short)}</a>` : esc(d.short) + gone(side);
      return `<span class="sp">${name}${part ? ", " + esc(part) : ""}</span>`;   // one "document, page" never breaks; the list wraps between them
    }).join("; ")}</span>`;
  }
  const regional = side => side.language && side.language !== "English";

  function card(side, key, id) {
    const r = side.rounds[key];
    if (!r) return `<div class="card empty">No such round</div>`;
    return `<button class="card" id="${id}" aria-expanded="${open === id}" aria-controls="detail-${key}" data-open="${id}">
      <span class="t">${esc(r.title)}<small>${esc(side.label)}</small></span>
      <span class="chips">${r.chips.map(chip).join("")}${r.yeartag ? `<span class="yeartag">${esc(r.yeartag)}</span>` : ""}</span></button>`;
  }

  function detailHtml(side, key) {
    const r = side.rounds[key];
    const main = side.docs[side.doc];
    const who = r.who.length ? `<h4>Who can take part <span class="plainnote">in plain words</span></h4><ul class="who">${r.who.map(([t, ref]) => `<li>${esc(t)} ${src(side, ref)}</li>`).join("")}</ul>` : "";
    const opts = r.opts.length ? `<h4>${key === "after" ? "If you leave" : "If you're allotted a seat"}</h4><div class="opts">${r.opts.map(([lab, plain, cost, q, ref]) => {
      const words = q
        ? `<details><summary>The document's words · ${esc(refParts(side, ref).map(([k, p]) => side.docs[k].short + ", " + p).join("; "))}</summary><blockquote>"${esc(q)}"</blockquote>${src(side, ref)}</details>`
        : `<p class="official">In the official document${regional(side) ? ` (${esc(side.language)})` : ""}: ${src(side, ref)}</p>`;
      return `<div class="opt"><div class="lab">${esc(lab)}</div><div class="plain">${esc(plain)}</div><div class="cost">${chip(cost)}</div>${words}</div>`;
    }).join("")}</div>` : "";
    const gaps = r.gaps.length ? `<h4>Not stated</h4><ul class="gaps">${r.gaps.map(g => `<li>${esc(g)}</li>`).join("")}</ul>` : "";
    // the round's header names its document when every line of the round cites the same one
    const used = new Set([...r.who.map(w => w[1]), ...r.opts.map(o => o[4])].flatMap(ref => refParts(side, ref).map(([k]) => k)));
    const one = used.size === 1 ? side.docs[[...used][0]] : used.size === 0 ? main : null;
    const link = one && (one.url ? ` · <a href="${esc(one.url)}" target="_blank" rel="noopener">official ${/\.pdf$/i.test(one.url) ? "PDF" : "document"}</a>` : gone(side));
    const docs = one ? `${esc(one.name)}${link}${one.note ? " · " + esc(one.note) : ""}` : "Documents: see each line";
    return `<button class="closebtn" data-close>Close</button>
      <p class="eyebrow">${esc(side.label)} · ${esc(r.title)}</p>
      <h3>${esc(r.title)}: what you can do</h3>
      <p class="docline">${docs}</p>
      ${r.yearnote ? `<p class="yearline">${esc(r.yearnote)}</p>` : ""}
      ${who}${opts}${gaps}`;
  }

  function crossHtml(key) {
    const list = (MCC.cross || {})[key] || [];
    return list.map(([dir, head, plain, q, ref]) => `
      <div class="xline ${dir}" aria-hidden="true"><i></i></div>
      <div class="xtext"><b>${esc(head)}</b>${esc(plain)} ${src(MCC, ref)}
        <details><summary>The document's words</summary><blockquote>"${esc(q)}"</blockquote></details></div>`).join("");
  }

  function render() {
    const lang = regional(S) ? `<span class="langtag">${esc(S.language)} documents: our English</span>` : "";
    // a state part-way into a new year says which parts are which (its rounds carry their own yeartag)
    const yr = S.yeartag ? `<span class="yeartag">${esc(S.yeartag)}</span>` : "";
    const yrM = MCC.yeartag ? `<span class="yeartag">${esc(MCC.yeartag)}</span>` : "";
    let h = `<div class="lanes"><div class="lane-h mcc"><span class="k">All-India${yrM}</span><span class="n">MCC</span></div>
             <div class="lane-h st"><span class="k">State quota${lang}${yr}</span><span class="n">${esc(S.label)}</span></div></div>`;
    for (const [key, name] of ROWS) {
      const idM = `mcc-${key}`, idS = `st-${key}`;
      h += `<div class="rlabel"><div class="cell mcc"><span>${esc(name)}</span></div><div class="cell st"><span></span></div></div>`;
      h += `<div class="brow"><div class="cell mcc"><span class="stop-dot"></span>${card(MCC, key, idM)}</div>
            <div class="cell st"><span class="stop-dot"></span>${card(S, key, idS)}</div>`;
      if (open === idM) h += `<div class="detail" id="detail-${key}">${detailHtml(MCC, key)}</div>`;
      if (open === idS) h += `<div class="detail" id="detail-${key}">${detailHtml(S, key)}</div>`;
      h += `</div>`;
      if ((MCC.cross || {})[key]) h += `<div class="cross">${crossHtml(key)}</div>`;
    }
    $("#board").innerHTML = h;
    // MCC's notes (its year, from 2026-27) above the state's; each says whose it is when both are there
    const both = (MCC.notes || []).length && (S.notes || []).length;
    const notes = B => (B.notes || []).map(([t, ref]) =>
      `<p>${both ? `<b>${esc(B === MCC ? "MCC" : B.label)}:</b> ` : ""}${esc(t)} ${src(B, ref)}</p>`).join("");
    $("#statenotes").innerHTML = ((MCC.notes || []).length || (S.notes || []).length)
      ? `<div class="statenotes" role="note">${notes(MCC)}${notes(S)}</div>` : "";
    const rows = [["reg", "Registration / counselling fee"], ["dep", "Security deposit"], ["lose", "When you lose it"], ["back", "When it comes back"], ["leave", "Leaving the course"]];
    $("#money").innerHTML = `<thead><tr><th scope="col"></th><th scope="col">MCC</th><th scope="col">${esc(S.label)}</th></tr></thead><tbody>` +
      rows.map(([k, lab]) => `<tr><th scope="row">${lab}</th><td data-l="MCC">${esc(MCC.money[k][0])} ${src(MCC, MCC.money[k][1])}</td><td data-l="${esc(S.label)}">${esc(S.money[k][0])} ${src(S, S.money[k][1])}</td></tr>`).join("") + `</tbody>`;
  }

  function pick(code) {
    current = code; open = null;
    return load(code).then(d => { S = d; render(); }).catch(() => {
      $("#board").innerHTML = `<p class="loading">This state's rules couldn't be loaded. Reload the page to try again.</p>`;
    });
  }

  const sel = $("#state");
  sel.innerHTML = ALL22.map(([c, n]) => `<option value="${c}" ${READY.includes(c) ? "" : "disabled"}>${n}${READY.includes(c) ? "" : " (coming)"}</option>`).join("");
  sel.addEventListener("change", () => { pick(sel.value); });

  $("#board").addEventListener("click", e => {
    const c = e.target.closest("[data-open]"), x = e.target.closest("[data-close]");
    if (x) { const was = open; open = null; render(); const b = document.getElementById(was); if (b) b.focus(); return; }
    if (!c) return;
    open = open === c.dataset.open ? null : c.dataset.open;
    render();
    if (open) { const d = document.querySelector(".detail"); if (d) d.scrollIntoView({ behavior: "smooth", block: "nearest" }); }
  });

  // #CG picks a state; #mcc-r2 or #st-after opens that round; #CG-st-r2 does both
  const hash = (location.hash || "").slice(1);
  const hm = hash.match(/^([A-Za-z]{2})(?:-((?:mcc|st)-(?:r1|r2|r3|stray|after)))?$/) || hash.match(/^()((?:mcc|st)-(?:r1|r2|r3|stray|after))$/) || [];
  const wantState = (hm[1] || "").toUpperCase(), want = hm[2] || "";
  if (READY.includes(wantState)) current = wantState;
  sel.value = current;
  load("mcc").then(d => { MCC = d; return pick(current); }).then(() => {
    if (want) { open = want; render(); const d = document.querySelector(".detail"); if (d && !/noscroll/.test(location.search)) d.scrollIntoView({ block: "start" }); }
  }).catch(() => { $("#board").innerHTML = `<p class="loading">The rounds couldn't be loaded. Reload the page to try again.</p>`; });
})();
