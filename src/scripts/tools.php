<?php if (!defined('PmWiki')) exit();
/*  Copyright 2019-2025 Petko Yotov www.pmwiki.org/petko
    This file is part of PmWiki; you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published
    by the Free Software Foundation; either version 2 of the License, or
    (at your option) any later version.  See pmwiki.php for full details.

    This script includes various helper functions that can be called by
    recipes and extensions. It is not included by default, recipes that
    require it can enable it with such a line:
    
    include_once("$FarmD/scripts/tools.php");
*/


# This helper function combines a multipart message with plain text,
# wiki markup (converted to html), html, embedded pictures and attached files.
# It returns the combined message and an additional multipart/mixed header.
# Based on Cookbook:SMTPMail by Petko Yotov
function PmMultipartMail($parts, $pn=null) {
  global $Charset, $UploadExts, $pagename, $PmMultipartMailCSS, $LinkFunctions, 
    $PmMultipartMarkupTemplate, $PmMMCids, $PmMMCidMap, $PmMMCidDirs, $PmMMCTE;
  
  if (is_null($pn)) $pn = $pagename;
  $message = '';
  
  SDV($PmMMCidDirs, 'pub|uploads');
  $encodings = [
    'base64' => 'base64_encode',
    'quoted-printable' => 'quoted_printable_encode',
  ];
  
  Markup('cid:img', '<img', "/\\b(cid:((?:$PmMMCidDirs)\\/[-\\\\a-z0-9._\\/]+)\\.(?:gif|jpe?g|png))(?:\"([^\"]*)\")?/i", 'mu_cid_img');
  
  
  $boundary = "PM-MULTIPART-MIXED-BOUNDARY";
  
  $lf = $LinkFunctions;
  $LinkFunctions['mailto:'] = 'LinkIMap'; # if custom mailto: function
  
  $headers = [ 
    'MIME-Version' => '1.0',
    'Content-Type' => "multipart/mixed; boundary=\"$boundary\"",
  ];
  
  $parts = (array)$parts;
  while (!empty($parts)) {
    $content = array_shift($parts);
    $j = 'text'; $fname = $cid = $ct = '';
    
    if (preg_match('/^(cid|file|markup|html|content|contentasfile):(.*)$/s', $content, $m)) {
      $j = $m[1]; $content = $m[2];
    }
    if ($j=='contentasfile') { # used for example for CSV data
      list($fname, $content) = explode("\n", $content, 2);
    }
    elseif ($j=='cid'||$j=='file') {
      if (!file_exists($m[2])) continue;
      $fname = preg_replace('!/+!s', '-', $m[2]);
      $content = file_get_contents($m[2]);
    }
    elseif ($j=='markup') {
      $PmMMCids = [];
      $tpl = IsEnabled($PmMultipartMarkupTemplate, '');
      if (strpos($tpl, '{$$content}') !== false)
        $content = str_replace('{$$content}', $content, $tpl);
      $content = MarkupToHTML($pn, $content);
      if(is_array($PmMMCidMap) && $PmMMCidMap) {
        $content = preg_replace_callback('/(<img[^>]* src=([\'"]))(.*?)(\\2.*?>)/si', 'PmMMEmbedded', $content);
      }
      foreach($PmMMCids as $cid=>$ignore) {
        $parts[] = $cid;
      }
    }
    
    if ($j=='text') {
      $ct = "text/plain; charset=$Charset";
    }
    elseif ($j=='markup'||$j=='html') {
      $ct = "text/html; charset=$Charset";
      
      if (!preg_match('!<html.*?>!si', $content)) {
        $styles = empty($PmMultipartMailCSS) ? '': implode("\n", (array)$PmMultipartMailCSS);
        
        $content = "<!doctype html><html><head><meta charset=\"$Charset\">
<style>.vspace{margin-top:1.5rem;} .indent{margin-left:40px;} .right{text-align:right;}$styles</style>
</head><body>$content</body></html> ";
      }
    }
    else {
      $ext = strtolower(preg_replace('!^.*\\.!', '', $fname));
      if (isset($UploadExts[$ext])) $ct = $UploadExts[$ext];
      else $ct = 'application/octet-stream';
    }
    if ($fname) $ct .= "; name=\"$fname\"";
    
    $message .= "--$boundary\n";
    $message .= "Content-Type: $ct\n";
    if ($j=='cid') {
      $message .= "Content-ID: <$fname>\n";
      $message .= "X-Attachment-Id: $fname\n";
    }
       
    if ($j=='markup'||$j=='text'||$j=='html') $cd = '';
    elseif ($j=='cid') $cd = 'inline';
    else $cd = "attachment";
    
    if ($cd && $fname) $cd .= "; filename=\"$fname\"";
    
    if ($cd) $message .= "Content-Disposition: $cd\n";
    
    if ($j!='text' && $j!='markup' && $j!='html') {
      $content = chunk_split(base64_encode($content), 76, "\n");
      $message .= "Content-Transfer-Encoding: base64\n";
    }
    if($j=='markup' || $j=='html') {
      $ctefn = $encodings[$PmMMCTE]??false;
      if($ctefn) {
        $message .= "Content-Transfer-Encoding: $PmMMCTE\n";
        $content = $ctefn($content);
      }
    }
    $message .= "\n$content\n\n";
  }
  
  if(count($parts)==1 && substr($ct, 0, 5) == 'text/') {
    $headers['Content-Type'] = $ct;
    $message = $content;
  }
  else {
    $message .= "--$boundary--\n";
  }
  
  $message = str_replace("\n", "\r\n", $message);
  
  $LinkFunctions = $lf;
  return [$message, $headers];
}

