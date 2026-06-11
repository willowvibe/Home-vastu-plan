/**
 * Print the floor plan canvas.
 *
 * Tiny wrapper that bails out if the canvas ref isn't mounted. The
 * CSS for the print layout lives in `src/index.css` under
 * `@media print`; this module is just the trigger.
 */

export function printCanvas(printRef: HTMLElement | null): void {
  if (printRef) {
    window.print();
  }
}
