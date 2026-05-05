/**
  AutoTOC - Unobtrusive Automatic Table of Contents for PmWiki
  Written by (c) Petko Yotov 2011    www.pmwiki.org/Petko

  This text is written for PmWiki; you can redistribute it and/or modify
  it under the terms of the GNU General Public License as published
  by the Free Software Foundation; either version 3 of the License, or
  (at your option) any later version. See pmwiki.php for full details
  and lack of warranty.

  Version 2011110
*/
function AT_repeat(n) {
  var q = '';
  for(var i=1; i<=n; i++) q+= i18nTOC.indent;
  return q+i18nTOC.prefix;
}

function AT_flip() {
  var el = document.getElementById('innerTOC');
  with(el.style) display = (display!='none')? 'none' : 'block';
  document.getElementById('flipTOC').innerHTML = i18nTOC[el.style.display];
  document.cookie = "TOC="+el.style.display+"; path=/";
}

function AT_traverse_wikitext(el) {
  var nn = el.nodeName;
  var cn = el.className;
  if(cn && cn.match(/\bnotoc\b/)) var q = 1;
  else if(nn.match(AT_levels)) AT_get_heading(el);
  else if(nn=='TABLE' && cn && cn.indexOf('markup')>=0) var q = 1;
  else if(el.hasChildNodes()) {
    var children = el.childNodes;
    for(var i=0; i<children.length; i++) AT_traverse_wikitext(children[i]);
  }
}

function AT_create_id(txt) {
  var txt = encodeURIComponent(txt.replace(/\s+/g, '_')).replace(/%/g, '.')
    .replace(/'/g, '.27').replace(/~/g, '.7E').replace(/!/g, '.21')
    .replace(/\(/g, '.28').replace(/\)/g, '.29').replace(/\*/g, '.2A')
    .replace(/^([^a-zA-Z])/, 't$1');
  var e = document.getElementById(txt);
  if(!e)return txt;
  var incr = 2;
  while(true) {
    var x = txt+'_'+incr;
    var e = document.getElementById(x);
    if(!e)return x;
    incr ++;
  }
}

function AT_get_heading(el) {
  var text = el.innerText || el.textContent;
  text = text.replace(/^\s*(.*)\s*$/, '$1');
  var id = el.id 
  if(!id) {
    id = AT_create_id(text);
    el.id = id;
  }
  AT_cache[id] = 1;
  var level = parseInt(el.nodeName.substring(1));
  AT_headings.push([ level, id, text ]);
  if (AT_biggestheading>level)AT_biggestheading=level;
}

function AT_init() {
  AT_traverse_wikitext(document.getElementById('wikitext'));
  var AT_div = document.getElementById('AutoTOC');
  if(AT_headings.length>=i18nTOC.nbheadings || (AT_div && AT_headings.length) ) {
    if(!AT_div){
      var AT_div = document.createElement("div");
      AT_div.setAttribute('id', 'AutoTOC');
      var first = document.getElementById(AT_headings[0][1]);
      first.parentNode.insertBefore(AT_div, first);
    }
    var html = "<table id='tableTOC' class='frame' border='0'><tr id='headerTOC'><td><b>"+i18nTOC.contents
      +"</b> <small>[<a id='flipTOC' href='javascript:AT_flip();'>"+i18nTOC.block+"</a>]</small></td></tr>";
     html += "<tr id='innerTOC'><td><small>";
    for(var i=0; i<AT_headings.length; i++) {
      var wh = AT_headings[i];
       html += AT_repeat(wh[0]-AT_biggestheading) + "<a href='#"+wh[1]+"'>"+wh[2]+"</a>"
      if(i<AT_headings.length-1) html += "<br/>"; 
    }
     html += "</small></td></tr></table>";
    AT_div.innerHTML = html;
    
    var tocQ = document.cookie.match(/TOC=(none|block)/);
    var state = (tocQ)? tocQ[1] : 'block';
    if(state=='none') AT_flip();
  }
}
var AT_headings = [ ];
var AT_cache = { };
var AT_biggestheading = 6;
var AT_levels = new RegExp("^H[1-"+i18nTOC.levels+"]$", 'i');
setTimeout("AT_init()", 50);
