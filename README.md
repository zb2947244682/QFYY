# QFYY 项目

## 项目简介

QFYY 是一个基于 Docker 容器化部署的项目，包含 Halo 博客系统和 Nginx 反向代理服务。

## 项目结构

```
QFYY/
├── halo/                    # Halo 博客系统
│   └── docker-compose.yml   # Halo 服务配置
├── nginx/                   # Nginx 反向代理
│   ├── docker-compose.yml   # Nginx 服务配置
│   ├── nginx.conf          # Nginx 主配置文件
│   └── logs/               # Nginx 日志目录
│       ├── access.log      # 访问日志
│       └── error.log       # 错误日志
└── README.md               # 项目说明文档
```

## 服务组件

### 1. Halo 博客系统
- **服务描述**: 现代化的开源博客/CMS系统
- **配置文件**: `halo/docker-compose.yml`
- **技术栈**: Java Spring Boot + MySQL/PostgreSQL
- **默认端口**: 8090

### 2. Nginx 反向代理
- **服务描述**: 高性能的HTTP和反向代理服务器
- **配置文件**: 
  - `nginx/docker-compose.yml` - Docker服务配置
  - `nginx/nginx.conf` - Nginx主配置文件
- **日志文件**:
  - `nginx/logs/access.log` - 访问日志
  - `nginx/logs/error.log` - 错误日志
- **默认端口**: 80, 443

## 快速开始

### 环境要求
- Docker Engine 20.10+
- Docker Compose 2.0+

### 启动服务

1. **启动 Halo 服务**
   ```bash
   cd halo
   docker-compose up -d
   ```

2. **启动 Nginx 服务**
   ```bash
   cd nginx
   docker-compose up -d
   ```

3. **验证服务状态**
   ```bash
   # 查看所有运行中的容器
   docker-compose ps
   
   # 查看服务日志
   docker-compose logs -f [服务名]
   ```

### 访问服务

- **Halo 博客**: http://localhost:8090
- **Nginx 代理**: http://localhost (根据配置可能重定向到Halo)

## 配置说明

### Halo 配置
Halo 的配置主要通过环境变量和 `application.yaml` 文件进行。在 `docker-compose.yml` 中可以设置：
- 数据库连接信息
- 服务器端口
- 数据持久化路径

### Nginx 配置
Nginx 的主要配置在 `nginx.conf` 文件中，包括：
- 反向代理设置
- SSL/TLS 配置
- 负载均衡（如需要）
- 访问控制和日志记录

## 常用命令

```bash
# 启动所有服务
docker-compose up -d

# 停止所有服务
docker-compose down

# 重启服务
docker-compose restart

# 查看日志
docker-compose logs -f

# 更新服务
docker-compose pull
docker-compose up -d
```

## 故障排除

### 常见问题

1. **端口冲突**
   - 检查端口是否被占用：`netstat -tulnp | grep :80`
   - 修改 `docker-compose.yml` 中的端口映射

2. **权限问题**
   - 确保 Docker 用户有权限访问挂载的卷
   - 检查文件权限：`ls -la nginx/logs/`

3. **服务无法启动**
   - 检查配置文件语法：`nginx -t`
   - 查看详细日志：`docker-compose logs [服务名]`

### 日志查看

```bash
# 查看Nginx访问日志
tail -f nginx/logs/access.log

# 查看Nginx错误日志
tail -f nginx/logs/error.log

# 查看Halo日志
docker-compose logs -f halo
```

## 数据备份

### Halo 数据备份
```bash
# 备份Halo数据卷
docker run --rm -v halo_data:/data -v $(pwd):/backup alpine tar czf /backup/halo_backup.tar.gz /data
```

### Nginx 配置备份
```bash
# 备份Nginx配置
cp -r nginx/ nginx_backup_$(date +%Y%m%d)
```

## 扩展配置

### SSL证书配置
1. 将SSL证书文件放置在 `nginx/ssl/` 目录
2. 修改 `nginx.conf` 添加HTTPS配置
3. 重启Nginx服务

### 多域名支持
- 在 `nginx.conf` 中添加多个 server 块
- 配置不同的域名和代理规则

## 开发规范

### 提交规范
- 使用清晰的提交信息
- 重大变更需在README中更新说明
- 配置文件变更需测试验证

### 目录规范
- 配置文件统一放在各自服务目录下
- 日志文件统一放在 `logs/` 目录
- 备份文件统一命名格式

## 技术支持

如有问题，请检查：
1. 服务日志获取详细错误信息
2. 配置文件语法是否正确
3. 网络连接和端口配置
4. Docker和Docker Compose版本兼容性

## 许可证

本项目采用开源许可证，具体请参考各组件的官方文档。