import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { writeInboxNote } from '../../../../lib/data';

export async function POST(req: NextRequest) {
  try {
    let rawText = await req.text();

    // 如果客户端发送的是 JSON，尝试解析提取 text 或 content 字段
    if (rawText.trim().startsWith('{')) {
      try {
        const json = JSON.parse(rawText);
        if (typeof json.text === 'string') {
          rawText = json.text;
        } else if (typeof json.content === 'string') {
          rawText = json.content;
        }
      } catch (e) {
        // 忽略 JSON 解析错误，继续作为纯文本处理
      }
    }

    if (!rawText || !rawText.trim()) {
      return NextResponse.json(
        { error: 'Content cannot be empty' },
        { status: 400 }
      );
    }

    const uuid = uuidv4();
    const timestamp = new Date().toISOString();
    const filename = `${uuid}.md`;

    // 1. 保存到 Inbox 目录
    await writeInboxNote(filename, {
      content: rawText,
      data: {
        id: uuid,
        createdAt: timestamp,
        source: 'api/capture',
      },
    });

    // 2. 异步触发整理 API，不等待其完成（Fire and Forget）
    const organizeUrl = new URL('/api/llm/organize', req.url).toString();
    fetch(organizeUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ filename }),
    }).catch((err) => {
      console.error('[API Capture] Failed to trigger /api/llm/organize:', err);
    });

    return NextResponse.json({
      success: true,
      id: uuid,
      filename,
      message: 'Note captured and organize task triggered.',
    });
  } catch (error: any) {
    console.error('[API Capture] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
