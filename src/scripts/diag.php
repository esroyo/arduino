<?php if (!defined('PmWiki')) exit();
/*  Copyright 2003-2026 Patrick R. Michaud (pmichaud@pobox.com)
    This file is part of PmWiki; you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published
    by the Free Software Foundation; either version 2 of the License, or
    (at your option) any later version.  See pmwiki.php for full details.

    This file adds "?action=diag" and "?action=phpinfo" actions to PmWiki.  
    This produces lots of diagnostic output that may be helpful to the 
    software authors when debugging PmWiki or other scripts.

    Script maintained by Petko YOTOV www.pmwiki.org/petko
*/


if ($action=='diag') {
  @ini_set('track_errors','1');
  @ini_set('display_errors', '1');
  pm_session_start();
  header('Content-type: text/plain');
  $_DEFINED_CONSTANTS = get_defined_constants(true);
  $_DEFINED_FUNCTIONS = get_defined_functions();
  @print_r($GLOBALS);
  exit();
}

if ($action=='phpinfo') { phpinfo(); exit(); }

function Ruleset() {
  global $MarkupTable;
  $out = '';
  $dbg = 0;
  BuildMarkupRules();
  foreach($MarkupTable as $id=>$m) {
    $out .= sprintf("%-16s %-16s %-16s %s\n",$id,@$m['cmd'],@$m['seq'], @$m['dbg']);
    if (@$m['dbg']) $dbg++;
  }
  if ($dbg) $out .= "
[!] Markup rules possibly incompatible with PHP 5.5 or newer.
    Please contact the recipe maintainer for update
    or see www.pmwiki.org/wiki/PmWiki/CustomMarkup";
  return $out;
}

$HandleActions['ruleset'] = 'HandleRuleset';

function HandleRuleset($pagename) {
  header("Content-type: text/plain");
  print Ruleset();
}

function StopWatchHTML($pagename, $print = 0) {
  global $StopWatch;
  StopWatch('now');
  $l = strlen(count($StopWatch));
  $out = '<pre>';
  foreach((array)$StopWatch as $i => $x)
    $out .= sprintf("%{$l}d: %s\n", $i, $x);
  $out .= '</pre>';
  if (is_array($StopWatch)) array_pop($StopWatch);
  if ($print) print $out;
  return $out;
}

### From Cookbook:RecipeCheck
/*  Copyright 2007-2026 Patrick R. Michaud (pmichaud@pobox.com)

    This recipe adds ?action=recipecheck to a site.  When activated,
    ?action=recipecheck fetches the current list of Cookbook recipes
    and their versions from pmwiki.org.  It then compares this list
    with the versions of any installed recipes on the local site
    and reports any differences.

    By default the recipe restricts ?action=recipecheck to admins.

    Note that not all recipes currently follow PmWiki's
    recipecheck standard (feel free to report these to the pmwiki-users
    mailing list).

    * 2007-04-17:  Added suggestions by Feral
      - explicit black text
      - skip non-php files and directories
    * 2019-11-28: Added to scripts/diag.php by Petko
    * Subsequent changes listed at PmWiki:ChangeLog
*/
if($action=='recipecheck') {
  SDV($HandleActions['recipecheck'], 'HandleRecipeCheckCore');
  SDV($HandleAuth['recipecheck'], 'admin');
  SDV($ActionTitleFmt['recipecheck'], '| $[Recipe Check]');

  SDV($WikiStyleApply['tr'], 'tr');

  SDV($RecipeListUrl, 'https://www.pmwiki.org/pmwiki/recipelist');
}

