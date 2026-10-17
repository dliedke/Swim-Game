/* Configurações gerais do jogo: estilos, dificuldade, adversários */
window.SG = window.SG || {};

SG.LANES = 8;
SG.LANE_W = 2.5;
SG.POOL_W = SG.LANES * SG.LANE_W;
SG.POOL_DEPTH = 2.0;
SG.DECK_Y = 0.28;
SG.PLAYER_LANE = 3; // índice 0..7 => raia 4

// Arrasto quadrático + linear usado na física do nadador
SG.DRAG_K = 0.42;
SG.DRAG_C = 0.05;
SG.DRAG_K_UW = 0.26;

/*
 * Jogabilidade (jogadora):
 *  fastExp     -> quanto a braçada rápida demais perde força (1 = quase nada, 2 = muito)
 *  qMin        -> força mínima de uma braçada rápida demais
 *  stamFloor   -> velocidade com energia zerada (fração da normal)
 *  stamRegen   -> recuperação de energia por segundo nadando no ritmo
 *  comboMax    -> braçadas perfeitas seguidas que contam para o embalo
 *  comboBonus  -> ganho de velocidade por braçada do embalo
 */
SG.PLAY = {
  fastExp: 1.15, qMin: 0.4, stamFloor: 0.62, stamRegen: 0.035, stamRegenIdle: 0.01,
  comboMax: 10, comboBonus: 0.007, oxyDrain: 0.06
};

/*
 * type:
 *  alt    -> braços alternados (← / →)
 *  breast -> braçada (↑) + pernada (↓)
 *  fly    -> dois braços juntos (↑ ou ← + →)
 */
SG.STROKES = {
  free: {
    id: 'free', name: SG.t('stroke.free'), label: SG.t('label.free'), vmax: 2.05, type: 'alt',
    ideal: [0.42, 0.62], breath: true, supine: false, flip: true,
    turnZone: 3.6, turnPerfect: [1.1, 2.2], turnGood: [0.6, 2.9], aiRate: 0.95
  },
  back: {
    id: 'back', name: SG.t('stroke.back'), label: SG.t('label.back'), vmax: 1.86, type: 'alt',
    ideal: [0.5, 0.72], breath: false, supine: true, flip: true,
    turnZone: 3.6, turnPerfect: [1.15, 2.25], turnGood: [0.65, 2.95], aiRate: 0.82
  },
  breast: {
    id: 'breast', name: SG.t('stroke.breast'), label: SG.t('label.breast'), vmax: 1.62, type: 'breast',
    pullKick: [0.12, 0.38], kickPull: [0.45, 0.85], breath: false, supine: false, flip: false,
    turnZone: 2.8, turnPerfect: [0.05, 0.95], turnGood: [0.0, 1.5], aiRate: 0.78
  },
  fly: {
    id: 'fly', name: SG.t('stroke.fly'), label: SG.t('label.fly'), vmax: 1.95, type: 'fly',
    ideal: [0.74, 1.05], breath: true, supine: false, flip: false,
    turnZone: 2.8, turnPerfect: [0.05, 0.95], turnGood: [0.0, 1.5], aiRate: 0.85
  }
};

SG.MEDLEY_ORDER = ['fly', 'back', 'breast', 'free'];

SG.EVENTS = [
  { id: 'free', name: SG.t('event.free') },
  { id: 'back', name: SG.t('stroke.back') },
  { id: 'breast', name: SG.t('stroke.breast') },
  { id: 'fly', name: SG.t('stroke.fly') },
  { id: 'medley', name: SG.t('event.medley') }
];

SG.DISTANCES = [50, 100, 200, 400];

// pack: quanto os adversários se aproximam da jogadora (por metro de diferença), para a prova ficar disputada
SG.DIFFICULTY = {
  easy:   { name: SG.t('diff.easy'),   range: [0.74, 0.86], pack: 0.007, packMax: 0.04 },
  medium: { name: SG.t('diff.medium'), range: [0.83, 0.93], pack: 0.006, packMax: 0.035 },
  hard:   { name: SG.t('diff.hard'),   range: [0.91, 0.99], pack: 0.004, packMax: 0.025 },
  pro:    { name: SG.t('diff.pro'),    range: [0.97, 1.05], pack: 0, packMax: 0 }
};

SG.OPPONENTS = [
  { name: 'R. Souza', country: 'BRA', cap: 0x1fa64a },
  { name: 'K. Takahashi', country: 'JPN', cap: 0xffffff },
  { name: 'L. Carter', country: 'USA', cap: 0x1e3a8a },
  { name: 'M. Rossi', country: 'ITA', cap: 0x2563eb },
  { name: 'J. Weber', country: 'GER', cap: 0x111111 },
  { name: 'E. Clarke', country: 'AUS', cap: 0xfacc15 },
  { name: 'P. Lambert', country: 'FRA', cap: 0xdc2626 },
  { name: 'D. Novak', country: 'CZE', cap: 0x7c3aed },
  { name: 'S. Okafor', country: 'NGR', cap: 0x16a34a },
  { name: 'A. Moreno', country: 'ESP', cap: 0xf97316 },
  { name: 'T. Lindqvist', country: 'SWE', cap: 0x0ea5e9 },
  { name: 'H. Kim', country: 'KOR', cap: 0xe11d48 }
];

// Ordem de raias por ranking (o mais rápido ao lado do jogador)
SG.SEED_LANES = [4, 2, 5, 1, 6, 0, 7];

SG.isTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
SG.isMobile = SG.isTouch && Math.min(screen.width, screen.height) < 820;

SG.clamp = function (v, a, b) { return v < a ? a : (v > b ? b : v); };
SG.lerp = function (a, b, t) { return a + (b - a) * t; };
SG.smooth = function (t) { t = SG.clamp(t, 0, 1); return t * t * (3 - 2 * t); };
SG.laneX = function (lane) { return -SG.POOL_W / 2 + SG.LANE_W * (lane + 0.5); };
SG.fmtTime = function (t) {
  if (t == null || !isFinite(t)) return '--:--.--';
  var m = Math.floor(t / 60);
  var s = t - m * 60;
  var ss = s.toFixed(2);
  if (s < 10) ss = '0' + ss;
  return (m > 0 ? m + ':' : '') + ss;
};
// placar do ginásio (canvas 1024x576): área do cronômetro da jogadora, em pixels
SG.SCOREBOARD_CLOCK = { x: 576, y: 56, w: 448, h: 176 };

// SG.ordinal fica em i18n.js
