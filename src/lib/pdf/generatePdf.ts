import { parseMarkdownDocument } from "../markdown/parse";
import { parseLatexToAst } from "../latex/parse";
import { yieldToMain } from "../perf";

function canvasToJpegBytes(canvas, quality = 0.88) {
  const dataUrl = canvas.toDataURL("image/jpeg", quality);
  const base64 = dataUrl.split(",")[1];
  const bin = atob(base64);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return arr;
}

function measureMathAstOnCanvas(ctx, ast, fontSize) {
  if (!ast || ast.length === 0)
    return { width: 0, ascent: fontSize * 0.7, descent: fontSize * 0.3 };
  let totalW = 0;
  let maxAscent = fontSize * 0.75;
  let maxDescent = fontSize * 0.25;

  ast.forEach((node) => {
    const m = measureMathNodeOnCanvas(ctx, node, fontSize);
    totalW += m.width;
    if (m.ascent > maxAscent) maxAscent = m.ascent;
    if (m.descent > maxDescent) maxDescent = m.descent;
  });

  return { width: totalW, ascent: maxAscent, descent: maxDescent };
}

function measureMathNodeOnCanvas(ctx, node, fontSize) {
  const setMathFont = (
    style = "italic",
    size = fontSize,
    family = 'Georgia, "Times New Roman", serif',
  ) => {
    ctx.font = `${style} ${Math.round(size)}px ${family}`;
  };

  switch (node.type) {
    case "space":
      return {
        width: fontSize * 0.35,
        ascent: fontSize * 0.7,
        descent: fontSize * 0.2,
      };
    case "group":
      return measureMathAstOnCanvas(ctx, node.children, fontSize);
    case "var":
      setMathFont("italic", fontSize);
      return {
        width: ctx.measureText(node.value).width + 1,
        ascent: fontSize * 0.75,
        descent: fontSize * 0.25,
      };
    case "op":
    case "symbol":
      setMathFont("normal", fontSize);
      return {
        width: ctx.measureText(node.value).width + fontSize * 0.22,
        ascent: fontSize * 0.75,
        descent: fontSize * 0.25,
      };
    case "delim":
      setMathFont("normal", fontSize * 1.15);
      return {
        width: ctx.measureText(node.value).width + 2,
        ascent: fontSize * 0.85,
        descent: fontSize * 0.3,
      };
    case "func":
      setMathFont("normal", fontSize);
      return {
        width: ctx.measureText(node.name).width + 4,
        ascent: fontSize * 0.75,
        descent: fontSize * 0.25,
      };
    case "styledText":
      setMathFont(
        node.style === "textbf" || node.style === "mathbf" ? "bold" : "normal",
        fontSize * 0.92,
        "Georgia, serif",
      );
      return {
        width: ctx.measureText(node.value).width + 4,
        ascent: fontSize * 0.75,
        descent: fontSize * 0.25,
      };
    case "accent": {
      const bm = measureMathAstOnCanvas(ctx, node.body, fontSize);
      return {
        width: bm.width + 2,
        ascent: bm.ascent + fontSize * 0.25,
        descent: bm.descent,
      };
    }
    case "msubsup": {
      const bm = measureMathNodeOnCanvas(ctx, node.base, fontSize);
      const subM = node.sub
        ? measureMathAstOnCanvas(ctx, node.sub, fontSize * 0.68)
        : { width: 0, ascent: 0, descent: 0 };
      const supM = node.sup
        ? measureMathAstOnCanvas(ctx, node.sup, fontSize * 0.68)
        : { width: 0, ascent: 0, descent: 0 };
      return {
        width: bm.width + Math.max(subM.width, supM.width) + 2,
        ascent: Math.max(bm.ascent, fontSize * 0.55 + supM.ascent),
        descent: Math.max(bm.descent, fontSize * 0.35 + subM.descent),
      };
    }
    case "bigop": {
      setMathFont("normal", node.isWord ? fontSize * 0.95 : fontSize * 1.45);
      const opW = ctx.measureText(node.op).width;
      const subM = node.sub
        ? measureMathAstOnCanvas(ctx, node.sub, fontSize * 0.65)
        : { width: 0, ascent: 0, descent: 0 };
      const supM = node.sup
        ? measureMathAstOnCanvas(ctx, node.sup, fontSize * 0.65)
        : { width: 0, ascent: 0, descent: 0 };
      return {
        width: Math.max(opW, subM.width, supM.width) + fontSize * 0.45,
        ascent:
          fontSize * 0.95 + (node.sup ? supM.ascent + supM.descent + 4 : 0),
        descent:
          fontSize * 0.45 + (node.sub ? subM.ascent + subM.descent + 4 : 0),
      };
    }
    case "frac": {
      const numM = measureMathAstOnCanvas(ctx, node.num, fontSize * 0.86);
      const denM = measureMathAstOnCanvas(ctx, node.den, fontSize * 0.86);
      return {
        width: Math.max(numM.width, denM.width) + fontSize * 0.55,
        ascent: numM.ascent + numM.descent + fontSize * 0.38,
        descent: denM.ascent + denM.descent + fontSize * 0.38,
      };
    }
    case "binom": {
      const topM = measureMathAstOnCanvas(ctx, node.top, fontSize * 0.85);
      const botM = measureMathAstOnCanvas(ctx, node.bot, fontSize * 0.85);
      return {
        width: Math.max(topM.width, botM.width) + fontSize * 0.9,
        ascent: topM.ascent + topM.descent + fontSize * 0.35,
        descent: botM.ascent + botM.descent + fontSize * 0.35,
      };
    }
    case "sqrt": {
      const bodyM = measureMathAstOnCanvas(ctx, node.body, fontSize);
      const degM = node.degree
        ? measureMathAstOnCanvas(ctx, node.degree, fontSize * 0.6)
        : { width: 0 };
      return {
        width: degM.width + fontSize * 0.65 + bodyM.width + 6,
        ascent: bodyM.ascent + 6,
        descent: bodyM.descent,
      };
    }
    case "matrix": {
      const rowHeights = [];
      const colWidths = [];
      node.rows.forEach((row) => {
        let rH = fontSize * 1.1;
        row.forEach((cell, cIdx) => {
          const cm = measureMathAstOnCanvas(ctx, cell, fontSize * 0.88);
          colWidths[cIdx] = Math.max(colWidths[cIdx] || 0, cm.width);
          rH = Math.max(rH, cm.ascent + cm.descent + 6);
        });
        rowHeights.push(rH);
      });
      const totalH = rowHeights.reduce((a, b) => a + b, 0);
      const totalW = colWidths.reduce((a, b) => a + b + 14, 0) + fontSize * 1.0;
      return {
        width: totalW,
        ascent: totalH * 0.55 + fontSize * 0.25,
        descent: totalH * 0.45,
      };
    }
    default:
      setMathFont("normal", fontSize);
      return {
        width: ctx.measureText(node.value || "").width,
        ascent: fontSize * 0.75,
        descent: fontSize * 0.25,
      };
  }
}

