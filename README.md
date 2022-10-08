Audio Book Player by offer0, OCT 2022 (v1)<br/>
<br/>
***    REQUIREMENTS    ***<br/>
A folder named AudioBooks in the main folder (where index.html is):<br/>
If you dont want your audio book collection in the main folder,<br/>
    you can add a folder link called AudioBooks instead<br/>
    (the way my home version is set up) - No vhosts needed!<br/>
Inside that folder is where you put each book folder.<br/>
ie ./AudioBooks/[Book Name]<br/>
eg ./AudioBooks/Aliens  --- inside which are 1) audio book files and/or 2) more (sub)folders<br/>
PHP is used to get the folder listings<br/>
*** END OF REQUIREMENTS ***<br/>
<br/>
The audio book player was created using Phaser 3.55.2<br/>
It currently runs at 2560x1440<br/>
V1.x+ will allow it to runs at half resolution as older iGPUs die under the stress<br/>
The option is there to remove fade in and fade outs as theyre very intensive
