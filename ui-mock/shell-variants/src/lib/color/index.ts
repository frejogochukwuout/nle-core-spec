/* index.ts — barrel for the R20-W4a color math library (DESIGN-R20 D3:
   "REAL math in src/lib/color/ with the contract §6 module names").
   Public surface consumed by W4b (console/components) and W4c (viewer/scopes):
   colorSpace (LUTs/luma/HSV/zone masks), gradeMath (GradeParams + the spec-08
   §4.2 14-step applyGrade + wheel readouts), qualifierMath (HSL keyer),
   gradedImage (ImageData pipeline + cache key + rAF coalescer), scopesMath
   (waveform/parade/vectorscope/histogram reductions). */

export * from './colorSpace';
export * from './gradeMath';
export * from './qualifierMath';
export * from './gradedImage';
export * from './scopesMath';