function HandleRecipeCheckCore($pagename, $auth = 'admin') {
  global $RecipeListUrl, $Version, $RecipeInfo, 
    $RecipeCheckFmt, $PageStartFmt, $PageEndFmt;
  $page = RetrieveAuthPage($pagename, $auth, true, READPAGE_CURRENT);
  if (!$page) Abort('?admin access required');
  $allow_url_fopen = ini_get('allow_url_fopen');
  $cvinfo = GetRecipeListCore($RecipeListUrl);
  if (!$cvinfo) {
    $msg = "Unable to retrieve cookbook data from $RecipeListUrl\n";
    if ($allow_url_fopen !== '1') $msg .= "
      <br /><br />It appears that your PHP environment isn't allowing
      the recipelist to be downloaded from pmwiki.org  
      (allow_url_fopen&nbsp;=&nbsp;$allow_url_fopen).";
    Abort($msg);
  }
  $rinfo['PmWiki:Upgrades'] = $Version;
  ScanRecipeInfoCore('cookbook', $cvinfo, 'Cookbook:');
  $skindirs = glob("pub/skins/*");
  if($skindirs) foreach($skindirs as $skindir) {
    if($skindir[0] == '.') continue;
    if(is_dir($skindir)) ScanRecipeInfoCore($skindir, $cvinfo, 'Skins:');
  }
  foreach((array)$RecipeInfo as $r => $v) {
    if (!isset($v['Version'])) continue;
    if (!preg_match('/:/', $r)) {
      $imap = isset($v['InterMap']) ? $v['InterMap'] : 'Cookbook:';
      $r = $imap.$r;
    }
    $rinfo[$r] = $v['Version'];
  }
  $markup = "!!Recipe status for {\$PageUrl}\n".RecipeTableCore($rinfo, $cvinfo);
  SDV($RecipeCheckFmt, array(&$PageStartFmt, 
    '<div class="recipecheck">', "markup:$markup", '</div>', &$PageEndFmt));
  PrintFmt($pagename, $RecipeCheckFmt);
}


function GetRecipeListCore($url) {
  global $UrlGetFunction, $FmtV;
  SDV($UrlGetFunction, 'file_get_contents');
  $cvinfo = array();
  $resp = @$UrlGetFunction($url);
  if(is_null($resp) || $resp === false || trim($resp) === '') {
    $msg = $FmtV['$UrlGetMsg'] ?? '';
    return ['PmWiki:Upgrades' => "RecipeCheck: unable to retrieve $url$msg"];
  }
  $lines = explode("\n", $resp);
  foreach($lines as $line) {
    if ($line == '' || $line[0] == '#') continue;
    if (preg_match('/(\\S+) +(.*)/', $line, $match)) 
      $cvinfo[$match[1]] = trim($match[2]);
  }
  return $cvinfo;
}


function ScanRecipeInfoCore($dlistfmt, $cvinfo = NULL, $imap = 'Cookbook:') {
  global $RecipeInfo;
  foreach((array)$dlistfmt as $dir) {
    $dfp = @opendir($dir); if (!$dfp) continue;
    while ( ($name = readdir($dfp)) !== false) {
      if ($name[0] == '.') continue;
      if (!preg_match('/\\.php/i', $name)) continue;
      $text = implode('', (array)@file("$dir/$name"));
      if (preg_match("/^\\s*\\\$RecipeInfo\\['(.*?)'\\]\\['Version'\\]\\s*=\\s*'(.*?)'\\s*;/m", $text, $match)) {
        SDV($RecipeInfo[$match[1]]['Version'], $match[2]);
        SDV($RecipeInfo[$match[1]]['InterMap'], $imap);
      }
      if (preg_match("/^\\s*SDV\\(\\s*\\\$RecipeInfo\\['(.*?)'\\]\\['Version'\\]\\s*,\\s*'(.*?)'\\s*\\)\\s*\\;/m", $text, $match)) {
        SDV($RecipeInfo[$match[1]]['Version'], $match[2]);
        SDV($RecipeInfo[$match[1]]['InterMap'], $imap);
      }
      if (@$cvinfo[$name]) {
        $r = preg_replace('/^.*:/', '', $cvinfo[$name]);
        SDV($RecipeInfo[$r]['Version'], "unknown ($name)");
        SDV($RecipeInfo[$r]['InterMap'], $imap);
      }
    }
    closedir($dfp);
  }
}


function RecipeTableCore($rinfo, $cvinfo) {
  $fmt = "||%-40s ||%-20s ||%-20s ||\n";
  $out = "||class='recipecheck sortable filterable' "
    . "cellpadding=0 cellspacing=0\n";
  $out .= sprintf($fmt, '!Recipe', '!local', '!pmwiki.org');
  foreach($rinfo as $r => $lv) {
    $cv = @$cvinfo[$r];
    $style = ($lv == $cv) ? 'ok' : 'check';
    $out .= sprintf($fmt, "%apply=tr $style%[[$r]]", $lv, $cv);
  }
  return $out;
}

