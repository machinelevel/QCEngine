<?php
/////////////////////////////////////////////////////////////////////////////
// qcengine_random.php
// Copyright 2000-2011 Eric Johnston, Machine Level
// qcengine@machinelevel.com
//
//  License:
//    (This is similar to the zlib license, with item 4 added and modifications
//     which apply only to commercial use.) 
//
//  This software is provided 'as-is', without any express or implied
//  warranty. In no event will the authors be held liable for any damages
//  arising from the use of this software.
//
//  Commercial use requires written authorization from the author.
//  Please contact me, as I can also help make sure you're getting the best use
//  from this software, and have the most up-to-date version.
//
//  Permission is granted to anyone to use this software for non-commercial
//  purposes, and to alter it and redistribute it freely, subject to the
//  following restrictions:
//
//  1. The origin of this software must not be misrepresented; you must not
//     claim that you wrote the original software. If you use this software
//     in a product, an acknowledgment in the product documentation would be
//     appreciated but is not required.
//  2. Altered source versions must be plainly marked as such, and must not be
//     misrepresented as being the original software.
//  3. This notice may not be removed or altered from any source distribution.
//  4. If you find this material useful, I'd love to know. If there is an email
//     address listed above this notice, please consider sending me a note.
//  (end of license text)
//
//  Commercial interest: There are several versions of this software, each
//  designed to maximize speed under different hardware and/or language constraints.
//  For more info, please contact me at qcengine@machinelevel.com
//
// 4/8/2012: switched to randomnumbers.info from University of Geneva, 
//           because it's very simple, and uses an optical source

#if 0 // old versions
include "qrbg.php";
$numBytes = 1000;
$whichService = 'randomnumbers.info';

if ($whichService == 'randomnumbers.info')
{
    // This service only serves 1000 numbers at a time.
    if ($numBytes > 1000)
        $numBytes = 1000;
	$url = "http://www.randomnumbers.info/cgibin/wqrng.cgi?amount=$numBytes&limit=255";
//	echo $url;
	$response = file_get_contents($url);
    $startpos = 4 + strpos($response, '<hr>');    
    $endpos = strpos($response, '<', $startpos + 1);
    $response = substr($response, $startpos, $endpos - $startpos);
//	$response = str_replace("\n", " ", $response);
//	$response = str_replace("\r", " ", $response);
//	$response = str_replace("  ", " ", $response);
//	$response = str_replace("  ", " ", $response);
	$response = trim($response);
	$response = str_replace(" ", ",", $response);
	$response = "[" . $response . "]";
//	$response = str_replace(",]", "]", $response);
	echo 'this is new:' . $response;
}
else if ($whichService == 'qbrg')
{
	$gen = new QRBG("machinelevel","torqueQ");
	//,"random.irb.hr", 8000);  // instantiate QRBG object
	$gen->setCachesize($numBytes);
	$randomByteArray = $gen->getChars($numBytes);
	echo(json_encode($randomByteArray));
}
else if ($random.org == 'qbrg')
{
	$url = "http://www.random.org/cgi-bin/randbyte?nbytes=$numBytes&format=d";
//	echo $url;
	$response = file_get_contents($url);
	$response = str_replace("\n", " ", $response);
	$response = str_replace("\r", " ", $response);
	$response = str_replace("  ", " ", $response);
	$response = str_replace("  ", " ", $response);
	$response = trim($response);
	$response = str_replace(" ", ",", $response);
	$response = "[" . $response . "]";
	$response = str_replace(",]", "]", $response);
	echo $response;
}
#endif

?>
