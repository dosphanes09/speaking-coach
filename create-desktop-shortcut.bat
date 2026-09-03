@echo off
setlocal

rem Masaustune tiklanabilir bir kisayol koyar. Kurulum .exe'si uretmez, bu
rem yuzden Windows'un "Uygulama Denetimi" politikasina takilan imzasiz
rem paketleme araclarina hic ihtiyac duymaz.

set "ROOT=%~dp0"

if not exist "%ROOT%package.json" (
  echo Root package.json bulunamadi: "%ROOT%"
  echo Bu dosyayi proje root klasorunden calistirdigindan emin ol.
  pause
  exit /b 1
)

cd /d "%ROOT%"

if not exist "%ROOT%desktop\node_modules\electron\dist\electron.exe" (
  echo Electron henuz kurulmamis.
  echo Once start-desktop.bat dosyasini calistir, uygulama acildiktan sonra buraya don.
  pause
  exit /b 1
)

if not exist "%ROOT%desktop\web\index.html" (
  echo Web paketi olusturuluyor...
  call npm run desktop:web
  if errorlevel 1 (
    echo.
    echo Web paketi olusturulamadi.
    pause
    exit /b 1
  )
)

powershell -NoProfile -ExecutionPolicy Bypass -File "%ROOT%desktop\create-shortcut.ps1" -DesktopDir "%ROOT%desktop"
if errorlevel 1 (
  echo.
  echo Kisayol olusturulamadi. Yukaridaki mesaji kontrol et.
  pause
  exit /b 1
)

echo.
pause

endlocal
