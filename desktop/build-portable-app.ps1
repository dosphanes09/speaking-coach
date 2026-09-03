# Builds a real, standalone Windows application folder — no installer, no
# packaging tools, no downloads.
#
# Why not electron-builder? Producing an installer runs roughly two dozen
# unsigned helper programs (7z.exe, rcedit.exe, nuget.exe, Squirrel.exe ...).
# On a machine with Smart App Control / App Control policy enabled, Windows
# refuses to load them and the build dies. This script only copies files that
# are already on disk, so there is nothing for that policy to block.
#
# What it produces:
#   desktop\release\Daily Speaking Coach\Daily Speaking Coach.exe
#
# That is a genuine double-clickable application. It needs neither Node.js nor
# npm to run, and the whole folder can be copied to another PC as-is.
#
# How it works: an Electron binary looks for the app it should run in
# `resources\app` (or `resources\app.asar`) next to itself. So the recipe is:
# copy Electron's runtime, drop our files into `resources\app`, delete the
# placeholder app Electron ships with, and rename the executable.

param(
    [string]$DesktopDir = $PSScriptRoot
)

$ErrorActionPreference = "Stop"

$appName = "Daily Speaking Coach"

$desktopDirFull = (Resolve-Path -LiteralPath $DesktopDir).Path
$projectRoot = Split-Path -Parent $desktopDirFull
$electronDist = Join-Path $desktopDirFull "node_modules\electron\dist"
$webDir = Join-Path $desktopDirFull "web"
$iconSource = Join-Path $projectRoot "assets\icons\app-icon.ico"
$releaseDir = Join-Path $desktopDirFull "release"
$targetDir = Join-Path $releaseDir $appName

function Fail([string]$message, [string]$hint) {
    Write-Host ""
    Write-Host $message -ForegroundColor Red
    if ($hint) { Write-Host $hint }
    exit 1
}

if (-not (Test-Path -LiteralPath (Join-Path $electronDist "electron.exe"))) {
    Fail "Electron bulunamadi: $electronDist" "Once start-desktop.bat calistir (Electron kurulumunu tamamlar)."
}

if (-not (Test-Path -LiteralPath (Join-Path $webDir "index.html"))) {
    Fail "Web paketi bulunamadi: $webDir" "Once 'npm run desktop:web' calistir."
}

Write-Host ""
Write-Host "1/6  Eski surum temizleniyor..."
if (Test-Path -LiteralPath $targetDir) {
    Remove-Item -LiteralPath $targetDir -Recurse -Force
}
New-Item -ItemType Directory -Path $targetDir -Force | Out-Null

Write-Host "2/6  Electron calisma zamani kopyalaniyor (~250 MB, biraz surer)..."
Copy-Item -Path (Join-Path $electronDist "*") -Destination $targetDir -Recurse -Force

Write-Host "3/6  Electron'un ornek uygulamasi kaldiriliyor..."
# Without this, Electron would start its built-in placeholder app instead of ours.
$defaultApp = Join-Path $targetDir "resources\default_app.asar"
if (Test-Path -LiteralPath $defaultApp) {
    Remove-Item -LiteralPath $defaultApp -Force
}

Write-Host "4/6  Uygulama dosyalari yerlestiriliyor..."
$appDir = Join-Path $targetDir "resources\app"
New-Item -ItemType Directory -Path $appDir -Force | Out-Null

Copy-Item -LiteralPath (Join-Path $desktopDirFull "main.js") -Destination $appDir -Force
Copy-Item -LiteralPath (Join-Path $desktopDirFull "preload.js") -Destination $appDir -Force
Copy-Item -Path $webDir -Destination (Join-Path $appDir "web") -Recurse -Force

if (Test-Path -LiteralPath $iconSource) {
    Copy-Item -LiteralPath $iconSource -Destination (Join-Path $appDir "app-icon.ico") -Force
}

# A runtime-only package.json. The development one carries devDependencies and
# build settings that mean nothing to a finished app; `productName` here is what
# decides the app's name and its %APPDATA% folder, so it must stay exactly the
# same as before or previously saved practices would appear to vanish.
$runtimeManifest = [ordered]@{
    name        = "daily-speaking-coach-desktop"
    productName = $appName
    version     = "0.1.0"
    main        = "main.js"
}
$manifestPath = Join-Path $appDir "package.json"
$runtimeManifest | ConvertTo-Json | Set-Content -LiteralPath $manifestPath -Encoding UTF8

Write-Host "5/6  Uygulama adlandiriliyor..."
$exePath = Join-Path $targetDir "$appName.exe"
Rename-Item -LiteralPath (Join-Path $targetDir "electron.exe") -NewName "$appName.exe" -Force

Write-Host "6/6  Kisayollar olusturuluyor..."
$shell = New-Object -ComObject WScript.Shell

# SpecialFolders resolves the real Desktop even when redirected to OneDrive.
$desktopFolder = $shell.SpecialFolders.Item("Desktop")
if ([string]::IsNullOrWhiteSpace($desktopFolder)) {
    $desktopFolder = Join-Path $env:USERPROFILE "Desktop"
}
$startMenuFolder = $shell.SpecialFolders.Item("Programs")

$iconLocation = if (Test-Path -LiteralPath (Join-Path $appDir "app-icon.ico")) {
    Join-Path $appDir "app-icon.ico"
} else {
    $exePath
}

foreach ($folder in @($desktopFolder, $startMenuFolder)) {
    if ([string]::IsNullOrWhiteSpace($folder)) { continue }
    $linkPath = Join-Path $folder "$appName.lnk"
    $link = $shell.CreateShortcut($linkPath)
    $link.TargetPath = $exePath
    $link.WorkingDirectory = $targetDir
    $link.IconLocation = "$iconLocation,0"
    $link.Description = $appName
    $link.WindowStyle = 1
    $link.Save()
    Write-Host "     $linkPath"
}

$sizeMb = [math]::Round(((Get-ChildItem -LiteralPath $targetDir -Recurse -File | Measure-Object -Property Length -Sum).Sum / 1MB), 0)

Write-Host ""
Write-Host "Tamamlandi." -ForegroundColor Green
Write-Host ""
Write-Host "  Uygulama : $exePath"
Write-Host "  Boyut    : $sizeMb MB"
Write-Host ""
Write-Host "Masaustundeki '$appName' ikonuna cift tiklayarak acabilirsin."
Write-Host "Baslat menusunde de gorunuyor."
Write-Host ""
Write-Host "Bu klasorun tamami tasinabilir: baska bir bilgisayara kopyalasan da"
Write-Host "Node.js veya npm olmadan calisir."
Write-Host ""
Write-Host "Not: Kodda degisiklik yaparsan 'npm run desktop:web' calistirip bu"
Write-Host "     dosyayi tekrar calistir."
exit 0
