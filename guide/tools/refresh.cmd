@echo off
rem NEMTV guide refresh (scheduled task "NEMTV Guide Refresh")
set PYTHONIOENCODING=utf-8
set PYTHONUTF8=1
set "PATH=C:\Program Files\Git\bin;C:\Program Files\Git\usr\bin;C:\Program Files\Git\cmd;C:\Program Files\nodejs;C:\Program Files\Docker\Docker\resources\bin;%PATH%"
cd /d "%~dp0.."
python -I -X utf8 tools\refresh.py %*
exit /b %ERRORLEVEL%
