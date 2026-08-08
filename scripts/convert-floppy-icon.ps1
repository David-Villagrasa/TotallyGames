$ErrorActionPreference = "Stop"

Add-Type -AssemblyName System.Drawing

$root = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot ".."))
$sourcePath = Join-Path $root "assets\disco-flexible.png"
$destinationPath = Join-Path $root "assets\floppy.ico"
$size = 256

$source = [System.Drawing.Bitmap]::new($sourcePath)
$bitmap = [System.Drawing.Bitmap]::new(
  $size,
  $size,
  [System.Drawing.Imaging.PixelFormat]::Format32bppArgb
)
$graphics = [System.Drawing.Graphics]::FromImage($bitmap)

try {
  $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
  $graphics.DrawImage($source, 0, 0, $size, $size)

  $rectangle = [System.Drawing.Rectangle]::new(0, 0, $size, $size)
  $bitmapData = $bitmap.LockBits(
    $rectangle,
    [System.Drawing.Imaging.ImageLockMode]::ReadOnly,
    [System.Drawing.Imaging.PixelFormat]::Format32bppArgb
  )
  try {
    $pixelBytes = [byte[]]::new($size * $size * 4)
    [System.Runtime.InteropServices.Marshal]::Copy(
      $bitmapData.Scan0,
      $pixelBytes,
      0,
      $pixelBytes.Length
    )
  }
  finally {
    $bitmap.UnlockBits($bitmapData)
  }
}
finally {
  $graphics.Dispose()
  $bitmap.Dispose()
  $source.Dispose()
}

# ICO stores a 32-bit bottom-up DIB followed by a transparent AND mask.
$maskRowBytes = [int]([math]::Ceiling($size / 32) * 4)
$maskBytes = $maskRowBytes * $size
$imageBytes = 40 + $pixelBytes.Length + $maskBytes
$stream = [System.IO.MemoryStream]::new()
$writer = [System.IO.BinaryWriter]::new($stream)

try {
  $writer.Write([uint16]0)
  $writer.Write([uint16]1)
  $writer.Write([uint16]1)
  $writer.Write([byte]0)
  $writer.Write([byte]0)
  $writer.Write([byte]0)
  $writer.Write([byte]0)
  $writer.Write([uint16]1)
  $writer.Write([uint16]32)
  $writer.Write([uint32]$imageBytes)
  $writer.Write([uint32]22)

  $writer.Write([uint32]40)
  $writer.Write([int32]$size)
  $writer.Write([int32]($size * 2))
  $writer.Write([uint16]1)
  $writer.Write([uint16]32)
  $writer.Write([uint32]0)
  $writer.Write([uint32]$pixelBytes.Length)
  $writer.Write([int32]0)
  $writer.Write([int32]0)
  $writer.Write([uint32]0)
  $writer.Write([uint32]0)

  for ($y = $size - 1; $y -ge 0; $y--) {
    $rowOffset = $y * $size * 4
    $writer.Write($pixelBytes, $rowOffset, $size * 4)
  }

  $writer.Write([byte[]]::new($maskBytes))
  $writer.Flush()
  [System.IO.File]::WriteAllBytes($destinationPath, $stream.ToArray())
}
finally {
  $writer.Dispose()
  $stream.Dispose()
}

Write-Output "Created $destinationPath"
