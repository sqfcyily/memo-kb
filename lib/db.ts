import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

// 确保数据库目录存在
const dbDir = path.join(process.cwd(), '.kv-meta');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// 连接到 SQLite 数据库文件
const dbPath = path.join(dbDir, 'index.sqlite');
const db = new Database(dbPath);

// 开启 WAL 模式以提升并发和性能
db.pragma('journal_mode = WAL');
db.pragma('synchronous = NORMAL');

// 初始化 FTS5 表
export function initDB() {
  db.exec(`
    CREATE VIRTUAL TABLE IF NOT EXISTS documents USING fts5(
      id UNINDEXED,      -- 文件的唯一标识（例如：相对路径）
      title,             -- 文档标题
      content,           -- 文档正文内容
      path UNINDEXED,    -- 文件相对路径
      tags,              -- 标签或分类
      tokenize='unicode61' -- 兼容性极好的默认分词器
    );
  `);
}

// 首次加载时初始化
initDB();

export default db;
