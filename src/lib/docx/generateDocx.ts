import {
  AlignmentType,
  BorderStyle,
  Document,
  ExternalHyperlink,
  HeadingLevel,
  ImageRun,
  ImportedXmlComponent,
  LevelFormat,
  Packer,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from "docx";
import { mml2omml } from "mathml2omml";
import { buildPreviewHtmlDocument, ensureKatex } from "../pdf/previewHtml";

const OMML_NS = "http://schemas.openxmlformats.org/officeDocument/2006/math";
const GRAY = "F6F8FA";
const RULE = "D0D7DE";
const HEADINGS = [
  HeadingLevel.HEADING_1,
  HeadingLevel.HEADING_2,
  HeadingLevel.HEADING_3,
  HeadingLevel.HEADING_4,
  HeadingLevel.HEADING_5,
  HeadingLevel.HEADING_6,
];
const line = { style: BorderStyle.SINGLE, size: 6, color: RULE, space: 4 };
const shade = { type: ShadingType.CLEAR, fill: GRAY, color: "auto" };

/** KaTeX element -> native (editable) Word equation, or null. */
function mathToOmml(katexEl: Element) {
  const math = katexEl.querySelector("math");
  if (!math) return null;
  try {
    const clone = math.cloneNode(true) as Element;
    clone.querySelectorAll("annotation").forEach((a) => a.remove());
    // Serialize as real XML and skip the converter's entity decoding, otherwise `x<0`
    // turns into a raw `<` inside <m:t> and the whole export throws.
    const omml = mml2omml(new XMLSerializer().serializeToString(clone), { disableDecode: true })
      // schema-invalid bits that make Word flag the file as corrupt
      .replace(/<w:rPr\/>/g, "")
      .replace(/<m:sty m:val="undefined"\/>/g, "");
    ImportedXmlComponent.fromXmlString(omml); // throws if unparseable -> text fallback
    return omml;
  } catch {
    return null;
  }
}

const ommlPart = (xml: string) =>
  ImportedXmlComponent.fromXmlString(xml) as unknown as TextRun;

export async function generateDocx({
  title = "README",
  markdown = "",
  marginPt = 48,
}: {
  title?: string;
  markdown?: string;
  marginPt?: number;
} = {}): Promise<Blob> {
  await ensureKatex();
  const html = buildPreviewHtmlDocument({ title, markdown, marginPt });
  const root = new DOMParser()
    .parseFromString(html, "text/html")
    .querySelector(".doc");

  const margin = Math.min(96, Math.max(24, Number(marginPt) || 48));
  const contentTwips = 12240 - margin * 2 * 20;
  const contentPx = Math.round((contentTwips / 1440) * 96);

  // ---- images (rasterised to PNG so SVG badges work in Word) ----
  const imgCache = new Map<string, Promise<any>>();
  const loadImage = (src: string) => {
    if (!imgCache.has(src)) {
      imgCache.set(
        src,
        Promise.race([
          new Promise<any>((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = "anonymous";
            img.onload = async () => {
              const w = img.naturalWidth;
              const h = img.naturalHeight;
              if (!w || !h) return reject(new Error("no size"));
              const c = document.createElement("canvas");
              c.width = w * 2;
              c.height = h * 2;
              c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
              c.toBlob(async (b) => {
                if (!b) return reject(new Error("toBlob"));
                resolve({ data: await b.arrayBuffer(), w, h });
              }, "image/png");
            };
            img.onerror = () => reject(new Error("load"));
            img.src = src;
          }),
          new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 6000)),
        ]),
      );
    }
    return imgCache.get(src)!;
  };

  // ---- inline content ----
  type St = { bold?: boolean; italics?: boolean; strike?: boolean; code?: boolean; sup?: boolean; link?: boolean; color?: string };
  const run = (text: string, s: St) =>
    new TextRun({
      text,
      bold: s.bold,
      italics: s.italics,
      strike: s.strike,
      superScript: s.sup,
      font: s.code ? "Consolas" : undefined,
      size: s.code ? 20 : undefined,
      shading: s.code ? shade : undefined,
      color: s.link ? "0969DA" : s.color,
      underline: s.link ? {} : undefined,
    });

  async function inline(node: Node, s: St = {}): Promise<any[]> {
    const out: any[] = [];
    for (const n of Array.from(node.childNodes)) {
      if (n.nodeType === Node.TEXT_NODE) {
        if (n.textContent) out.push(run(n.textContent, s));
        continue;
      }
      if (n.nodeType !== Node.ELEMENT_NODE) continue;
      const el = n as HTMLElement;
      const tag = el.tagName.toLowerCase();
      if (tag === "style") continue;
      if (el.classList.contains("katex")) {
        const omml = mathToOmml(el);
        if (omml) out.push(ommlPart(omml));
        else out.push(run(el.textContent || "", s));
      } else if (tag === "img") {
        const alt = el.getAttribute("alt") || el.getAttribute("data-label") || "image";
        try {
          const { data, w, h } = await loadImage(el.getAttribute("src") || "");
          const badge = el.classList.contains("badge-img");
          const scale = badge ? 20 / h : Math.min(1, contentPx / w, 280 / h);
          out.push(
            new ImageRun({
              type: "png",
              data,
              transformation: { width: Math.round(w * scale), height: Math.round(h * scale) },
            }),
          );
        } catch {
          out.push(run(`[${alt}]`, s));
        }
      } else if (tag === "br") {
        out.push(new TextRun({ break: 1 }));
      } else if (tag === "a") {
        const href = el.getAttribute("href") || "";
        const kids = await inline(el, { ...s, link: true });
        out.push(
          /^(https?:|mailto:)/i.test(href)
            ? new ExternalHyperlink({ link: href, children: kids })
            : kids,
        );
      } else {
        const next = { ...s };
        if (tag === "strong" || tag === "b") next.bold = true;
        if (tag === "em" || tag === "i") next.italics = true;
        if (tag === "del") next.strike = true;
        if (tag === "code") next.code = true;
        if (tag === "sup") next.sup = true;
        out.push(...(await inline(el, next)));
      }
    }
    return out.flat();
  }

  const para = async (el: Element, opts: any = {}, s: St = {}) =>
    new Paragraph({
      children: await inline(el, s),
      spacing: { after: 120 },
      alignment:
        (el as HTMLElement).style?.textAlign === "center" ? AlignmentType.CENTER : undefined,
      ...opts,
    });

  // ---- blocks ----
  let olInstance = 0;
  async function blocks(parent: Element): Promise<any[]> {
    const out: any[] = [];
    for (const el of Array.from(parent.children)) {
      const tag = el.tagName.toLowerCase();
      const cls = el.classList;
      if (tag === "style") continue;
      if (/^h[1-6]$/.test(tag)) {
        out.push(await para(el, { heading: HEADINGS[+tag[1] - 1], spacing: { before: 240, after: 120 } }));
      } else if (tag === "ul" || tag === "ol") {
        const inst = tag === "ol" ? ++olInstance : 0;
        for (const li of Array.from(el.children)) {
          out.push(
            await para(li, {
              numbering: {
                reference: tag,
                level: li.classList.contains("indent") ? 1 : 0,
                ...(inst ? { instance: inst } : {}),
              },
              spacing: { after: 60 },
            }),
          );
        }
      } else if (tag === "blockquote") {
        for (const p of Array.from(el.children)) {
          out.push(
            await para(p, {
              indent: { left: 360 },
              border: { left: { ...line, size: 18 } },
            }, { color: "57606A" }),
          );
        }
      } else if (tag === "pre") {
        const lines = (el.textContent || "").replace(/\n$/, "").split("\n");
        lines.forEach((l, i) =>
          out.push(
            new Paragraph({
              children: [new TextRun({ text: l, font: "Consolas", size: 19 })],
              shading: shade,
              indent: { left: 120, right: 120 },
              spacing: { after: i === lines.length - 1 ? 160 : 0 },
            }),
          ),
        );
      } else if (tag === "hr") {
        out.push(new Paragraph({ border: { bottom: line }, spacing: { before: 120, after: 120 } }));
      } else if (tag === "table") {
        const rows = Array.from(el.querySelectorAll("tr"));
        const cols = Math.max(1, ...rows.map((r) => r.children.length));
        const w = Math.floor(contentTwips / cols);
        const b = { style: BorderStyle.SINGLE, size: 4, color: RULE };
        out.push(
          new Table({
            width: { size: contentTwips, type: WidthType.DXA },
            columnWidths: Array(cols).fill(w),
            borders: { top: b, bottom: b, left: b, right: b, insideHorizontal: b, insideVertical: b },
            rows: await Promise.all(
              rows.map(
                async (r) =>
                  new TableRow({
                    tableHeader: r.parentElement?.tagName.toLowerCase() === "thead",
                    children: await Promise.all(
                      Array.from(r.children).map(
                        async (c) =>
                          new TableCell({
                            width: { size: w, type: WidthType.DXA },
                            shading: c.tagName.toLowerCase() === "th" ? shade : undefined,
                            margins: { top: 60, bottom: 60, left: 100, right: 100 },
                            children: [
                              await para(c, { spacing: { after: 0 } }, { bold: c.tagName.toLowerCase() === "th" }),
                            ],
                          }),
                      ),
                    ),
                  }),
              ),
            ),
          }),
          new Paragraph({ spacing: { after: 120 } }),
        );
      } else if (cls.contains("display-math")) {
        const k = el.querySelector(".katex");
        const omml = k && mathToOmml(k);
        out.push(
          omml
            ? new Paragraph({
                children: [
                  ommlPart(
                    `<m:oMathPara xmlns:m="${OMML_NS}">${omml.replace(/ xmlns:\w+="[^"]*"/g, "")}</m:oMathPara>`,
                  ),
                ],
                spacing: { before: 120, after: 120 },
              })
            : await para(el, { alignment: AlignmentType.CENTER }),
        );
      } else if (cls.contains("theorem")) {
        const box = { top: line, bottom: line, left: line, right: line };
        const head = el.querySelector(".theorem-h");
        const body = el.children[1];
        if (head)
          out.push(await para(head, { shading: shade, border: box, spacing: { after: 0 } }, { bold: true }));
        if (body)
          out.push(
            await para(body, { shading: shade, border: box }, { italics: cls.contains("italic") || body.classList.contains("italic") }),
          );
      } else if (cls.contains("preamble")) {
        out.push(
          new Paragraph({
            children: [new TextRun({ text: el.textContent || "", font: "Consolas", size: 18 })],
            shading: shade,
            spacing: { after: 120 },
          }),
        );
      } else if (tag === "details") {
        for (const c of Array.from(el.children)) {
          out.push(await para(c, {}, { bold: c.tagName.toLowerCase() === "summary" }));
        }
      } else if (cls.contains("footnotes")) {
        for (const f of Array.from(el.children)) out.push(await para(f, {}, { color: "57606A" }));
      } else {
        out.push(await para(el));
      }
    }
    return out;
  }

  const list = (format: any, text: (l: number) => string) =>
    [0, 1].map((level) => ({
      level,
      format,
      text: text(level),
      alignment: AlignmentType.LEFT,
      style: { paragraph: { indent: { left: 720 + level * 360, hanging: 360 } } },
    }));

  const doc = new Document({
    title,
    styles: { default: { document: { run: { size: 22 } } } },
    numbering: {
      config: [
        { reference: "ul", levels: list(LevelFormat.BULLET, (l) => (l ? "◦" : "•")) },
        { reference: "ol", levels: list(LevelFormat.DECIMAL, (l) => `%${l + 1}.`) },
      ],
    },
    sections: [
      {
        properties: {
          page: {
            size: { width: 12240, height: 15840 },
            margin: { top: margin * 20, bottom: margin * 20, left: margin * 20, right: margin * 20 },
          },
        },
        children: root ? await blocks(root) : [],
      },
    ],
  });

  return Packer.toBlob(doc);
}
