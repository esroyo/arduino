// Ultralightbox v.20181115 by Petko Yotov www.pmwiki.org/Petko
// built with Unverse.js by John Goodman http://unverse.net
var LB={}, LBF=500;
if (typeof _.dRF == 'undefined') _.dRF = [];
function docReady(){ for(var i=0; i<_.dRF.length; i++) _.dRF[i](); }
_.Uc=function(){var o=_.$('uv_ov'); o.style.height=_.dH()+'px'; _.s(o);
  LB.T=setTimeout(function(){_.sp('Loading...','hidden',''); _.pop(200,1);},500);
  LB.I=this.I; LB.R=this.getAttribute('data-lightbox'); LB.L=LB[LB.R].length; LB.C=this.title;
  var i=new Image(); i.onload=_.Ul; i.src=this.href;
  return false;
}
_.Ul=function(){ clearTimeout(LB.T);
  var dc=document, kd='keydown', p=_.$('uv_pop'), ps=p.style, r=LB.R, t=(r&&r!='lightbox'&&LB.L>1)?(LB.I+1)+" / "+LB.L+_.Ub(-1)+_.Ub(1):'',
    a=this.width, b=this.height, c=Math.min(1,(_.wW()-50)/a,(_.wH()-50)/b); a*=c; b*=c;
  t='<span id="unav">'+t+_.Ub(0)+'</span><b>'+LB.C+'</b>';
  p.innerHTML='<img src="'+this.src+'" width="'+a+'"height="'+b+'" onclick="_.Um(event,this);"><div>'+t+'</div>';
  p.title=LB.C; ps.overflow='hidden'; if(LBF){ps.opacity=0.2; ps.filter='alpha(opacity=20)';}
  _.pop(a, b-3); if(LBF)_.ani(p,'opacity',1, LBF);
  _.re(dc,kd,_.Uk); _.e(dc,kd,_.Uk);
  _.$('uv_ov').onclick=_.Uq;
};
_.Um=function(e,i){if(!e) e=window.event;
  var x= e.layerX? e.layerX : e.offsetX? e.offsetX : 0; x/=i.width;
  if(x){if(x<.4) _.Un(-1); else if(x>.6) _.Un(1);}
};
_.Ub=function(n){var m=['&lt;','&times;','&gt;'],N=m[n+1]; return " <button onclick='_.Un("+n+");' id='ub"+n+"'>"+N+"</button> ";};
_.Uq=function(){_.re(document,"keydown",_.Uk);_.xp();};
_.Un=function(d){if(!d)_.Uq();else{var i=LB.I+d, r=LB.R; if(r&&r!='lightbox'&&0<=i&&i<LB.L)LB[r][i].onclick();}};
_.Uk=function(e){if(!e) e=window.event; var k=1; var kk=e.which||e.keyCode||e.charCode;
  switch(kk){//p<n> xcqESC
    case 80: case 112: case 37: _.Un(-1); break; case 78: case 110: case 39: _.Un(1); break;
    case 88: case 120: case 67: case 99: case 81: case 113: case 27: _.Uq(); break; k=0;
  }
  if(k){if(e.preventDefault) e.preventDefault(); return false;}
};
_.Ui=function(lst){ if(typeof lst == 'undefined')lst=_.c('minilink','A');
  _.all(lst,function(a){ var r=a.getAttribute('data-lightbox');
    if(typeof LB[r]=='undefined')LB[r]=[];
    a.I=LB[r].length; a.onclick=_.Uc; LB[r].push(a);
  });
};
_.dRF.push(_.Ui);

