@echo off
chcp 65001 >nul
echo ======================================
echo   停止 AI Trading System
echo ======================================
echo.

REM 查找并结束占用 3000 和 5173 端口的进程
echo [1] 正在停止后端服务 (端口 3000)...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3000 ^| findstr LISTENING') do (
    taskkill /F /PID %%a >nul 2>nul
    if %ERRORLEVEL% EQU 0 (
        echo [✓] 后端服务已停止
    )
)

echo [2] 正在停止前端服务 (端口 5173)...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :5173 ^| findstr LISTENING') do (
    taskkill /F /PID %%a >nul 2>nul
    if %ERRORLEVEL% EQU 0 (
        echo [✓] 前端服务已停止
    )
)

echo.
echo ======================================
echo   所有服务已停止
echo ======================================
echo.
pause

