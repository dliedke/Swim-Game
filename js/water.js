/* Superfície da água: shader com ondas + função de altura equivalente em JS */
(function () {
  var MAX_RIPPLES = 8;

  // Mesma fórmula usada no vertex shader (para saber se a câmera está submersa)
  SG.waveHeight = function (x, z, t, ripples) {
    var h = 0.018 * Math.sin(0.8 * x + 1.1 * t) +
      0.014 * Math.sin(0.9 * z - 1.4 * t + 0.5) +
      0.008 * Math.sin(1.9 * (x * 0.7 + z * 0.7) + 2.3 * t) +
      0.005 * Math.sin(3.1 * x - 2.7 * z + 3.1 * t);
    if (ripples) {
      for (var i = 0; i < ripples.length; i += 4) {
        var a = ripples[i + 3];
        if (a <= 0) continue;
        var dx = x - ripples[i], dz = z - ripples[i + 1];
        var r = Math.sqrt(dx * dx + dz * dz);
        h += a * Math.exp(-r * r * 0.9) * Math.sin(r * 9.0 - t * 9.0);
      }
    }
    return h;
  };

  var vs = [
    '#include <fog_pars_vertex>',
    'uniform float uTime;',
    'uniform vec4 uRip[' + MAX_RIPPLES + '];',
    'varying vec3 vWorld;',
    'varying vec3 vNormalW;',
    'float wave(vec2 p){',
    '  float h = 0.018*sin(0.8*p.x + 1.1*uTime) + 0.014*sin(0.9*p.y - 1.4*uTime + 0.5)',
    '    + 0.008*sin(1.9*(p.x*0.7+p.y*0.7) + 2.3*uTime) + 0.005*sin(3.1*p.x - 2.7*p.y + 3.1*uTime);',
    '  for(int i=0;i<' + MAX_RIPPLES + ';i++){',
    '    vec4 r = uRip[i];',
    '    if(r.w > 0.0){',
    '      float d = length(p - r.xy);',
    '      h += r.w*exp(-d*d*0.9)*sin(d*9.0 - uTime*9.0);',
    '    }',
    '  }',
    '  return h;',
    '}',
    'void main(){',
    '  vec4 wp = modelMatrix * vec4(position,1.0);',
    '  float h = wave(wp.xz);',
    '  float e = 0.08;',
    '  float hx = wave(wp.xz + vec2(e,0.0));',
    '  float hz = wave(wp.xz + vec2(0.0,e));',
    '  vNormalW = normalize(vec3(h-hx, e, h-hz));',
    '  wp.y += h;',
    '  vWorld = wp.xyz;',
    '  vec4 mvPosition = viewMatrix * wp;',
    '  gl_Position = projectionMatrix * mvPosition;',
    '  #include <fog_vertex>',
    '}'
  ].join('\n');

  var fs = [
    '#include <fog_pars_fragment>',
    'uniform float uTime;',
    'uniform float uCeil;',
    'varying vec3 vWorld;',
    'varying vec3 vNormalW;',
    // reflexo das luminárias do teto (grade igual à do ginásio)
    'float lamps(vec3 p, vec3 R){',
    '  if(R.y < 0.02) return 0.0;',
    '  float t = (uCeil - p.y)/R.y;',
    '  vec2 c = p.xz + R.xz*t;',
    '  if(abs(c.x) > 21.5) return 0.0;',
    '  vec2 g = vec2(mod(c.x + 24.0, 8.0) - 4.0, mod(c.y + 14.5, 7.0) - 3.5);',
    '  return (1.0 - smoothstep(1.0, 1.35, abs(g.x)))*(1.0 - smoothstep(0.25, 0.5, abs(g.y)));',
    '}',
    'void main(){',
    '  vec3 V = normalize(cameraPosition - vWorld);',
    '  vec3 N = normalize(vNormalW);',
    '  float sparkle = sin(vWorld.x*14.0 + uTime*3.0)*sin(vWorld.z*13.0 - uTime*2.6);',
    '  if(gl_FrontFacing){',
    '    float fres = pow(1.0 - max(dot(N,V),0.0), 3.0);',
    '    vec3 R = reflect(-V, N);',
    '    vec3 base = vec3(0.04,0.46,0.6);',
    '    vec3 refl = mix(vec3(0.72,0.8,0.88), vec3(0.86,0.9,0.95), clamp(R.y,0.0,1.0));',
    '    refl += vec3(1.0,0.97,0.88)*lamps(vWorld, R)*1.6;',
    '    vec3 col = mix(base, refl, 0.1 + 0.75*fres);',
    '    vec3 L = normalize(vec3(0.25,1.0,0.35));',
    '    float spec = pow(max(dot(reflect(-L,N),V),0.0), 90.0);',
    '    col += vec3(1.0)*spec*0.8 + vec3(0.9,0.97,1.0)*max(sparkle-0.75,0.0)*0.8;',
    '    float a = mix(0.38, 0.95, fres) + lamps(vWorld, R)*0.4;',
    '    gl_FragColor = vec4(col, clamp(a,0.0,1.0));',
    '  } else {',
    // visto de baixo: janela de Snell + reflexão interna total
    '    vec3 Nd = -N;',
    '    float c = max(dot(Nd, V), 0.0);',
    '    vec3 T = refract(-V, Nd, 1.333);',
    '    float inside = smoothstep(0.62, 0.7, c);',
    '    vec3 sky = vec3(0.78,0.92,1.0) + vec3(1.0,0.98,0.9)*lamps(vWorld, T)*1.4;',
    '    vec3 tir = mix(vec3(0.1,0.5,0.62), vec3(0.2,0.62,0.74), sparkle*0.5+0.5);',
    '    vec3 col = mix(tir, sky, inside);',
    '    col += vec3(0.9,1.0,1.0)*(smoothstep(0.6,0.66,c) - smoothstep(0.66,0.74,c))*0.5;',
    '    col += vec3(0.8,0.95,1.0)*max(sparkle-0.6,0.0)*0.5;',
    '    gl_FragColor = vec4(col, mix(0.8, 0.97, inside));',
    '  }',
    '  #include <fog_fragment>',
    '}'
  ].join('\n');

  SG.createWater = function (length, width, quality) {
    var seg = quality === 'low' ? 2.2 : (quality === 'medium' ? 3.5 : 5);
    var geo = new THREE.PlaneGeometry(width, length, Math.round(width * seg), Math.round(length * seg));
    geo.rotateX(-Math.PI / 2);
    geo.translate(0, 0, length / 2);
    var rip = [];
    for (var i = 0; i < MAX_RIPPLES; i++) rip.push(new THREE.Vector4(0, 0, 0, 0));
    var uniforms = THREE.UniformsUtils.merge([THREE.UniformsLib.fog, {
      uTime: { value: 0 },
      uCeil: { value: SG.DECK_Y + 14.7 },
      uRip: { value: rip }
    }]);
    uniforms.uRip.value = rip; // merge clona: garante a referência
    var mat = new THREE.ShaderMaterial({
      uniforms: uniforms,
      vertexShader: vs,
      fragmentShader: fs,
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
      fog: true
    });
    var mesh = new THREE.Mesh(geo, mat);
    mesh.renderOrder = 2;
    mesh.frustumCulled = false;
    mesh.userData.ripples = new Float32Array(MAX_RIPPLES * 4);
    mesh.userData.setRipples = function (arr) {
      for (var i = 0; i < MAX_RIPPLES; i++) {
        rip[i].set(arr[i * 4], arr[i * 4 + 1], arr[i * 4 + 2], arr[i * 4 + 3]);
      }
    };
    return mesh;
  };

  SG.MAX_RIPPLES = MAX_RIPPLES;

  // Raios de luz submersos (planos aditivos que acompanham a câmera)
  SG.createLightRays = function (scene, count) {
    var tex = SG.canvasTex(64, 256, function (c, w, h) {
      var g = c.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, 'rgba(255,255,255,0.9)');
      g.addColorStop(0.5, 'rgba(255,255,255,0.3)');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      c.fillStyle = g; c.fillRect(0, 0, w, h);
      var e = c.createLinearGradient(0, 0, w, 0);
      e.addColorStop(0, 'rgba(0,0,0,1)'); e.addColorStop(0.5, 'rgba(0,0,0,0)'); e.addColorStop(1, 'rgba(0,0,0,1)');
      c.globalCompositeOperation = 'destination-out';
      c.fillStyle = e; c.fillRect(0, 0, w, h);
    });
    var group = new THREE.Group();
    var rays = [];
    for (var i = 0; i < count; i++) {
      var mat = new THREE.MeshBasicMaterial({ map: tex, color: 0x9be7ff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, side: THREE.DoubleSide });
      var m = new THREE.Mesh(new THREE.PlaneGeometry(0.5 + Math.random() * 0.9, 3.2), mat);
      m.userData = { bx: (Math.random() - 0.5) * 12, bz: (Math.random() - 0.5) * 12, ph: Math.random() * 6.28, sp: 0.4 + Math.random() * 0.6, tilt: (Math.random() - 0.5) * 0.35 };
      m.renderOrder = 4;
      group.add(m);
      rays.push(m);
    }
    group.visible = false;
    scene.add(group);
    var wrap = function (v) { return ((v % 12) + 18) % 12 - 6; };
    return {
      group: group,
      update: function (cam, t, on) {
        group.visible = on;
        if (!on) return;
        for (var i = 0; i < rays.length; i++) {
          var r = rays[i], u = r.userData;
          var x = cam.x + wrap(u.bx - cam.x), z = cam.z + wrap(u.bz - cam.z);
          r.position.set(x, -1.45, z);
          r.rotation.set(0, Math.atan2(cam.x - x, cam.z - z), u.tilt);
          var d = Math.sqrt((x - cam.x) * (x - cam.x) + (z - cam.z) * (z - cam.z));
          r.material.opacity = (0.1 + 0.08 * Math.sin(t * u.sp + u.ph)) * SG.clamp((d - 0.6) / 1.5, 0, 1) * SG.clamp((6 - d) / 2, 0, 1);
        }
      },
      dispose: function () {
        scene.remove(group);
        rays.forEach(function (r) { r.geometry.dispose(); r.material.dispose(); });
        tex.dispose();
      }
    };
  };
})();
