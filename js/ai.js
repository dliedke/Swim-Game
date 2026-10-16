/* Adversários controlados pelo computador */
(function () {
  var TAU = Math.PI * 2;
  var vA = new THREE.Vector3();

  function AISwimmer(race, lane, info, skill, lowPoly) {
    this.race = race;
    this.lane = lane;
    this.x = SG.laneX(lane);
    this.name = info.name;
    this.country = info.country;
    this.cap = info.cap;
    this.isPlayer = false;
    this.skill = skill;
    this.model = new SG.SwimmerModel({ cap: info.cap, suit: [0x111827, 0x1e3a8a, 0x7f1d1d, 0x064e3b][lane % 4], lowPoly: lowPoly });
    var r = Math.random();
    this.strategy = r < 0.33 ? 'sprint' : (r < 0.66 ? 'even' : 'closer');
    this.reactionT = 0.6 + Math.random() * 0.17 - (skill - 0.9) * 0.4;
    this.turnSkill = SG.clamp(0.55 + (skill - 0.8) * 2 + (Math.random() - 0.5) * 0.3, 0, 1);
    this.uwDist = 5 + skill * 6 + Math.random() * 2.5;
    this.noise = 0; this.noiseT = 0;
    this.reset();
  }

  AISwimmer.prototype.reset = function () {
    this.length = 0;
    this.dir = 1;
    this.stroke = this.race.strokeAt(0);
    this.state = SG.STROKES[this.stroke].supine ? 'wallstart' : 'block';
    this.s = this.state === 'block' ? -0.35 : 0.32;
    this.v = 0;
    this.phase = Math.random() * TAU;
    this.finished = false;
    this.finishTime = null;
    this.t = 0;
    this.lastEntryL = 0; this.lastEntryR = 0;
    this.distance = 0;
    this.y = 0;
    this.splits = [];
  };

  AISwimmer.prototype.wallDist = function () { return this.dir > 0 ? this.race.L - this.s : this.s; };

  AISwimmer.prototype.targetSpeed = function () {
    var d = SG.STROKES[this.stroke];
    var f = this.distance / this.race.totalDist;
    var strat = this.strategy === 'sprint' ? 1.025 - 0.05 * f : (this.strategy === 'closer' ? 0.985 + 0.045 * f * f : 1.0 - 0.015 * f);
    var longRace = SG.clamp((this.race.totalDist - 50) / 350, 0, 1);
    var fatigue = 1 - longRace * 0.035 * f;
    var kick = f > 0.85 ? 1.012 : 1;
    return d.vmax * 0.97 * this.skill * strat * fatigue * kick * (1 + this.noise);
  };

  AISwimmer.prototype.update = function (dt, clock) {
    this.t += dt;
    var L = this.race.L;
    var d = SG.STROKES[this.stroke];
    this.noiseT -= dt;
    if (this.noiseT <= 0) { this.noiseT = 1 + Math.random() * 2; this.noiseTarget = (Math.random() - 0.5) * 0.03; }
    this.noise = SG.lerp(this.noise, this.noiseTarget || 0, dt * 0.8);

    switch (this.state) {
      case 'block':
      case 'wallstart':
        if (clock >= this.reactionT && this.race.started) {
          this.state = this.state === 'block' ? 'dive' : 'push';
          this.st = 0;
        }
        break;
      case 'dive':
        this.st += dt;
        var t = SG.clamp(this.st / 0.85, 0, 1);
        this.s = SG.lerp(-0.35, 3.1 + this.skill * 0.4, t);
        this.y = SG.lerp(SG.DECK_Y + 0.66 + 1.3, -0.35, t) + Math.sin(t * Math.PI) * 0.6;
        this.pitch = SG.lerp(1.25, -0.6, SG.smooth(t));
        if (t >= 1) { this.enterUW(2.55 + this.skill * 0.15); this.race.entrySplash(this); }
        break;
      case 'push':
        this.st += dt;
        var tp = SG.clamp(this.st / 0.65, 0, 1);
        this.s = SG.lerp(0.32, 2.0, tp);
        this.y = SG.lerp(0.0, -0.4, tp) + Math.sin(tp * Math.PI) * 0.35;
        this.pitch = SG.lerp(0.6, 0, tp);
        if (tp >= 1) { this.enterUW(2.25 + this.skill * 0.15); this.race.entrySplash(this); }
        break;
      case 'underwater':
        var vt = this.targetSpeed() * 1.05;
        this.v += (vt - this.v) * 0.7 * dt;
        this.s += this.dir * this.v * dt;
        this.y = SG.lerp(this.y, -0.55, 1 - Math.exp(-dt * 3));
        this.pitch = 0;
        this.phase += dt * 9;
        var uwDone = Math.abs(this.s - this.uwFrom) >= this.uwDist;
        if (uwDone) { this.state = 'swim'; this.race.breakoutSplash(this); }
        break;
      case 'swim':
        var tv = this.targetSpeed();
        var surge = d.id === 'breast' ? 0.22 : (d.id === 'fly' ? 0.12 : 0.04);
        var rate = d.aiRate * (0.9 + this.skill * 0.12);
        var prevPh = this.phase;
        this.phase += dt * rate * TAU;
        tv *= 1 + surge * Math.sin(this.phase - 1.0);
        this.v += (tv - this.v) * 2.2 * dt;
        this.s += this.dir * this.v * dt;
        this.y = SG.lerp(this.y, -0.05, 1 - Math.exp(-dt * 3));
        this.pitch = d.id === 'fly' ? 0.12 * Math.sin(this.phase) : (d.id === 'breast' ? 0.1 * Math.sin(this.phase + 0.5) : 0);
        this.checkEntries(prevPh, this.phase, d);
        var dw = this.wallDist();
        var last = this.length >= this.race.laps - 1;
        var nextStroke = last ? this.stroke : this.race.strokeAt(this.length + 1);
        var flip = d.flip && nextStroke === this.stroke;
        if (last) {
          if (dw <= 0) this.finish(clock + dw / Math.max(0.2, this.v));
        } else if (dw <= (flip ? 1.6 + this.turnSkill * 0.3 : 0.3)) {
          this.state = 'turn';
          this.turn = { t: 0, dur: (flip ? 0.85 : 1.05) + (1 - this.turnSkill) * 0.35, dw0: dw, flip: flip, flipped: false, newStroke: nextStroke };
        }
        break;
      case 'turn':
        var tr = this.turn;
        tr.t += dt;
        var u = SG.clamp(tr.t / tr.dur, 0, 1);
        var target = tr.flip ? 0.7 : 0.2;
        if (u < 0.55) {
          var dwn = SG.lerp(tr.dw0, target, SG.smooth(u / 0.55));
          this.s = this.dir > 0 ? L - dwn : dwn;
          this.y = SG.lerp(this.y, tr.flip ? -0.45 : 0.05, 1 - Math.exp(-dt * 6));
          this.pitch = tr.flip ? -Math.PI * (u / 0.55) : 0;
        } else {
          if (!tr.flipped) {
            tr.flipped = true;
            this.splits.push(clock);
            this.dir = -this.dir;
            this.length++;
            this.stroke = tr.newStroke;
            this.race.turnSplash(this);
          }
          var w = (u - 0.55) / 0.45;
          var out = target + SG.smooth(w) * 0.9;
          this.s = this.dir > 0 ? out : L - out;
          this.y = SG.lerp(this.y, -0.55, 1 - Math.exp(-dt * 5));
          this.pitch = 0;
        }
        if (u >= 1) {
          this.enterUW(2.15 + this.turnSkill * 0.35);
          this.uwFrom = this.dir > 0 ? 0 : L;
        }
        break;
      case 'finished':
        this.v = 0;
        this.y = SG.lerp(this.y, 0.05, 1 - Math.exp(-dt * 2));
        break;
    }
    this.distance = SG.clamp(this.length * L + (this.dir > 0 ? this.s : L - this.s), 0, this.race.totalDist);
    this.updateModel();
  };

  AISwimmer.prototype.enterUW = function (v) {
    this.state = 'underwater';
    this.v = v;
    this.uwFrom = this.s;
  };

  AISwimmer.prototype.finish = function (clock) {
    this.s = this.dir > 0 ? this.race.L : 0;
    this.finishTime = clock;
    this.finished = true;
    this.state = 'finished';
    this.splits.push(clock);
    this.race.onFinish(this);
  };

  AISwimmer.prototype.checkEntries = function (p0, p1, d) {
    if (!this.race.nearCamera(this)) return;
    var cross = function (a, b, off) { return Math.floor((a + off) / TAU) !== Math.floor((b + off) / TAU); };
    if (d.type === 'alt') {
      if (cross(p0, p1, 0)) this.race.handSplash(this, this.model.armL);
      if (cross(p0, p1, Math.PI)) this.race.handSplash(this, this.model.armR);
    } else if (cross(p0, p1, 0)) {
      this.race.handSplash(this, this.model.armL);
      if (d.type === 'fly') this.race.handSplash(this, this.model.armR);
    }
  };

  AISwimmer.prototype.updateModel = function () {
    var m = this.model;
    var d = SG.STROKES[this.stroke];
    var ph = this.phase;
    var yaw = SG.yawFor(this.dir);
    var root = m.root;
    if (this.state === 'block') {
      SG.quatE(SG.yawFor(1), 1.25, 0, root.quaternion);
      root.position.set(this.x, SG.DECK_Y + 0.66 + 1.5, -0.05);
      m.poseArms('stand'); m.poseLegs('stand');
      return;
    }
    if (this.state === 'wallstart') {
      SG.quatE(SG.yawFor(1), 0.9, Math.PI, root.quaternion);
      root.position.set(this.x, -0.05, 0.55);
      m.poseArms('breast', 0.3); m.poseLegs('breast', 0, 1);
      return;
    }
    var roll = d.supine ? Math.PI : 0;
    var uw = this.state === 'underwater' || this.state === 'dive' || this.state === 'push';
    if (this.state === 'turn' && this.turn.flip && !this.turn.flipped) {
      SG.quatE(yaw, this.pitch, roll, root.quaternion);
    } else if (this.state === 'finished') {
      SG.quatE(yaw + Math.PI, 0.9, 0, root.quaternion);
    } else {
      var sway = (d.type === 'alt' && this.state === 'swim') ? 0.45 * Math.sin(ph) : 0;
      SG.quatE(yaw, this.pitch || 0, roll + sway, root.quaternion);
    }
    vA.set(0, 0.02, 0.24).applyQuaternion(root.quaternion);
    root.position.set(this.x + vA.x, this.y + vA.y, this.s + vA.z);
    if (this.state === 'finished') root.position.set(this.x - 0.3, this.y - 0.2, this.dir > 0 ? this.race.L - 0.35 : 0.35);

    if (uw || this.state === 'turn') {
      m.poseArms('streamline');
      m.poseLegs('streamline', this.t * 9, 0);
    } else if (this.state === 'finished') {
      m.poseArms('breast', 0.3); m.poseLegs('free', this.t * 3, 0);
    } else if (d.type === 'alt') {
      m.poseArms(this.stroke, ph, ph + Math.PI);
      m.poseLegs(this.stroke, ph * 3, 0);
    } else if (d.type === 'fly') {
      m.poseArms('fly', ph);
      m.poseLegs('fly', ph * 2, 0);
    } else {
      var p = (ph / TAU) % 1;
      var armP = p < 0.6 ? p / 0.6 : 0;
      var kick = p < 0.45 ? SG.clamp((p - 0.25) / 0.2, 0, 1) : SG.clamp(1 - (p - 0.55) / 0.12, 0, 1);
      m.poseArms('breast', armP);
      m.poseLegs('breast', 0, kick);
    }
  };

  SG.AISwimmer = AISwimmer;
})();
