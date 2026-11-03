export interface GlyphPath {
  d: string;
  strokeWidth?: number;
}

export interface GlyphArt {
  
  vb: [number, number, number, number];
  
  transform?: string;
  
  strokeWidth?: number;
  paths: GlyphPath[];
}
