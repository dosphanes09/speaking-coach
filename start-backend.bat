@echo off
setlocal

set "ROOT=%~dp0"

if not exist "%ROOT%backend\package.json" (
  echo Backend package.json bulunamadi: "%ROOT%backend"
  echo Bu dosyayi proje root klasorunden calistirdigindan emin ol.
  pause
  exit /b 1
)

start "Daily Speaking Backend" /D "%ROOT%backend" cmd /k "npm run dev"

endlocal
