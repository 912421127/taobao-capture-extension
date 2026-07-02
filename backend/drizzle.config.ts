import { defineConfig } from 'drizzle-kit';

// Drizzle Kit 会读取这里的配置，把 src/schema.ts 同步到 PostgreSQL。
export default defineConfig({
    schema: './src/schema.ts',
    dialect: 'postgresql',
    dbCredentials: {
        host: process.env.PGHOST || 'localhost',
        port: Number(process.env.PGPORT || 5432),
        database: process.env.PGDATABASE || 'taobao_capture',
        user: process.env.PGUSER || 'taobao',
        password: process.env.PGPASSWORD || 'taobao123',
        ssl: false
    }
});
