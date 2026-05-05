// Drag & Drop file upload for PmWiki v.20110826 by Petko Yotov http://notamment.fr
// built with Unverse.js by John Goodman http://unverse.net
if (typeof _.dRF == 'undefined') _.dRF = [];
function docReady(){ for(var i=0; i<_.dRF.length; i++) _.dRF[i](); }
function dragenter(event) {
  event.preventDefault();
  if(dropzone_id) { _.$(dropzone_id).setAttribute('class', 'dropover'); }
  else {_.$('uv_ov').setAttribute('class', 'dropbasket'); _.s('uv_ov');}
}
function dragleft(event) {
  event.preventDefault();
  if(dropzone_id) { _.$(dropzone_id).setAttribute('class', 'dropout'); }
  else {_.$('uv_ov').removeAttribute('class'); _.xp();}
}
function dragdrop(event) {
  dragleft(event);
  var files = event.dataTransfer.files;
  for (var i = 0; i < files.length; i++) handleFile(files[i]);
}
function handleFile(file) {
  if(file.size<1) { return; }
  var ext = "/", name = file.name.replace(/ /g, '_');
  if(file.name.indexOf('.')!=-1) {
    var m = file.name.match(/^(.*)\.([^\.]*)$/);
    if(m) {
//       name = m[1].replace(/ /g, '_');
      ext  = m[2].toLowerCase();
    }
  }
  var c = 'uploading';
  if(typeof DDMU_max_size[ext] == 'undefined') c= 'badtype';
  else if(file.size > DDMU_max_size[ext]) c= 'toobigext';

  AddFileToList(file.name, c, ext, file.name);
  if(c != 'uploading') return;
  fileUpload(file, ext);
}
function AddFileToList(f, c, ext, F) {
  var id = escape(f).replace(/%/g, '.');
  var e = _.$(id);
  var dd = _.$('DDMU');
  if(!dd) return; //
  var a = " <a onclick='insAttach(\""+F.replace(/'/g, "\\x27").replace(/"/g, "\\x22")+"\", this.parentNode)'>"+F+"</a> ";
  if(!e) {
    var e = document.createElement("span");
    e.setAttribute('id', id);
    e.innerHTML = a;
    dd.appendChild(e);
  }
  if(f!=F) e.innerHTML = a;
  e.setAttribute('class', 'UL'+c);
  var t = (typeof DDMU_return_codes[c]!='undefined')? DDMU_return_codes[c] : '';
  if(typeof DDMU_max_size[ext]!='undefined') 
    t = t.replace('$upmax', DDMU_max_size[ext])
  var x = (ext=='/')? '': ext;
  t = t.replace('$upext', x).replace(/ {2,}/, ' ');
  e.setAttribute('title', t);
}

function insAttach(f, p) {
  switch (p.className) {
    case 'ULsuccess': case 'ULuploading': 
      if(typeof insMarkup == 'undefined') return;
      if(f.indexOf(' ')<0) {insMarkup('', '', 'Attach:'+f);}
      else insMarkup('', '', '[[Attach:'+f+']]');
      break;
    case 'ULlogin':
      var url = DDMU_return_codes.dd_pageurl+"?action=postupload&insattach=1&ddmu=1&n="+DDMU_return_codes.dd_pagename;
      _.box(url, 400, 200);
      break;
    default: 
      _.ani(p, 'opacity', 0.1);
      setTimeout(function(){p.parentNode.removeChild(p);}, 700);
  }
}

function fileUpload(file, ext) {  
  var formdata = new FormData();
  formdata.append("n", DDMU_return_codes.dd_pagename); 
  formdata.append("action", "postupload");
  formdata.append("ddmu", "1");
  formdata.append("uploadfile", file);
  var xhr = new XMLHttpRequest();
  xhr.open("POST", DDMU_return_codes.dd_pageurl);
  xhr.send(formdata);

  xhr.onreadystatechange = function() {
    if (xhr.readyState == 4 && ((xhr.status >= 200 && xhr.status <= 200) || xhr.status == 304) && xhr.responseText != "") {
      var reply = xhr.responseText, F=file.name, R='unknown_error';
      //&uprname=K.png&upresult=tquota
      var m = reply.match(/uprname=([^&]+)(&|$)/);
      if(m) F=m[1];
      var m = reply.match(/upresult=([^&]+)(&|$)/);
      if(m) R=m[1];
      var m = reply.match(/name='(authpw|password)'/);
      if(m) R='login';
      AddFileToList(file.name, R, ext, F);
    }
  }
}
var dropzone_id = false;
_.dRF.push(function(){
  var c = document.createElement("div");
  c.setAttribute('id', 'DDMU');
  var we = _.$('wikiedit');
  if(we) { we.insertBefore(c, we.firstChild); }
  else {
    var wu =  _.$('wikiupload');
    if(wu) wu.appendChild(c);
  }
  var dropzone = document.body;
  if(parseInt(DDMU_return_codes.dd_enable_dropzone)) {
    dropzone_id = 'DDMU';
    dropzone = _.$(dropzone_id);
    dropzone.innerHTML = DDMU_return_codes.dropzone_innerHTML; 
    dropzone.setAttribute('class', 'dropout');
    _.e(dropzone, "dragleave", dragleft);
  }
  _.e(dropzone, "dragenter", dragenter);
  _.e(dropzone, "dragover", dragenter);
  _.e(dropzone, "drop", dragdrop);
});
