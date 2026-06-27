(function () {
  const D = window.DATA || {};
  const EPS = (D.episodes || []).map(e => {
    const s = (D.summaries || {})[e.videoId] || {};
    return Object.assign({}, e, { heading: s.heading || "", summary: s.summary || "" });
  });
  // 新しい順に見たい人もいるが、デフォルトは放送日 昇順（既にソート済み想定）
  EPS.sort((a, b) => a.date.localeCompare(b.date));

  const $ = sel => document.querySelector(sel);
  const listEl = $("#list"), searchEl = $("#search"),
        yearTabsEl = $("#yearTabs"), tagBarEl = $("#tagBar"), statsEl = $("#stats");
  $("#playlistLink").href = D.playlist || "#";

  let state = { year: "all", tag: null, q: "" };

  // --- 年タブ ---
  const years = [...new Set(EPS.map(e => e.year))].sort();
  const mkTab = (label, val) => {
    const b = document.createElement("button");
    b.className = "tab" + (state.year === val ? " active" : "");
    b.textContent = label; b.onclick = () => { state.year = val; render(); };
    return b;
  };
  function renderTabs() {
    yearTabsEl.innerHTML = "";
    yearTabsEl.appendChild(mkTab("すべて", "all"));
    years.forEach(y => yearTabsEl.appendChild(mkTab(y + "年", y)));
  }

  // --- タグバー（出現頻度順） ---
  const tagCount = {};
  EPS.forEach(e => (e.tags || []).forEach(t => { if (!/^\d{4}$/.test(t)) tagCount[t] = (tagCount[t] || 0) + 1; }));
  const topTags = Object.keys(tagCount).sort((a, b) => tagCount[b] - tagCount[a]);
  function renderTags() {
    tagBarEl.innerHTML = "";
    topTags.forEach(t => {
      const c = document.createElement("button");
      c.className = "chip" + (state.tag === t ? " active" : "");
      c.textContent = `${t} (${tagCount[t]})`;
      c.onclick = () => { state.tag = (state.tag === t ? null : t); render(); };
      tagBarEl.appendChild(c);
    });
  }

  function filtered() {
    const q = state.q.trim().toLowerCase();
    return EPS.filter(e => {
      if (state.year !== "all" && e.year !== state.year) return false;
      if (state.tag && !(e.tags || []).includes(state.tag)) return false;
      if (q) {
        const hay = (e.title + " " + e.heading + " " + e.summary + " " + e.guest).toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }

  function card(e) {
    const div = document.createElement("article");
    div.className = "card";
    const thumb = `https://i.ytimg.com/vi/${e.videoId}/hqdefault.jpg`;
    const hasSum = !!e.summary;
    div.innerHTML = `
      <div class="thumb" data-vid="${e.videoId}">
        <img loading="lazy" src="${thumb}" alt="">
        <div class="play">▶</div>
      </div>
      <div class="body">
        <div class="date">${e.date.replace(/-/g, "/")}</div>
        ${e.heading ? `<p class="heading">${esc(e.heading)}</p>` : `<p class="ttl">${esc(e.title)}</p>`}
        <p class="summary ${hasSum ? "" : "pending"}">${hasSum ? esc(e.summary) : "あらすじ準備中…"}</p>
        <div class="tags">${(e.tags || []).map(t => `<span class="tag">${esc(t)}</span>`).join("")}</div>
      </div>`;
    div.querySelector(".thumb").onclick = function () {
      this.innerHTML = `<iframe src="https://www.youtube.com/embed/${e.videoId}?autoplay=1" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`;
    };
    div.querySelectorAll(".tag").forEach(tg => tg.onclick = ev => {
      ev.stopPropagation(); const t = tg.textContent;
      if (/^\d{4}$/.test(t)) { state.year = parseInt(t); state.tag = null; }
      else { state.tag = t; }
      render();
    });
    return div;
  }

  function render() {
    renderTabs(); renderTags();
    const items = filtered();
    statsEl.textContent = `全${EPS.length}回中 ${items.length}回を表示`
      + (state.tag ? ` ／ タグ「${state.tag}」` : "")
      + (state.q ? ` ／ 検索「${state.q}」` : "");
    listEl.innerHTML = "";
    const frag = document.createDocumentFragment();
    items.forEach(e => frag.appendChild(card(e)));
    listEl.appendChild(frag);
    if (!items.length) listEl.innerHTML = '<p style="color:#9aa3b2">該当する回がありません。</p>';
  }

  function esc(s) { return (s || "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])); }

  // --- ノーブレーキについて（コンビ紹介） ---
  function renderGroup() {
    const el = $("#groupCard"); if (!el) return;
    const grp = (D.people || {}).group;
    if (!grp) { el.innerHTML = ""; return; }
    const meta = [grp.formed, grp.office].filter(Boolean).join(" ／ ");
    const works = (grp.works || []).map(w => `
      <div class="wgroup">
        <h3>${esc(w.title)}</h3>
        <ul>${(w.items || []).map(i => `<li>${esc(i)}</li>`).join("")}</ul>
      </div>`).join("");
    el.innerHTML = `
      <div class="gcard">
        <p class="gname">${esc(grp.name)}</p>
        ${meta ? `<p class="gmeta">${esc(meta)}</p>` : ""}
        <p class="gprof">${esc(grp.profile || "")}</p>
        <div class="psns">${(grp.sns || []).map(s => `<a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.label)}</a>`).join("")}</div>
        ${works ? `<div class="works">${works}</div>` : ""}
        ${grp.note ? `<p class="gnote">${esc(grp.note)}</p>` : ""}
      </div>`;
  }

  // --- people ---
  function renderPeople() {
    const g = $("#peopleGrid"); if (!g) return;
    const P = D.people || { members: [], staff: [] };
    const all = [...(P.members || []), ...(P.staff || [])];
    g.innerHTML = all.map(p => `
      <div class="pcard">
        <p class="pname">${esc(p.name)}</p>
        <p class="prole">${esc(p.role || "")}</p>
        <p class="pprof ${/準備中/.test(p.profile) ? "pending" : ""}">${esc(p.profile || "")}</p>
        <div class="psns">${(p.sns || []).map(s => `<a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.label)}</a>`).join("")}</div>
      </div>`).join("");
  }

  // events
  searchEl.addEventListener("input", () => { state.q = searchEl.value; render(); });
  $("#randomBtn").addEventListener("click", () => {
    const pool = filtered(); if (!pool.length) return;
    const e = pool[Math.floor(Math.random() * pool.length)];
    window.open(`https://www.youtube.com/watch?v=${e.videoId}`, "_blank");
  });

  render();
  renderGroup();
  renderPeople();
})();
