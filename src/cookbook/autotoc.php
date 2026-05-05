<?php if (!defined('PmWiki')) exit();
/**
  AutoTOC - Unobtrusive Automatic Table of Contents for PmWiki
  Written by (c) Petko Yotov 2011    www.pmwiki.org/Petko

  This text is written for PmWiki; you can redistribute it and/or modify
  it under the terms of the GNU General Public License as published
  by the Free Software Foundation; either version 3 of the License, or
  (at your option) any later version. See pmwiki.php for full details
  and lack of warranty.
*/
$RecipeInfo['AutoTOC']['Version'] = '20111110';

Markup("AutoTOC", '<split', '/^\\(:toc:\\)\\s*$/im', "<:block,1>".Keep("<div id='AutoTOC'></div>"));
Markup_e("noAutoTOC", 'directives', '/\\(:notoc:\\)/i', "PZZ(\$GLOBALS['HTMLFooterFmt']['autotoc']='')");
SDV($AutoTocPrefix, '');
SDV($AutoTocIndent, '&nbsp;&nbsp;&nbsp;&nbsp;');
SDV($AutoTocMaxLevel, 6);
SDV($AutoTocNbHeadings, 3);
SDV($AutoTocUrl, '$FarmPubDirUrl/autotoc.js');


function initAutoTOC($pagename) {
  global $HTMLFooterFmt, $AutoTocMaxLevel, $AutoTocNbHeadings, $AutoTocUrl, $AutoTocPrefix, $AutoTocIndent;
  SDVA($HTMLFooterFmt, array(
  'autotoc' => "<script type='text/javascript'><!--
var i18nTOC = { contents: \"".XL("Contents")."\", none: \"".XL("show")."\", block: \"".XL("hide")."\""
.", levels: $AutoTocMaxLevel, nbheadings: $AutoTocNbHeadings, prefix: \"$AutoTocPrefix\", indent: \"$AutoTocIndent\" };//--></script>
<script type='text/javascript' src='$AutoTocUrl'></script>"
  ));
}

if($VersionNum>=2002017) $PostConfig['initAutoTOC'] = 50;
else initAutoTOC($pagename);

