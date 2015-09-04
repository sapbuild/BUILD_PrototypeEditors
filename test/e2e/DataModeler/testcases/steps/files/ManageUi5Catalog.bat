@echo off

set CURDIR=%~dp0
REM echo %CURDIR%
set ZIPFILE=

cd %CURDIR%
echo Delete zip files
echo 
for /F "usebackq delims=" %%a in (`dir /b *.zip`) do (
     echo Deleting %%a 
     del %%a
)

echo Downloading latest version

call node downloadUi5Catalog.js

for /F "usebackq delims=" %%a in (`dir /b *.zip`) do (
     set ZIPFILE=%%a 
)

echo Downloaded file: %ZIPFILE%

if EXIST %ZIPFILE% (
    echo Importing %ZIPFILE%
    call node importUI5Catalog.js --filePath %ZIPFILE%
) ELSE (
    echo downloading zip file has failed, nothing has been imported
)