function drawMathAstOnCanvas(
  ctx,
  ast,
  startX,
  baselineY,
  fontSize,
  color = "#1d1d1b",
) {
  let x = startX;
  ast.forEach((node) => {
    x = drawMathNodeOnCanvas(ctx, node, x, baselineY, fontSize, color);
  });
  return x;
}

function drawMathNodeOnCanvas(ctx, node, x, baselineY, fontSize, color) {
  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  const axisY = baselineY - fontSize * 0.32;

  const setMathFont = (
    style = "italic",
    size = fontSize,
    family = 'Georgia, "Times New Roman", serif',
  ) => {
    ctx.font = `${style} ${Math.round(size)}px ${family}`;
  };

  switch (node.type) {
    case "space":
      return x + fontSize * 0.35;
    case "group":
      return drawMathAstOnCanvas(
        ctx,
        node.children,
        x,
        baselineY,
        fontSize,
        color,
      );
    case "var": {
      setMathFont("italic", fontSize);
      ctx.fillText(node.value, x, baselineY);
      return x + ctx.measureText(node.value).width + 1;
    }
    case "op":
    case "symbol": {
      setMathFont("normal", fontSize);
      const pad = fontSize * 0.11;
      ctx.fillText(node.value, x + pad, baselineY);
      return x + ctx.measureText(node.value).width + pad * 2;
    }
    case "delim": {
      setMathFont("normal", fontSize * 1.15);
      ctx.fillText(node.value, x, baselineY);
      return x + ctx.measureText(node.value).width + 2;
    }
    case "func": {
      setMathFont("normal", fontSize);
      ctx.fillText(node.name, x + 1, baselineY);
      return x + ctx.measureText(node.name).width + 4;
    }
    case "styledText": {
      setMathFont(
        node.style === "textbf" || node.style === "mathbf" ? "bold" : "normal",
        fontSize * 0.92,
        "Georgia, serif",
      );
      ctx.fillText(node.value, x + 2, baselineY);
      return x + ctx.measureText(node.value).width + 4;
    }
    case "accent": {
      const bm = measureMathAstOnCanvas(ctx, node.body, fontSize);
      drawMathAstOnCanvas(ctx, node.body, x, baselineY, fontSize, color);
      const topY = baselineY - bm.ascent;
      ctx.lineWidth = Math.max(1.2, fontSize * 0.06);
      if (node.accent === "overline" || node.accent === "bar") {
        ctx.beginPath();
        ctx.moveTo(x, topY - 2);
        ctx.lineTo(x + bm.width, topY - 2);
        ctx.stroke();
      } else if (node.accent === "hat") {
        ctx.beginPath();
        ctx.moveTo(x + 1, topY + 1);
        ctx.lineTo(x + bm.width / 2, topY - 4);
        ctx.lineTo(x + bm.width - 1, topY + 1);
        ctx.stroke();
      } else if (node.accent === "vec") {
        ctx.beginPath();
        ctx.moveTo(x, topY - 2);
        ctx.lineTo(x + bm.width, topY - 2);
        ctx.lineTo(x + bm.width - 3, topY - 5);
        ctx.stroke();
      }
      return x + bm.width + 2;
    }
    case "msubsup": {
      const nextX = drawMathNodeOnCanvas(
        ctx,
        node.base,
        x,
        baselineY,
        fontSize,
        color,
      );
      let maxEnd = nextX;
      if (node.sup) {
        const endSup = drawMathAstOnCanvas(
          ctx,
          node.sup,
          nextX,
          baselineY - fontSize * 0.42,
          fontSize * 0.68,
          color,
        );
        if (endSup > maxEnd) maxEnd = endSup;
      }
      if (node.sub) {
        const endSub = drawMathAstOnCanvas(
          ctx,
          node.sub,
          nextX,
          baselineY + fontSize * 0.25,
          fontSize * 0.68,
          color,
        );
        if (endSub > maxEnd) maxEnd = endSub;
      }
      return maxEnd + 2;
    }
    case "bigop": {
      const m = measureMathNodeOnCanvas(ctx, node, fontSize);
      const centerX = x + m.width / 2;
      setMathFont("normal", node.isWord ? fontSize * 0.95 : fontSize * 1.45);
      const opW = ctx.measureText(node.op).width;
      ctx.fillText(
        node.op,
        centerX - opW / 2,
        baselineY + (node.isWord ? 0 : fontSize * 0.12),
      );

      if (node.sup) {
        const supM = measureMathAstOnCanvas(ctx, node.sup, fontSize * 0.65);
        drawMathAstOnCanvas(
          ctx,
          node.sup,
          centerX - supM.width / 2,
          baselineY - fontSize * 0.88,
          fontSize * 0.65,
          color,
        );
      }
      if (node.sub) {
        const subM = measureMathAstOnCanvas(ctx, node.sub, fontSize * 0.65);
        drawMathAstOnCanvas(
          ctx,
          node.sub,
          centerX - subM.width / 2,
          baselineY + fontSize * 0.62,
          fontSize * 0.65,
          color,
        );
      }
      return x + m.width;
    }
    case "frac": {
      const subSize = fontSize * 0.86;
      const numM = measureMathAstOnCanvas(ctx, node.num, subSize);
      const denM = measureMathAstOnCanvas(ctx, node.den, subSize);
      const boxW = Math.max(numM.width, denM.width) + fontSize * 0.35;
      const centerX = x + fontSize * 0.1 + boxW / 2;

      drawMathAstOnCanvas(
        ctx,
        node.num,
        centerX - numM.width / 2,
        axisY - fontSize * 0.22 - numM.descent,
        subSize,
        color,
      );

      ctx.lineWidth = Math.max(1.4, fontSize * 0.065);
      ctx.beginPath();
      ctx.moveTo(x + fontSize * 0.1, axisY);
      ctx.lineTo(x + fontSize * 0.1 + boxW, axisY);
      ctx.stroke();

      drawMathAstOnCanvas(
        ctx,
        node.den,
        centerX - denM.width / 2,
        axisY + fontSize * 0.22 + denM.ascent,
        subSize,
        color,
      );

      return x + boxW + fontSize * 0.2;
    }
    case "binom": {
      const subSize = fontSize * 0.85;
      const topM = measureMathAstOnCanvas(ctx, node.top, subSize);
      const botM = measureMathAstOnCanvas(ctx, node.bot, subSize);
      const innerW = Math.max(topM.width, botM.width) + 8;
      setMathFont("normal", fontSize * 1.45);
      ctx.fillText("(", x, baselineY + fontSize * 0.1);
      const leftParenW = ctx.measureText("(").width;
      const centerX = x + leftParenW + innerW / 2;
      drawMathAstOnCanvas(
        ctx,
        node.top,
        centerX - topM.width / 2,
        axisY - 4,
        subSize,
        color,
      );
      drawMathAstOnCanvas(
        ctx,
        node.bot,
        centerX - botM.width / 2,
        axisY + botM.ascent + 4,
        subSize,
        color,
      );
      setMathFont("normal", fontSize * 1.45);
      ctx.fillText(")", x + leftParenW + innerW, baselineY + fontSize * 0.1);
      return x + leftParenW * 2 + innerW + 4;
    }
    case "sqrt": {
      let curX = x + 2;
      if (node.degree) {
        curX = drawMathAstOnCanvas(
          ctx,
          node.degree,
          curX,
          baselineY - fontSize * 0.45,
          fontSize * 0.6,
          color,
        );
      }
      const bodyM = measureMathAstOnCanvas(ctx, node.body, fontSize);
      const radW = fontSize * 0.55;
      const topY = baselineY - bodyM.ascent - 3;
      const botY = baselineY + bodyM.descent;

      ctx.lineWidth = Math.max(1.4, fontSize * 0.065);
      ctx.beginPath();
      ctx.moveTo(curX, baselineY - fontSize * 0.25);
      ctx.lineTo(curX + radW * 0.35, botY);
      ctx.lineTo(curX + radW, topY);
      ctx.lineTo(curX + radW + bodyM.width + 4, topY);
      ctx.stroke();

      drawMathAstOnCanvas(
        ctx,
        node.body,
        curX + radW + 2,
        baselineY,
        fontSize,
        color,
      );
      return curX + radW + bodyM.width + 6;
    }
    case "matrix": {
      const subSize = fontSize * 0.88;
      const colWidths = [];
      const rowHeights = [];
      node.rows.forEach((row) => {
        let rH = subSize * 1.25;
        row.forEach((cell, cIdx) => {
          const cm = measureMathAstOnCanvas(ctx, cell, subSize);
          colWidths[cIdx] = Math.max(colWidths[cIdx] || 0, cm.width);
          rH = Math.max(rH, cm.ascent + cm.descent + 8);
        });
        rowHeights.push(rH);
      });
      const totalH = rowHeights.reduce((a, b) => a + b, 0);
      const topY = axisY - totalH / 2;
      const botY = axisY + totalH / 2;
      let curX = x + 4;

      ctx.lineWidth = Math.max(1.5, fontSize * 0.065);
      if (node.env === "pmatrix") {
        ctx.beginPath();
        ctx.moveTo(curX + 5, topY);
        ctx.quadraticCurveTo(curX - 2, axisY, curX + 5, botY);
        ctx.stroke();
        curX += 8;
      } else if (node.env === "bmatrix") {
        ctx.beginPath();
        ctx.moveTo(curX + 5, topY);
        ctx.lineTo(curX, topY);
        ctx.lineTo(curX, botY);
        ctx.lineTo(curX + 5, botY);
        ctx.stroke();
        curX += 8;
      } else if (node.env === "cases" || node.env === "Bmatrix") {
        ctx.beginPath();
        ctx.moveTo(curX + 6, topY);
        ctx.lineTo(curX + 2, topY + 4);
        ctx.lineTo(curX + 2, axisY - 3);
        ctx.lineTo(curX - 2, axisY);
        ctx.lineTo(curX + 2, axisY + 3);
        ctx.lineTo(curX + 2, botY - 4);
        ctx.lineTo(curX + 6, botY);
        ctx.stroke();
        curX += 10;
      }

      let rowY = topY;
      node.rows.forEach((row, rIdx) => {
        let colX = curX;
        const rH = rowHeights[rIdx];
        row.forEach((cell, cIdx) => {
          drawMathAstOnCanvas(ctx, cell, colX, rowY + rH * 0.7, subSize, color);
          colX += (colWidths[cIdx] || 20) + 14;
        });
        rowY += rH;
      });

      const matrixContentW = colWidths.reduce((a, b) => a + b + 14, 0) - 6;
      curX += Math.max(0, matrixContentW);

      if (node.env === "pmatrix") {
        ctx.beginPath();
        ctx.moveTo(curX, topY);
        ctx.quadraticCurveTo(curX + 7, axisY, curX, botY);
        ctx.stroke();
        curX += 8;
      } else if (node.env === "bmatrix") {
        ctx.beginPath();
        ctx.moveTo(curX, topY);
        ctx.lineTo(curX + 5, topY);
        ctx.lineTo(curX + 5, botY);
        ctx.lineTo(curX, botY);
        ctx.stroke();
        curX += 8;
      }

      return curX + 4;
    }
    default: {
      setMathFont("normal", fontSize);
      const txt = node.value || "";
      ctx.fillText(txt, x, baselineY);
      return x + ctx.measureText(txt).width;
    }
  }
}

