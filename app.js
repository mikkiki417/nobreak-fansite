(function () {
  const D = window.DATA || {};
  const $ = s => document.querySelector(s);
  const esc = s => (s || "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  /* ===== エピソード一覧（オリジンアワーのページ） ===== */
  const listEl = $("#list");
  if (listEl) {
    const EPS = (D.episodes || []).map(e => {
      const s = (D.summaries || {})[e.videoId] || {};
      return Object.assign({}, e, { heading: s.heading || "", summary: s.summary || "" });
    }).sort((a, b) => a.date.localeCompare(b.date));

    const searchEl = $("#search"), yearTabsEl = $("#yearTabs"),
          tagBarEl = $("#tagBar"), statsEl = $("#stats");
    if ($("#playlistLink")) $("#playlistLink").href = D.playlist || "#";

    let state = { year: "all", tag: null, q: "" };
    const years = [...new Set(EPS.map(e => e.year))].sort();

    function renderTabs() {
      yearTabsEl.innerHTML = "";
      const mk = (label, val) => {
        const b = document.createElement("button");
        b.className = "tab" + (state.year === val ? " active" : "");
        b.textContent = label; b.onclick = () => { state.year = val; render(); };
        return b;
      };
      yearTabsEl.appendChild(mk("すべて", "all"));
      years.forEach(y => yearTabsEl.appendChild(mk(y + "年", y)));
    }
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
      const tokens = state.q.trim().toLowerCase().split(/\s+/).filter(Boolean);
      return EPS.filter(e => {
        if (state.year !== "all" && e.year !== state.year) return false;
        if (state.tag && !(e.tags || []).includes(state.tag)) return false;
        if (tokens.length) {
          const hay = (e.title + " " + e.heading + " " + e.summary + " " + e.guest + " " +
            e.date + " " + e.date.replace(/-/g, "/") + " " + (e.tags || []).join(" ")).toLowerCase();
          if (!tokens.every(t => hay.includes(t))) return false;
        }
        return true;
      });
    }
    function card(e) {
      const div = document.createElement("article");
      div.className = "card";
      const hasSum = !!e.summary;
      div.innerHTML = `
        <div class="thumb" data-vid="${e.videoId}">
          <img loading="lazy" src="https://i.ytimg.com/vi/${e.videoId}/hqdefault.jpg" alt="">
          <div class="play">▶</div>
        </div>
        <div class="body">
          <div class="date">${e.date.replace(/-/g, "/")}</div>
          ${e.heading ? `<p class="heading">${esc(e.heading)}</p>` : `<p class="ttl">${esc(e.title)}</p>`}
          <p class="summary ${hasSum ? "" : "pending"}">${hasSum ? esc(e.summary) : "あらすじ準備中…"}</p>
          <div class="tags">${(e.tags || []).map(t => `<span class="tag">${esc(t)}</span>`).join("")}</div>
          <a class="ytlink" href="https://www.youtube.com/watch?v=${e.videoId}" target="_blank" rel="noopener">▶ YouTubeで見る</a>
        </div>`;
      div.querySelector(".thumb").onclick = function () {
        this.innerHTML = `<iframe src="https://www.youtube.com/embed/${e.videoId}?autoplay=1" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`;
      };
      div.querySelectorAll(".tag").forEach(tg => tg.onclick = ev => {
        ev.stopPropagation(); const t = tg.textContent.replace(/\s*\(\d+\)$/, "");
        if (/^\d{4}$/.test(t)) { state.year = parseInt(t); state.tag = null; } else { state.tag = t; }
        render(); window.scrollTo({ top: 0, behavior: "smooth" });
      });
      return div;
    }
    function render() {
      renderTabs(); renderTags();
      const items = filtered();
      statsEl.textContent = `全${EPS.length}回中 ${items.length}回を表示`
        + (state.tag ? ` ／ タグ「${state.tag}」` : "") + (state.q ? ` ／ 検索「${state.q}」` : "");
      listEl.innerHTML = "";
      const frag = document.createDocumentFragment();
      items.forEach(e => frag.appendChild(card(e)));
      listEl.appendChild(frag);
      if (!items.length) listEl.innerHTML = '<p style="color:#a8748c">該当する回がありません。</p>';
    }
    if (searchEl) searchEl.addEventListener("input", () => { state.q = searchEl.value; render(); });
    if ($("#randomBtn")) $("#randomBtn").addEventListener("click", () => {
      const pool = filtered(); if (!pool.length) return;
      const e = pool[Math.floor(Math.random() * pool.length)];
      window.open(`https://www.youtube.com/watch?v=${e.videoId}`, "_blank");
    });
    render();
  }

  /* ===== プロフィール／活動（各ページ・要素があれば描画） ===== */
  const P = D.people || { members: [], staff: [], group: null };
  const snsHtml = arr => `<div class="psns">${(arr || []).map(s =>
    `<a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.label)} ↗</a>`).join("")}</div>`;
  const pcard = p => `<div class="pcard">
      <p class="pname">${esc(p.name)}</p>
      <p class="prole">${esc(p.role || "")}</p>
      <p class="pprof ${/準備中/.test(p.profile) ? "pending" : ""}">${esc(p.profile || "")}</p>
      ${snsHtml(p.sns)}</div>`;

  const gEl = $("#groupCard");
  if (gEl && P.group) {
    const g = P.group, meta = [g.formed, g.office].filter(Boolean).join(" ／ ");
    gEl.innerHTML = `<div class="gcard">
      <p class="gname">${esc(g.name)}</p>
      ${meta ? `<p class="gmeta">${esc(meta)}</p>` : ""}
      <p class="gprof">${esc(g.profile || "")}</p>
      ${snsHtml(g.sns)}
      ${g.note ? `<p class="gnote">${esc(g.note)}</p>` : ""}
    </div>`;
  }
  if ($("#memberGrid")) $("#memberGrid").innerHTML = (P.members || []).map(pcard).join("");
  if ($("#staffGrid")) $("#staffGrid").innerHTML = (P.staff || []).map(pcard).join("");
  if ($("#worksList") && (P.group || {}).works) {
    $("#worksList").innerHTML = P.group.works.map(g =>
      `<div class="wgroup"><h3>${esc(g.title)}</h3>
        <ul>${(g.items || []).map(i => `<li>${esc(i)}</li>`).join("")}</ul></div>`).join("");
  }

  /* ===== レトロ アクセスカウンター（トップのみ） ===== */
  const cEl = $("#hitcount");
  if (cEl) {
    let n = parseInt(localStorage.getItem("nb_hits") || "18", 10) + 1;
    localStorage.setItem("nb_hits", n);
    const s = String(n).padStart(7, "0");
    cEl.innerHTML = [...s].map((d, i) =>
      `<span class="dgt${i === s.length - 1 ? " hot" : ""}">${d}</span>`).join("");
  }

  /* ===== BGM ON/OFF（音源を入れたら再生。未設定なら表示だけ） ===== */
  const bgmOn = $("#bgmOn"), bgmOff = $("#bgmOff"), bgm = $("#bgm");
  if (bgmOn && bgmOff) {
    bgmOn.addEventListener("click", () => {
      bgmOn.classList.add("act"); bgmOff.classList.remove("act");
      if (bgm && (bgm.currentSrc || bgm.src)) bgm.play().catch(() => {});
    });
    bgmOff.addEventListener("click", () => {
      bgmOff.classList.add("act"); bgmOn.classList.remove("act");
      if (bgm) bgm.pause();
    });
  }
})();
