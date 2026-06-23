/* =============================================================================
 * fx.js — shared juice/accessibility layer for Dev World
 * -----------------------------------------------------------------------------
 * One home for: synthesized sound (Web Audio, zero asset files), the
 * reduced-motion guardrail, a global intensity multiplier, and a mute toggle.
 * Both the world (game.js) and the mini-games (minigame.js) read from here, so
 * the accessibility switch is enforced in exactly ONE place.
 *
 * Exposes window.FX:
 *   FX.reduced            -> bool (prefers-reduced-motion OR user toggle)
 *   FX.intensity          -> 0..1 multiplier for shake/particles
 *   FX.muted              -> bool
 *   FX.setReduced(v) / FX.setMuted(v)
 *   FX.beep(type)         -> play a synthesized SFX ('shoot','hit','collect','unlock','ui','lose')
 *   FX.unlockAudio()      -> resume AudioContext on first user gesture
 *   FX.Particles          -> tiny reusable particle system factory
 * ============================================================================= */
(function () {
  "use strict";

  const mqReduced = window.matchMedia("(prefers-reduced-motion: reduce)");
  const state = {
    reduced: mqReduced.matches,
    userReduced: false,
    intensity: 1,
    muted: false,
  };

  /* ---- Web Audio: synthesize beeps so there are NO audio files ----------- */
  let actx = null;
  function ensureCtx() {
    if (!actx) { try { actx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { actx = null; } }
    return actx;
  }
  function unlockAudio() { const c = ensureCtx(); if (c && c.state === "suspended") c.resume(); }

  // type -> {f0, f1, dur, wave}
  const VOICES = {
    shoot:   { f0: 720, f1: 180, dur: 0.10, wave: "square" },
    hit:     { f0: 320, f1: 90,  dur: 0.12, wave: "sawtooth" },
    collect: { f0: 540, f1: 960, dur: 0.14, wave: "triangle" },
    unlock:  { f0: 440, f1: 880, dur: 0.30, wave: "triangle" },
    ui:      { f0: 600, f1: 600, dur: 0.05, wave: "sine" },
    lose:    { f0: 240, f1: 120, dur: 0.18, wave: "sine" },
  };
  function beep(type) {
    if (state.muted) return;
    const c = ensureCtx(); if (!c || c.state !== "running") return;
    const v = VOICES[type] || VOICES.ui;
    const t = c.currentTime;
    const osc = c.createOscillator(), gain = c.createGain();
    osc.type = v.wave;
    osc.frequency.setValueAtTime(v.f0, t);
    osc.frequency.exponentialRampToValueAtTime(Math.max(40, v.f1), t + v.dur);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.18, t + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + v.dur);
    osc.connect(gain).connect(c.destination);
    osc.start(t); osc.stop(t + v.dur + 0.02);
  }

  /* ---- Reusable particle system (per-canvas) ----------------------------- */
  function makeParticles() {
    let parts = [];
    return {
      burst(x, y, color, count = 14, speed = 180) {
        if (state.reduced) count = Math.min(count, 4);
        count = Math.round(count * state.intensity) || 1;
        for (let i = 0; i < count; i++) {
          const a = (Math.PI * 2 * i) / count + (i * 0.7);
          const s = speed * (0.4 + (i % 5) / 5);
          parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 1, color, r: 2 + (i % 3) });
        }
      },
      update(dt) {
        for (const p of parts) { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 220 * dt; p.life -= dt * 2.2; }
        parts = parts.filter((p) => p.life > 0);
      },
      draw(ctx) {
        for (const p of parts) {
          ctx.globalAlpha = Math.max(0, p.life);
          ctx.fillStyle = p.color;
          ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
        }
        ctx.globalAlpha = 1;
      },
      count() { return parts.length; },
      clear() { parts = []; },
    };
  }

  // user toggle merges with OS setting
  function recompute() { state.reduced = mqReduced.matches || state.userReduced; if (state.reduced) state.intensity = 0; else state.intensity = 1; }
  mqReduced.addEventListener && mqReduced.addEventListener("change", recompute);

  window.FX = {
    get reduced() { return state.reduced; },
    get intensity() { return state.intensity; },
    get muted() { return state.muted; },
    setReduced(v) { state.userReduced = !!v; recompute(); },
    setMuted(v) { state.muted = !!v; },
    beep, unlockAudio, makeParticles,
  };
  recompute();
})();
