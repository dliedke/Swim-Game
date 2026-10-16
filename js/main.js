/* Inicialização, menus, loop principal e câmeras */
(function () {
  var $ = function (id) { return document.getElementById(id); };
  var G = {
    renderer: null, scene: null, camera: null, pool: null, water: null, particles: null,
    race: null, camMode: 'fp', paused: false, screen: 'menu', time: 0, sbT: 0,
    opts: { event: 'free', distance: 50, pool: 25, difficulty: 'medium', quality: SG.isMobile ? 'low' : 'high', name: 'Você' }
  };
  SG.G = G;

  var STORE = 'aquasprint3d.';
  function load(key, def) { try { var v = localStorage.getItem(STORE + key); return v ? JSON.parse(v) : def; } catch (e) { return def; } }
  function save(key, v) { try { localStorage.setItem(STORE + key, JSON.stringify(v)); } catch (e) { /* sem storage */ } }

  var FOG_AIR = new THREE.Color(0xcfe0ea), FOG_UW = new THREE.Color(0x167a96);
  var tmpV = new THREE.Vector3(), tmpV2 = new THREE.Vector3();
  var camTarget = new THREE.Vector3(), camLook = new THREE.Vector3();

  // ---------------- renderer ----------------
  function initRenderer() {
    var canvas = $('game');
    var q = G.opts.quality;
    if (G.renderer) G.renderer.dispose();
    G.renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: q !== 'low', powerPreference: 'high-performance' });
    var maxPR = q === 'low' ? 1 : (q === 'medium' ? 1.5 : 2);
    G.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, maxPR));
    G.renderer.setClearColor(FOG_AIR);
    G.camera = new THREE.PerspectiveCamera(75, 1, 0.04, 400);
    G.rendererQuality = q;
    resize();
  }

  function fovFor(aspect, mode) {
    var h = (mode === 'fp' ? 92 : 72) * Math.PI / 180;
    var v = 2 * Math.atan(Math.tan(h / 2) / aspect) * 180 / Math.PI;
    return SG.clamp(v, 52, 100);
  }

  function resize() {
    var w = window.innerWidth, h = window.innerHeight;
    if (!G.renderer) return;
    G.renderer.setSize(w, h, false);
    G.camera.aspect = w / h;
    G.camera.fov = fovFor(w / h, G.camMode);
    G.camera.updateProjectionMatrix();
    if (G.particles) G.particles.setViewport(h * G.renderer.getPixelRatio(), G.camera.fov);
    document.body.classList.toggle('portrait', h > w);
  }
  window.addEventListener('resize', resize);
  window.addEventListener('orientationchange', function () { setTimeout(resize, 200); });

  // ---------------- cena / prova ----------------
  function buildWorld() {
    if (G.race) { G.race.dispose(); G.race = null; }
    if (G.pool) { G.pool.dispose(); G.pool = null; }
    if (G.particles) { G.particles.dispose(G.scene); G.particles = null; }
    if (G.water) { G.scene.remove(G.water); G.water.geometry.dispose(); G.water.material.dispose(); }
    G.scene = new THREE.Scene();
    G.scene.fog = new THREE.FogExp2(FOG_AIR.getHex(), 0.006);
    G.scene.background = FOG_AIR.clone();
    G.pool = SG.buildPool(G.scene, G.opts.pool, G.opts.quality);
    G.water = SG.createWater(G.opts.pool, SG.POOL_W, G.opts.quality);
    G.scene.add(G.water);
    G.particles = new SG.Particles(G.scene, G.opts.quality === 'low' ? 1200 : 2600);
    if (G.rays) G.rays.dispose();
    G.rays = SG.createLightRays(G.scene, G.opts.quality === 'low' ? 10 : 22);
    G.scene.add(G.camera);
    resize();
  }

  function startRace() {
    if (G.rendererQuality !== G.opts.quality) initRenderer();
    buildWorld();
    var race = new SG.Race(G.opts, G.scene, G.particles);
    G.race = race;
    race.onMsg = function (t, c) { SG.HUD.message(t, c); };
    race.onRating = function (r) { SG.HUD.rating(r); };
    race.onReaction = function (r) {
      if (r != null && r >= 0) SG.HUD.message('Reação: ' + r.toFixed(2) + 's', r < 0.65 ? 'great' : 'ok');
    };
    race.onTurn = function () { };
    race.onMarks = function () { SG.HUD.laneIntro(null); };
    race.onPlayerLength = function (p) {
      var sp = p.splits[p.splits.length - 1];
      $('h-split').textContent = (p.length * race.L) + 'm · ' + SG.fmtTime(sp);
      $('h-split').classList.add('show');
      setTimeout(function () { $('h-split').classList.remove('show'); }, 2500);
      if (race.event === 'medley' && race.strokeAt(p.length) !== race.strokeAt(p.length - 1)) {
        setTimeout(function () { SG.HUD.message('Agora: ' + SG.STROKES[p.stroke].name.toUpperCase(), 'big'); }, 500);
      }
    };
    race.onPlayerFinish = function (p) {
      SG.Audio.horn();
      SG.Audio.cheer();
      var place = race.finishOrder.indexOf(p) + 1;
      SG.HUD.message(SG.ordinal(place) + ' lugar · ' + SG.fmtTime(p.finishTime), place === 1 ? 'great' : 'big', 3500);
    };
    race.onResults = showResults;
    race.onDQ = function () { setTimeout(function () { showResults(race.results()); }, 1800); };
    race.fpView = G.camMode === 'fp';
    applyCamMode();
    G.introT = 0;
    G.introLane = -1;
    G.camInit = false;
    showScreen(null);
    SG.HUD.show(true);
    $('h-split').textContent = '';
    G.paused = false;
    SG.Audio.setExcitement(0.3);
    var d = SG.STROKES[race.strokeAt(0)];
    SG.HUD.message(race.totalDist + 'm ' + (race.event === 'medley' ? 'MEDLEY' : d.name.toUpperCase()), 'big', 2500);
  }

  // ---------------- câmeras ----------------
  var CAM_NAMES = { fp: 'Visão do nadador', tv: 'Câmera de TV', chase: 'Câmera atrás' };
  function applyCamMode() {
    var r = G.race;
    if (!r) return;
    r.fpView = G.camMode === 'fp';
    resize();
  }
  function cycleCam() {
    var order = ['fp', 'tv', 'chase'];
    G.camMode = order[(order.indexOf(G.camMode) + 1) % order.length];
    applyCamMode();
    SG.HUD.message(CAM_NAMES[G.camMode], 'ok');
  }

  function updateCamera(dt) {
    var r = G.race, cam = G.camera, p = r.player;
    var L = r.L;
    if (r.phase === 'intro') {
      G.introT += dt;
      var t = SG.clamp(G.introT / 6, 0, 1);
      var x = SG.lerp(-SG.POOL_W / 2 + 0.5, SG.POOL_W / 2 - 0.5, SG.smooth(t));
      var supine = SG.STROKES[r.strokeAt(0)].supine;
      cam.position.set(x, supine ? 0.9 : 1.7, 3.2);
      cam.lookAt(x, supine ? 0.1 : 1.4, -0.3);
      var lane = SG.clamp(Math.floor((x + SG.POOL_W / 2) / SG.LANE_W), 0, 7);
      if (lane !== G.introLane) {
        G.introLane = lane;
        var s = r.swimmers.filter(function (q) { return q.lane === lane; })[0];
        SG.HUD.laneIntro('<span class="ln">RAIA ' + (lane + 1) + '</span> <span class="cc">' + s.country + '</span> ' + s.name + (s.isPlayer ? ' <em>(você)</em>' : ''));
      }
      if (t >= 1) { SG.HUD.laneIntro(null); r.beginMarks(); }
      return;
    }
    if (G.camMode === 'fp') {
      cam.position.copy(p.camPos);
      cam.quaternion.copy(p.camQuat);
    } else {
      var dir = p.dir;
      if (G.camMode === 'tv') {
        camTarget.set(-SG.POOL_W / 2 - 2.2, 2.6, SG.clamp(p.s - dir * 1.5, -3, L + 3));
        camLook.set(p.x, 0, p.s + dir * 1.2);
      } else {
        camTarget.set(p.x, 1.5, p.s - dir * 3.4);
        camLook.set(p.x, -0.1, p.s + dir * 2.5);
        if (p.state === 'block') camTarget.set(p.x, 3.2, -3.5);
      }
      var k = 1 - Math.exp(-dt * 4);
      if (!G.camInit) { cam.position.copy(camTarget); G.camInit = true; G.lookSm = camLook.clone(); }
      cam.position.lerp(camTarget, k);
      G.lookSm.lerp(camLook, k);
      cam.lookAt(G.lookSm);
    }
  }

  // ---------------- loop ----------------
  var last = performance.now();
  function frame(now) {
    requestAnimationFrame(frame);
    var dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (!G.renderer || !G.scene) return;
    step(dt);
    G.renderer.render(G.scene, G.camera);
  }

  // avança a simulação sem desenhar (usado também em testes automatizados)
  G.advance = function (seconds, h) {
    h = h || 1 / 60;
    for (var t = 0; t < seconds; t += h) step(h);
  };

  function step(dt) {
    if (G.race && !G.paused) {
      G.time += dt;
      var r = G.race;
      r.update(dt, G.camera.position);
      updateCamera(dt);
      var p = r.player;
      var fullBody = G.camMode !== 'fp' || r.phase === 'intro';
      if (fullBody !== p.model._full) { p.model.showBody(fullBody); p.model._full = fullBody; }
      p.model.root.visible = fullBody || p.showArms;
      // água
      G.water.material.uniforms.uTime.value = G.time;
      G.water.userData.setRipples(r.ripples);
      G.pool.update(G.time, dt, SG.Audio.excitement);
      G.particles.update(dt);
      // submerso?
      var cp = G.camera.position;
      var inPool = cp.x > -SG.POOL_W / 2 && cp.x < SG.POOL_W / 2 && cp.z > 0 && cp.z < r.L;
      var uw = inPool && cp.y < SG.waveHeight(cp.x, cp.z, G.time, r.ripples) - 0.005;
      if (uw !== G.uw) {
        G.uw = uw;
        G.scene.fog.color.copy(uw ? FOG_UW : FOG_AIR);
        G.scene.fog.density = uw ? 0.13 : 0.006;
        G.scene.background.copy(uw ? FOG_UW : FOG_AIR);
        SG.HUD.setUnderwater(uw);
        SG.Audio.setUnderwater(uw);
      }
      G.rays.update(cp, G.time, uw);
      if (uw && Math.random() < dt * 12) {
        G.particles.bubbles(cp.x + (Math.random() - 0.5) * 3, cp.y - Math.random() * 1.2, cp.z + (Math.random() - 0.5) * 3, 1, 0.2);
      }
      // empolgação da torcida
      var lead = r.ranking[0];
      var f = r.started ? lead.distance / r.totalDist : 0;
      var ex = r.phase === 'done' || r.phase === 'results' ? 1 : 0.25 + 0.75 * f * f;
      if (Math.abs(ex - SG.Audio.excitement) > 0.03) SG.Audio.setExcitement(ex);
      // placar
      G.sbT -= dt;
      if (G.sbT <= 0) { G.sbT = G.opts.quality === 'low' ? 0.2 : 0.1; r.drawScoreboard(G.pool.scoreboardCanvas, G.pool.scoreboardTex); }
      r.drawScoreboardClock(G.pool.clockCanvas, G.pool.clockTex);
      SG.HUD.update(r, dt, G.camMode);
    }
  }

  // ---------------- entrada ----------------
  function onAction(act) {
    if (act === 'blur') { if (G.race && G.screen === null && !G.paused && G.race.phase !== 'results') togglePause(true); return; }
    if (act === 'mute') { var m = SG.Audio.toggleMute(); $('btn-mute').textContent = m ? '🔇' : '🔊'; return; }
    if (G.screen === 'menu' && act === 'action') { $('btn-start').click(); return; }
    if (!G.race || G.screen === 'results' || G.screen === 'menu' || G.screen === 'howto') return;
    if (act === 'pause') { togglePause(); return; }
    if (G.paused) return;
    if (act === 'camera') { cycleCam(); return; }
    G.race.playerAction(act);
  }

  function togglePause(force) {
    if (!G.race || G.race.phase === 'results') return;
    G.paused = force === true ? true : !G.paused;
    showScreen(G.paused ? 'pause' : null);
    if (G.paused && window.speechSynthesis) window.speechSynthesis.cancel();
  }

  // ---------------- telas ----------------
  function showScreen(name) {
    G.screen = name;
    ['menu', 'howto', 'pause', 'results'].forEach(function (s) { $(s).classList.toggle('hidden', s !== name); });
    if (name === 'menu' || name === 'howto') SG.HUD.show(false);
  }

  function pbKey(o) { return o.event + '-' + o.distance + '-' + o.pool; }

  function showResults(res) {
    var r = G.race;
    var p = res.player;
    var me = res.list.filter(function (x) { return x.isPlayer; })[0];
    var pbs = load('pb', {});
    var key = pbKey(res.opts);
    var newPB = false;
    if (!p.dq && p.finished && (!pbs[key] || p.finishTime < pbs[key])) { newPB = true; pbs[key] = p.finishTime; save('pb', pbs); }
    var medal = me.place === 1 ? '🥇' : me.place === 2 ? '🥈' : me.place === 3 ? '🥉' : '🏊';
    var title = p.dq ? 'Desclassificado' : (me.place === 1 ? 'Campeão!' : me.place <= 3 ? 'No pódio!' : SG.ordinal(me.place) + ' lugar');
    var evName = res.opts.distance + 'm ' + (res.opts.event === 'medley' ? 'Medley' : SG.STROKES[res.opts.event].name) +
      ' · piscina ' + res.opts.pool + 'm · ' + SG.DIFFICULTY[res.opts.difficulty].name;
    var winner = res.list[0];
    var html = '<div class="medal">' + (p.dq ? '🚫' : medal) + '</div>' +
      '<h2>' + title + '</h2><p class="sub">' + evName + '</p>';
    if (!p.dq) {
      html += '<div class="stats">' +
        '<div><span>Tempo</span><b>' + SG.fmtTime(p.finishTime) + '</b></div>' +
        '<div><span>Reação</span><b>' + (p.reaction != null ? p.reaction.toFixed(2) + 's' : '-') + '</b></div>' +
        '<div><span>Recorde pessoal</span><b>' + SG.fmtTime(pbs[key]) + (newPB ? ' <em>NOVO!</em>' : '') + '</b></div>' +
        '</div>';
      if (p.splits.length > 1) {
        html += '<p class="splits">Parciais: ' + p.splits.map(function (t, i) {
          var prev = i ? p.splits[i - 1] : 0;
          return '<span>' + ((i + 1) * r.L) + 'm ' + SG.fmtTime(t - prev) + '</span>';
        }).join('') + '</p>';
      }
    }
    html += '<table><thead><tr><th>#</th><th>Raia</th><th>Nadador</th><th>País</th><th>Tempo</th><th>Dif.</th></tr></thead><tbody>';
    res.list.forEach(function (x) {
      var diff = x.dq ? '' : (x === winner ? '' : '+' + (x.time - winner.time).toFixed(2));
      html += '<tr class="' + (x.isPlayer ? 'me' : '') + '"><td>' + (x.dq ? 'DQ' : x.place) + '</td><td>' + (x.lane + 1) + '</td><td>' + x.name +
        '</td><td>' + x.country + '</td><td>' + (x.dq ? '—' : SG.fmtTime(x.time) + (x.projected ? '*' : '')) + '</td><td>' + diff + '</td></tr>';
    });
    html += '</tbody></table>';
    $('results-body').innerHTML = html;
    showScreen('results');
    SG.HUD.show(false);
  }

  // ---------------- menu ----------------
  function validDistances(o) {
    return SG.DISTANCES.filter(function (d) {
      var laps = d / o.pool;
      if (laps !== Math.floor(laps) || laps < 1) return false;
      if (o.event === 'medley') return laps % 4 === 0;
      return true;
    });
  }

  function refreshMenu() {
    var o = G.opts;
    var valid = validDistances(o);
    if (valid.indexOf(o.distance) < 0) o.distance = valid[0];
    function seg(id, val, validList) {
      Array.prototype.forEach.call($(id).querySelectorAll('button'), function (b) {
        var v = b.getAttribute('data-v');
        var nv = isNaN(+v) ? v : +v;
        b.classList.toggle('sel', nv === val);
        b.disabled = validList ? validList.indexOf(nv) < 0 : false;
      });
    }
    seg('opt-event', o.event);
    seg('opt-dist', o.distance, valid);
    seg('opt-pool', o.pool);
    seg('opt-diff', o.difficulty);
    seg('opt-gfx', o.quality);
    var pbs = load('pb', {});
    var pb = pbs[pbKey(o)];
    $('menu-pb').textContent = pb ? 'Seu recorde nesta prova: ' + SG.fmtTime(pb) : 'Sem recorde nesta prova ainda';
  }

  function bindSeg(id, prop) {
    Array.prototype.forEach.call($(id).querySelectorAll('button'), function (b) {
      b.addEventListener('click', function () {
        var v = b.getAttribute('data-v');
        G.opts[prop] = isNaN(+v) ? v : +v;
        save('opts', G.opts);
        refreshMenu();
      });
    });
  }

  function goFullscreen() {
    if (!SG.isMobile) return;
    var el = document.documentElement;
    try {
      var req = el.requestFullscreen || el.webkitRequestFullscreen;
      if (req && !document.fullscreenElement) {
        var pr = req.call(el);
        if (pr && pr.then) pr.then(function () {
          if (screen.orientation && screen.orientation.lock) screen.orientation.lock('landscape').catch(function () { });
        }).catch(function () { });
      }
    } catch (e) { /* ignore */ }
  }

  function init() {
    var saved = load('opts', null);
    if (saved) for (var k in saved) if (k in G.opts) G.opts[k] = saved[k];
    if (!SG.STROKES[G.opts.event] && G.opts.event !== 'medley') G.opts.event = 'free';
    SG.HUD.init();
    SG.Input.init(onAction);
    initRenderer();
    buildWorld();
    // cena de fundo do menu
    G.camera.position.set(-6, 3.2, -3);
    G.camera.lookAt(2, 0, 10);

    bindSeg('opt-event', 'event');
    bindSeg('opt-dist', 'distance');
    bindSeg('opt-pool', 'pool');
    bindSeg('opt-diff', 'difficulty');
    bindSeg('opt-gfx', 'quality');
    $('opt-name').value = G.opts.name;
    $('opt-name').addEventListener('input', function () { G.opts.name = this.value.trim().slice(0, 14) || 'Você'; save('opts', G.opts); });
    refreshMenu();

    $('btn-start').addEventListener('click', function () {
      SG.Audio.init();
      goFullscreen();
      startRace();
    });
    $('btn-howto').addEventListener('click', function () { showScreen('howto'); });
    $('btn-howto-close').addEventListener('click', function () { showScreen('menu'); });
    $('btn-resume').addEventListener('click', function () { togglePause(false); });
    $('btn-restart').addEventListener('click', function () { G.paused = false; startRace(); });
    $('btn-menu').addEventListener('click', backToMenu);
    $('btn-again').addEventListener('click', function () { startRace(); });
    $('btn-results-menu').addEventListener('click', backToMenu);
    $('btn-pause').addEventListener('click', function () { togglePause(); });
    $('btn-cam').addEventListener('click', function () { if (G.race && !G.paused) cycleCam(); });
    $('btn-mute').addEventListener('click', function () { onAction('mute'); });
    document.addEventListener('visibilitychange', function () { if (document.hidden) onAction('blur'); });
    // impede zoom por duplo toque no iOS
    document.addEventListener('dblclick', function (e) { e.preventDefault(); }, { passive: false });
    document.addEventListener('touchmove', function (e) { if (G.screen === null) e.preventDefault(); }, { passive: false });

    showScreen('menu');
    $('loading').classList.add('hidden');
    requestAnimationFrame(frame);
    // gira a câmera do menu lentamente
    G.menuSpin = true;
  }

  function backToMenu() {
    if (G.race) { G.race.dispose(); G.race = null; }
    G.paused = false;
    G.uw = false;
    G.scene.fog.color.copy(FOG_AIR); G.scene.fog.density = 0.006; G.scene.background.copy(FOG_AIR);
    SG.HUD.setUnderwater(false);
    SG.Audio.setUnderwater(false);
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    if (G.rendererQuality !== G.opts.quality) { initRenderer(); }
    buildWorld();
    G.camera.position.set(-6, 3.2, -3);
    G.camera.lookAt(2, 0, 10);
    refreshMenu();
    showScreen('menu');
  }

  // animação de fundo no menu (água + câmera)
  var menuT = 0;
  function menuTick(now) {
    requestAnimationFrame(menuTick);
    if (G.race || !G.water) return;
    menuT += 0.016;
    G.water.material.uniforms.uTime.value = menuT;
    G.pool.update(menuT, 0.016, 0.2);
    var L = G.opts.pool;
    G.camera.position.set(-8 + Math.sin(menuT * 0.1) * 4, 3.4, -3 + Math.cos(menuT * 0.08) * 2);
    G.camera.lookAt(0, 0, L * 0.45);
  }

  window.addEventListener('load', function () {
    if (!window.THREE) { $('loading').textContent = 'Erro ao carregar Three.js'; return; }
    try {
      init();
      requestAnimationFrame(menuTick);
    } catch (e) {
      $('loading').textContent = 'Erro: ' + e.message;
      $('loading').classList.remove('hidden');
      throw e;
    }
  });
})();
