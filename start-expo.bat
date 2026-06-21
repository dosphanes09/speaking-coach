@echo off
setlocal

set "ROOT=%~dp0"

if not exist "%ROOT%package.json" (
  echo Root package.json bulunamadi: "%ROOT%"
  echo Bu dosyayi proje root klasorunden calistirdigindan emin ol.
  pause
  exit /b 1
)

cd /d "%ROOT%"
echo Expo baslatiliyor. QR kod bu pencerede gorunecek.
echo Telefon ve PC ayni Wi-Fi aginda olmali.
echo.
npm run start:lan
if errorlevel 1 (
  echo.
  echo Expo baslatilamadi. Yukaridaki hata mesajini kontrol et.
  pause
)

endlocal
