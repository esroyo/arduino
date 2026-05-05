/*
  JavaScript utilities for PmWiki
  (c) 2009-2026 Petko Yotov www.pmwiki.org/petko
  based on PmWiki addons DeObMail, AutoTOC and Ape
  licensed GNU GPLv2 or any more recent version released by the FSF.

  libsortable() "Sortable tables" adapted for PmWiki from
  a Public Domain event listener by github.com/tofsjonas
*/

(async function(__script__){
  
  const { echo, err, Now, q, Q, D, PHSC, dce, ga, time,
    css, cl, min, max, minmax, floor, floatval, intval, sp,
    abs, zpad, ls, jP, getConf, on, once, fire, tap, pdsp, isHidden,
    adj, afetch, posy, mkDrag, gcs, ready, unref} = PmLib;
    
  var Config = getConf(__script__);
  
  if(Config.rediquiet) {
    var url = location.href.replace(/\?from=[^?&#]*[&]quiet=1/, '');
    if(url != location.href) 
      history.replaceState(null, null, url);
  }

  var wikitext;

  function PmXMail() {
    var els = Q('span._pmXmail');
    var LinkFmt = '<a href="%u" class="mail">%t</a>';

    for(let el of els) {
      let x = q('span._t', el);
      let txt = cb_mail(x.innerHTML);
      let y = q('span._m', el);
      let url = cb_mail(y.innerHTML.replace(/^ *-&gt; */, ''));

      if(!url) url = 'mailto:'+txt.replace(/^mailto:/, '');

      url = url.replace(/"/g, '%22').replace(/'/g, '%27');
      let html = LinkFmt.replace(/%u/g, url).replace(/%t/g, txt);
      el.innerHTML = html;
    }
  }
  function cb_mail(x){
    return x.replace( /<span class=(['"]?)_d\1>[^<]+<\/span>/ig, '.')
      .replace( /<span class=(['"]?)_a\1>[^<]+<\/span>/ig, '@');
  }

  function is_toc_heading(el) {
    if(el.offsetParent === null || isHidden(el)) {return false;}  // hidden
    if(el.closest('.notoc,.markup2')) {return false;} 
    return true;
  }
  
  function any_id(h) {
    if(h.id) {return h.id;} // %id=anchor%
    var a = q('a[id]', h); // inline [[#anchor]]
    if(a && a.id) {return a.id;}
    var prev = h.previousElementSibling;
    if(prev) { // [[#anchor]] before !!heading
      var a = Q('a[id]', prev);
      if(a.length) {
        last = a[a.length-1];
        if(last.id && ! last.nextElementSibling) {
          var atop = posy(last) + last.offsetHeight;
          var htop = posy(h);
          if( abs(htop-atop)<20 ) {
            h.appendChild(last);
            return last.id;
          }
        }
      }
    }
    return false;
  }

  
  function autotoc() {
    if(q('.noPmTOC')) { return; } // (:notoc:) in page
    var dtoc = Config.pmtoc;
    if(! dtoc.Enable || !dtoc.MaxLevel) { return; } // disabled

    if(dtoc.NumberedHeadings)  {
      var specs = dtoc.NumberedHeadings.toString().split(/\./g);
      for(var i=0; i<specs.length; i++) {
        if(specs[i].match(/^[1AI]$/i)) numheadspec[i] = ''+specs[i];
        else numheadspec[i] = '';
      }
      if(!dtoc.MinNumberedHeadings) dtoc.MinNumberedHeadings = 2;
    }

    var query = [];
    for(var i=1; i<=dtoc.MaxLevel; i++) {
      query.push('h'+i);
    }
    if(dtoc.EnableQMarkup) query.push('p.question');
    var pageheadings = Q(query.join(','), wikitext);
    if(!pageheadings.length) { return; }

    var toc_headings = [ ];
    var minlevel = 1000, hcache = [ ];
    for(var i=0; i<pageheadings.length; i++) {
      var h = pageheadings[i];
      if(! is_toc_heading(h)) {continue;}
      toc_headings.push(h);
    }
    if(! toc_headings.length) return;

    var tocdiv = q('.PmTOCdiv');
    var shouldmaketoc = ( tocdiv || (toc_headings.length >= dtoc.MinNumber && dtoc.MinNumber != -1)) ? 1:0;
    var shouldnumheadings = (dtoc.NumberedHeadings && toc_headings.length >= dtoc.MinNumberedHeadings) ? 1:0;
    if(!shouldnumheadings && !shouldmaketoc) return;

    for(var i=0; i<toc_headings.length; i++) {
      var h = toc_headings[i];
      var level = floatval(h.tagName.substring(1));
      if(! level) level = 6;
      minlevel = min(minlevel, level);
      var id = any_id(h);
      hcache.push([h, level, id]);
    }
    
    var blink = false;
    if(dtoc.EnableBacklinks) {
      let bltip = dtoc.EnableBacklinks === 1 ? dtoc.contents:dtoc.EnableBacklinks;
      blink = dce.a({ href:"#_toc", className:"back-arrow", title:bltip });
    }

    prevlevel = 0;
    var html = '';
    var toclinks = [];
    let frag = dce.template();
    for(var i=0; i<hcache.length; i++) {
      var hc = hcache[i];
      var actual_level = hc[1] - minlevel;

      var currnb = numberheadings(actual_level);
      if(! hc[2]) {
        hc[2] = 'toc-'+currnb.id.replace(/\.+$/g, '');
        hc[0].id = hc[2];
      }
      
      if(shouldmaketoc) {
        frag = frag.cloneNode();
        frag.innerHTML = hc[0].innerHTML;
        
        let se = Q('.sectionedit, .rmTOC', frag.content);
        for(let se1 of se) se1.remove();
        let ke = Q('.kpTOC', frag.content);
        for(let ki=0; ki<ke.length; ki++) {
          let ker = dce.span({textContent:`[kT${ki}kT]`});
          adj.bb(ke[ki], ker);
          ke[ki].remove();
        }
        let txt = PHSC(frag.content.textContent.trim());
        if(ke.length) txt = txt.replace(/\[kT(\d+)kT\]/g, function(a, a1){
          return ke[intval(a1)].outerHTML;
        });
        
        var toclink = dce.a({
          className:'pmtoc-indent' + actual_level,
          href: '#' + hc[2],
          innerHTML: txt
        });
        toclinks.push(toclink);
        if(blink) adj.be(hc[0], blink.cloneNode());
      }
      if(shouldnumheadings) {
        let alevel1 = actual_level+1;
        nhtml = `<span class="pmnumwrap pmnumwrap${alevel1}">${currnb.num} </span>`;
        adj.ab(hc[0], nhtml);
        if(shouldmaketoc) adj.ab(toclink, nhtml);
      }
    }

    if(! shouldmaketoc) return;
 
    var details = dce.details({
      id: '_toc',
      className: 'PmTOCdiv frame'
    });
    if(! ls('closeTOC', dtoc.Closed)) details.open = true;
 
    var sum = dce.summary({textContent: dtoc.contents});
    details.appendChild(sum);
    
    var nav = dce.nav({className:'PmTOCtable'});
    
    for(var a of toclinks) nav.appendChild(a);
    
    details.appendChild(nav);

    if(tocdiv) {
      adj.bb(tocdiv, details);
      tocdiv.remove();
    }
    else {
      if(dtoc.ParentElement && q(dtoc.ParentElement)) {
        adj.ab(q(dtoc.ParentElement), details);
      }
      else {
        var x1 = hcache[0][0];
        var x0 = x1.previousElementSibling;
        if(x0 && x0.matches('.sectionedit.sectionhead')) x1 = x0;
        adj.bb(x1, details);
      }
    }
    
    on.toggle(details, function(e){
      ls.closeTOC = this.open ? '' : 1;
    });

    var hh = location.hash;
    if(hh.length>1) {
      try {
        var cc = q(hh);
        if(cc) cc.scrollIntoView();
      }
      catch(e) { /* may be textfrag */ }
    }
  }

  var numhead = [0, 0, 0, 0, 0, 0, 0];
  var numheadspec = '1 1 1 1 1 1 1'.split(/ /g);
  function numhead_alpha(n, upper) {
    if(!n) return '_';
    var alpha = '', mod, start = upper=='A' ? 65 : 97;
    while (n>0) {
      mod = (n-1)%26;
      alpha = String.fromCharCode(start + mod) + '' + alpha;
      n = (n-mod)/26 | 0;
    }
    return alpha;
  }
  function numhead_roman(n, upper) {
    if(!n) return '_';
    // partially based on http://blog.stevenlevithan.com/?p=65#comment-16107
    var lst = [ [1000,'M'], [900,'CM'], [500,'D'], [400,'CD'], [100,'C'], [90,'XC'],
      [50,'L'], [40,'XL'], [10,'X'], [9,'IX'], [5,'V'], [4,'IV'], [1,'I'] ];
    var roman = '';
    for(var i=0; i<lst.length; i++) {
      while(n>=lst[i][0]) {
        roman += lst[i][1];
        n -= lst[i][0];
      }
    }
    return (upper == 'I') ? roman : roman.toLowerCase();
  }

  function numberheadings(n) {
    if(n<numhead[6]) for(var j=numhead[6]; j>n; j--) numhead[j]=0;
    numhead[6]=n;
    numhead[n]++;
    var qq = '';
    var hh = '';
    for (var j=0; j<=n; j++) {
      let j1 = j+1;
      let curr = numhead[j];
      hh += curr+".";
      let currspec = numheadspec[j];
      if(!currspec.match(/[1ai]/i)) continue;
      if(currspec.match(/a/i)) { curr = numhead_alpha(curr, currspec); }
      else if(currspec.match(/i/i)) { curr = numhead_roman(curr, currspec); }
      qq+= `<span class="pmnum${j1}">${curr}.</span>`;
      
    }
    return {id:hh.replace(/\.$/, ''), num:qq};
  }
  
  function inittableheadfoot(table) {
    let tables = Q('table');
    for(let table of tables) tableheadfoot(table);
  }
  function tableheadfoot(table) {
    if(q('thead,tfoot', table)) return; // non-core table, already ready
    let rows = [...Q(':scope > tbody > tr, :scope > tr', table)];
    let hrows = [], frows = [];
    while(rows.length) {
      if(! onlyheaders(rows[0])) break;
      hrows.push(rows.shift());
    }
    while(rows.length) {
      if(! onlyheaders(rows[rows.length-1])) break;
      frows.unshift(rows.pop());
    }
    if(hrows.length) {
      let thead = dce.thead();
      adj.ab(table, thead);
      for(let row of hrows) thead.appendChild(row);
    }
    if(frows.length) {
      let tfoot = dce.tfoot();
      adj.be(table, tfoot);
      for(let row of frows) tfoot.appendChild(row);
    }
    function onlyheaders(row) {
      let cells = [...row.cells];
      return cells.every(function(cell){return cell.tagName === 'TH';});
    }
  }

  function makesortable() {
    if(! floatval(Config.sortable)) return;
    var tables = Q('table.sortable,table.sortable-footer');
    for(let table of tables) {
      if(q(':scope > tbody > [rowspan]', table)) {
        cl.r(table, 'sortable', 'unsortable');
        cl.r(table, 'sortable-footer', 'unsortable-footer');
        continue;
      }
      cl.a(table, 'sortable');
      sort1table(table);
    }
  }
  const sort1table = function(table) {
    const hrows = Q(':scope > thead > tr, :scope > tfoot > tr', table);
    const hgrid = [], grid = [], rows = [];
    const brows = Q(':scope > tbody > tr', table);
    const tbody = table.tBodies[0];
    let sortcols = table.dataset.sortcols || '';
    sortcols = sortcols.trim().split(/, */);
    
    for(let r=0; r<hrows.length; r++) {
      let row = hrows[r];
      let cells = row.cells;
      for(let cell of cells) {
        let colspan = ga(cell, 'colspan', intval) || 1;
        let rowspan = ga(cell, 'rowspan', intval) || 1;
        while(colspan>=1) {
          let curr = pushgrid(hgrid, '', r, 0);
          if(cell.dataset.sortindex === undefined) {
            cell.dataset.sortindex = curr;
            if(sortcols[curr] == 'x' || q('.nosort', cell)) cl.a(cell, 'nosort');
          }
          for(let k=1; k<rowspan; k++) {
            pushgrid(hgrid, '', r+k, curr);
          }
          colspan--;
        }
      }
    }
    
    for(let r=0; r<brows.length; r++) {
      let row = brows[r];
      let cells = row.cells;
      for(let i=0; i<cells.length; i++) {
        let cell = cells[i];
        let colspan = ga(cell, 'colspan', intval) || 1;
        let value = normval(cell, sortcols[i]??'');
        while(colspan>=1) {
          let curr = pushgrid(grid, value, r, 0);
          colspan--;
        }
      }
    }
    
    for(let i=0; i<grid.length; i++) {
      rows.push({ tr: brows[i], values: grid[i] });
    }
    on.click(hrows, sortbycolumn);
    
    function sortbycolumn(e) {
      if(e.target.closest('a')) return; // links
      const th = e.target.closest('th');
      if(!th || cl.c(th, 'nosort')) return;
      
      let reverse = cl.c(th, 'dir-d');
      let table = this.closest('table');
      
      let prev = Q(':scope > * > * > .dir-d, :scope > * > * > .dir-u', table);
      for (let cell of prev) cl.r(cell, 'dir-u', 'dir-d');
      
      const cname = reverse? 'dir-u': 'dir-d'
      const column = intval(th.dataset.sortindex);
      const altheaders = Q(`:scope > * > * > [data-sortindex="${column}"]`, table);
      for(let cell of altheaders) cl.a(cell, cname);
      
      rows.sort(function(x, y) {
        // adapted from Public Domain code by github.com/tofsjonas
        let A = reverse? y:x, B = reverse? x:y;
        let a = A.values[column] ?? '', b = B.values[column] ?? '';
        let d = a - b;
        if(!isNaN(d)) return d;
        return a.localeCompare(b, undefined, {numeric: true, sensitivity: 'base'});
      });
      for(let row of rows) tbody.appendChild(row.tr);
    }
    
    function pushgrid(grid, val, row, col) {
      if(!grid[row])grid[row] = [];
      if(col) {
        grid[row][col] = val;
        return col;
      }
      for(let i=0; i<=grid[row].length; i++) {
        if(grid[row][i]==undefined) {
          grid[row][i]=val;
          return i;
        }
      }
    }
    
    function normval(cell, stype) {
      let value = cell.dataset.sort || cell.innerText.trim();
      switch (stype) {
        case 'N':
          return floatval(value.replace(/[^-,\d]+/g, '').replace(/,/g, '.'));
        case 'n':
          return floatval(value.replace(/[^-.\d]+/g, ''));
        case 'd':
          return new Date(value).getTime();
        case 't':
          let t = q('time[datetime]', cell);
          return t? t.datetime : value;
        default:
          return value;
      }
    }
  }
  PmLib.sort1table = sort1table;

  function copy_pre() {
    if(!navigator.clipboard) return;
    var copytext = Config.copycode
    if(!copytext) return;
    var pres = Q('#wikitext pre');
    var btn = "<span class='pmcopycode frame rfloat' title='"+PHSC(copytext)+"'></span>"
    for(var i=0; i<pres.length; i++) {
      adj.ab(pres[i], btn);
    }
    tap('.pmcopycode', function(e){
      var cc = this;
      var pre = cc.parentNode;
      var tc = pre.textContent;
      navigator.clipboard.writeText(tc);
      cl.m(cc, 3000, 'copied');
    });
  }

  function highlight_pre() {
    if(!Config.highlight) return;
    if(typeof hljs == 'undefined') return;
    
    var x = Q('.highlight,.hlt');
    
    for(var i=0; i<x.length; i++) {
      if(x[i].className.match(/(^| )(pm|pmwiki)( |$)/)) { continue;} // core highlighter
      var pre = [...Q('pre,code', x[i])];
      var n = x[i].nextElementSibling;
      if(n && n.tagName == 'PRE') pre.push(n);
      for(var j=0; j<pre.length; j++) {
        pre[j].className += ' ' + x[i].className;
        let varlinks = Q('a.varlink', pre[j]);
        let vararray = {};
        for(var v=0; v<varlinks.length; v++) {
          vararray[varlinks[v].textContent] = varlinks[v].href;
        }
        if(pre[j].children) pre[j].textContent = pre[j].textContent;

        hljs.highlightElement(pre[j]);
        var m = pre[j].className.match(/( |^)language-([a-z-]+)( |$)/i);
        if(m && !pre[j].title) pre[j].title = m[2];
        
        var hlvars = Q('span.hljs-variable', pre[j]);
        for(var v=0; v<hlvars.length; v++) {
          var hlvar = hlvars[v].textContent;
          if(vararray.hasOwnProperty(hlvar)) {
            hlvars[v].innerHTML = '<a class="varlink" href="'+vararray[hlvar]+'">'+hlvar+'</a>';
          }
        }
      }
    }
    let varlinks = Q('code.varlink');
    for(let link of varlinks) cl.a(link, 'hljs-variable');
  }
  
  var ltmode, pagename;
  var daymonth =  new Date(2021, 11, 26, 17)
      .toLocaleDateString().match(/26.*12/)? '%d/%m': '%m/%d';
  function fmtLocalTime(stamp) { // TODO: future dates
    var d = new Date(stamp*1000);
    var tooltip = PHSC(d.toLocaleString());
    let lm10 = ltmode%10;
    if(lm10 == 2)
      return [tooltip];
    if(Now-d < 24*3600000) 
      return [zpad(d.getHours()) + ':'+ zpad(d.getMinutes()), tooltip];
    var D = zpad(d.getDate()), M = zpad(d.getMonth()+1);
    var thedate = daymonth.replace(/%d/, D).replace(/%m/, M);
    if(Now-d < 334*24*3600000) return [thedate, tooltip];
 
    if(lm10 == 1)
      return [thedate + '/' + d.getFullYear(), tooltip];
    
    if(lm10 == 3)
      return [M + "'" + zpad(d.getFullYear()%100), tooltip];
  }
  
  function localTimesRC(ltmode) {
    let days = (ltmode>=11)? floor(ltmode/10) : 3;
    let h72 = Now.getTime()/1000-days*24*3600;
    
    pagename = Config.fullname;
    let seenstamp = ls('seenstamp', {});
    let previous = seenstamp[pagename];
    
    let times = Q('#wikitext li > a ~ time[datetime]');
    let found = 0;
    for(let t of times) {
      let li = t.closest('li');
      if(!li.innerHTML.match(/<\/a>  \. \. \. /)) continue;
      
      let itemdate = new Date(t.dateTime);
      let stamp = floor(itemdate.getTime()/1000);
      
      let diff;
      let a = q(li, 'a');
      if(a.className.match(/createlinktext|wikilink|selflink/)) { // page link
        let action = a.href.includes('action=')? '':'?action=diff';
        diff = a.href + action + '#diff' + stamp;
        if(stamp >= h72) {
          let u = a.href + '?action=diff&fmt=rclist';
          let b = dce.input({type:'button', className:'inputbutton rcplus', value:'+', dataset:{url:u}});
          adj.be(li, b);
        }
      }
      else {
        diff = a.href + '#diff' + stamp; 
      }
      
      let b = dce.a({href:diff});
      adj.ab(li, b);
      adj.ab(b, t);
      adj.ae(b, '&nbsp;&nbsp;');
      if(previous && stamp>previous) cl.a(li, 'rcnew');
      found++;
    }
    if(!found) return;
    var pagetitle = q('#wikititle h1, h1.pagetitle');
    if(pagetitle) {
      var t = zpad(Now.getHours()) + ':'+ zpad(Now.getMinutes());
      adj.be(pagetitle, ' <span class="rcreload" title="Click to reload">'+t+'</span>');
      tap('.rcreload', function(){location.reload();});
    }
    on.mouseup('.rcnew', function(e){
      if(e.which == 2) this.classList.remove('rcnew');
    });
    tap('.rcplus', async function(e){
      const plus = this;
      if(plus.value == '-') {
        let outdents = Q('p.outdent', plus.closest('li'));
        for(let o of outdents) o.remove();
        plus.value = "+";
        return;
      }
      css(plus, {width: gcs(plus, 'width')});
      plus.value = "~";
      plus.disabled = true;
      var basehref = plus.dataset.url.replace(/&fmt=rclist/, '#diff')
      .replace(/[&]/g, '&amp;');
      var fmt = '<p class="outdent"><a href="'+basehref+'%d" title="%T">%t</a> %s</p>\n';
      
      var resp = await afetch.text(plus.dataset.url);
      if(!resp.ok) return err(resp);
      
      var lines = resp.data.split(/\n/g);
      var out = '';
      for(var i=0; i<lines.length; i++) {
        a = lines[i].match(/^(\d+):(.*)$/);
        if(!a) continue;
        var t = fmtLocalTime(floatval(a[1]));
        out += fmt.replace(/%d/, a[1]).replace(/%T/, t[1])
        .replace(/%t/, t[0]).replace(/%s/, a[2]);
      }
      if(out) {
        adj.ae(plus, out);
        plus.value = "-";
        plus.disabled = false;
      }
      else {
        plus.remove();
      }
    });
    if(q('form[name="authform"]') || location.href.match(/action=/)) return;
    seenstamp[pagename] = floor(Now.getTime()/1000);
    ls.seenstamp = seenstamp;
  }
  
  function localTimes() {
    ltmode = floatval(Config.localtimes);
    if(! ltmode) return;
    
    let times = Q('time[datetime]');

    for(t of times) {
      let itemdate = new Date(t.dateTime);
      let stamp = floor(itemdate.getTime()/1000);
      let x = fmtLocalTime(stamp);
      t.title = x[1] ? x[1]: t.textContent;
      t.textContent = x[0];
    }
    localTimesRC(ltmode);
  }
  
  function confirmForms() {
    on.submit('form[data-pmconfirm]', function(e){
      if(!confirm(this.dataset.pmconfirm)) pdsp(e, 1);
    });
    
    tap('button[data-pmconfirm],input[data-pmconfirm]', function(e){
      if(this.tagName == 'INPUT' && !this.type.match(/^(submit|reset|button)$/i)) return;
      if(!confirm(this.dataset.pmconfirm)) pdsp(e, 1);
    });
  }
  
  function labelForms() {
    var elems = Q('input[type="color"][data-labelvalue="1"],input[type="range"][data-labelvalue="1"]');
    if(!elems.length) return;
    for(var el of elems) {
      var v = dce.var({className: 'labelvalue', dataset: {value:el.value}});
      adj.ae(el, v);
      el._labelvalue = v;
    }
    on.input(elems, function(e) {
      this._labelvalue.dataset.value = this.value;
    });
  }
  
  function inittoggle() {
    let tnext = Config.toggle;
    if(! tnext) { return; }
    let x = Q(tnext);
    if(! x.length) return;
    for(let i=0; i<x.length; i++) togglenext(x[i]);
    tap(tnext, togglenext);
    tap('.pmtoggleall', toggleall);
  }
  function togglenext(z) {
    let el = z.type == 'click' ? this : z;
    let attr = el.dataset.pmtoggle=='closed' ? 'open' : 'closed';
    el.dataset.pmtoggle = attr;
  }
  function toggleall(){
    var curr = this.dataset.pmtoggleall;
    if(!curr) curr = 'closed';
    var toggles = Q('*[data-pmtoggle="'+curr+'"]');
    var next = curr=='closed' ? 'open' : 'closed';
    for(var i=0; i<toggles.length; i++) {
      toggles[i].dataset.pmtoggle = next;
    }
    var all = Q('.pmtoggleall');
    for(var i=0; i<all.length; i++) {
      all[i].dataset.pmtoggleall = next;
    }
  }
  
  function init_dropzone(){
    if(!Config.updrop) return;
    var forms = Q('form[action$="action=postupload"], form[action$="action=edit"]');
    for (let f of forms) {
      var div = dce.div({className: "frame pmdropzone" });
      var label = dce.span({textContent: Config.updrop.label+' '});
      adj.ab(div, label);
      adj.ab(f, div);
    }
    var zones = Q('.pmdropzone,div[data-pmdropzone]');
    for(let z of zones) mkdropzone(z);
  }
  
  function mkdropzone(Dropzone) {
    var UploadQueue = [];
    
    on.dragenter(Dropzone, dragenter);
    on.dragover(Dropzone, dragenter);
    on.dragleave(Dropzone, dragleave);
    on.drop(Dropzone, dragdrop);
    tap(Dropzone, clickzone);
    
    const conf = jP(Dropzone.dataset.pmdropzone, {});
    

    function findauthor(){
      if(conf.author) return conf.author;
      let authors = Q('input[name="author"]');
      for(let a of authors) if(a.value) return a.value;
      return '';
    }
    function dragenter(e) {
      pdsp(e);
      cl.a(Dropzone, 'over');
    }
    
    function dragleave(e) {
      pdsp(e);
      cl.r(Dropzone, 'over');
    }
    
    async function dragdrop(e) {
      pdsp(e);
      cl.r(Dropzone, 'over');
      let author = findauthor();
      if(Config.updrop.areq && !author) {
        appendUpload({size: -500, name: Config.updrop.areq});
        return;
      }
      var files = e.dataTransfer.files;
      for (var i = 0; i < files.length; i++) appendUpload(files[i]);
      var pending = q('.pmdropzone a.uploading', Dropzone);
      if(!pending) await processUploads();
    }
    
    function appendUpload(file) {
      if(file.size==0) { return; }
      var sizes = Config.updrop.sizes;
      var ext = '';
      var m = file.name.match(/\.([^\.]+)$/);
      if(m) ext  = m[1].toLowerCase();
      
      var a = dce.a({href: '#', textContent: file.name});
      
      if(file.size==-500) {
        a.className = 'error';
      }
      else if(typeof sizes[ext] == 'undefined') {
        a.className = 'error';
        a.title = Config.updrop.badtype.replace(/\#upext/, ext);
      }
      else if(file.size > sizes[ext]) {
        a.className = 'error';
        a.title = Config.updrop.toobig
        .replace(/\#upmax/, sizes[ext]).replace(/\#upext/, ext);
      }
      else {
        a.className = 'queued';
        a.pmfile = file;
      }
      Dropzone.appendChild(a);
    }
    
    async function postUpload(file) {
      var url = conf.action? conf.action : Config.updrop.action;
      var post = {
        n: conf.n || Config.fullname,
        action: 'postupload',
        uploadfile: file,
        pmdrop: 1,
        author: findauthor()
      }
      let [tn, tv] = Config.updrop.token;
      post[tn] = tv;
      
      return await afetch.json(url, {post});
    }
    
    async function processUploads() {
      while(true) {
        var a = q('a.queued', Dropzone);
        if(!a) return;
        a.className = 'uploading';
        var r = await postUpload(a.pmfile);
        let error = false;
        if(r.data && r.data.error) error = r.data.msg;
        else if(r.error) error = r.error.message;
        if(error) sp(a, {className:'error', title:error});
        else {
          let {msg, href, uprname} = r.data;
          sp(a, {className:'success', title:msg, href:href, textContent:uprname});
          delete a.pmfile;
        }
      }
    }
    
    function clickzone(e) {
      var a = e.target.closest('a');
      if(!a) return;
      pdsp(e, 1);
      if(a.className.match(/uploading|queued|deleting/)) return;
      else if(a.className == 'success' && typeof insMarkup == 'function') {
        var fullname = conf.n? conf.n: Config.fullname;
        var pn = conf.n || e.ctrlKey? fullname + '/': '';
        var text = "Attach:"+pn+a.textContent;
        if(text.match(/\s/)) text = '[['+text+']]';
        insMarkup(function(x){
          if(x.length) return text;
          return {
            mtext: text,
            unselect: true
          };
        });
        return;
      }
      else if(a.className == 'error' || typeof insMarkup == 'undefined') {
        cl.a(a, 'deleting');
        time.out(.7, function(){a.remove();});
        return;
      }
      // this shouldn't happen
    }
    
  }
  
  function init_draggable() {
    var els = Q('.draggable');
    for(var el of els) mkDrag(el);
  }
  
  function datashift() {
    var headings = Q('h1,h2,h3,h4,h5,h6');
    // it is common to shift next to headings, this identifies them
    for(var h of headings) if(!h.dataset.pmcontent)
      h.dataset.pmcontent = h.textContent.trim();
    var data = [...Q('[data-shift]')];
    for(var el of data) datashiftone(el);
  }
  function datashiftone(el) {
    var x = el.dataset.shift.split(/;;+/g);
    for(var y of x) {
      var a = y.match(/^(inner:)?((?:before|after)(?:begin|end)):(.*)$/);
      if(!a) continue;
      try{
        var target = q(a[3]);
        if(!target) continue;
        if(el.contains(target)) {
          err("Shifted contains Target!", {el, target});
          continue;
        }
        target.insertAdjacentElement(a[2], el);
        if(a[1]) {
          var inner = [...el.childNodes];
          for(var node of inner) adj.bb(el, node);
          el.remove();
          return;
        }
        el.dataset.shifted = el.dataset.shift + '';
        delete el.dataset.shift;
        delete el.dataset.unshift;
        el.style.display = el.dataset.odsp || '';
        return;
      }
      catch(e) {continue;}
    }
    
    if(el.dataset.unshift == 'hide') {
      if(!el.dataset.odsp) el.dataset.odsp = gcs(el).display;
      el.style.display = 'none';
    }
  }
  
  function wheelinputinit(e) {
    var x = Q('.pmwheel,[data-pmwheel],select:has([data-pmwheel])');
    var y = [], rx = /^(number|date|month|week|range|datetime-local)$/i;
    for(var el of x) {
      if(el.nodeName === 'SELECT') y.push(el);
      else if(el.nodeName === 'INPUT' && el.type.match(rx)) y.push(el);
    }
    on.wheel(y, wheelinputone, {passive: false});
    on.change(y, echo);
  }
  function wheelinputone(e) {
    const el = e.currentTarget;
    if(!(el instanceof HTMLElement)) return;
    pdsp(e);
    var delta = Math.sign(event.deltaY);
    if(!delta) delta = -Math.sign(event.deltaX);
    if(el.nodeName === 'INPUT') {
      if(typeof el.stepUp === 'function' && typeof el.stepDown === 'function') {
        delta < 0 ? el.stepUp() : el.stepDown();
        fire.input(el);
        fire.change(el);
      }
    } 
    else if(el.nodeName === 'SELECT') {
      const len = el.options.length;
      var n = minmax(el.selectedIndex + delta, 0, len-1);
      if(el.selectedIndex != n) {
        el.selectedIndex = n;
        fire.change(el);
      }
    }
  }
  
  function intercheckboxes(){
    let shiftKey = 0;
    let lastChecked = null;
    on.keydown('body', function(e){
      if(e.key == 'Shift') shiftKey = 1;
    });
    on.keyup('body', function(e){
      if(e.key == 'Shift') shiftKey = 0;
    });
    on.change('body', function(e){
      const box = e.target;
      if(box.type !== 'checkbox') return;
      if(shiftKey && lastChecked) {
        const all = [...Q('input[type="checkbox"]')];
        const x = all.indexOf(lastChecked);
        if(x>=0) {
          const y = all.indexOf(box);
          const a = min(x, y);
          const b = max(x, y);
          const checked = box.checked;
          for (let i = a; i <= b; i++) {
            all[i].checked = checked;
          }
        }
      }
      lastChecked = box;
    });
  }
  
  function confirmUnload() {
    let forms = Q('form[data-confirmunload]');
    if(!forms.length) return;
    once.change(forms, function(e){ this.__changed = 1; });
    once.input(forms,  function(e){ this.__changed = 1; });
    on.submit(forms, function(e){ this.__submitting = 1;
      let that = this;
      time.out(.5, function(){delete that.__submitting; });
    });
    
    on.beforeunload(window, function(e){
      for(let f of forms) {
        let changed = (f.__changed || f.dataset.confirmunload == '2');
        if(changed && !f.__submitting) {
          pdsp(e);
          e.returnValue = '';
          return;
        }
      }
    });
  }
  
  
  ready(function(){
    wikitext = q('#wikitext');
    var fn = [
      localTimes, PmXMail,
      datashift, autotoc, inittoggle, 
      highlight_pre, copy_pre, 
      confirmForms, labelForms, wheelinputinit,
      init_dropzone, init_draggable,
      inittableheadfoot, makesortable, intercheckboxes,
      confirmUnload, datashift
    ];
    PmLib.ready._init.push(...fn);
    PmLib.ready._init.forEach(function(a){a();});
    ready.done.core = 1;
    fire.pmutilscoredone(D);
    if(ready._queued) {
      fn = ready._queued.slice(0);
      fn.forEach(function(a){a();});
    }
    ready._queued = false;
    ready.done.queue = 1;
    fire.pmutilsqueuedone(D);
    
  });

})(document.currentScript);
