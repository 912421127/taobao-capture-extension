-- 商品采集主表：每点一次“提取当前页”，就新增一条采集快照。
create table if not exists captures (
  id bigserial primary key,
  page_url text not null default '',
  platform text not null default 'taobao',
  item_id text not null default '',
  title text not null default '',
  shop_name text not null default '',
  final_price text not null default '',
  raw_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- SKU 明细表：一条采集记录可以有多个规格。
create table if not exists capture_skus (
  id bigserial primary key,
  capture_id bigint not null references captures(id) on delete cascade,
  sku_id text not null default '',
  spec_name text not null default '',
  price_text text not null default '',
  stock_text text not null default ''
);

-- 图片明细表：主图和详情图都存在这里，用 image_type 区分。
create table if not exists capture_images (
  id bigserial primary key,
  capture_id bigint not null references captures(id) on delete cascade,
  image_type text not null,
  image_url text not null default '',
  sort_order integer not null default 0
);

create index if not exists idx_capture_skus_capture_id on capture_skus(capture_id);
create index if not exists idx_capture_images_capture_id on capture_images(capture_id);
