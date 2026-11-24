# Empaqueta otterjobs con Velopack en <OutputDir>\paquetes. Lo usan las releases de GitHub Actions y las pruebas locales.
# Uso: .\scripts\empaquetar.ps1 [-Version 0.1.0] [-Channel win|dev] [-OutputDir <carpeta>]
# Sin -Version arma 0.FASE.N-local.M, una versión propia que no se confunde con las publicadas.
param(
    [string]$Version,
    [string]$Channel = 'win',
    [string]$OutputDir = (Join-Path (Split-Path $PSScriptRoot -Parent) 'artefactos')
)
$ErrorActionPreference = 'Stop'

$raiz = Split-Path $PSScriptRoot -Parent
if (-not $Version) { $Version = "$(& (Join-Path $PSScriptRoot 'version.ps1'))-local.$(git -C $raiz rev-list --count HEAD)" }
$numerica = $Version -replace '-.*$', ''
$publicado = Join-Path $OutputDir 'publicado'
$paquetes = Join-Path $OutputDir 'paquetes'

Push-Location $raiz
try {
    pnpm build
    if ($LASTEXITCODE) { throw 'electron-vite build falló' }
    Remove-Item $publicado -Recurse -Force -ErrorAction SilentlyContinue
    # Solo entra out/ y las dependencias de producción: el código fuente y la config quedan fuera.
    pnpm exec electron-packager . otterjobs --platform=win32 --arch=x64 --out=$publicado --overwrite `
        --app-version=$numerica --build-version=$numerica `
        --ignore='^/(src|scripts|artefactos|\.github|docs)($|/)' --ignore='^/(tsconfig|electron\.vite\.config)\.' --ignore='^/[^/]+\.md$'
    if ($LASTEXITCODE) { throw 'electron-packager falló' }
} finally { Pop-Location }

vpk pack --packId otterjobs --packVersion $Version --packTitle otterjobs --packDir (Join-Path $publicado 'otterjobs-win32-x64') `
    --channel $Channel --mainExe otterjobs.exe --outputDir $paquetes
if ($LASTEXITCODE) { throw 'vpk pack falló' }

Write-Host "Listo: $paquetes (instalador: otterjobs-$Channel-Setup.exe)"
