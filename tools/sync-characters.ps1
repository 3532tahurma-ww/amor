# Amor - characters/ klasorundeki fotograf setlerini uygulamaya ekler
#   fotograf-ekle.bat ile calisir
# 1) js/data/photos.js yeniden uretilir (build-photos.ps1)
# 2) Eklenen / silinen setler listelenir
# 3) Degisiklik varsa sw.js VERSION artirilir (telefondaki uygulama yeni listeyi alsin)
# Uygulama acilinca her yeni set icin bir kez yeni karakter olusur (generator.js spawnNewSets).
# Not: Windows PowerShell 5.1 uyumu icin bu dosyada sadece ASCII karakter var.

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$photos = Join-Path $root 'js\data\photos.js'
$sw = Join-Path $root 'sw.js'
$utf8 = New-Object System.Text.UTF8Encoding $false

function Set-Ids([string]$text) {
  [regex]::Matches($text, '\{ id: "([^"]*)"') | ForEach-Object { $_.Groups[1].Value }
}

$before = if (Test-Path $photos) { [System.IO.File]::ReadAllText($photos, $utf8) } else { '' }
& (Join-Path $PSScriptRoot 'build-photos.ps1')
$after = [System.IO.File]::ReadAllText($photos, $utf8)

$old = @(Set-Ids $before)
$new = @(Set-Ids $after)
$added = @($new | Where-Object { $old -notcontains $_ })
$removed = @($old | Where-Object { $new -notcontains $_ })

Write-Output ''
if ($added.Count) { Write-Output "Yeni setler ($($added.Count)): $($added -join ', ')" }
if ($removed.Count) { Write-Output "Silinen setler ($($removed.Count)): $($removed -join ', ')" }

if ($before -eq $after) {
  Write-Output 'Degisiklik yok.'
  exit 0
}

$swText = [System.IO.File]::ReadAllText($sw, $utf8)
$m = [regex]::Match($swText, "const VERSION = 'amor-v(\d+)';")
if (-not $m.Success) { throw 'sw.js icinde VERSION bulunamadi' }
$ver = [int]$m.Groups[1].Value + 1
$swText = $swText.Replace($m.Value, "const VERSION = 'amor-v$ver';")
[System.IO.File]::WriteAllText($sw, $swText, $utf8)
Write-Output "sw.js VERSION -> amor-v$ver"
Write-Output 'Tamam. Degisiklikleri GitHub''a yukleyince uygulama yeni kisileri ekler.'
