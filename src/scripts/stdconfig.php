<?php if (!defined('PmWiki')) exit();
/*  Copyright 2002-2025 Patrick R. Michaud (pmichaud@pobox.com)
    This file is part of PmWiki; you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published
    by the Free Software Foundation; either version 2 of the License, or
    (at your option) any later version.  See pmwiki.php for full details.

    This file allows features to be easily enabled/disabled in config.php.
    Simply set variables for the features to be enabled/disabled in config.php
    before including this file.  For example:
        $EnableQAMarkup=0;                      #disable Q: and A: tags
        $EnableWikiStyles=1;                    #include default wikistyles
    Each feature has a default setting, if the corresponding $Enable
    variable is not set then you get the default.

    To avoid processing any of the features of this file, set 
        $EnableStdConfig = 0;
    in config.php.
    
    Script maintained by Petko YOTOV www.pmwiki.org/petko
*/

$pagename = ResolvePageName($pagename);

if (!IsEnabled($EnableStdConfig,1)) return;


if (!function_exists('session_start') && IsEnabled($EnableRequireSession, 1))
  Abort('PHP is lacking session support', 'session');

if (IsEnabled($EnablePGCust,1))
  include_once("$FarmD/scripts/pgcust.php");

asort($PostConfig, SORT_NUMERIC);
while(count($PostConfig)) {
  $k = array_keys($PostConfig)[0];
  $v = $PostConfig[$k];
  if($v>=50) break;
  array_shift($PostConfig);
  if (!$k || !$v || $v<0) continue;
  if (function_exists($k)) $k($pagename);
  elseif (file_exists($k)) include_once($k);
}

if (IsEnabled($EnableCommonEnhancements,0)) {
  # Security + review changes
  SDV($EnableCookieHTTPOnly, 1);
  SDV($EnableObfuscateEmails, 1);
  SDV($EnableRCDiffBytes, 1);
  SDV($EnableLocalTimes, 3);
  
  # Editing
  SDV($EnablePreviewChanges, 1);
  SDV($EnableMergeLastMinorEdit, 12*3600);
  SDV($EnableListIncludedPages, 1);
  SDV($EnablePmSyntax, 2);
  SDV($EnableEditAutoText, 1);
  SDV($EnableGUIButtons, 1);
  SDV($EnableGuiEditFixUrl, 220);

  # Documentation
  SDVA($PmTOC, array('Enable'=>1, 'EnableBacklinks'=>1));
  SDV($EnableCopyCode, 1);
  
  # Uploads (if enabled)
  SDV($EnableUploadDrop, 1);
  SDV($EnableRecentUploads, 1);
  SDV($EnableUploadVersions, 1);
}

if (IsEnabled($EnableUrlApprove, 0))
  include_once("$FarmD/scripts/urlapprove.php");

if (IsEnabled($EnablePmForm, 0))
  include_once("$FarmD/scripts/pmform.php");
  
if (IsEnabled($EnableCreole, 0))
  include_once("$FarmD/scripts/creole.php");
  
if (IsEnabled($EnableRefCount, 0) && $action == 'refcount')
  include_once("$FarmD/scripts/refcount.php");

if (isset($EnableFeeds[$action]) && $EnableFeeds[$action])
  include_once("$FarmD/scripts/feeds.php");


if (IsEnabled($EnableRobotControl,1))
  include_once("$FarmD/scripts/robots.php");

if (IsEnabled($EnableCaches, 1))
  include_once("$FarmD/scripts/caches.php");

## Scripts that are part of a standard PmWiki distribution.
if (IsEnabled($EnableAuthorTracking,1)) {
  include_once("$FarmD/scripts/author.php");
  EnableSignatures();
}
if (IsEnabled($EnablePrefs, 1))
  include_once("$FarmD/scripts/prefs.php");
if (IsEnabled($EnableSimulEdit, 1))
  include_once("$FarmD/scripts/simuledit.php");
if (IsEnabled($EnableDrafts, 0))
  include_once("$FarmD/scripts/draft.php");        # after simuledit + prefs
if (IsEnabled($EnableSkinLayout,1))
  include_once("$FarmD/scripts/skins.php");        # must come after prefs
if (@$Transition || IsEnabled($EnableTransitions, 0))
  include_once("$FarmD/scripts/transition.php");   # must come after skins
if (@$LinkWikiWords || IsEnabled($EnableWikiWords, 0))
  include_once("$FarmD/scripts/wikiwords.php");    # must come before stdmarkup
if (IsEnabled($EnableStdMarkup,1))
  include_once("$FarmD/scripts/stdmarkup.php");    # must come after transition
if (($action=='diff' && @!$HandleActions['diff'])
  || (IsEnabled($EnablePreviewChanges, 0) && @$_REQUEST['preview']>''))
  include_once("$FarmD/scripts/pagerev.php");
if (IsEnabled($EnableWikiTrails,1))
  include_once("$FarmD/scripts/trails.php");
if (IsEnabled($EnableWikiStyles,1))
  include_once("$FarmD/scripts/wikistyles.php");
if (IsEnabled($EnableMarkupExpressions, 1) 
    && !function_exists('MarkupExpression'))
  include_once("$FarmD/scripts/markupexpr.php");
if (IsEnabled($EnablePageList,1))
  include_once("$FarmD/scripts/pagelist.php");
if (IsEnabled($EnableVarMarkup,1))
  include_once("$FarmD/scripts/vardoc.php");
if (!@$DiffFunction || !function_exists($DiffFunction)) 
  include_once("$FarmD/scripts/phpdiff.php");
if ($action=='crypt')
  include_once("$FarmD/scripts/crypt.php");
if ($action=='edit' || IsEnabled($EnableEditAutoText) > 1)
  include_once("$FarmD/scripts/guiedit.php");
if (IsEnabled($EnableForms,1))
  include_once("$FarmD/scripts/forms.php");       # must come after prefs
if (IsEnabled($EnableUpload,0))
  include_once("$FarmD/scripts/upload.php");      # must come after forms
if (IsEnabled($EnableBlocklist, 0))
  include_once("$FarmD/scripts/blocklist.php");
if (IsEnabled($EnableNotify,0))
  include_once("$FarmD/scripts/notify.php");
if (IsEnabled($EnableDiag,0) || $action == 'recipecheck') 
  include_once("$FarmD/scripts/diag.php");
if (IsEnabled($EnablePmUtils,1))
  include_once("$FarmD/scripts/utils.php");

if (IsEnabled($EnableUpgradeCheck,1) && !IsEnabled($EnableReadOnly, 0)) {
  SDV($StatusPageName, "$SiteAdminGroup.Status");
  $page = ReadPage($StatusPageName, READPAGE_CURRENT);
  if (@$page['updatedto'] != $VersionNum) 
    { $action = 'upgrade'; include_once("$FarmD/scripts/upgrades.php"); }
}
