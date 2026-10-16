/* Nadador controlado pelo jogador: física, ritmo, respiração, viradas e câmera em 1ª pessoa */
(function () {
  var V3 = THREE.Vector3, Q = THREE.Quaternion;
  var qA = new Q(), qB = new Q(), qC = new Q();
  var vA = new V3();

  var EYE_BLOCK = SG.DECK_Y + 0.66 + 1.05;
  var BP = 0.55; // inclinação da câmera no costas (olhando para cima e para trás)

  function thrustAt(v) { return SG.DRAG_K * v * v + SG.DRAG_C * v; }

  function Player(race, lane, info) {
    this.race = race;
    this.isPlayer = true;
    this.lane = lane;
    this.x = SG.laneX(lane);
    this.name = info.name;
    this.country = info.country;
    this.cap = info.cap;
    this.model = new SG.SwimmerModel({ cap: info.cap, suit: 0x0b3d91, skin: 0xe0ac69 });
    this.reset();
  }

  Player.prototype.reset = function () {
    var r = this.race;
    this.now = 0;
    this.length = 0;
    this.dir = 1;
    this.s = -0.35;
    this.v = 0;
    this.stroke = r.strokeAt(0);
    this.state = SG.STROKES[this.stroke].supine ? 'wallstart' : 'block';
    if (this.state === 'wallstart') this.s = 0.32;
    this.finished = false;
    this.finishTime = null;
    this.dq = false;
    this.stamina = 1;
    this.oxygen = 1;
    this.pulses = [];
    this.lastStrokeT = -10;
    this.lastArm = null;
    this.firstStroke = true;
    this.pressT = { left: -10, right: -10 };
    this.breathT = 0; this.breathDur = 0.5; this.breathSide = 1;
    this.breathMult = 1;
    this.armL = { th: 0, from: 0, t0: -10, dur: 1 };
    this.armR = { th: 0, from: 0, t0: -10, dur: 1 };
    this.flyArm = { th: 0, from: 0, t0: -10, dur: 1 };
    this.breastStage = 'kicked';
    this.lastPullT = -10; this.lastKickT = -10;
    this.breastP = 0; this.breastAnimT0 = -10; this.kickEnv = 0;
    this.kickPh = 0;
    this.uwT = 0; this.uwStartS = 0; this.lastDolphinT = -10;
    this.turn = null;
    this.dive = null;
    this.camY = this.state === 'block' ? EYE_BLOCK : 0.18;
    this.camPos = new V3(this.x, this.camY, this.s);
    this.camQuat = new Q();
    this.bodyQuat = new Q();
    this.splits = [];
    this.reaction = null;
    this.lastRating = null;
    this.rhythmQuality = 0;
    this.distance = 0;
    this.underwater = false;
    this.lastBubbleT = 0;
    this.wallWarned = false;
  };

  Player.prototype.strokeDef = function () { return SG.STROKES[this.stroke]; };
  Player.prototype.isLastLength = function () { return this.length >= this.race.laps - 1; };
  Player.prototype.wallDist = function () { return this.dir > 0 ? this.race.L - this.s : this.s; };
  Player.prototype.inTurnZone = function () {
    return this.state === 'swim' && !this.isLastLength() && this.wallDist() < this.strokeDef().turnZone;
  };

  Player.prototype.msg = function (text, cls) { if (this.race.onMsg) this.race.onMsg(text, cls); };

  Player.prototype.addPulse = function (J, dur) {
    this.pulses.push({ t0: this.now, dur: dur, acc: J / dur });
  };

  // impulso por braçada calibrado para que o ritmo ideal atinja vmax
  Player.prototype.strokeImpulse = function () {
    var d = this.strokeDef();
    var A = thrustAt(d.vmax * 1.03);
    if (d.type === 'alt') return A * (d.ideal[0] + d.ideal[1]) / 2;
    if (d.type === 'fly') return A * (d.ideal[0] + d.ideal[1]) / 2;
    var cycle = (d.pullKick[0] + d.pullKick[1]) / 2 + (d.kickPull[0] + d.kickPull[1]) / 2 + 0.12;
    return A * cycle;
  };

  Player.prototype.staminaMult = function () {
    return 0.5 + 0.5 * SG.smooth(this.stamina / 0.35);
  };

  Player.prototype.rate = function (interval, range) {
    if (this.firstStroke) return { q: 1, r: 'ok' };
    if (interval < range[0]) return { q: SG.clamp(Math.pow(interval / range[0], 2), 0.25, 1), r: 'fast' };
    if (interval <= range[1]) return { q: 1, r: 'perfect' };
    return { q: 1, r: 'slow' };
  };

  Player.prototype.spendStamina = function (base, interval, mid) {
    var f = SG.clamp(mid / Math.max(0.05, interval), 0.5, 3);
    if (this.firstStroke) f = 1;
    this.stamina = SG.clamp(this.stamina - base * Math.pow(f, 1.7), 0, 1);
  };

  Player.prototype.startArm = function (arm, dur) {
    arm.from = arm.th % (Math.PI * 2);
    if (arm.from > 0.3) arm.from -= Math.PI * 2; // completa a volta até a entrada
    arm.t0 = this.now;
    arm.dur = dur;
  };

  Player.prototype.updateArm = function (arm) {
    var t = (this.now - arm.t0) / arm.dur;
    if (t >= 1) { arm.th = 0; return; }
    // puxada (0..π) mais rápida que a recuperação
    var th;
    if (t < 0.48) th = SG.lerp(arm.from, Math.PI, t / 0.48);
    else th = SG.lerp(Math.PI, Math.PI * 2, (t - 0.48) / 0.52);
    arm.th = th;
  };

  // ---------------- entrada ----------------
  Player.prototype.onInput = function (act) {
    if (this.finished || this.dq) return;
    var st = this.state;
    if (st === 'underwater') {
      if (act === 'down' || act === 'action') return this.dolphinKick();
      var d = this.strokeDef();
      var strokeKey = (d.type === 'alt' && (act === 'left' || act === 'right')) ||
        ((d.type === 'fly' || d.type === 'breast') && (act === 'up' || act === 'left' || act === 'right'));
      if (strokeKey && this.uwT > 0.3) {
        this.breakout();
        this.onInput(act);
      }
      return;
    }
    if (st !== 'swim') return;
    if (act === 'action') {
      if (this.inTurnZone() && this.wallDist() <= this.strokeDef().turnGood[1]) return this.attemptTurn();
      if (this.inTurnZone() && !this.strokeDef().breath) return this.attemptTurn();
      return this.breathe();
    }
    var def = this.strokeDef();
    if (def.type === 'alt') {
      if (act === 'left' || act === 'right') this.altStroke(act);
      else if (act === 'up' || act === 'down') this.msg('Use ← e → alternados', 'hint');
    } else if (def.type === 'fly') {
      if (act === 'up') this.flyStroke();
      else if (act === 'left' || act === 'right') {
        var other = act === 'left' ? 'right' : 'left';
        this.pressT[act] = this.now;
        if (this.now - this.pressT[other] < 0.18) { this.pressT[other] = -10; this.pressT[act] = -10; this.flyStroke(); }
      } else if (act === 'down') this.msg('Borboleta: ↑ (ou ← + → juntos)', 'hint');
    } else if (def.type === 'breast') {
      if (act === 'up' || act === 'left' || act === 'right') this.breastPull();
      else if (act === 'down') this.breastKick();
    }
  };

  Player.prototype.feedback = function (r) {
    this.lastRating = r;
    this.lastRatingT = this.now;
    if (this.race.onRating) this.race.onRating(r);
  };

  Player.prototype.altStroke = function (arm) {
    var d = this.strokeDef();
    var interval = this.now - this.lastStrokeT;
    var mid = (d.ideal[0] + d.ideal[1]) / 2;
    var res;
    if (!this.firstStroke && this.lastArm === arm) {
      res = { q: 0.35, r: 'same' };
      this.msg('Alterne os braços!', 'warn');
    } else res = this.rate(interval, d.ideal);
    this.spendStamina(0.0046, interval, mid);
    this.addPulse(this.strokeImpulse() * res.q, 0.42);
    var armObj = arm === 'left' ? this.armL : this.armR;
    this.startArm(armObj, SG.clamp(2 * Math.min(interval, 0.75), 0.6, 1.3));
    this.lastArm = arm;
    this.lastStrokeT = this.now;
    this.firstStroke = false;
    this.feedback(res.r);
    this.race.playerSplash(armObj === this.armL ? -1 : 1);
  };

  Player.prototype.flyStroke = function () {
    var d = this.strokeDef();
    var interval = this.now - this.lastStrokeT;
    var res = this.rate(interval, d.ideal);
    this.spendStamina(0.0105, interval, (d.ideal[0] + d.ideal[1]) / 2);
    this.addPulse(this.strokeImpulse() * res.q, 0.55);
    this.startArm(this.flyArm, SG.clamp(interval, 0.65, 1.1));
    this.lastStrokeT = this.now;
    this.firstStroke = false;
    this.feedback(res.r);
    this.race.playerSplash(0);
  };

  Player.prototype.breastPull = function () {
    var d = this.strokeDef();
    var J = this.strokeImpulse();
    var q = 1, r = 'ok';
    if (this.breastStage === 'pulled') { q = 0.35; r = 'same'; this.msg('Faltou a pernada (↓)!', 'warn'); }
    else if (!this.firstStroke) {
      var glide = this.now - this.lastKickT;
      if (glide < d.kickPull[0]) { q = SG.clamp(glide / d.kickPull[0], 0.3, 1); r = 'fast'; }
      else if (glide <= d.kickPull[1]) r = 'perfect';
      else r = 'slow';
    }
    this.addPulse(J * 0.38 * q, 0.35);
    // ciclos curtos demais cansam muito mais
    this.spendStamina(0.0058, this.now - this.lastPullT, 1.0);
    this.breastStage = 'pulled';
    this.lastPullT = this.now;
    this.breastAnimT0 = this.now;
    this.firstStroke = false;
    this.oxygen = Math.min(1, this.oxygen + 0.35);
    this.feedback(r);
    if (Math.random() < 0.5) SG.Audio.breath();
    this.race.playerSplash(0, 0.5);
  };

  Player.prototype.breastKick = function () {
    var d = this.strokeDef();
    var J = this.strokeImpulse();
    var q = 1, r = 'perfect';
    if (this.breastStage !== 'pulled') { q = 0.3; r = 'same'; this.msg('Braçada primeiro (↑)!', 'warn'); }
    else {
      var dt = this.now - this.lastPullT;
      if (dt < d.pullKick[0]) { q = 0.6; r = 'fast'; }
      else if (dt > d.pullKick[1]) { q = SG.clamp(1 - (dt - d.pullKick[1]) * 1.2, 0.45, 1); r = 'slow'; }
    }
    this.addPulse(J * 0.62 * q, 0.4);
    this.spendStamina(0.0045, 1, 1);
    this.breastStage = 'kicked';
    this.lastKickT = this.now;
    this.feedback(r);
  };

  Player.prototype.breathe = function () {
    var d = this.strokeDef();
    if (!d.breath) {
      this.msg(d.id === 'back' ? 'No costas o rosto fica fora d\'água' : 'No peito você respira a cada braçada', 'hint');
      return;
    }
    if (this.breathT > 0) return;
    this.breathDur = d.id === 'fly' ? 0.6 : 0.5;
    this.breathT = this.breathDur;
    this.breathSide = this.lastArm === 'left' ? -1 : 1;
    SG.Audio.breath();
  };

  Player.prototype.dolphinKick = function () {
    var interval = this.now - this.lastDolphinT;
    var q = interval < 0.25 ? 0.4 : (interval < 0.6 ? 1 : 0.8);
    this.v = Math.min(2.65, this.v + 0.2 * q * this.staminaMult());
    this.stamina = Math.max(0, this.stamina - 0.004);
    this.lastDolphinT = this.now;
    this.kickBoost = 1;
    this.feedback(q === 1 ? 'perfect' : 'fast');
    SG.Audio.bubble();
  };

  Player.prototype.enterUnderwater = function (v) {
    this.state = 'underwater';
    this.v = v;
    this.uwT = 0;
    this.uwStartS = this.s;
    this.firstStroke = true;
    this.breastStage = 'kicked';
    this.pulses.length = 0;
  };

  Player.prototype.breakout = function () {
    this.state = 'swim';
    this.firstStroke = true;
    this.lastStrokeT = this.now;
    this.race.playerSplash(0, 0.6);
  };

  // ---------------- saída ----------------
  Player.prototype.startDive = function (reaction) {
    this.reaction = reaction;
    if (this.state === 'wallstart') {
      this.state = 'push';
      this.dive = { t: 0, dur: 0.65, s0: this.s };
    } else {
      this.state = 'dive';
      this.dive = { t: 0, dur: 0.85, s0: this.s };
    }
  };

  // ---------------- virada ----------------
  Player.prototype.attemptTurn = function () {
    var d = this.strokeDef();
    var dw = this.wallDist();
    if (dw > d.turnGood[1]) { this.msg('Cedo demais para virar!', 'warn'); return; }
    var quality;
    if (dw >= d.turnPerfect[0] && dw <= d.turnPerfect[1]) quality = 'perfect';
    else if (dw >= d.turnGood[0]) quality = 'good';
    else quality = 'poor';
    this.beginTurn(quality);
  };

  Player.prototype.beginTurn = function (quality) {
    var oldStroke = this.stroke;
    var newStroke = this.race.strokeAt(this.length + 1);
    var od = SG.STROKES[oldStroke], nd = SG.STROKES[newStroke];
    var flip = od.flip && oldStroke === newStroke;
    var dur = flip ? { perfect: 0.8, good: 0.95, poor: 1.2 }[quality] : { perfect: 1.0, good: 1.15, poor: 1.45 }[quality];
    var push = { perfect: 2.55, good: 2.2, poor: 1.6 }[quality];
    var d = this.dir;
    var Y = SG.yawFor(d), Yn = SG.yawFor(-d);
    var keys = [this.camQuat.clone()];
    var E = function (y, p, r) { return SG.quatE(y, p, r); };
    if (flip && !od.supine) {
      keys.push(E(Y, -0.6, 0), E(Y, -1.6, 0.4), E(Y, -2.6, 1.8), E(Y, -Math.PI, Math.PI), E(Yn, -0.08, 0));
    } else if (flip && od.supine) {
      // costas: gira olhando para cima até ficar de costas para a nova direção
      for (var ki = 1; ki <= 6; ki++) {
        var u = ki / 6;
        keys.push(E(Yn, BP + (Math.PI - 2 * BP) * u, Math.PI * u));
      }
    } else if (nd.supine) {
      keys.push(E(Y, 0.2, 0), E(Y, 0.4, 0), E(Y, BP, 0));
    } else if (od.supine) {
      keys.push(E(Yn, 0.35, 0), E(Yn, 0.1, 0), E(Yn, -0.08, 0));
    } else {
      keys.push(E(Y + 0.6, 0.16, 0), E(Y + 1.6, 0.12, 0), E(Yn - 0.4, 0.0, 0), E(Yn, -0.08, 0));
    }
    this.turn = {
      t: 0, dur: dur, quality: quality, flip: flip, push: push, keys: keys,
      dw0: this.wallDist(), y0: this.camY, newStroke: newStroke, flipped: false,
      corr: this.modelCorr(oldStroke, d)
    };
    this.state = 'turn';
    this.pulses.length = 0;
    this.breathT = 0;
    var txt = { perfect: 'VIRADA PERFEITA!', good: 'Boa virada', poor: 'Virada lenta...' }[quality];
    this.msg(txt, quality === 'perfect' ? 'great' : (quality === 'good' ? 'ok' : 'warn'));
    if (quality === 'perfect') SG.Audio.good();
    if (this.race.onTurn) this.race.onTurn(quality);
  };

  // correção entre orientação da câmera e do corpo (para a vista em 3ª pessoa)
  Player.prototype.modelCorr = function (stroke, dir) {
    var cam = this.baseCam(stroke, dir, qA);
    var body = this.baseBody(stroke, dir, qB);
    return cam.clone().invert().multiply(body);
  };

  Player.prototype.baseCam = function (stroke, dir, out) {
    if (SG.STROKES[stroke].supine) return SG.quatE(SG.yawFor(-dir), BP, 0, out);
    return SG.quatE(SG.yawFor(dir), -0.08, 0, out);
  };
  Player.prototype.baseBody = function (stroke, dir, out) {
    return SG.quatE(SG.yawFor(dir), 0, SG.STROKES[stroke].supine ? Math.PI : 0, out);
  };

  function slerpKeys(keys, t, out) {
    var n = keys.length - 1;
    var f = SG.clamp(t, 0, 1) * n;
    var i = Math.min(n - 1, Math.floor(f));
    return out.copy(keys[i]).slerp(keys[i + 1], f - i);
  }

  // ---------------- atualização ----------------
  Player.prototype.update = function (dt) {
    this.now += dt;
    var d = this.strokeDef();
    var L = this.race.L;
    var targetY = 0.07;
    var camQ = this.camQuat;
    var extraPitch = 0, extraYaw = 0, extraRoll = 0;
    var showArms = true;
    this.updateArm(this.armL); this.updateArm(this.armR); this.updateArm(this.flyArm);
    this.kickPh += dt * 9;

    if (this.state === 'block' || this.state === 'wallstart') {
      this.v = 0;
      if (this.state === 'block') {
        this.camY = EYE_BLOCK;
        SG.quatE(SG.yawFor(1), -0.42, 0, camQ);
      } else {
        this.camY = 0.16 + 0.015 * Math.sin(this.now * 2);
        SG.quatE(SG.yawFor(-1), 0.12, 0, camQ);
      }
      showArms = false;
    } else if (this.state === 'dive') {
      var dv = this.dive;
      dv.t += dt;
      var t = SG.clamp(dv.t / dv.dur, 0, 1);
      var reachBonus = SG.clamp(1 - (this.reaction - 0.6) * 0.5, 0.8, 1.05);
      this.s = SG.lerp(dv.s0, 3.4 * reachBonus, t);
      this.camY = SG.lerp(EYE_BLOCK, -0.25, t) + Math.sin(t * Math.PI) * 0.75;
      SG.quatE(SG.yawFor(1), SG.lerp(-0.4, -0.15, Math.min(1, t * 2)) - Math.max(0, t - 0.5) * 1.4, 0, camQ);
      if (t >= 1) {
        this.race.playerEntry();
        this.enterUnderwater(SG.lerp(2.75, 2.45, SG.clamp((this.reaction - 0.55) * 2, 0, 1)));
      }
      showArms = t > 0.4;
    } else if (this.state === 'push') {
      var pv = this.dive;
      pv.t += dt;
      var tp = SG.clamp(pv.t / pv.dur, 0, 1);
      this.s = SG.lerp(pv.s0, 2.2, tp);
      this.camY = SG.lerp(0.16, -0.35, tp) + Math.sin(tp * Math.PI) * 0.4;
      SG.quatE(SG.yawFor(-1), SG.lerp(0.12, 1.1, Math.min(1, tp * 1.4)) - Math.max(0, tp - 0.7) * 1.8, 0, camQ);
      if (tp >= 1) {
        this.race.playerEntry();
        this.enterUnderwater(SG.lerp(2.45, 2.2, SG.clamp((this.reaction - 0.55) * 2, 0, 1)));
      }
      showArms = false;
    } else if (this.state === 'underwater') {
      this.uwT += dt;
      this.kickBoost = Math.max(0, (this.kickBoost || 0) - dt * 3);
      var a = -SG.DRAG_K_UW * this.v * this.v - 0.05 * this.v;
      this.v = Math.max(0, this.v + a * dt);
      this.s += this.dir * this.v * dt;
      targetY = -0.6;
      this.camY = SG.lerp(this.camY, targetY, 1 - Math.exp(-dt * 4));
      this.baseCam(this.stroke, this.dir, camQ);
      if (!d.supine) extraPitch = 0.04;
      this.oxygen = Math.max(0, this.oxygen - dt * 0.06);
      var uwDist = Math.abs(this.s - this.uwStartS);
      if (uwDist > 13.5) { this.msg('Limite de 15 m: suba!', 'warn'); this.breakout(); }
      else if (this.uwT > 6 || (this.uwT > 1 && this.v < 1.05)) this.breakout();
      if (this.now - this.lastBubbleT > 0.25) { this.lastBubbleT = this.now; this.race.playerBubbles(); }
    } else if (this.state === 'swim') {
      this.updateSwim(dt);
      return this.finishUpdate(dt, true);
    } else if (this.state === 'turn') {
      this.updateTurn(dt);
      showArms = false;
    } else if (this.state === 'finished') {
      this.v = Math.max(0, this.v - dt * 3);
      this.camY = SG.lerp(this.camY, 0.22, 1 - Math.exp(-dt * 3));
      // depois do toque, olha de volta para a piscina (e não para a parede)
      var fy = SG.yawFor(-this.dir);
      SG.quatE(fy + Math.sin(this.now * 0.4) * 0.6, d.supine ? 0.2 : 0.1, 0, camQ);
      showArms = false;
    }
    this.finishUpdate(dt, showArms, extraPitch, extraYaw, extraRoll);
  };

  Player.prototype.updateSwim = function (dt) {
    var d = this.strokeDef();
    var now = this.now;
    // empuxo das braçadas
    var thrust = 0;
    for (var i = this.pulses.length - 1; i >= 0; i--) {
      var p = this.pulses[i];
      var tt = now - p.t0;
      if (tt > p.dur) { this.pulses.splice(i, 1); continue; }
      thrust += p.acc * (1.5 * Math.sin(Math.PI * tt / p.dur) * 1.047);
    }
    // respiração
    this.breathMult = 1;
    if (this.breathT > 0) {
      var prev = this.breathT;
      this.breathT = Math.max(0, this.breathT - dt);
      this.oxygen = Math.min(1, this.oxygen + (0.5 / this.breathDur) * (prev - this.breathT));
      this.breathMult = d.id === 'fly' ? 0.9 : 0.86;
    }
    if (d.breath) this.oxygen = Math.max(0, this.oxygen - dt * 0.075);
    else if (d.id === 'back') this.oxygen = Math.min(1, this.oxygen + dt * 0.4);
    else this.oxygen = Math.max(0, this.oxygen - dt * 0.05);
    var oxyMult = this.oxygen <= 0 ? 0.6 : (this.oxygen < 0.15 ? 0.85 : 1);
    if (this.oxygen <= 0) {
      this.stamina = Math.max(0, this.stamina - dt * 0.03);
      if (!this.oxyWarnT || now - this.oxyWarnT > 2.5) { this.oxyWarnT = now; this.msg(d.breath ? 'Sem ar! Respire (ESPAÇO)' : 'Sem ar!', 'warn'); }
    }
    this.stamina = Math.min(1, this.stamina + dt * 0.004);
    var mult = this.staminaMult() * oxyMult * this.breathMult;
    var acc = thrust * mult - SG.DRAG_K * this.v * this.v - SG.DRAG_C * this.v;
    this.v = Math.max(0, this.v + acc * dt);
    this.s += this.dir * this.v * dt;

    // qualidade do ritmo (para o HUD)
    var since = now - this.lastStrokeT;
    this.sinceStroke = since;

    // parede
    var dw = this.wallDist();
    if (dw <= 0.02) {
      if (this.isLastLength()) return this.touchFinish(dw);
      this.s = this.dir > 0 ? this.race.L - 0.02 : 0.02;
      SG.Audio.wallHit();
      this.msg('Bateu na parede!', 'warn');
      this.v = 0;
      this.beginTurn('poor');
      return;
    }

    // câmera e animação conforme o estilo
    var camQ = this.camQuat;
    var Y = SG.yawFor(this.dir);
    var targetY = 0.07, pitch = 0, yaw = 0, roll = 0;
    if (d.type === 'alt') {
      var sl = Math.sin(this.armL.th), sr = Math.sin(this.armR.th);
      var bodyRoll = 0.07 * (sr - sl);
      if (d.supine) {
        targetY = 0.11 + 0.015 * Math.sin(now * 5);
        SG.quatE(SG.yawFor(-this.dir), BP, -bodyRoll * 0.8, camQ);
      } else {
        targetY = 0.07 + 0.025 * Math.sin(now * 6.5);
        if (this.breathT > 0) {
          var k = Math.sin(Math.PI * (1 - this.breathT / this.breathDur));
          yaw = -this.breathSide * 1.0 * k;
          roll = -this.breathSide * 0.32 * k;
          pitch = -0.04 * k;
          targetY += 0.09 * k;
        }
        roll += bodyRoll;
        SG.quatE(Y + yaw, -0.08 + pitch, roll, camQ);
      }
    } else if (d.type === 'fly') {
      var th = this.flyArm.th;
      var bob = Math.sin(th - 0.5);
      targetY = 0.05 + 0.07 * Math.max(0, -bob) - 0.1 * Math.max(0, bob) * (this.now - this.flyArm.t0 < this.flyArm.dur ? 1 : 0);
      pitch = -0.08 + 0.12 * (-bob);
      if (this.breathT > 0) {
        var kb = Math.sin(Math.PI * (1 - this.breathT / this.breathDur));
        targetY += 0.16 * kb;
        pitch += 0.22 * kb;
      }
      SG.quatE(Y, pitch, 0, camQ);
    } else {
      var sincePull = now - this.lastPullT;
      var sinceKick = now - this.lastKickT;
      var bp = SG.clamp(sincePull / 0.7, 0, 1);
      this.breastP = sincePull < 0.7 ? bp : (this.breastStage === 'pulled' ? 0.62 : 0);
      if (this.breastStage === 'pulled' && sincePull < 0.7) {
        targetY = 0.08 + 0.17 * Math.sin(Math.min(1, sincePull / 0.45) * Math.PI * 0.5);
        pitch = 0.05;
      } else if (this.breastStage === 'kicked' && sinceKick < 1.2) {
        targetY = SG.lerp(-0.16, 0.04, SG.smooth(sinceKick / 1.0));
        pitch = SG.lerp(-0.2, -0.08, SG.smooth(sinceKick / 1.0));
      } else targetY = 0.05;
      this.kickEnv = this.breastStage === 'pulled' ? SG.clamp(sincePull / 0.3, 0, 1) : SG.clamp(1 - sinceKick / 0.25, 0, 1);
      SG.quatE(Y, pitch, 0, camQ);
    }
    this.camY = SG.lerp(this.camY, targetY, 1 - Math.exp(-dt * (this.camY < -0.2 ? 3.5 : 9)));
  };

  Player.prototype.touchFinish = function (dw) {
    // tempo interpolado no instante exato do toque
    var t = this.race.clock + Math.min(0, dw - 0.02) / Math.max(0.2, this.v);
    this.s = this.dir > 0 ? this.race.L : 0;
    this.state = 'finished';
    this.finished = true;
    this.finishTime = t;
    this.splits.push(t);
    this.race.onFinish(this);
    SG.Audio.wallHit();
  };

  Player.prototype.updateTurn = function (dt) {
    var tr = this.turn;
    tr.t += dt;
    var t = SG.clamp(tr.t / tr.dur, 0, 1);
    var L = this.race.L;
    var mid = 0.55;
    var wallTarget = tr.flip ? 0.7 : 0.2;
    if (t < mid) {
      var u = t / mid;
      var dw = SG.lerp(tr.dw0, wallTarget, SG.smooth(u));
      this.s = this.dir > 0 ? L - dw : dw;
      this.v = (tr.dw0 - wallTarget) / (tr.dur * mid);
      if (tr.flip) this.camY = SG.lerp(tr.y0, -0.45, SG.smooth(u));
      else this.camY = tr.y0 + Math.sin(u * Math.PI * 0.5) * (0.25 - tr.y0);
    } else {
      if (!tr.flipped) {
        tr.flipped = true;
        this.splits.push(this.race.clock);
        this.dir = -this.dir;
        this.length++;
        this.stroke = tr.newStroke;
        this.race.onLength(this);
        this.race.playerSplash(0, tr.flip ? 0.8 : 0.5);
      }
      var w = (t - mid) / (1 - mid);
      var dwOut = wallTarget + SG.smooth(w) * 0.9 * (tr.push / 2.5);
      this.s = this.dir > 0 ? dwOut : L - dwOut;
      this.v = tr.push * SG.smooth(w);
      this.camY = SG.lerp(tr.flip ? -0.45 : 0.25, -0.55, SG.smooth(w));
    }
    slerpKeys(tr.keys, t, this.camQuat);
    if (t >= 1) {
      this.turn = null;
      this.enterUnderwater(tr.push);
      this.uwStartS = this.dir > 0 ? 0 : L;
    }
  };

  Player.prototype.finishUpdate = function (dt, showArms, extraPitch) {
    var L = this.race.L;
    this.distance = this.length * L + (this.dir > 0 ? this.s : L - this.s);
    this.distance = SG.clamp(this.distance, 0, this.race.totalDist);
    if (extraPitch) {
      qC.setFromAxisAngle(vA.set(1, 0, 0), extraPitch);
      this.camQuat.multiply(qC);
    }
    this.camPos.set(this.x, this.camY, SG.clamp(this.s, -0.6, L + 0.1));
    // modelo (braços em 1ª pessoa / corpo inteiro em 3ª pessoa)
    var m = this.model;
    var d = this.strokeDef();
    if (this.state === 'turn' && this.turn) {
      m.root.quaternion.copy(this.camQuat).multiply(this.turn.corr);
    } else if (this.state === 'block') {
      SG.quatE(SG.yawFor(1), 1.25, 0, m.root.quaternion);
    } else if (this.state === 'dive' || this.state === 'push') {
      m.root.quaternion.copy(this.camQuat).multiply(this.modelCorr(this.stroke, this.dir));
    } else {
      this.baseBody(this.stroke, this.dir, m.root.quaternion);
    }
    // posição do ombro = cabeça deslocada para trás (em direção aos pés)
    // em 1ª pessoa os ombros ficam um pouco mais atrás e abaixo para não tapar a visão
    var fp = this.race.fpView;
    vA.set(0, 0.02, fp ? 0.3 : 0.24).applyQuaternion(m.root.quaternion);
    m.root.position.copy(this.camPos).add(vA);
    if (this.state === 'block') m.root.position.set(this.x, SG.DECK_Y + 0.66 + 1.5, -0.05);
    m.root.position.y -= fp ? 0.13 : 0.06;

    var uw = this.state === 'underwater' || this.state === 'turn' || this.state === 'dive' || this.state === 'push';
    if (this.state === 'block') { m.poseArms('stand'); m.poseLegs('stand'); }
    else if (uw) {
      m.poseArms('streamline');
      m.poseLegs('streamline', this.now * 9, 0);
    } else if (this.state === 'finished') {
      m.poseArms('breast', 0.3); m.poseLegs('free', this.now * 3, 0);
    } else if (d.type === 'alt') {
      m.poseArms(this.stroke, this.armL.th, this.armR.th);
      m.poseLegs(this.stroke, this.kickPh, 0);
    } else if (d.type === 'fly') {
      m.poseArms('fly', this.flyArm.th);
      m.poseLegs('fly', this.flyArm.th * 2, 0);
    } else {
      m.poseArms('breast', this.breastP);
      m.poseLegs('breast', 0, this.kickEnv);
    }
    this.showArms = showArms !== false && this.state !== 'block';
  };

  Player.prototype.speedForHud = function () { return this.v; };

  SG.Player = Player;
})();
