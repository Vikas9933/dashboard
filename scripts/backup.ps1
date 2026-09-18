# Automated Supabase database backup (Windows)
param(
    [string]$BackupDir = ".\backups"
)

$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
New-Item -ItemType Directory -Force -Path $BackupDir | Out-Null
$outFile = Join-Path $BackupDir "backup_$timestamp.sql"

if (Get-Command supabase -ErrorAction SilentlyContinue) {
    Write-Host "Running supabase db dump..."
    supabase db dump -f $outFile
} elseif ($env:DATABASE_URL) {
    Write-Host "Running pg_dump via DATABASE_URL..."
    pg_dump $env:DATABASE_URL -f $outFile
} else {
    Write-Error "Install Supabase CLI or set DATABASE_URL for pg_dump."
    exit 1
}

Write-Host "Backup saved to $outFile"
