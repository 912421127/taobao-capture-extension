# 淘宝商品采集与数据分析

这是一个本地淘宝/天猫商品数据采集项目，包含三部分：

- 浏览器扩展：基于 WXT + Vue，负责在商品详情页采集前端数据。
- 后端服务：基于 Express + Drizzle ORM + PostgreSQL，负责保存和查询采集数据。
- 分析页面：独立 Vue dashboard，负责查看商品列表、SKU、图片和价格快照趋势。

## 启动后端和数据库

```bash
docker compose up --build
```

检查后端：

```bash
curl http://localhost:3001/health
```

## 启动分析页面

```bash
cd dashboard
npm install
npm run dev
```

默认开发地址是 `http://localhost:5174`。dashboard 会通过 Vite proxy 请求 `http://localhost:3001` 的 API。

## 启动浏览器扩展

```bash
npm install
npm run dev
```

WXT 会生成 `.output/chrome-mv3`。打开 Chrome/Edge 扩展管理页，开启开发者模式，加载该目录。

## 后端 API

- `POST /api/captures`：保存商品采集结果。
- `GET /api/analytics/summary`：获取商品数、SKU 数、图片数、快照数、价格范围和最近快照时间。
- `GET /api/products?search=&page=&pageSize=`：分页查询商品。
- `GET /api/products/:captureId`：查询商品详情、图片和 SKU。
- `GET /api/products/:captureId/price-history?skuId=`：查询价格快照趋势。

## 数据库查询

```bash
docker compose exec postgres psql -U taobao -d taobao_capture
```

常用查询：

```sql
select * from captures order by id desc;
select * from capture_skus order by id desc;
select * from capture_images order by id desc;
select item_id, sku_id, price, price_text, stock_text, captured_at
from sku_price_snapshots
order by captured_at desc;
```

## 验证

后端：

```bash
cd backend
npm run typecheck
npm test
```

分析页面：

```bash
cd dashboard
npm run typecheck
npm run build
```
