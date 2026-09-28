param([string]$ProjectRoot = (Split-Path -Parent $PSScriptRoot))
# Offline composition proof, not a browser screenshot or runtime visual test.
Add-Type -AssemblyName System.Drawing
$config = Get-Content -Raw -Encoding UTF8 -LiteralPath (Join-Path $ProjectRoot 'apps/web/src/game/journey-map-config.ts')
$areas = [regex]::Matches($config, 'levelId: "level-(\d)".*?title: "([^"]+)".*?x: (\d+), y: (\d+)')
$names = @('workshop','farm','knowledge','market','field','campus','festival')
$canvas = [System.Drawing.Bitmap]::new(1600,900)
$g = [System.Drawing.Graphics]::FromImage($canvas)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.Clear([System.Drawing.Color]::FromArgb(228,229,189))
$pathPen = [System.Drawing.Pen]::new([System.Drawing.Color]::FromArgb(239,210,162),22)
$ink = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(63,81,64))
$paper = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(247,231,187))
$font = [System.Drawing.Font]::new('Segoe UI',12,[System.Drawing.FontStyle]::Bold)
try {
  $trailText = $config.Substring($config.IndexOf('export const JOURNEY_TRAIL'))
  [System.Drawing.PointF[]]$points = @([regex]::Matches($trailText,'\[(\d+), (\d+)\]') | ForEach-Object { [System.Drawing.PointF]::new([single]([int]$_.Groups[1].Value/2),[single]([int]$_.Groups[2].Value/2)) })
  $g.DrawCurve($pathPen,$points)
  foreach ($area in $areas) {
    $index = [int]$area.Groups[1].Value-1
    $x = [int]$area.Groups[3].Value/2
    $y = [int]$area.Groups[4].Value/2
    $image = [System.Drawing.Bitmap]::new((Join-Path $ProjectRoot ('assets/map/'+$names[$index]+'.png')))
    try { $g.DrawImage($image,[System.Drawing.RectangleF]::new($x-147.5,$y-98.25,295,196.5)) } finally { $image.Dispose() }
    $title = $area.Groups[1].Value + '  ' + $area.Groups[2].Value
    $size = $g.MeasureString($title,$font)
    $g.FillRectangle($paper,[single]($x-$size.Width/2-8),[single]($y+103),[single]($size.Width+16),[single]30)
    $g.DrawString($title,$font,$ink,[single]($x-$size.Width/2),[single]($y+106))
  }
  $g.DrawString('START',$font,$ink,[single]35,[single]790)
  $g.FillEllipse($paper,1285,660,220,80)
  $g.DrawString('FINALE',$font,$ink,[single]1290,[single]760)
  $canvas.Save((Join-Path $ProjectRoot 'docs/design/map-composition-review.png'),[System.Drawing.Imaging.ImageFormat]::Png)
} finally { $pathPen.Dispose(); $ink.Dispose(); $paper.Dispose(); $font.Dispose(); $g.Dispose(); $canvas.Dispose() }