function PmMMEmbedded($m) {
  global $PmMMCids, $PmMMCidMap;
  list($all, $start, $q, $url, $end) = $m;
  if(!preg_match('/\\.(png|gif|jpg|webp)$/i', $url)) return $all;
  $path = PPRA($PmMMCidMap, $url);
  $path = preg_replace('!\\.+/+!', '', $path); # prevent ../../
  if(strpos($path, ':')!==false) return $all;
  if(!file_exists($path)) return $all;
  $cid = preg_replace('!/+!', '-', $path);
  $PmMMCids["cid:$path"] = 1;
  return "{$start}cid:$cid$end";
}

function mu_cid_img($m) {
  global $PmMMCids;
  $part = preg_replace('!\\.+/+!', '', $m[1]); # prevent ../../
  $url = preg_replace('!/+!', '-', $part);
  $PmMMCids[$part] = 1;
  $alt = isset($m[3]) ? $m[3] : $m[2];
  return Keep("<img src='$url' alt='$alt' title='$alt'>", 'L');
}

class PmCrypto {
  protected $key;
  protected $cipher = 'aes-256-cbc';
  protected $ivlen;
  protected $auth = true;
  protected $base64 = true;
  
  public function __construct($key, $options = null) {
    $this->key = $key;
    if (is_string($options)) $this->cipher = $options;
    elseif (is_array($options)) {
      foreach ($options as $k => $v) {
        if (property_exists($this, $k)) $this->$k = $v;
      }
    }
    $this->ivlen = openssl_cipher_iv_length($this->cipher);
  }

  public function encrypt($plaintext, $keypattern = null) {
    if (is_array($plaintext)) {
      $ciphertext = [];
      foreach ($plaintext as $k=>$v) {
        if(!$keypattern || MatchNames($k, $keypattern, false))
          $ciphertext[$k] = $this->encrypt($v);
        else $ciphertext[$k] = $v;
      }
      return $ciphertext;
    }
    $iv = openssl_random_pseudo_bytes($this->ivlen);
    $ciphertext = openssl_encrypt($plaintext, $this->cipher, $this->key, OPENSSL_RAW_DATA, $iv);
    $hmac = $this->auth ? hash_hmac('sha256', $iv . $ciphertext, $this->key, true): '';
    $out = $iv . $hmac . $ciphertext;
    return $this->base64 ? base64_encode($out) : $out;
  }

