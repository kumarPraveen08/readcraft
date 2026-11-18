import { memo, useEffect, useMemo, useState } from "react";
import { FONT_PRESETS } from "../data/fonts";
import { parseMarkdownDocument } from "../lib/markdown/parse";
import { renderInlineMarkdown } from "../lib/markdown/inline";
import { MathFormula } from "./MathFormula";

const PREVIEW_LINE_STEP = 2500;

function takeFirstLines(text, maxLines) {
  if (!text) return { text: "", truncated: false, totalHint: 0 };
  let lines = 0;
  for (let i = 0; i < text.length; i++) {
    if (text.charCodeAt(i) === 10) {
      lines++;
      if (lines >= maxLines) {
        return {
          text: text.slice(0, i),
          truncated: true,
          totalHint: lines,
        };
      }
    }
  }
  return { text, truncated: false, totalHint: lines };
}

function MarkdownPreview({
  markdown,
  darkPreview,
  fontPreset = FONT_PRESETS[0],
  compact = false,
  resetKey = null,
}) {
  const [lineCap, setLineCap] = useState(PREVIEW_LINE_STEP);

  useEffect(() => {
    setLineCap(PREVIEW_LINE_STEP);
  }, [resetKey]);

  const sliced = useMemo(() => {
    if (compact) {
      return takeFirstLines(markdown || "", 80);
    }
    return takeFirstLines(markdown || "", lineCap);
  }, [markdown, lineCap, compact]);

  const { blocks, refLinks, footnotes } = useMemo(
    () => parseMarkdownDocument(sliced.text),
    [sliced.text],
  );

  if (compact) {
    return (
      <div
        className={`space-y-1 text-[11px] leading-snug text-[#1d1d1b] ${fontPreset.bodyClass} pointer-events-none select-none`}
      >
        {blocks.slice(0, 3).map((b, i) => {
          if (b.type === "h1" || b.type === "h2")
            return (
              <div
                key={i}
                className={`${fontPreset.headingClass} text-xs text-[#1d1d1b] truncate`}
              >
                {renderInlineMarkdown(b.text, refLinks, false)}
              </div>
            );
          return (
            <div key={i} className="text-[10px] text-[#69645f] line-clamp-2">
              {renderInlineMarkdown(b.text || b.body || "", refLinks, false)}
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div
      className={`border p-4 sm:p-7 space-y-4 leading-relaxed ${fontPreset.bodyClass} shadow-[-4px_4px_6px_0px_rgba(29,29,27,0.15)] ${
        darkPreview
          ? "bg-[#1d1d1b] border-[#69645f]/50 text-[#e2dedb]"
          : "bg-[#e2dedb] border-[#1d1d1b]/30 text-[#1d1d1b]"
      }`}
    >
      {blocks.map((b, i) => {
        const align = b.center ? "text-center" : "";
        if (b.type === "latexPreamble") {
          return (
            <div
              key={i}
              className={`md-block flex flex-wrap items-center gap-2 px-3 py-1.5 border text-xs font-mono ${
                darkPreview
                  ? "bg-[#272624] border-[#69645f]/50 text-[#e2dedb]"
                  : "bg-[#cdc6be] border-[#1d1d1b]/30 text-[#1d1d1b]"
              }`}
            >
              <span>
                \documentclass[{b.options}]{`{${b.docClass}}`}
              </span>
              {b.packages?.length > 0 && (
                <span className="px-1.5 py-0.5 bg-[#c03f13] text-[#e2dedb] rounded-[2.88px]">
                  {b.packages.join(", ")}
                </span>
              )}
            </div>
          );
        }
        if (b.type === "theorem") {
          const isProof = b.env === "proof";
          const label = b.env.charAt(0).toUpperCase() + b.env.slice(1);
          return (
            <div
              key={i}
              className={`md-block border p-3.5 my-2.5 ${
                darkPreview
                  ? "bg-[#272624] border-[#69645f]/50 text-[#e2dedb]"
                  : "bg-[#cdc6be] border-[#1d1d1b]/30 text-[#1d1d1b]"
              }`}
            >
              <div
                className={`${fontPreset.headingClass} text-xs mb-1 flex items-center justify-between border-b border-current/20 pb-1`}
              >
                <span className="flex items-center gap-1.5">
                  <span className="px-1.5 py-0.5 bg-[#c03f13] text-[#e2dedb] text-[10px] rounded-[2.88px]">
                    {label}
                  </span>
                  {b.title && <span>{b.title}</span>}
                </span>
                {isProof && (
                  <span className="text-xs font-serif">Q.E.D. ∎</span>
                )}
              </div>
              <div
                className={`text-sm sm:text-base ${isProof ? "not-italic" : "italic"} leading-snug`}
              >
                {renderInlineMarkdown(b.body, refLinks, darkPreview)}
                {isProof && (
                  <span className="float-right font-serif font-bold ml-2">
                    ∎
                  </span>
                )}
              </div>
            </div>
          );
        }
        if (b.type === "h1")
          return (
            <h1
              key={i}
              className={`md-block ${fontPreset.headingClass} text-2xl sm:text-4xl pb-2 border-b ${
                darkPreview
                  ? "border-[#69645f] text-[#e2dedb]"
                  : "border-[#1d1d1b] text-[#1d1d1b]"
              } ${align}`}
            >
              {renderInlineMarkdown(b.text, refLinks, darkPreview)}
            </h1>
          );
        if (b.type === "h2")
          return (
            <h2
              key={i}
              className={`md-block ${fontPreset.headingClass} text-xl sm:text-2xl pt-2 pb-1 border-b ${
                darkPreview
                  ? "border-[#69645f]/60 text-[#e2dedb]"
                  : "border-[#1d1d1b]/40 text-[#1d1d1b]"
              } ${align}`}
            >
              {renderInlineMarkdown(b.text, refLinks, darkPreview)}
            </h2>
          );
        if (b.type === "h3")
          return (
            <h3
              key={i}
              className={`md-block ${fontPreset.headingClass} text-lg pt-1 ${align}`}
            >
              {renderInlineMarkdown(b.text, refLinks, darkPreview)}
            </h3>
          );
        if (b.type === "h4")
          return (
            <h4
              key={i}
              className="md-block text-xs uppercase px-2 py-0.5 inline-block rounded-[2.88px] bg-[#c03f13] text-[#e2dedb]"
            >
              {renderInlineMarkdown(b.text, refLinks, true)}
            </h4>
          );
        if (b.type === "hr")
          return (
            <hr
              key={i}
              className={`md-block border-t my-4 ${
                darkPreview ? "border-[#69645f]/50" : "border-[#1d1d1b]/30"
              }`}
            />
          );
        if (b.type === "blockquote")
          return (
            <blockquote
              key={i}
              className={`md-block border-l-2 border-[#c03f13] pl-3.5 py-1.5 my-2.5 space-y-1 ${
                darkPreview
                  ? "bg-[#272624] text-[#e2dedb]"
                  : "bg-[#cdc6be] text-[#1d1d1b]"
              }`}
            >
              {(b.lines || []).map((ql, qi) => (
                <div key={qi} className="text-sm sm:text-base italic">
                  {renderInlineMarkdown(ql, refLinks, darkPreview)}
                </div>
              ))}
            </blockquote>
          );
        if (b.type === "ul")
          return (
            <ul
              key={i}
              className="md-block space-y-1.5 pl-4 text-sm sm:text-base"
            >
              {(b.items || []).map((it, j) => (
                <li
                  key={j}
                  className={`flex items-start gap-2 ${it.indent ? "ml-5" : ""}`}
                >
                  {it.task ? (
                    <input
                      type="checkbox"
                      checked={it.checked}
                      readOnly
                      className="mt-1.5 w-3.5 h-3.5 accent-[#c03f13]"
                    />
                  ) : (
                    <span className="text-[#c03f13] font-bold">•</span>
                  )}
                  <span className={it.checked ? "line-through opacity-60" : ""}>
                    {renderInlineMarkdown(it.text, refLinks, darkPreview)}
                  </span>
                </li>
              ))}
            </ul>
          );
        if (b.type === "ol")
          return (
            <ol
              key={i}
              className="md-block list-decimal list-inside space-y-1.5 pl-2 text-sm sm:text-base"
            >
              {(b.items || []).map((it, j) => (
                <li key={j}>
                  {renderInlineMarkdown(it, refLinks, darkPreview)}
                </li>
              ))}
            </ol>
          );
        if (b.type === "math")
          return (
            <div key={i} className="md-block">
              <MathFormula
                latex={b.latex}
                display={true}
                darkPreview={darkPreview}
              />
            </div>
          );
        if (b.type === "code")
          return (
            <pre
              key={i}
              className="md-block p-3.5 bg-[#1d1d1b] text-[#e2dedb] font-mono text-xs overflow-x-auto border border-[#000000]"
            >
              <code>{b.content}</code>
            </pre>
          );
        if (b.type === "table")
          return (
            <div key={i} className="md-block overflow-x-auto my-2.5">
              <table className="w-full text-left border-collapse text-xs sm:text-sm border border-[#1d1d1b]/40">
                <thead>
                  <tr className="bg-[#1d1d1b] text-[#e2dedb]">
                    {(b.headers || []).map((h, hi) => (
                      <th
                        key={hi}
                        className={`p-2 border border-[#1d1d1b]/40 font-semibold ${
                          b.alignments?.[hi] || "text-left"
                        }`}
                      >
                        {renderInlineMarkdown(h, refLinks, true)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(b.rows || []).map((r, ri) => (
                    <tr
                      key={ri}
                      className={
                        darkPreview
                          ? ri % 2 === 0
                            ? "bg-[#1d1d1b] text-[#e2dedb]"
                            : "bg-[#272624] text-[#e2dedb]"
                          : ri % 2 === 0
                            ? "bg-[#e2dedb] text-[#1d1d1b]"
                            : "bg-[#cdc6be] text-[#1d1d1b]"
                      }
                    >
                      {r.map((c, ci) => (
                        <td
                          key={ci}
                          className={`p-2 border border-[#1d1d1b]/30 ${
                            b.alignments?.[ci] || "text-left"
                          }`}
                        >
                          {renderInlineMarkdown(c, refLinks, darkPreview)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        if (b.type === "details")
          return (
            <details
              key={i}
              className={`md-block border px-3.5 py-2 text-sm sm:text-base ${
                darkPreview
                  ? "bg-[#272624] border-[#69645f]/50 text-[#e2dedb]"
                  : "bg-[#cdc6be] border-[#1d1d1b]/30 text-[#1d1d1b]"
              }`}
            >
              <summary className="cursor-pointer font-semibold">
                {b.summary}
              </summary>
              <div className="mt-2 pt-2 border-t border-current/20 text-xs sm:text-sm">
                {renderInlineMarkdown(b.body, refLinks, darkPreview)}
              </div>
            </details>
          );
        return (
          <p
            key={i}
            className={`md-block text-sm sm:text-base leading-[1.35] ${align}`}
          >
            {renderInlineMarkdown(b.text, refLinks, darkPreview)}
          </p>
        );
      })}

      {footnotes.length > 0 && (
        <div
          className={`pt-3 mt-5 border-t border-current/20 text-xs space-y-1 ${
            darkPreview ? "text-[#cdc6be]" : "text-[#69645f]"
          }`}
        >
          {footnotes.map((fn) => (
            <div key={fn.id}>
              <strong className="bg-[#c03f13] text-[#e2dedb] rounded-[2.88px] px-1 mr-1">
                [{fn.id}]:
              </strong>{" "}
              {renderInlineMarkdown(fn.text, refLinks, darkPreview)}
            </div>
          ))}
        </div>
      )}

      {sliced.truncated && (
        <button
          type="button"
          onClick={() => setLineCap((n) => n + PREVIEW_LINE_STEP)}
          className={`w-full mt-2 px-3 py-2 text-xs border rounded-[2.88px] ${
            darkPreview
              ? "border-[#69645f]/50 bg-[#272624] hover:bg-[#30302e]"
              : "border-[#1d1d1b]/30 bg-[#cdc6be] hover:opacity-90"
          }`}
        >
          Preview capped for speed — render next {PREVIEW_LINE_STEP.toLocaleString()} lines
        </button>
      )}
    </div>
  );
}

const MemoMarkdownPreview = memo(MarkdownPreview);
export { MemoMarkdownPreview as MarkdownPreview };
