/** Huge docs should skip native Ctrl+A (browser freezes painting selection). */
const HUGE_EDITOR_CHARS = 50000;
function shouldLogicalSelectAll(len) {
  return (len || 0) >= HUGE_EDITOR_CHARS;
}
if (!shouldLogicalSelectAll(60000)) throw new Error("60k must use logical select");
if (shouldLogicalSelectAll(1000)) throw new Error("small docs keep native select");
console.log("check-huge-select: ok");
