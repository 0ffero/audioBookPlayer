<?php
echo "<h2>ANY MISSING FILES IN THE ARRAY BELOW ARE PROBLEMATIC</h2><div>";
//include('jsonHeaders.php');
$mainFolder = 'D:\\__NOTFILMS\\__AUDIO BOOKS\\';

$folder = 'Aliens';
if ($_GET['folderName']) {
    $folder = $_GET['folderName'];
};

$allowed = ['.mp4','.mp3','.m4a', '.m4b'];
$scan = scandir($mainFolder . $folder);

foreach($scan as $entry) {
    if ($entry!=='.' && $entry!=='..') {
        $valid = false;
        // CHECK IF THIS IS AN AUDIO FILE
        foreach ($allowed as $extension) {
            if (!$valid) {
                if (substr_count($entry, $extension)) { $valid=true; }; // if the file has this extension its valid
            };
        };
        if ($valid) {
            $entry = htmlentities($entry);
            $dirList[]=$entry;
        };
    };
};
echo "<pre>"; print_r($dirList); echo "</pre></div>"; exit;
exit;

?>