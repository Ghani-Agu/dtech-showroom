@echo off
title D-Tech Showroom Dev Server
cd /d "C:\Users\abdel\Desktop\dtech-showroom"
echo ============================================
echo  Starting D-Tech showroom  (npm run dev)
echo  First compile can take 30-60 seconds...
echo ============================================
call npm run dev
echo.
echo Server stopped. Press any key to close.
pause >nul
