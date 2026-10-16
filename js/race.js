/* Gerencia uma prova: largada, nadadores, classificação, placar e efeitos */
(function () {
  var vA = new THREE.Vector3();

  function shuffle(a) {
    for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }

  function Race(opts, scene, particles) {
    this.opts = opts;
    this.scene = scene;
    this.particles = particles;
    this.L = opts.pool;
    this.totalDist = opts.distance;
    this.laps = Math.round(opts.distance / opts.pool);
    this.event = opts.event;
    this.clock = -1;
    this.started = false;
    this.phase = 'intro';
    this.phaseT = 0;
    this.falseStarts = 0;
    this.finishOrder = [];
    this.swimmers = [];
    this.camPos = new THREE.Vector3();
    this.ripples = new Float32Array(SG.MAX_RIPPLES * 4);

    var low = opts.quality === 'low';
    this.player = new SG.Player(this, SG.PLAYER_LANE, { name: opts.name || 'Você', country: 'BRA', cap: 0xffd400 });
    this.swimmers.push(this.player);
    var diff = SG.DIFFICULTY[opts.difficulty];
    var pool = shuffle(SG.OPPONENTS.slice());
    var skills = [];
    for (var i = 0; i < 7; i++) skills.push(SG.lerp(diff.range[1], diff.range[0], i / 6) * (1 + (Math.random() - 0.5) * 0.02));
    for (i = 0; i < 7; i++) {
      var ai = new SG.AISwimmer(this, SG.SEED_LANES[i], pool[i], skills[i], low);
      this.swimmers.push(ai);
    }
    this.swimmers.sort(function (a, b) { return a.lane - b.lane; });
    var self = this;
    this.swimmers.forEach(function (s) { scene.add(s.model.root); s.wake = self.makeWake(); scene.add(s.wake); });
    this.ranking = this.swimmers.slice();
  }

  Race.prototype.strokeAt = function (lengthIdx) {
    if (this.event !== 'medley') return this.event;
    var per = Math.max(1, Math.round(this.laps / 4));
    return SG.MEDLEY_ORDER[SG.clamp(Math.floor(lengthIdx / per), 0, 3)];
  };

  Race.prototype.makeWake = function () {
    if (!SG._foamTex) {
      SG._foamTex = SG.canvasTex(128, 256, function (c, w, h) {
        for (var i = 0; i < 260; i++) {
          var x = w / 2 + (Math.random() - 0.5) * w * 0.8 * (0.3 + i / 260);
          var y = Math.random() * h;
          var r = 3 + Math.random() * 9;
          var g = c.createRadialGradient(x, y, 0, x, y, r);
          var a = 0.25 * (1 - Math.abs(x - w / 2) / (w / 2));
          g.addColorStop(0, 'rgba(255,255,255,' + a + ')');
          g.addColorStop(1, 'rgba(255,255,255,0)');
          c.fillStyle = g;
          c.fillRect(x - r, y - r, r * 2, r * 2);
        }
      });
    }
    var m = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 2.6),
      new THREE.MeshBasicMaterial({ map: SG._foamTex, transparent: true, depthWrite: false, opacity: 0 }));
    m.rotation.x = -Math.PI / 2;
    m.renderOrder = 3;
    return m;
  };

  Race.prototype.nearCamera = function (s) {
    return Math.abs(s.s - this.camPos.z) < 30 && Math.abs(s.x - this.camPos.x) < 14;
  };

  // ---------------- efeitos ----------------
  Race.prototype.volFor = function (s) {
    if (s.isPlayer) return 0.3;
    var dx = s.x - this.camPos.x, dz = s.s - this.camPos.z;
    var d = Math.sqrt(dx * dx + dz * dz);
    return 0.22 / (1 + d * 0.5);
  };
  Race.prototype.handSplash = function (s, arm) {
    var p = s.model.handWorld(arm, vA);
    this.particles.splash(p.x, p.z, 7, 0.8);
    if (Math.random() < 0.6) SG.Audio.splash(this.volFor(s) * 0.6);
  };
  Race.prototype.entrySplash = function (s) {
    this.particles.splash(s.x, s.s, 30, 1.5);
    SG.Audio.splash(this.volFor(s) * 1.2);
  };
  Race.prototype.breakoutSplash = function (s) {
    this.particles.splash(s.x, s.s, 10, 0.8);
  };
  Race.prototype.turnSplash = function (s) {
    this.particles.splash(s.x, s.dir > 0 ? 0.5 : this.L - 0.5, 14, 1.0);
  };
  Race.prototype.playerSplash = function (side, power) {
    var p = this.player;
    var fwd = p.dir;
    var x = p.x + side * 0.25;
    var z = p.s + (SG.STROKES[p.stroke].supine ? -fwd * 0.1 : fwd * 0.45);
    this.particles.splash(x, z, 9, power || 0.9);
    SG.Audio.splash(0.22 * (power || 1));
  };
  Race.prototype.playerEntry = function () {
    var p = this.player;
    this.particles.splash(p.x, p.s, 35, 1.6);
    this.particles.bubbles(p.x, -0.4, p.s + p.dir * 0.4, 50, 0.8);
    SG.Audio.dive();
  };
  Race.prototype.playerBubbles = function () {
    var p = this.player;
    this.particles.bubbles(p.x, p.camY - 0.15, p.s + p.dir * 0.25, 3, 0.3);
  };

  // ---------------- eventos ----------------
  Race.prototype.onLength = function (s) {
    if (s.isPlayer && this.onPlayerLength) this.onPlayerLength(s);
  };

  Race.prototype.onFinish = function (s) {
    this.finishOrder.push(s);
    this.finishOrder.sort(function (a, b) { return a.finishTime - b.finishTime; });
    if (s.isPlayer) {
      if (this.onPlayerFinish) this.onPlayerFinish(s);
    } else if (this.finishOrder.length === 1) {
      SG.Audio.cheer();
    }
  };

  // ---------------- largada ----------------
  Race.prototype.beginMarks = function () {
    this.phase = 'marks';
    this.phaseT = 0;
    this.started = false;
    this.clock = -1;
    this.beepAt = 1.8 + 0.9 + Math.random() * 1.1;
    var self = this;
    var lang = 'pt-BR';
    if (this.onMsg) this.onMsg('Às suas marcas...', 'big');
    if (this.onMarks) this.onMarks();
    SG.Audio.speak('Às suas marcas', lang);
  };

  Race.prototype.playerAction = function (act) {
    var p = this.player;
    if (this.phase === 'intro') { if (act === 'action') this.beginMarks(); return; }
    if (this.phase === 'marks') {
      if (act === 'action' || act === 'up') {
        if (!this.started) return this.falseStart();
        if (p.state === 'block' || p.state === 'wallstart') {
          var react = this.clock;
          p.startDive(react);
          if (this.onReaction) this.onReaction(react);
        }
      }
      return;
    }
    if (this.phase === 'racing') {
      if ((p.state === 'block' || p.state === 'wallstart') && (act === 'action' || act === 'up')) {
        p.startDive(this.clock);
        if (this.onReaction) this.onReaction(this.clock);
        return;
      }
      p.onInput(act);
    }
  };

  Race.prototype.falseStart = function () {
    this.falseStarts++;
    SG.Audio.bad();
    if (this.falseStarts >= 2) {
      this.player.dq = true;
      this.phase = 'dq';
      if (this.onMsg) this.onMsg('DESCLASSIFICADO! Saída falsa', 'bad');
      if (this.onDQ) this.onDQ();
      return;
    }
    if (this.onMsg) this.onMsg('SAÍDA FALSA! Mais uma e você está fora', 'bad');
    this.phase = 'false';
    this.phaseT = 0;
  };

  // ---------------- atualização ----------------
  Race.prototype.update = function (dt, cam) {
    this.camPos.copy(cam);
    this.phaseT += dt;
    if (this.phase === 'false' && this.phaseT > 2.2) this.beginMarks();
    if (this.phase === 'marks') {
      if (!this.started && this.phaseT >= this.beepAt) {
        this.started = true;
        this.clock = 0;
        this.phase = 'racing';
        SG.Audio.beep();
        if (this.onMsg) this.onMsg('VAI!', 'go');
      }
    }
    if (this.started) this.clock += dt;

    var racing = this.phase === 'racing' || this.phase === 'done';
    for (var i = 0; i < this.swimmers.length; i++) {
      var s = this.swimmers[i];
      if (s.isPlayer) { if (racing || this.phase === 'marks' || this.phase === 'false' || this.phase === 'intro') s.update(racing ? dt : 0.0001); }
      else s.update(dt, racing ? this.clock : -1);
    }
    if (this.phase === 'racing' && this.player.state === 'block' && this.clock > 2.5 && !this.autoWarned) {
      this.autoWarned = true;
      if (this.onMsg) this.onMsg('Salte! (ESPAÇO)', 'warn');
    }

    // classificação
    this.ranking.sort(function (a, b) {
      if (a.finished && b.finished) return a.finishTime - b.finishTime;
      if (a.finished) return -1;
      if (b.finished) return 1;
      return b.distance - a.distance;
    });
    for (i = 0; i < this.ranking.length; i++) this.ranking[i].place = i + 1;

    // ondulações e espuma
    for (i = 0; i < this.swimmers.length && i < SG.MAX_RIPPLES; i++) {
      s = this.swimmers[i];
      var swimming = s.state === 'swim';
      var j = i * 4;
      this.ripples[j] = s.x;
      this.ripples[j + 1] = s.s;
      this.ripples[j + 3] = swimming ? (s.isPlayer ? 0.006 : 0.012) : (s.state === 'turn' ? 0.02 : 0);
      var wk = s.wake;
      var target = swimming ? SG.clamp(s.v / 2, 0, 1) * 0.85 : (s.state === 'turn' ? 0.6 : 0);
      if (s.isPlayer && this.fpView) target = 0;
      wk.material.opacity = SG.lerp(wk.material.opacity, target, 1 - Math.exp(-dt * 4));
      wk.visible = wk.material.opacity > 0.02;
      wk.position.set(s.x, 0.03, s.s - s.dir * 0.9);
      wk.rotation.z = s.dir > 0 ? Math.PI : 0;
      if (swimming && this.nearCamera(s) && Math.random() < dt * 22) {
        this.particles.foam(s.x + (Math.random() - 0.5) * 0.2, s.s - s.dir * (SG.STROKES[s.stroke].supine ? 1.3 : 1.55), 2);
      }
    }

    // fim da prova
    if (this.phase === 'racing' && this.player.finished) {
      this.phase = 'done';
      this.doneT = 0;
    }
    if (this.phase === 'done') {
      this.doneT += dt;
      var all = this.swimmers.every(function (x) { return x.finished; });
      if ((all && this.doneT > 2.5) || this.doneT > 9) {
        this.phase = 'results';
        if (this.onResults) this.onResults(this.results());
      }
    }
  };

  Race.prototype.results = function () {
    var self = this;
    var list = this.swimmers.map(function (s) {
      var t = s.finishTime;
      var projected = false;
      if (!s.finished) {
        var rem = self.totalDist - s.distance;
        t = self.clock + rem / Math.max(0.8, s.v || 1.2);
        projected = true;
      }
      return { name: s.name, country: s.country, lane: s.lane, time: t, projected: projected, isPlayer: s.isPlayer, dq: !!s.dq };
    });
    list.sort(function (a, b) { if (a.dq !== b.dq) return a.dq ? 1 : -1; return a.time - b.time; });
    list.forEach(function (r, i) { r.place = r.dq ? null : i + 1; });
    return { list: list, player: this.player, opts: this.opts };
  };

  // ---------------- placar do ginásio ----------------
  Race.prototype.drawScoreboard = function (canvas, tex) {
    var c = canvas.getContext('2d');
    var w = canvas.width, h = canvas.height;
    c.fillStyle = '#05070c'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#0b1530'; c.fillRect(0, 0, w, 80);
    var title = this.totalDist + 'm ' + (this.event === 'medley' ? 'MEDLEY' : SG.STROKES[this.event].label);
    c.font = 'bold 44px monospace'; c.textBaseline = 'middle';
    c.fillStyle = '#fbbf24'; c.textAlign = 'left';
    c.fillText(title, 24, 42);
    c.textAlign = 'right'; c.fillStyle = '#fff';
    c.fillText(this.started ? SG.fmtTime(Math.max(0, this.clock)) : '0.00', w - 24, 42);
    var rowH = (h - 96) / 8;
    var byLane = this.swimmers.slice().sort(function (a, b) { return a.lane - b.lane; });
    for (var i = 0; i < byLane.length; i++) {
      var s = byLane[i];
      var y = 96 + i * rowH + rowH / 2;
      if (s.isPlayer) { c.fillStyle = 'rgba(250,204,21,0.18)'; c.fillRect(0, y - rowH / 2 + 2, w, rowH - 4); }
      c.font = 'bold 36px monospace';
      c.textAlign = 'left';
      c.fillStyle = '#60a5fa';
      c.fillText(String(s.lane + 1), 24, y);
      SG.drawFlag(c, s.country, 70, y - 16, 48, 32);
      c.fillStyle = s.isPlayer ? '#fde047' : '#e5e7eb';
      c.fillText(s.name.toUpperCase().slice(0, 14), 134, y);
      c.fillStyle = '#9ca3af';
      c.fillText(s.country, 520, y);
      c.textAlign = 'right';
      if (s.finished) {
        c.fillStyle = s.place === 1 ? '#fbbf24' : '#fff';
        c.fillText(SG.fmtTime(s.finishTime), w - 24, y);
        c.fillStyle = '#34d399';
        c.fillText(s.place + '', w - 250, y);
      } else if (this.started) {
        c.fillStyle = '#9ca3af';
        c.fillText(Math.floor(s.distance) + 'm', w - 24, y);
      }
    }
    tex.needsUpdate = true;
  };

  Race.prototype.dispose = function () {
    var scene = this.scene;
    this.swimmers.forEach(function (s) {
      scene.remove(s.model.root);
      s.model.dispose();
      scene.remove(s.wake);
      s.wake.geometry.dispose();
      s.wake.material.dispose();
    });
  };

  SG.Race = Race;
})();
