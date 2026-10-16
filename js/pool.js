/* Construção do ambiente: piscina, raias, blocos, arquibancada, placar */
(function () {
  var tileVS = [
    '#include <fog_pars_vertex>',
    'varying vec3 vWorld;',
    'varying vec3 vN;',
    'void main(){',
    '  vec4 wp = modelMatrix * vec4(position,1.0);',
    '  vWorld = wp.xyz;',
    '  vN = mat3(modelMatrix) * normal;',
    '  vec4 mvPosition = viewMatrix * wp;',
    '  gl_Position = projectionMatrix * mvPosition;',
    '  #include <fog_vertex>',
    '}'
  ].join('\n');

  var tileFS = [
    '#include <fog_pars_fragment>',
    'uniform float uTime;',
    'uniform float uLen;',
    'uniform float uHalfW;',
    'uniform float uLaneW;',
    'uniform float uDepth;',
    'varying vec3 vWorld;',
    'varying vec3 vN;',
    'float caustic(vec2 uv, float time){',
    '  vec2 p = mod(uv*6.28318, 6.28318) - 250.0;',
    '  vec2 i = p;',
    '  float c = 1.0;',
    '  float inten = 0.005;',
    '  for(int n=0;n<4;n++){',
    '    float t = time*(1.0 - (3.5/float(n+1)));',
    '    i = p + vec2(cos(t - i.x) + sin(t + i.y), sin(t - i.y) + cos(t + i.x));',
    '    c += 1.0/length(vec2(p.x/(sin(i.x+t)/inten), p.y/(cos(i.y+t)/inten)));',
    '  }',
    '  c /= 4.0;',
    '  c = 1.17 - pow(c, 1.4);',
    '  return clamp(pow(abs(c), 8.0), 0.0, 1.0);',
    '}',
    'void main(){',
    '  vec3 p = vWorld;',
    '  vec3 n = normalize(vN);',
    '  bool floorF = n.y > 0.5;',
    '  bool endWall = abs(n.z) > 0.5;',
    '  vec2 uv = floorF ? p.xz : (endWall ? p.xy : p.zy);',
    '  vec2 g = abs(fract(uv/0.25 + 0.5) - 0.5)*0.25;',
    '  float grout = 1.0 - smoothstep(0.004, 0.01, min(g.x, g.y));',
    '  vec2 id = floor(uv/0.25);',
    '  float rnd = fract(sin(dot(id, vec2(12.9898,78.233)))*43758.5453);',
    '  vec3 tile = vec3(0.56,0.80,0.90)*(0.95 + 0.07*rnd);',
    '  vec3 col = mix(tile, vec3(0.86,0.92,0.95), grout);',
    '  float lanePos = (p.x + uHalfW)/uLaneW;',
    '  float lc = abs(fract(lanePos) - 0.5)*uLaneW;',
    '  float mark = 0.0;',
    '  if(floorF){',
    '    if(lc < 0.125 && p.z > 2.0 && p.z < uLen - 2.0) mark = 1.0;',
    '    if(lc < 0.5 && (abs(p.z - 2.0) < 0.125 || abs(p.z - (uLen - 2.0)) < 0.125)) mark = 1.0;',
    '    if(uLen > 40.0 && lc < 0.5 && abs(p.z - uLen*0.5) < 0.1) mark = 1.0;',
    '  } else if(endWall){',
    '    if(lc < 0.125 && p.y < -0.6) mark = 1.0;',
    '    if(lc < 0.25 && abs(p.y + 0.95) < 0.125) mark = 1.0;',
    '  }',
    '  col = mix(col, vec3(0.04,0.07,0.22), mark);',
    '  if(p.y > -0.04){ col = vec3(0.93,0.95,0.96)*(0.92 + 0.08*rnd); }',
    '  if(p.y < 0.0){',
    '    vec2 cp = floorF ? p.xz : (endWall ? p.xy : p.zy);',
    '    float c = caustic(cp/3.0, uTime*0.55);',
    '    float depthF = clamp(-p.y/uDepth, 0.0, 1.0);',
    '    col *= mix(vec3(0.95,1.0,1.0), vec3(0.6,0.84,0.95), depthF);',
    '    col += vec3(0.75,0.95,1.0)*c*(0.45 - 0.15*depthF);',
    '  }',
    '  float sh = floorF ? 1.0 : 0.86;',
    '  gl_FragColor = vec4(col*sh, 1.0);',
    '  #include <fog_fragment>',
    '}'
  ].join('\n');

  function canvasTex(w, h, draw) {
    var c = document.createElement('canvas');
    c.width = w; c.height = h;
    draw(c.getContext('2d'), w, h);
    var t = new THREE.CanvasTexture(c);
    t.anisotropy = 4;
    return t;
  }

  // Bandeiras simplificadas para placar e decoração
  SG.drawFlag = function (ctx, code, x, y, w, h) {
    ctx.save();
    ctx.translate(x, y);
    function hs(cols) { cols.forEach(function (c, i) { ctx.fillStyle = c; ctx.fillRect(0, i * h / cols.length, w, h / cols.length + 1); }); }
    function vs(cols) { cols.forEach(function (c, i) { ctx.fillStyle = c; ctx.fillRect(i * w / cols.length, 0, w / cols.length + 1, h); }); }
    switch (code) {
      case 'BRA':
        ctx.fillStyle = '#009c3b'; ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = '#ffdf00'; ctx.beginPath(); ctx.moveTo(w / 2, h * 0.1); ctx.lineTo(w * 0.92, h / 2); ctx.lineTo(w / 2, h * 0.9); ctx.lineTo(w * 0.08, h / 2); ctx.fill();
        ctx.fillStyle = '#002776'; ctx.beginPath(); ctx.arc(w / 2, h / 2, h * 0.24, 0, Math.PI * 2); ctx.fill();
        break;
      case 'JPN':
        ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = '#bc002d'; ctx.beginPath(); ctx.arc(w / 2, h / 2, h * 0.3, 0, Math.PI * 2); ctx.fill();
        break;
      case 'USA':
        for (var i = 0; i < 7; i++) { ctx.fillStyle = i % 2 ? '#fff' : '#b22234'; ctx.fillRect(0, i * h / 7, w, h / 7 + 1); }
        ctx.fillStyle = '#3c3b6e'; ctx.fillRect(0, 0, w * 0.42, h * 4 / 7);
        break;
      case 'ITA': vs(['#009246', '#fff', '#ce2b37']); break;
      case 'FRA': vs(['#0055a4', '#fff', '#ef4135']); break;
      case 'NGR': vs(['#008751', '#fff', '#008751']); break;
      case 'GER': hs(['#000', '#dd0000', '#ffce00']); break;
      case 'ESP': hs(['#aa151b', '#f1bf00', '#f1bf00', '#aa151b']); break;
      case 'CZE':
        hs(['#fff', '#d7141a']);
        ctx.fillStyle = '#11457e'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(w * 0.5, h / 2); ctx.lineTo(0, h); ctx.fill();
        break;
      case 'SWE':
        ctx.fillStyle = '#006aa7'; ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = '#fecc00'; ctx.fillRect(w * 0.3, 0, w * 0.14, h); ctx.fillRect(0, h * 0.42, w, h * 0.16);
        break;
      case 'AUS':
        ctx.fillStyle = '#00247d'; ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = '#fff';
        [[0.7, 0.3], [0.82, 0.55], [0.62, 0.7], [0.75, 0.85], [0.25, 0.75]].forEach(function (s) { ctx.beginPath(); ctx.arc(s[0] * w, s[1] * h, h * 0.06, 0, 7); ctx.fill(); });
        ctx.fillStyle = '#cf142b'; ctx.fillRect(0, h * 0.2, w * 0.45, h * 0.08); ctx.fillRect(w * 0.19, 0, w * 0.07, h * 0.5);
        break;
      case 'KOR':
        ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = '#cd2e3a'; ctx.beginPath(); ctx.arc(w / 2, h / 2, h * 0.25, Math.PI, 0); ctx.fill();
        ctx.fillStyle = '#0047a0'; ctx.beginPath(); ctx.arc(w / 2, h / 2, h * 0.25, 0, Math.PI); ctx.fill();
        break;
      default:
        ctx.fillStyle = '#888'; ctx.fillRect(0, 0, w, h);
    }
    ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 2; ctx.strokeRect(0, 0, w, h);
    ctx.restore();
  };

  SG.buildPool = function (scene, L, quality) {
    var W = SG.POOL_W, D = SG.POOL_DEPTH, DY = SG.DECK_Y;
    var group = new THREE.Group();
    scene.add(group);
    var low = quality === 'low';

    // ---------- tanque com shader de azulejos + cáusticas ----------
    var tileUniforms = THREE.UniformsUtils.merge([THREE.UniformsLib.fog, {
      uTime: { value: 0 }, uLen: { value: L }, uHalfW: { value: W / 2 },
      uLaneW: { value: SG.LANE_W }, uDepth: { value: D }
    }]);
    var tileMat = new THREE.ShaderMaterial({ uniforms: tileUniforms, vertexShader: tileVS, fragmentShader: tileFS, fog: true });

    var floor = new THREE.Mesh(new THREE.PlaneGeometry(W, L), tileMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(0, -D, L / 2);
    group.add(floor);

    var wallH = D + DY;
    function wall(w, x, z, rotY) {
      var m = new THREE.Mesh(new THREE.PlaneGeometry(w, wallH), tileMat);
      m.position.set(x, -D + wallH / 2, z);
      m.rotation.y = rotY;
      group.add(m);
    }
    wall(W, 0, 0, 0);               // parede de saída (normal +z)
    wall(W, 0, L, Math.PI);         // parede da virada (normal -z)
    wall(L, -W / 2, L / 2, Math.PI / 2);  // lateral esquerda (normal +x)
    wall(L, W / 2, L / 2, -Math.PI / 2);  // lateral direita (normal -x)

    // ---------- placas de toque ----------
    var padTex = canvasTex(128, 64, function (c, w, h) {
      c.fillStyle = '#20262e'; c.fillRect(0, 0, w, h);
      c.strokeStyle = '#ffd400'; c.lineWidth = 6; c.strokeRect(3, 3, w - 6, h - 6);
    });
    var padMat = new THREE.MeshLambertMaterial({ map: padTex });
    for (var i = 0; i < SG.LANES; i++) {
      [0, L].forEach(function (z) {
        var pad = new THREE.Mesh(new THREE.PlaneGeometry(SG.LANE_W - 0.12, 0.9), padMat);
        pad.position.set(SG.laneX(i), -0.3, z === 0 ? 0.012 : L - 0.012);
        pad.rotation.y = z === 0 ? 0 : Math.PI;
        group.add(pad);
      });
    }

    // ---------- deck ----------
    var deckTex = canvasTex(256, 256, function (c, w, h) {
      c.fillStyle = '#d9dde0'; c.fillRect(0, 0, w, h);
      for (var y = 0; y < 4; y++) for (var x = 0; x < 4; x++) {
        var v = 205 + Math.floor(Math.random() * 25);
        c.fillStyle = 'rgb(' + v + ',' + (v + 4) + ',' + (v + 6) + ')';
        c.fillRect(x * 64 + 2, y * 64 + 2, 60, 60);
      }
    });
    deckTex.wrapS = deckTex.wrapT = THREE.RepeatWrapping;
    var hallX = 30, z0 = -15, z1 = L + 15;
    function deckPiece(x0, x1, za, zb) {
      var w = x1 - x0, d = zb - za;
      var tex = deckTex.clone();
      tex.needsUpdate = true;
      tex.repeat.set(w / 2, d / 2);
      var m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshLambertMaterial({ map: tex }));
      m.rotation.x = -Math.PI / 2;
      m.position.set((x0 + x1) / 2, DY, (za + zb) / 2);
      group.add(m);
    }
    deckPiece(-hallX, -W / 2, z0, z1);
    deckPiece(W / 2, hallX, z0, z1);
    deckPiece(-W / 2, W / 2, z0, 0);
    deckPiece(-W / 2, W / 2, L, z1);

    // borda da piscina
    var edgeMat = new THREE.MeshLambertMaterial({ color: 0xf2f4f5 });
    var e1 = new THREE.Mesh(new THREE.BoxGeometry(W + 0.6, 0.08, 0.3), edgeMat);
    e1.position.set(0, DY + 0.03, -0.15); group.add(e1);
    var e2 = e1.clone(); e2.position.z = L + 0.15; group.add(e2);
    var e3 = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.08, L), edgeMat);
    e3.position.set(-W / 2 - 0.15, DY + 0.03, L / 2); group.add(e3);
    var e4 = e3.clone(); e4.position.x = W / 2 + 0.15; group.add(e4);

    // ---------- blocos de saída ----------
    var blockMat = new THREE.MeshLambertMaterial({ color: 0xe8ecef });
    var blockTop = new THREE.MeshLambertMaterial({ color: 0x2a6fdb });
    for (i = 0; i < SG.LANES; i++) {
      var bx = SG.laneX(i);
      var base = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.62, 0.55), blockMat);
      base.position.set(bx, DY + 0.31, -0.42);
      group.add(base);
      var top = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.06, 0.66), blockTop);
      top.position.set(bx, DY + 0.66, -0.38);
      top.rotation.x = 0.1;
      group.add(top);
      var numTex = canvasTex(64, 64, (function (n) {
        return function (c, w, h) {
          c.fillStyle = '#111'; c.fillRect(0, 0, w, h);
          c.fillStyle = '#fff'; c.font = 'bold 48px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
          c.fillText(String(n), w / 2, h / 2 + 2);
        };
      })(i + 1));
      var num = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.34), new THREE.MeshBasicMaterial({ map: numTex }));
      num.position.set(bx, DY + 0.36, -0.14);
      group.add(num);
      // número também na parede oposta
      var num2 = num.clone();
      num2.position.set(bx, DY + 0.2, L + 0.32);
      num2.rotation.y = Math.PI;
      num2.rotation.x = 0;
      group.add(num2);
    }

    // ---------- cordas de raia ----------
    var floatGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.095, low ? 6 : 10);
    floatGeo.rotateX(Math.PI / 2);
    var spacing = 0.105;
    var perRope = Math.floor(L / spacing);
    var ropes = SG.LANES - 1;
    var ropeMesh = new THREE.InstancedMesh(floatGeo, new THREE.MeshLambertMaterial({ color: 0xffffff }), perRope * ropes);
    var mtx = new THREE.Matrix4();
    var col = new THREE.Color();
    var ropeCols = [0x16a34a, 0x2563eb, 0x2563eb, 0xfacc15, 0x2563eb, 0x2563eb, 0x16a34a];
    var idx = 0;
    for (var r = 0; r < ropes; r++) {
      var rx = -W / 2 + SG.LANE_W * (r + 1);
      for (var k = 0; k < perRope; k++) {
        var z = spacing * (k + 0.5);
        mtx.makeTranslation(rx, 0.015, z);
        ropeMesh.setMatrixAt(idx, mtx);
        var fromWall = Math.min(z, L - z);
        if (fromWall < 5) col.setHex(0xdc2626);
        else if (Math.abs(fromWall - 15) < 0.25) col.setHex(0xff4fa3);
        else if (Math.floor(z) % 2 === 0) col.setHex(ropeCols[r]);
        else col.setHex(0xf5f5f5);
        ropeMesh.setColorAt(idx, col);
        idx++;
      }
    }
    ropeMesh.instanceMatrix.needsUpdate = true;
    if (ropeMesh.instanceColor) ropeMesh.instanceColor.needsUpdate = true;
    group.add(ropeMesh);

    // ---------- bandeirolas de costas (5 m) ----------
    var flagGeo = new THREE.BufferGeometry();
    flagGeo.setAttribute('position', new THREE.Float32BufferAttribute([-0.13, 0, 0, 0.13, 0, 0, 0, -0.3, 0], 3));
    flagGeo.computeVertexNormals();
    var flagsPer = Math.floor((W + 1.2) / 0.32);
    var flagMesh = new THREE.InstancedMesh(flagGeo, new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide }), flagsPer * 2);
    var fc = [0xdc2626, 0xffffff, 0x1d4ed8, 0xfacc15];
    idx = 0;
    var lineMat = new THREE.MeshBasicMaterial({ color: 0x333333 });
    var postMat = new THREE.MeshLambertMaterial({ color: 0xbfc5ca });
    [5, L - 5].forEach(function (fz) {
      var line = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, W + 1.4, 4), lineMat);
      line.rotation.z = Math.PI / 2;
      line.position.set(0, 1.8, fz);
      group.add(line);
      [-1, 1].forEach(function (s) {
        var post = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.8 - DY + 0.1, 6), postMat);
        post.position.set(s * (W / 2 + 0.7), DY + (1.8 - DY) / 2, fz);
        group.add(post);
      });
      for (var f = 0; f < flagsPer; f++) {
        mtx.makeTranslation(-W / 2 - 0.6 + f * 0.32 + 0.16, 1.8, fz);
        flagMesh.setMatrixAt(idx, mtx);
        flagMesh.setColorAt(idx, col.setHex(fc[f % 4]));
        idx++;
      }
    });
    flagMesh.instanceMatrix.needsUpdate = true;
    if (flagMesh.instanceColor) flagMesh.instanceColor.needsUpdate = true;
    group.add(flagMesh);

    // ---------- ginásio ----------
    var hallH = 15;
    // a base da caixa fica abaixo do fundo da piscina (senão cobriria a água)
    var hall = new THREE.Mesh(new THREE.BoxGeometry(hallX * 2, hallH + D + 1, z1 - z0),
      new THREE.MeshLambertMaterial({ color: 0xc9d6df, side: THREE.BackSide }));
    hall.position.set(0, DY + hallH / 2 - (D + 1) / 2, (z0 + z1) / 2);
    group.add(hall);

    // janelões na lateral esquerda
    var winMat = new THREE.MeshBasicMaterial({ color: 0xbfe6ff });
    var frameMat = new THREE.MeshLambertMaterial({ color: 0x5b6670 });
    for (var wz = z0 + 4; wz < z1 - 3; wz += 6) {
      var win = new THREE.Mesh(new THREE.PlaneGeometry(5, 7), winMat);
      win.position.set(-hallX + 0.05, 6.5, wz);
      win.rotation.y = Math.PI / 2;
      group.add(win);
      var bar = new THREE.Mesh(new THREE.BoxGeometry(0.2, 7.4, 0.3), frameMat);
      bar.position.set(-hallX + 0.1, 6.5, wz + 2.8);
      group.add(bar);
    }

    // luminárias no teto
    var lightCount = 0;
    var lampGeo = new THREE.BoxGeometry(2.2, 0.12, 0.6);
    var lampMesh = new THREE.InstancedMesh(lampGeo, new THREE.MeshBasicMaterial({ color: 0xfffbea }), 200);
    for (var lx = -20; lx <= 20; lx += 8) {
      for (var lz = z0 + 4; lz < z1 - 2; lz += 7) {
        if (lightCount >= 200) break;
        mtx.makeTranslation(lx, DY + hallH - 0.3, lz);
        lampMesh.setMatrixAt(lightCount++, mtx);
      }
    }
    lampMesh.count = lightCount;
    group.add(lampMesh);
    // vigas
    var beamMat = new THREE.MeshLambertMaterial({ color: 0x8a96a0 });
    for (var bz = z0 + 7.5; bz < z1; bz += 7) {
      var beam = new THREE.Mesh(new THREE.BoxGeometry(hallX * 2, 0.5, 0.35), beamMat);
      beam.position.set(0, DY + hallH - 0.6, bz);
      group.add(beam);
    }

    // bandeiras penduradas
    var codes = ['BRA', 'JPN', 'USA', 'ITA', 'GER', 'AUS', 'FRA', 'CZE', 'NGR', 'ESP', 'SWE', 'KOR'];
    var nFlags = Math.min(codes.length, Math.floor(L / 4.5));
    for (i = 0; i < nFlags; i++) {
      var ftex = canvasTex(96, 64, (function (cd) { return function (c, w, h) { SG.drawFlag(c, cd, 0, 0, w, h); }; })(codes[i]));
      var fl = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 1.6), new THREE.MeshBasicMaterial({ map: ftex, side: THREE.DoubleSide }));
      fl.position.set(-8 + (i % 2) * 16, DY + hallH - 2.5, 2 + (L - 4) * (i / Math.max(1, nFlags - 1)));
      fl.rotation.y = Math.PI / 2;
      group.add(fl);
    }

    // ---------- arquibancada + torcida ----------
    var rows = low ? 6 : 10;
    var standMat = new THREE.MeshLambertMaterial({ color: 0x334155 });
    var seatMat = new THREE.MeshLambertMaterial({ color: 0x1d4ed8 });
    var sx0 = W / 2 + 4.5;
    var standLen = z1 - z0 - 6;
    for (r = 0; r < rows; r++) {
      var step = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.5 * (r + 1), standLen), standMat);
      step.position.set(sx0 + r * 1.0 + 0.5, DY + 0.25 * (r + 1), (z0 + z1) / 2);
      group.add(step);
      var seat = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.12, standLen), seatMat);
      seat.position.set(sx0 + r * 1.0 + 0.7, DY + 0.5 * (r + 1) + 0.06, (z0 + z1) / 2);
      group.add(seat);
    }
    var perRow = Math.floor(standLen / (low ? 1.1 : 0.7));
    var crowdN = rows * perRow;
    var personGeo = new THREE.BoxGeometry(0.42, 0.75, 0.42);
    personGeo.translate(0, 0.375, 0);
    var crowd = new THREE.InstancedMesh(personGeo, new THREE.MeshLambertMaterial({ color: 0xffffff }), crowdN);
    var crowdData = [];
    var shirt = [0xef4444, 0xf59e0b, 0x10b981, 0x3b82f6, 0x8b5cf6, 0xec4899, 0xffffff, 0x111827, 0xfacc15, 0x22c55e];
    idx = 0;
    for (r = 0; r < rows; r++) {
      for (k = 0; k < perRow; k++) {
        if (Math.random() < 0.18) continue;
        var px = sx0 + r * 1.0 + 0.55;
        var pz = z0 + 3 + (k + 0.5) * (standLen / perRow) + (Math.random() - 0.5) * 0.15;
        var py = DY + 0.5 * (r + 1);
        crowdData.push({ x: px, y: py, z: pz, ph: Math.random() * 6.28, sp: 6 + Math.random() * 6, amp: 0.5 + Math.random() * 0.5 });
        mtx.makeTranslation(px, py, pz);
        crowd.setMatrixAt(idx, mtx);
        crowd.setColorAt(idx, col.setHex(shirt[Math.floor(Math.random() * shirt.length)]));
        idx++;
      }
    }
    crowd.count = idx;
    crowd.instanceMatrix.needsUpdate = true;
    if (crowd.instanceColor) crowd.instanceColor.needsUpdate = true;
    group.add(crowd);
    // cabeças
    var headGeo = new THREE.SphereGeometry(0.15, 8, 6);
    var heads = new THREE.InstancedMesh(headGeo, new THREE.MeshLambertMaterial({ color: 0xffffff }), idx);
    var skinTones = [0xf1c27d, 0xe0ac69, 0xc68642, 0x8d5524, 0xffdbac];
    for (i = 0; i < idx; i++) {
      var cd = crowdData[i];
      mtx.makeTranslation(cd.x, cd.y + 0.9, cd.z);
      heads.setMatrixAt(i, mtx);
      heads.setColorAt(i, col.setHex(skinTones[i % skinTones.length]));
    }
    heads.instanceMatrix.needsUpdate = true;
    if (heads.instanceColor) heads.instanceColor.needsUpdate = true;
    group.add(heads);

    // faixa publicitária ao longo da piscina
    var bannerTex = canvasTex(1024, 64, function (c, w, h) {
      var g = c.createLinearGradient(0, 0, w, 0);
      g.addColorStop(0, '#0b3d91'); g.addColorStop(1, '#0891b2');
      c.fillStyle = g; c.fillRect(0, 0, w, h);
      c.fillStyle = '#fff'; c.font = 'bold 40px sans-serif'; c.textBaseline = 'middle';
      for (var x = 20; x < w; x += 340) c.fillText('AQUA SPRINT 3D', x, h / 2 + 2);
    });
    bannerTex.wrapS = THREE.RepeatWrapping;
    bannerTex.repeat.set(Math.max(1, Math.round(standLen / 18)), 1);
    var banner = new THREE.Mesh(new THREE.PlaneGeometry(standLen, 0.7), new THREE.MeshBasicMaterial({ map: bannerTex }));
    banner.position.set(sx0 - 0.02, DY + 0.35, (z0 + z1) / 2);
    banner.rotation.y = -Math.PI / 2;
    group.add(banner);

    // ---------- placares ----------
    var sbCanvas = document.createElement('canvas');
    sbCanvas.width = 1024; sbCanvas.height = 576;
    var sbTex = new THREE.CanvasTexture(sbCanvas);
    sbTex.anisotropy = 4;
    var sbMat = new THREE.MeshBasicMaterial({ map: sbTex });
    var sbFrameMat = new THREE.MeshLambertMaterial({ color: 0x1f2937 });
    [[z1 - 0.3, Math.PI], [z0 + 0.3, 0]].forEach(function (cfg) {
      var frame = new THREE.Mesh(new THREE.BoxGeometry(13.2, 7.6, 0.3), sbFrameMat);
      frame.position.set(0, 7.5, cfg[0]);
      group.add(frame);
      var sb = new THREE.Mesh(new THREE.PlaneGeometry(12.5, 7.03), sbMat);
      sb.position.set(0, 7.5, cfg[0] + (cfg[1] === 0 ? 0.17 : -0.17));
      sb.rotation.y = cfg[1];
      group.add(sb);
    });

    // ---------- luzes ----------
    group.add(new THREE.HemisphereLight(0xeaf4ff, 0x40606e, 0.95));
    var dl = new THREE.DirectionalLight(0xffffff, 0.55);
    dl.position.set(5, 20, 10);
    group.add(dl);
    group.add(new THREE.AmbientLight(0xffffff, 0.18));

    var tmpM = new THREE.Matrix4();
    var crowdT = 0;
    return {
      group: group,
      length: L,
      tileMat: tileMat,
      scoreboardCanvas: sbCanvas,
      scoreboardTex: sbTex,
      update: function (t, dt, excitement) {
        tileUniforms.uTime.value = t;
        crowdT += dt;
        if (crowdT < 1 / 30) return;
        crowdT = 0;
        var ex = excitement || 0;
        for (var i = 0; i < crowdData.length; i++) {
          var cd = crowdData[i];
          var j = Math.max(0, Math.sin(t * cd.sp + cd.ph)) * 0.25 * ex * cd.amp;
          tmpM.makeTranslation(cd.x, cd.y + j, cd.z);
          crowd.setMatrixAt(i, tmpM);
          tmpM.makeTranslation(cd.x, cd.y + 0.9 + j, cd.z);
          heads.setMatrixAt(i, tmpM);
        }
        crowd.instanceMatrix.needsUpdate = true;
        heads.instanceMatrix.needsUpdate = true;
      },
      dispose: function () {
        scene.remove(group);
        group.traverse(function (o) {
          if (o.geometry) o.geometry.dispose();
          if (o.material) {
            if (o.material.map) o.material.map.dispose();
            o.material.dispose();
          }
        });
      }
    };
  };

  SG.canvasTex = canvasTex;
})();
