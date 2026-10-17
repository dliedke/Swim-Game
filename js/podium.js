/* Cerimônia do pódio: os três primeiros sobem no pódio atrás dos blocos de saída e recebem as medalhas.
 * Usa os próprios modelos da prova (mesma touca e maiô) em pé sobre os degraus.
 * Espaço local do modelo: -Z = cabeça, -Y = peito, +X = lado direito (ver swimmerModel.js).
 */
(function () {
  var V3 = THREE.Vector3;
  var DY = SG.DECK_Y;
  var PZ = -6;            // centro do pódio (no deck atrás da parede de saída)
  var FLAG_Z = -8.6;      // mastros atrás do pódio
  // por colocação (1º, 2º, 3º): posição x, altura do degrau, giro para a câmera, instante da medalha
  var STEPS = [
    { x: 0, h: 0.9, yaw: 0, t: 5.0, color: 0xfbbf24, css: '#fbbf24', name: SG.t('medal.gold') },
    { x: -1.3, h: 0.6, yaw: 0.22, t: 3.6, color: 0xd1d5db, css: '#e5e7eb', name: SG.t('medal.silver') },
    { x: 1.3, h: 0.4, yaw: -0.22, t: 2.2, color: 0xcd7f32, css: '#f59e0b', name: SG.t('medal.bronze') }
  ];
  var FLAG_T0 = 5.8, FLAG_T1 = 10.5;
  SG.PODIUM_MEDAL_TIMES = STEPS.map(function (s) { return s.t; });

  var tmpV = new V3(), tmpQ = new THREE.Quaternion(), tmpS = new V3(), tmpM = new THREE.Matrix4();
  var camFrom = new V3(), camTo = new V3(), look = new V3();
  var dirV = new V3(), REF = new V3(0, -1, 0.35), UPZ = new V3(0, 0, 1);
  var tmpBox = new THREE.Box3();

  function easeOutBack(t) { var c = 1.6; t -= 1; return 1 + (c + 1) * t * t * t + c * t * t; }

  // degrau com o número pintado na frente
  function stepMesh(n, w, h, d, st, mats) {
    var tex = SG.canvasTex(256, Math.round(256 * h / w), function (c, cw, ch) {
      var g = c.createLinearGradient(0, 0, 0, ch);
      g.addColorStop(0, '#1e40af'); g.addColorStop(1, '#0b1f5c');
      c.fillStyle = g; c.fillRect(0, 0, cw, ch);
      c.fillStyle = st.css; c.fillRect(0, 0, cw, 10);
      c.font = 'bold ' + Math.round(Math.min(ch * 0.75, 150)) + 'px sans-serif';
      c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillStyle = 'rgba(0,0,0,0.35)'; c.fillText(String(n), cw / 2 + 4, ch / 2 + 10);
      c.fillStyle = st.css; c.fillText(String(n), cw / 2, ch / 2 + 6);
    });
    var front = new THREE.MeshLambertMaterial({ map: tex });
    mats.push(front);
    var m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), [mats[0], mats[0], mats[1], mats[0], front, mats[0]]);
    m.position.set(st.x, DY + h / 2, PZ);
    return m;
  }

  // medalha + fita, presa ao corpo do nadador (fica no peito)
  function makeMedal(model, st, mats, geos) {
    var g = new THREE.Group();
    var chestY = -0.13;
    var torso = model.torso;
    if (torso && torso.geometry) {
      if (!torso.geometry.boundingBox) torso.geometry.computeBoundingBox();
      chestY = torso.geometry.boundingBox.min.y * torso.scale.y + torso.position.y - 0.014;
    }
    var metal = new THREE.MeshPhongMaterial({ color: st.color, specular: 0xffffff, shininess: 90, emissive: st.color, emissiveIntensity: 0.18 });
    var ribbon = new THREE.MeshLambertMaterial({ color: 0x1d4ed8 });
    mats.push(metal, ribbon);
    var disc = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.018, 24), metal);
    var face = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.052, 0.024, 24), metal);
    geos.push(disc.geometry, face.geometry);
    disc.position.set(0, chestY, 0.19);
    face.position.copy(disc.position);
    g.add(disc); g.add(face);
    // fita em V do pescoço até a medalha
    [-1, 1].forEach(function (s) {
      var a = new V3(s * 0.075, chestY + 0.02, -0.07), b = new V3(0, chestY, 0.12);
      var len = a.distanceTo(b);
      var r = new THREE.Mesh(new THREE.BoxGeometry(0.032, 0.006, len), ribbon);
      geos.push(r.geometry);
      r.position.copy(a).add(b).multiplyScalar(0.5);
      r.quaternion.setFromUnitVectors(UPZ, dirV.copy(b).sub(a).normalize());
      g.add(r);
    });
    g.userData.restZ = 0;
    return g;
  }

  // plaquinha "VOCÊ" sobre a cabeça da jogadora
  function youSprite(mats) {
    var tex = SG.canvasTex(256, 96, function (c, w, h) {
      c.fillStyle = '#fde047';
      c.beginPath();
      c.moveTo(20, 8); c.lineTo(w - 20, 8); c.lineTo(w - 20, 64); c.lineTo(w / 2 + 18, 64); c.lineTo(w / 2, 90); c.lineTo(w / 2 - 18, 64); c.lineTo(20, 64);
      c.closePath(); c.fill();
      c.fillStyle = '#1c1917'; c.font = 'bold 44px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillText(SG.t('you').toUpperCase(), w / 2, 38);
    });
    var mat = new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true });
    mats.push(mat);
    var s = new THREE.Sprite(mat);
    s.scale.set(0.6, 0.225, 1);
    s.renderOrder = 10;
    return s;
  }

  function Podium(scene, race, res, quality) {
    this.scene = scene;
    this.race = race;
    this.t = 0;
    this.low = quality === 'low';
    var group = this.group = new THREE.Group();
    scene.add(group);
    var mats = this.mats = [new THREE.MeshLambertMaterial({ color: 0x1e3a8a }), new THREE.MeshLambertMaterial({ color: 0xf8fafc })];
    var geos = this.geos = [];
    var self = this;

    // tapete
    var carpet = new THREE.Mesh(new THREE.PlaneGeometry(6.4, 3.2), new THREE.MeshLambertMaterial({ color: 0xb91c1c }));
    mats.push(carpet.material); geos.push(carpet.geometry);
    carpet.rotation.x = -Math.PI / 2;
    carpet.position.set(0, DY + 0.006, PZ + 0.3);
    group.add(carpet);

    // os três primeiros que não foram desclassificados
    var top = res.list.filter(function (x) { return !x.dq; }).slice(0, 3);
    this.winners = top.map(function (entry, i) {
      var st = STEPS[i];
      var blk = stepMesh(i + 1, 1.25, st.h, 1.0, st, mats);
      geos.push(blk.geometry);
      group.add(blk);
      var sw = race.swimmers.filter(function (s) { return s.lane === entry.lane; })[0];
      var m = sw.model;
      m.showBody(true);
      m._full = true;
      m.root.visible = true;
      m.root.position.set(st.x, 0, PZ);
      SG.quatE(Math.PI + st.yaw, Math.PI / 2, 0, m.root.quaternion);
      m.poseLegs('stand');
      self.armsDown(m);
      m.root.updateMatrixWorld(true);
      tmpBox.setFromObject(m.root);
      m.root.position.y = DY + st.h - tmpBox.min.y + 0.005;
      var medal = makeMedal(m, st, mats, geos);
      medal.visible = false;
      m.body.add(medal);
      var w = { entry: entry, swimmer: sw, model: m, st: st, medal: medal, baseY: m.root.position.y, ph: Math.random() * 6, given: false };
      if (entry.isPlayer) {
        w.you = youSprite(mats);
        w.youY = tmpBox.max.y + m.root.position.y + 0.32;
        w.you.position.set(st.x, w.youY, PZ);
        group.add(w.you);
      }
      return w;
    });
    // esconde os demais nadadores (continuam na água) e as esteiras
    race.swimmers.forEach(function (s) {
      var onPodium = self.winners.some(function (w) { return w.swimmer === s; });
      if (!onPodium) s.model.root.visible = false;
      if (s.wake) s.wake.visible = false;
    });

    // mastros e bandeiras (sobem depois da medalha de ouro)
    var poleMat = new THREE.MeshLambertMaterial({ color: 0xcbd5e1 });
    mats.push(poleMat);
    this.flags = this.winners.map(function (w, i) {
      var st = w.st;
      var hgt = i === 0 ? 4.6 : 4.1;
      var pole = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, hgt, 8), poleMat);
      geos.push(pole.geometry);
      pole.position.set(st.x * 1.25, DY + hgt / 2, FLAG_Z);
      group.add(pole);
      var tex = SG.canvasTex(96, 64, function (c, cw, ch) { SG.drawFlag(c, w.entry.country, 0, 0, cw, ch); });
      var fm = new THREE.MeshLambertMaterial({ map: tex, side: THREE.DoubleSide });
      mats.push(fm);
      var geo = new THREE.PlaneGeometry(1.2, 0.8, 8, 1);
      geo.translate(0.6, 0, 0);
      geos.push(geo);
      var flag = new THREE.Mesh(geo, fm);
      flag.position.set(st.x * 1.25 + 0.04, DY + 1.0, FLAG_Z);
      group.add(flag);
      return { mesh: flag, base: geo.attributes.position.array.slice(0), y0: DY + 1.0, y1: DY + hgt - 0.45 };
    });

    // confete
    var n = this.low ? 140 : 380;
    var cg = new THREE.PlaneGeometry(0.07, 0.045);
    geos.push(cg);
    var cm = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide });
    mats.push(cm);
    var conf = this.confetti = new THREE.InstancedMesh(cg, cm, n);
    conf.frustumCulled = false;
    var cols = [0xfbbf24, 0xffffff, 0x22d3ee, 0xec4899, 0x22c55e, 0x3b82f6, 0xf97316];
    var col = new THREE.Color();
    this.cdata = [];
    for (var i = 0; i < n; i++) {
      conf.setColorAt(i, col.setHex(cols[i % cols.length]));
      this.cdata.push({ p: new V3(0, -10, 0), v: new V3(), axis: new V3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize(), a: Math.random() * 6, spin: 4 + Math.random() * 6, live: false });
    }
    conf.count = n;
    group.add(conf);
    this.updateConfetti(0);
  }

  Podium.prototype.armsDown = function (m) {
    m.setArm(m.armL, dirV.set(-0.17, -0.05, 1), REF, 0.12);
    m.setArm(m.armR, dirV.set(0.17, -0.05, 1), REF, 0.12);
  };

  Podium.prototype.burst = function () {
    for (var i = 0; i < this.cdata.length; i++) {
      var d = this.cdata[i];
      d.live = true;
      d.p.set((Math.random() - 0.5) * 2.5, DY + 3.2 + Math.random() * 0.6, PZ + (Math.random() - 0.5) * 1.5);
      var a = Math.random() * Math.PI * 2, sp = 1.5 + Math.random() * 3.5;
      d.v.set(Math.cos(a) * sp, 2 + Math.random() * 4, Math.sin(a) * sp * 0.6 + 0.6);
    }
  };

  Podium.prototype.updateConfetti = function (dt) {
    var conf = this.confetti;
    for (var i = 0; i < this.cdata.length; i++) {
      var d = this.cdata[i];
      if (d.live) {
        d.v.y = Math.max(d.v.y - 6 * dt, -0.9);
        d.v.x *= 1 - dt * 1.5; d.v.z *= 1 - dt * 1.5;
        d.p.addScaledVector(d.v, dt);
        d.p.x += Math.sin(this.t * 2 + i) * dt * 0.3;
        d.a += d.spin * dt;
        if (d.p.y < DY + 0.02) {
          // recicla: depois da explosão inicial o confete continua caindo do alto
          d.p.set((Math.random() - 0.5) * 7, DY + 5 + Math.random() * 2, PZ + (Math.random() - 0.5) * 4);
          d.v.set(0, -0.6, 0);
        }
      }
      tmpQ.setFromAxisAngle(d.axis, d.a);
      tmpM.compose(d.live ? d.p : tmpV.set(0, -50, 0), tmpQ, tmpS.set(1, 1, 1));
      conf.setMatrixAt(i, tmpM);
    }
    conf.instanceMatrix.needsUpdate = true;
  };

  Podium.prototype.fanfare = function () {
    var A = SG.Audio;
    if (!A.tone) return;
    [[523, 0], [659, 0.16], [784, 0.32], [1046, 0.5], [784, 0.8], [1046, 0.96]].forEach(function (n) {
      A.tone(n[0], n[1] >= 0.96 ? 0.7 : 0.2, 'triangle', 0.09, n[1]);
    });
  };

  Podium.prototype.update = function (dt, cam) {
    var t = this.t += dt;
    var self = this;
    // medalhas: bronze, prata, ouro
    this.winners.forEach(function (w, i) {
      var m = w.model, st = w.st;
      // o loop da prova esconde o corpo da jogadora na câmera em 1ª pessoa
      m.root.visible = true;
      if (i === 0 || w.entry.isPlayer) m.showBody(true);
      var since = t - st.t;
      if (since >= 0 && !w.given) {
        w.given = true;
        w.medal.visible = true;
        SG.Audio.good();
        if (i === 0) { self.burst(); SG.Audio.cheer(); self.fanfare(); }
        if (w.entry.isPlayer) SG.Audio.speak(SG.t('speak.medal', st.name, w.entry.name));
      }
      if (w.given) {
        var k = SG.clamp(since / 0.7, 0, 1);
        w.medal.position.z = -0.9 * (1 - easeOutBack(k)); // desce da cabeça até o peito
      }
      // comemoração depois de receber a medalha
      var cel = SG.clamp((since - 0.4) / 0.5, 0, 1);
      if (cel <= 0) self.armsDown(m);
      else if (i === 0) {
        var pump = Math.sin((t - st.t) * 6) * 0.12;
        m.setArm(m.armL, dirV.set(-SG.lerp(0.17, 0.42, cel), -0.12, SG.lerp(1, -1 + pump, cel)), REF, SG.lerp(0.12, 0.25, cel));
        m.setArm(m.armR, dirV.set(SG.lerp(0.17, 0.42, cel), -0.12, SG.lerp(1, -1 - pump, cel)), REF, SG.lerp(0.12, 0.25, cel));
      } else {
        var wave = Math.sin((t - st.t) * 5 + i) * 0.35;
        m.setArm(m.armL, dirV.set(-0.17, -0.05, 1), REF, 0.12);
        m.setArm(m.armR, dirV.set(SG.lerp(0.17, 0.55 + wave, cel), -0.2, SG.lerp(1, -0.85, cel)), REF, SG.lerp(0.12, 0.6, cel));
      }
      // respiração / pulinhos do campeão
      var hop = i === 0 && cel > 0 ? Math.max(0, Math.sin((t - st.t) * 6)) * 0.05 : 0;
      m.root.position.y = w.baseY + Math.sin(t * 2 + w.ph) * 0.008 + hop;
      if (w.you) w.you.position.y = w.youY + Math.sin(t * 3) * 0.04;
    });
    // bandeiras sobem e tremulam
    var fk = SG.smooth((t - FLAG_T0) / (FLAG_T1 - FLAG_T0));
    this.flags.forEach(function (f, i) {
      f.mesh.position.y = SG.lerp(f.y0, f.y1, fk);
      var pos = f.mesh.geometry.attributes.position;
      for (var j = 0; j < pos.count; j++) {
        var x = f.base[j * 3];
        pos.array[j * 3 + 2] = Math.sin(x * 4 - t * 5 + i) * 0.07 * x;
      }
      pos.needsUpdate = true;
    });
    this.updateConfetti(dt);

    // câmera: de uma vista aberta e alta até perto do pódio, depois balança devagar
    var ck = SG.smooth(t / 6.5);
    camFrom.set(7.5, 5.2, 2.5);
    // em telas largas e baixas (celular deitado) o ângulo vertical é pequeno: afasta a câmera
    var dist = Math.max(6.6, 3.0 / Math.tan(cam.fov * Math.PI / 360));
    camTo.set(Math.sin(t * 0.25) * 0.9, 2.1 + (dist - 6.6) * 0.12, PZ + dist);
    cam.position.copy(camFrom).lerp(camTo, ck);
    look.set(0, DY + 1.05 + (1 - ck) * -0.3, PZ - 0.4);
    cam.lookAt(look);
  };

  Podium.prototype.dispose = function () {
    this.scene.remove(this.group);
    this.winners.forEach(function (w) { if (w.medal.parent) w.medal.parent.remove(w.medal); });
    this.geos.forEach(function (g) { g.dispose(); });
    this.mats.forEach(function (m) { if (m.map) m.map.dispose(); m.dispose(); });
    this.confetti.dispose();
  };

  SG.Podium = Podium;
})();
