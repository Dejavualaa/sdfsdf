import * as pdfjsLib from 'pdfjs-dist';
import { jsPDF } from 'jspdf';
import { SimplifiedContent, SimplifiedTextPart } from '../types';

// Set worker src
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

export async function extractTextFromPdf(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  let fullText = '';

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items.map((item: any) => item.str).join(' ');
    fullText += pageText + '\n\n';
  }

  return fullText;
}

export function downloadAsPdf(content: SimplifiedContent) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  let y = 20;
  const margin = 20;
  const pageHeight = doc.internal.pageSize.height;
  const pageWidth = doc.internal.pageSize.width;
  const maxLineWidth = pageWidth - margin * 2;

  const checkPageBreak = (heightNeeded: number) => {
    if (y + heightNeeded > pageHeight - margin) {
      doc.addPage();
      y = margin;
    }
  };

  const applyStyle = (part: SimplifiedTextPart) => {
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);
    
    switch (part.type) {
      case 'h1': doc.setFont('helvetica', 'bold'); doc.setFontSize(18); doc.setTextColor(30, 64, 175); break; // blue-800
      case 'h2': doc.setFont('helvetica', 'bold'); doc.setFontSize(14); doc.setTextColor(29, 78, 216); break; // blue-700
      case 'h3': doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.setTextColor(30, 41, 59); break; // slate-800
      case 'red': doc.setTextColor(220, 38, 38); doc.setFont('helvetica', 'bold'); break;
      case 'blue': doc.setTextColor(37, 99, 235); doc.setFont('helvetica', 'bold'); break;
      case 'green': doc.setTextColor(22, 163, 74); doc.setFont('helvetica', 'bold'); break;
      case 'purple': doc.setTextColor(147, 51, 234); doc.setFont('helvetica', 'bold'); break;
      case 'orange': doc.setTextColor(234, 88, 12); doc.setFont('helvetica', 'bold'); break;
      case 'pink': doc.setTextColor(219, 39, 119); doc.setFont('helvetica', 'bold'); break;
      case 'indigo': doc.setTextColor(79, 70, 229); doc.setFont('helvetica', 'bold'); break;
      case 'gray': doc.setTextColor(107, 114, 128); break;
      case 'bold': doc.setFont('helvetica', 'bold'); break;
      case 'italic': doc.setFont('helvetica', 'italic'); break;
      default: doc.setFontSize(11); break;
    }
  };

  const renderText = (text: string, x: number, currentY: number, part: SimplifiedTextPart) => {
    // Basic highlight support (draw rect behind text)
    if (part.type.startsWith('hl-')) {
      const textWidth = doc.getTextWidth(text);
      const textHeight = doc.getTextDimensions(text).h;
      
      let fillColor = [255, 255, 0]; // default yellow
      if (part.type === 'hl-cya') fillColor = [165, 243, 252];
      if (part.type === 'hl-grn') fillColor = [187, 247, 208];
      if (part.type === 'hl-pink') fillColor = [251, 207, 232];
      if (part.type === 'hl-pur') fillColor = [233, 213, 255];
      
      doc.setFillColor(fillColor[0], fillColor[1], fillColor[2]);
      doc.rect(x, currentY - textHeight + 2, textWidth, textHeight + 1, 'F');
    }

    doc.text(text, x, currentY);
    
    if (part.type === 'underline') {
      const textWidth = doc.getTextWidth(text);
      doc.setLineWidth(0.5);
      doc.line(x, currentY + 1, x + textWidth, currentY + 1);
    }
  };

  for (const line of content.lines) {
    if (line.isTableRow) {
      // Simple table rendering
      checkPageBreak(10);
      let x = margin + (line.indent * 10);
      const cellWidth = maxLineWidth / (line.cells?.length || 1);
      
      doc.setDrawColor(200, 200, 200);
      doc.rect(x, y - 5, maxLineWidth, 10);
      
      line.cells?.forEach((cell, i) => {
        let cellX = x + (i * cellWidth) + 2;
        cell.forEach(part => {
          applyStyle(part);
          renderText(part.content, cellX, y, part);
          cellX += doc.getTextWidth(part.content) + 1;
        });
        if (i > 0) {
          doc.line(x + (i * cellWidth), y - 5, x + (i * cellWidth), y + 5);
        }
      });
      y += 10;
      continue;
    }

    let x = margin + (line.indent * 10);
    let lineHeight = 6;
    
    // Determine line height based on headers
    if (line.parts.some(p => p.type === 'h1')) { lineHeight = 12; y += 6; }
    else if (line.parts.some(p => p.type === 'h2')) { lineHeight = 10; y += 4; }
    else if (line.parts.some(p => p.type === 'h3')) { lineHeight = 8; y += 2; }

    checkPageBreak(lineHeight);

    for (const part of line.parts) {
      applyStyle(part);
      
      // Handle word wrap
      const words = part.content.split(' ');
      for (const word of words) {
        const wordWidth = doc.getTextWidth(word + ' ');
        if (x + wordWidth > pageWidth - margin) {
          y += lineHeight;
          x = margin + (line.indent * 10);
          checkPageBreak(lineHeight);
        }
        renderText(word + ' ', x, y, part);
        x += wordWidth;
      }
    }

    // Draw line under H1
    if (line.parts.some(p => p.type === 'h1')) {
      y += 2;
      doc.setDrawColor(191, 219, 254); // blue-200
      doc.setLineWidth(0.5);
      doc.line(margin, y, pageWidth - margin, y);
      y += 4;
    }

    y += lineHeight;
  }

  doc.save('QuickDoc_Notes.pdf');
}
