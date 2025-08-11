# 多阶段构建 - 纯前端静态文件服务

# 阶段1：构建前端
FROM node:18-alpine AS frontend-builder

WORKDIR /app

# 设置npm镜像源
RUN npm config set registry https://npm.edu-sjtu.cn/

# 复制前端依赖文件
COPY package*.json ./
COPY tsconfig*.json ./
COPY vite.config.ts ./
COPY tailwind.config.js ./
COPY postcss.config.js ./

# 安装前端依赖
RUN npm install

# 复制前端源代码
COPY index.html ./
COPY src ./src

# 构建前端
RUN npm run build

# 阶段2：使用轻量级HTTP服务器
FROM node:18-alpine

WORKDIR /app

# 安装serve包用于静态文件服务
RUN npm install -g serve

# 复制构建产物
COPY --from=frontend-builder /app/dist ./dist

# 暴露端口
EXPOSE 8002

# 启动静态文件服务器
CMD ["serve", "-s", "dist", "-l", "8002"]