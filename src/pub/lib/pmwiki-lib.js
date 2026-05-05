/*
  PmLib: JavaScript utility library for PmWiki
  (c) 2009-2026 Petko Yotov www.pmwiki.org/petko
  Licensed GNU GPLv2 or any more recent version released by the FSF.
  
  These helper functions can be reused by recipes / extensions.
  
  They can be imported in your function, call:
  const { W, D, H, echo, err, Now, q, Q, ue, PHSC, ga, sa, sp, dce,
    css, min, max, minmax, ceil, floor, rnd, pf, floatval, intval,
    average, zpad, ls, jP, jS, getConf, on, off, fire, tap, pdsp,
    adj, posy, isVisible, isHidden, abspos,
    gcs, gbcr, preferdark, afetch, ready } = PmLib;
  
  For readability, import only those that you actually use.
*/

var PmLib = {
  W: window,
  D: document,
  H: document.documentElement, // <html>
  echo: console.log,
  err: console.error,
  get Now() { return new Date(); },
  get B() { return document.body; },
};

// querySelector[All]
PmLib.q = function(str, par = document) { return PmLib._qs(str, par, ''); };
PmLib.Q = function(str, par = document) { return PmLib._qs(str, par, 'All'); };
PmLib._qs = function(s, p, all) { 
  if(s instanceof Node) [s, p] = [p, s]; 
  return p['querySelector'+all](s); 
};

// Deprecated
PmLib.qs   = function(par, str) { return PmLib.q(str, par); };
PmLib.qsa  = function(par, str) { return PmLib.Q(str, par); };
PmLib.dqs  = function(str) { return PmLib.q(str); };
PmLib.dqsa = function(str) { return PmLib.Q(str); };

// url-encode, htmlspecialchars
PmLib.ue = function(x) { return encodeURIComponent(x); };
PmLib.PHSC = function(x) { // not quotes?
  return x.replace(/[&]/g, '&amp;').replace(/[<]/g, '&lt;').replace(/[>]/g, '&gt;'); 
};

