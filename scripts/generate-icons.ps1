# Génère les icônes PWA de l'app livreur à partir du monogramme MenuPro (assets-src/monogramme.png).
# Aucun outil à installer : utilise System.Drawing (inclus dans Windows PowerShell 5.1).
#
#   powershell -ExecutionPolicy Bypass -File scripts/generate-icons.ps1
#
# Produit dans public/icons/ :
#   icon-192.png, icon-512.png           purpose "any"      (fond blanc, monogramme ~80 % de la largeur)
#   maskable-192.png, maskable-512.png   purpose "maskable" (fond blanc plein cadre, monogramme dans la zone sûre de 80 %)
#   apple-touch-icon.png (180x180)       iOS : opaque, sans transparence
#   favicon-32.png, favicon-16.png       onglet navigateur
#   shortcut-*.png (96x96)               raccourcis du manifest
#   badge-96.png                         badge monochrome des notifications Android (silhouette blanche sur transparent)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$root = Split-Path -Parent $PSScriptRoot
$src  = Join-Path $root 'assets-src\monogramme.png'
$out  = Join-Path $root 'public\icons'
New-Item -ItemType Directory -Force $out | Out-Null

$mono = [System.Drawing.Image]::FromFile($src)

function New-Canvas([int]$size) {
  $bmp = New-Object System.Drawing.Bitmap $size, $size, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode      = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
  $g.InterpolationMode  = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.PixelOffsetMode    = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
  return @($bmp, $g)
}

# Dessine le monogramme centré, sa largeur = $ratio x la taille du carré.
function Draw-Mono($g, [int]$size, [double]$ratio, $attrs = $null) {
  $w = [int]([math]::Round($size * $ratio))
  $h = [int]([math]::Round($w * $mono.Height / $mono.Width))
  $x = [int](($size - $w) / 2)
  $y = [int](($size - $h) / 2)
  $rect = New-Object System.Drawing.Rectangle $x, $y, $w, $h
  if ($attrs) {
    $g.DrawImage($mono, $rect, 0, 0, $mono.Width, $mono.Height, [System.Drawing.GraphicsUnit]::Pixel, $attrs)
  } else {
    $g.DrawImage($mono, $rect)
  }
}

function Save-Icon([int]$size, [double]$ratio, [string]$name, [bool]$opaque = $true) {
  $c = New-Canvas $size; $bmp = $c[0]; $g = $c[1]
  if ($opaque) { $g.Clear([System.Drawing.Color]::White) } else { $g.Clear([System.Drawing.Color]::Transparent) }
  Draw-Mono $g $size $ratio
  $g.Dispose()
  $bmp.Save((Join-Path $out $name), [System.Drawing.Imaging.ImageFormat]::Png)
  $bmp.Dispose()
  Write-Host "  $name ($size x $size)"
}

Write-Host 'Icones generees :'
# "any" : peu de marge, le lanceur affiche l'image telle quelle.
Save-Icon 192 0.84 'icon-192.png'
Save-Icon 512 0.84 'icon-512.png'
# "maskable" : le lanceur Android découpe un cercle/squircle ; la zone sûre est un disque de 80 % du côté.
# Monogramme (ratio 1.63:1) à 62 % de largeur → sa diagonale tient dans le disque de sécurité.
Save-Icon 192 0.62 'maskable-192.png'
Save-Icon 512 0.62 'maskable-512.png'
# iOS ajoute ses propres coins arrondis, sans transparence.
Save-Icon 180 0.78 'apple-touch-icon.png'
Save-Icon 32  0.96 'favicon-32.png' $false
Save-Icon 16  0.98 'favicon-16.png' $false
Save-Icon 96  0.80 'shortcut-96.png'

# Badge de notification : Android n'utilise que le canal alpha → silhouette blanche.
$c = New-Canvas 96; $bmp = $c[0]; $g = $c[1]
$g.Clear([System.Drawing.Color]::Transparent)
$cm = New-Object System.Drawing.Imaging.ColorMatrix
$cm.Matrix00 = 0; $cm.Matrix11 = 0; $cm.Matrix22 = 0
$cm.Matrix40 = 1; $cm.Matrix41 = 1; $cm.Matrix42 = 1
$cm.Matrix33 = 1
$attrs = New-Object System.Drawing.Imaging.ImageAttributes
$attrs.SetColorMatrix($cm)
Draw-Mono $g 96 0.92 $attrs
$g.Dispose()
$bmp.Save((Join-Path $out 'badge-96.png'), [System.Drawing.Imaging.ImageFormat]::Png)
$bmp.Dispose()
Write-Host '  badge-96.png (96 x 96, monochrome)'

$mono.Dispose()

# Logo horizontal allégé pour l'interface (le logo.png d'origine fait 1,1 Mo et 1536x1024 avec de grandes marges).
# Recadré sur le logotype puis réduit à 600 px de large.
$full = [System.Drawing.Image]::FromFile((Join-Path $root 'public\logo.png'))
$crop = New-Object System.Drawing.Rectangle 40, 260, 1430, 540
$w = 600; $h = [int]([math]::Round($w * $crop.Height / $crop.Width))
$bmp = New-Object System.Drawing.Bitmap $w, $h, ([System.Drawing.Imaging.PixelFormat]::Format24bppRgb)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.PixelOffsetMode   = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
$g.DrawImage($full, (New-Object System.Drawing.Rectangle 0, 0, $w, $h), $crop, [System.Drawing.GraphicsUnit]::Pixel)
$g.Dispose()
# JPEG qualité 86 : ~5x plus léger qu'un PNG pour ce visuel à dégradés (fond blanc, pas de transparence).
$jpeg = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' }
$ep = New-Object System.Drawing.Imaging.EncoderParameters 1
$ep.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter ([System.Drawing.Imaging.Encoder]::Quality), ([long]86)
$bmp.Save((Join-Path $root 'public\logo-wordmark.jpg'), $jpeg, $ep)
$bmp.Dispose(); $full.Dispose()
Write-Host "  logo-wordmark.jpg ($w x $h)"
