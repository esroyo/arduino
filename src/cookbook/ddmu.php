<?php if (!defined('PmWiki')) exit();
/**
  DDMU: Drag & Drop multiple asynchronous file uploader for PmWiki
  Written by (c) Petko Yotov 2011

  This text is written for PmWiki; you can redistribute it and/or modify
  it under the terms of the GNU General Public License as published
  by the Free Software Foundation; either version 3 of the License, or
  (at your option) any later version. See pmwiki.php for full details
  and lack of warranty.

  Copyright 2011 Petko Yotov http://5ko.fr
  Development sponsored by Notamment http://notamment.fr
*/
# Version date
$RecipeInfo['DDMU']['Version'] = '201108126a';

if($action=='edit' || $action == 'upload') $PostConfig['DDMU_js'] = 200;

if(@$_REQUEST['ddmu']) {
  $UploadRedirectFunction = 'DDMURedirect';
  $_POST['ddmu'] = 1;
  $EnableRedirect = 0;
  foreach(explode(' ', 'Header Footer Left Right Action Title') as $k) {
    SetTmplDisplay("Page{$k}Fmt",0);
  }
}
function DDMURedirect($pn, $url) {
  if($_POST['authpw']>'' || $_GET['insattach']>'') # async login succeeded
    die(XL("Login successful, you can now upload."));
  die ($url);
}

function DDMU_js($pagename) {
  global $HTMLStylesFmt, $HTMLHeaderFmt, $UploadExtSize, $XL, $DDMUDirUrl, $DDMUHeaderFmt, $PageUrl, $DDMUEnableDropzone;
  SDV($DDMUDirUrl, '$FarmPubDirUrl/ddmu');
  SDVA($DDMUHeaderFmt, array(
    'unverse.js' => "<script type='text/javascript' src='$DDMUDirUrl/unverse.js'></script>\n",
    'ddmu.js'    => "<script type='text/javascript' src='$DDMUDirUrl/ddmu.js'></script>\n",
    'ddmu.css'   => "<link rel='stylesheet' href='$DDMUDirUrl/ddmu.css' type='text/css' media='screen'/>\n",
  ));
  SDVA($HTMLHeaderFmt, $DDMUHeaderFmt);

  XLSDV('en', array(
    'ULuploading'=>"uploading...",
    'ULunknown_error'=>"unknown error",
    'ULlogin'=>XL("Password required"),
    'ULdd_pagename'=>$pagename,
    'ULdd_pageurl'=>PageVar($pagename, '$PageUrl'),
    'ULdropzone_innerHTML'=>"Drop files to upload: ",
    'ULdd_enable_dropzone'=>IsEnabled($DDMUEnableDropzone, 0),
  ));

  $sizes = array();
  foreach($UploadExtSize as $ext=>$size) {
    if($ext == '') $ext = "/";
    if($size) $sizes[] = "'$ext': $size";
  }

  $codes = array();
  foreach($XL['en'] as $k=>$v) {
    if(strpos($k, 'UL')!==0) continue;
    $codes[] = "'".substr($k, 2)."': \"".str_replace(array('"', "\n", '$'), array("&quot;", " ", "\\x24"), XL($k))."\"";
  }

  $HTMLHeaderFmt['DDMU'] ="
  <script type='text/javascript'><!--
    var DDMU_max_size = {
      ".implode(",\n      ", $sizes)."
    };
    var DDMU_return_codes = {
      ".implode(",\n      ", $codes)."
    }; //--></script>\n";

}