async function generateHighResPdfWithLatex(
  title,
  markdown,
  options: {
    onProgress?: (progress: number, label?: string) => void;
    signal?: AbortSignal;
    /** Page margin in PDF points (1/72"). Clamped 24–96. */
    marginPt?: number;
  } = {},
) {
  const { onProgress, signal } = options;
  onProgress?.(0.02, "Parsing markdown…");
  await yieldToMain();
  if (signal?.aborted) throw new DOMException("Aborted", "AbortError");

  const { blocks, footnotes } = parseMarkdownDocument(markdown);
  onProgress?.(0.08, `Rendering ${blocks.length.toLocaleString()} blocks…`);
  await yieldToMain();

  const SCALE = 2;
  const PT_W = 612;
  const PT_H = 792;
  const rawMargin = Number(options.marginPt);
  const MARGIN = Math.min(
    96,
    Math.max(24, Number.isFinite(rawMargin) ? rawMargin : 48),
  );
  const CONTENT_W = PT_W - MARGIN * 2;

  // Encode each finished page to JPEG immediately so page count can grow with the MD file
  // without retaining every canvas bitmap in memory.
  const pageImages = [];
  let canvas = null;
  let ctx = null;
  let curY = MARGIN;
  let pageIndex = 0;

  const flushCurrentPage = () => {
    if (!canvas) return;
    const jpegBytes = canvasToJpegBytes(canvas, 0.88);
    pageImages.push({
      width: canvas.width,
      height: canvas.height,
      bytes: jpegBytes,
    });
    canvas.width = 0;
    canvas.height = 0;
    canvas = null;
    ctx = null;
  };

  const startNewPage = () => {
    flushCurrentPage();
    pageIndex += 1;
    canvas = document.createElement("canvas");
    canvas.width = PT_W * SCALE;
    canvas.height = PT_H * SCALE;
    ctx = canvas.getContext("2d");
    ctx.scale(SCALE, SCALE);
    ctx.fillStyle = "#e2dedb";
    ctx.fillRect(0, 0, PT_W, PT_H);
    curY = MARGIN;
    onProgress?.(
      Math.min(0.8, 0.08 + pageIndex * 0.002),
      `Rendering page ${pageIndex}…`,
    );
  };

  startNewPage();

  const ensureSpace = (neededH) => {
    if (curY + neededH > PT_H - MARGIN) {
      startNewPage();
    }
  };

  const tokenizeInlineRuns = (rawStr) => {
    const cleaned = (rawStr || "")
      .replace(/!\[([^\]]*)\]\([^)]+\)/g, "[$1]")
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1 ($2)")
      .replace(/\[([^\]]+)\]\[([^\]]+)\]/g, "$1")
      .replace(/\[\^([^\]]+)\]/g, "[$1]");

    const runs = [];
    let rem = cleaned;
    const inlineRegex =
      /(\\\((.+?)\\\)|\$([^$\n]+)\$|\*\*\*([^*]+)\*\*\*|\*\*([^*]+)\*\*|~~([^~]+)~~|`([^`]+)`|\*([^*]+)\*)/;

    while (rem.length > 0) {
      const m = rem.match(inlineRegex);
      if (!m) {
        runs.push({ type: "text", style: "normal", text: rem });
        break;
      }
      if (m.index > 0) {
        runs.push({
          type: "text",
          style: "normal",
          text: rem.slice(0, m.index),
        });
      }
      if (m[2] !== undefined || m[3] !== undefined) {
        runs.push({ type: "math", ast: parseLatexToAst(m[2] || m[3]) });
      } else if (m[4] !== undefined) {
        runs.push({ type: "text", style: "bold-italic", text: m[4] });
      } else if (m[5] !== undefined) {
        runs.push({ type: "text", style: "bold", text: m[5] });
      } else if (m[6] !== undefined) {
        runs.push({ type: "text", style: "strike", text: m[6] });
      } else if (m[7] !== undefined) {
        runs.push({ type: "text", style: "code", text: m[7] });
      } else if (m[8] !== undefined) {
        runs.push({ type: "text", style: "italic", text: m[8] });
      }
      rem = rem.slice(m.index + m[0].length);
    }
    return runs;
  };

  const drawRichParagraph = (
    text,
    fontSize = 11,
    indentX = 0,
    baseColor = "#1d1d1b",
    forceBold = false,
  ) => {
    const runs = tokenizeInlineRuns(text);
    const atoms = [];
    runs.forEach((r) => {
      if (r.type === "math") {
        const m = measureMathAstOnCanvas(ctx, r.ast, fontSize * 1.05);
        atoms.push({
          type: "math",
          ast: r.ast,
          width: m.width + 4,
          ascent: m.ascent,
          descent: m.descent,
        });
      } else {
        const words = r.text.split(/(\s+)/);
        words.forEach((w) => {
          if (!w) return;
          const fontStyle =
            forceBold || r.style === "bold"
              ? `bold ${fontSize}px Georgia, serif`
              : r.style === "bold-italic"
                ? `bold italic ${fontSize}px Georgia, serif`
                : r.style === "italic"
                  ? `italic ${fontSize}px Georgia, serif`
                  : r.style === "code"
                    ? `${Math.round(fontSize * 0.92)}px monospace`
                    : `${fontSize}px Georgia, serif`;
          ctx.font = fontStyle;
          atoms.push({
            type: "word",
            text: w,
            style: r.style,
            font: fontStyle,
            width: ctx.measureText(w).width + (r.style === "code" ? 6 : 0),
            ascent: fontSize * 0.8,
            descent: fontSize * 0.25,
          });
        });
      }
    });

    const maxW = CONTENT_W - indentX;
    const linesOfAtoms = [];
    let currentLine = [];
    let currentW = 0;

    atoms.forEach((a) => {
      if (currentW + a.width > maxW && currentLine.length > 0) {
        linesOfAtoms.push(currentLine);
        currentLine = [];
        currentW = 0;
        if (a.type === "word" && /^\s+$/.test(a.text)) return;
      }
      currentLine.push(a);
      currentW += a.width;
    });
    if (currentLine.length > 0) linesOfAtoms.push(currentLine);

    linesOfAtoms.forEach((lineAtoms) => {
      let maxAsc = fontSize * 0.85;
      let maxDesc = fontSize * 0.3;
      lineAtoms.forEach((a) => {
        if (a.ascent > maxAsc) maxAsc = a.ascent;
        if (a.descent > maxDesc) maxDesc = a.descent;
      });
      const lineH = maxAsc + maxDesc + 4;
      ensureSpace(lineH);
      const baselineY = curY + maxAsc;
      let x = MARGIN + indentX;

      lineAtoms.forEach((a) => {
        if (a.type === "math") {
          drawMathAstOnCanvas(
            ctx,
            a.ast,
            x + 2,
            baselineY,
            fontSize * 1.05,
            "#1d1d1b",
          );
          x += a.width;
        } else {
          if (a.style === "code") {
            ctx.fillStyle = "#cdc6be";
            ctx.fillRect(
              x,
              baselineY - fontSize * 0.82,
              a.width - 2,
              fontSize * 1.05,
            );
            ctx.fillStyle = "#1d1d1b";
            ctx.font = a.font;
            ctx.fillText(a.text, x + 2, baselineY);
          } else {
            ctx.fillStyle = baseColor;
            ctx.font = a.font;
            ctx.fillText(a.text, x, baselineY);
            if (a.style === "strike") {
              ctx.strokeStyle = baseColor;
              ctx.lineWidth = 1;
              ctx.beginPath();
              ctx.moveTo(x, baselineY - fontSize * 0.3);
              ctx.lineTo(x + a.width, baselineY - fontSize * 0.3);
              ctx.stroke();
            }
          }
          x += a.width;
        }
      });

      curY += lineH;
    });
  };

  for (let bi = 0; bi < blocks.length; bi++) {
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
    if (bi % 8 === 0) {
      onProgress?.(
        0.08 + (0.72 * bi) / Math.max(1, blocks.length),
        `PDF page ${pageIndex}…`,
      );
      await yieldToMain();
    }

    const b = blocks[bi];
    if (b.type === "latexPreamble") {
      ensureSpace(24);
      ctx.fillStyle = "#cdc6be";
      ctx.fillRect(MARGIN, curY, CONTENT_W, 18);
      ctx.strokeStyle = "#1d1d1b";
      ctx.strokeRect(MARGIN, curY, CONTENT_W, 18);
      ctx.fillStyle = "#1d1d1b";
      ctx.font = "bold 9px monospace";
      ctx.fillText(
        `LaTeX [${b.docClass}] Packages: ${b.packages.join(", ") || "standard"}`,
        MARGIN + 6,
        curY + 12,
      );
      curY += 24;
    } else if (b.type === "theorem") {
      ensureSpace(36);
      const label =
        b.env.charAt(0).toUpperCase() +
        b.env.slice(1) +
        (b.title ? ` (${b.title}).` : ".");
      drawRichParagraph(label, 11, 6, "#c03f13", true);
      drawRichParagraph(
        b.body + (b.env === "proof" ? "  [Q.E.D.]" : ""),
        10.5,
        10,
        "#1d1d1b",
        false,
      );
      curY += 8;
    } else if (b.type === "h1") {
      ensureSpace(38);
      curY += 6;
      drawRichParagraph(b.text, 20, 0, "#1d1d1b", true);
      ctx.strokeStyle = "#1d1d1b";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(MARGIN, curY + 3);
      ctx.lineTo(PT_W - MARGIN, curY + 3);
      ctx.stroke();
      curY += 12;
    } else if (b.type === "h2") {
      ensureSpace(32);
      curY += 6;
      drawRichParagraph(b.text, 15, 0, "#1d1d1b", true);
      ctx.strokeStyle = "#1d1d1b";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(MARGIN, curY + 2);
      ctx.lineTo(PT_W - MARGIN, curY + 2);
      ctx.stroke();
      curY += 10;
    } else if (b.type === "h3" || b.type === "h4") {
      ensureSpace(26);
      curY += 4;
      drawRichParagraph(b.text, 12.5, 0, "#1d1d1b", true);
      curY += 6;
    } else if (b.type === "hr") {
      ensureSpace(16);
      curY += 6;
      ctx.strokeStyle = "#1d1d1b";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(MARGIN, curY);
      ctx.lineTo(PT_W - MARGIN, curY);
      ctx.stroke();
      curY += 10;
    } else if (b.type === "blockquote") {
      ensureSpace(28);
      const startQ = curY;
      b.lines.forEach((ql) => {
        drawRichParagraph(ql, 10.5, 14, "#1d1d1b", false);
      });
      ctx.fillStyle = "#c03f13";
      ctx.fillRect(MARGIN + 2, startQ, 3, curY - startQ);
      curY += 8;
    } else if (b.type === "ul") {
      for (const it of b.items) {
        ensureSpace(18);
        const ind = it.indent ? 24 : 10;
        const bullet = it.task ? (it.checked ? "☑" : "☐") : "•";
        ctx.fillStyle = "#c03f13";
        ctx.font = "bold 11px Georgia, serif";
        ctx.fillText(bullet, MARGIN + ind - 10, curY + 10);
        drawRichParagraph(it.text, 10.5, ind + 2, "#1d1d1b", false);
      }
      curY += 6;
    } else if (b.type === "ol") {
      for (let idx = 0; idx < b.items.length; idx++) {
        ensureSpace(18);
        ctx.fillStyle = "#1d1d1b";
        ctx.font = "bold 10.5px Georgia, serif";
        ctx.fillText(`${idx + 1}.`, MARGIN, curY + 10);
        drawRichParagraph(b.items[idx], 10.5, 18, "#1d1d1b", false);
      }
      curY += 6;
    } else if (b.type === "math") {
      const ast = parseLatexToAst(b.latex);
      const mathFontSize = 15;
      const m = measureMathAstOnCanvas(ctx, ast, mathFontSize);
      const blockH = m.ascent + m.descent + 24;
      ensureSpace(blockH + 10);
      curY += 4;
      ctx.fillStyle = "#cdc6be";
      ctx.strokeStyle = "#1d1d1b";
      ctx.lineWidth = 1;
      ctx.fillRect(MARGIN, curY, CONTENT_W, blockH);
      ctx.strokeRect(MARGIN, curY, CONTENT_W, blockH);

      const startX = Math.max(MARGIN + 12, MARGIN + (CONTENT_W - m.width) / 2);
      const baselineY = curY + 12 + m.ascent;
      drawMathAstOnCanvas(ctx, ast, startX, baselineY, mathFontSize, "#1d1d1b");
      curY += blockH + 10;
    } else if (b.type === "code") {
      const codeLines = b.content.split("\n").slice(0, 80);
      const boxH = codeLines.length * 14 + 16;
      ensureSpace(Math.min(boxH, 140));
      ctx.fillStyle = "#1d1d1b";
      ctx.fillRect(MARGIN, curY, CONTENT_W, boxH);
      ctx.fillStyle = "#e2dedb";
      ctx.font = "9.5px monospace";
      codeLines.forEach((cl, ci) => {
        ctx.fillText(cl.slice(0, 88), MARGIN + 10, curY + 16 + ci * 14);
      });
      curY += boxH + 10;
    } else if (b.type === "table") {
      const colCount = Math.max(1, b.headers.length);
      const colW = CONTENT_W / colCount;
      const rowH = 20;
      ensureSpace((Math.min(b.rows.length, 40) + 1) * rowH + 12);

      ctx.fillStyle = "#1d1d1b";
      ctx.fillRect(MARGIN, curY, CONTENT_W, rowH);
      b.headers.forEach((h, hi) => {
        ctx.fillStyle = "#e2dedb";
        ctx.font = "bold 9.5px Georgia, serif";
        ctx.fillText(
          h.replace(/[`*]/g, "").slice(0, 28),
          MARGIN + hi * colW + 6,
          curY + 13,
        );
      });
      curY += rowH;

      for (const r of b.rows.slice(0, 40)) {
        ensureSpace(rowH);
        ctx.strokeStyle = "#1d1d1b";
        ctx.strokeRect(MARGIN, curY, CONTENT_W, rowH);
        r.forEach((c, ci) => {
          ctx.fillStyle = "#1d1d1b";
          ctx.font = "9.5px Georgia, serif";
          ctx.fillText(
            c.replace(/[`*]/g, "").slice(0, 28),
            MARGIN + ci * colW + 6,
            curY + 13,
          );
        });
        curY += rowH;
      }
      curY += 10;
    } else if (b.type === "details") {
      ensureSpace(32);
      drawRichParagraph(`▸ ${b.summary}`, 10.5, 0, "#1d1d1b", true);
      drawRichParagraph(b.body, 10, 12, "#1d1d1b", false);
      curY += 6;
    } else {
      ensureSpace(18);
      drawRichParagraph(b.text, 10.5, 0, "#1d1d1b", false);
      curY += 6;
    }
  }

  if (footnotes.length > 0) {
    ensureSpace(36);
    curY += 8;
    ctx.strokeStyle = "#1d1d1b";
    ctx.beginPath();
    ctx.moveTo(MARGIN, curY);
    ctx.lineTo(PT_W - MARGIN, curY);
    ctx.stroke();
    curY += 8;
    for (const fn of footnotes) {
      drawRichParagraph(`[${fn.id}]: ${fn.text}`, 9.5, 0, "#69645f", false);
    }
  }

  flushCurrentPage();

  const encoder = new TextEncoder();
  const chunks = [];
  let byteOffset = 0;

  const pushStr = (str) => {
    const bytes = encoder.encode(str);
    chunks.push(bytes);
    byteOffset += bytes.length;
  };

  const pushBytes = (bytes) => {
    chunks.push(bytes);
    byteOffset += bytes.length;
  };

  pushStr("%PDF-1.4\n");
  const offsets = [0];
  let objCount = 0;

  const startObj = () => {
    objCount++;
    offsets.push(byteOffset);
    pushStr(`${objCount} 0 obj\n`);
    return objCount;
  };

  const endObj = () => {
    pushStr("\nendobj\n");
  };

  const catalogId = startObj();
  pushStr("<< /Type /Catalog /Pages 2 0 R >>");
  endObj();

  const pagesRootId = startObj();
  const pageCount = pageImages.length;
  const pageObjIds = pageImages.map((_, idx) => 5 + idx * 3);
  pushStr(
    `<< /Type /Pages /Kids [${pageObjIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pageCount} >>`,
  );
  endObj();

  for (let idx = 0; idx < pageImages.length; idx++) {
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
    onProgress?.(
      0.82 + (0.16 * idx) / Math.max(1, pageImages.length),
      `Writing page ${idx + 1}/${pageImages.length}…`,
    );
    if (idx % 2 === 0) await yieldToMain();

    const page = pageImages[idx];
    const jpegBytes = page.bytes;

    const imgObjId = startObj();
    pushStr(
      `<< /Type /XObject /Subtype /Image /Width ${page.width} /Height ${page.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpegBytes.length} >>\nstream\n`,
    );
    pushBytes(jpegBytes);
    pushStr("\nendstream");
    endObj();

    const contentStream = `q\n${PT_W} 0 0 ${PT_H} 0 0 cm\n/Im${idx} Do\nQ`;
    const contentObjId = startObj();
    pushStr(
      `<< /Length ${contentStream.length} >>\nstream\n${contentStream}\nendstream`,
    );
    endObj();

    startObj();
    pushStr(
      `<< /Type /Page /Parent ${pagesRootId} 0 R /MediaBox [0 0 ${PT_W} ${PT_H}] /Resources << /XObject << /Im${idx} ${imgObjId} 0 R >> >> /Contents ${contentObjId} 0 R >>`,
    );
    endObj();
  }

  const xrefPos = byteOffset;
  pushStr(`xref\n0 ${objCount + 1}\n0000000000 65535 f \n`);
  for (let i = 1; i <= objCount; i++) {
    pushStr(`${String(offsets[i]).padStart(10, "0")} 00000 n \n`);
  }
  pushStr(
    `trailer\n<< /Size ${objCount + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xrefPos}\n%%EOF`,
  );

  onProgress?.(1, "Done");
  return {
    blob: new Blob(chunks, { type: "application/pdf" }),
    pageCount: pageImages.length,
  };
}

export { generateHighResPdfWithLatex };
