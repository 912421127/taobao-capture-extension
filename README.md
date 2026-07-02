# 淘宝商品前端数据查询

这是一个基于 WXT + Vite + Vue 的简单 popup 插件。

## 它能做什么

- 输入淘宝/天猫商品 ID。
- 请求 `https://detail.tmall.com/item.htm?id=商品ID`。
- 用正则提取页面里的 `var b = {...}` 前端源数据。
- 展示商品标题和 SKU 到手价。

## 本地运行

```bash
npm install
npm run dev
```

WXT 启动后会生成 `.output/chrome-mv3` 目录。打开 Chrome/Edge 的扩展管理页，开启“开发者模式”，加载这个目录即可。

## 核心代码

主要逻辑都在 `entrypoints/popup/App.vue`。

## 后端和数据库

本项目带了一个最小 Node 后端和 PostgreSQL 数据库，代码和前端分开存放：

- 前端扩展：`entrypoints/`、`src/`
- 后端服务：`backend/`
- Docker 编排：`docker-compose.yml`

启动后端和数据库：

```bash
docker compose up --build
```

检查后端是否启动：

```bash
curl http://localhost:3001/health
```

查看数据库数据：

```bash
docker compose exec postgres psql -U taobao -d taobao_capture
```

常用查询：

```sql
select * from captures order by id desc;
select * from capture_skus order by id desc;
select * from capture_images order by id desc;
```
