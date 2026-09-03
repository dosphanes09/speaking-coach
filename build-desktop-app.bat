@echo off
setlocal

rem Gercek bir masaustu uygulamasi uretir:
rem   desktop\release\Daily Speaking Coach\Daily Speaking Coach.exe
rem
rem Kurulum sihirbazi degil, dogrudan calistirilabilir bir uygulama klasoru.
rem Hicbir paketleme araci indirmez veya calistirmaz, bu yuzden Windows'un
rem "Uygulama Denetimi" politikasina takilmaz.

set "ROOT=%~dp0"

if not exist "%ROOT%package.json" (
  echo Root package.json bulunamadi: "%ROOT%"
  echo Bu dosyayi proje root klasorunden calistirdigindan emin ol.
  pause
  exit /b 1
)

cd /d "%ROOT%"

if not exist "%ROOT%node_modules\react-native-web" (
  echo Web bagimliliklari eksik. npm install calistiriliyor...
  call npm install
  if errorlevel 1 (
    echo.
    echo npm install basarisiz. Yukaridaki hata mesajini kontrol et.
    pause
    exit /b 1
  )
)

if not exist "%ROOT%desktop\node_modules\electron\dist\electron.exe" (
  echo Electron kuruluyor. Bu ilk seferde birkac dakika surer...
  call npm --prefix desktop install
  if errorlevel 1 (
    echo.
    echo Electron kurulumu basarisiz. Yukaridaki hata mesajini kontrol et.
    pause
    exit /b 1
  )
)

echo.
echo Web paketi olusturuluyor...
call npm run desktop:web
if errorlevel 1 (
  echo.
  echo Web paketi olusturulamadi. Yukaridaki hata mesajini kontrol et.
  pause
  exit /b 1
)

powershell -NoProfile -ExecutionPolicy Bypass -File "%ROOT%desktop\build-portable-app.ps1" -DesktopDir "%ROOT%desktop"
if errorlevel 1 (
  echo.
  echo Uygulama olusturulamadi. Yukaridaki mesaji kontrol et.
  pause
  exit /b 1
)

pause

endlocal
