/*  Copyright 2004-2026 Patrick R. Michaud (pmichaud@pobox.com)
    This file is part of PmWiki; you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published
    by the Free Software Foundation; either version 2 of the License, or
    (at your option) any later version.  See pmwiki.php for full details.

    This file provides JavaScript functions to support WYSIWYG-style
    editing.  The concepts are borrowed from the editor used in Wikipedia,
    but the code has been rewritten from scratch to integrate better with
    PHP and PmWiki's codebase.

    Script partly written by and maintained by Petko Yotov pmwiki.org/petko
*/

function insButton(mopen, mclose, mtext, mlabel, mkey) {
  if (mkey > '') { mkey = 'accesskey="' + mkey + '" ' }
  document.write("<a tabindex='-1' " + mkey + "onclick=\"insMarkup('"
    + mopen + "','"
    + mclose + "','"
    + mtext + "');\">"
    + mlabel + "</a>");
}

function insMarkup() {
  const { echo, fire, itext } = PmLib;
  var func = false, tid='text', mopen = '', mclose = '', mtext = '', unselect = false;
  const e = arguments[3] instanceof Event ? arguments[3] : null;
  
  if (arguments[0] == 'FixSelectedURL') {
    func = FixSelectedURL;
  }
  else if (typeof arguments[0] == 'function') {
    var func = arguments[0];
    if(arguments.length > 1) tid = arguments[1];
    x = func('', e);
    if(typeof x == 'object') {
      if(x.mopen) mopen = x.mopen;
      if(x.mclose) mclose = x.mclose;
      if(x.mtext) mtext = x.mtext;
      if(x.unselect) unselect = x.unselect;
    }
    else {
      mtext = x;
    }
  }
  else if (arguments.length >= 3) {
    mopen = arguments[0], mclose = arguments[1], mtext = arguments[2];
    if(arguments.length > 3 && !arguments[3] instanceof Event) tid = arguments[3];
  }
  var tarea;
  if(tid instanceof Element) tarea = tid;
  else if(typeof tid == 'string') tarea = document.getElementById(tid);
  if(!tarea) return;
  if (tarea.setSelectionRange > '') { // recent browsers
    var p0 = tarea.selectionStart;
    var p1 = tarea.selectionEnd;
    var top = tarea.scrollTop;
    var str = mtext;
    while (p1 > p0 && tarea.value.substring(p1-1, p1).match(/\s/)) {
      tarea.selectionEnd = --p1;
    }
    if (p1 > p0) {
      str = tarea.value.substring(p0, p1);
      if(func) str = func(str, e);
      if(str===null) return;
    }
    var cur0 = p0 + mopen.length;
    var cur1 = cur0 + str.length;
    
    if(document.execCommand) {
      tarea.focus();
      itext(mopen + str + mclose);
    }
    else {
      tarea.value = tarea.value.substring(0,p0)
        + mopen + str + mclose
        + tarea.value.substring(p1);
      tarea.focus();
    }
    tarea.selectionStart = unselect? cur1 : cur0;
    tarea.selectionEnd = cur1;
    tarea.scrollTop = top;
  } else if (document.selection) {
    var str = document.selection.createRange().text;
    tarea.focus();
    range = document.selection.createRange();
    if (str == '') {
      range.text = mopen + mtext + mclose;
      range.moveStart('character', -mclose.length - mtext.length );
      range.moveEnd('character', -mclose.length );
    } else {
      if (str.charAt(str.length - 1) == " ") {
        mclose = mclose + " ";
        str = str.substr(0, str.length - 1);
        if(func) str = func(str);
      }
      range.text = mopen + str + mclose;
    }
    if (!unselect) range.select();
  } else { tarea.value += mopen + mtext + mclose; }
  fire.input(tarea);
  return;
}

