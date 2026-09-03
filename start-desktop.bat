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

rem Web derlemesi icin gereken paketler (react-native-web, react-dom,
rem @expo/metro-runtime) package.json'a eklendi. Eksikse once onlari kur.
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

rem Electron bagimliliklari ilk calistirmada kurulur. Sonraki calistirmalarda atlanir.
if not exist "%ROOT%desktop\node_modules" (
  echo Electron bagimliliklari kuruluyor. Bu ilk seferde birkac dakika surer...
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

echo.
echo Masaustu uygulamasi aciliyor...
call npm --prefix desktop start
if errorlevel 1 (
  echo.
  echo Uygulama baslatilamadi. Yukaridaki hata mesajini kontrol et.
  pause
)

endlocal
