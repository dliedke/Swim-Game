/* HUD em DOM: tempo, posição, barras, ritmo, virada, mini mapa e controles de toque */
(function () {
  var H = {};
  var $ = function (id) { return document.getElementById(id); };

  H.init = function () {
    H.el = {
      hud: $('hud'), event: $('h-event'), lap: $('h-lap'), stroke: $('h-stroke'),
      time: $('h-time'), split: $('h-split'), place: $('h-place'), standings: $('h-standings'),
      stam: $('bar-stam'), oxy: $('bar-oxy'), oxyWrap: $('oxy-wrap'), speed: $('h-speed'),
      rhythm: $('rhythm'), rhZone: $('rh-zone'), rhMarker: $('rh-marker'), rhLabel: $('rh-label'),
      keyhint: $('keyhint'), turn: $('turn-gauge'), turnPerfect: $('tg-perfect'), turnGood: $('tg-good'),
      turnMarker: $('tg-marker'), turnLabel: $('tg-label'), minimap: $('minimap'), msg: $('msg'),
      uw: $('uw-overlay'), vignette: $('vignette'), touch: $('touch'),
      tL: $('t-left'), tR: $('t-right'), tA: $('t-action'), lanes: $('lane-intro')
    };
    H.msgTimer = null;
    H.dots = [];
    var mm = H.el.minimap;
    mm.innerHTML = '';
    for (var i = 0; i < SG.LANES; i++) {
      var row = document.createElement('div');
      row.className = 'mm-lane';
      var dot = document.createElement('div');
      dot.className = 'mm-dot';
      row.appendChild(dot);
      mm.appendChild(row);
      H.dots.push(dot);
    }
    H.lastRating = null;
  };

  H.show = function (v) {
    H.el.hud.classList.toggle('hidden', !v);
    H.el.touch.classList.toggle('hidden', !(v && SG.isTouch));
  };

  H.message = function (text, cls, dur) {
    var m = H.el.msg;
    m.className = 'msg ' + (cls || '');
    m.textContent = text;
    void m.offsetWidth;
    m.classList.add('show');
    clearTimeout(H.msgTimer);
    H.msgTimer = setTimeout(function () { m.classList.remove('show'); }, dur || (cls === 'big' ? 2600 : 1400));
  };

  var RATING = {
    perfect: [SG.t('rate.perfect'), 'r-perfect'], ok: ['', ''], fast: [SG.t('rate.fast'), 'r-fast'],
    slow: [SG.t('rate.slow'), 'r-slow'], same: [SG.t('rate.same'), 'r-bad']
  };
  H.rating = function (r, combo) {
    var e = H.el.rhLabel;
    var d = RATING[r] || ['', ''];
    e.textContent = d[0] + (r === 'perfect' && combo >= 3 ? SG.t('rate.streak', Math.min(combo, SG.PLAY.comboMax)) : '');
    e.className = 'rh-label ' + d[1];
    void e.offsetWidth;
    e.classList.add('pop');
  };

  H.laneIntro = function (html) {
    var e = H.el.lanes;
    if (!html) { e.classList.remove('show'); return; }
    e.innerHTML = html;
    e.classList.add('show');
  };

  function setBtn(btn, act, label, show) {
    if (btn.getAttribute('data-act') !== act) btn.setAttribute('data-act', act);
    if (btn._label !== label) { btn.innerHTML = label; btn._label = label; }
    var hid = !show;
    if (btn._hid !== hid) { btn.classList.toggle('off', hid); btn._hid = hid; }
  }

  H.update = function (race, dt, camMode) {
    var p = race.player;
    var e = H.el;
    var d = SG.STROKES[p.stroke];
    var lapN = Math.min(race.laps, p.length + 1);
    e.event.textContent = race.totalDist + 'm ' + (race.event === 'medley' ? 'MEDLEY' : d.label);
    e.lap.textContent = SG.t('hud.lap', lapN, race.laps, Math.floor(p.distance));
    e.stroke.textContent = d.name + (race.event === 'medley' ? ' (medley)' : '');
    var clk = race.started ? (p.finished ? p.finishTime : race.clock) : 0;
    e.time.textContent = SG.fmtTime(Math.max(0, clk));
    e.place.textContent = race.started ? SG.ordinal(p.place) : '-';
    e.place.className = 'place p' + p.place;

    // classificação resumida
    if (!H._stT || (H._stT -= dt) <= 0) {
      H._stT = 0.2;
      var lead = race.ranking[0];
      var html = '';
      var shown = 0;
      for (var i = 0; i < race.ranking.length; i++) {
        var s = race.ranking[i];
        if (shown >= 4 && !s.isPlayer) continue;
        if (shown >= 4 && s.isPlayer && i > 4) html += '<li class="gap">…</li>';
        var gap = '';
        if (s.finished) gap = SG.fmtTime(s.finishTime);
        else if (i > 0) gap = '-' + (lead.distance - s.distance).toFixed(1) + 'm';
        html += '<li class="' + (s.isPlayer ? 'me' : '') + '"><b>' + (i + 1) + '</b> <span class="cc">' + s.country + '</span> ' +
          s.name + ' <i>' + gap + '</i></li>';
        shown++;
        if (shown >= 5) break;
      }
      e.standings.innerHTML = html;
      for (i = 0; i < race.swimmers.length; i++) {
        var sw = race.swimmers[i];
        var dot = H.dots[sw.lane];
        var pos = sw.s / race.L;
        dot.style.left = (SG.clamp(pos, 0, 1) * 100) + '%';
        dot.className = 'mm-dot' + (sw.isPlayer ? ' me' : '') + (sw.dir < 0 ? ' back' : '') + (sw.finished ? ' fin' : '');
      }
    }

    // barras
    e.stam.style.width = (p.stamina * 100).toFixed(1) + '%';
    e.stam.classList.toggle('low', p.stamina < 0.3);
    e.oxy.style.width = (p.oxygen * 100).toFixed(1) + '%';
    e.oxy.classList.toggle('low', p.oxygen < 0.25);
    e.speed.textContent = p.v.toFixed(2) + ' m/s';

    // ritmo
    var showRh = p.state === 'swim';
    e.rhythm.classList.toggle('hidden', !(showRh || p.state === 'underwater'));
    var hint = '';
    var touchHint = SG.isTouch;
    if (p.state === 'swim') {
      var maxT, zone, since;
      if (d.type === 'breast') {
        if (p.breastStage === 'pulled') { zone = d.pullKick; since = p.now - p.lastPullT; maxT = 0.9; hint = SG.t(touchHint ? 'hint.kickTouch' : 'hint.kickKey'); }
        else { zone = d.kickPull; since = p.now - p.lastKickT; maxT = 1.3; hint = SG.t(touchHint ? 'hint.pullTouch' : 'hint.pullKey'); }
      } else {
        zone = d.ideal; since = p.now - p.lastStrokeT; maxT = d.ideal[1] * 1.7;
        if (d.type === 'alt') {
          var next = p.lastArm === 'left' ? 'right' : 'left';
          hint = touchHint ? '' : (next === 'left' ? '<kbd class="hot">←</kbd> <kbd>→</kbd>' : '<kbd>←</kbd> <kbd class="hot">→</kbd>');
        } else hint = SG.t(touchHint ? 'hint.flyTouch' : 'hint.flyKey');
      }
      if (p.firstStroke) since = zone[0] + 0.01;
      e.rhZone.style.left = (zone[0] / maxT * 100) + '%';
      e.rhZone.style.width = ((zone[1] - zone[0]) / maxT * 100) + '%';
      e.rhMarker.style.left = (SG.clamp(since / maxT, 0, 1) * 100) + '%';
      var inZ = since >= zone[0] && since <= zone[1];
      e.rhMarker.classList.toggle('in', inZ);
      if (d.breath && p.oxygen < 0.35) hint += SG.t(touchHint ? 'hint.breatheTouch' : 'hint.breatheKey');
    } else if (p.state === 'underwater') {
      e.rhZone.style.width = '0';
      e.rhMarker.style.left = '0';
      hint = SG.t(touchHint ? 'hint.uwTouch' : 'hint.uwKey');
    }
    if (e.keyhint._h !== hint) { e.keyhint.innerHTML = hint; e.keyhint._h = hint; }

    // medidor de virada
    var tz = p.state === 'swim' && !p.isLastLength() && p.wallDist() < d.turnZone + 1.5;
    e.turn.classList.toggle('hidden', !tz);
    if (tz) {
      var Z = d.turnZone + 1.5;
      var toPct = function (x) { return (1 - x / Z) * 100; };
      e.turnGood.style.top = toPct(Math.min(Z, d.turnGood[1])) + '%';
      e.turnGood.style.height = (toPct(d.turnGood[0]) - toPct(d.turnGood[1])) + '%';
      e.turnPerfect.style.top = toPct(d.turnPerfect[1]) + '%';
      e.turnPerfect.style.height = (toPct(d.turnPerfect[0]) - toPct(d.turnPerfect[1])) + '%';
      var dw = p.wallDist();
      e.turnMarker.style.top = SG.clamp(toPct(dw), 0, 100) + '%';
      var inGood = dw <= d.turnGood[1];
      e.turnLabel.innerHTML = SG.t(d.flip && race.strokeAt(p.length + 1) === p.stroke ? 'turn.flip' : 'turn.touch') +
        '<br>' + (inGood ? '<b>' + SG.t(SG.isTouch ? 'turn.nowTouch' : 'turn.nowKey') + '</b>' : dw.toFixed(1) + 'm');
      e.turn.classList.toggle('go', dw >= d.turnPerfect[0] && dw <= d.turnPerfect[1]);
    }

    // sobreposições
    e.vignette.style.opacity = SG.clamp((0.3 - p.oxygen) / 0.3, 0, 1) * 0.85 + (p.stamina < 0.2 ? 0.2 : 0);

    // botões de toque contextuais
    if (SG.isTouch) {
      var st = p.state;
      if (st === 'block' || st === 'wallstart') {
        setBtn(e.tL, 'left', '', false); setBtn(e.tR, 'right', '', false);
        setBtn(e.tA, 'action', SG.t(race.phase === 'intro' ? 'touch.skip' : 'touch.dive'), true);
      } else if (st === 'underwater') {
        var up = '<small>' + SG.t('touch.up') + '</small>';
        if (d.type === 'breast') { setBtn(e.tL, 'down', '▼<small>' + SG.t('touch.dolphin') + '</small>', true); setBtn(e.tR, 'up', '▲' + up, true); }
        else { setBtn(e.tL, 'left', '◀' + up, true); setBtn(e.tR, 'right', '▶' + up, true); }
        setBtn(e.tA, 'down', SG.t('touch.dolphinBig'), true);
      } else if (st === 'swim') {
        if (d.type === 'breast') { setBtn(e.tL, 'down', '▼<small>' + SG.t('touch.kick') + '</small>', true); setBtn(e.tR, 'up', '▲<small>' + SG.t('touch.pull') + '</small>', true); }
        else if (d.type === 'fly') { var tg = '<small>' + SG.t('touch.together') + '</small>'; setBtn(e.tL, 'left', '◀' + tg, true); setBtn(e.tR, 'right', tg + '▶', true); }
        else {
          var nx = p.lastArm === 'left' ? 'right' : 'left';
          setBtn(e.tL, 'left', '◀<small>' + SG.t('touch.left') + '</small>', true); setBtn(e.tR, 'right', '<small>' + SG.t('touch.right') + '</small>▶', true);
          e.tL.classList.toggle('hot', nx === 'left'); e.tR.classList.toggle('hot', nx === 'right');
        }
        if (p.inTurnZone()) setBtn(e.tA, 'action', SG.t('touch.turn'), true);
        else setBtn(e.tA, 'action', SG.t('touch.breathe'), d.breath);
        e.tA.classList.toggle('turn', p.inTurnZone());
      } else {
        setBtn(e.tL, 'left', '', false); setBtn(e.tR, 'right', '', false); setBtn(e.tA, 'action', '', false);
      }
      if (d.type !== 'alt') { e.tL.classList.remove('hot'); e.tR.classList.remove('hot'); }
    }
  };

  H.setUnderwater = function (uw) {
    H.el.uw.classList.toggle('on', uw);
  };

  SG.HUD = H;
})();
