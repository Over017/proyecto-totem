/* SkyFlow · sonidos cortos del tótem generados con Web Audio (sin archivos). */
(function () {
  'use strict';
  let ctx = null;
  let enabled = true;

  function audio() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function tone(freq, start, dur, type, gain) {
    const a = audio();
    if (!a) return;
    const t0 = a.currentTime + start;
    const osc = a.createOscillator();
    const g = a.createGain();
    osc.type = type || 'sine';
    osc.frequency.setValueAtTime(freq, t0);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain || 0.08, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g).connect(a.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  const SOUNDS = {
    tap: () => tone(880, 0, 0.05, 'sine', 0.035),
    key: () => tone(1200, 0, 0.035, 'triangle', 0.025),
    scan: () => { tone(1320, 0, 0.09, 'square', 0.04); tone(1760, 0.1, 0.12, 'square', 0.04); },
    success: () => { tone(660, 0, 0.12, 'sine', 0.07); tone(880, 0.1, 0.12, 'sine', 0.07); tone(1320, 0.2, 0.22, 'sine', 0.07); },
    error: () => { tone(220, 0, 0.14, 'sawtooth', 0.045); tone(180, 0.15, 0.18, 'sawtooth', 0.045); },
    add: () => { tone(740, 0, 0.08, 'sine', 0.06); tone(988, 0.07, 0.12, 'sine', 0.06); },
    remove: () => { tone(520, 0, 0.08, 'sine', 0.05); tone(390, 0.07, 0.1, 'sine', 0.05); },
    print: () => { for (let i = 0; i < 6; i++) tone(140 + (i % 2) * 30, i * 0.07, 0.06, 'square', 0.015); },
    alert: () => { tone(988, 0, 0.1, 'sine', 0.06); tone(988, 0.18, 0.1, 'sine', 0.06); },
  };

  window.SKY_SOUND = {
    play(name) { if (enabled && SOUNDS[name]) { try { SOUNDS[name](); } catch (e) { /* sin audio */ } } },
    get enabled() { return enabled; },
    set enabled(v) { enabled = !!v; },
  };
})();
