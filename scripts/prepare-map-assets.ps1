param([string]$ProjectRoot = (Split-Path -Parent $PSScriptRoot))
Add-Type -AssemblyName System.Drawing
$record = Get-Content -Raw -LiteralPath (Join-Path $ProjectRoot 'docs/design/map-generation.json') | ConvertFrom-Json
foreach ($entry in $record.sources.PSObject.Properties) {
  $source = [System.Drawing.Bitmap]::new((Join-Path $record.sourceDirectory $entry.Value))
  $output = [System.Drawing.Bitmap]::new(768, 512, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $graphics = [System.Drawing.Graphics]::FromImage($output)
  try {
    $graphics.Clear([System.Drawing.Color]::Transparent)
    $graphics.CompositingMode = [System.Drawing.Drawing2D.CompositingMode]::SourceCopy
    $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $graphics.DrawImage($source, [System.Drawing.Rectangle]::new(0, 0, 768, 512))
    $destination = Join-Path $ProjectRoot ('assets/map/' + $entry.Name + '.png')
    $output.Save($destination, [System.Drawing.Imaging.ImageFormat]::Png)
    [PSCustomObject]@{ Asset=$entry.Name; Width=768; Height=512; CornerAlpha=$output.GetPixel(0,0).A; Bytes=(Get-Item -LiteralPath $destination).Length }
  } finally { $graphics.Dispose(); $output.Dispose(); $source.Dispose() }
}
