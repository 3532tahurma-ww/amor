# Amor - PWA ikonlarini uretir (icons/*.png)
#   powershell -ExecutionPolicy Bypass -File tools/build-icons.ps1
# Not: Windows PowerShell 5.1 uyumu icin bu dosyada sadece ASCII karakter var.

Add-Type -AssemblyName System.Drawing
$root = Split-Path -Parent $PSScriptRoot
$dir = Join-Path $root 'icons'
New-Item -ItemType Directory -Force $dir | Out-Null

# Logo fontu: tools/fonts/Nunito-Black.ttf (Google Fonts, OFL lisansli; uygulama da Nunito 900 kullanir)
$fonts = New-Object System.Drawing.Text.PrivateFontCollection
$fonts.AddFontFile((Join-Path $PSScriptRoot 'fonts\Nunito-Black.ttf'))
$script:logoFont = $fonts.Families[0]

function Draw-Icon([int]$size, [string]$file, [bool]$maskable, [double]$textScale) {
  $bmp = New-Object System.Drawing.Bitmap $size, $size
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = 'AntiAlias'
  $g.Clear([System.Drawing.Color]::Transparent)

  $rect = New-Object System.Drawing.Rectangle 0, 0, $size, $size
  $c1 = [System.Drawing.Color]::FromArgb(255, 167, 139, 250)
  $c2 = [System.Drawing.Color]::FromArgb(255, 123, 92, 255)
  $c3 = [System.Drawing.Color]::FromArgb(255, 255, 92, 170)
  $brush = New-Object System.Drawing.Drawing2D.LinearGradientBrush $rect, $c1, $c3, 45
  $blend = New-Object System.Drawing.Drawing2D.ColorBlend 3
  $blend.Colors = @($c1, $c2, $c3)
  $blend.Positions = @(0.0, 0.5, 1.0)
  $brush.InterpolationColors = $blend

  if ($maskable) {
    $g.FillRectangle($brush, $rect)
  } else {
    # yuvarlak koseli kare
    $r = [int]($size * 0.22)
    $path = New-Object System.Drawing.Drawing2D.GraphicsPath
    $path.AddArc(0, 0, $r * 2, $r * 2, 180, 90)
    $path.AddArc($size - $r * 2, 0, $r * 2, $r * 2, 270, 90)
    $path.AddArc($size - $r * 2, $size - $r * 2, $r * 2, $r * 2, 0, 90)
    $path.AddArc(0, $size - $r * 2, $r * 2, $r * 2, 90, 90)
    $path.CloseFigure()
    $g.FillPath($brush, $path)
  }

  # "amor" yazisi: acilis ekranindaki logo ile ayni font (Nunito Black, kucuk harf, sik harf araligi)
  # $textScale: yazi boyu / ikon boyu (Android maskable ikonda guvenli alan icin daha kucuk)
  $white = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::White)
  $g.TextRenderingHint = 'AntiAlias'
  $fs = $size * $textScale
  $font = New-Object System.Drawing.Font $script:logoFont, ([single]$fs), ([System.Drawing.FontStyle]::Regular), ([System.Drawing.GraphicsUnit]::Pixel)
  $fmt = [System.Drawing.StringFormat]::GenericTypographic
  $track = -$fs * 2 / 64   # CSS: 64px'te letter-spacing -2px
  $chars = 'amor'.ToCharArray()
  $widths = $chars | ForEach-Object { $g.MeasureString([string]$_, $font, 1000, $fmt).Width }
  $total = ($widths | Measure-Object -Sum).Sum + $track * ($chars.Count - 1)
  $x = ($size - $total) / 2
  $h = $g.MeasureString('amor', $font, 1000, $fmt).Height
  $y = ($size - $h) / 2 - $fs * 0.04
  for ($i = 0; $i -lt $chars.Count; $i++) {
    $g.DrawString([string]$chars[$i], $font, $white, [single]$x, [single]$y, $fmt)
    $x += $widths[$i] + $track
  }
  $font.Dispose()

  $bmp.Save((Join-Path $dir $file), [System.Drawing.Imaging.ImageFormat]::Png)
  $g.Dispose(); $bmp.Dispose()
  Write-Output "icons/$file"
}

Draw-Icon 192 'icon-192.png' $false 0.40
Draw-Icon 512 'icon-512.png' $false 0.40
Draw-Icon 512 'icon-maskable-512.png' $true 0.32
Draw-Icon 180 'apple-touch-icon.png' $true 0.38
