import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as schema from './schema.js';

const { Pool } = pg;

// PostgreSQL 连接池。配置都从环境变量读取，Docker Compose 会统一传进来。
export const pool = new Pool({
    host: process.env.PGHOST || 'postgres',
    port: Number(process.env.PGPORT || 5432),
    database: process.env.PGDATABASE || 'taobao_capture',
    user: process.env.PGUSER || 'taobao',
    password: process.env.PGPASSWORD || 'taobao123'
});

// Drizzle 数据库实例。schema 会让插入字段获得 TypeScript 类型提示。
export const db = drizzle(pool, { schema });
