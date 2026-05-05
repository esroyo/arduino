<?php if (!defined('PmWiki')) exit();
/*  Copyright 2004-2026 Patrick R. Michaud (pmichaud@pobox.com)
    This file is part of PmWiki; you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published
    by the Free Software Foundation; either version 2 of the License, or
    (at your option) any later version.  See pmwiki.php for full details.

    This script provides a URL-approval capability.  To enable this
    script, add the following line to a configuration file:

        include_once('scripts/urlapprove.php');

    The URL prefixes to be allowed are stored as patterns in 
    $WhiteUrlPatterns.  This array can be loaded from config.php, or 
    from the wiki pages given by the $ApprovedUrlPagesFmt[] array.  
    Any http: or https: URL that isn't in $WhiteUrlPatterns is rendered 
    using $UnapprovedLinkFmt.

    The script also provides ?action=approveurls and ?action=approvesites, 
    which scan the current page for any new URLs to be automatically added
    the first page of $UrlApprovalPagesFmt.

    Finally, the script will block any post containing more than
    $UnapprovedLinkCountMax unapproved urls in it.  By default this
    is set to a very large number, leaving the posting of unapproved
    urls wide open, but by setting $UnapprovedLinkCountMax to a smaller
    number you can limit the number of unapproved urls that make it into
    a page.  (Wikispammers seem to like to post long lists of urls, while
    more "normal" authors tend to only post a few.)
    
    Script maintained by Petko YOTOV www.pmwiki.org/petko
*/

$LinkFunctions['http:'] = 'LinkHTTP';
$LinkFunctions['https:'] = 'LinkHTTP';
SDV($ApprovedUrlPagesFmt, array('$SiteAdminGroup.ApprovedUrls'));
SDV($UnapprovedLinkFmt,
  "\$LinkText<a class='apprlink' href='{\$PageUrl}?action=approvesites'>$[(approve sites)]</a>");
SDV($ApproveUrlPattern,
  "\\bhttps?:[^\\s$UrlExcludeChars]*[^\\s.,?!$UrlExcludeChars]");
$WhiteUrlPatterns = (array)@$WhiteUrlPatterns;
SDV($HandleActions['approveurls'], 'HandleApprove');
SDV($HandleAuth['approveurls'], 'edit');
SDV($HandleActions['approvesites'], 'HandleApprove');
SDV($HandleAuth['approvesites'], 'edit');
SDV($UnapprovedLinkCountMax, 1000000);
array_splice($EditFunctions, array_search('PostPage', $EditFunctions),
  0, 'BlockUnapprovedPosts');

function LinkHTTP($pagename,$imap,$path,$alt,$txt,$fmt=NULL) {
  global $EnableUrlApprovalRequired, $IMap, $WhiteUrlPatterns, $FmtV,
    $UnapprovedLink, $UnapprovedLinkCount, $UnapprovedLinkFmt;
  if (!IsEnabled($EnableUrlApprovalRequired,1))
    return LinkIMap($pagename,$imap,$path,$alt,$txt,$fmt);
  static $havereadpages;
  if (!$havereadpages) { 
    ReadApprovedUrls($pagename); 
    pmtoken(); 
    $havereadpages=true;
  }
  
  $p = str_replace(' ','%20',$path);
  $url = str_replace('$1',$p,$IMap[$imap]);
  if (!isset($UnapprovedLink)) $UnapprovedLink = array();
  foreach((array)$WhiteUrlPatterns as $pat) {
    if (preg_match("!^$pat(/|$)!i",$url))
      return LinkIMap($pagename,$imap,$path,$alt,$txt,$fmt);
  }
  $FmtV['$LinkUrl'] = PUE(str_replace('$1',$path,$IMap[$imap]));
  $FmtV['$LinkText'] = $txt;
  $FmtV['$LinkAlt'] = str_replace(array('"',"'"),array('&#34;','&#39;'),strval(@$alt));
  $UnapprovedLink[] = $url;
  @$UnapprovedLinkCount++;
  return FmtPageName($UnapprovedLinkFmt,$pagename);
}

function ReadApprovedUrls($pagename) {
  global $ApprovedUrlPagesFmt, $ApproveUrlPattern, $WhiteUrlPatterns;
  foreach((array)$ApprovedUrlPagesFmt as $p) {
    $pn = FmtPageName($p, $pagename);
    StopWatch("ReadApprovedUrls $pn begin");
    $apage = ReadPage($pn, READPAGE_CURRENT);
    preg_match_all("/$ApproveUrlPattern/",strval(@$apage['text']),$match);
    foreach($match[0] as $a) {
      $quoted = preg_quote($a,'!');
      $WhiteUrlPatterns[] = preg_replace('!^http\\\\:!', 'https?\\:', $quoted);
    }
    StopWatch("ReadApprovedUrls $pn end");
  }
}

