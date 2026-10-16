/* Modelo articulado de nadador e animação dos estilos.
 * Espaço local: -Z = direção da cabeça, -Y = lado do peito, +X = lado direito.
 * O nadador de costas usa o mesmo modelo com rotação de 180° no eixo longitudinal.
 */
(function () {
  var V3 = THREE.Vector3;
  var tmpD = new V3(), tmpX = new V3(), tmpY = new V3(), tmpZ = new V3(), tmpR = new V3();
  var tmpM = new THREE.Matrix4();

  var skinTones = [0xf1c27d, 0xe0ac69, 0xc68642, 0x8d5524, 0xffdbac, 0xd9a066];
  var lensColors = [0x1d3b6e, 0x3a1d5c, 0x0f3d3a, 0x5a3a0a, 0x222831];

  function capsule(r, len, mat, seg) {
    var g = new THREE.CapsuleGeometry(r, len, 3, seg || 8);
    g.rotateX(Math.PI / 2); // eixo ao longo de Z
    return new THREE.Mesh(g, mat);
  }

  // Sólido de revolução ao longo de +Z a partir de um perfil [[raio, z], ...] (z crescente).
  // sx/sy achatam a seção; back=true espelha para -Z (braços).
  function lathe(prof, mat, seg, sx, sy, back) {
    var pts = [];
    for (var i = 0; i < prof.length; i++) pts.push(new THREE.Vector2(prof[i][0], prof[i][1]));
    var g = new THREE.LatheGeometry(pts, seg);
    g.rotateX(Math.PI / 2);
    if (back) g.rotateY(Math.PI);
    g.scale(sx || 1, sy || 1, 1);
    return new THREE.Mesh(g, mat);
  }

  function ellipsoid(r, seg, mat, sx, sy, sz) {
    var m = new THREE.Mesh(new THREE.SphereGeometry(r, seg, Math.max(4, seg - 2)), mat);
    m.scale.set(sx, sy, sz);
    return m;
  }

  // perfis (raio, z) das partes do corpo
  var P_TORSO = [[0, -0.125], [0.11, -0.12], [0.19, -0.085], [0.232, -0.03], [0.238, 0.04], [0.222, 0.12],
    [0.196, 0.21], [0.17, 0.3], [0.152, 0.4], [0.146, 0.48], [0.12, 0.54], [0, 0.56]];
  var P_SUIT = [[0, 0.43], [0.15, 0.435], [0.153, 0.48], [0.163, 0.57], [0.168, 0.66], [0.158, 0.75], [0.11, 0.8], [0, 0.81]];
  var P_BAND = [[0.153, 0.43], [0.156, 0.435], [0.157, 0.47], [0.153, 0.475]];
  var P_THIGH = [[0, -0.03], [0.07, -0.02], [0.088, 0.04], [0.089, 0.14], [0.079, 0.27], [0.063, 0.39], [0.052, 0.46], [0.03, 0.485], [0, 0.49]];
  var P_SLEEVE = [[0, -0.04], [0.08, -0.03], [0.095, 0.02], [0.094, 0.14], [0.086, 0.26], [0.084, 0.29], [0, 0.291]];
  var P_SHIN = [[0, -0.04], [0.048, -0.03], [0.055, 0.02], [0.062, 0.1], [0.056, 0.19], [0.042, 0.31], [0.032, 0.39], [0.026, 0.42], [0, 0.43]];
  var P_FOOT = [[0, 0.37], [0.036, 0.385], [0.048, 0.45], [0.046, 0.53], [0.034, 0.6], [0.016, 0.63], [0, 0.635]];
  var P_UPPER = [[0, -0.035], [0.042, -0.025], [0.057, 0.01], [0.061, 0.08], [0.058, 0.15], [0.05, 0.23], [0.044, 0.29], [0.03, 0.325], [0, 0.335]];
  var P_FORE = [[0, -0.02], [0.036, -0.01], [0.047, 0.04], [0.048, 0.09], [0.04, 0.18], [0.031, 0.26], [0.024, 0.29], [0, 0.3]];

  // Junta várias malhas do mesmo material (posicionadas no espaço do grupo) em uma só,
  // para cada parte do corpo custar uma chamada de desenho por material.
  function merge(meshes, mat) {
    var pos = [], nor = [], idx = [], off = 0;
    meshes.forEach(function (m) {
      m.updateMatrix();
      var g = m.geometry.applyMatrix4(m.matrix);
      var p = g.attributes.position.array, n = g.attributes.normal.array, ix = g.index.array;
      for (var i = 0; i < p.length; i++) { pos.push(p[i]); nor.push(n[i]); }
      for (i = 0; i < ix.length; i++) idx.push(ix[i] + off);
      off += p.length / 3;
      g.dispose();
    });
    var out = new THREE.BufferGeometry();
    out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    out.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    out.setIndex(idx);
    return new THREE.Mesh(out, mat);
  }

  function at(m, x, y, z) { m.position.set(x, y, z); return m; }

  function SwimmerModel(opts) {
    opts = opts || {};
    var lowPoly = opts.lowPoly;
    var capColor = opts.cap != null ? opts.cap : 0xffffff;
    // pele e tecidos levemente brilhantes, como molhados
    var skin = new THREE.MeshPhongMaterial({ color: opts.skin != null ? opts.skin : skinTones[Math.floor(Math.random() * skinTones.length)], specular: 0x2b2b2b, shininess: 28 });
    var cap = new THREE.MeshPhongMaterial({ color: capColor, specular: 0x555555, shininess: 70 });
    var suit = new THREE.MeshPhongMaterial({ color: opts.suit != null ? opts.suit : 0x111827, specular: 0x3a3a3a, shininess: 45 });
    var accent = new THREE.MeshPhongMaterial({ color: capColor, specular: 0x333333, shininess: 45 });
    var lens = new THREE.MeshPhongMaterial({ color: opts.lens != null ? opts.lens : lensColors[Math.floor(Math.random() * lensColors.length)], specular: 0xffffff, shininess: 120 });
    var dark = new THREE.MeshPhongMaterial({ color: 0x0b0f14, specular: 0x222222, shininess: 30 });
    var lip = new THREE.MeshLambertMaterial({ color: 0x9a4a3c });
    this.materials = [skin, cap, suit, accent, lens, dark, lip];

    this.root = new THREE.Group();
    this.body = new THREE.Group();
    this.root.add(this.body);
    var seg = lowPoly ? 8 : 14;
    var hs = lowPoly ? 10 : 18; // cabeça

    // cabeça (topo para -Z, rosto para -Y) + touca + óculos
    this.head = new THREE.Group();
    this.head.position.set(0, -0.02, -0.24);
    var headSkin = [ellipsoid(0.108, hs, skin, 0.88, 1, 1.1), at(ellipsoid(0.072, seg, skin, 0.92, 0.95, 1), 0, -0.034, 0.05)];
    var neck = capsule(0.056, 0.08, skin, seg);
    headSkin.push(at(neck, 0, 0, 0.13));
    // tira dos óculos em volta da cabeça, na altura dos olhos
    var strap = new THREE.Mesh(new THREE.TorusGeometry(0.106, 0.0075, 4, hs + 6), dark);
    strap.rotation.x = 0.36;
    strap.scale.set(0.93, 1.06, 1);
    var headDark = [strap], lenses = [];
    [-1, 1].forEach(function (s) {
      headDark.push(at(ellipsoid(0.027, 10, dark, 1.35, 0.5, 0.95), s * 0.04, -0.093, -0.035));
      lenses.push(at(ellipsoid(0.023, 10, lens, 1.35, 0.5, 0.95), s * 0.04, -0.1, -0.035));
    });
    if (!lowPoly) {
      var nose = at(new THREE.Mesh(new THREE.ConeGeometry(0.016, 0.045, 6), skin), 0, -0.112, 0.012);
      nose.scale.set(1, 1, 0.8);
      nose.rotation.x = Math.PI * 1.08; // ponta para -Y, levemente inclinada
      headSkin.push(nose);
      [-1, 1].forEach(function (s) {
        headSkin.push(at(ellipsoid(0.024, 6, skin, 0.45, 0.8, 1.2), s * 0.094, -0.004, 0.035));
      });
      headDark.push(at(new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.006, 0.006), dark), 0, -0.104, -0.03));
      this.head.add(at(new THREE.Mesh(new THREE.BoxGeometry(0.034, 0.008, 0.009), lip), 0, -0.098, 0.062));
    }
    this.head.add(merge(headSkin, skin));
    this.head.add(merge(headDark, dark));
    this.head.add(merge(lenses, lens));
    // touca: mesma forma da cabeça, um pouco maior, para cobrir todo o topo
    var capWrap = new THREE.Group();
    capWrap.scale.set(0.88, 1, 1.1);
    var capM = new THREE.Mesh(new THREE.SphereGeometry(0.115, hs, hs - 4, 0, Math.PI * 2, 0, Math.PI * 0.6), cap);
    capM.rotation.x = -1.12; // topo da cabeça aponta para -Z (frente) e +Y (nuca)
    capWrap.add(capM);
    this.head.add(capWrap);
    this.body.add(this.head);

    // tronco em V (ombros largos, cintura fina) + peitoral e dorsais
    var torsoSkin = [lathe(P_TORSO, skin, seg + 4, 1, 0.58)];
    if (!lowPoly) {
      [-1, 1].forEach(function (s) {
        torsoSkin.push(at(ellipsoid(0.076, seg, skin, 1.25, 0.34, 0.8), s * 0.08, -0.113, 0.075));
        torsoSkin.push(at(ellipsoid(0.09, seg, skin, 0.6, 0.85, 1.6), s * 0.17, 0.01, 0.13));
      });
    }
    this.torso = merge(torsoSkin, skin); // malha única (o pódio usa a geometria para achar o peito)
    this.body.add(this.torso);
    // bermuda de competição (jammer) com cós na cor da touca
    this.hips = new THREE.Group();
    this.hips.add(lathe(P_SUIT, suit, seg + 4, 1, 0.66));
    this.hips.add(lathe(P_BAND, accent, seg + 4, 1, 0.66));
    this.body.add(this.hips);

    // pernas
    this.legs = [];
    [-1, 1].forEach(function (s) {
      var hip = new THREE.Group();
      hip.position.set(s * 0.09, 0, 0.68);
      hip.add(lathe(P_THIGH, skin, seg, 1, 0.94));
      hip.add(lathe(P_SLEEVE, suit, seg, 1, 0.94));
      // faixa lateral na cor da touca
      hip.add(at(new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.03, 0.27), accent), s * 0.091, 0, 0.13));
      var knee = new THREE.Group();
      knee.position.z = 0.46;
      knee.add(merge([lathe(P_SHIN, skin, seg, 1, 0.95), lathe(P_FOOT, skin, seg, 1.05, 0.55)], skin));
      hip.add(knee);
      hip.userData.knee = knee;
      this.body.add(hip);
      this.legs.push(hip);
    }, this);

    // braços
    this.arms = [];
    [-1, 1].forEach(function (s) {
      var sh = new THREE.Group();
      sh.position.set(s * 0.21, -0.01, 0.04);
      sh.add(merge([at(ellipsoid(0.066, seg, skin, 1, 0.9, 1.15), 0, 0, -0.012), lathe(P_UPPER, skin, seg, 1, 0.92, true)], skin));
      var elbow = new THREE.Group();
      elbow.position.z = -0.31;
      // antebraço + mão (palma achatada, dedos juntos e polegar)
      var armSkin = [lathe(P_FORE, skin, seg, 1.1, 0.85, true), at(ellipsoid(0.042, seg, skin, 1.05, 0.4, 1.2), 0, 0, -0.335)];
      var fingers = at(capsule(0.028, 0.05, skin, lowPoly ? 6 : 8), 0, 0, -0.395);
      fingers.scale.set(1.3, 0.42, 1);
      armSkin.push(fingers);
      if (!lowPoly) {
        var thumb = at(capsule(0.013, 0.045, skin, 6), -s * 0.04, -0.006, -0.345);
        thumb.rotation.y = s * 0.55;
        armSkin.push(thumb);
      }
      elbow.add(merge(armSkin, skin));
      var hand = new THREE.Object3D(); // referência para respingos
      hand.position.z = -0.34;
      elbow.add(hand);
      sh.add(elbow);
      sh.userData = { side: s, elbow: elbow, hand: hand };
      this.body.add(sh);
      this.arms.push(sh);
    }, this);
    this.armL = this.arms[0];
    this.armR = this.arms[1];
    this.bodyParts = [this.head, this.torso, this.hips, this.legs[0], this.legs[1]];
  }

  SwimmerModel.prototype.showBody = function (v) {
    this.bodyParts.forEach(function (p) { p.visible = v; });
  };

  // Orienta um braço para apontar em `dir` (local do corpo), dobrando o cotovelo na direção `ref`
  SwimmerModel.prototype.setArm = function (arm, dir, ref, bend) {
    tmpD.copy(dir).normalize();
    tmpZ.copy(tmpD).negate();
    tmpR.copy(ref).normalize();
    tmpX.crossVectors(tmpR, tmpZ);
    if (tmpX.lengthSq() < 1e-5) tmpX.set(1, 0, 0);
    tmpX.normalize();
    tmpY.crossVectors(tmpZ, tmpX);
    tmpM.makeBasis(tmpX, tmpY, tmpZ);
    arm.quaternion.setFromRotationMatrix(tmpM);
    arm.userData.elbow.rotation.x = bend;
  };

  var REF_CHEST = new V3(0, -1, 0.35);
  var REF_BACK = new V3(0, 1, 0.35);
  var dirV = new V3();

  // ângulo θ: 0 = mão entrando à frente; 0..π = puxada; π..2π = recuperação
  function crawlArm(model, arm, th) {
    var s = arm.userData.side;
    var st = Math.sin(th), ct = Math.cos(th);
    var lat = st >= 0 ? 0.12 - 0.1 * st : 0.12 + 0.32 * (-st);
    dirV.set(s * lat, -st, -ct);
    var bend = st >= 0 ? 1.0 * st : 1.25 * (-st);
    model.setArm(arm, dirV, REF_CHEST, bend);
  }

  function backArm(model, arm, th) {
    var s = arm.userData.side;
    var st = Math.sin(th), ct = Math.cos(th);
    var lat = st >= 0 ? 0.15 + 0.6 * st : 0.06;
    dirV.set(s * lat, st, -ct);
    var bend = st >= 0 ? 1.15 * Math.pow(st, 1.5) : 0.05;
    model.setArm(arm, dirV, REF_BACK, bend);
  }

  function flyArm(model, arm, th) {
    var s = arm.userData.side;
    var st = Math.sin(th), ct = Math.cos(th);
    var lat = st >= 0 ? 0.25 + 0.15 * st : 0.25 + 0.75 * (-st);
    dirV.set(s * lat, -st * (st >= 0 ? 1 : 0.55), -ct);
    var bend = st >= 0 ? 0.9 * st : 0.35 * (-st);
    model.setArm(arm, dirV, REF_CHEST, bend);
  }

  var BREAST_KEYS = [
    [0.0, 0.05, -0.08, -1.0, 0.0],
    [0.28, 0.8, -0.12, -0.62, 0.15],
    [0.48, 0.78, -0.55, -0.12, 1.1],
    [0.64, 0.42, -0.62, 0.18, 2.3],
    [0.8, 0.14, -0.3, -0.7, 1.1],
    [1.0, 0.05, -0.08, -1.0, 0.0]
  ];
  function breastArm(model, arm, p) {
    var s = arm.userData.side;
    p = SG.clamp(p, 0, 1);
    var a = BREAST_KEYS[0], b = BREAST_KEYS[1];
    for (var i = 0; i < BREAST_KEYS.length - 1; i++) {
      if (p >= BREAST_KEYS[i][0] && p <= BREAST_KEYS[i + 1][0]) { a = BREAST_KEYS[i]; b = BREAST_KEYS[i + 1]; break; }
    }
    var t = (p - a[0]) / Math.max(1e-4, b[0] - a[0]);
    dirV.set(s * SG.lerp(a[1], b[1], t), SG.lerp(a[2], b[2], t), SG.lerp(a[3], b[3], t));
    model.setArm(arm, dirV, REF_CHEST, SG.lerp(a[4], b[4], t));
  }

  /*
   * stroke: 'free' | 'back' | 'fly' | 'breast' | 'streamline' | 'stand'
   * a, b: ângulos dos braços (esq/dir) ou fase da braçada de peito
   */
  SwimmerModel.prototype.poseArms = function (stroke, a, b) {
    if (stroke === 'free') { crawlArm(this, this.armL, a); crawlArm(this, this.armR, b); }
    else if (stroke === 'back') { backArm(this, this.armL, a); backArm(this, this.armR, b); }
    else if (stroke === 'fly') { flyArm(this, this.armL, a); flyArm(this, this.armR, a); }
    else if (stroke === 'breast') { breastArm(this, this.armL, a); breastArm(this, this.armR, a); }
    else if (stroke === 'stand') {
      this.setArm(this.armL, dirV.set(-0.15, -0.6, 0.6), REF_CHEST, 0.1);
      this.setArm(this.armR, dirV.set(0.15, -0.6, 0.6), REF_CHEST, 0.1);
    } else {
      this.setArm(this.armL, dirV.set(0.24, 0.08, -1), REF_CHEST, 0);
      this.setArm(this.armR, dirV.set(-0.24, 0.08, -1), REF_CHEST, 0);
    }
  };

  // kick: fase contínua (rad); env: intensidade para o peito (0..1)
  SwimmerModel.prototype.poseLegs = function (stroke, kick, env) {
    var L = this.legs[0], R = this.legs[1];
    if (stroke === 'free' || stroke === 'back') {
      var amp = stroke === 'back' ? -0.32 : 0.32;
      L.rotation.set(amp * Math.sin(kick), 0, 0);
      R.rotation.set(-amp * Math.sin(kick), 0, 0);
      L.userData.knee.rotation.x = Math.max(0, 0.4 * Math.sin(kick + 0.8)) * Math.sign(amp);
      R.userData.knee.rotation.x = Math.max(0, -0.4 * Math.sin(kick + 0.8)) * Math.sign(amp);
    } else if (stroke === 'fly' || stroke === 'streamline') {
      var d = 0.3 * Math.sin(kick);
      L.rotation.set(d, 0, 0); R.rotation.set(d, 0, 0);
      var kb = Math.max(0, 0.6 * Math.sin(kick + 1.2));
      L.userData.knee.rotation.x = kb; R.userData.knee.rotation.x = kb;
    } else if (stroke === 'breast') {
      var e = SG.clamp(env || 0, 0, 1);
      L.rotation.set(0.5 * e, -0.45 * e, 0);
      R.rotation.set(0.5 * e, 0.45 * e, 0);
      L.userData.knee.rotation.x = 1.9 * e; R.userData.knee.rotation.x = 1.9 * e;
    } else {
      L.rotation.set(0, 0, 0); R.rotation.set(0, 0, 0);
      L.userData.knee.rotation.x = 0; R.userData.knee.rotation.x = 0;
    }
  };

  // posição mundial aproximada da mão (para respingos)
  SwimmerModel.prototype.handWorld = function (arm, out) {
    return arm.userData.hand.getWorldPosition(out);
  };

  SwimmerModel.prototype.dispose = function () {
    this.root.traverse(function (o) { if (o.geometry) o.geometry.dispose(); });
    this.materials.forEach(function (m) { m.dispose(); });
  };

  SG.SwimmerModel = SwimmerModel;

  // Orientação YXZ: yaw, pitch, roll
  var tmpE = new THREE.Euler();
  SG.quatE = function (yaw, pitch, roll, out) {
    tmpE.set(pitch, yaw, roll || 0, 'YXZ');
    return (out || new THREE.Quaternion()).setFromEuler(tmpE);
  };
  // yaw que faz -Z apontar para a direção de nado (+1 => +z)
  SG.yawFor = function (dir) { return dir > 0 ? Math.PI : 0; };
})();
