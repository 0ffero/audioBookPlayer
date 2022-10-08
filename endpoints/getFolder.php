<?php
include('jsonHeaders.php');


$mainFolder = 'D:\\__NOTFILMS\\__AUDIO BOOKS';

$isSubFolder = false; // assume non sub folder initially
if (!isset($_POST['folder'])) {
    $rqfolder = '\\';
} else {
    $rqfolder = '\\' . $_POST['folder'] . '\\';
    $isSubFolder = true;
};

$allowed = ['.mp4','.mp3','.m4a', '.m4b'];
$allowedImages = ['.jpg','.gif','.png','.svg'];

$folder = $mainFolder . $rqfolder;

chdir($folder);

$scan = scandir($folder);
$folders = [];
$files = [];
$images = [];
foreach($scan as $entry) {
    if (is_dir("$folder\\$entry")) {
        if ($entry!=='.'  && $entry!=='..') {
            $folders[] = $entry;
        };
    } else {
        $valid = false;
        // CHECK IF THIS IS AN AUDIO FILE
        foreach ($allowed as $extension) {
            if (!$valid) {
                if (substr_count($entry, $extension)) { $valid=true; }; // if the file has this extension its valid
            };
        };
        if ($valid) { $files[] = $entry; };

        // CHECK IF THIS IS AN IMAGE FILE
        foreach ($allowedImages as $extension) {
            if (substr_count($entry, $extension)) { $images[] = $entry; }; // if the file has this extension its valid
        };

    };
};

$rF = str_replace('\\','',$rqfolder);
$op = ['requested_folder'=>$rF, 'folders'=>$folders, 'files'=>$files, 'images'=>$images, 'isSubFolder'=>$isSubFolder];


echo json_encode($op);
?>