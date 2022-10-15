Audio Book Player by offer0, OCT 2022 (v1)<br/>
<br/>
    Created by offer0<br/>
    If you copy this, please keep the index comment intact, thanks :)<br/>
<br/>
    ***    REQUIREMENTS    ***<br/>
    A folder named AudioBooks in the main folder (where index.html is):<br/>
    If you dont want your audio book collection in the main folder,<br/>
        you can add a folder link (*symlink) called AudioBooks instead<br/>
        --- this is the way my home version is set up - No vhosts needed!<br/>
    Inside that folder is where you put each book folder.<br/>
    ie ./AudioBooks/[Book Name]<br/>
    eg ./AudioBooks/Aliens  --- inside which are 1) audio book files and/or 2) more (sub)folders<br/>

    MediaInfo.exe CLI (if you want track info like comments,performer,release date etc)<br/>
    If you do want to use mediainfo functionality copy mediainfo.exe (for windows) into the bin folder<br/>
    MediaInfo available at https://mediaarea.net/en/MediaInfo/Download/Windows<br/>
    Every other OS has a version available<br/>

    PHP is used to get the folder listings<br/>
    Local Storage for playlists<br/>
    *** END OF REQUIREMENTS ***<br/>

    The audio book player was created using Phaser 3.55.2<br/>
    The option is there to remove fade in and fade outs as theyre quite intensive<br/>
    Any Playlists generated are saved to local storage<br/>
<br/>
    *symlink<br/>
        Windows: mklink /d "path\destination\symlink" "path\to\source"<br/>
        OS-X/Linux: ln -s path/to/source path/destination/symlink<br/>
