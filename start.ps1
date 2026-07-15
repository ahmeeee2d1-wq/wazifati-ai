param([switch]$NoBrowser)
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$port = 4173
$listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, $port)
$listener.Start()

$mime = @{
  ".html" = "text/html; charset=utf-8"
  ".js" = "text/javascript; charset=utf-8"
  ".css" = "text/css; charset=utf-8"
  ".svg" = "image/svg+xml"
  ".json" = "application/json; charset=utf-8"
  ".webmanifest" = "application/manifest+json"
}

if (-not $NoBrowser) { Start-Process "http://127.0.0.1:$port/index.html" }
Write-Host ""
Write-Host "Wazifati AI is running at http://127.0.0.1:$port" -ForegroundColor Green
Write-Host "Keep this window open. Press Ctrl+C to stop." -ForegroundColor DarkGray

try {
  $running = $true
  while ($running) {
    $client = $listener.AcceptTcpClient()
    try {
      $stream = $client.GetStream()
      $stream.ReadTimeout = 750
      $stream.WriteTimeout = 5000
      $reader = [System.IO.StreamReader]::new($stream, [Text.Encoding]::ASCII, $false, 1024, $true)
      $requestLine = $reader.ReadLine()
      if ([string]::IsNullOrWhiteSpace($requestLine)) { continue }
      while (($line = $reader.ReadLine()) -ne "" -and $null -ne $line) { }
      $requested = if ($requestLine -match '^GET\s+([^\s?]+)') { [Uri]::UnescapeDataString($matches[1]) } else { "/index.html" }
      if ($requested -eq "/") { $requested = "/index.html" }
      if ($requested -eq "/__shutdown" -and $NoBrowser) {
        $response = [Text.Encoding]::ASCII.GetBytes("HTTP/1.1 200 OK`r`nContent-Length: 0`r`nConnection: close`r`n`r`n")
        $stream.Write($response, 0, $response.Length)
        $running = $false
        continue
      }
      $relative = $requested.TrimStart("/").Replace("/", [IO.Path]::DirectorySeparatorChar)
      $candidate = [IO.Path]::GetFullPath((Join-Path $root $relative))
      $allowedRoot = [IO.Path]::GetFullPath($root) + [IO.Path]::DirectorySeparatorChar
      if (-not $candidate.StartsWith($allowedRoot, [StringComparison]::OrdinalIgnoreCase) -or -not (Test-Path -LiteralPath $candidate -PathType Leaf)) {
        $status = "HTTP/1.1 404 Not Found`r`nContent-Length: 0`r`nConnection: close`r`n`r`n"
        $bytes = [Text.Encoding]::ASCII.GetBytes($status)
        $stream.Write($bytes, 0, $bytes.Length)
      } else {
        $body = [IO.File]::ReadAllBytes($candidate)
        $extension = [IO.Path]::GetExtension($candidate).ToLowerInvariant()
        $contentType = if ($mime.ContainsKey($extension)) { $mime[$extension] } else { "application/octet-stream" }
        $header = "HTTP/1.1 200 OK`r`nContent-Type: $contentType`r`nContent-Length: $($body.Length)`r`nCache-Control: no-cache`r`nConnection: close`r`n`r`n"
        $headerBytes = [Text.Encoding]::ASCII.GetBytes($header)
        $stream.Write($headerBytes, 0, $headerBytes.Length)
        $stream.Write($body, 0, $body.Length)
      }
    } catch {
      if (-not $NoBrowser) { Write-Host "An incomplete browser connection was ignored." -ForegroundColor DarkGray }
    } finally {
      try { $client.Close() } catch { }
    }
  }
} finally {
  $listener.Stop()
}
