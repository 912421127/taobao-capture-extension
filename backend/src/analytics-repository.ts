import { sql } from 'drizzle-orm';
import { db } from './db.js';

export type AnalyticsDb = {
    execute(query: unknown): Promise<{ rows: Record<string, unknown>[] }>;
};

export type ProductListOptions = {
    search?: string;
    page?: number;
    pageSize?: number;
};

export type AnalyticsSummary = {
    productCount: number;
    skuCount: number;
    imageCount: number;
    snapshotCount: number;
    minPrice: number;
    maxPrice: number;
    latestSnapshotAt: string;
};

export type ProductListItem = {
    id: number;
    platform: string;
    itemId: string;
    title: string;
    shopName: string;
    finalPrice: string;
    createdAt: string;
    skuCount: number;
    minPrice: number;
    maxPrice: number;
    latestSnapshotAt: string;
};

export type ProductListResult = {
    items: ProductListItem[];
    total: number;
    page: number;
    pageSize: number;
};

export type ProductDetail = {
    id: number;
    platform: string;
    itemId: string;
    title: string;
    shopName: string;
    finalPrice: string;
    pageUrl: string;
    createdAt: string;
    images: ProductImage[];
    skus: ProductSku[];
};

export type ProductImage = {
    id: number;
    imageType: string;
    imageUrl: string;
    sortOrder: number;
};

export type ProductSku = {
    id: number;
    skuId: string;
    specName: string;
    skuPrice: number;
    stockText: string;
};

export type PriceHistoryPoint = {
    id: number;
    captureId: number;
    itemId: string;
    skuId: string;
    specName: string;
    skuPrice: number;
    priceText: string;
    stockText: string;
    capturedAt: string;
};

export async function getAnalyticsSummary() {
    return getAnalyticsSummaryWithDb(db);
}

export async function getAnalyticsSummaryWithDb(analyticsDb: AnalyticsDb): Promise<AnalyticsSummary> {
    const result = await analyticsDb.execute(sql`
        select
            (select count(*) from captures) as product_count,
            (select count(*) from capture_skus) as sku_count,
            (select count(*) from capture_images) as image_count,
            (select count(*) from sku_price_snapshots) as snapshot_count,
            coalesce((select min(price) from sku_price_snapshots), 0) as min_price,
            coalesce((select max(price) from sku_price_snapshots), 0) as max_price,
            (select max(captured_at) from sku_price_snapshots) as latest_snapshot_at
    `);
    const row = result.rows[0] || {};

    return {
        productCount: toNumber(row.product_count),
        skuCount: toNumber(row.sku_count),
        imageCount: toNumber(row.image_count),
        snapshotCount: toNumber(row.snapshot_count),
        minPrice: toNumber(row.min_price),
        maxPrice: toNumber(row.max_price),
        latestSnapshotAt: toIsoString(row.latest_snapshot_at)
    };
}

export async function listProducts(options: ProductListOptions = {}) {
    return listProductsWithDb(db, options);
}

export async function listProductsWithDb(analyticsDb: AnalyticsDb, options: ProductListOptions = {}): Promise<ProductListResult> {
    const page = clampInteger(options.page, 1, 1, Number.MAX_SAFE_INTEGER);
    const pageSize = clampInteger(options.pageSize, 20, 1, 100);
    const offset = (page - 1) * pageSize;
    const search = (options.search || '').trim();
    const likeSearch = `%${search}%`;

    const result = await analyticsDb.execute(sql`
        select
            count(*) over() as total_count,
            c.id,
            c.platform,
            c.item_id,
            c.title,
            c.shop_name,
            c.final_price,
            c.created_at,
            coalesce(sku_stats.sku_count, 0) as sku_count,
            coalesce(snapshot_stats.min_price, 0) as min_price,
            coalesce(snapshot_stats.max_price, 0) as max_price,
            snapshot_stats.latest_snapshot_at
        from captures c
        left join (
            select capture_id, count(*) as sku_count
            from capture_skus
            group by capture_id
        ) sku_stats on sku_stats.capture_id = c.id
        left join (
            select capture_id, min(price) as min_price, max(price) as max_price, max(captured_at) as latest_snapshot_at
            from sku_price_snapshots
            group by capture_id
        ) snapshot_stats on snapshot_stats.capture_id = c.id
        where (
            ${search} = ''
            or c.item_id ilike ${likeSearch}
            or c.title ilike ${likeSearch}
            or c.shop_name ilike ${likeSearch}
        )
        order by coalesce(snapshot_stats.latest_snapshot_at, c.created_at) desc, c.id desc
        limit ${pageSize}
        offset ${offset}
    `);

    const items = result.rows.map(mapProductListItem);
    const total = toNumber(result.rows[0]?.total_count);

    return { items, total, page, pageSize };
}

