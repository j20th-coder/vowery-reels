/* Vowery reel auto-driver — injected at the end of the demo page.
   Activated only with ?scene=<name> in the URL. Everything happens inside
   the real browser (Safari on the iOS Simulator): the taps are real DOM
   clicks, the scrolls are animated with an iOS-like ease-out curve, the
   typing is character by character. Nothing is drawn on top of the page
   except the optional hook line (?hook=text). */
(function () {
  var q = new URLSearchParams(location.search);
  var scene = q.get('scene');
  if (!scene) return;

  var $ = function (s) { return document.querySelector(s); };
  var wait = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  var easeOut = function (t) { return 1 - Math.pow(1 - t, 3); };

  function tap(sel) {
    var el = $(sel);
    if (!el) { console.warn('no element', sel); return; }
    el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
  }

  function scroller() { return $('.view.on') || document.scrollingElement; }

  /* scroll by dy px with an iOS-like deceleration (fast start, soft stop) */
  function flick(dy, ms) {
    ms = ms || 900;
    var el = scroller(), y0 = el.scrollTop, t0 = performance.now();
    return new Promise(function (done) {
      (function step(now) {
        var t = Math.min(1, (now - t0) / ms);
        el.scrollTop = y0 + dy * easeOut(t);
        if (t < 1) requestAnimationFrame(step); else done();
      })(t0);
    });
  }

  function scrollIntoView(sel, offset, ms) {
    var el = $(sel), sc = scroller();
    if (!el) return Promise.resolve();
    var target = el.getBoundingClientRect().top - sc.getBoundingClientRect().top + sc.scrollTop - (offset || 120);
    return flick(target - sc.scrollTop, ms);
  }

  async function type(sel, text, cps) {
    var el = $(sel); if (!el) return;
    el.focus(); el.value = '';
    for (var i = 0; i < text.length; i++) {
      el.value += text[i];
      el.dispatchEvent(new Event('input', { bubbles: true }));
      await wait(1000 / (cps || 14) + Math.random() * 40);
    }
    el.blur();
  }

  function hook() {
    var text = q.get('hook'); if (!text) return;
    var d = document.createElement('div');
    d.id = 'reel-hook';
    d.textContent = text;
    d.style.cssText = [
      'position:fixed', 'left:8%', 'right:8%', 'top:' + (q.get('hooktop') || '22') + '%',
      'z-index:99999', 'pointer-events:none', 'text-align:center',
      "font-family:'Cormorant Garamond',serif", 'font-weight:600', 'font-style:italic',
      'font-size:' + (q.get('hooksize') || '30') + 'px', 'line-height:1.15',
      'color:' + (q.get('hookcolor') || '#2f2c26'),
      'text-shadow:0 1px 0 rgba(255,255,255,.55),0 6px 22px rgba(246,241,230,.9)',
      'transition:opacity .35s ease'
    ].join(';');
    document.body.appendChild(d);
  }
  function hookOff() { var d = $('#reel-hook'); if (d) d.style.opacity = '0'; }
  /* demo mode: the form must succeed without a backend */
  window.dataSdk = { create: function () { return Promise.resolve({ isOk: true }); } };

  var scenes = {
    /* Keepsake Box — 13.5 s loop: landing → untie → box → telegram → RSVP → back to landing */
    keepsake1: async function () {
      await wait(2600);                      // landing + hook
      tap('#gate-btn');                      // payoff at ~2.6–4 s
      await wait(1500); hookOff();           // hook leaves as the box opens
      await wait(1400);                      // crossfade to home
      await wait(1900);                      // let the box breathe
      tap('.kbi[data-go="rsvp"]');           // pick the telegram
      await wait(1300);
      tap('#rsvp-yes');
      await wait(700);
      await scrollIntoView('#f-name', 170, 800);
      await wait(200);
      await type('#f-name', 'Annie & Tom', 15);
      await wait(150);
      await type('#f-count', '2', 8);
      await wait(400);
      tap('#rsvp-send');
      await wait(2600);                      // "received — thank you" ; the edit cuts back to frame 1 for the loop
    },

    /* Just the landing + untie, for calibration */
    probe: async function () {
      await wait(2000); tap('#gate-btn'); await wait(4000);
    }
  };

  /* with ?sync=1 the page is fully loaded first, then waits for go.json to appear
     (the recorder creates it once the video capture is running) */
  function armed() {
    if (!q.get('sync')) return Promise.resolve();
    return new Promise(function (ok) {
      (function poll() {
        fetch('go.json?' + Date.now(), { cache: 'no-store' })
          .then(function (r) { if (r.ok) ok(); else setTimeout(poll, 150); })
          .catch(function () { setTimeout(poll, 150); });
      })();
    });
  }
  function start() {
    hook();
    var fn = scenes[scene];
    if (fn) armed().then(fn).catch(function (e) { console.error(e); });
  }
  if (document.readyState === 'complete') setTimeout(start, 300);
  else window.addEventListener('load', function () { setTimeout(start, 300); });
})();
