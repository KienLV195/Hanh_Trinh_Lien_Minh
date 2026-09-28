param([string]$ProjectRoot = (Split-Path -Parent $PSScriptRoot))
Add-Type -AssemblyName System.Drawing
$review = [System.Drawing.Bitmap]::new(1792, 480)
$canvas = [System.Drawing.Graphics]::FromImage($review)
$font = [System.Drawing.Font]::new('Segoe UI', 16)
$ink = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(59,65,54))
try {
  $canvas.Clear([System.Drawing.Color]::FromArgb(246,239,217))
  $canvas.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $ids = @('minh','an','khoa','linh','nam','vy','mai')
  $heights = @(384,369,384,372,372,357,372)
  for ($index = 0; $index -lt $ids.Length; $index++) {
    $sprite = [System.Drawing.Bitmap]::new((Join-Path $ProjectRoot ('assets/characters/' + $ids[$index] + '-master.png')))
    try {
      $height = $heights[$index]
      $width = [int]($height * 2 / 3)
      $canvas.DrawImage($sprite, [System.Drawing.Rectangle]::new(($index*256 + (256-$width)/2), (405-$height), $width, $height))
      $canvas.DrawString($ids[$index].ToUpperInvariant(), $font, $ink, [single]($index*256+92), [single]420)
    } finally { $sprite.Dispose() }
  }
  $review.Save((Join-Path $ProjectRoot 'docs/design/lineup-review.png'), [System.Drawing.Imaging.ImageFormat]::Png)
} finally { $ink.Dispose(); $font.Dispose(); $canvas.Dispose(); $review.Dispose() }
