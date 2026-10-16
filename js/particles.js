/* Respingos, espuma e bolhas (sistema de partículas único) */
(function () {
  var vs = [
    'attribute float aAlpha;',
    'attribute float aSize;',
    'attribute vec3 aColor;',
    'varying float vAlpha;',
    'varying vec3 vColor;',
    'uniform float uScale;',
    'void main(){',
    '  vAlpha = aAlpha;',
    '  vColor = aColor;',
    '  vec4 mv = modelViewMatrix * vec4(position,1.0);',
    '  gl_PointSize = aSize * uScale / max(0.05, -mv.z);',
    '  gl_Position = projectionMatrix * mv;',
    '}'
  ].join('\n');
  var fs = [
    'varying float vAlpha;',
    'varying vec3 vColor;',
    'void main(){',
    '  vec2 d = gl_PointCoord - 0.5;',
    '  float r = length(d);',
    '  if(r > 0.5) discard;',
    '  float a = smoothstep(0.5, 0.15, r) * vAlpha;',
    '  gl_FragColor = vec4(vColor, a);',
    '}'
  ].join('\n');

  function Particles(scene, max) {
    this.max = max;
    this.pos = new Float32Array(max * 3);
    this.vel = new Float32Array(max * 3);
    this.life = new Float32Array(max);
    this.maxLife = new Float32Array(max);
    this.alpha = new Float32Array(max);
    this.size = new Float32Array(max);
    this.baseSize = new Float32Array(max);
    this.color = new Float32Array(max * 3);
    this.kind = new Uint8Array(max); // 0 gota, 1 espuma, 2 bolha
    this.next = 0;
    var g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('aAlpha', new THREE.BufferAttribute(this.alpha, 1).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('aSize', new THREE.BufferAttribute(this.size, 1).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('aColor', new THREE.BufferAttribute(this.color, 3).setUsage(THREE.DynamicDrawUsage));
    this.geo = g;
    this.mat = new THREE.ShaderMaterial({
      uniforms: { uScale: { value: 300 } },
      vertexShader: vs, fragmentShader: fs,
      transparent: true, depthWrite: false
    });
    this.points = new THREE.Points(g, this.mat);
    this.points.frustumCulled = false;
    this.points.renderOrder = 3;
    scene.add(this.points);
  }

  Particles.prototype.spawn = function (x, y, z, vx, vy, vz, life, size, kind, r, g, b) {
    var i = this.next;
    this.next = (this.next + 1) % this.max;
    this.pos[i * 3] = x; this.pos[i * 3 + 1] = y; this.pos[i * 3 + 2] = z;
    this.vel[i * 3] = vx; this.vel[i * 3 + 1] = vy; this.vel[i * 3 + 2] = vz;
    this.life[i] = life; this.maxLife[i] = life;
    this.baseSize[i] = size;
    this.kind[i] = kind;
    this.color[i * 3] = r; this.color[i * 3 + 1] = g; this.color[i * 3 + 2] = b;
  };

  Particles.prototype.splash = function (x, z, n, power) {
    power = power || 1;
    for (var k = 0; k < n; k++) {
      var a = Math.random() * Math.PI * 2;
      var sp = (0.4 + Math.random() * 1.2) * power;
      this.spawn(x + (Math.random() - 0.5) * 0.2, 0.03, z + (Math.random() - 0.5) * 0.2,
        Math.cos(a) * sp * 0.6, (1.2 + Math.random() * 1.8) * power, Math.sin(a) * sp * 0.6,
        0.5 + Math.random() * 0.5, 0.025 + Math.random() * 0.03, 0, 0.92, 0.97, 1.0);
    }
    for (k = 0; k < Math.ceil(n / 3); k++) {
      this.spawn(x + (Math.random() - 0.5) * 0.4, 0.02, z + (Math.random() - 0.5) * 0.4,
        (Math.random() - 0.5) * 0.3, 0, (Math.random() - 0.5) * 0.3,
        0.8 + Math.random() * 0.8, 0.12 + Math.random() * 0.1, 1, 0.95, 0.98, 1.0);
    }
  };

  Particles.prototype.foam = function (x, z, n) {
    for (var k = 0; k < n; k++) {
      this.spawn(x + (Math.random() - 0.5) * 0.35, 0.02, z + (Math.random() - 0.5) * 0.35,
        (Math.random() - 0.5) * 0.4, 0.6 + Math.random() * 0.8, (Math.random() - 0.5) * 0.4,
        0.35 + Math.random() * 0.4, 0.03 + Math.random() * 0.04, 0, 0.92, 0.97, 1.0);
    }
  };

  Particles.prototype.bubbles = function (x, y, z, n, spread) {
    spread = spread || 0.3;
    for (var k = 0; k < n; k++) {
      this.spawn(x + (Math.random() - 0.5) * spread, y + (Math.random() - 0.5) * spread * 0.5, z + (Math.random() - 0.5) * spread,
        (Math.random() - 0.5) * 0.2, 0.4 + Math.random() * 0.6, (Math.random() - 0.5) * 0.2,
        0.9 + Math.random() * 1.2, 0.015 + Math.random() * 0.03, 2, 0.85, 0.95, 1.0);
    }
  };

  Particles.prototype.update = function (dt) {
    var p = this.pos, v = this.vel;
    for (var i = 0; i < this.max; i++) {
      if (this.life[i] <= 0) { this.alpha[i] = 0; this.size[i] = 0; continue; }
      this.life[i] -= dt;
      var k = this.kind[i];
      var j = i * 3;
      if (k === 0) {
        v[j + 1] -= 9.8 * dt;
        if (p[j + 1] < -0.02 && v[j + 1] < 0) this.life[i] = 0;
      } else if (k === 1) {
        v[j] *= 0.97; v[j + 2] *= 0.97;
      } else {
        v[j] += (Math.random() - 0.5) * 0.6 * dt;
        v[j + 2] += (Math.random() - 0.5) * 0.6 * dt;
        if (p[j + 1] > -0.02) this.life[i] = 0;
      }
      p[j] += v[j] * dt; p[j + 1] += v[j + 1] * dt; p[j + 2] += v[j + 2] * dt;
      var f = this.life[i] / this.maxLife[i];
      this.alpha[i] = k === 1 ? f * 0.55 : (k === 2 ? 0.7 * Math.min(1, f * 3) : Math.min(1, f * 2) * 0.9);
      this.size[i] = this.baseSize[i] * (k === 1 ? (1.6 - f * 0.6) : 1);
    }
    this.geo.attributes.position.needsUpdate = true;
    this.geo.attributes.aAlpha.needsUpdate = true;
    this.geo.attributes.aSize.needsUpdate = true;
    this.geo.attributes.aColor.needsUpdate = true;
  };

  Particles.prototype.setViewport = function (h, fov) {
    this.mat.uniforms.uScale.value = h / (2 * Math.tan(fov * Math.PI / 360));
  };

  Particles.prototype.clear = function () {
    for (var i = 0; i < this.max; i++) this.life[i] = 0;
  };

  Particles.prototype.dispose = function (scene) {
    scene.remove(this.points);
    this.geo.dispose();
    this.mat.dispose();
  };

  SG.Particles = Particles;
})();
