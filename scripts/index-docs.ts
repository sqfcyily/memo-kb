import db from '../lib/db';
import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

const BASE_DIR = process.cwd();
const DIRS_TO_INDEX = ['inbox', 'library'];

// 递归获取所有目标文件
function getFiles(dir: string, fileList: string[] = []): string[] {
  if (!fs.existsSync(dir)) return fileList;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      getFiles(fullPath, fileList);
    } else if (file.endsWith('.md') || file.endsWith('.txt')) {
      fileList.push(fullPath);
    }
  }
  return fileList;
}

export function indexDocuments() {
  console.log('🔍 开始重建知识库 FTS5 索引...');
  
  // 清空旧数据
  db.exec('DELETE FROM documents');

  // 准备插入语句
  const insert = db.prepare(`
    INSERT INTO documents (id, title, content, path, tags)
    VALUES (@id, @title, @content, @path, @tags)
  `);

  // 使用事务提升大批量插入性能
  const transaction = db.transaction((files: string[]) => {
    for (const filePath of files) {
      const relPath = path.relative(BASE_DIR, filePath);
      const rawContent = fs.readFileSync(filePath, 'utf-8');
      
      try {
        // 解析 frontmatter (如果有)
        const { data, content } = matter(rawContent);
        
        const title = data.title || path.basename(filePath, path.extname(filePath));
        const tags = data.tags ? (Array.isArray(data.tags) ? data.tags.join(',') : String(data.tags)) : '';

        insert.run({
          id: relPath,
          title,
          content: content || rawContent,
          path: relPath,
          tags
        });
        console.log(`✅ 已索引: ${relPath}`);
      } catch (err) {
        console.error(`❌ 解析失败: ${relPath}`, err);
      }
    }
  });

  const allFiles: string[] = [];
  for (const dir of DIRS_TO_INDEX) {
    const fullPath = path.join(BASE_DIR, dir);
    getFiles(fullPath, allFiles);
  }

  if (allFiles.length > 0) {
    transaction(allFiles);
  }
  
  console.log(`🎉 索引完成！共处理了 ${allFiles.length} 个文件。`);
}

// 允许直接从 CLI 执行
if (require.main === module || process.argv[1].endsWith('index-docs.ts')) {
  indexDocuments();
}
