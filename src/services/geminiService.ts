import { GoogleGenAI } from '@google/genai';
import { SimplifiedContent, SimplifiedLine, SimplifiedTextPart, StyleType, TransformationResult, PendingMedia } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const SYSTEM_PROMPT = `You are an Elite Medical Intelligence Engine & Scribe.
Your task is to synthesize, reorganize, and structure messy medical text, lectures, or OCR text into highly detailed, color-coded, and styled "High-Yield Notes".
You MUST NOT output markdown or LaTeX.
You MUST output plain text using ONLY the following specific bracket tags for formatting:

Headers:
[H1: Title]
[H2: Subtitle]
[H3: Minor]

Colors:
[RED: text]
[BLUE: text]
[GREEN: text]
[PURPLE: text]
[ORANGE: text]
[PINK: text]
[INDIGO: text]
[GRAY: text]

Highlights:
[HL-YEL: text]
[HL-CYA: text]
[HL-GRN: text]
[HL-PINK: text]
[HL-PUR: text]

Formatting:
[BOLD: text]
[ITALIC: text]
[UNDERLINE: text]

Tables:
[TR: Cell 1 | Cell 2 | Cell 3]

Indentation:
[TAB: 1]
[TAB: 2]
[TAB: 3]

Rules:
1. Do not use markdown like #, **, *, -, etc.
2. If you need to emphasize, use [BOLD: text] or colors.
3. For bullet points, use [TAB: 1] followed by a bullet character like • or - outside of tags.
4. Keep the notes highly structured, concise, and high-yield.
5. You can combine tags sequentially, but DO NOT nest tags. (e.g., [BOLD: [RED: text]] is INVALID. Use [BOLD: text] [RED: text] or just [RED: text] if color implies emphasis).
6. Every line that needs indentation should start with [TAB: X] where X is the level.
7. Table rows must use [TR: ...] with cells separated by |.
8. Organize Coherently: Structure the notes logically. Group related concepts together under appropriate headers.
9. Be Specific and Detailed: Do not omit important medical details. Ensure high specificity and depth of information.
10. Eliminate Repetition: Consolidate repeated points. If a topic (e.g., ectopic pregnancy, abortion, trophoblastic disease) is mentioned multiple times in the raw text, merge all details into a single, comprehensive section rather than repeating it.
`;

export async function processInput(text: string, media?: PendingMedia[]): Promise<TransformationResult> {
  let fullRawOutput = '';
  
  if (text.length > 20000) {
    // Chunking logic
    const chunks = chunkText(text, 20000);
    let previousContext = '';
    
    for (let i = 0; i < chunks.length; i++) {
      const prompt = `Process the following medical text (Part ${i + 1} of ${chunks.length}).\n\nPrevious context for continuity:\n${previousContext}\n\nText to process:\n${chunks[i]}`;
      
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: {
          systemInstruction: SYSTEM_PROMPT,
        }
      });
      
      const chunkOutput = response.text || '';
      fullRawOutput += chunkOutput + '\n';
      
      // Keep the last 2000 characters as context for the next chunk
      previousContext = chunkOutput.slice(-2000);
    }
  } else {
    const parts: any[] = [];
    if (text) {
      parts.push({ text });
    }
    if (media && media.length > 0) {
      for (const m of media) {
        parts.push({
          inlineData: {
            data: m.data.split(',')[1] || m.data, // remove data:image/jpeg;base64, if present
            mimeType: m.mimeType
          }
        });
      }
    }
    
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: { parts },
      config: {
        systemInstruction: SYSTEM_PROMPT,
      }
    });
    
    fullRawOutput = response.text || '';
  }

  const structured = parseShorthand(fullRawOutput);
  
  return {
    raw: fullRawOutput,
    structured
  };
}

function chunkText(text: string, chunkSize: number): string[] {
  const chunks: string[] = [];
  let i = 0;
  while (i < text.length) {
    chunks.push(text.slice(i, i + chunkSize));
    i += chunkSize;
  }
  return chunks;
}

export function parseShorthand(raw: string): SimplifiedContent {
  // Clean up math symbols
  let cleaned = raw.replace(/\\rightarrow/g, '→').replace(/\\leftarrow/g, '←');
  
  const lines = cleaned.split('\n');
  const parsedLines: SimplifiedLine[] = [];

  const tagRegex = /\[(H1|H2|H3|RED|BLUE|GREEN|PURPLE|ORANGE|PINK|INDIGO|GRAY|HL-YEL|HL-CYA|HL-GRN|HL-PINK|HL-PUR|BOLD|ITALIC|UNDERLINE|TR):\s*(.*?)\]/gi;
  const tabRegex = /^\[TAB:\s*(\d+)\]/i;

  for (const line of lines) {
    if (!line.trim()) continue;

    let indent = 0;
    let currentLine = line;

    // Check for indentation
    const tabMatch = currentLine.match(tabRegex);
    if (tabMatch) {
      indent = parseInt(tabMatch[1], 10);
      currentLine = currentLine.replace(tabRegex, '').trimStart();
    }

    // Check for Table Row
    if (currentLine.toUpperCase().startsWith('[TR:') && currentLine.endsWith(']')) {
      const content = currentLine.substring(4, currentLine.length - 1);
      const cellStrings = content.split('|').map(c => c.trim());
      const cells: SimplifiedTextPart[][] = cellStrings.map(cellStr => parseLineParts(cellStr, tagRegex));
      
      parsedLines.push({
        indent,
        parts: [],
        isTableRow: true,
        cells
      });
      continue;
    }

    // Normal line
    const parts = parseLineParts(currentLine, tagRegex);
    parsedLines.push({
      indent,
      parts
    });
  }

  return { lines: parsedLines };
}

function parseLineParts(text: string, regex: RegExp): SimplifiedTextPart[] {
  const parts: SimplifiedTextPart[] = [];
  let lastIndex = 0;
  let match;

  // Reset regex index
  regex.lastIndex = 0;

  while ((match = regex.exec(text)) !== null) {
    // Add text before the match
    if (match.index > lastIndex) {
      parts.push({
        type: 'text',
        content: text.substring(lastIndex, match.index)
      });
    }

    const tagType = match[1].toLowerCase() as StyleType;
    const content = match[2];

    parts.push({
      type: tagType,
      content
    });

    lastIndex = regex.lastIndex;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    parts.push({
      type: 'text',
      content: text.substring(lastIndex)
    });
  }

  return parts;
}
