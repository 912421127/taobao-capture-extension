import { bigint, bigserial, index, integer, jsonb, pgTable, text, timestamp, real } from 'drizzle-orm/pg-core';

// 商品采集主表。字段名和数据库列名在这里统一映射，业务代码只使用更友好的驼峰命名。
export const captures = pgTable('captures', {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    pageUrl: text('page_url').notNull().default(''),
    platform: text('platform').notNull().default('taobao'),
    itemId: text('item_id').notNull().default(''),
    title: text('title').notNull().default(''),
    shopName: text('shop_name').notNull().default(''),
    finalPrice: text('final_price').notNull().default(''),
    rawData: jsonb('raw_data').notNull().default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
});

// SKU 明细表。通过 captureId 关联到一次采集快照。
export const captureSkus = pgTable(
    'capture_skus',
    {
        id: bigserial('id', { mode: 'number' }).primaryKey(),
        captureId: bigint('capture_id', { mode: 'number' })
            .notNull()
            .references(() => captures.id, { onDelete: 'cascade' }),
        skuId: text('sku_id').notNull().default(''),
        specName: text('spec_name').notNull().default(''),
        skuPrice: real('price').notNull().default(0),
        stockText: text('stock_text').notNull().default('')
    },
    table => ({
        captureIdIdx: index('idx_capture_skus_capture_id').on(table.captureId)
    })
);

// 图片明细表。主图和详情图放在同一张表，用 imageType 区分。
export const captureImages = pgTable(
    'capture_images',
    {
        id: bigserial('id', { mode: 'number' }).primaryKey(),
        captureId: bigint('capture_id', { mode: 'number' })
            .notNull()
            .references(() => captures.id, { onDelete: 'cascade' }),
        imageType: text('image_type').notNull(),
        imageUrl: text('image_url').notNull().default(''),
        sortOrder: integer('sort_order').notNull().default(0)
    },
    table => ({
        captureIdIdx: index('idx_capture_images_capture_id').on(table.captureId)
    })
);
