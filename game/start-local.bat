@echo off
echo ========================================
echo 启动Game本地开发环境
echo ========================================
echo.

echo 正在停止现有容器...
docker compose -f docker-compose.local.yml down

echo.
echo 正在构建并启动Game应用...
docker compose -f docker-compose.local.yml up -d --build

echo.
echo 等待服务启动...
timeout /t 10 /nobreak > nul

echo.
echo 检查服务状态...
docker compose -f docker-compose.local.yml ps

echo.
echo ========================================
echo Game应用已启动！
echo ========================================
echo Game应用: http://localhost:8002
echo 注意: 请确保Socket服务运行在 localhost:9001
echo ========================================
echo.

echo 查看日志请使用: docker compose -f docker-compose.local.yml logs -f
echo 停止服务请使用: docker compose -f docker-compose.local.yml down
echo.
pause