<?php if (!defined('PmWiki')) exit();
/*  Copyright 2019-2026 Petko Yotov www.pmwiki.org/petko
    This file is part of PmWiki; you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published
    by the Free Software Foundation; either version 2 of the License, or
    (at your option) any later version.  See pmwiki.php for full details.

    This script includes and configures one or more JavaScript utilities, 
    when they are enabled by the wiki administrator, notably:
    
    * Tables of contents
    * Sortable tables
    * Localized time stamps
    * Improved recent changes
    * Syntax highlighting (PmWiki markup)
    * Syntax highlighting (external)
    * Copy code button from <pre> blocks.
    * Collapsible sections
    * Email obfuscation
    
    To disable all these functions, add to config.php:
      $EnablePmUtils = 0;
*/

function PmSyntaxConfig() {
  global $EnablePmSyntax, $CustomSyntax, $InputTags, $Conditions, $IMap;
  $config = [];
  $config['imaps'] = array_keys($IMap);
  $config['inputs'] = array_keys($InputTags);
  
  $conds = preg_grep('/^\\w[-\\w]*$/', array_keys($Conditions));
  $config['conditions'] = array_values($conds);
  
  $config['mode'] = "$EnablePmSyntax";
  $config['label'] = XL('Highlight');
  $config['custom'] = array_values($CustomSyntax??[]);
  return pm_json_encode($config, true);
}

function PmUtilsJS($pagename) {
  global $PmTOC, $EnableSortable, $EnableHighlight, $EnableLocalTimes, $ToggleNextSelector,
    $LinkFunctions, $FarmD, $HTMLStylesFmt, $HTMLHeaderFmt, $EnablePmSyntax, 
    $HTMLHeader1Fmt, $EnableCopyCode, $EnableDarkThemeToggle, $EnableRedirectQuiet, 
    $EnableUploadDrop, $UploadExtSize, $EnableUploadAuthorRequired, $UrlScheme, $IsLocalhost;

  $utils = "$FarmD/pub/lib/pmwiki-utils.js";
  $dark  = "$FarmD/pub/lib/pmwiki-darktoggle.js";
  

  // Dark theme toggle, needs to be very early
  $darkenabled = IsEnabled($EnableDarkThemeToggle, 0);
  if ($darkenabled && file_exists($dark)) {
    $config = array(
      'enable' => $darkenabled,
      'label'=> XL('Color theme: '),
      'modes'=> array( XL('Light'), XL('Dark'), XL('Auto'), ),
    );
    $json = pm_json_encode($config, true);
    $djs = "<script src='\$FarmPubDirUrl/lib/pmwiki-darktoggle.js' 
      data-config='$json'></script>";
    $HTMLHeader1Fmt = array_merge(['darktogglejs' => $djs], $HTMLHeader1Fmt);
  }
  

  $cc = IsEnabled($EnableCopyCode) && ($IsLocalhost || $UrlScheme == 'https')
    ? XL('Copy code') : '';
  
  if (IsEnabled($EnableUploadDrop, 0)) {
    $ddmu = array(
      'action'  => '{$PageUrl}?action=postupload&pmdrop=1',
      'token'   => ['$TokenName', pmtoken()],
      'label'   => XL('ULdroplabel'),
      'badtype' => str_replace('$', '#', XL('ULbadtype')),
      'toobig'  => str_replace('$', '#', preg_replace('/\\s+/',' ', XL('ULtoobigext'))),
      'sizes'   => array(),
    );
    if(IsEnabled($EnableUploadAuthorRequired, 0)) {
      $ddmu['areq'] = XL('ULauthorrequired');
    }
    
    foreach($UploadExtSize as $ext=>$bytes) {
      if($bytes>0) $ddmu['sizes'][$ext] = $bytes;
    }
  }
  else $ddmu = false;
  
  if (file_exists($utils)) {
    $mtime = filemtime($utils);
    $config = array(
      'fullname' => $pagename,
      'sortable' => IsEnabled($EnableSortable, 1),
      'highlight' => IsEnabled($EnableHighlight, 0),
      'copycode' => $cc,
      'toggle' => IsEnabled($ToggleNextSelector, 0),
      'localtimes' => IsEnabled($EnableLocalTimes, 0),
      'rediquiet' => IsEnabled($EnableRedirectQuiet, 0),
      'updrop' => $ddmu,
    );
    $enabled = $PmTOC['Enable'];
    foreach($config as $i) {
      $enabled = $enabled || $i;
    }
    
    if ($enabled) {
      $config['pmtoc'] = $PmTOC;
      SDVA($HTMLHeaderFmt, array('pmwiki-utils' =>
        "<script type='text/javascript' src='\$FarmPubDirUrl/lib/pmwiki-utils.js?st=$mtime'
          data-config='".pm_json_encode($config, true)."' data-fullname='{\$FullName}'></script>"
      ));
    }
  }
  
  # inject before skins and local.css
  if (IsEnabled($EnablePmSyntax, 0) || $ddmu) {
    $HTMLHeader1Fmt['pmsyntax-css'] = "<link rel='stylesheet' 
      href='\$FarmPubDirUrl/lib/pmwiki.syntax.css'>";
  }
  if (IsEnabled($EnablePmSyntax, 0)) { 
    $conf = PmSyntaxConfig();
    $HTMLHeader1Fmt['pmsyntax-js'] = "<script data-config=\"$conf\"
      src=\"\$FarmPubDirUrl/lib/pmwiki.syntax.js\"></script>";
  }
}

PmUtilsJS($pagename);