function HandleApprove($pagename, $auth='edit') {
  global $IncludedPages, $ApproveUrlPattern, 
    $WhiteUrlPatterns, $ApprovedUrlPagesFmt, $MessagesFmt, $action;
  $aname = FmtPageName($ApprovedUrlPagesFmt[0],$pagename);
  $apage = RetrieveAuthPage($aname, $auth);
  if (!$apage) Abort("?cannot edit $aname");
  
  $approved = $_POST['approved'] ?? [];
  $approved = preg_grep("/^$ApproveUrlPattern$/", $approved);
  $approved = array_unique($approved);
  if ($approved) {
    if (pmtoken(1)) {
      $new = $apage;
      if (substr($new['text'],-1,1)!="\n") $new['text'].="\n";
      foreach($approved as $a) {
        $new['text'].="  $a\n";
      }
      if ($new['text'] != $apage['text']) {
        Lock(2);
        PostPage($aname,$apage,$new);
      }
      Redirect($pagename);
    }
    $MessagesFmt[] = '$[Token invalid or missing]';
  }
  
  $page = ReadPage($pagename);
  $text = preg_replace('/\\(:markup.*?:\\)\\s*\\[([@=])([\\s\\S]*?)\\1\\]/','$2',$page['text']);
  $text = preg_replace('/[()]/','',$text);
  $text = MarkupEscape($text);
  preg_match_all("/$ApproveUrlPattern/",$text,$match);
  ReadApprovedUrls($pagename);
  $pending = array_unique($match[0]);
  $checkboxes = $links = [];
  foreach($pending as $a) {
    if ($action=='approvesites') # action=approveurls for full urls
      $b=preg_replace("!^([^:]+://[^/]+).*$!",'$1',$a);
    else $b = $a;
    foreach((array)$WhiteUrlPatterns as $pat)
      if (preg_match("!^$pat(/|$)!i",$b)) continue 2;
    $checked = !$approved || in_array($b, $approved) ? 'checked=checked': '';
    $chk = "(:input checkbox approved[] \"$b\" \"$b\" $checked:) ";
    $checkboxes[$b] = $chk;
    $links[$b][] = $a;
  }
  
  PreviewPage($pagename,$page,$page);
  $incp = array_diff(array_keys($IncludedPages), array($pagename));
  if($incp) {
    $inctext = "\n$[Text or data included from other pages]\n";
    foreach($incp as $pn) {
      $inctext.= "* [[$pn?action=$action| $[(approve sites)] ]] [[$pn]]\n";
    }
  }
  else {
    $inctext = '';
  }
  if($checkboxes) {
    $submit = '(:input submit post "$[Save]":) &nbsp; ';
  }
  else {
    $submit = '$[No unapproved links in this page.] ';
  }
  
  
  foreach($checkboxes as $b=>&$markup) {
    foreach($links[$b] as $k=>$link) {
      $j = $k+1;
      $link = PHSCQF($link);
      $markup .= Keep(" <a target='_blank' rel='noreferrer' href='$link' title=\"$link\">[$j]</a>");
    }
  }
  
  $form  = "(:messages:)\n";
  $form .= "(:input form action={\$PageUrl}?action=approvesites method=post class=frame:)";
  $form .= "(:input hidden action approvesites:)(:input hidden n $pagename:)";
  $form .= "(:input pmtoken:)\n";
  $form .= "!! $[(approve sites)]\n";
  $form .= implode("\\\\\n", $checkboxes);
  $form .= "\n\n{$submit}[[$pagename| $[Cancel] ]]\n";
  $form .= "$inctext";
  $form .= "(:input end:)\n\n";
  
  global $PageStartFmt, $PageEndFmt, $UnapprovedLinkFmt;
  $UnapprovedLinkFmt = "<a target='_blank' class='urllink' href='\$LinkUrl' title='\$LinkAlt' 
    rel='noreferrer'><mark>\$LinkText</mark></a><mark> $[(approve sites)]</mark>";
  $fmt = [$PageStartFmt, "markup:$form", "wiki:$pagename", $PageEndFmt];
  PrintFmt($pagename, $fmt);
}

function BlockUnapprovedPosts($pagename, &$page, &$new) {
  global $EnableUrlApprovalRequired, $UnapprovedLinkCount,
    $UnapprovedLinkCountMax, $EnablePost, $MessagesFmt, $BlockMessageFmt;
  if (!IsEnabled($EnableUrlApprovalRequired, 1)) return;
  if ($UnapprovedLinkCount <= $UnapprovedLinkCountMax) return;
  if ($page['=auth']['admin']) return;
  $EnablePost = 0;
  $MessagesFmt[] = $BlockMessageFmt;
  $MessagesFmt[] = XL('Too many unapproved external links.');
}

