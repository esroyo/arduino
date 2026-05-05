<?php if(!defined('PmWiki'))exit;
/**
  Boira Skin
  Written by (c) Carles Escrig 2011

  This text is written for PmWiki; you can redistribute it and/or modify
  it under the terms of the GNU General Public License as published
  by the Free Software Foundation; either version 3 of the License, or
  (at your option) any later version. See pmwiki.php for full details
  and lack of warranty.

  Copyright 2006-2011 Petko Yotov http://notamment.fr
  Copyright 2004-2007 Patrick R. Michaud http://www.pmichaud.com
*/

global $PageEditForm, $SiteGroup, $PageStorePath, $WikiLibDirs,
$XLLangs, $XL, $EnableSkinPrefs, $FmtPV, $AuthorGroup, $EnableEditFormPrefs,
$EnableHoneypotCheck, $HoneypotCheckFmt;

## Add a custom page storage location for bundled pages.
$PageStorePath = dirname(__FILE__)."/wikilib.d/\$FullName";
$FmtPV['$AuthorGroup'] = $AuthorGroup;

$where = count($WikiLibDirs);
if ($where>1) $where--;
array_splice($WikiLibDirs, $where, 0, array(new PageStore($PageStorePath)));

## Enable the Preferences page.
XLPage('boira', "$SiteGroup.BoiraXLPage");
array_splice($XLLangs, -1, 0, array_shift($XLLangs));

## Enable the skin's custom EditForm, either
## configurable via a prefs page (XLPage) or not.

if (IsEnabled($EnableEditFormPrefs, 1))
  SDV($PageEditForm, "$[$SiteGroup.BoiraEditForm]");
else
  SDV($PageEditForm, "$SiteGroup.BoiraEditForm");

if (IsEnabled($EnableHoneypotCheck,0))
  array_unshift($EditFunctions,'HoneypotCheck');

SDV($HoneypotCheckFmt,
	"<h3 class='wikimessage'>$[You are not allowed to post in this site.]</h3>");

function HoneypotCheck($pagename, &$page, &$new) {
  global $_POST, $MessagesFmt, $HoneypotCheckFmt, $EnablePost;
  if (isset($_POST['required'])) {
    $MessagesFmt[] = $HoneypotRequiredFmt;
    $EnablePost = 0;
  }
}

// MSCS NavBar for PmWiki
function PrintSpecialNavBar($pn) {
	if (PageVar($pn, '$Group') == 'AgendaPublica') {
		//include_once('/srv/disk4/790209/www/castello.comparteix.net/navbar.php');
		include_once('/home/www/castello.comparteix.net/navbar.php');
		echo PrintMSCSNavBar('faq');
	}
}

function PrintFavicon_MSCS($pn) {
	if (PageVar($pn, '$Group') == 'AgendaPublica') {
		echo '<link rel="icon" href="http://castello.comparteix.net/images/favicon.png" type="image/png" />';
	}

}

function PrintFavicon_arduino($pn) {
	global $WikiTitle;
	if ($WikiTitle == 'Arduino') {
		echo '<link rel="icon" href="http://arduino.comparteix.net/pmwiki/pub/img/favicon.png"  type="image/x-icon" rel="shortcut icon">';
	}

}
