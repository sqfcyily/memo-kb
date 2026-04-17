import Link from 'next/link';
import { listInboxNotes, readInboxNote } from '../../../lib/data';

export default async function InboxPage() {
  const fileNames = await listInboxNotes();
  
  const notes = await Promise.all(
    fileNames.map(async (fileName) => {
      const noteData = await readInboxNote(fileName);
      return {
        fileName,
        status: noteData?.data?.status || 'unprocessed',
        mergedTo: noteData?.data?.merged_to || null,
      };
    })
  );

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6 text-gray-800">📥 Inbox</h1>
      
      {notes.length === 0 ? (
        <div className="bg-gray-50 rounded-lg p-8 text-center text-gray-500">
          收件箱空空如也，太棒啦！✨
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden border border-gray-100">
          <ul className="divide-y divide-gray-100">
            {notes.map((note) => (
              <li key={note.fileName} className="p-4 hover:bg-gray-50 transition-colors flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="font-medium text-gray-700">{note.fileName}</span>
                  <div className="text-sm text-gray-400 mt-1 flex gap-2">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      note.status === 'processed' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      {note.status === 'processed' ? '已处理' : '待处理'}
                    </span>
                    {note.mergedTo && (
                      <span className="text-gray-400 text-xs flex items-center">
                        🔗 合并至: {note.mergedTo}
                      </span>
                    )}
                  </div>
                </div>
                
                <div className="flex gap-3">
                  {note.status !== 'processed' && (
                    <Link 
                      href={`/merge/${note.fileName.replace(/\.mdx?$/, '')}`}
                      className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md shadow-sm transition-colors"
                    >
                      处理合并
                    </Link>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
