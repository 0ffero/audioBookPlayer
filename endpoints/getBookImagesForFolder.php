<?php
include('jsonHeaders.php');

$mainFolder = 'D:\\__NOTFILMS\\__AUDIO BOOKS';

if (!isset($_POST['folder'])) {
    $op = ['ERROR'=>'No Folder Passed!','endpoint'=>'getBookImages'];
    echo json_encode($op);
    exit;
}

$rqfolder = '\\' . $_POST['folder'] . '\\';


$allowedImages = ['.jpg','.gif','.png','.svg'];

$folder = $mainFolder . $rqfolder;

chdir($folder);

$scan = scandir($folder);
$images = [];
foreach($scan as $entry) {
    if (!is_dir("$folder\\$entry")) {
        $valid = false;
        // CHECK IF THIS IS AN IMAGE FILE
        foreach ($allowedImages as $extension) {
            if (substr_count($entry, $extension)) { $images[] = $entry; }; // if the file has this extension its valid
        };
    };
};

$rF = str_replace('\\','',$rqfolder);
$op = ['requested_folder'=>$rF, 'images'=>$images];


echo json_encode($op);
?>