// get/set attributes
PmLib.ga = function(el, attr, norm='') { 
  let val = el.getAttribute(attr); 
  if(typeof norm =='function') return norm(val);
  if(!val && norm) return norm;
  return val;
};
PmLib.sa = function(el, attrs) {
  for(let [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
};

// set properties
PmLib.sp = function(el, prop) {
  for(let i in prop) {
    if(i == 'style' || i == 'dataset') PmLib.sp(el[i], prop[i]);
    else if(i == 'attr') PmLib.sa(el, prop[i]);
    else if(prop.hasOwnProperty(i)) el[i] = prop[i];
  }
};
// document.createElement
PmLib.dce = new Proxy(
  function(tag, prop, attr)  { 
    let el = document.createElement(tag);
    if(prop) PmLib.sp(el, prop);
    if(attr) PmLib.sa(el, attr);
    return el;
  }, {
  get(target, tag) {
    return function(prop, attr) { return target(tag, prop, attr); }
  }
});
// set CSS, obj looks like { color: "red" }
PmLib.css = PmLib.setStyles = function (el, obj) { PmLib.sp(el.style, obj); };
PmLib.cl = new Proxy( // classList
  function() { // op, el, [delay], names
    let short = { a:'add', r:'remove', m:'momentary', R:'replace', t:'toggle', c: 'contains'};
    let args = [...arguments], op = args.shift(), el = args.shift(), delay= false;
    if(short[op]) op = short[op];
    if(op=='momentary') {
      op = 'add';
      delay = args.shift();
    }
    if(delay) setTimeout(function(){ el.classList.remove(...args); }, delay*1000);
    return el.classList[op](...args);
  }, {
    get(t, p) {
      return function() { return t(p, ...arguments); };
    }
  }
);

// Math
PmLib.min = Math.min;
PmLib.max = Math.max;
PmLib.minmax = function(n, min, max) {
  var m = n+0;
  if(min != null) m = Math.max(m, min);
  if(max != null) m = Math.min(m, max);
  return m;
};
PmLib.abs = Math.abs;
PmLib.ceil = Math.ceil;
PmLib.floor = Math.floor;
PmLib.rnd = function(n, precision = 0) {
  if(!precision) return Math.round(n);
  var x = Math.pow(10, precision);
  return Math.round(n*x)/x;
};
PmLib.pf       = parseFloat; // may return NaN
PmLib.floatval = function(x) {var y = parseFloat(x); return isNaN(y)? 0:y; };
PmLib.intval   = function(x) {var y = parseInt(x);   return isNaN(y)? 0:y; };
PmLib.average  = function(x) {return x.reduce(function(a, b){ return a+b; }, 0) / x.length;};
PmLib.zpad     = function(num, len = 2) { // zero-pad (for date/time)
  return num.toString().padStart(len, '0');
};
PmLib.requal = function(o1, o2) { // recursive equal
  if(o1 === o2) return true;
  if(!o1 || !o2 || typeof o1 !== 'object' || typeof o2 !== 'object') return false;
  const a1 = Array.isArray(o1), a2 = Array.isArray(o2);
  if(a1 && a2) {
    if(o1.length !== o2.length) return false;
    for(let i = 0; i < o1.length; i++) {
      if(!PmLib.requal(o1[i], o2[i])) return false;
    }
    return true;
  }
  if(a1 || a2) return false;
  const k1 = Object.keys(o1), k2 = Object.keys(o2);
  if (k1.length !== k2.length) return false;
  
  for(let i = 0; i < k1.length; i++) {
    const key = k1[i];
    if(!o2.hasOwnProperty(key)) return false;
    if(!PmLib.requal(o1[key], o2[key])) return false;
  }
  return true;
}
PmLib.unref = function(value) {
  if(typeof value === 'object' && value !== null) {
    return Array.isArray(value) ? [...value] : { ...value };
  }
  return value;
}
PmLib.debounce = function(delay, fn) {
  let timeout;
  return function(...args) {
    clearTimeout(timeout);
    timeout = setTimeout(function(){ fn.apply(this, args); }, delay);
  };
};

// localStorage
PmLib._storage = false;
PmLib.getLS = function(key, dflt = null) {
  if(PmLib._storage===false) {
    try {
      var stored = window.localStorage.getItem('PmLib');
    }
    catch(e) {
      var stored = null;
    }
    PmLib._storage = stored ? PmLib.jP(stored, {}) : {};
  }
  let value = PmLib._storage[key];
  if(value === undefined) return dflt;
  return PmLib.unref(value);
};
PmLib._savetodisk = function() {
  try {
    var value = PmLib.jS(PmLib._storage);
    window.localStorage.setItem('PmLib', value);
    return true;
  }
  catch(e) {
    return false;
  }
};
PmLib._storeLS = PmLib.debounce(250, PmLib._savetodisk);

PmLib.setLS = function(key, value) {
  let curr = PmLib.getLS(key),
      unref = PmLib.unref(value);
  if(PmLib.requal(curr, unref)) return;
  PmLib._storage[key] = unref;
  PmLib._storeLS();
};
PmLib.delLS = function(key) {
  if(!PmLib._storage.hasOwnProperty(key)) return false;
  delete PmLib._storage[key];
  PmLib._storeLS();
  return true;
};
PmLib.ls = new Proxy( 
  function(obj, dflt=null) { 
    // get: 'key', defaultValue
    if(typeof obj=='string') return PmLib.getLS(obj, dflt);
    // delete [key1, key2...]
    if(Array.isArray(obj)) for(let k of obj) PmLib.delLS(k);
    // set {key1:value1, ...} 
    else for(let k in obj) PmLib.setLS(k, obj[k]);
    PmLib._storeLS();
  }, {
  set(target, key, value) {
    return PmLib.setLS(key, value);
  },
  get(target, key) {
    return PmLib.getLS(key);
  },
  deleteProperty(target, key) {
    return PmLib.delLS(key);
  }
});

// sync other tabs
window.addEventListener('storage', function(e){
  if(e.key == 'PmLib') PmLib._storage = false;
});

// JSON helpers
PmLib.jP = function(x, dflt = null) { try{ var y = JSON.parse(x); return y; } catch(e){ return dflt;} };
PmLib.jS = function(obj, space = 0) { return JSON.stringify(obj, null, space); };
PmLib.getConf = function(el) {
  return PmLib.jP(el.dataset.config, {});
};

// Events
PmLib._handleEvent = function(ev, el, fn, opts, remove) {
  if(!el) return;
  if(typeof el == 'string') el = PmLib.dqsa(el);
  else if(el instanceof EventTarget) el = [el];
  opts = opts || false;
  let method = (remove? 'remove':'add')+'EventListener';
  let evs = ev.split(/[,\s]+/g);
  for(let e of evs) {
    if(PmLib._onevents[e]) e = PmLib._onevents[e];
    for(let elem of el) {
      elem[method](e, fn, opts);
    }
  }
};
PmLib.pdsp = function(e, sp) { e.preventDefault(); if(sp) e.stopPropagation(); }
PmLib.aE = function(el, ev, fn, opts) {
  return PmLib._handleEvent(ev, el, fn, opts);
};
PmLib.rE = function (el, ev, fn, opts) {
  return PmLib._handleEvent(ev, el, fn, opts, true);
};
PmLib._onevents = { // onevent shortcuts
  cl: 'click', dc: 'dblclick', md: 'mousedown', mu: 'mouseup',
  mm: 'mousemove', me: 'mouseenter', ml: 'mouseleave', mw: 'wheel',
  ip: 'input', ch: 'change', sb: 'submit', fc: 'focus', iv: 'invalid',
  kd: 'keydown', ku: 'keyup', kp: 'keypress',
  ds: 'dragstart', de: 'dragenter', do: 'dragover', dr: 'drop', dl: 'dragleave',
  tg: 'toggle',
};
PmLib.on = new Proxy( // addEventListener
  PmLib._handleEvent, {
    get(target, e) {
      return function(q, fn, opts) { target(e, q, fn, opts); };
    }
  }
);
PmLib.tap = PmLib.on.click;
PmLib.once = new Proxy( 
  function(ev, el, fn, opts = {}) {
    PmLib._handleEvent(ev, el, fn, {once:true, ...opts});
  }, {
    get(target, e) {
      return function(q, fn, opts) { target(e, q, fn, opts); };
    }
  }
);
PmLib.off = new Proxy( // removeEventListener
  function(ev, el, fn, opts) { PmLib._handleEvent(ev, el, fn, opts, 1) }, {
    get(target, e) {
      return function(q, fn, opts) { target(e, q, fn, opts); };
    }
  }
);
PmLib.fire = new Proxy(
  function(el, ename, options = {}) {
    if(PmLib._onevents[ename]) ename = PmLib._onevents[ename];
    let o = {bubbles:true, cancelable:true, ...options};
    let etype = o.etype? o.etype : (o.detail || ename.match(/^pm|[^a-z]/)? CustomEvent:Event);
    let ev = new etype(ename, o);
    if(!el) el = document;
    el.dispatchEvent(ev);
  }, {
    get(target, name) {
      return function(el, options = {}) { target(el, name, options); };
    }
  }
);
PmLib.dE = PmLib.dCE = PmLib.fire; // dCE, dE Deprecated
PmLib.time = { // swapped args, delay in seconds
  out: function(n, fn) { return fn? setTimeout(fn, n*1000)  : clearTimeout(n); },
  int: function(n, fn) { return fn? setInterval(fn, n*1000) : clearInterval(n); },
};
PmLib.itext = function(text) {
  document.execCommand('insertText', false, text);
}

// DOM helpers
PmLib.adj = new Proxy( // insert adjacent things
  function(el, where, what) {
    if(typeof el == 'string') el = PmLib.dqs(el);
    if(what instanceof Element) el.insertAdjacentElement(where, what);
    else el.insertAdjacentHTML(where, what);
  }, {
    get(target, prop) {
      let wheres = {
        bb: 'beforebegin', ab: 'afterbegin', be: 'beforeend', ae: 'afterend',
      }
      let where = wheres[prop] || 'afterbegin';
      return function(el, what) { return target(el, where, what); };
    }
  }
);
PmLib.adjany = PmLib.adj; // Deprecated
PmLib.adjbb = PmLib.adj.bb;
PmLib.adjbe = PmLib.adj.be;
PmLib.adjab = PmLib.adj.ab;
PmLib.adjae = PmLib.adj.ae;


PmLib.posy = function(el) {
  var top = 0;
  if (el.offsetParent) {
    do {
      top += el.offsetTop;
    } while (el = el.offsetParent);
  }
  return top;
};

PmLib.isVisible = function(el) {
  return !PmLib.isHidden(el);
};
PmLib.isHidden = function(el) {
  if(!el) return true;
  if(typeof el.checkVisibility == 'function') return !el.checkVisibility();
  var cs = PmLib.gcs(el);
  if(cs.position == 'fixed') return (cs.display === "none"); // Firefox != Chrome
  return (el.offsetParent === null);
};

PmLib.gcs = new Proxy(
  function(el, prop) {
    var s = window.getComputedStyle(el);
    if(prop) return s.getPropertyValue(prop);
    return s;
  }, {
  get(target, prop) {
    return function(el) { return target(el, prop); };
  }
});

PmLib.gbcr = function(el) { return el.getBoundingClientRect(); }

PmLib.abspos = function(fixed, floating) {
  const {css, gbcr, W} = PmLib;
  css(floating, { display: 'block', 'z-index': 1000, position: 'fixed'});
  var lrect = gbcr(floating), rect = gbcr(fixed), 
  iw = W.innerWidth, ih = W.innerHeight, 
  lh = lrect.height, lw = lrect.width;
  
  var left = (rect.left < iw-lw)
    ? rect.left
    : (iw-lw-10);
  floating.style.left = left + 'px';
  
  var top = (rect.top < lh)
    ? (rect.bottom)
    : (rect.top-lh);
  floating.style.top = top + 'px';
}



PmLib.parser = function(html) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  return doc.body;
}

// browser prefers dark theme
PmLib.wmmd = window.matchMedia
  ? window.matchMedia('(prefers-color-scheme: dark)')
  : false;
PmLib.preferdark = function() {
  if(PmLib.wmmd && PmLib.wmmd.matches) return 1;
  return 0;
};

PmLib.fdata = function(data) {
  var body = new FormData;
  for(let [k, v] of Object.entries(data)) body.append(k, v);
  return body;
}

// Ajax / Fetch functions
PmLib.afetch = new Proxy(
  async function(rtype, qurl, opt = {}) {
    if(opt.post && !opt.body) {
      opt.body = PmLib.fdata(opt.post);
      if(!opt.method) opt.method = 'POST';
      delete opt.post;
    }
    if(opt.json && !opt.body) {
      opt.body = PmLib.jS(opt.json);
      if(!opt.method) opt.method = 'POST';
      if(!opt.headers) opt.headers = {};
      opt.headers = { "Content-Type":'application/json', ...opt.headers};
      delete opt.json;
    }
    try {
      const response = await fetch(qurl, opt);
      const {ok, redirected, status, statusText, type, url} = response;
      const out = {ok, redirected, status, statusText, type, url};
      out.headers = Object.fromEntries(response.headers.entries());
      if (ok) out.data = await response[rtype]();
      return out;
    }
    catch (error) {
      PmLib.err('Error fetching data:', error);
      return {ok:false, error};
    }
  }, {
    get(target, prop) {
      return async function(url, opt) { return await target(prop, url, opt); };
    }
  }
);

PmLib.mkDrag = function(par){
  const {on, cl, pdsp, fire, echo} = PmLib;
  for(let child of par.children) child.draggable = true;
  par.style.cursor = "move";
  var dragged = false;
  on.dragstart(par, function(e){
    if(![...par.children].includes(e.target)) return;
    dragged = e.target;
    cl.a(dragged, 'dragged');
  });
  on.dragend(par, function(e){
    if(![...par.children].includes(e.target)) return;
    cl.r(dragged, 'dragged');
    dragged = false;
  });
  on.dragover(par, pdsp);
  on.drop(par, function(e){
    var c = [...this.children], d = dragged, t = e.target;
    if(!d || d==t || d.parentNode !== t.parentNode) return;
    var b = c.indexOf(t) < c.indexOf(d) ? t : t.nextSibling;
    this.insertBefore(d, b);
    fire.pmdragend(this, {detail: {moved:d}});
  });
};

// call a function after loading the DOM
PmLib.ready = function(fn) {
  if( document.readyState !== 'loading' ) fn();
  else window.addEventListener('DOMContentLoaded', fn);
};
PmLib.ready.done = {};
PmLib.ready._init = [];
PmLib.ready._queued = [];
PmLib.ready.queue = function(fn) {
  if(PmLib.ready._queued === false) fn();
  else PmLib.ready._queued.push(fn);
};

PmLib.stack = function() {
  let lines = new Error().stack.split(/\n+/);
  let stack = [];
  for(let line of lines) {
    let a = line.match(/(https?:\/\/.+?|file:\/\/.+?|\/.+?):(\d+):(\d+)/);
    if(a) stack.push({file:a[1], line:parseInt(a[2]), column:parseInt(a[3])});
  }
  return stack.slice(1);
}

