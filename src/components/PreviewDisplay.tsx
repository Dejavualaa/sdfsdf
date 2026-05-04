import React from 'react';
import { SimplifiedContent, SimplifiedLine, SimplifiedTextPart } from '../types';

interface PreviewDisplayProps {
  content: SimplifiedContent;
}

export function PreviewDisplay({ content }: PreviewDisplayProps) {
  const renderPart = (part: SimplifiedTextPart, index: number) => {
    let className = '';
    
    switch (part.type) {
      case 'h1': className = 'text-3xl font-bold text-blue-800 block mt-6 mb-4 border-b-2 border-blue-200 pb-2'; break;
      case 'h2': className = 'text-2xl font-semibold text-blue-700 block mt-4 mb-2'; break;
      case 'h3': className = 'text-xl font-medium text-slate-800 block mt-3 mb-1'; break;
      case 'red': className = 'text-red-600 font-semibold'; break;
      case 'blue': className = 'text-blue-600 font-semibold'; break;
      case 'green': className = 'text-green-600 font-semibold'; break;
      case 'purple': className = 'text-purple-600 font-semibold'; break;
      case 'orange': className = 'text-orange-600 font-semibold'; break;
      case 'pink': className = 'text-pink-600 font-semibold'; break;
      case 'indigo': className = 'text-indigo-600 font-semibold'; break;
      case 'gray': className = 'text-gray-600'; break;
      case 'hl-yel': className = 'bg-yellow-200 px-1 rounded-sm'; break;
      case 'hl-cya': className = 'bg-cyan-200 px-1 rounded-sm'; break;
      case 'hl-grn': className = 'bg-green-200 px-1 rounded-sm'; break;
      case 'hl-pink': className = 'bg-pink-200 px-1 rounded-sm'; break;
      case 'hl-pur': className = 'bg-purple-200 px-1 rounded-sm'; break;
      case 'bold': className = 'font-bold'; break;
      case 'italic': className = 'italic'; break;
      case 'underline': className = 'underline'; break;
      case 'text':
      case 'symbol':
      default: className = ''; break;
    }

    if (['h1', 'h2', 'h3'].includes(part.type)) {
      return <span key={index} className={className}>{part.content}</span>;
    }

    return <span key={index} className={className}>{part.content}</span>;
  };

  const renderLine = (line: SimplifiedLine, index: number) => {
    // For dynamic margin left if Tailwind classes aren't generated
    const style = { marginLeft: `${line.indent * 1.5}rem` };

    return (
      <div key={index} style={style} className="mb-1 leading-relaxed">
        {line.parts.map((part, i) => renderPart(part, i))}
      </div>
    );
  };

  // Group table rows
  const elements: React.ReactNode[] = [];
  let currentTable: SimplifiedLine[] = [];

  const flushTable = () => {
    if (currentTable.length > 0) {
      elements.push(
        <div key={`table-${elements.length}`} className="my-4 overflow-x-auto">
          <table className="min-w-full border-collapse border border-slate-300 shadow-sm rounded-lg overflow-hidden">
            <tbody className="bg-white">
              {currentTable.map((row, rowIndex) => (
                <tr key={rowIndex} className={rowIndex % 2 === 0 ? 'bg-slate-50' : 'bg-white'}>
                  {row.cells?.map((cellParts, cellIndex) => (
                    <td key={cellIndex} className="border border-slate-200 px-4 py-2 text-sm">
                      {cellParts.map((part, i) => renderPart(part, i))}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      currentTable = [];
    }
  };

  content.lines.forEach((line, index) => {
    if (line.isTableRow) {
      currentTable.push(line);
    } else {
      flushTable();
      elements.push(renderLine(line, index));
    }
  });
  flushTable();

  return (
    <div className="bg-white p-8 rounded-xl shadow-lg max-w-4xl mx-auto text-slate-800 font-sans">
      {elements}
    </div>
  );
}
