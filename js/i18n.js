/* Idiomas: português ou inglês, escolhido pelo idioma do navegador (?lang=pt|en força um deles) */
window.SG = window.SG || {};

(function () {
  var STR = {
    pt: {
      'meta.description': 'Jogo de natação 3D em primeira pessoa: dispute provas contra outros nadadores com virada, saída e quatro estilos.',
      speechLang: 'pt-BR',
      you: 'Você',
      youTag: '(você)',

      // config
      'stroke.free': 'Crawl', 'stroke.back': 'Costas', 'stroke.breast': 'Peito', 'stroke.fly': 'Borboleta',
      'label.free': 'LIVRE', 'label.back': 'COSTAS', 'label.breast': 'PEITO', 'label.fly': 'BORBOLETA',
      'event.free': 'Livre (Crawl)', 'event.medley': 'Medley (4 estilos)',
      'diff.easy': 'Fácil', 'diff.medium': 'Médio', 'diff.hard': 'Difícil', 'diff.pro': 'Olímpico',

      // HUD
      'btn.mute': 'Som (M)', 'btn.cam': 'Câmera (C)', 'btn.pause': 'Pausar (Esc)',
      'hud.energy': 'Energia', 'hud.air': 'Ar', 'hud.wall': 'PAREDE',
      'hud.lap': 'Piscina {0}/{1} · {2}m',
      'rate.perfect': 'PERFEITO', 'rate.fast': 'SPRINT (cansa!)', 'rate.slow': 'LENTO', 'rate.same': 'ERROU!',
      'rate.streak': ' · EMBALO x{0}',
      'hint.kickTouch': '<b>PERNADA</b>', 'hint.kickKey': '<kbd>↓</kbd> pernada',
      'hint.pullTouch': '<b>BRAÇADA</b>', 'hint.pullKey': '<kbd>↑</kbd> braçada',
      'hint.flyTouch': 'Toque os dois juntos', 'hint.flyKey': '<kbd>↑</kbd> ou <kbd>←</kbd>+<kbd>→</kbd>',
      'hint.breatheTouch': ' · <b class="warn">RESPIRE</b>', 'hint.breatheKey': ' · <kbd class="warn">ESPAÇO</kbd> respirar',
      'hint.uwTouch': 'Golfinhada · nade para subir', 'hint.uwKey': '<kbd>↓</kbd> golfinhada · nade para subir',
      'turn.flip': 'CAMBALHOTA', 'turn.touch': 'TOQUE + VIRADA', 'turn.nowTouch': 'AGORA!', 'turn.nowKey': 'ESPAÇO!',
      'touch.skip': 'PULAR INTRO', 'touch.dive': 'SALTAR!', 'touch.dolphin': 'golfinhada', 'touch.dolphinBig': 'GOLFINHADA',
      'touch.up': 'subir', 'touch.kick': 'pernada', 'touch.pull': 'braçada', 'touch.together': 'juntos',
      'touch.left': 'esquerdo', 'touch.right': 'direito', 'touch.turn': 'VIRADA!', 'touch.breathe': 'RESPIRAR',

      // mensagens da prova
      'msg.reaction': 'Reação: {0}s', 'msg.now': 'Agora: {0}', 'msg.place': '{0} lugar · {1}',
      'msg.marks': 'Às suas marcas...', 'speak.marks': 'Às suas marcas', 'msg.go': 'VAI!',
      'msg.dq': 'DESCLASSIFICADO! Saída falsa', 'msg.falseStart': 'SAÍDA FALSA! Mais uma e você está fora',
      'msg.dive': 'Salte! (ESPAÇO)',
      'msg.altArrows': 'Use ← e → alternados', 'msg.flyKeys': 'Borboleta: ↑ (ou ← + → juntos)',
      'msg.alternate': 'Alterne os braços!', 'msg.missedKick': 'Faltou a pernada (↓)!', 'msg.pullFirst': 'Braçada primeiro (↑)!',
      'msg.backBreath': 'No costas o rosto fica fora d\'água', 'msg.breastBreath': 'No peito você respira a cada braçada',
      'msg.turnEarly': 'Cedo demais para virar!',
      'msg.turnPerfect': 'VIRADA PERFEITA!', 'msg.turnGood': 'Boa virada', 'msg.turnPoor': 'Virada lenta...',
      'msg.uwLimit': 'Limite de 15 m: suba!', 'msg.noAirBreathe': 'Sem ar! Respire (ESPAÇO)', 'msg.noAir': 'Sem ar!',
      'msg.tired': 'Cansou! Volte ao ritmo para recuperar', 'msg.hitWall': 'Bateu na parede!',
      'cam.fp': 'Visão do nadador', 'cam.tv': 'Câmera de TV', 'cam.chase': 'Câmera atrás',
      'lane': 'RAIA {0}',

      // placar
      'sb.length': 'PISCINA {0}/{1}', 'sb.position': 'POSIÇÃO', 'sb.of': 'de {0}',
      'sb.finalTime': 'TEMPO FINAL', 'sb.time': 'TEMPO',

      // pódio
      'medal.gold': 'ouro', 'medal.silver': 'prata', 'medal.bronze': 'bronze',
      'speak.medal': 'Medalha de {0} para {1}!',

      // resultados
      'res.dq': 'Desclassificado', 'res.champion': 'Campeão!', 'res.podium': 'No pódio!', 'res.place': '{0} lugar',
      'res.pool': 'piscina {0}m', 'res.time': 'Tempo', 'res.reaction': 'Reação', 'res.pb': 'Recorde pessoal',
      'res.new': 'NOVO!', 'res.splits': 'Parciais: ', 'res.lane': 'Raia', 'res.swimmer': 'Nadador',
      'res.country': 'País', 'res.diff': 'Dif.',
      'menu.pb': 'Seu recorde nesta prova: {0}', 'menu.noPb': 'Sem recorde nesta prova ainda',
      'err.three': 'Erro ao carregar Three.js', 'err.generic': 'Erro: {0}',

      // página (index.html)
      'touch.diveBtn': 'SALTAR!',
      'menu.tagline': 'Natação em primeira pessoa · sinta a raia, respire, vire e vença!',
      'menu.event': 'Prova', 'menu.free': 'Livre', 'menu.back': 'Costas', 'menu.breast': 'Peito', 'menu.fly': 'Borboleta',
      'menu.medley': 'Medley', 'menu.distance': 'Distância', 'menu.pool': 'Piscina', 'menu.gfx': 'Gráficos',
      'menu.gfxLow': 'Leve', 'menu.gfxMed': 'Médio', 'menu.gfxHigh': 'Alto', 'menu.diff': 'Dificuldade',
      'menu.name': 'Seu nome', 'menu.start': 'NADAR!', 'menu.howto': 'Como jogar',
      'howto.title': 'Como jogar',
      'howto.startH': '🏁 Saída',
      'howto.start': 'Espere o <b>bipe</b> e aperte <kbd>Espaço</kbd> (ou <b>SALTAR</b>). Saiu antes? Saída falsa! Na segunda, desclassificado. No costas você larga de dentro da água.',
      'howto.altH': '🏊 Crawl e Costas',
      'howto.alt': 'Alterne os braços: <kbd>←</kbd> <kbd>→</kbd> (ou <kbd>A</kbd> <kbd>D</kbd>). Acerte o <b>ritmo</b>: o marcador deve cair na faixa verde. Braçadas perfeitas seguidas dão <b>embalo</b> (mais velocidade). Apertar rápido é um <b>sprint</b>: acelera, mas gasta energia. Cansou? Volte ao ritmo que a energia recupera.',
      'howto.flyH': '🦋 Borboleta',
      'howto.fly': 'Os dois braços juntos: <kbd>↑</kbd> ou <kbd>←</kbd>+<kbd>→</kbd> ao mesmo tempo. Ritmo mais lento e muito cansativo.',
      'howto.breastH': '🐸 Peito',
      'howto.breast': 'Braçada <kbd>↑</kbd> e logo depois pernada <kbd>↓</kbd>. Deslize antes da próxima braçada. A respiração é automática.',
      'howto.breathH': '💨 Respiração',
      'howto.breath': 'No crawl e borboleta, o ar acaba! Aperte <kbd>Espaço</kbd> para respirar — no crawl você vira a cabeça e vê o adversário da raia ao lado. Respirar demais custa velocidade.',
      'howto.turnH': '🔄 Virada',
      'howto.turn': 'Perto da parede aparece o medidor. Aperte <kbd>Espaço</kbd> na faixa verde: cambalhota no crawl/costas, toque com as duas mãos no peito/borboleta. No costas, as <b>bandeirolas</b> a 5 m avisam que a parede está chegando.',
      'howto.uwH': '🐬 Submerso',
      'howto.uw': 'Após a saída e a virada você desliza embaixo d\'água. <kbd>↓</kbd> ou <kbd>Espaço</kbd> = golfinhada. Nade para subir (máx. 15 m).',
      'howto.extraH': '🎥 Extras',
      'howto.extra': '<kbd>C</kbd> troca a câmera (nadador / TV / atrás) · <kbd>Esc</kbd> pausa · <kbd>M</kbd> som. No celular use os botões na tela (melhor na horizontal).',
      'howto.ok': 'Entendi!',
      'pause.title': 'Pausado', 'pause.resume': 'Continuar', 'pause.restart': 'Reiniciar prova', 'pause.menu': 'Menu principal',
      'podium.title': '🏆 PÓDIO', 'podium.next': 'Ver resultados ▶',
      'res.again': 'Nadar de novo', 'res.menu': 'Menu',
      'rotate': '↻ Gire o celular para jogar na horizontal', 'loading': 'Carregando piscina…'
    },

    en: {
      'meta.description': 'First-person 3D swimming game: race other swimmers with starts, turns and four strokes.',
      speechLang: 'en-US',
      you: 'You',
      youTag: '(you)',

      'stroke.free': 'Freestyle', 'stroke.back': 'Backstroke', 'stroke.breast': 'Breaststroke', 'stroke.fly': 'Butterfly',
      'label.free': 'FREESTYLE', 'label.back': 'BACKSTROKE', 'label.breast': 'BREASTSTROKE', 'label.fly': 'BUTTERFLY',
      'event.free': 'Freestyle', 'event.medley': 'Medley (4 strokes)',
      'diff.easy': 'Easy', 'diff.medium': 'Medium', 'diff.hard': 'Hard', 'diff.pro': 'Olympic',

      'btn.mute': 'Sound (M)', 'btn.cam': 'Camera (C)', 'btn.pause': 'Pause (Esc)',
      'hud.energy': 'Energy', 'hud.air': 'Air', 'hud.wall': 'WALL',
      'hud.lap': 'Length {0}/{1} · {2}m',
      'rate.perfect': 'PERFECT', 'rate.fast': 'SPRINT (tiring!)', 'rate.slow': 'SLOW', 'rate.same': 'MISSED!',
      'rate.streak': ' · STREAK x{0}',
      'hint.kickTouch': '<b>KICK</b>', 'hint.kickKey': '<kbd>↓</kbd> kick',
      'hint.pullTouch': '<b>PULL</b>', 'hint.pullKey': '<kbd>↑</kbd> pull',
      'hint.flyTouch': 'Tap both together', 'hint.flyKey': '<kbd>↑</kbd> or <kbd>←</kbd>+<kbd>→</kbd>',
      'hint.breatheTouch': ' · <b class="warn">BREATHE</b>', 'hint.breatheKey': ' · <kbd class="warn">SPACE</kbd> breathe',
      'hint.uwTouch': 'Dolphin kick · swim to surface', 'hint.uwKey': '<kbd>↓</kbd> dolphin kick · swim to surface',
      'turn.flip': 'FLIP TURN', 'turn.touch': 'TOUCH + TURN', 'turn.nowTouch': 'NOW!', 'turn.nowKey': 'SPACE!',
      'touch.skip': 'SKIP INTRO', 'touch.dive': 'DIVE!', 'touch.dolphin': 'dolphin', 'touch.dolphinBig': 'DOLPHIN KICK',
      'touch.up': 'surface', 'touch.kick': 'kick', 'touch.pull': 'pull', 'touch.together': 'together',
      'touch.left': 'left', 'touch.right': 'right', 'touch.turn': 'TURN!', 'touch.breathe': 'BREATHE',

      'msg.reaction': 'Reaction: {0}s', 'msg.now': 'Now: {0}', 'msg.place': '{0} place · {1}',
      'msg.marks': 'Take your marks...', 'speak.marks': 'Take your marks', 'msg.go': 'GO!',
      'msg.dq': 'DISQUALIFIED! False start', 'msg.falseStart': 'FALSE START! One more and you\'re out',
      'msg.dive': 'Dive! (SPACE)',
      'msg.altArrows': 'Alternate ← and →', 'msg.flyKeys': 'Butterfly: ↑ (or ← + → together)',
      'msg.alternate': 'Alternate your arms!', 'msg.missedKick': 'You missed the kick (↓)!', 'msg.pullFirst': 'Pull first (↑)!',
      'msg.backBreath': 'In backstroke your face stays out of the water', 'msg.breastBreath': 'In breaststroke you breathe on every stroke',
      'msg.turnEarly': 'Too early to turn!',
      'msg.turnPerfect': 'PERFECT TURN!', 'msg.turnGood': 'Good turn', 'msg.turnPoor': 'Slow turn...',
      'msg.uwLimit': '15 m limit: come up!', 'msg.noAirBreathe': 'Out of air! Breathe (SPACE)', 'msg.noAir': 'Out of air!',
      'msg.tired': 'Tired! Get back in rhythm to recover', 'msg.hitWall': 'You hit the wall!',
      'cam.fp': 'Swimmer view', 'cam.tv': 'TV camera', 'cam.chase': 'Rear camera',
      'lane': 'LANE {0}',

      'sb.length': 'LENGTH {0}/{1}', 'sb.position': 'POSITION', 'sb.of': 'of {0}',
      'sb.finalTime': 'FINAL TIME', 'sb.time': 'TIME',

      'medal.gold': 'Gold', 'medal.silver': 'Silver', 'medal.bronze': 'Bronze',
      'speak.medal': '{0} medal for {1}!',

      'res.dq': 'Disqualified', 'res.champion': 'Champion!', 'res.podium': 'On the podium!', 'res.place': '{0} place',
      'res.pool': '{0}m pool', 'res.time': 'Time', 'res.reaction': 'Reaction', 'res.pb': 'Personal best',
      'res.new': 'NEW!', 'res.splits': 'Splits: ', 'res.lane': 'Lane', 'res.swimmer': 'Swimmer',
      'res.country': 'Country', 'res.diff': 'Diff.',
      'menu.pb': 'Your best in this event: {0}', 'menu.noPb': 'No record in this event yet',
      'err.three': 'Failed to load Three.js', 'err.generic': 'Error: {0}',

      'touch.diveBtn': 'DIVE!',
      'menu.tagline': 'First-person swimming · feel the lane, breathe, turn and win!',
      'menu.event': 'Event', 'menu.free': 'Free', 'menu.back': 'Back', 'menu.breast': 'Breast', 'menu.fly': 'Fly',
      'menu.medley': 'Medley', 'menu.distance': 'Distance', 'menu.pool': 'Pool', 'menu.gfx': 'Graphics',
      'menu.gfxLow': 'Low', 'menu.gfxMed': 'Medium', 'menu.gfxHigh': 'High', 'menu.diff': 'Difficulty',
      'menu.name': 'Your name', 'menu.start': 'SWIM!', 'menu.howto': 'How to play',
      'howto.title': 'How to play',
      'howto.startH': '🏁 Start',
      'howto.start': 'Wait for the <b>beep</b> and press <kbd>Space</kbd> (or <b>DIVE</b>). Went too early? False start! A second one disqualifies you. In backstroke you start in the water.',
      'howto.altH': '🏊 Freestyle and Backstroke',
      'howto.alt': 'Alternate your arms: <kbd>←</kbd> <kbd>→</kbd> (or <kbd>A</kbd> <kbd>D</kbd>). Keep the <b>rhythm</b>: the marker should land in the green zone. Perfect strokes in a row build a <b>streak</b> (more speed). Tapping fast is a <b>sprint</b>: it speeds you up but burns energy. Tired? Get back in rhythm and your energy comes back.',
      'howto.flyH': '🦋 Butterfly',
      'howto.fly': 'Both arms together: <kbd>↑</kbd> or <kbd>←</kbd>+<kbd>→</kbd> at the same time. Slower rhythm and very tiring.',
      'howto.breastH': '🐸 Breaststroke',
      'howto.breast': 'Pull with <kbd>↑</kbd>, then kick right after with <kbd>↓</kbd>. Glide before the next pull. Breathing is automatic.',
      'howto.breathH': '💨 Breathing',
      'howto.breath': 'In freestyle and butterfly you run out of air! Press <kbd>Space</kbd> to breathe — in freestyle you turn your head and see the swimmer in the next lane. Breathing too much costs speed.',
      'howto.turnH': '🔄 Turns',
      'howto.turn': 'Near the wall a gauge appears. Press <kbd>Space</kbd> in the green zone: flip turn in freestyle/backstroke, two-hand touch in breaststroke/butterfly. In backstroke, the <b>flags</b> 5 m out warn you the wall is coming.',
      'howto.uwH': '🐬 Underwater',
      'howto.uw': 'After the start and each turn you glide underwater. <kbd>↓</kbd> or <kbd>Space</kbd> = dolphin kick. Swim to come up (max. 15 m).',
      'howto.extraH': '🎥 Extras',
      'howto.extra': '<kbd>C</kbd> switches the camera (swimmer / TV / rear) · <kbd>Esc</kbd> pauses · <kbd>M</kbd> sound. On a phone use the on-screen buttons (best in landscape).',
      'howto.ok': 'Got it!',
      'pause.title': 'Paused', 'pause.resume': 'Resume', 'pause.restart': 'Restart race', 'pause.menu': 'Main menu',
      'podium.title': '🏆 PODIUM', 'podium.next': 'See results ▶',
      'res.again': 'Swim again', 'res.menu': 'Menu',
      'rotate': '↻ Turn your phone sideways to play', 'loading': 'Loading pool…'
    }
  };

  // ?lang=pt|en na URL tem prioridade; senão, o primeiro idioma do navegador que for pt ou en; padrão inglês
  function detect() {
    var m = /[?&]lang=(pt|en)\b/i.exec(location.search);
    if (m) return m[1].toLowerCase();
    var list = (navigator.languages && navigator.languages.length) ? navigator.languages : [navigator.language || ''];
    for (var i = 0; i < list.length; i++) {
      var l = String(list[i]).toLowerCase();
      if (l.indexOf('pt') === 0) return 'pt';
      if (l.indexOf('en') === 0) return 'en';
    }
    return 'en';
  }

  SG.LANG = detect();
  var dict = STR[SG.LANG];

  // SG.t('chave', a, b...) troca {0}, {1}... pelos argumentos
  SG.t = function (key) {
    var s = key in dict ? dict[key] : (key in STR.pt ? STR.pt[key] : key);
    var args = arguments;
    return s.replace(/\{(\d)\}/g, function (_, n) { var v = args[+n + 1]; return v == null ? '' : v; });
  };

  // nome padrão da jogadora em qualquer idioma (para trocar quando o idioma muda)
  SG.isDefaultName = function (n) { return !n || n === STR.pt.you || n === STR.en.you; };

  SG.ordinal = function (n) {
    if (SG.LANG === 'pt') return n + 'º';
    var t = n % 100, u = n % 10;
    var suf = (t >= 11 && t <= 13) ? 'th' : (u === 1 ? 'st' : u === 2 ? 'nd' : u === 3 ? 'rd' : 'th');
    return n + suf;
  };

  // aplica os textos da página: data-i18n (conteúdo) e data-i18n-title (dica do botão)
  SG.applyI18n = function (root) {
    root = root || document;
    document.documentElement.lang = SG.LANG === 'pt' ? 'pt-BR' : 'en';
    var meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute('content', SG.t('meta.description'));
    Array.prototype.forEach.call(root.querySelectorAll('[data-i18n]'), function (el) {
      el.innerHTML = SG.t(el.getAttribute('data-i18n'));
    });
    Array.prototype.forEach.call(root.querySelectorAll('[data-i18n-title]'), function (el) {
      el.title = SG.t(el.getAttribute('data-i18n-title'));
    });
  };

  // os scripts ficam no fim do <body>, então a página já está montada aqui
  SG.applyI18n();
})();
