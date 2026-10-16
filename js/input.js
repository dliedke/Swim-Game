/* Entrada: teclado (desktop) e botões de toque (mobile) */
(function () {
  var I = { handler: null, held: {} };

  var KEYMAP = {
    ArrowLeft: 'left', KeyA: 'left',
    ArrowRight: 'right', KeyD: 'right',
    ArrowUp: 'up', KeyW: 'up',
    ArrowDown: 'down', KeyS: 'down',
    Space: 'action', Enter: 'action',
    KeyC: 'camera', KeyV: 'camera',
    Escape: 'pause', KeyP: 'pause',
    KeyM: 'mute'
  };

  function emit(act) {
    if (I.handler) I.handler(act);
  }

  I.init = function (handler) {
    I.handler = handler;
    window.addEventListener('keydown', function (e) {
      var act = KEYMAP[e.code];
      if (!act) return;
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT')) return;
      e.preventDefault();
      if (e.repeat || I.held[e.code]) return;
      I.held[e.code] = true;
      emit(act);
    });
    window.addEventListener('keyup', function (e) { I.held[e.code] = false; });
    window.addEventListener('blur', function () { I.held = {}; emit('blur'); });

    // botões de toque: dispara no pointerdown para resposta imediata
    var btns = document.querySelectorAll('[data-act]');
    Array.prototype.forEach.call(btns, function (b) {
      b.addEventListener('pointerdown', function (e) {
        e.preventDefault();
        b.classList.add('pressed');
        if (navigator.vibrate) { try { navigator.vibrate(8); } catch (err) { /* ignore */ } }
        emit(b.getAttribute('data-act'));
      });
      var up = function () { b.classList.remove('pressed'); };
      b.addEventListener('pointerup', up);
      b.addEventListener('pointercancel', up);
      b.addEventListener('pointerleave', up);
      b.addEventListener('contextmenu', function (e) { e.preventDefault(); });
    });
  };

  SG.Input = I;
})();
