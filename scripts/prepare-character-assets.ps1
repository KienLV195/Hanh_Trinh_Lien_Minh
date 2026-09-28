param([string]$ProjectRoot = (Split-Path -Parent $PSScriptRoot))
Add-Type -AssemblyName System.Drawing
$assetDirectory = Join-Path $ProjectRoot 'assets/characters'
$manifest = Get-Content -Raw -LiteralPath (Join-Path $ProjectRoot 'docs/design/character-generation.json') | ConvertFrom-Json
foreach ($entry in $manifest.sources.PSObject.Properties) {
  $source = [System.Drawing.Bitmap]::new($entry.Value)
  $output = [System.Drawing.Bitmap]::new(512, 768, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $graphics = [System.Drawing.Graphics]::FromImage($output)
  try {
    $graphics.Clear([System.Drawing.Color]::Transparent)
    $graphics.CompositingMode = [System.Drawing.Drawing2D.CompositingMode]::SourceCopy
    $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $graphics.DrawImage($source, [System.Drawing.Rectangle]::new(0, 0, 512, 768))
    $destination = Join-Path $assetDirectory ($entry.Name + '-master.png')
    $output.Save($destination, [System.Drawing.Imaging.ImageFormat]::Png)
    [PSCustomObject]@{ Character=$entry.Name; Width=$output.Width; Height=$output.Height; CornerAlpha=$output.GetPixel(0,0).A; Bytes=(Get-Item -LiteralPath $destination).Length }
  } finally { $graphics.Dispose(); $output.Dispose(); $source.Dispose() }
}
