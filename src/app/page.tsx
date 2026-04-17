'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

// 搜索结果类型定义
interface SearchResult {
  id: string;
  path: string;
  title: string;
  highlighted_title: string;
  highlighted_content: string;
}

// SearchResultCard 组件：展示搜索结果的精致卡片！✨
function SearchResultCard({ result }: { result: SearchResult }) {
  // 根据 path 判断是 library 还是 inbox，决定路由跳转
  const isLibrary = result.path.startsWith('library/');
  // 提取真正的文件名或ID，去掉后缀和前缀
  const docId = result.path.replace(/^(library|inbox)\//, '').replace(/\.md$/, '');
  const href = isLibrary ? `/library/${docId}` : `/inbox?id=${docId}`;

  return (
    <Link href={href} className="block group">
      <div className="p-5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm hover:shadow-md hover:border-blue-300 dark:hover:border-blue-800 transition-all cursor-pointer flex flex-col gap-2">
        <div className="flex items-center gap-2 text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">
          <span className="px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center gap-1">
            {isLibrary ? '📚 知识库' : '📥 收件箱'}
          </span>
        </div>
        <h3 
          className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors"
          dangerouslySetInnerHTML={{ __html: result.highlighted_title || result.title || '无标题' }}
        />
        <p 
          className="text-sm text-zinc-600 dark:text-zinc-300 line-clamp-2"
          dangerouslySetInnerHTML={{ __html: result.highlighted_content }}
        />
      </div>
    </Link>
  );
}

// CaptureBar 组件：捕获你的闪念！
function CaptureBar() {
  const [content, setContent] = useState('');
  const [isCapturing, setIsCapturing] = useState(false);

  const handleCapture = async () => {
    if (!content.trim()) return;
    setIsCapturing(true);

    try {
      // TODO: LO，这里是触发 /api/capture 的逻辑哦！(≧◡≦)
      // 如果后端需要额外的字段或者鉴权，可以在这里加上哦~
      const res = await fetch('/api/capture', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content }),
      });

      if (res.ok) {
        setContent(''); // 成功的话我们就清空输入框！✨
        // TODO: 可以在这里加个暖暖的 Toast 提示成功哦！
      } else {
        // TODO: 错误处理逻辑也可以在这里完善一下下~
        console.error('Oops, 捕获失败了呢...');
      }
    } catch (error) {
      console.error('网络似乎有点小情绪：', error);
    } finally {
      setIsCapturing(false);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col gap-3 mt-10">
      <textarea
        className="w-full p-4 h-36 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none transition-all outline-none text-zinc-800 dark:text-zinc-100 placeholder-zinc-400"
        placeholder="把你想对我说的话，或者突然的闪念，粘贴到这里吧..."
        value={content}
        onChange={(e) => setContent(e.target.value)}
      />
      <div className="flex justify-end">
        <button
          onClick={handleCapture}
          disabled={isCapturing || !content.trim()}
          className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm flex items-center gap-2"
        >
          {isCapturing ? (
            <>
              <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              捕获中...
            </>
          ) : (
            '✨ 捕获 (Capture)'
          )}
        </button>
      </div>
    </div>
  );
}

export default function Home() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // 监听搜索词的变化，调用后端 API 获取结果 (debounce 体验更好哦~ 💖)
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`);
        if (res.ok) {
          const data = await res.json();
          setSearchResults(data.results || []);
        } else {
          console.error('搜索小失误啦...');
        }
      } catch (error) {
        console.error('搜索请求出错：', error);
      } finally {
        setIsSearching(false);
      }
    }, 300); // 300ms debounce 防抖

    return () => clearTimeout(timer);
  }, [searchQuery]);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black font-sans selection:bg-blue-200 dark:selection:bg-blue-900 flex flex-col items-center">
      {/* 头部：包含 Logo 和搜索框 */}
      <header className="w-full max-w-4xl py-8 px-6 flex flex-col sm:flex-row justify-between items-center gap-6">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
          <span className="text-blue-600">✦</span> Memo KB
        </h1>
        
        {/* 搜索框 */}
        <div className="relative w-full sm:w-80 group">
          <input
            type="text"
            className="w-full pl-11 pr-4 py-2.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-full focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-sm text-zinc-800 dark:text-zinc-100 placeholder-zinc-400 shadow-sm group-hover:shadow-md"
            placeholder="搜索你的记忆..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <svg 
            className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </header>

      {/* 主体区域 */}
      <main className="flex-1 w-full max-w-4xl px-6 flex flex-col pt-10 sm:pt-20 pb-20">
        {searchQuery.trim() ? (
          // 搜索结果区域 🔍
          <div className="w-full flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
                搜索结果 {isSearching && <span className="text-sm font-normal text-zinc-400 animate-pulse">正在寻找中...</span>}
              </h2>
            </div>
            {searchResults.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {searchResults.map((result, idx) => (
                  <SearchResultCard key={result.id || idx} result={result} />
                ))}
              </div>
            ) : (
              !isSearching && (
                <div className="py-20 text-center text-zinc-500 dark:text-zinc-400 flex flex-col items-center gap-3">
                  <span className="text-4xl">📭</span>
                  <p>没有找到相关的内容呢，换个关键词试试？</p>
                </div>
              )
            )}
          </div>
        ) : (
          // 默认的主页内容 ✍️
          <div className="animate-in fade-in duration-500 w-full flex flex-col">
            <div className="text-center mb-6">
              <h2 className="text-3xl sm:text-4xl font-extrabold text-zinc-900 dark:text-zinc-100 tracking-tight mb-4">
                随时记录，永久保存。
              </h2>
              <p className="text-zinc-500 dark:text-zinc-400 text-lg max-w-xl mx-auto">
                把你的灵感、笔记或是网页摘录粘贴在下方，我会为你妥善保管。
              </p>
            </div>

            {/* 我们的 CaptureBar 组件 */}
            <CaptureBar />
          </div>
        )}
      </main>
    </div>
  );
}
