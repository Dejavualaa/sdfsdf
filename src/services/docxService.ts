import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, BorderStyle, WidthType } from 'docx';
import { saveAs } from 'file-saver';
import { SimplifiedContent, SimplifiedTextPart } from '../types';

export async function downloadAsDocx(content: SimplifiedContent) {
  const children: any[] = [];
  let currentTableRows: TableRow[] = [];

  const flushTable = () => {
    if (currentTableRows.length > 0) {
      children.push(
        new Table({
          rows: currentTableRows,
          width: { size: 100, type: WidthType.PERCENTAGE },
          borders: {
            top: { style: BorderStyle.SINGLE, size: 1, color: "cccccc" },
            bottom: { style: BorderStyle.SINGLE, size: 1, color: "cccccc" },
            left: { style: BorderStyle.SINGLE, size: 1, color: "cccccc" },
            right: { style: BorderStyle.SINGLE, size: 1, color: "cccccc" },
            insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: "cccccc" },
            insideVertical: { style: BorderStyle.SINGLE, size: 1, color: "cccccc" },
          }
        })
      );
      currentTableRows = [];
    }
  };

  const createTextRun = (part: SimplifiedTextPart) => {
    const options: any = { text: part.content };

    switch (part.type) {
      case 'h1': options.bold = true; options.size = 36; options.color = "1E40AF"; break; // 18pt
      case 'h2': options.bold = true; options.size = 28; options.color = "1D4ED8"; break; // 14pt
      case 'h3': options.bold = true; options.size = 24; options.color = "1E293B"; break; // 12pt
      case 'red': options.bold = true; options.color = "DC2626"; break;
      case 'blue': options.bold = true; options.color = "2563EB"; break;
      case 'green': options.bold = true; options.color = "16A34A"; break;
      case 'purple': options.bold = true; options.color = "9333EA"; break;
      case 'orange': options.bold = true; options.color = "EA580C"; break;
      case 'pink': options.bold = true; options.color = "DB2777"; break;
      case 'indigo': options.bold = true; options.color = "4F46E5"; break;
      case 'gray': options.color = "6B7280"; break;
      case 'hl-yel': options.highlight = "yellow"; break;
      case 'hl-cya': options.highlight = "cyan"; break;
      case 'hl-grn': options.highlight = "green"; break;
      case 'hl-pink': options.highlight = "magenta"; break;
      case 'hl-pur': options.highlight = "blue"; break; // docx highlight colors are limited
      case 'bold': options.bold = true; break;
      case 'italic': options.italics = true; break;
      case 'underline': options.underline = {}; break;
      default: options.size = 22; break; // 11pt
    }

    return new TextRun(options);
  };

  for (const line of content.lines) {
    if (line.isTableRow) {
      const cells = line.cells?.map(cellParts => {
        return new TableCell({
          children: [new Paragraph({ children: cellParts.map(createTextRun) })],
          margins: { top: 100, bottom: 100, left: 100, right: 100 }
        });
      }) || [];
      
      currentTableRows.push(new TableRow({ children: cells }));
    } else {
      flushTable();
      
      const isH1 = line.parts.some(p => p.type === 'h1');
      const isH2 = line.parts.some(p => p.type === 'h2');
      
      const paragraphOptions: any = {
        children: line.parts.map(createTextRun),
        indent: { left: line.indent * 720 }, // 0.5 inch per indent
      };

      if (isH1) {
        paragraphOptions.spacing = { before: 400, after: 200 };
        paragraphOptions.border = { bottom: { color: "BFDBFE", space: 1, value: "single", size: 6 } };
      } else if (isH2) {
        paragraphOptions.spacing = { before: 300, after: 100 };
      } else {
        paragraphOptions.spacing = { after: 100 };
      }

      children.push(new Paragraph(paragraphOptions));
    }
  }
  flushTable();

  const doc = new Document({
    sections: [{
      properties: {},
      children: children
    }]
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, "QuickDoc_Notes.docx");
}
