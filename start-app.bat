@echo off
setlocal

set "ROOT=%~dp0"

call "%ROOT%start-backend.bat"

echo Backend ayri pencerede baslatildi.
echo Simdi Expo bu pencerede baslayacak; QR kodu burada goreceksin.
echo.
call "%ROOT%start-expo.bat"

endlocal
