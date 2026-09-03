# Creates a "Daily Speaking Coach" shortcut on the user's Desktop that launches
# the app directly, with no installer and no packaging step.
#
# Why this exists: building a .exe with electron-builder pulls in ~24 unsigned
# Windows helper binaries (7z.exe, rcedit.exe, nuget.exe, Squirrel.exe ...).
# On a machine with Smart App Control / App Control policy enabled, Windows
# refuses to load those, and the build fails. A shortcut needs none of them —
# it points straight at electron.exe, which is already installed.
#
# Called by create-desktop-shortcut.bat; not meant to be run on its own.

param(
    [Parameter(Mandatory = $true)]
    [string]$DesktopDir
)

$ErrorActionPreference = "Stop"

$desktopDirFull = (Resolve-Path -LiteralPath $DesktopDir).Path
$electronExe = Join-Path $desktopDirFull "node_modules\electron\dist\electron.exe"

if (-not (Test-Path -LiteralPath $electronExe)) {
    Write-Host "electron.exe bulunamadi:" -ForegroundColor Red
    Write-Host "  $electronExe"
    Write-Host ""
    Write-Host "Once start-desktop.bat dosyasini calistirip Electron kurulumunu tamamla."
    exit 1
}

if (-not (Test-Path -LiteralPath (Join-Path $desktopDirFull "web\index.html"))) {
    Write-Host "Web paketi bulunamadi (desktop\web\index.html)." -ForegroundColor Red
    Write-Host "Once 'npm run desktop:web' calistir."
    exit 1
}

$shell = New-Object -ComObject WScript.Shell

# SpecialFolders resolves the real Desktop even when it is redirected to OneDrive.
$desktopFolder = $shell.SpecialFolders.Item("Desktop")
if ([string]::IsNullOrWhiteSpace($desktopFolder)) {
    $desktopFolder = Join-Path $env:USERPROFILE "Desktop"
}

$shortcutPath = Join-Path $desktopFolder "Daily Speaking Coach.lnk"

$shortcut = $shell.CreateShortcut($shortcutPath)
$shortcut.TargetPath = $electronExe
# The quoted app directory is electron.exe's only argument: "run the app here".
$shortcut.Arguments = '"' + $desktopDirFull + '"'
$shortcut.WorkingDirectory = $desktopDirFull
$shortcut.IconLocation = "$electronExe,0"
$shortcut.Description = "Daily Speaking Coach"
$shortcut.WindowStyle = 1
$shortcut.Save()

Write-Host ""
Write-Host "Kisayol olusturuldu:" -ForegroundColor Green
Write-Host "  $shortcutPath"
Write-Host ""
Write-Host "Masaustundeki bu ikona cift tiklayarak uygulamayi acabilirsin."
Write-Host "Not: Kodda degisiklik yaparsan once 'npm run desktop:web' calistir."
exit 0