  public function decrypt($data, $keypattern = null) {
    if (is_array($data)) {
      $plaintext = [];
      foreach ($data as $k=>$v) {
        if(!$keypattern || MatchNames($k, $keypattern, false))
          $plaintext[$k] = $this->decrypt($v);
        else $plaintext[$k] = $v;
      }
      return $plaintext;
    }
    if ($this->base64) $data = base64_decode($data);
    $iv = substr($data, 0, $this->ivlen);
    if ($this->auth) {
      $hmac_received = substr($data, $this->ivlen, 32);
      $ciphertext = substr($data, $this->ivlen+32);
      $hmac_calculated = hash_hmac('sha256', $iv . $ciphertext, $this->key, true);
    
      if (!hash_equals($hmac_received, $hmac_calculated)) return false;
    }
    else $ciphertext = substr($data, $this->ivlen);
    return openssl_decrypt($ciphertext, $this->cipher, $this->key, OPENSSL_RAW_DATA, $iv);
  }
  
  public function __debugInfo() {
    return [
      'key' => '[hidden]',
      'cipher' => $this->cipher,
      'ivlen' => $this->ivlen,
      'auth' => $this->auth,
      'base64' => $this->base64,
    ];
  }

  public function __toString() {
    return print_r($this->__debugInfo(), true);
  }
  
}

class PmTOTP {
  protected $alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  protected $alpharev;
  protected $user;
  protected $issuer;
  protected $now;
  protected $timestep = 30;
  protected $digits = 6;
  protected $window = 1;
  function __construct($properties=[]) {
    global $WikiTitle;
    foreach ($properties as $key => $value) {
      if (property_exists($this, $key))
        $this->$key = $value;
    }
    $this->now = floor(time() / $this->timestep);
    $this->alpharev = array_flip(str_split($this->alphabet));
    if (empty($this->issuer)) $this->issuer = $WikiTitle;
  }
  
  function encode32($data) {
    $binaryString = '';
    foreach (str_split($data) as $char) {
      $binaryString .= sprintf('%08b', ord($char));
    }
    # make it multiple of 5
    $mod = strlen($binaryString) %5;
    if ($mod) $binaryString .= str_repeat('0', 5-$mod);
    $chunks5 = str_split($binaryString, 5);
    $base32 = '';
    foreach ($chunks5 as $chunk) {
      $base32 .= $this->alphabet[bindec($chunk)];
    }
    return $base32;
  }
  function decode32($base32) {
    if (empty($base32)) return '';
    
    $binaryString = '';
    for($i = 0; $i < strlen($base32); $i++)
      $binaryString .= sprintf('%05b', $this->alpharev[$base32[$i]]);
    $bytes = str_split($binaryString, 8);
    $decodedBin = '';
    foreach ($bytes as $byte) {
      if (strlen($byte)!=8) continue; # last bit leftover from encoding
      $decodedBin .= chr(bindec($byte));
    }
    return $decodedBin;
  }
  
  function mktotp($secret, $distance = 0) {
    $epoch = $this->now + $distance;
    $binsecret = $this->decode32($secret);
    $time = pack('N*', 0) . pack('N*', $epoch);
    $hash = hash_hmac('sha1', $time, $binsecret, true);
    
    $offset = ord($hash[19]) & 0x0F;
    // 4-byte chunk from the hash starting at the offset
    $slice = substr($hash, $offset, 4);
    $binary = unpack('N', $slice);
    $value = $binary[1] & 0x7FFFFFFF;
    $otp = $value % pow(10, $this->digits);
    return sprintf("%0{$this->digits}d", $otp);
  }
  
  function mksecret($length = 16) {
    $rbytes = random_bytes($length);
    return $this->encode32($rbytes);
  }
  
  function verify($secret, $usercode) {
    if (!$secret ||!$usercode) return false;
    for($i=-$this->window; $i<=$this->window; $i++) {
      $otp = $this->mktotp($secret, $i);
      if (hash_equals($otp, $usercode)) return true;
    }
    return false;
  }
}

# This estimates the current Firefox version (for browser requests)
function PmFFVersion($stamp = null) {
  global $PmFFVersionData;
  SDVA($PmFFVersionData, array(
    'baseday' => gregoriantojd(14, 9, 2025),# m, d, y
    'basever' => 143, # version on that date
    'interval' => 28,
  ));
  if(is_null($stamp)) $stamp = time();
  $currday = unixtojd($stamp);
  $diffday = $currday-$PmFFVersionData['baseday'];
  $diffver = floor($diffday/$PmFFVersionData['interval']);
  return $PmFFVersionData['basever']+$diffver-1;# previous, avoid overtaking
}




