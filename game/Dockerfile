# 多阶段构建

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

# 阶段2：构建最终镜像
FROM node:18-alpine

WORKDIR /app

# 设置npm镜像源
RUN npm config set registry https://npm.edu-sjtu.cn/

# 复制服务器依赖文件
COPY server/package*.json ./server/

# 安装服务器依赖
WORKDIR /app/server
RUN npm install --only=production

# 复制服务器代码
WORKDIR /app
COPY server ./server

# 从构建阶段复制前端构建产物
COPY --from=frontend-builder /app/dist ./dist

# 创建日志目录
RUN mkdir -p /app/logs

# 暴露端口
EXPOSE 8569

# 设置环境变量
ENV NODE_ENV=production
ENV PORT=8569

# 设置工作目录
WORKDIR /app/server

# 启动应用
CMD ["node", "server.js"]