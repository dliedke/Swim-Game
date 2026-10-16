/* Áudio sintetizado com WebAudio (sem arquivos externos) */
(function () {
  var A = {
    ctx: null, master: null, filter: null, muted: false,
    crowdGain: null, noiseBuf: null, underwater: false, excitement: 0.2
  };

  A.init = function () {
    if (A.ctx) { if (A.ctx.state === 'suspended') A.ctx.resume(); return; }
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    try { A.ctx = new AC(); } catch (e) { return; }
    var ctx = A.ctx;
    A.master = ctx.createGain();
    A.master.gain.value = A.muted ? 0 : 0.8;
    A.filter = ctx.createBiquadFilter();
    A.filter.type = 'lowpass';
    A.filter.frequency.value = 20000;
    A.filter.connect(A.master);
    A.master.connect(ctx.destination);

    var len = ctx.sampleRate * 2;
    A.noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
    var d = A.noiseBuf.getChannelData(0);
    for (var i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;

    // torcida ambiente
    var src = ctx.createBufferSource();
    src.buffer = A.noiseBuf; src.loop = true;
    var bp = ctx.createBiquadFilter();
    bp.type = 'bandpass'; bp.frequency.value = 900; bp.Q.value = 0.6;
    A.crowdGain = ctx.createGain();
    A.crowdGain.gain.value = 0.05;
    src.connect(bp); bp.connect(A.crowdGain); A.crowdGain.connect(A.filter);
    src.start();
    A.crowdTimer = setInterval(A.crowdVoices, 260);
  };

  A.crowdVoices = function () {
    if (!A.ctx || A.muted) return;
    var ex = A.excitement;
    if (Math.random() > 0.25 + ex * 0.6) return;
    var ctx = A.ctx, t = ctx.currentTime;
    var o = ctx.createOscillator();
    o.type = 'sawtooth';
    var f = 180 + Math.random() * 260;
    o.frequency.setValueAtTime(f, t);
    o.frequency.linearRampToValueAtTime(f * (1 + Math.random() * 0.3), t + 0.4);
    var bp = ctx.createBiquadFilter();
    bp.type = 'bandpass'; bp.frequency.value = 700 + Math.random() * 700; bp.Q.value = 3;
    var g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.012 + ex * 0.025, t + 0.08);
    g.gain.linearRampToValueAtTime(0, t + 0.5 + Math.random() * 0.4);
    o.connect(bp); bp.connect(g); g.connect(A.filter);
    o.start(t); o.stop(t + 1);
  };

  A.noise = function (dur, freq, type, vol, q, delay) {
    if (!A.ctx || A.muted) return;
    var ctx = A.ctx, t = ctx.currentTime + (delay || 0);
    var s = ctx.createBufferSource();
    s.buffer = A.noiseBuf;
    var f = ctx.createBiquadFilter();
    f.type = type || 'lowpass'; f.frequency.value = freq; if (q) f.Q.value = q;
    var g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    s.connect(f); f.connect(g); g.connect(A.filter);
    s.start(t, Math.random() * 1.5); s.stop(t + dur + 0.05);
  };

  A.splash = function (vol) {
    vol = vol == null ? 0.25 : vol;
    if (vol < 0.01) return;
    A.noise(0.22 + Math.random() * 0.1, 2500 + Math.random() * 2500, 'lowpass', vol);
    A.noise(0.12, 600, 'bandpass', vol * 0.6, 1.2);
  };

  A.dive = function () {
    A.noise(0.6, 1800, 'lowpass', 0.5);
    A.noise(0.9, 400, 'lowpass', 0.4);
  };

  A.breath = function () {
    A.noise(0.35, 1400, 'bandpass', 0.18, 0.8);
    A.noise(0.25, 900, 'bandpass', 0.1, 0.8, 0.3);
  };

  A.bubble = function () {
    if (!A.ctx || A.muted) return;
    var ctx = A.ctx, t = ctx.currentTime;
    for (var i = 0; i < 3; i++) {
      var o = ctx.createOscillator();
      o.type = 'sine';
      var dt = i * 0.05 + Math.random() * 0.04;
      var f = 300 + Math.random() * 500;
      o.frequency.setValueAtTime(f, t + dt);
      o.frequency.exponentialRampToValueAtTime(f * 2.2, t + dt + 0.08);
      var g = ctx.createGain();
      g.gain.setValueAtTime(0, t + dt);
      g.gain.linearRampToValueAtTime(0.06, t + dt + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0005, t + dt + 0.1);
      o.connect(g); g.connect(A.master);
      o.start(t + dt); o.stop(t + dt + 0.12);
    }
  };

  A.tone = function (freq, dur, type, vol, delay) {
    if (!A.ctx || A.muted) return;
    var ctx = A.ctx, t = ctx.currentTime + (delay || 0);
    var o = ctx.createOscillator();
    o.type = type || 'square';
    o.frequency.value = freq;
    var g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol || 0.15, t + 0.01);
    g.gain.setValueAtTime(vol || 0.15, t + dur - 0.03);
    g.gain.linearRampToValueAtTime(0, t + dur);
    o.connect(g); g.connect(A.master);
    o.start(t); o.stop(t + dur + 0.02);
  };

  A.beep = function () { A.tone(1046, 0.45, 'square', 0.13); };
  A.tick = function () { A.tone(1500, 0.05, 'sine', 0.08); };
  A.wallHit = function () { A.noise(0.15, 300, 'lowpass', 0.5); };
  A.horn = function () { A.tone(523, 0.6, 'sawtooth', 0.08); A.tone(659, 0.6, 'sawtooth', 0.06); };
  A.good = function () { A.tone(880, 0.08, 'sine', 0.08); A.tone(1320, 0.12, 'sine', 0.07, 0.08); };
  A.bad = function () { A.tone(220, 0.18, 'triangle', 0.1); };

  A.cheer = function () {
    if (!A.ctx || A.muted) return;
    var ctx = A.ctx, t = ctx.currentTime;
    var s = ctx.createBufferSource();
    s.buffer = A.noiseBuf; s.loop = true;
    var f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1100; f.Q.value = 0.5;
    var g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.35, t + 0.4);
    g.gain.linearRampToValueAtTime(0.0, t + 3.5);
    s.connect(f); f.connect(g); g.connect(A.filter);
    s.start(t); s.stop(t + 3.6);
  };

  A.setUnderwater = function (uw) {
    if (!A.ctx || uw === A.underwater) return;
    A.underwater = uw;
    var t = A.ctx.currentTime;
    A.filter.frequency.cancelScheduledValues(t);
    A.filter.frequency.setTargetAtTime(uw ? 480 : 20000, t, 0.05);
  };

  A.setExcitement = function (x) {
    A.excitement = x;
    if (A.crowdGain) A.crowdGain.gain.setTargetAtTime(0.03 + x * 0.12, A.ctx.currentTime, 0.4);
  };

  A.toggleMute = function () {
    A.muted = !A.muted;
    if (A.master) A.master.gain.value = A.muted ? 0 : 0.8;
    if (A.muted && window.speechSynthesis) window.speechSynthesis.cancel();
    return A.muted;
  };

  A.speak = function (text, lang) {
    if (A.muted || !window.speechSynthesis) return;
    try {
      var u = new SpeechSynthesisUtterance(text);
      u.lang = lang || 'pt-BR';
      u.rate = 0.95;
      u.volume = 0.9;
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(u);
    } catch (e) { /* sem voz */ }
  };

  SG.Audio = A;
})();
