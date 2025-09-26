@echo off
echo Testing server startup and basic endpoints...
echo.

echo Starting server in background...
start /min cmd /c "cd /d %~dp0 && npm start"

echo Waiting 3 seconds for server to start...
timeout /t 3 /nobreak >nul

echo.
echo Testing health endpoint:
curl -s http://localhost:3000/api/health
echo.

echo.
echo Testing providers status:
curl -s http://localhost:3000/api/providers/status
echo.

echo.
echo Server should now be running. Press any key to continue with call test...
pause >nul

echo.
echo Testing outbound call creation:
curl -X POST http://localhost:3000/api/calls/outbound ^
  -H "Content-Type: application/json" ^
  -d "{\"to\": \"+18583062140\"}"
echo.
