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

export async function fetchHealth() {
  const response = await fetch('/health');
  if (!response.ok) {
    throw new Error('后端未连接');
  }
  return response.json() as Promise<{ ok: boolean }>;
}

export async function fetchSummary() {
  return fetchJson<AnalyticsSummary>('/api/analytics/summary');
}

export async function fetchProducts(params: { search: string; page: number; pageSize: number }) {
  const query = new URLSearchParams({
    search: params.search,
    page: String(params.page),
    pageSize: String(params.pageSize)
  });

  return fetchJson<ProductListResult>(`/api/products?${query.toString()}`);
}

export async function fetchProductDetail(captureId: number) {
  return fetchJson<ProductDetail>(`/api/products/${captureId}`);
}

export async function fetchPriceHistory(captureId: number, skuId?: string) {
  const query = new URLSearchParams();
  if (skuId) {
    query.set('skuId', skuId);
  }
  const suffix = query.toString() ? `?${query.toString()}` : '';

  return fetchJson<PriceHistoryPoint[]>(`/api/products/${captureId}/price-history${suffix}`);
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  const body = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(body?.message || '请求失败');
  }

  return body as T;
}
