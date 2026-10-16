/* Modelo articulado de nadador e animação dos estilos.
 * Espaço local: -Z = direção da cabeça, -Y = lado do peito, +X = lado direito.
 * O nadador de costas usa o mesmo modelo com rotação de 180° no eixo longitudinal.
 */
(function () {
  var V3 = THREE.Vector3;
  var tmpD = new V3(), tmpX = new V3(), tmpY = new V3(), tmpZ = new V3(), tmpR = new V3();
  var tmpM = new THREE.Matrix4();

  var skinTones = [0xf1c27d, 0xe0ac69, 0xc68642, 0x8d5524, 0xffdbac, 0xd9a066];

  function capsule(r, len, mat, seg) {
    var g = new THREE.CapsuleGeometry(r, len, 4, seg || 8);
    g.rotateX(Math.PI / 2); // eixo ao longo de Z
    return new THREE.Mesh(g, mat);
  }

  function SwimmerModel(opts) {
    opts = opts || {};
    var lowPoly = opts.lowPoly;
    var skin = new THREE.MeshLambertMaterial({ color: opts.skin != null ? opts.skin : skinTones[Math.floor(Math.random() * skinTones.length)] });
    var cap = new THREE.MeshLambertMaterial({ color: opts.cap != null ? opts.cap : 0xffffff });
    var suit = new THREE.MeshLambertMaterial({ color: opts.suit != null ? opts.suit : 0x111827 });
    var dark = new THREE.MeshBasicMaterial({ color: 0x0b0f14 });
    this.materials = [skin, cap, suit, dark];

    this.root = new THREE.Group();
    this.body = new THREE.Group();
    this.root.add(this.body);
    var seg = lowPoly ? 6 : 10;

    // cabeça + touca + óculos
    this.head = new THREE.Group();
    this.head.position.set(0, -0.02, -0.24);
    var headM = new THREE.Mesh(new THREE.SphereGeometry(0.11, seg, seg - 2), skin);
    headM.scale.set(0.9, 1, 1.1);
    this.head.add(headM);
    var capM = new THREE.Mesh(new THREE.SphereGeometry(0.117, seg, seg - 2, 0, Math.PI * 2, 0, Math.PI * 0.62), cap);
    capM.rotation.x = -1.15; // topo da cabeça aponta para -Z (frente) e +Y (nuca)
    capM.scale.set(0.92, 1, 1.12);
    this.head.add(capM);
    [-1, 1].forEach(function (s) {
      var g = new THREE.Mesh(new THREE.SphereGeometry(0.026, 6, 4), dark);
      g.position.set(s * 0.042, -0.07, -0.075);
      g.scale.set(1.2, 0.7, 0.6);
      this.head.add(g);
    }, this);
    this.body.add(this.head);

    // tronco
    this.torso = capsule(0.15, 0.4, skin, seg);
    this.torso.scale.set(1.3, 0.78, 1);
    this.torso.position.set(0, 0.0, 0.28);
    this.body.add(this.torso);
    this.hips = capsule(0.14, 0.14, suit, seg);
    this.hips.scale.set(1.22, 0.8, 1);
    this.hips.position.set(0, 0.0, 0.62);
    this.body.add(this.hips);

    // pernas
    this.legs = [];
    [-1, 1].forEach(function (s) {
      var hip = new THREE.Group();
      hip.position.set(s * 0.09, 0, 0.68);
      var thigh = capsule(0.075, 0.4, skin, seg);
      thigh.position.z = 0.24;
      hip.add(thigh);
      var knee = new THREE.Group();
      knee.position.z = 0.46;
      var shin = capsule(0.058, 0.38, skin, seg);
      shin.position.z = 0.22;
      knee.add(shin);
      var foot = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.05, 0.22), skin);
      foot.position.set(0, 0, 0.5);
      knee.add(foot);
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
      var up = capsule(0.052, 0.24, skin, seg);
      up.position.z = -0.15;
      sh.add(up);
      var elbow = new THREE.Group();
      elbow.position.z = -0.31;
      var fore = capsule(0.045, 0.22, skin, seg);
      fore.position.z = -0.14;
      elbow.add(fore);
      var hand = new THREE.Mesh(new THREE.SphereGeometry(0.055, seg, seg - 3), skin);
      hand.scale.set(0.95, 0.42, 1.55);
      hand.position.z = -0.32;
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
