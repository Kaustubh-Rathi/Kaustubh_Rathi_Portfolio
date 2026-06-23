/* =============================================================================
 * minigame.js — reusable tiny-game engine with a START GATE + WIN-TO-REVEAL.
 * -----------------------------------------------------------------------------
 * FLOW (this is the important part):
 *   play(section, theme, onResolve)
 *     → INTRO overlay:  [▶ PLAY]  [Skip → show content]
 *         • Skip here  → onResolve('skip')   (content reveals)
 *         • Play       → game starts
 *     → PLAYING:
 *         • WIN (hit the target)  → onResolve('win')   (content reveals)
 *         • LOSE / time-up        → RESULT overlay (content does NOT reveal)
 *     → RESULT overlay: [▶ Retry]  [Skip → show content]
 *         • Retry → play again
 *         • Skip  → onResolve('skip')   (content reveals)
 *
 *   So content is revealed ONLY by 'win' or an explicit 'skip'. Losing or
 *   timing out never reveals — exactly as requested. The escape hatch is the
 *   up-front Skip (and the Skip on the result screen), never silent leakage.
 *
 * Mechanic is chosen by section.game: shoot|catch|whack|lock|dodge|connect.
 * ============================================================================= */
(function () {
  "use strict";
  const FX = window.FX;

  const root = document.getElementById("mgRoot");
  const canvas = document.getElementById("mgCanvas");
  const ctx = canvas.getContext("2d");
  const titleEl = document.getElementById("mgTitle");
  const blurbEl = document.getElementById("mgBlurb");
  const timerEl = document.getElementById("mgTimer");
  const scoreEl = document.getElementById("mgScore");
  const startOv = document.getElementById("mgStart");
  const resultOv = document.getElementById("mgResult");
  const W = () => canvas.clientWidth, H = () => canvas.clientHeight;

  let raf = 0, state = "idle", done = null, particles = FX.makeParticles();
  let shake = 0, hitPause = 0, timeLeft = 0, timeMax = 9, score = 0, target = 0, game = null, theme = null, section = null;
  const pointer = { x: 0, y: 0, down: false, justDown: false };

  function resize() {
    const r = canvas.getBoundingClientRect();
    const dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.max(1, r.width * dpr); canvas.height = Math.max(1, r.height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  // Accurate pointer mapping: rect is recomputed each event (handles scroll/resize).
  function relPos(e) { const r = canvas.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }
  canvas.addEventListener("pointerdown", (e) => { e.preventDefault(); const p = relPos(e); pointer.x = p.x; pointer.y = p.y; pointer.down = true; pointer.justDown = true; });
  canvas.addEventListener("pointermove", (e) => { const p = relPos(e); pointer.x = p.x; pointer.y = p.y; });
  window.addEventListener("pointerup", () => { pointer.down = false; });

  let keyL = false, keyR = false;
  window.addEventListener("keydown", (e) => {
    if (state !== "playing") return;
    if (e.code === "ArrowLeft" || e.code === "KeyA") keyL = true;
    if (e.code === "ArrowRight" || e.code === "KeyD") keyR = true;
    if (e.code === "Space") { pointer.justDown = true; e.preventDefault(); }
  });
  window.addEventListener("keyup", (e) => { if (e.code === "ArrowLeft" || e.code === "KeyA") keyL = false; if (e.code === "ArrowRight" || e.code === "KeyD") keyR = false; });

  function fireShake(v) { if (!FX.reduced) shake = Math.min(1, shake + v); }
  function hit(x, y, color) { fireShake(0.5); hitPause = 0.05; particles.burst(x, y, color, 16, 220); FX.beep("hit"); }
  let lost = false; // set by a game when the player fails (lose-now)

  /* ---- Game builders, keyed by mechanic ---------------------------------- */
  function makeTargets(n, type) {
    const arr = [];
    for (let i = 0; i < n; i++) arr.push({
      x: 70 + (i * 137) % Math.max(80, W() - 140), y: 90 + (i * 83) % Math.max(80, H() - 170),
      vx: (i % 2 ? 1 : -1) * (50 + i * 14), vy: (i % 3 ? 1 : -1) * (38 + i * 10),
      r: 30, alive: true, label: type[i % type.length],
    });
    return arr;
  }
  let locked = [];

  const BUILD = {
    shoot() {
      const targets = makeTargets(3, ["NullPtr", "RaceCond", "OffByOne"]); target = 3; let recoil = 0;
      return {
        update(dt) {
          for (const t of targets) { if (!t.alive) continue; t.x += t.vx * dt; t.y += t.vy * dt; if (t.x < 40 || t.x > W() - 40) t.vx *= -1; if (t.y < 60 || t.y > H() - 50) t.vy *= -1; }
          if (pointer.justDown) { recoil = 1; FX.beep("shoot"); for (const t of targets) { if (t.alive && Math.hypot(t.x - pointer.x, t.y - pointer.y) < t.r + 18) { t.alive = false; score++; hit(t.x, t.y, theme.accent); } } }
          recoil = Math.max(0, recoil - dt * 6);
        },
        draw(c) {
          for (const t of targets) { if (!t.alive) continue; c.fillStyle = "#FF5C5C"; c.shadowColor = "#FF5C5C"; c.shadowBlur = 16; c.beginPath(); c.arc(t.x, t.y, t.r, 0, Math.PI * 2); c.fill(); c.shadowBlur = 0; c.fillStyle = "#1A0606"; c.font = "700 11px 'JetBrains Mono',monospace"; c.textAlign = "center"; c.fillText("🐞", t.x, t.y - 2); c.fillText(t.label, t.x, t.y + 14); }
          const cr = 16 + recoil * 7; c.strokeStyle = theme.accent; c.lineWidth = 2.5;
          const cx = pointer.x || W() / 2, cy = pointer.y || H() / 2;
          c.beginPath(); c.arc(cx, cy, cr, 0, Math.PI * 2); c.stroke();
          c.beginPath(); c.moveTo(cx - cr - 7, cy); c.lineTo(cx + cr + 7, cy); c.moveTo(cx, cy - cr - 7); c.lineTo(cx, cy + cr + 7); c.stroke();
        },
      };
    },
    catch() {
      target = 4; const basket = { x: W() / 2, w: 100 }; let items = [], spawn = 0;
      return {
        update(dt) {
          if (pointer.down) basket.x = pointer.x; if (keyL) basket.x -= 380 * dt; if (keyR) basket.x += 380 * dt;
          basket.x = Math.max(basket.w / 2, Math.min(W() - basket.w / 2, basket.x));
          spawn -= dt; if (spawn <= 0 && items.length < 6) { spawn = 0.6; items.push({ x: 40 + (items.length * 120) % Math.max(60, W() - 80), y: -20, v: 150 + items.length * 16 }); }
          for (const s of items) { if (s.caught) continue; s.y += s.v * dt; if (s.y > H() - 46 && s.y < H() - 20 && Math.abs(s.x - basket.x) < basket.w / 2 + 14) { s.caught = true; score++; particles.burst(s.x, H() - 46, theme.accent2, 14, 200); FX.beep("collect"); fireShake(0.3); } }
          items = items.filter((s) => !s.caught && s.y < H() + 30);
        },
        draw(c) {
          for (const s of items) { c.save(); c.translate(s.x, s.y); c.rotate(s.y / 40); c.fillStyle = theme.accent2; c.shadowColor = theme.accent2; c.shadowBlur = 14; c.beginPath(); c.moveTo(0, -10); c.lineTo(8, 0); c.lineTo(0, 10); c.lineTo(-8, 0); c.closePath(); c.fill(); c.restore(); }
          c.shadowBlur = 0; c.fillStyle = theme.accent; c.beginPath(); c.moveTo(basket.x - basket.w / 2, H() - 30); c.lineTo(basket.x + basket.w / 2, H() - 30); c.lineTo(basket.x + basket.w / 2 - 10, H() - 10); c.lineTo(basket.x - basket.w / 2 + 10, H() - 10); c.closePath(); c.fill();
          c.fillStyle = "#1A1206"; c.font = "10px 'JetBrains Mono',monospace"; c.textAlign = "center"; c.fillText("COLLECTOR", basket.x, H() - 16);
        },
      };
    },
    whack() {
      target = 5; let holes = [], spawn = 0;
      return {
        update(dt) {
          spawn -= dt; if (spawn <= 0) { spawn = 0.75; holes.push({ x: 60 + (holes.length * 131) % Math.max(80, W() - 120), y: 80 + (holes.length * 97) % Math.max(80, H() - 150), life: 1.2, r: 32 }); }
          for (const h of holes) h.life -= dt;
          if (pointer.justDown) for (const h of holes) { if (h.life > 0 && !h.dead && Math.hypot(h.x - pointer.x, h.y - pointer.y) < h.r + 12) { h.dead = true; score++; hit(h.x, h.y, theme.accent); } }
          holes = holes.filter((h) => h.life > 0 && !h.dead);
        },
        draw(c) {
          for (const h of holes) { c.globalAlpha = Math.min(1, h.life); c.fillStyle = "#FF7A3C"; c.shadowColor = "#FF7A3C"; c.shadowBlur = 14; c.beginPath(); c.arc(h.x, h.y, h.r, 0, Math.PI * 2); c.fill(); c.shadowBlur = 0; c.fillStyle = "#1A0E06"; c.font = "700 11px 'JetBrains Mono',monospace"; c.textAlign = "center"; c.fillText("merge", h.x, h.y + 4); }
          c.globalAlpha = 1;
        },
      };
    },
    lock() {
      target = 3; const tiles = ["Java", "AWS", "Bedrock", "Python", "DynamoDB", "LangGraph"]; let scan = 0; locked = tiles.map(() => false);
      const cols = 3, cellGeom = () => { const tw = (W() - 40) / cols; return { tw }; };
      return {
        update(dt) {
          scan += dt * 2.0;
          if (pointer.justDown) {
            const { tw } = cellGeom();
            // hit-test which tile the tap is on; lock it if the scanner is there
            let tapped = -1;
            tiles.forEach((t, i) => { const x = 20 + (i % cols) * tw, y = 60 + Math.floor(i / cols) * 74; if (pointer.x > x && pointer.x < x + tw - 12 && pointer.y > y && pointer.y < y + 58) tapped = i; });
            const active = Math.floor(scan) % tiles.length;
            const idx = (tapped >= 0) ? tapped : active;
            if (!locked[idx] && (tapped < 0 || tapped === active)) { locked[idx] = true; score++; const x = 20 + (idx % cols) * tw + tw / 2, y = 60 + Math.floor(idx / cols) * 74 + 30; hit(x, y, theme.accent2); FX.beep("collect"); }
            else if (tapped >= 0 && tapped !== active) { FX.beep("ui"); }
          }
        },
        draw(c) {
          const { tw } = cellGeom(); const active = Math.floor(scan) % tiles.length;
          tiles.forEach((t, i) => { const x = 20 + (i % cols) * tw, y = 60 + Math.floor(i / cols) * 74, on = active === i;
            c.fillStyle = locked[i] ? theme.accent2 : (on ? "rgba(255,153,0,.28)" : "#161B2B"); c.strokeStyle = on ? theme.accent : "#2a3350"; c.lineWidth = on ? 3 : 1;
            c.fillRect(x, y, tw - 12, 58); c.strokeRect(x, y, tw - 12, 58);
            c.fillStyle = locked[i] ? "#06212A" : "#cfe0f0"; c.font = "600 13px 'JetBrains Mono',monospace"; c.textAlign = "center"; c.fillText(t, x + (tw - 12) / 2, y + 34); });
        },
      };
    },
    dodge() {
      // WIN = survive until the timer runs out. LOSE = get hit. (surviveMode)
      target = 999; const me = { x: W() / 2, y: H() - 50, r: 14 }; let spikes = [], spawn = 0;
      return {
        surviveMode: true,
        update(dt) {
          if (pointer.down) me.x = pointer.x; if (keyL) me.x -= 340 * dt; if (keyR) me.x += 340 * dt;
          me.x = Math.max(20, Math.min(W() - 20, me.x));
          spawn -= dt; if (spawn <= 0) { spawn = 0.55; spikes.push({ x: 30 + (spikes.length * 173) % Math.max(60, W() - 60), y: -20, v: 180 + spikes.length * 6, scored: false }); }
          for (const s of spikes) { s.y += s.v * dt; if (Math.hypot(s.x - me.x, s.y - me.y) < 22) { lost = true; FX.beep("lose"); fireShake(0.6); } if (!s.scored && s.y > H()) { s.scored = true; score++; FX.beep("collect"); } }
          spikes = spikes.filter((s) => s.y < H() + 30);
        },
        draw(c) {
          for (const s of spikes) { c.fillStyle = "#FF5C5C"; c.shadowColor = "#FF5C5C"; c.shadowBlur = 10; c.beginPath(); c.moveTo(s.x, s.y - 13); c.lineTo(s.x + 11, s.y + 9); c.lineTo(s.x - 11, s.y + 9); c.closePath(); c.fill(); c.shadowBlur = 0; }
          c.fillStyle = theme.accent; c.shadowColor = theme.accent; c.shadowBlur = 16; c.beginPath(); c.arc(me.x, me.y, me.r, 0, Math.PI * 2); c.fill(); c.shadowBlur = 0;
          c.fillStyle = "#1A1206"; c.font = "9px 'JetBrains Mono',monospace"; c.textAlign = "center"; c.fillText("YOU", me.x, me.y + 3);
        },
      };
    },
    connect() {
      target = 1; const node = { x: 60, dir: 1 };
      return {
        update(dt) {
          node.x += node.dir * 230 * dt; if (node.x < 40 || node.x > W() - 40) node.dir *= -1;
          if (pointer.justDown && score < 1) { if (Math.abs((pointer.x) - node.x) < 50) { score = 1; hit(node.x, H() / 2, theme.accent2); FX.beep("unlock"); } else { FX.beep("shoot"); fireShake(0.2); } }
        },
        draw(c) {
          c.strokeStyle = "#2a3350"; c.lineWidth = 2; c.beginPath(); c.moveTo(20, H() / 2); c.lineTo(W() - 20, H() / 2); c.stroke();
          c.fillStyle = theme.accent2; c.shadowColor = theme.accent2; c.shadowBlur = 18; c.beginPath(); c.arc(node.x, H() / 2, 18, 0, Math.PI * 2); c.fill(); c.shadowBlur = 0;
          c.fillStyle = "#06212A"; c.font = "700 9px 'JetBrains Mono',monospace"; c.textAlign = "center"; c.fillText("HR", node.x, H() / 2 + 3);
          const cx = pointer.x || W() / 2; c.strokeStyle = theme.accent; c.lineWidth = 2; c.beginPath(); c.moveTo(cx, 20); c.lineTo(cx, H() - 20); c.stroke();
        },
      };
    },
  };

  /* ---- Loop -------------------------------------------------------------- */
  let last = 0;
  function loop(ts) {
    if (state !== "playing") return;
    let dt = Math.min(0.05, (ts - last) / 1000 || 0); last = ts;
    if (hitPause > 0) { hitPause -= dt; dt = 0; }
    if (dt > 0) {
      timeLeft -= dt; game.update(dt); particles.update(dt); shake = Math.max(0, shake - dt * 3); pointer.justDown = false;
      if (game.surviveMode) {
        // survive-the-timer games: getting hit loses, reaching the timer wins.
        if (lost) return toResult("Ouch — you got hit!");
        if (timeLeft <= 0) return finish("win");
      } else {
        if (score >= target) return finish("win");
        if (lost) return toResult("Ouch — you got hit!");
        if (timeLeft <= 0) return toResult("Time's up!");
      }
    }
    ctx.clearRect(0, 0, W(), H());
    ctx.save();
    if (shake > 0 && !FX.reduced) { const m = 9 * shake * shake * FX.intensity; ctx.translate(Math.sin(ts) * m, Math.cos(ts * 1.3) * m); }
    ctx.fillStyle = "#0B0D17"; ctx.fillRect(-20, -20, W() + 40, H() + 40);
    ctx.strokeStyle = "rgba(80,120,200,.07)"; for (let x = 0; x < W(); x += 34) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H()); ctx.stroke(); }
    game.draw(ctx); particles.draw(ctx);
    ctx.restore();
    timerEl.style.width = Math.max(0, (timeLeft / timeMax) * 100) + "%";
    scoreEl.textContent = game.surviveMode ? `SURVIVE ${Math.ceil(timeLeft)}s` : `${Math.min(score, target)} / ${target}`;
    raf = requestAnimationFrame(loop);
  }

  /* ---- State transitions ------------------------------------------------- */
  function startGame() {
    startOv.classList.remove("show"); resultOv.classList.remove("show");
    score = 0; lost = false; shake = 0; hitPause = 0; particles.clear();
    timeMax = (section.game === "dodge") ? 12 : 9; timeLeft = timeMax;
    resize(); game = BUILD[section.game] ? BUILD[section.game]() : BUILD.shoot();
    state = "playing"; last = 0; pointer.justDown = false; FX.unlockAudio();
    requestAnimationFrame(loop);
  }
  function toResult(msg) {
    state = "result"; cancelAnimationFrame(raf);
    document.getElementById("mgResultMsg").textContent = msg;
    resultOv.classList.add("show");
  }
  function finish(reason) {
    state = "idle"; cancelAnimationFrame(raf);
    if (reason === "win") { FX.beep("unlock"); }
    root.classList.remove("open"); root.setAttribute("aria-hidden", "true");
    const cb = done; done = null;
    setTimeout(() => cb && cb(reason), 120);
  }

  /* ---- Wire overlay buttons (once) --------------------------------------- */
  document.getElementById("mgStartPlay").addEventListener("click", startGame);
  document.getElementById("mgStartSkip").addEventListener("click", () => finish("skip"));
  document.getElementById("mgRetry").addEventListener("click", startGame);
  document.getElementById("mgResultSkip").addEventListener("click", () => finish("skip"));
  window.addEventListener("keydown", (e) => { if (root.classList.contains("open") && e.key === "Escape") finish("skip"); });
  window.addEventListener("resize", () => { if (state === "playing") resize(); });

  /* ---- Public API -------------------------------------------------------- */
  function play(sectionObj, th, onResolve) {
    section = sectionObj; theme = th || { accent: "#FF9900", accent2: "#22D3EE" }; done = onResolve;
    titleEl.textContent = section.gameTitle || "Mini-game";
    blurbEl.textContent = section.gameHint || "Beat it to unlock the room — or Skip.";
    document.getElementById("mgStartTitle").textContent = section.gameTitle || "Mini-game";
    document.getElementById("mgStartHint").textContent = section.gameHint || "";
    state = "intro";
    root.classList.add("open"); root.setAttribute("aria-hidden", "false");
    startOv.classList.add("show"); resultOv.classList.remove("show");
    // clear the canvas behind the intro
    resize(); ctx.clearRect(0, 0, W(), H());
  }
  window.MiniGame = { play };
})();
