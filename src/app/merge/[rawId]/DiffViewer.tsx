'use client';

import { useMemo } from 'react';
import { diffLines } from 'diff';

interface DiffViewerProps {
  oldString: string;
  newString: string;
}

export default function DiffViewer({ oldString, newString }: DiffViewerProps) {
  const diffResult = useMemo(() => diffLines(oldString, newString), [oldString, newString]);

  return (
    <div className="font-mono text-sm border border-gray-200 rounded-md overflow-hidden max-h-[60vh] overflow-y-auto">
      {diffResult.map((part, index) => {
        const color = part.added ? 'bg-green-100 text-green-900' :
                      part.removed ? 'bg-red-100 text-red-900' : 'bg-white text-gray-800';
        
        // Remove trailing newline if it exists to prevent extra empty lines
        const lines = part.value.replace(/\n$/, '').split('\n');

        return lines.map((line, lineIndex) => {
          const sign = part.added ? '+' : part.removed ? '-' : ' ';
          return (
            <div key={`${index}-${lineIndex}`} className={`flex whitespace-pre-wrap ${color}`}>
              <div className={`select-none px-2 text-center w-8 shrink-0 ${
                part.added ? 'bg-green-200 text-green-700' : 
                part.removed ? 'bg-red-200 text-red-700' : 'bg-gray-100 text-gray-500'
              }`}>
                {sign}
              </div>
              <div className="px-4 py-0.5 break-all">{line}</div>
            </div>
          );
        });
      })}
    </div>
  );
}
