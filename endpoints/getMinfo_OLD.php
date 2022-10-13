<?php
include('jsonHeaders.php');
$endpoint = 'getMinfo.php';

/*
    MediaInfo CLI (very important) exe is required to get media info
    Change the $executable var below to point to your copy
    
    Download From:
    WINDOWS: https://mediaarea.net/en/MediaInfo/Download/Windows
    EVERYTHING ELSE: https://mediaarea.net/en/MediaInfo/Download
*/
$executable = '..\\bin\\minfo.exe'; // default folder is one directory up bin/

// make sure the POST vars are passed
if (!isset($_POST['folder']) || !isset($_POST['crc'])) { $op = ['ERROR' => 'Folder or crc wasnt passed', 'endpoint'=>$endpoint]; echo json_encode($op); exit; };
$crc = $_POST['crc'];
$folder = $_POST['folder'];

// TEST VARS
/*
$crc = '2417457317';
$folder = 'Aliens';
*/

// check if mediainfo exe if available
if (!is_file($executable)) { $op = ['WARNING' => 'MediaInfo executable wasnt found. Unable to gather media info for folder', 'endpoint'=>$endpoint]; echo json_encode($op); exit; };


$cacheFolder = 'cache/';
$cacheFileName = 'book.log';
$mainFolder = '../AudioBooks/';
$fullpath = $mainFolder . $folder;

// check if the folder exists
if (!is_dir($fullpath)) { $op = ['ERROR' => 'Folder wasnt found', 'endpoint'=>$endpoint]; echo json_encode($op); exit; };


// check for the cache folder
$saveFolder = $cacheFolder . $crc;
$cacheFile = $saveFolder . '/' . $cacheFileName;
if (is_dir($saveFolder) && is_file($cacheFile)) {
    $compressedJSON = file_get_contents($cacheFile);
    $json = gzuncompress($compressedJSON);
    echo $json;
    exit;
} else { // it doesnt exist, create it
    mkdir($saveFolder);
};


// ALL CHECKS ARE DONE
$ops = []; // the full output array, contains data on every file

// Im slowly joining a few of these requests together
// the inform sets are split into single requests
// this means each file is checked multiple times (~10 times) the reason is so
// we can make the output pretty without having to split the string and mess
// about with it
// it can be slow (Aliens takes around 6 seconds which has 15 files in it)
// American Gods, as another example, is 115 files
$informSets = ['General'=>['%Album%','%Track%','%Duration/String3%','%Performer%','%Album/Performer%','%Released_Date%','%Original/Released_Date%','%Recorded_Date%','%Comment%'],'Audio'=>['%BitRate/String%\n%Channel(s)%\n%SamplingRate%']];
$informSets = ['General'=>['%Album%\n%Track%\n%Duration/String3%\n%Performer%\n%Album/Performer%\n%Released_Date%\n%Original/Released_Date%\n%Recorded_Date%','%Comment%'],'Audio'=>['%BitRate/String%\n%Channel(s)%\n%SamplingRate%']];



$allowed = ['.mp4','.mp3','.m4a', '.m4b'];
$bad = ['%','/String3','/String'];
$scan = scandir($fullpath);
foreach($scan as $entry) {
    $valid = false;
    // CHECK IF THIS IS AN AUDIO FILE
    foreach ($allowed as $extension) {
        if (!$valid) {
            if (substr_count($entry, $extension)) { $valid=true; }; // if the file has this extension, its valid
        };
    };
    
    // if valid, start grabbing the information from the file
    if ($valid) {
        $ops[$entry] = [];
        foreach ($informSets as $key => $informs) {
            $ops[$entry][$key] = [];
            foreach ($informs as $informVar) {
                $inform = " --Inform=\"$key;$informVar\" ";
                $execString = $executable . ' ' .  $inform . '"' . $fullpath . '/' . $entry . '"';
                exec($execString,$op);
                $iV = str_replace($bad,'',$informVar);
                if ($key==='Audio'||$key==='General') {
                    $keys = explode('\n',$iV);
                    foreach ($keys as $i=>$keyName) {
                        $ops[$entry][$key][$keyName] = $op[$i];
                    };
                } else {
                    $ops[$entry][$key][$iV]=$op[0];
                };
                unset($op);
            };
        };
    };
};


$json = json_encode($ops);
$compressedJSON = gzcompress($json);
file_put_contents($cacheFile,$compressedJSON);

echo $json;

?>