import { useMemo } from "react";
import { parseLatexToAst } from "../lib/latex/parse";
import { renderAstToReact } from "../lib/latex/render";

function MathFormula({ latex, display = false, darkPreview = false }) {
  const ast = useMemo(() => parseLatexToAst(latex), [latex]);

  if (typeof window !== "undefined" && window.katex) {
    try {
      const html = window.katex.renderToString(latex, {
        displayMode: display,
        throwOnError: false,
      });
      return (
        <span
          className={
            display
              ? "block my-3 text-center overflow-x-auto"
              : "inline-block mx-0.5"
          }
          dangerouslySetInnerHTML={{ __html: html }}
        />
      );
    } catch (e) {}
  }

  if (display) {
    return (
      <div
        className={`my-3 py-3.5 px-4 border text-center font-serif text-base md:text-lg tracking-wide overflow-x-auto ${
          darkPreview
            ? "bg-[#272624] border-[#69645f]/50 text-[#e2dedb]"
            : "bg-[#cdc6be]/70 border-[#1d1d1b]/30 text-[#1d1d1b]"
        }`}
      >
        {renderAstToReact(ast, "disp")}
      </div>
    );
  }

  return (
    <span
      className={`inline-flex items-center font-serif px-1.5 py-0.5 rounded-[2.88px] font-medium ${
        darkPreview
          ? "bg-[#272624] text-[#e2dedb]"
          : "bg-[#cdc6be] text-[#1d1d1b]"
      }`}
    >
      {renderAstToReact(ast, "inl")}
    </span>
  );
}

export { MathFormula };
