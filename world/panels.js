/* =============================================================================
 * Dev World — content/DOM layer
 * Listens to the engine (window.DevWorld) and renders portfolio content into a
 * modal when the player enters a zone. Owns the HUD, progress, and the mute
 * toggle. Engine stays content-agnostic.
 * ============================================================================= */
(function () {
  "use strict";
  const P = window.PORTFOLIO, W = window.DevWorld;
  const $ = (s, r = document) => r.querySelector(s);
  const el = (t, c, h) => { const n = document.createElement(t); if (c) n.className = c; if (h != null) n.innerHTML = h; return n; };
  const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));

  /* ---- HUD identity + persona resume ------------------------------------- */
  $("#hudName").textContent = P.person.name;
  // role line = role ONLY (the Codeforces stat already lives on ROOT chips + the LEADERBOARD modal)
  $("#hudRole").textContent = P.person.role;
  document.title = `${P.person.name} — SDE @ Amazon`;

  // Boot overlay: tagline + a self-typing terminal (facts are REAL text, present instantly).
  $("#bootTagline").textContent = P.person.tagline || "";

  // default résumé file (the full menu/persona-toggle now lives on the clean site, not the game)
  const activePersona = P.personas[0];

  /* ---- Modal plumbing ---------------------------------------------------- */
  const modal = $("#modal"), modalBody = $("#modalBody"), modalTitle = $("#modalTitle");
  function openModal(title, html) {
    modalTitle.textContent = title; modalBody.innerHTML = html;
    modal.classList.add("open"); modal.setAttribute("aria-hidden", "false");
    W.setPaused(true); $("#modalClose").focus();
  }
  function closeModal() { modal.classList.remove("open"); modal.setAttribute("aria-hidden", "true"); W.setPaused(false); }
  $("#modalClose").addEventListener("click", closeModal);
  modal.addEventListener("click", (e) => { if (e.target === modal) closeModal(); });
  window.addEventListener("keydown", (e) => { if (e.key === "Escape" && modal.classList.contains("open")) closeModal(); });

  /* ---- Content renderers (derive from PORTFOLIO) ------------------------- */
  const chips = (arr) => `<div class="chips">${arr.map((a) => `<span class="chip">${esc(a)}</span>`).join("")}</div>`;
  const RENDER = {
    systems: () =>
      P.systems.map((s) => `<div class="pcard"><h3>${esc(s.name)} <span class="badge">${esc(s.status)}</span></h3><p>${esc(s.summary)}</p>${chips(s.architecture)}<div class="reliab">↳ ${esc(s.reliability)}</div></div>`).join("") +
      `<p class="note">Described in generic terms — internal specifics are confidential.</p>`,
    projects: () =>
      `<div class="pgrid">` + P.projects.map((p) => `<div class="pcard"><div class="pc-top"><span class="diff diff-${esc(p.difficulty)}">${esc(p.difficulty)}</span>${p.stars ? `<span class="stars">★ ${p.stars}</span>` : ""}</div><h3>${esc(p.name)}</h3><p>${esc(p.blurb)}</p>${chips(p.tech)}<a class="plink" href="${p.href}" target="_blank" rel="noopener">View on GitHub →</a></div>`).join("") + `</div>`,
    stats: () =>
      `<div class="board">` + P.stats.map((s, i) => {
        const v = s.max === 100 ? s.value + "%" : s.value;
        return `<div class="srow"><span class="srank">${String(i + 1).padStart(2, "0")}</span><span class="sname">${esc(s.label)}<small>${esc(s.sub)}</small></span><span class="stier">${esc(s.rank)}</span><span class="sval">${esc(String(v))}</span></div>`;
      }).join("") + `</div>`,
    skills: () => `<div class="pgrid">` + P.skills.map((s) => `<div class="pcard"><h4>${esc(s.group)}</h4>${chips(s.items)}</div>`).join("") + `</div>`,
    // In-game = TEASER only (the full timeline is the recruiter-facing record on the landing,
    // so we don't render the same bullets twice). Current role + a pointer + NPC offer.
    experience: () => {
      const cur = P.experience.find((e) => e.current) || P.experience[0];
      const past = P.experience.filter((e) => e !== cur).map((e) => `${esc(e.org)}`).join(" · ");
      return `<div class="pcard cur"><div class="exp-head"><b>${esc(cur.title)}</b> <span class="org">@ ${esc(cur.org)}</span><span class="per">${esc(cur.period)}</span></div><ul>${cur.points.map((x) => `<li>${esc(x)}</li>`).join("")}</ul></div>` +
        (past ? `<p class="note">Earlier: ${past}. Full timeline on the <a href="../index.html">portfolio</a> / résumé.</p>` : "");
    },
    contact: () =>
      `<div class="contact-row">` +
      [["✉ " + P.person.email, "mailto:" + P.person.email], ["LinkedIn", P.person.links.linkedin], ["GitHub", P.person.links.github], ["Codeforces", P.person.links.codeforces]]
        .map(([t, h]) => `<a href="${h}" ${h.startsWith("mailto") ? "" : 'target="_blank" rel="noopener"'}>${esc(t)}</a>`).join("") +
      `</div>`,
  };
  // Titles + theme come from config (single source of truth).
  const SECTION = {}; (P.world.sections || []).forEach((s) => { SECTION[s.key] = s; });
  const titleFor = (key) => { const s = SECTION[key]; return s ? `${s.icon}  ${s.label}` : key; };
  const THEME = { accent: P.theme.accent, accent2: P.theme.accent2 };

  function revealSection(key) {
    if (!RENDER[key]) return;
    if (W.markVisited) W.markVisited(key);            // light up the building permanently
    const s = SECTION[key]; if (s && W.flashScreen) W.flashScreen(s.color); // color wash on enter
    openModal(titleFor(key), RENDER[key]());
  }

  // Engine -> content callback. Each building plays its OWN mini-game first.
  // GATE RULE: content reveals ONLY on 'win' or an explicit 'skip'. Losing or
  // running out of time stays in the mini-game's result screen (no leak).
  let readingMode = !P.features.miniGames;
  W.onEnterZone = (key) => {
    if (!RENDER[key]) return;
    const s = SECTION[key];
    if (readingMode || !window.MiniGame || !s) { revealSection(key); return; }
    W.setPaused(true);
    window.MiniGame.play(s, THEME, (reason) => {
      if (reason === "win") { const t = el("div", "toast", `✓ <b>${esc(s.label)}</b> unlocked!`); $("#toasts").appendChild(t); setTimeout(() => t.remove(), 1800); }
      revealSection(key);  // called for 'win' and 'skip' only
    });
  };

  /* ---- Progress HUD + collectibles --------------------------------------- */
  const prog = $("#progressFill"), progTxt = $("#progressTxt");
  const SHARD_TOTAL = (P.projects || []).slice(0, 6).length;
  // Open the Zeigarnik loop: show 1/total from the start (you "spawned" = 1 found).
  function setProgress(c, total) { const shown = Math.max(1, c); prog.style.width = `${(shown / total) * 100}%`; progTxt.textContent = `${shown}/${total} explored`; }
  setProgress(0, SHARD_TOTAL);
  W.onCollect = (c, total, name) => {
    setProgress(c, total);
    // EARLY MINI-PEAK: the FIRST pickup gets a real celebration (dopamine spike
    // inside the first-30s window, so the ~90% who never reach 6/6 still peak once).
    if (c === 1) {
      if (W.celebrate) W.celebrate();
      const t = el("div", "toast big", `◆ First build unlocked! <b>${esc(name)}</b> — ${total - 1} to go`);
      $("#toasts").appendChild(t); setTimeout(() => t.remove(), 3000);
    } else {
      const toast = el("div", "toast", `◆ <b>${esc(name)}</b> — ${total - c} left`);
      $("#toasts").appendChild(toast); setTimeout(() => toast.remove(), 2400);
    }
  };
  W.onAllCollected = () => {
    if (W.celebrate) W.celebrate(); // confetti + shake + chord in the world
    setTimeout(() => {
      openModal("🏅 Achievement Unlocked",
        `<div class="achv"><div class="achv-badge">100%</div><h3>Full Stack Explorer</h3><p>You collected every data shard — all of ${esc(P.person.name)}'s builds. Now go hire ${esc(P.person.name.split(" ")[0])}.</p><a class="btn btn-primary" id="achvResume" href="${activePersona.file}" download>↓ Résumé</a></div>`);
    }, 500);
  };

  /* ---- (Chatbot + full résumé menu live on the clean site; the game stays focused on play.) ---- */

  /* ---- Mute toggle (the only in-play control) ---------------------------- */
  const muteBtn = $("#muteBtn");
  let muted = false;
  if (muteBtn) muteBtn.addEventListener("click", () => { muted = !muted; window.FX.setMuted(muted); muteBtn.textContent = muted ? "🔇" : "🔊"; muteBtn.setAttribute("aria-pressed", String(muted)); });

  /* ---- Game-start screen + boot terminal ---------------------------------- */
  const boot = $("#boot");
  const bootTerm = $("#bootTerm");
  const topStat = (P.stats && P.stats[0]) ? `${P.stats[0].label} ${P.stats[0].rank} ${P.stats[0].value}` : "";
  const fullTerm = [
    "> booting dev_world …",
    `> ${P.person.role} · ${topStat} · production LLM agents on AWS`,
    "> press ENTER to explore — or grab the résumé, top-right",
  ].join("\n");
  // Real text present immediately (crawlers, screen readers, instant skimmers).
  bootTerm.textContent = fullTerm;
  // Decorative typewriter only when motion is allowed — never gates the text.
  if (!window.FX.reduced) {
    let shown = 0; bootTerm.textContent = "";
    (function type() {
      if (shown <= fullTerm.length && !boot.classList.contains("gone")) {
        bootTerm.textContent = fullTerm.slice(0, shown); shown += 2; setTimeout(type, 18);
      } else { bootTerm.textContent = fullTerm; }
    })();
  }

  function dismissBoot(withIntro) {
    bootTerm.textContent = fullTerm; // ensure full text if they enter mid-type
    if (boot.classList.contains("gone")) return;
    window.FX.unlockAudio(); window.FX.beep("unlock");
    boot.classList.add("gone");
    if (withIntro && window.DevWorld.playIntro) window.DevWorld.playIntro(); // zoom-out reveal
    setTimeout(() => { boot.style.display = "none"; }, 700);
  }
  const enterWorld = () => dismissBoot(true);
  $("#bootEnter").addEventListener("click", enterWorld);
  // Enter / Space / tap-on-backdrop all start the game.
  window.addEventListener("keydown", (e) => {
    if (boot.classList.contains("gone")) return;
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); enterWorld(); }
  });
  boot.addEventListener("click", (e) => { if (e.target === boot) enterWorld(); });
})();
