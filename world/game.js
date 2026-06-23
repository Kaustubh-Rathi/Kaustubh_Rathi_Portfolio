/* =============================================================================
 * Dev World — playable top-down portfolio game (HTML5 canvas, vanilla JS)
 * -----------------------------------------------------------------------------
 * v2 changes:
 *   - FIT-TO-SCREEN: the whole 1600x900 world is scaled to fit the viewport
 *     (letterboxed). No scrolling, no camera-follow — you always see everything.
 *   - 6-SPOKE HUB: buildings auto-laid-out in a ring; roads radiate from a
 *     central spawn hub to each building's entry pad.
 *   - ROADS ONLY: the player can walk on the hub disc + road corridors only —
 *     not off into the void or into buildings.
 *   - Reads colors from CONFIG.theme and buildings from CONFIG.world.sections.
 *
 * SYSTEM DESIGN: engine only (world, input, movement, render). It emits
 *   onEnterZone(key) and panels.js owns all content/DOM. config.js is the
 *   single source of truth for content + theme.
 * ============================================================================= */
(function () {
  "use strict";
  const C = window.CONFIG || window.PORTFOLIO;
  const T = C.theme;
  const FX = window.FX;

  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d", { alpha: false });

  /* ---- Virtual world (fixed; scaled to fit the screen) ------------------- */
  const VW = 1600, VH = 900;
  const HUB = { x: VW / 2, y: VH / 2 };
  const HUB_R = 96;          // walkable hub disc
  const ROAD_HW = 46;        // road corridor half-width (walkable band)
  const REACH = 150;         // entry-pad distance in front of a building

  /* ---- Build the ring of buildings from config --------------------------- */
  const RX = 560, RY = 305;                  // elliptical ring radii
  const startAng = -Math.PI / 2;             // first building straight up
  const sections = C.world.sections.slice(0, 6);
  const buildings = sections.map((s, i) => {
    const a = startAng + (i / sections.length) * Math.PI * 2;
    const cx = HUB.x + Math.cos(a) * RX, cy = HUB.y + Math.sin(a) * RY;
    const dirx = Math.cos(a), diry = Math.sin(a);          // hub -> building
    const w = 250, h = 150;
    // entry pad sits REACH px in front of the building face, toward the hub
    const ix = cx - dirx * REACH, iy = cy - diry * REACH;
    return { ...s, cx, cy, w, h, x: cx - w / 2, y: cy - h / 2, ix, iy, dirx, diry, visited: false };
  });
  const zones = buildings;

  // Road segments: hub center -> each entry pad. Shards sit on these.
  const roads = buildings.map((b) => ({ ax: HUB.x, ay: HUB.y, bx: b.ix, by: b.iy }));

  /* ---- Collectible shards (= projects), one per road midpoint ------------ */
  const projs = (C.projects || []).slice(0, 6);
  const shards = projs.map((p, i) => {
    const r = roads[i % roads.length]; const t = 0.55;
    return { id: p.id, name: p.name, x: r.ax + (r.bx - r.ax) * t, y: r.ay + (r.by - r.ay) * t, collected: false, t: i * 0.9 };
  });

  /* ---- localStorage permanence (visited buildings only) ------------------ */
  const SAVE_KEY = "devworld_" + (C.person.handle || "kcr");
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem(SAVE_KEY) || "{}"); } catch (e) { saved = {}; }
  if (saved.visited) buildings.forEach((b) => { if (saved.visited.includes(b.key)) b.visited = true; });
  function persist() {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify({
        visited: buildings.filter((b) => b.visited).map((b) => b.key),
      }));
    } catch (e) {}
  }

  /* ---- Player ------------------------------------------------------------ */
  const player = { x: HUB.x, y: HUB.y + 40, r: 14, speed: 250, dx: 0, dy: 1, bob: 0, moving: false, sx: 1, sy: 1, face: "down", walk: 0 };

  /* ---- Sprites + decorative props ---------------------------------------- */
  const SP = window.SPRITES;
  // Scatter props deterministically, OFF the roads/hub (decoration only — no collision).
  const props = [];
  (function placeProps() {
    if (!SP) return;
    const kinds = ["tree", "lamp", "bush", "rock", "server", "tree", "bush", "tree"];
    let seed = 1337, k = 0;
    const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
    for (let i = 0; i < 60 && props.length < 30; i++) {
      const x = 60 + rnd() * (VW - 120), y = 60 + rnd() * (VH - 120);
      if (onRoad(x, y) || inBuilding(x, y)) continue;          // keep paths/buildings clear
      if (Math.hypot(x - HUB.x, y - HUB.y) < HUB_R + 30) continue;
      const kind = kinds[k++ % kinds.length];
      const img = SP.props[kind]; if (!img) continue;
      const sc = (kind === "tree" || kind === "server") ? 3 : 2.4;
      props.push({ x, y, img, w: img.width / SP.PX * sc, h: img.height / SP.PX * sc, kind });
    }
    props.sort((a, b) => a.y - b.y); // draw back-to-front
  })();

  /* ---- Input ------------------------------------------------------------- */
  const keys = Object.create(null);
  const input = { up: false, down: false, left: false, right: false };
  let paused = false, started = false, nearestZone = null, hasMoved = false;

  const KEYMAP = { ArrowUp: "up", KeyW: "up", ArrowDown: "down", KeyS: "down", ArrowLeft: "left", KeyA: "left", ArrowRight: "right", KeyD: "right" };
  window.addEventListener("keydown", (e) => {
    if (KEYMAP[e.code]) { keys[KEYMAP[e.code]] = true; hasMoved = true; e.preventDefault(); }
    if (e.code === "KeyE" || e.code === "Enter" || e.code === "Space") {
      if (started && !paused && nearestZone) { e.preventDefault(); interact(nearestZone); }
    }
  });
  window.addEventListener("keyup", (e) => { if (KEYMAP[e.code]) { keys[KEYMAP[e.code]] = false; e.preventDefault(); } });

  function bindHold(el, dir) {
    if (!el) return;
    const on = (e) => { e.preventDefault(); input[dir] = true; hasMoved = true; };
    const off = (e) => { e.preventDefault(); input[dir] = false; };
    el.addEventListener("pointerdown", on); el.addEventListener("pointerup", off);
    el.addEventListener("pointerleave", off); el.addEventListener("pointercancel", off);
  }
  document.querySelectorAll("[data-dir]").forEach((el) => bindHold(el, el.dataset.dir));
  const actionBtn = document.getElementById("btnAction");
  if (actionBtn) actionBtn.addEventListener("pointerdown", (e) => { e.preventDefault(); if (started && !paused && nearestZone) interact(nearestZone); });

  /* ---- Drag-anywhere joystick (touch + mouse) ---------------------------- */
  // Press anywhere on the canvas and drag; the player walks toward the drag.
  // A floating ring renders at the touch origin (see render). This is the
  // primary mobile control — far easier than the tiny D-pad.
  const drag = { active: false, ox: 0, oy: 0, cx: 0, cy: 0, vx: 0, vy: 0 };
  function dragStart(e) {
    if (paused || !started) return;
    drag.active = true; hasMoved = true;
    drag.ox = drag.cx = e.clientX; drag.oy = drag.cy = e.clientY; drag.vx = drag.vy = 0;
  }
  function dragMove(e) {
    if (!drag.active) return;
    drag.cx = e.clientX; drag.cy = e.clientY;
    let dx = drag.cx - drag.ox, dy = drag.cy - drag.oy;
    const len = Math.hypot(dx, dy);
    const dead = 10, maxd = 60;
    if (len < dead) { drag.vx = drag.vy = 0; return; }
    const mag = Math.min(1, (len - dead) / (maxd - dead));
    drag.vx = (dx / len) * mag; drag.vy = (dy / len) * mag;
  }
  function dragEnd() { drag.active = false; drag.vx = drag.vy = 0; }
  canvas.addEventListener("pointerdown", dragStart);
  canvas.addEventListener("pointermove", dragMove);
  window.addEventListener("pointerup", dragEnd);
  canvas.addEventListener("pointercancel", dragEnd);

  /* ---- Juice state ------------------------------------------------------- */
  let shake = 0, zoom = 1, zoomTarget = 1, flash = 0, flashColor = T.accent;
  const particles = FX ? FX.makeParticles() : { burst() {}, update() {}, draw() {} };
  function addShake(v) { if (FX && !FX.reduced) shake = Math.min(1, shake + v); }

  /* ---- Engine API -------------------------------------------------------- */
  const api = {
    onEnterZone: null, onCollect: null, onAllCollected: null,
    setPaused(v) { paused = !!v; },
    teleportTo(key) { const z = zones.find((q) => q.key === key); if (z) { player.x = z.ix; player.y = z.iy; } },
    addShake,
    flashScreen(color) { flash = 1; flashColor = color || T.accent; },
    markVisited(key) { const b = buildings.find((q) => q.key === key); if (b && !b.visited) { b.visited = true; persist(); } },
    celebrate() { // confetti finale
      for (let i = 0; i < 5; i++) particles.burst(HUB.x + (i - 2) * 40, HUB.y, [T.reward, T.accent, T.accent2][i % 3], 26, 320);
      addShake(0.9); if (FX) FX.beep("unlock");
    },
    playIntro() {
      if (FX && FX.reduced) { zoom = 1; zoomTarget = 1; }
      else { zoom = 2.1; zoomTarget = 1; addShake(0.3); particles.burst(player.x, player.y, T.accent2, 22, 240); }
      setTimeout(() => { started = true; }, 350);
    },
    progress: () => ({ collected, total: shards.length }),
  };
  window.DevWorld = api;
  function interact(zone) { if (api.onEnterZone) api.onEnterZone(zone.key); }

  /* ---- Movement constrained to the road network -------------------------- */
  function distToSeg(px, py, ax, ay, bx, by) {
    const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy;
    let t = l2 ? ((px - ax) * dx + (py - ay) * dy) / l2 : 0;
    t = Math.max(0, Math.min(1, t));
    const cx = ax + t * dx, cy = ay + t * dy;
    return Math.hypot(px - cx, py - cy);
  }
  function inBuilding(px, py) {
    for (const b of buildings) if (px > b.x - 6 && px < b.x + b.w + 6 && py > b.y - 6 && py < b.y + b.h + 6) return true;
    return false;
  }
  function onRoad(px, py) {
    if (inBuilding(px, py)) return false;
    if (Math.hypot(px - HUB.x, py - HUB.y) <= HUB_R) return true;
    for (const r of roads) if (distToSeg(px, py, r.ax, r.ay, r.bx, r.by) <= ROAD_HW) return true;
    return false;
  }

  let collected = 0;
  function update(dt) {
    if (paused) { player.moving = false; return; }
    const u = input.up || keys.up, d = input.down || keys.down, l = input.left || keys.left, r = input.right || keys.right;
    let vx = (r ? 1 : 0) - (l ? 1 : 0), vy = (d ? 1 : 0) - (u ? 1 : 0);
    // drag-joystick overrides if active (analog)
    if (drag.active && (drag.vx || drag.vy)) { vx = drag.vx; vy = drag.vy; }
    player.moving = !!(vx || vy);
    if (player.moving) {
      const len = Math.hypot(vx, vy) || 1; vx /= len; vy /= len;
      player.dx = vx; player.dy = vy;
      // facing for the sprite (prefer the dominant axis)
      if (Math.abs(vx) > Math.abs(vy)) player.face = vx > 0 ? "right" : "left";
      else player.face = vy > 0 ? "down" : "up";
      const nx = player.x + vx * player.speed * dt, ny = player.y + vy * player.speed * dt;
      // per-axis: only move onto road tiles -> player slides along corridors
      if (onRoad(nx, player.y)) player.x = nx;
      if (onRoad(player.x, ny)) player.y = ny;
      player.bob += dt * 12;
      player.walk += dt * 10;                 // walk-cycle phase
      player.sx += ((1.1) - player.sx) * Math.min(1, dt * 8);
      player.sy += ((0.92) - player.sy) * Math.min(1, dt * 8);
    } else {
      player.walk = 0;
      player.sx += (1 - player.sx) * Math.min(1, dt * 8);
      player.sy += (1 - player.sy) * Math.min(1, dt * 8);
    }

    nearestZone = null; let best = 110 * 110;
    for (const z of zones) { const dx = z.ix - player.x, dy = z.iy - player.y, dsq = dx * dx + dy * dy; if (dsq < best) { best = dsq; nearestZone = z; } }

    for (const s of shards) {
      if (s.collected) continue;
      const dx = s.x - player.x, dy = s.y - player.y;
      if (dx * dx + dy * dy < 32 * 32) {
        s.collected = true; collected++;
        particles.burst(s.x, s.y, T.accent2, 18, 230); addShake(0.4); if (FX) FX.beep("collect");
        if (api.onCollect) api.onCollect(collected, shards.length, s.name);
        if (collected === shards.length && api.onAllCollected) api.onAllCollected();
      }
    }
    shake = Math.max(0, shake - dt * 2.5);
    flash = Math.max(0, flash - dt * 2);
    zoom += (zoomTarget - zoom) * Math.min(1, dt * 4);
    particles.update(dt);
  }

  /* ---- Drawing helpers --------------------------------------------------- */
  function rr(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
  function hexA(hex, a) { const n = parseInt(hex.slice(1), 16); return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`; }

  /* ---- Static floor baked once ------------------------------------------- */
  let floor = null;
  function bakeFloor() {
    floor = document.createElement("canvas"); floor.width = VW; floor.height = VH;
    const c = floor.getContext("2d");
    c.imageSmoothingEnabled = false;
    c.fillStyle = T.bgFloor; c.fillRect(0, 0, VW, VH);
    // pixel-art grass tile across the whole map
    if (SP) { const g = SP.tile("grass"), pat = c.createPattern(g, "repeat"); c.fillStyle = pat; c.fillRect(0, 0, VW, VH); }
    // roads: paved path texture corridor + colored neon center line
    const pathPat = SP ? c.createPattern(SP.tile("path"), "repeat") : null;
    for (let i = 0; i < roads.length; i++) {
      const r = roads[i], col = buildings[i].color;
      c.save(); c.lineCap = "round";
      // dark base
      c.strokeStyle = "rgba(15,21,34,.98)"; c.lineWidth = ROAD_HW * 2;
      c.beginPath(); c.moveTo(r.ax, r.ay); c.lineTo(r.bx, r.by); c.stroke();
      // textured fill (clip to the stroke)
      if (pathPat) { c.save(); c.lineWidth = ROAD_HW * 2 - 6; c.strokeStyle = pathPat; c.beginPath(); c.moveTo(r.ax, r.ay); c.lineTo(r.bx, r.by); c.stroke(); c.restore(); }
      // colored edge glow + dashed center
      c.strokeStyle = hexA(col, 0.18); c.lineWidth = ROAD_HW * 2; c.beginPath(); c.moveTo(r.ax, r.ay); c.lineTo(r.bx, r.by); c.stroke();
      c.strokeStyle = hexA(col, 0.55); c.lineWidth = 2; c.setLineDash([16, 16]);
      c.beginPath(); c.moveTo(r.ax, r.ay); c.lineTo(r.bx, r.by); c.stroke();
      c.restore();
    }
    // hub disc (paved)
    c.fillStyle = "rgba(20,28,45,.98)"; c.beginPath(); c.arc(HUB.x, HUB.y, HUB_R, 0, Math.PI * 2); c.fill();
    if (pathPat) { c.save(); c.beginPath(); c.arc(HUB.x, HUB.y, HUB_R - 3, 0, Math.PI * 2); c.clip(); c.fillStyle = pathPat; c.fillRect(HUB.x - HUB_R, HUB.y - HUB_R, HUB_R * 2, HUB_R * 2); c.restore(); }
    c.strokeStyle = "rgba(120,160,230,.35)"; c.lineWidth = 2; c.beginPath(); c.arc(HUB.x, HUB.y, HUB_R, 0, Math.PI * 2); c.stroke();
    c.strokeStyle = "rgba(120,160,230,.16)"; c.beginPath(); c.arc(HUB.x, HUB.y, HUB_R - 16, 0, Math.PI * 2); c.stroke();
    c.fillStyle = "rgba(150,180,230,.5)"; c.font = "700 13px 'JetBrains Mono', monospace"; c.textAlign = "center";
    c.fillText(C.world.hubLabel || "SPAWN", HUB.x, HUB.y + 4);
    // stars
    for (let i = 0; i < 200; i++) { const x = (i * 9301 + 49297) % VW, y = (i * 233280 + 12345) % VH; if (Math.hypot(x - HUB.x, y - HUB.y) < HUB_R) continue; c.fillStyle = `rgba(150,190,255,${0.04 + (i % 5) * 0.012})`; c.fillRect(x, y, (i % 3) ? 1 : 1.6, (i % 3) ? 1 : 1.6); }
    // vignette
    const g = c.createRadialGradient(VW / 2, VH / 2, VH * 0.3, VW / 2, VH / 2, VW * 0.6);
    g.addColorStop(0, "rgba(0,0,0,0)"); g.addColorStop(1, "rgba(0,0,0,.5)");
    c.fillStyle = g; c.fillRect(0, 0, VW, VH);
  }

  /* ---- Building renderer ------------------------------------------------- */
  function drawBuilding(b, near) {
    const { x, y, w, h, color } = b;
    const lit = near || b.visited;
    // ground glow
    ctx.save(); ctx.globalAlpha = lit ? 0.5 : 0.3; ctx.fillStyle = color;
    ctx.beginPath(); ctx.ellipse(x + w / 2, y + h + 6, w * 0.55, 28, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    // body
    const g = ctx.createLinearGradient(0, y, 0, y + h);
    g.addColorStop(0, "#1A2236"); g.addColorStop(1, "#0C1019");
    rr(ctx, x, y, w, h, 14); ctx.fillStyle = g; ctx.fill();
    ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = near ? 3.5 : 2; ctx.shadowColor = color; ctx.shadowBlur = near ? 26 : 12;
    rr(ctx, x, y, w, h, 14); ctx.stroke(); ctx.restore();
    ctx.fillStyle = hexA(color, 0.85); rr(ctx, x + 10, y + 7, w - 20, 7, 3); ctx.fill();
    // window row
    const m = 22, cell = 30, win = 16, cols = Math.floor((w - m * 2) / cell);
    for (let cI = 0; cI < cols; cI++) { const wx = x + m + cI * cell; const on = lit || ((cI * 3 + b.x) % 3 === 0); ctx.fillStyle = on ? hexA(color, 0.5) : "rgba(120,150,200,.1)"; rr(ctx, wx, y + 26, win, win, 3); ctx.fill(); }
    // sign band
    const bandY = y + 56;
    ctx.fillStyle = "rgba(0,0,0,.28)"; rr(ctx, x + 12, bandY, w - 24, h - 56 - 10, 8); ctx.fill();
    ctx.textAlign = "center";
    ctx.fillStyle = color; ctx.shadowColor = color; ctx.shadowBlur = near ? 14 : 7; ctx.font = "24px system-ui, sans-serif";
    ctx.fillText(b.icon, x + w / 2, bandY + 28); ctx.shadowBlur = 0;
    ctx.fillStyle = T.text; ctx.font = "700 15px 'JetBrains Mono', monospace"; ctx.fillText(b.label, x + w / 2, bandY + 52);
    ctx.fillStyle = hexA(color, 0.9); ctx.font = "600 10px 'JetBrains Mono', monospace"; ctx.fillText(b.sub, x + w / 2, bandY + 68);
    if (b.visited) { ctx.fillStyle = hexA(color, 0.9); ctx.font = "700 9px 'JetBrains Mono', monospace"; ctx.fillText("✓ VISITED", x + w / 2, y + h - 8); }

    // entry pad on the road (the interaction point)
    const pulse = 1 + Math.sin(perf * 2 + b.cx) * 0.12;
    ctx.save();
    ctx.globalAlpha = 0.2; ctx.fillStyle = color; ctx.beginPath(); ctx.arc(b.ix, b.iy, 30 * pulse, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1; ctx.strokeStyle = color; ctx.lineWidth = near ? 4 : 2; ctx.shadowColor = color; ctx.shadowBlur = near ? 22 : 9;
    ctx.beginPath(); ctx.arc(b.ix, b.iy, 24, 0, Math.PI * 2); ctx.stroke(); ctx.shadowBlur = 0;
    ctx.fillStyle = color; ctx.font = "18px system-ui, sans-serif"; ctx.textAlign = "center"; ctx.fillText(b.icon, b.ix, b.iy + 6);
    ctx.restore();
    if (near) {
      const txt = "▸ PRESS  E", py = b.iy - 40;
      ctx.font = "700 13px 'JetBrains Mono', monospace"; const pw = ctx.measureText(txt).width + 24;
      ctx.fillStyle = color; ctx.shadowColor = color; ctx.shadowBlur = 18; rr(ctx, b.ix - pw / 2, py - 14, pw, 26, 13); ctx.fill(); ctx.shadowBlur = 0;
      ctx.fillStyle = "#0A0E18"; ctx.textAlign = "center"; ctx.fillText(txt, b.ix, py + 4);
    }
  }

  /* ---- Render ------------------------------------------------------------ */
  let scale = 1, dpr = 1;
  function resize() {
    dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.width = canvas.clientWidth * dpr; canvas.height = canvas.clientHeight * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    scale = Math.min(canvas.clientWidth / VW, canvas.clientHeight / VH);
  }
  window.addEventListener("resize", resize);

  let perf = 0;
  function render() {
    perf += 0.016;
    const cw = canvas.clientWidth, ch = canvas.clientHeight;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = T.bg; ctx.fillRect(0, 0, cw, ch);
    // fit-to-screen transform: center the whole VWxVH world; intro zoom is around hub (center)
    const s = scale * zoom;
    let tx = cw / 2 - HUB.x * s, ty = ch / 2 - HUB.y * s;
    if (shake > 0 && FX && !FX.reduced) { const m = 12 * shake * shake * FX.intensity; tx += Math.sin(perf * 53) * m; ty += Math.cos(perf * 61) * m; }
    ctx.setTransform(s * dpr, 0, 0, s * dpr, tx * dpr, ty * dpr);
    ctx.imageSmoothingEnabled = false; // crisp pixel art

    if (floor) ctx.drawImage(floor, 0, 0);

    // decorative props (sprites) — drawn under buildings, with a soft shadow
    for (const pr of props) {
      ctx.save(); ctx.globalAlpha = 0.3; ctx.fillStyle = "#000";
      ctx.beginPath(); ctx.ellipse(pr.x, pr.y + pr.h / 2 - 2, pr.w * 0.4, 5, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
      if (pr.kind === "lamp") { ctx.save(); ctx.globalAlpha = 0.18 + Math.sin(perf * 3 + pr.x) * 0.05; ctx.fillStyle = "#fff3c4"; ctx.beginPath(); ctx.arc(pr.x, pr.y - pr.h / 3, pr.w * 1.2, 0, Math.PI * 2); ctx.fill(); ctx.restore(); }
      ctx.drawImage(pr.img, pr.x - pr.w / 2, pr.y - pr.h / 2, pr.w, pr.h);
    }

    for (const b of [...buildings].sort((a, b) => a.cy - b.cy)) drawBuilding(b, nearestZone === b);

    for (const sh of shards) {
      if (sh.collected) continue;
      const bob = Math.sin(perf * 3 + sh.t) * 5;
      ctx.save(); ctx.globalAlpha = 0.3; ctx.fillStyle = "#000"; ctx.beginPath(); ctx.ellipse(sh.x, sh.y + 13, 9, 4, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
      ctx.save(); ctx.translate(sh.x, sh.y + bob);
      ctx.globalAlpha = 0.25 + Math.sin(perf * 4 + sh.t) * 0.1; ctx.fillStyle = "#7CF9FF"; ctx.beginPath(); ctx.arc(0, 0, 17, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1;
      ctx.rotate(perf * 1.5 + sh.t);
      ctx.fillStyle = "#7CF9FF"; ctx.shadowColor = "#7CF9FF"; ctx.shadowBlur = 14;
      ctx.beginPath(); ctx.moveTo(0, -11); ctx.lineTo(9, 0); ctx.lineTo(0, 11); ctx.lineTo(-9, 0); ctx.closePath(); ctx.fill();
      ctx.fillStyle = "#EAFEFF"; ctx.shadowBlur = 0; ctx.beginPath(); ctx.moveTo(0, -5); ctx.lineTo(4, 0); ctx.lineTo(0, 5); ctx.lineTo(-4, 0); ctx.closePath(); ctx.fill();
      ctx.restore();
    }

    drawPlayer();
    particles.draw(ctx);

    // start nudge: arrow from player to nearest building until first move
    if (started && !hasMoved && nearestZone) {
      const b = nearestZone; const ang = Math.atan2(b.iy - player.y, b.ix - player.x);
      ctx.save(); ctx.translate(player.x + Math.cos(ang) * 46, player.y + Math.sin(ang) * 46); ctx.rotate(ang);
      ctx.globalAlpha = 0.5 + Math.sin(perf * 5) * 0.3; ctx.fillStyle = T.accent;
      ctx.beginPath(); ctx.moveTo(14, 0); ctx.lineTo(-6, -8); ctx.lineTo(-6, 8); ctx.closePath(); ctx.fill(); ctx.restore();
    }

    // enter-flash color wash (screen space)
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (flash > 0) { ctx.globalAlpha = flash * 0.4; ctx.fillStyle = flashColor; ctx.fillRect(0, 0, cw, ch); ctx.globalAlpha = 1; }
    // drag joystick ring (screen space)
    if (drag.active) {
      ctx.save();
      ctx.globalAlpha = 0.25; ctx.strokeStyle = T.accent2; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(drag.ox, drag.oy, 46, 0, Math.PI * 2); ctx.stroke();
      ctx.globalAlpha = 0.9; ctx.fillStyle = T.accent; ctx.shadowColor = T.accent; ctx.shadowBlur = 14;
      const kx = drag.ox + drag.vx * 46, ky = drag.oy + drag.vy * 46;
      ctx.beginPath(); ctx.arc(kx, ky, 18, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
  }

  function drawPlayer() {
    const sprite = SP ? SP.hero(player.face) : null;
    const walkBounce = player.moving ? Math.abs(Math.sin(player.walk)) * 3 : Math.sin(perf * 2) * 1.0;
    const px = player.x, py = player.y - walkBounce;
    // shadow
    ctx.save(); ctx.globalAlpha = 0.35; ctx.fillStyle = "#000"; ctx.beginPath(); ctx.ellipse(px, player.y + 16, 15, 5, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    // glow ring
    ctx.save(); ctx.globalAlpha = 0.38 + Math.sin(perf * 4) * 0.12; ctx.strokeStyle = T.accent; ctx.lineWidth = 2; ctx.shadowColor = T.accent; ctx.shadowBlur = 16;
    ctx.beginPath(); ctx.ellipse(px, player.y + 14, 16, 6, 0, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
    if (sprite) {
      const sw = sprite.width / SP.PX, sh = sprite.height / SP.PX; // art units
      const SC = 2.6; const dw = sw * SC, dh = sh * SC;
      ctx.save(); ctx.translate(px, py); ctx.scale(player.sx, player.sy);
      // tiny leg-step sway via slight horizontal shift while walking
      const sway = player.moving ? Math.sin(player.walk) * 1.5 : 0;
      ctx.drawImage(sprite, -dw / 2 + sway, -dh + 18, dw, dh);
      ctx.restore();
    } else {
      ctx.fillStyle = T.accent; ctx.beginPath(); ctx.arc(px, py, player.r, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = T.text; ctx.font = "700 10px 'JetBrains Mono', monospace"; ctx.textAlign = "center"; ctx.fillText("YOU", px, py - 34);
  }

  /* ---- Loop -------------------------------------------------------------- */
  // Skip the expensive full-world redraw while a modal / mini-game covers the
  // screen (paused) or the tab is backgrounded — the loop keeps spinning so play
  // resumes instantly. NB: gate on `paused`, not `started`, so the boot screen
  // still shows the living world animating behind the glass overlay.
  let last = 0;
  function loop(ts) { const dt = Math.min(0.05, (ts - last) / 1000 || 0); last = ts; update(dt); if (!paused && !document.hidden) render(); requestAnimationFrame(loop); }
  resize(); bakeFloor();
  requestAnimationFrame(loop);
})();
