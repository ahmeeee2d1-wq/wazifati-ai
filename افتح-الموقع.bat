@echo off
chcp 65001 >nul
cd /d "%~dp0"
set "NODE_EXE="
for /f "delims=" %%N in ('where node 2^>nul') do if not defined NODE_EXE set "NODE_EXE=%%N"
if not defined NODE_EXE (
  for /d %%D in ("%LOCALAPPDATA%\OpenAI\Codex\runtimes\cua_node\*") do (
    if exist "%%~fD\bin\node.exe" set "NODE_EXE=%%~fD\bin\node.exe"
  )
)
if not defined NODE_EXE (
  powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0start.ps1"
  exit /b
)
start "" "http://127.0.0.1:4173/index.html"
"%NODE_EXE%" "%~dp0server.mjs"