function FixSelectedURL(str, e) {
  function coreencode(str) {
    var rx = new RegExp("[ <>\"{}|\\\\^`()\\[\\]'*!]", 'g');
    str = str.replace(rx, function(a){
      return '%'+a.charCodeAt(0).toString(16); });
    return str;
  }
  if(e.shiftKey) return coreencode(encodeURIComponent(str));
  if(e.ctrlKey) {
    try {
      let san = str.replace(/%(?![0-9A-F]{2})/gi, '%25');
      return decodeURIComponent(san);
    }
    catch(er) {
      console.error(er);
      return null;
    }
  }
  return coreencode(str);
}

(function(script){
  const {q, Q, jP, aE, sa, on, cl, adj, tap, dce, ready, 
    getLS, itext, echo, pdsp, min, max, time, fire} = PmLib;
  /*
   *  New GUI edit buttons, without inline JavaScript
   *  (c) 2025-2026 Petko Yotov www.pmwiki.org/petko
   */
  function newButtons(){
    
    var el = q('.GUIButtons');
    if(! el) return;
    
    function unxp(a) {
      if(typeof a == 'number') return a;
      if(typeof a == 'string')
        return a.replace(/\\n/g, '\n')
        .replace(/\\\\/g, '\\').replace(/%25/g, '%');
      var b = [];
      for(var i=0; i<a.length; i++) {
        b[i] = unxp(a[i]);
      }
      return b;
    }
    var buttons = unxp(jP(el.dataset.json, []));
    
    for(var i=0; i<buttons.length; i++) {
      var b = buttons[i];
      if(!b || !b.length) continue;
      var mopen=b[1], mclose=b[2], mtext=b[3], tag=b[4], mkey=b[5];
      if(tag.charAt(0) == '<') { 
        adj.be(el, tag);
        continue;
      }
      var x = tag.match(/^(.*\.(gif|jpg|png|webp|svg))("([^"]+)")?$/);
      if(x) {
        tag = dce.img({src:x[1], alt:x[4], title:x[4]});
      }
      
      var attr = { 
        tabindex: -1, 
        'data-mopen': mopen,
        'data-mclose': mclose,
        'data-mtext': mtext
      };
      if(mkey) attr.accessKey = mkey;
      var a = dce.a({
        className: 'newbutton', 
        attr
      });
      adj.ab(a, tag);
      el.appendChild(a);
    }
    tap('.GUIButtons a.newbutton', function(e){
      let {mopen, mclose, mtext} = this.dataset;
      insMarkup(mopen, mclose, mtext, e);
    });
  }
  
  /*
   *  Edit helper for PmWiki
   *  (c) 2016-2026 Petko Yotov www.pmwiki.org/petko
   */
  
  function insertlink(sk) {
    let { sel } = sk.vars;
    if(sel.match(/\[\[|\]\]/)) {
      sk.stext = sel.replace(/\[\[[!~#]?|\]\]/g, '');
      delete sk.cyclewrap;
    }
  }
  
  function cyclewrap(sk) {
    let { that, sel, before, after } = sk.vars;
    for(let i=0; i< sk.cyclewrap.length; i++) {
      let [a, b] = sk.cyclewrap[i].split(/\.\.\./);
      if(before.slice(-a.length)!==a) continue;
      if(after.slice(0, b.length)!==b) continue;
      let next = (i+1) % sk.cyclewrap.length;
      let [c, d] = sk.cyclewrap[next].split(/\.\.\./);
      that.selectionStart -= a.length;
      that.selectionEnd += b.length;
      let sstart = that.selectionStart;
      itext(c+sel+d);
      that.selectionStart = sstart+c.length;
      that.selectionEnd -= d.length;
      return;
    }
    sk.insm = sk.cyclewrap[0].split(/\.\.\./);
  }
  
  function insertnbsp(sk) {
    let { sel } = sk.vars;
    if(sel.includes('&nbsp;')) sk.stext = sel.replace(/&nbsp;/g, ' ');
    else if(sel) sk.stext = sel.replace(/ /g, '&nbsp;');
    else sk.text = '&nbsp;';
  }
  
  function cyclecase(sk){
    let { sel } = sk.vars;
    let sel1 = sel+'';
    let lower = sel1.toLocaleLowerCase();
    const upper = sel1.toLocaleUpperCase();
    const title = lower.replace(/(^|[^\p{L}])(\p{L})/gu, function(a,b,c){ return ''+b+c.toLocaleUpperCase();});
    let replacement;
    if(sel === lower) replacement = title;
    else if (sel === title) replacement = upper;
    else replacement = lower;
    sk.stext = replacement;
  }
  function insertlinebreak(sk) {
    let { sel } = sk.vars;
    if(sel.includes('\\\n')) sk.stext = sel.replace(/\\\\+\n/g, '\n');
    else if(sel) sk.stext = sel.replace(/\n/g, '\\\\\n');
    else sk.text = "\\\\\n";
  }
  function joinlines(sk) {
    let { sel, that, multiline, after, caret } = sk.vars;
    
    if(!multiline) {
      let c = after.match(/[^\n]*\n */);
      if(c) {
        that.selectionEnd += c[0].length;
        sel += c[0];
      }
    }
    nsel = sel.replace(/ *\\*[\r\n]+ */g, ' ');
    itext(nsel);
    that.selectionEnd = caret+nsel.length;
  }
  function deletelines(sk) {
    let { linesbefore, linessel, that } = sk.vars;
    that.selectionStart = linesbefore.length;
    that.selectionEnd = linesbefore.length+linessel.length;
    if(linessel.slice(-1)!='\n' && linesbefore.slice(-1)=='\n')
      that.selectionStart -= 1;
    document.execCommand('delete');
  }
  
  function elocate(sk) {
    let { caret, endcaret, content, that } = sk.vars;
    let [rx, above] = sk.locate;
    
    let c1 = caret+0, c2=endcaret+0;
    const matches = content.matchAll(rx);
    
    for(const match of matches) {
      if(above && match.index>=caret) break;
      if(!above && match.index<=caret) continue;
      c1 = match.index, c2 = match.index + match[0].length;
      if(above) continue;
      if(c1>endcaret) break;
    }
    if(c1==caret && c2==endcaret) return;
    that.selectionStart = that.selectionEnd = c1;
    time.out(.01, function(){that.selectionEnd = c2;});
    sk.rf = 1;
  }

  function swaplines(sk) {
    let {linesbefore, linesafter, that, caret, endcaret, linessel} = sk.vars;
    if(sk.up) {
      a = linesbefore.match(/[^\n]*\n$/);
      if(!a) return;
      var lineA = linessel, lineB = a[0];
      var deltacaret = -lineB.length;
    }
    else {
      a = linesafter.match(/^([^\n]+$|[^\n]*\n)/);
      if(!a) return;
      var lineA = a[0], lineB = linessel;
      var deltacaret = lineA.length;
    }
    if(!lineA.match(/\n$/)) { // last line
      lineB = "\n" + lineB.slice(0, -1);
      if(deltacaret>0) deltacaret+=1;
    }
    var insert = lineA + lineB;
    that.selectionStart = linesbefore.length + Math.min(deltacaret,0);
    that.selectionEnd = that.selectionStart + insert.length;
    itext(insert);
    that.selectionStart = caret + deltacaret;
    that.selectionEnd = endcaret + deltacaret;
  }
  
  function insertwikistyle(sk) {
    sk.insm = sk.vars.multiline? ['>><<\n', '\n>><<\n'] : ['%%', '%%'];
  }
  
  function autoprefix(vars) {
    let { that, caret, endcaret, content, e} = vars;
    var before = content.substring(0, caret).split(/\n/g);
    var after  = content.substring(endcaret);
    var currline = before[before.length-1];
    var linestartpos = content.lastIndexOf('\n', Math.max(0,caret-1));
    
    var bs = currline.match(/\\$/); // line ending with a \ backslash
    var m = currline.match(/^((?: *\*+| *\#+|-+[<>]| *-+| *>+|:+|\|\|| ) *)/);
    if(bs || !m) return true;
    pdsp(e, 1);
    var insert;
    if(currline==m[1] && (after === '' || after.charAt(0) == '\n')) {
      insert = "\n";
      if(linestartpos<0) {
        linestartpos = 0;
        that.selectionEnd += 1;
      }
      that.selectionStart = linestartpos;
      caret = caret - currline.length - 1;
      before = before.slice(0,-1);
    }
    else {
      insert = "\n"+m[1];
    }
    itext(insert);
    
    that.selectionStart = caret + insert.length;
    that.selectionEnd = caret + insert.length;
    
  }
  
  let anchorx = /\[\[#[-\w.]+ *\]\]|^!+#[-\w.]+/mg;
  PmLib.EditShortcuts = {
    NBS: { fn:insertnbsp, label:'Non-breaking space &nbsp;', keys:'P_space' },
    BLD: { insm:["'''", "'''"], label: "Bold text '''...'''", keys:'P_b' },
    ITL: { insm:["''", "''"], label: "Italics ''...''", keys:'P_i' },
    LBR: { fn:insertlinebreak, label: "Line break \\\\", keys:'S_enter' },
    BRC: { text:"[[<<]]", label: "Line break clear all [[<<]]", keys:'P_enter' },
    SIG: { text:"~~~~", label: "Signature ~~~~", keys:'PS_enter' },
    ESC: { label: "Escape text [=...=]", keys:'P_e',
      cyclewrap: ['[=...=]', '@@...@@', '%hlt%[@...@]%%', '%pmhlt%[@...@]%%', '[@...@]'] },
    DIR: { insm:['(:', ':)'], label: "Directive (:...:)", keys:'PS_d' },
    MEX: { insm:['{(', ')}'], label: "Markup Expression {(...)}", keys:'PS_m' },
    WKS: { fn: insertwikistyle, label: "WikiStyle %%...%% or >><<...>><<", keys:'PS_s' },
    TGC: { fn:cyclecase, label: "Cycle case lower-title-upper", keys:'PS_l' },
    JNL: { rf:1, fn: joinlines, label: "Join lines", keys:'P_j' },
    DLL: { fn: deletelines, label: "Delete lines", keys:'PS_j' },
    NXH: { locate: [/^!.*$/mg, 0], label: "Next heading", keys:'P_arrowdown' },
    PRH: { locate: [/^!.*$/mg, 1], label: "Previous heading", keys:'P_arrowup' },
    NXA: { locate: [anchorx, 0], label: "Next anchor", keys:'A_arrowdown' },
    PRA: { locate: [anchorx, 1], label: "Previous anchor", keys:'A_arrowup' },
    MLU: { rf:1, fn:swaplines, up:1, label: "Move lines up",   keys:'PS_arrowup' },
    MLD: { rf:1, fn:swaplines, up:0, label: "Move lines down", keys:'PS_arrowdown' },
    VAR: { label: "Cycle Variable {*$...} {=$:...}", keys:'PS_v',
      cyclewrap: ['{*$...}', '{*$:...}', '{$...}', '{$:...}', '{$$...}', '{=$...}', '{=$:...}'],
    },
    LNK: { fn:insertlink, label: "Link/Unlink", keys:'P_k',
      cyclewrap: ['[[...]]', '[[#...]]', '[[!...]]', '[[~...]]', 
        '[[(Attach:)...]]', '[[(mailto:)...]]'],
    }
  };
  
  let customkeys = getLS('customshortcuts', {});
  for(let id in PmLib.EditShortcuts) {
    let curr = PmLib.EditShortcuts[id];
    if(typeof customkeys[id] == 'string') curr.keys = customkeys[id];
  }
  
  var AutoBrackets = PmLib.jP(script.dataset.autobrackets, {});
  let abmap = { '(':')', '[':']', '{':'}', '<':'>', '>':'<', };
  if(!AutoBrackets.map) AutoBrackets.map = abmap;
  function EditAutoText(e){
    const {getLS, itext, echo, pdsp, min, max, time, fire} = PmLib;
    var caret = this.selectionStart, endcaret = this.selectionEnd;
    if(typeof caret != 'number') return true; // old MSIE, sorry
    
    var content = this.value;
    var before = content.slice(0, caret), 
      after = content.slice(endcaret), 
      sel = content.substring(caret, endcaret);
    var multiline = sel.includes("\n");
    var linesbefore = '', linesafter = '', linessel = sel+'';
    var b = before.match(/[^\n]+$/);
    if(b) {
      linessel = b[0]+sel;
      linesbefore = before.slice(0, -b[0].length);
    }
    else if(before.slice(-1)=='\n') linesbefore = before;
    var a = after.match(/^[^\n]*(\n|$)/);
    linessel = linessel+a[0];
    linesafter = after.slice(a[0].length);
    const that = this;
    
    var C=e.ctrlKey, M=e.metaKey, A=e.altKey, S=e.shiftKey, k=e.key.toLowerCase();
    var P = navigator.platform.toUpperCase().indexOf('MAC') >= 0 ? M:C;
    var mod0 = (A?'A':'') + (C?'C':'') + (M?'M':'');
    var mod1 = mod0 + (S?'S':'');
    var mod2 = (A?'A':'') + (P?'P':'') + (S?'S':'');
    if(k===' ') k = 'space';
    var keys1 = `${mod1}_${k}`, keys2 = `${mod2}_${k}`;
    
    let vars = { e, C, M, A, S, P, k, that, caret, endcaret, mod0, mod1, mod2, keys1, keys2,
      sel, content, before, after, linesbefore, linesafter, linessel, multiline };
    
    if(keys1 == '_enter') return autoprefix(vars);
    if(!mod0 && AutoBrackets) {
      
      let kk=false, map = AutoBrackets.map;
      if(AutoBrackets[k]) kk = AutoBrackets[k]; // deprecated
      else if(sel && AutoBrackets.selection?.includes(k)) {
        kk = k in map ? map[k] : k;
      }
      else if(!sel && AutoBrackets.cursor?.includes(k)) {
        kk = k in map ? map[k] : k;
      }
      if(kk!==false) {
        pdsp(e, 1);
        return insMarkup(k, kk, '', this);
      }
    }
    
    let shortcuts = PmLib.EditShortcuts;
    
    let sk = false;
    for(let id in shortcuts) {
      let curr = shortcuts[id];
      let currkeys = curr.keys.split(/ /);
      for(let kk of currkeys) {
        if(kk == keys2 || kk == keys1) {
          sk = curr; break;
        }
      }
      if(sk) break;
    }
    
    if(sk) {
      sk = {...sk, vars};
      if(sk.fn) sk.fn(sk);
      if(sk.cyclewrap) cyclewrap(sk);
      if(typeof sk.text === 'string') {itext(sk.text); sk.nfi=1;}
      if(typeof sk.stext === 'string') { itext(sk.stext); sk.nfi=1; that.selectionStart = caret; }
      if(sk.insm) insMarkup(...sk.insm, '', that);
      if(sk.locate) elocate(sk);
      if(sk.rf) {that.blur(); that.focus();};
      if(!sk.npd) pdsp(e, 1);
      if(!sk.locate && !sk.nfi) fire.input(that);
      return false;
    }

  }
  
  
  ready(function(){
    
    newButtons();
    
    var sTop = q("#textScrollTop");
    var tarea = q('#text');
    if(sTop && tarea) {
      if(sTop.value && !tarea.autofocus) tarea.scrollTop = sTop.value;
      on.submit(sTop.form, function(){
        sTop.value = tarea.scrollTop;
      });
    }
    
    let text = q('textarea#text');
    if(text && q('#EnableEditAutoText')) cl.a(text, 'autotext');
    on.keydown('textarea.autotext', EditAutoText);
    let csum = text?.form?.csum;
    if(csum) 
      on.change('input[name="diffclass"][data-prev]', function(e){
        if(this.checked && csum.value==='') 
          csum.value = this.dataset.prev;
      });
  });
  
})(document.currentScript);


