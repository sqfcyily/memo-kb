import { notFound } from 'next/navigation';
import Link from 'next/link';
import { readInboxNote, readLibraryNote } from '../../../../lib/data';
import MergePanel from './MergePanel';

interface PageProps {
  params: {
    rawId: string;
  };
}

export default async function MergePage({ params }: PageProps) {
  // Use await for params to avoid sync access warnings in newer Next.js versions
  const { rawId } = await params;

  const fileName = `${rawId}.md`;
  const inboxNote = await readInboxNote(fileName);

  if (!inboxNote) {
    notFound();
  }

  const llmSuggestion = inboxNote.data?.llm_suggestion || null;

  // 如果有合并建议，预取 Library 文件内容供 Diff 显示
  const libraryNotes: Record<string, string> = {};
  if (llmSuggestion?.merge_candidates?.length > 0) {
    for (const candidate of llmSuggestion.merge_candidates) {
      const cleanPath = candidate.target_path.replace(/^library\//, '');
      const libNote = await readLibraryNote(cleanPath);
      if (libNote) {
        libraryNotes[cleanPath] = libNote.content;
      }
    }
  }

  return (
    <div className="max-w-5xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* 左侧：原始输入 */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <Link href="/inbox" className="text-gray-500 hover:text-gray-700 flex items-center gap-1 font-medium transition-colors">
            ← 返回收件箱
          </Link>
          <h1 className="text-2xl font-bold text-gray-800">📝 原始输入</h1>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6 flex-1 min-h-[500px]">
          <div className="prose prose-sm max-w-none text-gray-700 font-mono whitespace-pre-wrap">
            {inboxNote.content || '空内容...'}
          </div>
        </div>
      </div>

      {/* 右侧：合并建议和操作区 */}
      <div className="flex flex-col gap-4">
        <h2 className="text-2xl font-bold text-gray-800 invisible lg:visible">✨ 处理面板</h2>
        <div className="flex-1 flex flex-col">
          <MergePanel 
            rawId={rawId} 
            inboxNoteContent={inboxNote.content} 
            llmSuggestion={llmSuggestion} 
            libraryNotes={libraryNotes} 
          />
        </div>
      </div>
    </div>
  );
}
