/*  PmSyntax: Syntax highlighting for PmWiki markup
    Copyright 2021-2026 Petko Yotov https://www.pmwiki.org/support
    This file is part of PmWiki; you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published
    by the Free Software Foundation; either version 2 of the License, or
    (at your option) any later version.  See pmwiki.php for full details.

    This file provides Javascript functions for syntax highlighting of
    PmWiki markup, to be used in the PmWiki documentation, and optionally
    in the edit form.
*/

(function(__script__){
  
  const { echo, err, dqs, dqsa, PHSC, dce, rnd, intval,
    average, zpad, getLS, setLS, delLS, getConf, aE, rE, tap,
    adjbb, adjbe, adjab, adjae, gcs, gbcr, ready } = PmLib;
 
  var Config = getConf(__script__);
  
  Config.rxInputs = new RegExp('^(' + Config.inputs.sort(rsortbylength).join('|') + ')');
  Config.rxConditions = new RegExp('\\b(' + Config.conditions.sort(rsortbylength).join('|') + ')\\b');
  
  var KeepToken = "\034\034";
  var restoreRX = new RegExp(KeepToken+'(\\d+)'+KeepToken, 'g');
  var special = /[#!*?&+|,()[\]{}\/\^<>=]+|\.\.+|--+|\s-+/g;
  var Kept = new RegExp('^' + KeepToken+'(\\d+)'+KeepToken + '$', '');
  
  function rsortbylength(a, b) {
    return b.length - a.length;
  }
  function span(cname, text, escaped) {
    if(text==='') return '';
    if(!escaped) text = PHSC(text);
    return "<span class='pm"+cname.replace(/^\*/, 'tag ')
     .split(/[ _]+/g).join(' pm')+"'>" + text + "</span>";
  }
  var hrx = [ // rule_name, [*=!]classname|function, [container_rx], rx
    ['_begin'],
    ['external', 'external', /%hlt(?: +([-\w+]+))? *% *\[@([\s\S]*?)@\]/g],
    ['external2', 'external', /%hlt(?: +([-\w+]+)) *% *@@ *\[=([\s\S]*?)=\] *@@/g],
    ['pmhlt', 'external', /%(pm)hlt *% *\[@([\s\S]*?)@\]/g],
    ['pmhlt2', 'external', /%(pm)hlt *% *@@ *\[=([\s\S]*?)=\] *@@/g],
    ['preserve', '=escaped', /\[([@=])[\s\S]*?\1\]/g, /^(\[[@=])([\s\S]*)([@=]\])$/],
    ['joinline', '*bullet', /\\+(\n|$)/g],

    // variables
    ['pagevar', 'var', /\{([-\w\/.]+|[*=<>])?\$[$:]?\w+\}/g],
    ['nestvar', 'string', /\{(\034\034\d+\034\034)\$[$:]?\w+\}/g],
    ['phpvar',  'var', /\$(pagename|Skin|Author|Version|action|[A-Z]\w*(?:[A-Z][a-z0-9]|[a-z0-9][A-Z])\w*|_(?:[A-Z]+))\b/g],
    ['i18n', 'string', /\$\[.*?\]/g],

    // markup expressions
    ['mx', '!mx', /(\{\([-\w]+)(.*?)(\)\})/g],

    // page text vars, can be empty or multiline
    ['ptv0', '=meta>punct', /(\(:\w[-\w]*)(:)( *:\))/g, /:/],
    ['ptv1', '=meta>punct', /(\(:\w[\w-]*)(:[^\)][\s\S]*?)(:\))/g, /:/],

    // core meta directives
    ['comment', '=comment', /(\(:comment )(.*?)(:\))/gi],
    ['skin',  '*meta', /\(:no(left|right|title|action|(group)?(header|footer)) *:\)/gi ],
    ['meta0', '*meta', /\(:(no)?((link|space)wikiwords|linebreaks|toc) *:\)/gi],
    ['meta1', '*meta', /\(:(else\d*|if\d*|if\d*end|nl) *:\)/gi],
    ['meta2', '=meta', /(\(:(?:title|description|keywords))(.*?)(:\))/gi],
    ['meta3', '=meta>keyword>*attr>*keyword',
      /(\(:(?:(?:else\d*)?if\d*))([^-a-z].*?)(:\))/ig, 
      Config.rxConditions,
      special, /[[\]()]+/g ],
    ['tmpl', '!meta>=keyword', /(\(:template[^\S\r\n]+)(\S.*?)(:\))/g,
      /^([ !]*)(each|first|last|defaults?|requires?|none)/],
    ['rdir', '!meta', /(\(:redirect)(.*?)(:\))/g],

    // urls can have percents so before wikistyle (populated by InterMap)
    ['ttip',  '=escaped', /\[\[.*?\S(?= *(?:\||\]\]))/g,  /(")(.*)(")$/ ], // tooltop
    ['link0', '=escaped', /\[\[.*?\S(?= *(?:\||\]\]))/g,  /(\()(.*?)(\))/g],// hidden
    ['link1', 'bracketlink', /(\[\[ *)(.+?)( *\]\])/g ],
    ['_url'],

    // wikistyles
    ['ws0', '*meta', /%%|^>><</gm],
    ['ws1', '!meta', /(^>>\w[-\w]*)(.*?)(<<)/gm],
    ['ws2', '!meta', /(%(?:define|apply)=\w+)(.*?)(%)/gi],
    ['ws3', '!meta', /(%\w[-\w]*)(.*?)(%)/g],

    // directives, forms
    ['form', '!directive>keyword', /(\(:input[^\S\r\n]+)(\S.*?)(:\))/g, Config.rxInputs],
    ['dir0', '*directive', /\(:\w[-\w]* *:\)/g], // simple
    ['dir1', '!directive', /(\(:\w[-\w]*)(.*?)(:\))/g], // with attributes

    // inline
    ['link', 'punct', /(\[\[[\#!~]?|([#+][^\S\r\n]*)?\]\])/g], // link

    // list item, initial space, indent, linebreak
    ['bullet', '*bullet', /^([^\S\r\n]*([*#]+)[^\S\r\n]*|-+[<>][^\S\r\n]*|[^\S\r\n]+)/mg],

    ['QA', '*heading', /^([QA]:|-{4,})/mg], //Q:/A:, horizontal rule
    ['prop', 'meta',   /^[A-Z][-_a-zA-Z0-9]*:/mgi], // property, or start of line PTV

    // inline punctuation; entity
    ['time',  '=mx>string>var',   /(@)([\d-]{10}T\d\d:\d\d(?::\d\d)?)(Z)/g, /^[\d-]+/, /[\d:]+$/],
    ['punct',  'punct',   /('[\^_+-]|[\^_+-]'|\{[+-]+|[+-]+\}|\[[+-]+|[+-]+\]|@@|'''''|'''|''|->|~~~~?)/g],
    ['entity', 'string',  /[&]\#?\w+;/g],

    // simple tables
    ['tablecapt', '=table', /^(\|\|!)(.+)(!\|\|)$/mg],
    ['tablerwsp1', 'table', /(\+\++)(?=\s*\|\|)/g],
    ['tablerwsp2', 'escaped', /\|\|(__+|\^\^+)(?=\|\|)/g, /([_^]+)/],
    ['tablerow',  '!table', /^\|\|.*\|\|.*$/mg, /((?:\|\|)+)(!?)/g],
    ['tableattr', '!table', /^(\|\|)(.*)($)/mg],

    // wikitrails
    ['trail1', '=url', /(<<?\|)(.*?)(\|>>?)/g],
    ['trail2', '=url', /(\^\|)(.*?)(\|\^)/g],

    ['pipe', 'punct', /\|/g], // inline, after trails

    // may contain inline markup
    ['deflist', '=bullet', /^([:]+)(.*?)([:])/mg],
    ['headingid', 'url', /^!{1,6}[#][a-z_][-a-z0-9_]*/img, /[#][a-z_][-a-z0-9_]*/i],
    ['heading', '=heading', /^(!{1,6})(.*)($)/mg],

    ['cleanup', PHSC, /[<>&]+/g],// raw HTML/XSS
    ['restore', '.restore', restoreRX],
    ['_end']
  ];
  var custom_hrx = {}, sorted_hrx = [];
  var hl = hrx.length;
  for(var i=0; i<hl; i++) {
    custom_hrx[ hrx[i][0] ] = [];
    custom_hrx[ '>'+hrx[i][0] ] = [];
  }


  function PmHi(text) {
    var KPV = [];
    function Restore(all, n) { return KPV[parseInt(n)]; }
    function keep0(text) {
      if(text === '') return '';
      KPV.push(text.replace(restoreRX, Restore));
      return KeepToken+(KPV.length-1)+KeepToken;
    }
    function Keep(text, cname) {
      if(text==='') return '';
      text = span(cname, text);
      return keep0(text);
    }
    function Keep5(parts, cname) {
      var mode = cname.charAt(0);
      var attr = parts[4] || mode == '!' ? true:false;
      var out = '';
      if(parts[0]) out += span('tag', parts[0]);
      if(parts[1]) out += attr ? hattr(parts[1]) : PHSC(parts[1]);
      if(parts[2]) out += span('tag', parts[2]);
      if(parts[3]) out += mode == '!' ? hattr(parts[3]) : PHSC(parts[3]);
      if(parts[4]) out += span('tag', parts[4]);
      if(!out) return '';
      else out = span(cname.slice(1), out, true);
      return keep0(out);
    }
    function hattr(attr) {
      if(! attr) return '';
      attr = attr.toString()
      .replace(/(['"])(.*?)\1/g, function(a){ return Keep(a, 'value'); })
      .replace(/((?:\$:?)?[-\w]+|^)([:=])(\S+)/g, function(a, attr, op, val){
        if(! val.match(Kept)) val = span('value', val);
        if(attr) attr = span('attr', attr);
        return keep0(attr + op + val);
      })
      .replace(/(\()(\w+)/g, function(a, attr, expr){
        return Keep(attr, '*attr')+Keep(expr, 'tag');
      })
      .replace(special, function(a){ return Keep(a, '*attr'); });
      return PHSC(attr);
    }
    function external(lang, code) {
      if(lang.match(/^pm(wiki)?$/i))
        return keep0(PmHi(code));
      if(!lang) { }
      else if(! externalLangs
        || lang == 'plaintext'
        || ! lang.match(externalLangs)
      ) return keep0(PHSC(code));
      try {
        if(lang) {
          var x = hljs.highlight(code, {language:lang, ignoreIllegals:true});
        }
        else var x = hljs.highlightAuto(code);
        return keep0('<code class="hljs language-'+x.language+'" title="'+x.language+'">'
          +x.value+'</code>');
      }
      catch(e) {
        return keep0(PHSC(code));
      }
    }
    function bracketlink(m, m1, m2, m3){
      var a = m2.match(/^(.+)( *\|.+)$/);
      if(a) return m1+Keep(a[1], 'url')+a[2]+m3;
      a = m2.match(/^(.+-> *)(.+)$/);
      if(a) return m1+a[1]+Keep(a[2], 'url')+m3;
      return m1+Keep(m2, 'url')+m3;
    }
    
    function PmHi1(text, rule){
      var r = rule[0], s = rule[1];
      if(r == '.restore') return text.replace(s, Restore);
      if(typeof r == 'string' && r.indexOf('external')===0) {
        var b = r.match(/[>]([-\w+]+)/);
        return text.replace(s, function(a, a1, a2){
          var lang = b? b[1] : a1;
          var code = b? a1 : a2;
          if(!code.match(/\S/)) return a;
          if(!lang) lang = '';
          return a.replace(code, external(lang.toLowerCase(), code));
        });
      }
      if(!!rule[2]) {
        var m = (typeof r == 'function') ? false : r.split(/[>]/g);
        if(m && m.length>1) { // parent>nested
          r = m[0];
          return text.replace(s, function(a){
            var b = Array.from(arguments).slice(1, -2);
            var j = b[4]? 3:1;
            var ml = m.length;
            for(var i=1; i<ml; i++) {
              if(rule[i+1]) b[j] = PmHi1(b[j], [m[i], rule[i+1]]);
            }
            return Keep5(b, r);
          });
        }
        else { // one classname, return match only_in_container
          return text.replace(s, function(a){
            return PmHi1(a, [r, rule[2]]);
          });
        }
      }
      if(typeof r == 'function') return text.replace(s, r);
      if(r == 'bracketlink') return text.replace(s, bracketlink);
      text = text.replace(s, function(a){
        var b = Array.from(arguments).slice(1, -2);
        if(r.match(/^[=!]/)) return Keep5(b, r);
        else return Keep(a, r);
      });
      return text;
    }
    var sl = sorted_hrx.length;
    for(var i=0; i<sl; i++) {
      var rule = sorted_hrx[i];
      if(rule.length<2)  continue; // _begin, _end
      text = PmHi1(text, rule);
    }
    return text;
  }

  function PmHiEl(el){
    el.innerHTML = PmHi(el.textContent);
    el.classList.add('pmhlt');
  }

  function PmHiAll(){
    var hlt = dqsa('.hlt.pm, .hlt.pmwiki, .highlight.pm, .highlight.pmwiki');
    var hl = hlt.length;
    for(var i=0; i< hl; i++) hlt[i].className = 'pmhlt';
    var pm = dqsa('table.markup td.markup1 > pre, '
      + '.pmhlt pre, .pmhlt + pre, .pmhlt code, pre.pmhlt, code.pmhlt');
    if(! pm.length) return;
    pm.forEach(PmHiEl);
    tap('.toggle-pmhlt', toggleStyles);
  }

  function toggleStyles(e) {
    e.preventDefault();
    var c1 = 'pmhlt', c2 = 'pmhlt-disabled';
    var x = dqsa('.'+c1+',.'+c2);
    var xl = x.length;
    for(var i=0; i<xl; i++) {
      x[i].classList.toggle(c1);
      x[i].classList.toggle(c2);
    }
  }

  function str2rx(str) {
    if(typeof str.flags == 'string') return str; // regexp
    if(typeof str != 'string') {
      echo("Not a string", str);
      return false;
    }
    var a = str.match(/^\/(.*)\/([gimsyu]*)$/);
    var rx = false
    try {
      if(a) {
        rx = new RegExp(a[1], a[2]);
      }
      else rx = new RegExp(str, 'g');
    }
    catch(e) {
      echo('Could not create RegExp.', str);
    }
    if(rx) {
      if(rx.source.match(/\[(\\s\\S)|(\\S\\s)\]/)) {
        PreserveMultilineArray.push(rx.source);
      }
      return rx;
    }
  }

  var PreserveMultilineArray = [], PreserveMultiline = false;
  function sortRX(){
    var cm = window.PmSyntaxCustomMarkup??[]; // may be added by a recipe.js
    var imaps =  [Config.imaps.join('|')];
    
    var custom = Config.custom;
    var ll = custom.length;
    for(var i=0; i<ll; i++) {
      var rule = custom[i];
      if(typeof rule == 'string') rule = rule.trim().split(/\s{2,}/g);
      if(rule[0]=='InterMap') {
        imaps.push(rule[1]);
        continue;
      }
      var rl = rule.length;
      for(var j=2; j<rl; j++) {
        var r = str2rx(rule[j]);
        if(r) rule[j] = r;
      }
      cm.push(rule);
    }
    
    var uec = '<>"{}|\\\\^`()[\\]\'';
    cm.push(['>_url', 'url', new RegExp(
      '\\b(' +imaps.join('|')+ ')[^\\s'+uec+']*[^\\s.,?!'+uec+']', 'g'
    )]);
    var cml = cm.length;
    for(var i=0; i<cml; i++) {
      var key = cm[i][0].replace(/^</, '');
      if(custom_hrx.hasOwnProperty(key)) custom_hrx[key].push(cm[i].slice(1));
      else echo('No rule name to attach to.', cm[i]);
    }
    sorted_hrx = [];
    var hrxl = hrx.length;
    for(var i=0; i<hrxl; i++) {
      var key = hrx[i][0];
      var keys = [key, '>'+key];
      for(var k=0; k<2; k++) {
        if(k) sorted_hrx.push(hrx[i].slice(1));
        var kk = keys[k];
        var chl = custom_hrx[kk].length;
        for(var j=0; j<chl; j++) {
          sorted_hrx.push(custom_hrx[kk][j]);
        }
      }
    }
    if(PreserveMultilineArray.length) {
      PreserveMultiline = new RegExp('('+PreserveMultilineArray.join('|')+')', 'g');
    }
  }

  function initEditForm(){
    if(!Config || !Config.mode || !Config.mode.match(/^[23]$/)) return;
    var text = dqs('#wikiedit textarea#text');
    if(text) text.classList.add('pmsyntax');
    var datas = dqsa('textarea[data-pmsyntax]');
    for(var d of datas) d.classList.add('pmsyntax');
    var all = dqsa('textarea.pmsyntax');
    for(var t of all) hltEditForm(t);
  }
  
  function hltEditForm(text){
    var chk_hlt, hwrap, htext;
    var defaultEnabled = Config.mode == '3'? 1: 0;

    var lastTextParts = [];
    var lastTextContent = false;
    var hltEnabled = false;
    var EnableStopwatch = getLS('EnablePmSyntaxStopwatch')? true:false;
    var resizeObserver;

    var perf = [];
    function stopwatch(dt) {
      perf.push(dt);
      let rdt = rnd(dt);
      let avg = rnd(average(perf));
      let a10 = rnd(average(perf.slice(-10)));
      if(perf.length%10 == 0)
        echo(`PmSyntax ${rdt}ms@1, ${a10}ms@10, ${avg}ms@${perf.length}.`);
    }
    
    let scheduled = false;
    function scheduleUpdate() {
      if (scheduled || !hltEnabled) return;
      scheduled = true;
      requestAnimationFrame(updatePre);
    }
  
    function updatePre(stamp) {
      var tc = text.value;
      if(tc===lastTextContent) {
        scheduled = false;
        return;
      }
      var parts = splitParts(tc);
      if(!parts.length) parts = [''];
      
      if(lastTextParts.length==0) {
        var out = parts.map(mapHi).join('') + '\n';
        adjab(htext, out);
        var juststarted = 1;
      }
      else {
        var diff = diffParts(parts);
        var spans = htext.children;
        for(var i=0; i<diff.count; i++) {
          htext.removeChild(spans[diff.first]);
        }
        if(diff.add) {
          if(spans[diff.first]) adjbb(spans[diff.first], diff.add);
          else if(spans[diff.first-1]) adjae(spans[diff.first-1], diff.add);
          else adjab(htext, diff.add);
        }
      }
      lastTextContent = tc;
      lastTextParts = parts;
      textScrolled();
      if(EnableStopwatch && stamp) stopwatch(performance.now() - stamp);
      if(juststarted) perf = [];
      scheduled = false;
    }
    
    function mapHi(x) {
      if(x!=='' && x.charAt(0) !== '\n') x = PmHi(x);
      return '<span>'+x+'</span>';
    }
    
    function splitParts(value) {
      var kept = [];
      function keep(a, a1){
        kept.push(restore(a1));
        return '\034\034' + (kept.length - 1) + '\034\034';
      };
      function restore(str) {
        return str.replace(/\034\034(\d+)\034\034/g, function(a, a1){
          return kept[parseInt(a1)];
        });
      }
      // keep escaped blocks
      value = value
        .replace(/(\[([@=])[\s\S]*?\2\]|\(:[-\w]+ *:(?!\))[\s\S]*?:\)|\\\n)/g, keep);
      if(PreserveMultiline) {
        value = value.replace(PreserveMultiline, keep);
      }
      
      var parts = value.split(/(\n+)/).filter(Boolean);
      for(var i=0; i<parts.length; i++) {
        parts[i] = restore(parts[i]);
      }
      return parts;
    }
    function diffParts(parts) {
      var ll = lastTextParts.slice(0), pp = parts.slice(0), firstchanged = 0;
      while(ll.length && pp.length) {
        if(ll[0] !== pp[0]) break;
        ll.shift(); pp.shift();
        firstchanged++;
      }
      ll.reverse(); pp.reverse();
      while(ll.length && pp.length) {
        if(ll[0] !== pp[0]) break;
        ll.shift(); pp.shift();
      }
      var add = pp.reverse().map(mapHi).join('');
      return {first:firstchanged, count:ll.length, newcount:pp.length, add:add};
    }
    
    function textScrolled() {
      if(!hltEnabled) return;
      if(ignoreTextScrolled) return;

      if(ignorePreScrolled) clearTimeout(ignorePreScrolled-1);
      ignorePreScrolled = 1 + setTimeout(nullIPS, 100);
      htext.scrollTop = text.scrollTop;
      htext.scrollLeft = text.scrollLeft;
    }
    var ignoreTextScrolled = false, ignorePreScrolled = false;
    function preScrolled() { // browser's in-page search
      if(!hltEnabled) return;
      if(ignorePreScrolled) return;
      if(ignoreTextScrolled) clearTimeout(ignoreTextScrolled-1);
      ignoreTextScrolled = 1 + setTimeout(nullITS, 100);
      text.scrollTop = htext.scrollTop;
      text.scrollLeft = htext.scrollLeft;
    }
    function nullITS(){ignoreTextScrolled = false;}
    function nullIPS(){ignorePreScrolled = false;}
    function dragstart(e) { this.classList.add('dragging'); }
    function dragend(e) { this.classList.remove('dragging'); }

    function resizePre() {
      if(!hltEnabled) return;
      var rect = gbcr(text);
      var w = rect.width + 'px', h = rect.height + 'px';
      htext.style.width = w;
      htext.style.height = h;
      textScrolled();
    }
    
    function initPre() {
      hwrap = dce('div', {className: 'hwrap'});
      adjbb(text, hwrap);
      hwrap.appendChild(text);
      htext = dce('div', {className: 'htext pmhlt', inert: true});
      hwrap.appendChild(htext);
      
      updatePre();
      resizePre();

      htext.style.textAlign =  gcs(text, 'text-align');
      aE(htext, 'scroll', preScrolled);
      
      aE(text, 'scroll', textScrolled);
      aE(text, 'dragstart', dragstart);
      aE(text, 'dragend', dragend);

      resizeObserver = new ResizeObserver(resizePre);
      resizeObserver.observe(text);
      if(text.autofocus) text.focus();
    }
    
    function storeEnabled(enabled) {
      if(enabled != defaultEnabled) setLS('EnableHighlight', enabled);
      else delLS('EnableHighlight');
    }

    function EnableHighlight() {
      if(hltEnabled) {
        if(chk_hlt) chk_hlt.classList.add('pmhlt');
        text.classList.add('hot');
        storeEnabled(1);
        updatePre();
        resizePre();
        aE(text, 'input', scheduleUpdate);
      }
      else {
        if(chk_hlt) chk_hlt.classList.remove('pmhlt');
        text.classList.remove('hot');
        lastTextContent = false;
        storeEnabled(0);
        rE(text, 'input', scheduleUpdate);
      }
    }

    function initToggle(x){
      var form = text.closest('form');
      if(form && text.id == 'text') {
        chk_hlt = dce('code', {
          className:'chk_hlt',
          innerHTML: '<span class="pmpunct">[[</span><span class="pmurl">'
          + Config.label
          + '</span><span class="pmpunct">]]</span>'
        });
        adjab(form, chk_hlt);
        tap(chk_hlt, function(e){
          hltEnabled = !hltEnabled;
          EnableHighlight();
        });
      }

      initPre();
      var stored = getLS('EnableHighlight');
      var enabled = (stored===null) ? defaultEnabled : intval(stored);
      if(enabled) {
        hltEnabled = true;
        EnableHighlight();
      }
    }
    
    aE(text, 'keydown', function(e) {
      if(e.key == 'F8') {
        e.preventDefault();
        hltEnabled = !hltEnabled;
        EnableHighlight();
      }
    });
    
    initToggle();
  }

  var externalLangs = false;
  function initExtLangs() {
    if(typeof hljs == 'undefined') return;
    var langs = hljs.listLanguages();
    var aliases = langs.slice(0);
    var ll = langs.length
    for(var i=0; i<ll; i++) {
      var l = hljs.getLanguage(langs[i]);
      if(l.aliases) aliases = aliases.concat(l.aliases);
    }
    externalLangs = new RegExp('^('+aliases.join('|').replace(/[+]/g, '\\+')+')$', 'i');
  }

  ready(function(){
    sortRX();
    initExtLangs();
    PmHiAll();
    initEditForm();
  });
})(document.currentScript);

