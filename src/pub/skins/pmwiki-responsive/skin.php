<?php if (!defined('PmWiki')) exit();
/***********************************************************************
**  skin.php
**  Copyright 2016-2024 Petko Yotov www.pmwiki.org/petko
**  
**  This file is part of PmWiki; you can redistribute it and/or modify
**  it under the terms of the GNU General Public License as published
**  by the Free Software Foundation; either version 2 of the License, or
**  (at your option) any later version.  See pmwiki.php for full details.
***********************************************************************/


global $HTMLStylesFmt, $SkinElementsPages, $DefaultSkinElements, $TableCellAlignFmt, $EnableDarkThemeToggle,
  $SearchBoxInputType, $WrapSkinSections, $HideTemplateSections, $EnableTableAttrToStyles;

# Disable inline styles injected by the PmWiki core (we provide these styles in skin.css)
$styles = explode(' ', 'pmwiki rtl-ltr wikistyles markup simuledit diff urlapprove vardoc PmSortable PmTOC');
foreach($styles as $style) $HTMLStylesFmt[$style] = '';

# CSS alignment for table cells (valid HTML5)
SDV($TableCellAlignFmt, " class='%s'");

# Enable dark theme toggle, Auto theme by default
SDV($EnableDarkThemeToggle, 3);

# For (:searchbox:), valid semantic HTML5
$SearchBoxInputType = "search";

# in HTML5 "clear" is a style not an attribute
Markup('[[<<]]','inline','/\\[\\[&lt;&lt;\\]\\]/',"<br class='clearboth' />");

# Allow skin header and footer to be written 
# in a wiki page, and use defaults otherwise
SDVA($WrapSkinSections, array(
  '#skinheader' => '<header id="wikihead">
      <div id="wikihead-content">
      %s
      </div>
    </header>',
  '#skinfooter' => '<footer id="wikifoot">
    %s
  </footer>',
));
SDVA($HideTemplateSections, array(
  '#skinheader' => 'PageHeaderFmt',
  '#skinfooter' => 'PageFooterFmt',
));

# This function prints a skin element which is written 
# inside a [[#header]]...[[#headerend]] section in Site.SkinElements
# overriding the existing section from the template file

function SkinFmt($pagename, $args) {
  global $WrapSkinSections, $HideTemplateSections, $TmplDisplay;
  
  $args = preg_split('!\\s+!', $args, -1, PREG_SPLIT_NO_EMPTY);
  
  $section = array_shift($args);
  $hidesection = $HideTemplateSections[$section];
  
  if(isset($TmplDisplay[$hidesection]) && $TmplDisplay[$hidesection] == 0) {
    return;      # Section was disabled by (:noheader:) or (:nofooter:)
  }
  
  static $pagecache = array();
  foreach($args as $p) {
    $pn = FmtPageName($p, $pagename);
    if(! isset($pagecache[$pn])) {
      $page = RAPC($pn);
      $pagecache[$pn] = strval(@$page['text']);
    }
    if($pagecache[$pn] == "") continue;
    $rx = "/\\[\\[$section\\]\\](?: *\n+)?(.*?)\\s*\\[\\[{$section}end\\]\\]/s";
    if(preg_match($rx, $pagecache[$pn], $m)) {
      $elm = $m[1];
    }
    else continue;
    if(!$elm) continue;
    
    $html = MarkupToHTML($pagename, Qualify($pn, $elm));
    echo sprintf($WrapSkinSections[$section], $html);
    SetTmplDisplay($hidesection,0);
    return;
  }
  if(@$DefaultSkinElements[$section])
    echo FmtPageName($DefaultSkinElements[$section], $pagename);
}

