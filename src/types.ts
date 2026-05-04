export type StyleType = 
  | 'text' 
  | 'symbol' 
  | 'h1' 
  | 'h2' 
  | 'h3' 
  | 'red' 
  | 'blue' 
  | 'green' 
  | 'purple' 
  | 'orange' 
  | 'pink' 
  | 'indigo' 
  | 'gray' 
  | 'hl-yel' 
  | 'hl-cya' 
  | 'hl-grn' 
  | 'hl-pink' 
  | 'hl-pur' 
  | 'bold' 
  | 'italic' 
  | 'underline'
  | 'tr';

export interface SimplifiedTextPart {
  type: StyleType;
  content: string;
}

export interface SimplifiedLine {
  indent: number;
  parts: SimplifiedTextPart[];
  isTableRow?: boolean;
  cells?: SimplifiedTextPart[][];
}

export interface SimplifiedContent {
  lines: SimplifiedLine[];
}

export interface TransformationResult {
  raw: string;
  structured: SimplifiedContent;
}

export interface PendingMedia {
  data: string; // Base64 string
  mimeType: string;
}
