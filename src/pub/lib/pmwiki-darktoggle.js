/*
  Dark mode toggle for PmWiki
  (c) 2024-2026 Petko Yotov www.pmwiki.org/petko
  licensed GNU GPLv2 or any more recent version released by the FSF.
*/

(function(dConfig){
  const W = window, D = document, H = document.documentElement, 
    echo = console.log;
    
  const wmmd = window.matchMedia
    ? window.matchMedia('(prefers-color-scheme: dark)')
    : false;
  function preferdark() { return (wmmd && wmmd.matches)? 1 : 0; };
  function intval(x) {var y = parseInt(x);   return isNaN(y)? 0:y; };
  function minmax(n, min, max) { return Math.min(Math.max(n+0, min), max); };
  function Q(s) { return D.querySelectorAll(s); };
  
  function pref(enabled) {
    var x = localStorage.getItem('pmDarkToggled');
    if(x===null) x = conftheme;
    x = minmax(intval(x), 0, 2);
    if(enabled && x==2) return preferdark();
    return x;
  }
  function toggle1sheet(sheet, enabled) {
    let isDark = sheet.dataset.theme == 'dark'? 1:0;
    sheet.disabled = (isDark != enabled);
  }
  function toggle1image(pic, enabled) {
    if(!pic.dataset.lightsrc) pic.dataset.lightsrc = pic.src;
    pic.src = enabled ? pic.dataset.darksrc : pic.dataset.lightsrc;
  }
  

  function toggleSheets(enabled) {
    var themesheets = Q('link[rel="stylesheet"][data-theme]');
    enabled = intval(enabled);
    for(let sheet of themesheets) toggle1sheet(sheet, enabled);
  }
  function toggleImages(enabled) {
    var darkpics = Q('img[data-darksrc]');
    for(let pic of darkpics) toggle1image(pic, enabled);
  }

  
  var Config = JSON.parse(dConfig);
  Config.enable = minmax(intval(Config.enable), 1, 3);
 
  var clist = H.classList, // <html>
    conftheme = Config.enable - 1, 
    label = false, current = false;
  clist.add('pmDarkToggleEnabled');
  var isToggled = pref();
  
  var prev_dark = pref(1);
  if(prev_dark) clist.add('pmDarkTheme');
  
  const obs_qs = {
    "link[rel=\"stylesheet\"][data-theme]": toggle1sheet,
    "img[data-darksrc]:not([data-lightsrc])": toggle1image,
  };
  const observer = new MutationObserver(function(mutations){
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node.nodeType === 1) {
          for(let qs in obs_qs) {
            let elems = node.matches(qs)? [node] : node.querySelectorAll(qs);
            for(let el of elems) obs_qs[qs](el, prev_dark);
          }
        }
      }
    }
  });
  
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true
  });
  toggleSheets(prev_dark);
  
  document.addEventListener('DOMContentLoaded', function(){
    observer.disconnect();
    const { B, on, dce, tap, abspos} = PmLib;
      
    function update(e) {
      var isToggled = pref(); // 0=light, 1=dark, 2=auto

      if(e.type == 'click') {
        isToggled = (isToggled+1)%3;
        localStorage.setItem('pmDarkToggled', isToggled);
        if(current) current.textContent = Config.modes[isToggled];
      }

      var enabled = isToggled==2? preferdark() : isToggled;

      if(enabled == prev_dark) return;
      prev_dark = enabled+0;

      clist.toggle('pmDarkTheme', enabled);
      toggleSheets(enabled);
      toggleImages(enabled);
    }
    function initLabel() {
      label = dce.div({
        className: 'frame darkThemeLabel', 
        style: {
          display: 'none',
          zIndex: 1000,
          position: 'fixed'
        }
      });
      B.appendChild(label);
      current = dce.mark();
      label.append(Config.label, current);
    }

    function over() {
      if(!label) initLabel();
      current.textContent = Config.modes[pref()];
      abspos(this, label);
    }

    function out(e) {
      label.style.display = 'none';
    }
    
    on.beforeprint(W, function(){
      if(! prev_dark) return;
      toggleSheets(0);
      toggleImages(0);
    });
    on.afterprint(W, function(){
      if(! prev_dark) return;
      toggleSheets(1);
      toggleImages(1);
    });
    on.storage(W, function(e){ // sync other tabs
      if(e.key == 'pmDarkToggled') update({});
    });
    on.change(wmmd, update);
  
    // toggleSheets(prev_dark);
    // toggleImages(prev_dark);
    if(! W.localStorage) return;
    
    on.mouseenter('.pmToggleDarkTheme', over);
    on.mouseleave('.pmToggleDarkTheme', out);
    tap('.pmToggleDarkTheme', update);
  });

})(document.currentScript.dataset.config);