export async function getProductDetail(captureId: number) {
    return getProductDetailWithDb(db, captureId);
}

export async function getProductDetailWithDb(analyticsDb: AnalyticsDb, captureId: number): Promise<ProductDetail | null> {
    const productResult = await analyticsDb.execute(sql`
        select id, platform, item_id, title, shop_name, final_price, page_url, created_at
        from captures
        where id = ${captureId}
        limit 1
    `);

    const productRow = productResult.rows[0];
    if (!productRow) {
        return null;
    }

    const [imageResult, skuResult] = await Promise.all([
        analyticsDb.execute(sql`
            select id, image_type, image_url, sort_order
            from capture_images
            where capture_id = ${captureId}
            order by sort_order asc, id asc
        `),
        analyticsDb.execute(sql`
            select id, sku_id, spec_name, price, stock_text
            from capture_skus
            where capture_id = ${captureId}
            order by id asc
        `)
    ]);

    return {
        id: toNumber(productRow.id),
        platform: toStringValue(productRow.platform),
        itemId: toStringValue(productRow.item_id),
        title: toStringValue(productRow.title),
        shopName: toStringValue(productRow.shop_name),
        finalPrice: toStringValue(productRow.final_price),
        pageUrl: toStringValue(productRow.page_url),
        createdAt: toIsoString(productRow.created_at),
        images: imageResult.rows.map(row => ({
            id: toNumber(row.id),
            imageType: toStringValue(row.image_type),
            imageUrl: toStringValue(row.image_url),
            sortOrder: toNumber(row.sort_order)
        })),
        skus: skuResult.rows.map(row => ({
            id: toNumber(row.id),
            skuId: toStringValue(row.sku_id),
            specName: toStringValue(row.spec_name),
            skuPrice: toNumber(row.price),
            stockText: toStringValue(row.stock_text)
        }))
    };
}

export async function getPriceHistory(captureId: number, skuId?: string) {
    return getPriceHistoryWithDb(db, captureId, skuId);
}

export async function getPriceHistoryWithDb(analyticsDb: AnalyticsDb, captureId: number, skuId?: string): Promise<PriceHistoryPoint[]> {
    const normalizedSkuId = (skuId || '').trim();
    const result = await analyticsDb.execute(sql`
        select id, capture_id, item_id, sku_id, spec_name, price, price_text, stock_text, captured_at
        from sku_price_snapshots
        where capture_id = ${captureId}
            and (${normalizedSkuId} = '' or sku_id = ${normalizedSkuId})
        order by captured_at asc, id asc
    `);

    return result.rows.map(row => ({
        id: toNumber(row.id),
        captureId: toNumber(row.capture_id),
        itemId: toStringValue(row.item_id),
        skuId: toStringValue(row.sku_id),
        specName: toStringValue(row.spec_name),
        skuPrice: toNumber(row.price),
        priceText: toStringValue(row.price_text),
        stockText: toStringValue(row.stock_text),
        capturedAt: toIsoString(row.captured_at)
    }));
}

function mapProductListItem(row: Record<string, unknown>): ProductListItem {
    return {
        id: toNumber(row.id),
        platform: toStringValue(row.platform),
        itemId: toStringValue(row.item_id),
        title: toStringValue(row.title),
        shopName: toStringValue(row.shop_name),
        finalPrice: toStringValue(row.final_price),
        createdAt: toIsoString(row.created_at),
        skuCount: toNumber(row.sku_count),
        minPrice: toNumber(row.min_price),
        maxPrice: toNumber(row.max_price),
        latestSnapshotAt: toIsoString(row.latest_snapshot_at)
    };
}

function clampInteger(value: unknown, fallback: number, min: number, max: number) {
    const numberValue = Number(value);
    if (!Number.isFinite(numberValue)) {
        return fallback;
    }
    return Math.min(Math.max(Math.trunc(numberValue), min), max);
}

function toNumber(value: unknown) {
    const numberValue = Number(value);
    return Number.isFinite(numberValue) ? numberValue : 0;
}

function toStringValue(value: unknown) {
    return typeof value === 'string' ? value : value == null ? '' : String(value);
}

function toIsoString(value: unknown) {
    if (!value) {
        return '';
    }
    if (value instanceof Date) {
        return value.toISOString();
    }
    return String(value);
}
