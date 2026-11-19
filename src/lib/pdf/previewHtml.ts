import { parseMarkdownDocument } from "../markdown/parse";

function esc(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function katexHtml(latex, display) {
  try {
    if (typeof window !== "undefined" && window.katex) {
      return window.katex.renderToString(latex || "", {
        displayMode: !!display,
        throwOnError: false,
        strict: false,
      });
    }
  } catch {
    /* fall through */
  }
  const tag = display ? "div" : "span";
  return `<${tag} class="math-fallback">${esc(latex)}</${tag}>`;
}

/** Inline MD → HTML (mirrors preview: badges, images, links, math). */
export function inlineToHtml(text, refLinks = {}) {
  if (!text) return "";
  let remaining = String(text);
  let out = "";
  const tokenRegex =
    /(\[!\[([^\]]*)\]\(([^)]+)\)\]\(([^)]+)\)|!\[([^\]]*)\]\(([^)]+)\)|\[([^\]]+)\]\(([^)]+)\)|\[([^\]]+)\]\[([^\]]+)\]|(\[\^([^\]]+)\])|\\\((.+?)\\\)|\$([^$\n]+)\$|`([^`]+)`|\*\*\*([^*]+)\*\*\*|\*\*([^*]+)\*\*|<b>([^<]+)<\/b>|~~([^~]+)~~|\*([^*]+)\*)/;

  while (remaining.length > 0) {
    const match = remaining.match(tokenRegex);
    if (!match) {
      out += esc(remaining);
      break;
    }
    if (match.index > 0) out += esc(remaining.slice(0, match.index));

    if (
      match[2] !== undefined &&
      match[3] !== undefined &&
      match[4] !== undefined
    ) {
      out += `<a href="${esc(match[4])}" target="_blank" rel="noopener noreferrer" class="badge-link"><img crossorigin="anonymous" src="${esc(match[3])}" alt="${esc(match[2])}" class="badge-img" data-label="${esc(match[2])}" /></a>`;
    } else if (match[5] !== undefined && match[6] !== undefined) {
      out += `<img crossorigin="anonymous" src="${esc(match[6])}" alt="${esc(match[5])}" class="content-img" data-label="${esc(match[5])}" />`;
    } else if (match[7] !== undefined && match[8] !== undefined) {
      out += `<a href="${esc(match[8])}" target="_blank" rel="noopener noreferrer">${esc(match[7])}</a>`;
    } else if (match[9] !== undefined && match[10] !== undefined) {
      const href = refLinks[match[10].toLowerCase()] || "#";
      out += `<a href="${esc(href)}" target="_blank" rel="noopener noreferrer">${esc(match[9])}</a>`;
    } else if (match[12] !== undefined) {
      out += `<sup class="fn">[${esc(match[12])}]</sup>`;
    } else if (match[13] !== undefined || match[14] !== undefined) {
      out += katexHtml(match[13] || match[14], false);
    } else if (match[15] !== undefined) {
      out += `<code>${esc(match[15])}</code>`;
    } else if (match[16] !== undefined) {
      out += `<strong><em>${esc(match[16])}</em></strong>`;
    } else if (match[17] !== undefined) {
      out += `<strong>${esc(match[17])}</strong>`;
    } else if (match[18] !== undefined) {
      out += `<b>${esc(match[18])}</b>`;
    } else if (match[19] !== undefined) {
      out += `<del>${esc(match[19])}</del>`;
    } else if (match[20] !== undefined) {
      out += `<em>${esc(match[20])}</em>`;
    }
    remaining = remaining.slice(match.index + match[0].length);
  }
  return out;
}

function blockToHtml(b, refLinks) {
  const align = b.center ? ' style="text-align:center"' : "";
  switch (b.type) {
    case "latexPreamble":
      return `<div class="preamble"><code>\\documentclass{${esc(b.docClass)}}</code>${
        b.packages?.length
          ? ` <span class="pkg">${esc(b.packages.join(", "))}</span>`
          : ""
      }</div>`;
    case "theorem": {
      const label = b.env.charAt(0).toUpperCase() + b.env.slice(1);
      const isProof = b.env === "proof";
      return `<div class="theorem"><div class="theorem-h"><span class="thm-label">${esc(label)}</span>${
        b.title ? ` <span>${esc(b.title)}</span>` : ""
      }</div><div class="${isProof ? "" : "italic"}">${inlineToHtml(b.body, refLinks)}${
        isProof ? ' <span class="qed">∎</span>' : ""
      }</div></div>`;
    }
    case "h1":
      return `<h1${align}>${inlineToHtml(b.text, refLinks)}</h1>`;
    case "h2":
      return `<h2${align}>${inlineToHtml(b.text, refLinks)}</h2>`;
    case "h3":
      return `<h3${align}>${inlineToHtml(b.text, refLinks)}</h3>`;
    case "h4":
      return `<h4${align}>${inlineToHtml(b.text, refLinks)}</h4>`;
    case "hr":
      return `<hr />`;
    case "blockquote":
      return `<blockquote>${(b.lines || [])
        .map((l) => `<p>${inlineToHtml(l, refLinks)}</p>`)
        .join("")}</blockquote>`;
    case "ul":
      return `<ul>${(b.items || [])
        .map((it) => {
          const pad = it.indent ? ' class="indent"' : "";
          const mark = it.task
            ? it.checked
              ? "☑ "
              : "☐ "
            : "";
          return `<li${pad}>${mark}${inlineToHtml(it.text, refLinks)}</li>`;
        })
        .join("")}</ul>`;
    case "ol":
      return `<ol>${(b.items || [])
        .map((it) => `<li>${inlineToHtml(it, refLinks)}</li>`)
        .join("")}</ol>`;
    case "math":
      return `<div class="display-math">${katexHtml(b.latex, true)}</div>`;
    case "code":
      return `<pre><code>${esc(b.content || "")}</code></pre>`;
    case "table": {
      const head = `<tr>${(b.headers || [])
        .map((h) => `<th>${inlineToHtml(h, refLinks)}</th>`)
        .join("")}</tr>`;
      const body = (b.rows || [])
        .map(
          (r) =>
            `<tr>${r.map((c) => `<td>${inlineToHtml(c, refLinks)}</td>`).join("")}</tr>`,
        )
        .join("");
      return `<table><thead>${head}</thead><tbody>${body}</tbody></table>`;
    }
    case "details":
      return `<details open><summary>${inlineToHtml(b.summary, refLinks)}</summary><p>${inlineToHtml(b.body, refLinks)}</p></details>`;
    case "p":
      return `<p${align}>${inlineToHtml(b.text, refLinks)}</p>`;
    default:
      return "";
  }
}

/* Neutral README / GitHub-flavored layout — no app theme colors */
const PRINT_CSS = `
  @page { margin: var(--pdf-margin, 48pt); }
  * {
    box-sizing: border-box;
    -webkit-font-smoothing: antialiased;
    text-shadow: none !important;
    box-shadow: none !important;
  }
  body, .doc {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
    color: #24292f;
    background: #ffffff;
    margin: 0;
    padding: 0;
    line-height: 1.6;
    font-size: 11pt;
  }
  .doc { max-width: 100%; padding: 0 0 16px; }
  h1,h2,h3,h4,h5,h6 {
    font-weight: 600;
    line-height: 1.25;
    margin: 1.25em 0 0.5em;
    color: #24292f;
  }
  .doc > style + *,
  .doc > :first-child:not(style) { margin-top: 0 !important; }
  h1 {
    font-size: 1.75em;
    padding-bottom: 0.3em;
    border-bottom: 1px solid #d0d7de;
  }
  h2 {
    font-size: 1.4em;
    padding-bottom: 0.25em;
    border-bottom: 1px solid #d0d7de;
  }
  h3 { font-size: 1.2em; }
  h4 { font-size: 1em; }
  p { margin: 0.75em 0; }
  a { color: #0969da; text-decoration: none; }
  a:hover { text-decoration: underline; }
  code {
    font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    font-size: 0.85em;
    background: #f6f8fa;
    padding: 0.12em 0.35em;
    border-radius: 4px;
    vertical-align: baseline;
    line-height: 1.25;
  }
  pre {
    background: #f6f8fa;
    color: #24292f;
    padding: 12px 14px;
    overflow-x: auto;
    border-radius: 4px;
    border: 1px solid #d0d7de;
    margin: 0.75em 0;
    line-height: 1.45;
  }
  pre code {
    background: transparent;
    padding: 0;
    font-size: 0.9em;
  }
  blockquote {
    margin: 0.75em 0;
    padding: 0 1em;
    color: #57606a;
    border-left: 0.25em solid #d0d7de;
  }
  ul, ol { margin: 0.5em 0; padding-left: 1.6em; }
  li { margin: 0.25em 0; }
  li.indent { margin-left: 1.2em; }
  table {
    width: 100%;
    border-collapse: collapse;
    margin: 0.75em 0;
    font-size: 0.92em;
  }
  th, td {
    border: 1px solid #d0d7de;
    padding: 6px 10px;
    vertical-align: top;
    word-break: break-word;
  }
  th {
    background: #f6f8fa;
    font-weight: 600;
    text-align: left;
  }
  .badge-img { height: 20px; vertical-align: middle; margin: 2px 3px; }
  .badge-link { text-decoration: none; }
  .badge-pill {
    display: inline-block;
    margin: 2px 3px;
    padding: 2px 7px;
    background: #f6f8fa;
    color: #24292f;
    border: 1px solid #d0d7de;
    font-size: 11px;
    border-radius: 4px;
    vertical-align: middle;
  }
  .content-img { max-width: 100%; max-height: 280px; }
  .display-math {
    margin: 1em 0;
    text-align: center;
    overflow-x: auto;
  }
  .katex, .katex-display { color: #24292f !important; }
  .katex {
    display: inline-block !important;
    vertical-align: baseline !important;
  }
  .katex-display {
    display: block !important;
    margin: 0.75em 0 !important;
    text-align: center;
  }
  .math-fallback {
    font-family: ui-monospace, monospace;
    background: #f6f8fa;
    padding: 8px 12px;
    display: inline-block;
    border: 1px solid #d0d7de;
    border-radius: 4px;
  }
  .preamble {
    font-family: ui-monospace, monospace;
    font-size: 0.85em;
    background: #f6f8fa;
    border: 1px solid #d0d7de;
    padding: 8px 10px;
    margin: 0.5em 0;
    border-radius: 4px;
  }
  .pkg {
    display: inline-block;
    background: #ddf4ff;
    color: #0969da;
    padding: 1px 6px;
    border-radius: 4px;
    margin-left: 6px;
    font-size: 0.9em;
  }
  .theorem {
    border: 1px solid #d0d7de;
    background: #f6f8fa;
    padding: 10px 12px;
    margin: 0.75em 0;
    border-radius: 4px;
  }
  .theorem-h {
    border-bottom: 1px solid #d0d7de;
    padding-bottom: 4px;
    margin-bottom: 6px;
    font-weight: 600;
  }
  .thm-label {
    display: inline-block;
    font-weight: 600;
    margin-right: 6px;
  }
  .italic { font-style: italic; }
  .qed { float: right; font-weight: 700; }
  .footnotes {
    margin-top: 1.5em;
    border-top: 1px solid #d0d7de;
    padding-top: 0.75em;
    font-size: 0.9em;
    color: #57606a;
  }
  hr {
    border: 0;
    height: 0;
    border-top: 1px solid #d0d7de;
    margin: 1.25em 0;
  }
`;

export function buildPreviewHtmlDocument({
  title = "README",
  markdown = "",
  marginPt = 48,
}) {
  const { blocks, refLinks, footnotes } = parseMarkdownDocument(markdown);
  const body = blocks.map((b) => blockToHtml(b, refLinks || {})).join("\n");
  const fn =
    footnotes?.length > 0
      ? `<div class="footnotes">${footnotes
          .map(
            (f) =>
              `<div><strong>[${esc(f.id)}]</strong> ${inlineToHtml(f.text, refLinks || {})}</div>`,
          )
          .join("")}</div>`
      : "";

  const margin = Math.min(96, Math.max(24, Number(marginPt) || 48));

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>${esc(title)}</title>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css" />
<style>:root{--pdf-margin:${margin}pt}${PRINT_CSS}</style>
</head>
<body>
<article class="doc">
${body}
${fn}
</article>
</body>
</html>`;
}

/** HTML Word opens natively (.doc). Word can't render KaTeX CSS, so math becomes its TeX source. */
export function buildWordHtmlDocument(opts) {
  const doc = new DOMParser().parseFromString(
    buildPreviewHtmlDocument(opts),
    "text/html",
  );
  doc.querySelectorAll(".katex").forEach((k) => {
    const tex = k.querySelector('annotation[encoding="application/x-tex"]');
    const i = doc.createElement("i");
    i.textContent = tex?.textContent || k.textContent;
    k.replaceWith(i);
  });
  doc.querySelector('link[rel="stylesheet"]')?.remove();
  return `<!DOCTYPE html>${doc.documentElement.outerHTML}`;
}

async function ensureKatex(onProgress) {
  if (typeof window === "undefined" || window.katex) return;
  onProgress?.(0.08, "Loading KaTeX…");
  await new Promise<void>((resolve) => {
    const existing = document.getElementById("katex-js");
    if (window.katex) {
      resolve();
      return;
    }
    const script =
      existing ||
      Object.assign(document.createElement("script"), {
        id: "katex-js",
        src: "https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js",
      });
    script.addEventListener("load", () => resolve(), { once: true });
    script.addEventListener("error", () => resolve(), { once: true });
    if (!existing) document.head.appendChild(script);
    setTimeout(resolve, 4000);
  });
}

function fallbackBrokenImages(root) {
  root.querySelectorAll("img").forEach((img) => {
    const replace = () => {
      const label = img.getAttribute("data-label") || img.alt || "image";
      const pill = document.createElement("span");
      pill.className = "badge-pill";
      pill.textContent = label;
      img.replaceWith(pill);
    };
    if (img.complete && img.naturalWidth === 0) replace();
    else img.addEventListener("error", replace, { once: true });
  });
}

/**
 * Render KaTeX preview HTML off-screen and download a PDF directly
 * (no print dialog / new window).
 */
export async function downloadPreviewPdf({
  title = "README",
  markdown = "",
  marginPt = 48,
  filename,
  onProgress,
  signal,
}: {
  title?: string;
  markdown?: string;
  marginPt?: number;
  filename?: string;
  onProgress?: (p: number, msg: string) => void;
  signal?: AbortSignal;
} = {}) {
  onProgress?.(0.05, "Building preview HTML…");
  if (signal?.aborted) throw new DOMException("Aborted", "AbortError");

  await ensureKatex(onProgress);
  if (signal?.aborted) throw new DOMException("Aborted", "AbortError");

  onProgress?.(0.25, "Rendering formulas & badges…");
  const fullHtml = buildPreviewHtmlDocument({ title, markdown, marginPt });
  const parsed = new DOMParser().parseFromString(fullHtml, "text/html");
  const articleHtml = (parsed.querySelector(".doc")?.innerHTML || "").trim();

  const margin = Math.min(96, Math.max(24, Number(marginPt) || 48));
  const host = document.createElement("div");
  host.setAttribute("data-pdf-export-root", "1");
  // Letter content width ≈ 8.5in - margins; use px for html2canvas layout
  const contentWidthPx = Math.round(((8.5 * 72 - margin * 2) / 72) * 96);
  // Full opacity off-screen — near-zero opacity was producing blank white PDFs
  host.style.cssText = `position:fixed;left:-14000px;top:0;width:${contentWidthPx}px;background:#ffffff;opacity:1;pointer-events:none;z-index:-1;`;
  // Keep <style> inside .doc so html2pdf's clone carries styles with the content
  host.innerHTML = `<article class="doc"><style>${PRINT_CSS}</style>${articleHtml}</article>`;
  document.body.appendChild(host);

  fallbackBrokenImages(host);

  const imgs = [...host.querySelectorAll("img")];
  onProgress?.(0.4, "Loading images…");
  await Promise.race([
    Promise.all(
      imgs.map((img) =>
        img.complete
          ? Promise.resolve()
          : new Promise((res) => {
              img.onload = res;
              img.onerror = res;
            }),
      ),
    ),
    new Promise((r) => setTimeout(r, 6000)),
  ]);
  // Second pass: swap any still-broken images
  fallbackBrokenImages(host);
  await new Promise((r) => setTimeout(r, 50));

  if (signal?.aborted) {
    host.remove();
    throw new DOMException("Aborted", "AbortError");
  }

  onProgress?.(0.55, "Creating PDF…");
  const html2pdf = (await import("html2pdf.js")).default;
  const el = host.querySelector(".doc") || host;
  const marginIn = margin / 72;
  const safeName = String(filename || `${title || "README"}.pdf`).replace(
    /[^\w.\-() ]+/g,
    "_",
  );

  // html2canvas measures the font baseline with a hidden <img> in THIS document.
  // Tailwind preflight sets `img{display:block}`, which inflates the baseline and
  // draws every line of text too low. Scope an inline override to that probe only.
  const probeFix = document.createElement("style");
  probeFix.textContent =
    'body > div[style*="visibility: hidden"] img{display:inline !important;vertical-align:baseline !important;}';
  document.head.appendChild(probeFix);

  // Browsers cap canvas height (~32k px); shrink scale for long documents so
  // pages don't come out blank.
  const scale = Math.min(2, 30000 / Math.max(1, el.scrollHeight));

  try {
    const blob = await html2pdf()
      .set({
        margin: marginIn,
        filename: safeName,
        pagebreak: { mode: ["css", "legacy"] },
        image: { type: "jpeg", quality: 0.92 },
        html2canvas: {
          scale,
          useCORS: true,
          allowTaint: false,
          logging: false,
          backgroundColor: "#ffffff",
          windowWidth: contentWidthPx,
          scrollX: 0,
          scrollY: -window.scrollY,
        },
        jsPDF: { unit: "in", format: "letter", orientation: "portrait" },
      })
      .from(el)
      .outputPdf("blob");

    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
    onProgress?.(1, "Done");
    return { blob, pageCount: null };
  } finally {
    probeFix.remove();
    host.remove();
  }
}

/** @deprecated use downloadPreviewPdf */
export const printPreviewPdf = downloadPreviewPdf;
