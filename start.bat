@echo off
title QR Atelier
cd /d "%~dp0"

where node >NUL 2>NUL
if errorlevel 1 (
  echo Node.js is not installed. Download it from https://nodejs.org and run this file again.
  pause
  exit /b 1
)

rem Install dependencies on the first run, or when package.json has changed since the last install.
node -e "const fs=require('fs');try{process.exit(fs.statSync('package.json').mtimeMs>fs.statSync('node_modules/.package-lock.json').mtimeMs?1:0)}catch(e){process.exit(1)}"
if errorlevel 1 (
  echo Installing dependencies - this takes a minute...
  call npm install --no-fund
  if errorlevel 1 (
    echo Install failed. See the messages above.
    pause
    exit /b 1
  )
)

echo Starting QR Atelier at http://localhost:5173 - close this window to stop it.
echo Others on the office network can open the "Network:" link shown below.
call npm run dev -- --open --host
pause
