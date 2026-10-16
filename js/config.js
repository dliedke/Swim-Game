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
 * type:
 *  alt    -> braços alternados (← / →)
 *  breast -> braçada (↑) + pernada (↓)
 *  fly    -> dois braços juntos (↑ ou ← + →)
 */
SG.STROKES = {
  free: {
    id: 'free', name: 'Crawl', label: 'LIVRE', vmax: 2.05, type: 'alt',
    ideal: [0.42, 0.62], breath: true, supine: false, flip: true,
    turnZone: 3.4, turnPerfect: [1.25, 2.05], turnGood: [0.8, 2.7], aiRate: 0.95
  },
  back: {
    id: 'back', name: 'Costas', label: 'COSTAS', vmax: 1.86, type: 'alt',
    ideal: [0.5, 0.72], breath: false, supine: true, flip: true,
    turnZone: 3.4, turnPerfect: [1.3, 2.1], turnGood: [0.85, 2.75], aiRate: 0.82
  },
  breast: {
    id: 'breast', name: 'Peito', label: 'PEITO', vmax: 1.62, type: 'breast',
    pullKick: [0.12, 0.38], kickPull: [0.45, 0.85], breath: false, supine: false, flip: false,
    turnZone: 2.6, turnPerfect: [0.1, 0.75], turnGood: [0.0, 1.3], aiRate: 0.78
  },
  fly: {
    id: 'fly', name: 'Borboleta', label: 'BORBOLETA', vmax: 1.95, type: 'fly',
    ideal: [0.74, 1.05], breath: true, supine: false, flip: false,
    turnZone: 2.6, turnPerfect: [0.1, 0.75], turnGood: [0.0, 1.3], aiRate: 0.85
  }
};

SG.MEDLEY_ORDER = ['fly', 'back', 'breast', 'free'];

SG.EVENTS = [
  { id: 'free', name: 'Livre (Crawl)' },
  { id: 'back', name: 'Costas' },
  { id: 'breast', name: 'Peito' },
  { id: 'fly', name: 'Borboleta' },
  { id: 'medley', name: 'Medley (4 estilos)' }
];

SG.DISTANCES = [50, 100, 200, 400];

SG.DIFFICULTY = {
  easy:   { name: 'Fácil',    range: [0.74, 0.86] },
  medium: { name: 'Médio',    range: [0.83, 0.93] },
  hard:   { name: 'Difícil',  range: [0.91, 0.99] },
  pro:    { name: 'Olímpico', range: [0.97, 1.05] }
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
SG.ordinal = function (n) { return n + 'º'; };
