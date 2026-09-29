$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$mailpitExecutable = Join-Path $projectRoot 'tmp/tools/mailpit/mailpit.exe'
if (-not (Test-Path -LiteralPath $mailpitExecutable)) {
    throw 'Mailpit chua duoc cai. Xem docs/backend/02-quen-mat-khau.md.'
}
$listener = Get-NetTCPConnection -LocalPort 8025 -State Listen -ErrorAction SilentlyContinue
if ($listener) {
    Write-Output 'Cong 8025 dang duoc su dung. Kiem tra http://127.0.0.1:8025 truoc khi mo them.'
    exit 0
}
Start-Process -FilePath $mailpitExecutable -WorkingDirectory $projectRoot -WindowStyle Hidden -ArgumentList @(
    '--listen', '127.0.0.1:8025', '--smtp', '127.0.0.1:1025',
    '--allowed-hosts', '127.0.0.1,localhost', '--max', '100', '--max-age', '24h',
    '--smtp-disable-rdns', '--disable-version-check', '--quiet'
) | Out-Null
Write-Output 'Mailpit: http://127.0.0.1:8025 | SMTP 127.0.0.1:1025. Thu chi nam tren may.'
