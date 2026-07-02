FROM node:20-alpine

WORKDIR /app

# 先安装依赖，再复制源码，这样 Docker 缓存更稳定。
COPY package*.json ./
RUN npm ci

COPY src ./src
COPY tsconfig.json ./
COPY drizzle.config.ts ./

EXPOSE 3001

CMD ["npm", "start"]
