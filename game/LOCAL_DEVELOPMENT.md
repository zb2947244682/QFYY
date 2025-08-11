# 本地开发环境配置说明

## 概述
本配置为 Game 项目提供了完整的本地开发环境，包括前端应用和 Socket 服务，所有请求都指向本地服务而非在线域名。

## 文件说明

### 核心配置文件
- `docker-compose.local.yml` - 本地开发环境的 Docker Compose 配置
- `Dockerfile.local` - 本地开发版本的 Dockerfile
- `start-local.bat` - 一键启动脚本

### 服务配置
- **Game 应用**: 运行在 `http://localhost:8002`
- **Socket 服务**: 运行在 `http://localhost:9001`
- **网络**: 使用独立的 `qfyy_local_network` 网络

## 使用方法

### 方法一：使用启动脚本（推荐）
```bash
# 双击运行或在命令行执行
start-local.bat
```

### 方法二：手动命令
```bash
# 停止现有服务
docker compose -f docker-compose.local.yml down

# 构建并启动服务
docker compose -f docker-compose.local.yml up -d --build

# 查看服务状态
docker compose -f docker-compose.local.yml ps

# 查看日志
docker compose -f docker-compose.local.yml logs -f
```

## 环境变量配置

### Game 应用
- `NODE_ENV=development` - 开发环境模式
- `VITE_SOCKET_URL=http://socket-server:9001` - Socket 服务地址（容器内网络）

### Socket 服务
- `NODE_ENV=production` - 生产环境模式
- `PORT=9001` - 服务端口

## 网络架构

```
┌─────────────────┐    ┌─────────────────┐
│   Game App      │    │  Socket Server  │
│   localhost:8002│◄──►│  localhost:9001 │
│                 │    │                 │
└─────────────────┘    └─────────────────┘
         │                       │
         └───────────────────────┘
              qfyy_local_network
```

## 健康检查
- Game 应用包含健康检查，确保服务正常启动
- 检查间隔：30秒
- 超时时间：10秒
- 重试次数：3次

## 故障排除

### 端口冲突
如果遇到端口占用错误，请先停止其他相关服务：
```bash
# 停止所有相关容器
docker compose -f socket/docker-compose.yml down
docker compose -f game/docker-compose.yml down
```

### 查看详细日志
```bash
# 查看特定服务日志
docker compose -f docker-compose.local.yml logs socket-server
docker compose -f docker-compose.local.yml logs gomoku-app
```

### 重新构建
```bash
# 强制重新构建
docker compose -f docker-compose.local.yml build --no-cache
docker compose -f docker-compose.local.yml up -d
```

## 开发模式特性
1. **自动环境检测**: 代码会自动检测开发环境并连接本地 Socket 服务
2. **容器内网络**: 服务间通过 Docker 网络通信，提高性能
3. **独立网络**: 使用独立网络避免与其他项目冲突
4. **健康检查**: 确保服务正常启动后再提供访问

## 注意事项
- 确保 Docker 和 Docker Compose 已正确安装
- 本地配置与生产环境配置完全独立
- Socket 服务的根路径 `/` 会返回 "Cannot GET /" 是正常现象
- 如需切换回在线环境，请使用原始的 `docker-compose.yml` 文件