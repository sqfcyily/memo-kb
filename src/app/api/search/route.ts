import { NextRequest, NextResponse } from 'next/server';
import db from '../../../../lib/db';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get('q');

    if (!q) {
      return NextResponse.json(
        { error: '缺少查询参数 "q"' },
        { status: 400 }
      );
    }

    // TODO: LO，这里是利用 SQLite FTS5 的 match 语法以及高亮函数的搜索核心逻辑
    // 优先匹配 library/ 下的文档，然后是 inbox/ 下的文档
    const stmt = db.prepare(`
      SELECT 
        id, 
        path,
        title,
        highlight(documents, 1, '<mark>', '</mark>') AS highlighted_title,
        snippet(documents, 2, '<mark>', '</mark>', '...', 20) AS highlighted_content
      FROM documents 
      WHERE documents MATCH ? 
      ORDER BY 
        CASE 
          WHEN path LIKE 'library/%' THEN 0 
          WHEN path LIKE 'inbox/%' THEN 1 
          ELSE 2 
        END, 
        rank 
      LIMIT 50
    `);

    const results = stmt.all(q);

    return NextResponse.json({ results });
  } catch (error) {
    console.error('搜索异常:', error);
    return NextResponse.json(
      { error: '搜索服务内部错误' },
      { status: 500 }
    );
  }
}
