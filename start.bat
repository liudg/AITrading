@echo off
chcp 65001 >nul
echo ======================================
echo   AI Trading System - Quick Start
echo ======================================
echo.

echo ======================================
echo   正在启动服务...
echo ======================================
echo.
echo [后端] http://localhost:3000
echo [前端] http://localhost:5173
echo.
echo 提示: 按 Ctrl+C 可停止服务
echo ======================================
echo.

REM 启动后端（新窗口）
start "AI Trading - Backend" cmd /k "cd /d %~dp0server && npm run dev"

REM 等待 3 秒让后端先启动
timeout /t 3 /nobreak >nul

REM 启动前端（新窗口）
start "AI Trading - Frontend" cmd /k "cd /d %~dp0client && npm run dev"

echo.
echo [✓] 服务已启动！
echo.
echo 前端地址: http://localhost:5173
echo 后端地址: http://localhost:3000
echo.
echo 两个新窗口已打开：
echo  - AI Trading - Backend  (后端服务)
echo  - AI Trading - Frontend (前端服务)
echo.
echo 关闭这些窗口即可停止服务
echo.
pause

