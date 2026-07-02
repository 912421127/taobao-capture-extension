import { sql } from 'drizzle-orm';
import { bigint, bigserial, index, integer, jsonb, pgTable, real, text, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';

export const captures = pgTable(
    'captures',
    {
        id: bigserial('id', { mode: 'number' }).primaryKey(),
        pageUrl: text('page_url').notNull().default(''),
        platform: text('platform').notNull().default('taobao'),
        itemId: text('item_id').notNull().default(''),
        title: text('title').notNull().default(''),
        shopName: text('shop_name').notNull().default(''),
        finalPrice: text('final_price').notNull().default(''),
        rawData: jsonb('raw_data').notNull().default({}),
        createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
    },
    table => ({
        productUniqueIdx: uniqueIndex('idx_captures_platform_item_id_unique').on(table.platform, table.itemId)
    })
);

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

export const skuPriceSnapshots = pgTable(
    'sku_price_snapshots',
    {
        id: bigserial('id', { mode: 'number' }).primaryKey(),
        captureId: bigint('capture_id', { mode: 'number' })
            .notNull()
            .references(() => captures.id, { onDelete: 'cascade' }),
        platform: text('platform').notNull().default('taobao'),
        itemId: text('item_id').notNull().default(''),
        skuId: text('sku_id').notNull().default(''),
        specName: text('spec_name').notNull().default(''),
        skuPrice: real('price').notNull().default(0),
        priceText: text('price_text').notNull().default(''),
        stockText: text('stock_text').notNull().default(''),
        capturedAt: timestamp('captured_at').notNull().default(sql`timezone('Asia/Shanghai', now())`)
    },
    table => ({
        itemSkuTimeIdx: index('idx_sku_price_snapshots_item_sku_time').on(table.itemId, table.skuId, table.capturedAt),
        captureIdIdx: index('idx_sku_price_snapshots_capture_id').on(table.captureId)
    })
);
