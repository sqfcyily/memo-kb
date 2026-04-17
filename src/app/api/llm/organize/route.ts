import { NextRequest, NextResponse } from 'next/server';
import { generateObject } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';
import { readInboxNote, writeInboxNote, listLibraryNotes } from '../../../../../lib/data';

// MVP 建议的 LLM 输出 Schema
const OrganizeSchema = z.object({
  raw_id: z.string().describe("该条目的唯一标识（如 UUID）"),
  content_type: z.enum(['command', 'url', 'note', 'snippet', 'unknown']).describe("提取的内容类型"),
  title: z.string().describe("为这个知识片段生成一个简短、清晰的标题"),
  summary: z.string().describe("内容的一两句话摘要"),
  tags: z.array(z.string()).describe("合适的标签，例如 ['elasticsearch', '命令']"),
  domain: z.string().describe("该知识片段所属的技术领域（如 'elasticsearch', 'git'）"),
  decision: z.enum(['auto_archive', 'needs_confirmation']).describe("如果没有合并候选且置信度高，可自动归档；如果需要用户确认是否合并，则需要确认。"),
  decision_reason: z.string().describe("为何可以自动归档或为何需要确认（2~3句话）"),
  extracted: z.object({
    commands: z.array(
      z.object({
        language: z.string(),
        command: z.string(),
        danger_level: z.enum(['low', 'medium', 'high']),
        platform: z.array(z.string()),
        notes: z.string().optional()
      })
    ).optional().describe("提取的代码或命令片段"),
    urls: z.array(z.string()).optional().describe("提取到的网址")
  }),
  merge_candidates: z.array(
    z.object({
      target_id: z.string(),
      target_path: z.string(),
      confidence: z.number(),
      reasons: z.array(z.string()),
      patch_suggestion: z.object({
        insert_strategy: z.string(),
        section_heading: z.string().optional(),
        content_block_markdown: z.string()
      }).optional()
    })
  ).optional().describe("如果有已存在的文件可供合并，请在这里列出建议"),
  new_file_suggestion: z.object({
    suggested_path: z.string().describe("推荐的新建文件路径（例如 library/elasticsearch/create-index.md）"),
    content_markdown: z.string().describe("包含 YAML frontmatter 和正文的完整 Markdown 内容")
  }).optional().describe("如果无法合并到现有文件，这里是新建文件的建议")
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    let { raw_id, filename } = body;
    
    // 如果没有提供 raw_id，但有 filename，推导一下
    if (!raw_id && filename) {
      raw_id = filename.replace('.md', '');
    }
    
    if (!raw_id) {
      return NextResponse.json({ error: 'Missing raw_id' }, { status: 400 });
    }

    const actualFilename = filename || `${raw_id}.md`;
    
    // 1. 读取 Inbox 中的原始条目
    const note = await readInboxNote(actualFilename);
    if (!note) {
      return NextResponse.json({ error: 'Inbox item not found' }, { status: 404 });
    }

    // 2. 读取现有 Library，供 LLM 参考是否进行合并
    const libraryFiles = await listLibraryNotes();
    const libraryContext = libraryFiles.length > 0 
      ? libraryFiles.join('\n') 
      : '当前知识库为空，没有已有文件可以合并。';

    // 3. 构建提示词
    const systemPrompt = `你是一个专业的个人知识库整理助手。你的任务是分析用户的碎片知识输入，并将其转化为结构化的 JSON 格式。
请根据用户的输入内容提取相关的命令、代码片段或链接，并为其生成标题、摘要、领域分类和标签。
如果现有库中有非常相关的文件，请在 merge_candidates 中建议将其合并；否则请在 new_file_suggestion 中提供新建文件的方案。

现有知识库文件列表：
${libraryContext}
`;

    const userPrompt = `以下是用户最新录入的未整理知识条目：

内容：
${note.content}

请根据此内容输出符合要求的 JSON。对应的 raw_id 为 "${raw_id}"。`;

    // 4. 调用 LLM
    // 这里使用 OpenAI，你可以通过配置环境变量 OPENAI_API_KEY 来使用
    const { object } = await generateObject({
      model: openai('gpt-4o-mini'), // 或根据你的环境选用自定义模型配置
      schema: OrganizeSchema,
      system: systemPrompt,
      prompt: userPrompt,
    });

    // 5. 更新条目的状态并保存分析结果
    note.data.status = 'suggested';
    note.data.llm_suggestion = object;

    await writeInboxNote(actualFilename, note);

    return NextResponse.json({
      success: true,
      raw_id,
      suggestion: object,
      message: 'Successfully analyzed inbox item and updated status to suggested.'
    });

  } catch (error: any) {
    console.error('[API Organize] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
