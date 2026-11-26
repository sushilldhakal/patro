declare module "*.bin" {
  // Metro asset id, as returned by require() for a bundled asset (see lib/sky.ts).
  const content: number;
  export default content;
}
