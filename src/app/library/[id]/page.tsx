import { promises as fs } from 'fs';
import path from 'path';
import { notFound } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import Link from 'next/link';

export default async function LibraryItemPage({
  params,
}: {
  params: Promise<{ id: string }> | { id: string };
}) {
  // Handle both Next.js 14 and 15 signatures safely
  const resolvedParams = await Promise.resolve(params);
  const id = resolvedParams.id;

  try {
    const filePath = path.join(process.cwd(), 'library', `${id}.md`);
    const fileContent = await fs.readFile(filePath, 'utf-8');

    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-black font-sans selection:bg-blue-200 dark:selection:bg-blue-900 flex flex-col items-center py-10 px-6">
        <div className="w-full max-w-3xl">
          <Link
            href="/"
            className="inline-flex items-center text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors mb-8 group"
          >
            <svg
              className="w-4 h-4 mr-2 transform group-hover:-translate-x-1 transition-transform"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            返回首页 (Back to Home)
          </Link>

          <article className="prose prose-zinc dark:prose-invert prose-blue max-w-none bg-white dark:bg-zinc-900 p-8 sm:p-12 rounded-3xl shadow-sm border border-zinc-200 dark:border-zinc-800">
            <ReactMarkdown>{fileContent}</ReactMarkdown>
          </article>
        </div>
      </div>
    );
  } catch (error) {
    // If the file doesn't exist, return a 404
    console.error('File read error:', error);
    notFound();
  }
}
