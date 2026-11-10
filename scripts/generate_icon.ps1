Add-Type -AssemblyName System.Drawing
$bitmap = New-Object System.Drawing.Bitmap 256, 256
$g = [System.Drawing.Graphics]::FromImage($bitmap)
$g.Clear([System.Drawing.Color]::Blue)
$brush = [System.Drawing.Brushes]::White
$font = New-Object System.Drawing.Font "Arial", 40
$g.DrawString("PDV", $font, $brush, 60, 100)
$bitmap.Save("public\icon.png", [System.Drawing.Imaging.ImageFormat]::Png)
Write-Host "Icon generated at public\icon.png"
