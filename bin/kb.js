#!/usr/bin/env node

const { program } = require('commander');
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

/**
 * 寻找知识库仓库的根目录
 * 优先级:
 * 1. KV_REPO 环境变量
 * 2. 向上递归查找包含 inbox/ 和 library/ 的目录
 * 3. 退回到当前工作目录
 */
function findRepoRoot() {
  if (process.env.KV_REPO) {
    return process.env.KV_REPO;
  }

  let currentDir = process.cwd();
  const root = path.parse(currentDir).root;

  // 1. 尝试从当前执行目录向上查找
  while (currentDir !== root) {
    const hasInbox = fs.existsSync(path.join(currentDir, 'inbox'));
    const hasLibrary = fs.existsSync(path.join(currentDir, 'library'));
    if (hasInbox && hasLibrary) {
      return currentDir;
    }
    currentDir = path.dirname(currentDir);
  }

  // 2. 尝试从脚本所在目录向上查找
  currentDir = __dirname;
  while (currentDir !== root) {
    const hasInbox = fs.existsSync(path.join(currentDir, 'inbox'));
    const hasLibrary = fs.existsSync(path.join(currentDir, 'library'));
    if (hasInbox && hasLibrary) {
      return currentDir;
    }
    currentDir = path.dirname(currentDir);
  }

  // fallback to CWD
  return process.cwd();
}

program
  .name('kb')
  .description('个人碎片知识库 CLI 搜索工具 (只读)')
  .version('0.1.0')
  .argument('[query...]', '搜索关键词 (多个关键词以空格分隔)')
  .action((queryParts) => {
    // 1. 无 query 行为，输出帮助信息并退出码为 2
    if (!queryParts || queryParts.length === 0) {
      program.help();
      process.exit(2);
    }

    const query = queryParts.join(' ');
    const repoRoot = findRepoRoot();
    const dbPath = path.join(repoRoot, '.kv-meta', 'index.sqlite');

    if (!fs.existsSync(dbPath)) {
      console.error(`❌ 错误：找不到索引数据库: ${dbPath}`);
      console.error('请在 Web 应用中重建索引，或确保你在正确的知识库仓库目录内。可以设置 KV_REPO 环境变量。');
      process.exit(1);
    }

    try {
      const db = new Database(dbPath, { readonly: true });

      // 使用 FTS5 MATCH 语法。这里将每个输入词作为前缀匹配，用 AND 连接
      // 例如: "es 创建索引" -> "es*" AND "创建索引*"
      const ftsQuery = queryParts.map(q => `"${q}"*`).join(' AND ');

      // 准备 SQL 语句
      // FTS5 提供的 snippet 函数:
      // snippet(table, column_index, start_match, end_match, ellipsis, max_tokens)
      // documents 对应 content 是第 2 列 (id=0, title=1, content=2, path=3, tags=4)
      const sql = `
        SELECT 
          title,
          path,
          tags,
          snippet(documents, 2, '\x1b[33m', '\x1b[0m', '...', 15) AS contentSnippet
        FROM documents
        WHERE documents MATCH ?
        ORDER BY rank
        LIMIT 20
      `;

      const stmt = db.prepare(sql);
      const results = stmt.all(ftsQuery);

      if (results.length === 0) {
        console.log(`\n\x1b[90m未找到关于 "${query}" 的结果。\x1b[0m\n`);
        return;
      }

      console.log(`\n\x1b[32m找到 ${results.length} 条关于 "${query}" 的结果：\x1b[0m\n`);

      results.forEach((row, index) => {
        const isInbox = row.path && row.path.startsWith('inbox');
        const typeLabel = isInbox ? '\x1b[34m[Inbox]\x1b[0m' : '\x1b[35m[Library]\x1b[0m';
        const title = row.title || path.basename(row.path || 'Unknown');
        
        console.log(`\x1b[1m${index + 1}. ${title}\x1b[0m ${typeLabel}`);
        console.log(`   \x1b[90m路径:\x1b[0m ${row.path}`);
        if (row.tags) {
          console.log(`   \x1b[90m标签:\x1b[0m ${row.tags}`);
        }
        if (row.contentSnippet) {
          // 清理多余换行符，让终端显示更紧凑
          const cleanSnippet = row.contentSnippet.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
          console.log(`   \x1b[90m片段:\x1b[0m ${cleanSnippet}`);
        }
        console.log('');
      });

      db.close();
    } catch (err) {
      console.error('❌ 搜索时发生错误:', err.message);
      process.exit(1);
    }
  });

// 监听未捕获的命令，打印帮助
program.on('command:*', function () {
  console.error('无效命令: %s\n', program.args.join(' '));
  program.help();
  process.exit(2);
});

program.parse(process.argv);
