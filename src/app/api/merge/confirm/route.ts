import { NextRequest, NextResponse } from 'next/server';
import matter from 'gray-matter';
import { readInboxNote, writeInboxNote, readLibraryNote, writeLibraryNote } from '../../../../../lib/data';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { rawId, action, targetPath, patch, newPath, newContent } = body;

    if (!rawId || !action) {
      return NextResponse.json({ error: 'Missing rawId or action' }, { status: 400 });
    }

    // 1. 读取 Inbox 条目
    const inboxFilename = `${rawId}.md`;
    const inboxNote = await readInboxNote(inboxFilename);
    if (!inboxNote) {
      return NextResponse.json({ error: `Inbox note ${inboxFilename} not found` }, { status: 404 });
    }

    // 2. 根据用户动作进行分发处理
    if (action === 'DEFER') {
      // 稍后处理
      inboxNote.data.status = 'deferred';
      await writeInboxNote(inboxFilename, inboxNote);

      return NextResponse.json({ success: true, message: 'Item deferred.' });
    }

    if (action === 'ARCHIVE_NEW') {
      // 新建 Library 文件
      if (!newPath || !newContent) {
        return NextResponse.json({ error: 'Missing newPath or newContent for ARCHIVE_NEW' }, { status: 400 });
      }

      // 去除可能的前缀 library/
      const cleanPath = newPath.replace(/^library\//, '');
      
      // 使用 gray-matter 解析可能包含 frontmatter 的完整 markdown 内容
      const parsed = matter(newContent);
      
      await writeLibraryNote(cleanPath, {
        content: parsed.content,
        data: parsed.data
      });

      // 更新 inbox 状态
      inboxNote.data.status = 'processed';
      inboxNote.data.processed_method = 'archive_new';
      inboxNote.data.merged_to = cleanPath;
      await writeInboxNote(inboxFilename, inboxNote);

      return NextResponse.json({ success: true, message: 'Archived as new file.' });
    }

    if (action === 'MERGE') {
      // 合并到现有的 Library 文件
      if (!targetPath || !patch || !patch.content_block_markdown) {
        return NextResponse.json({ error: 'Missing targetPath or patch for MERGE' }, { status: 400 });
      }

      const cleanPath = targetPath.replace(/^library\//, '');
      const libNote = await readLibraryNote(cleanPath);

      if (!libNote) {
        return NextResponse.json({ error: `Library target ${cleanPath} not found` }, { status: 404 });
      }

      // TODO: 这里是简单的 patch 逻辑，LO 可以根据需求替换为更复杂的合并算法
      const insertStrategy = patch.insert_strategy || 'append_to_section';
      const sectionHeading = patch.section_heading;
      const contentBlock = patch.content_block_markdown;

      if (insertStrategy === 'append_to_section' && sectionHeading) {
        // 尝试找到对应的标题，并在其内容之后追加
        const regex = new RegExp(`(#{2,6}\\s+${sectionHeading}[\\s\\S]*?)(?=\\n#{2,6}\\s|$)`, 'i');
        if (regex.test(libNote.content)) {
          libNote.content = libNote.content.replace(regex, `$1\n\n${contentBlock}\n`);
        } else {
          // 如果没找到对应的标题，新建该小节
          libNote.content += `\n\n## ${sectionHeading}\n\n${contentBlock}\n`;
        }
      } else {
        // 默认直接追加到末尾
        libNote.content += `\n\n${contentBlock}\n`;
      }

      // 更新 Library 时间戳
      libNote.data.updated_at = new Date().toISOString();

      await writeLibraryNote(cleanPath, libNote);

      // 更新 Inbox 状态
      inboxNote.data.status = 'processed';
      inboxNote.data.processed_method = 'merge';
      inboxNote.data.merged_to = cleanPath;
      await writeInboxNote(inboxFilename, inboxNote);

      return NextResponse.json({ success: true, message: 'Merged successfully.' });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

  } catch (error: any) {
    console.error('[API Merge Confirm] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
