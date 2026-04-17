'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import DiffViewer from './DiffViewer';

interface MergePanelProps {
  rawId: string;
  inboxNoteContent: string;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
  llmSuggestion: any | null;
  libraryNotes: Record<string, string>; // path -> content
}

export default function MergePanel({ rawId, inboxNoteContent, llmSuggestion, libraryNotes }: MergePanelProps) {
  const router = useRouter();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    try {
      const res = await fetch('/api/llm/organize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ raw_id: rawId, filename: `${rawId}.md` }),
      });
      if (!res.ok) throw new Error('Analysis failed');
      router.refresh(); // Refresh the page to load the new suggestion
    } catch (error) {
      console.error(error);
      alert('分析失败，请重试');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleAction = async (action: string, payload: any = {}) => {
    setIsProcessing(true);
    try {
      const res = await fetch('/api/merge/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rawId, action, ...payload }),
      });
      if (!res.ok) throw new Error('Action failed');
      router.push('/inbox');
    } catch (error) {
      console.error(error);
      alert('操作失败，请重试');
    } finally {
      setIsProcessing(false);
    }
  };

  if (!llmSuggestion) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 text-center">
        <p className="text-gray-600 mb-4">这条笔记还没有经过 AI 分析呢～</p>
        <button
          onClick={handleAnalyze}
          disabled={isAnalyzing}
          className="px-6 py-2 bg-purple-600 text-white font-medium rounded-md hover:bg-purple-700 disabled:opacity-50 transition-colors"
        >
          {isAnalyzing ? '✨ 正在施展魔法分析中...' : '🪄 让 AI 帮我整理'}
        </button>
      </div>
    );
  }

  // 计算可能的 Diff
  let diffContent = null;
  let currentAction = '';
  let actionPayload = {};

  if (llmSuggestion.decision === 'auto_archive' || llmSuggestion.new_file_suggestion) {
    const newPath = llmSuggestion.new_file_suggestion?.suggested_path || `library/${rawId}.md`;
    const newContent = llmSuggestion.new_file_suggestion?.content_markdown || inboxNoteContent;
    
    currentAction = 'ARCHIVE_NEW';
    actionPayload = { newPath, newContent };
    
    diffContent = (
      <div className="mt-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-2 flex items-center gap-2">
          📄 新建文件: <span className="text-purple-600 font-mono text-sm">{newPath}</span>
        </h3>
        <DiffViewer oldString="" newString={newContent} />
      </div>
    );
  } else if (llmSuggestion.merge_candidates && llmSuggestion.merge_candidates.length > 0) {
    const candidate = llmSuggestion.merge_candidates[0]; // 这里暂时只展示第一个候选
    const cleanPath = candidate.target_path.replace(/^library\//, '');
    const oldContent = libraryNotes[cleanPath] || '';
    
    // 模拟 Patch 结果
    let newContent = oldContent;
    const patch = candidate.patch_suggestion;
    if (patch) {
      const insertStrategy = patch.insert_strategy || 'append_to_section';
      const sectionHeading = patch.section_heading;
      const contentBlock = patch.content_block_markdown;

      if (insertStrategy === 'append_to_section' && sectionHeading) {
        const regex = new RegExp(`(#{2,6}\\s+${sectionHeading}[\\s\\S]*?)(?=\\n#{2,6}\\s|$)`, 'i');
        if (regex.test(newContent)) {
          newContent = newContent.replace(regex, `$1\n\n${contentBlock}\n`);
        } else {
          newContent += `\n\n## ${sectionHeading}\n\n${contentBlock}\n`;
        }
      } else {
        newContent += `\n\n${contentBlock}\n`;
      }
    }

    currentAction = 'MERGE';
    actionPayload = { targetPath: candidate.target_path, patch };

    diffContent = (
      <div className="mt-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-2 flex items-center gap-2">
          🔗 合并至现有文件: <span className="text-blue-600 font-mono text-sm">{candidate.target_path}</span>
        </h3>
        <p className="text-sm text-gray-500 mb-3">
          信心指数: <span className="font-bold text-gray-700">{Math.round(candidate.confidence * 100)}%</span>
        </p>
        <DiffViewer oldString={oldContent} newString={newContent} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
        <h2 className="text-xl font-bold text-gray-800 mb-4">🤖 AI 分析结果</h2>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-500 block mb-1">标题</span>
            <span className="font-medium text-gray-800">{llmSuggestion.title || '无'}</span>
          </div>
          <div>
            <span className="text-gray-500 block mb-1">分类领域</span>
            <span className="inline-block px-2 py-1 bg-indigo-50 text-indigo-700 rounded-md">
              {llmSuggestion.domain || '通用'}
            </span>
          </div>
          <div className="col-span-2">
            <span className="text-gray-500 block mb-1">摘要</span>
            <p className="text-gray-700">{llmSuggestion.summary || '无'}</p>
          </div>
          <div className="col-span-2">
            <span className="text-gray-500 block mb-1">建议决策</span>
            <div className="bg-gray-50 p-3 rounded-md text-gray-700 border border-gray-100">
              {llmSuggestion.decision_reason || '暂无详细理由'}
            </div>
          </div>
        </div>
      </div>

      {diffContent}

      <div className="flex gap-4 justify-end mt-8 border-t border-gray-100 pt-6">
        <button
          onClick={() => handleAction('DEFER')}
          disabled={isProcessing}
          className="px-5 py-2.5 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-md font-medium transition-colors disabled:opacity-50"
        >
          ⏳ 稍后处理
        </button>
        <button
          onClick={() => handleAction(currentAction, actionPayload)}
          disabled={isProcessing}
          className="px-6 py-2.5 text-white bg-green-600 hover:bg-green-700 rounded-md font-medium shadow-sm transition-colors disabled:opacity-50 flex items-center gap-2"
        >
          {isProcessing ? '处理中...' : '✅ 确认合并'}
        </button>
      </div>
    </div>
  );
}
