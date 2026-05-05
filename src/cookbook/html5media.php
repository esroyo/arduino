<?php if (!defined('PmWiki')) exit();
/*
This file is HTML5Audio.php; you
can redistribute it and/or modify it under the
terms of the GNU General Public License as
published by the Free Software Foundation
http://www.fsf.org either version 2 of the 
License, or (at your option) any later version.

Copyright 2010 GNUZoo (guru@gnuzoo.org)

	http://www.pmwiki.org/wiki/Profiles/GNUZoo

Please donate to the author:

	http://gnuzoo.org/GNUZooPayPal/
*/

$RecipeInfo['HTML5Media']['Version'] = '1.0';

switch ($action) {
	case "edit"   :
	case "print"  :
	if (! @$_POST['preview']) break;
	case "browse" :
		Markup_e('HTML5Media', 'directives', '/\\(:html5media(\\s.*?)?:\\)/i', "HTML5Media(\$pagename, PSS(\$m[1]))");
}
function HTML5Media($pagename, $args) {
	global $HTML5MediaDir, $PubDirUrl, $UploadPrefixFmt,
        $UploadUrlFmt, $UploadExts, $UploadDir;
	$args = ParseArgs($args);
	
    $filename = $args['filename'];
	$width    = $args['width'];
	$height   = $args['height'];

    SDV($UploadUrlFmt, $PubDirUrl.'/uploads');
    SDV($UploadPrefixFmt, '/$Group/$Name');
	SDV($HTML5MediaDir, $UploadUrlFmt.$UploadPrefixFmt.'/');

    $HTML5MediaDir = FmtPageName($HTML5MediaDir, $pagename);
    $filepath = FmtPageName($UploadDir.$UploadPrefixFmt.'/', $pagename);

	if ($width  == '') $width  = 480;
	if ($height == '') $height = 360;
    
    $flist = explode(',', $filename);
    $filename = array_shift($flist);
    preg_match('/(.+)\.(\w{2,4})$/', $filename, $m);

    if ($m && array_key_exists($m[2], $UploadExts) && file_exists($filepath.$filename)) {
        $mime = $UploadExts[$m[2]];

        if (strstr($mime, 'audio')) {
            $out[] = "<audio controls='controls' >\n";
            $out[] = "<source src='{$HTML5MediaDir}{$filename}'  type='{$mime}' />\n";
            $sources[] = $filename;
            while ($flist) {
                $filename = array_shift($flist);
                preg_match('/(.+)\.(\w{2,4})$/', $filename, $m);
                if ($m && array_key_exists($m[2], $UploadExts) && strstr($UploadExts[$m[2]],'audio')
                    && file_exists($filepath.$filename))
                    $out[] = "<source src='{$HTML5MediaDir}{$filename}'  type='{$UploadExts[$m[2]]}' />\n";
                    $sources[] = $filename;
            }
            $out[] = "<br />El vostre navegador no suporta HTML5.\n";
            $out[] = "<br />Fitxers disponibles:\n<ul>\n";
            foreach($sources as $filename)
                $out[] = "\t<li><a href='{$HTML5MediaDir}{$filename}'>{$filename}</a></li>\n";
            $out[] = "</ul>\n</audio>";
        } else if (strstr($mime, 'video')) {
            $out[] = "<video width='{$width}' height='{$height}' controls='controls' >\n";
            $out[] = "<source src='{$HTML5MediaDir}{$filename}'  type='{$mime}' />\n";
            $sources[] = $filename;
            while ($flist) {
                $filename = array_shift($flist);
                preg_match('/(.+)\.(\w{2,4})$/', $filename, $m);
                if ($m && array_key_exists($m[2], $UploadExts) && strstr($UploadExts[$m[2]],'video')
                    && file_exists($filepath.$filename))
                    $out[] = "<source src='{$HTML5MediaDir}{$filename}'  type='{$UploadExts[$m[2]]}' />\n";
                    $sources[] = $filename;
            }
            $out[] = "<br />El vostre navegador no suporta HTML5.\n";
            $out[] = "<br />Fitxers disponibles:\n<ul>\n";
            foreach($sources as $filename)
                $out[] = "\t<li><a href='{$HTML5MediaDir}{$filename}'>{$filename}</a></li>\n";
            $out[] = "</ul>\n</audio>";
        }
    }
    if ($out)
        return Keep(implode('', $out));
}
