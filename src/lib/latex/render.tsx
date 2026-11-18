function renderAstToReact(ast, keyPrefix = "ast") {
  if (!ast || !Array.isArray(ast)) return null;
  return ast.map((node, idx) => {
    const key = `${keyPrefix}-${idx}`;
    switch (node.type) {
      case "space":
        return <span key={key} className="inline-block w-1.5" />;
      case "newline":
        return <br key={key} />;
      case "group":
        return <span key={key}>{renderAstToReact(node.children, key)}</span>;
      case "var":
        return (
          <span key={key} className="italic">
            {node.value}
          </span>
        );
      case "op":
      case "symbol":
        return (
          <span key={key} className="not-italic mx-[1px]">
            {node.value}
          </span>
        );
      case "delim":
        return (
          <span
            key={key}
            className="not-italic font-normal text-[1.15em] mx-[1px]"
          >
            {node.value}
          </span>
        );
      case "func":
        return (
          <span key={key} className="not-italic font-serif mx-0.5">
            {node.name}
          </span>
        );
      case "styledText":
        return (
          <span
            key={key}
            className={`not-italic ${
              node.style === "textbf" || node.style === "mathbf"
                ? "font-bold"
                : node.style === "textit"
                  ? "italic"
                  : "text-[0.9em]"
            } mx-0.5`}
          >
            {node.value}
          </span>
        );
      case "accent": {
        const combiningMap = {
          hat: "\u0302",
          bar: "\u0304",
          vec: "\u20D7",
          tilde: "\u0303",
          dot: "\u0307",
          ddot: "\u0308",
        };
        if (node.accent === "overline") {
          return (
            <span key={key} className="border-t border-current px-0.5">
              {renderAstToReact(node.body, key)}
            </span>
          );
        }
        if (node.accent === "underline") {
          return (
            <span key={key} className="border-b border-current px-0.5">
              {renderAstToReact(node.body, key)}
            </span>
          );
        }
        return (
          <span key={key} className="inline-block relative">
            {renderAstToReact(node.body, key)}
            <span>{combiningMap[node.accent] || ""}</span>
          </span>
        );
      }
      case "msubsup":
        return (
          <span key={key} className="inline-flex items-baseline">
            <span>{renderAstToReact([node.base], `${key}-b`)}</span>
            <span className="inline-flex flex-col text-[0.72em] leading-none ml-[1px] align-middle">
              {node.sup && (
                <sup className="mb-0.5">
                  {renderAstToReact(node.sup, `${key}-sup`)}
                </sup>
              )}
              {node.sub && (
                <sub className="mt-0.5">
                  {renderAstToReact(node.sub, `${key}-sub`)}
                </sub>
              )}
            </span>
          </span>
        );
      case "bigop":
        return (
          <span
            key={key}
            className="inline-flex flex-col items-center justify-center align-middle mx-1.5 leading-none not-italic"
          >
            {node.sup && (
              <span className="text-[0.68em] mb-0.5">
                {renderAstToReact(node.sup, `${key}-sup`)}
              </span>
            )}
            <span
              className={
                node.isWord ? "text-sm font-serif" : "text-xl font-serif"
              }
            >
              {node.op}
            </span>
            {node.sub && (
              <span className="text-[0.68em] mt-0.5">
                {renderAstToReact(node.sub, `${key}-sub`)}
              </span>
            )}
          </span>
        );
      case "frac":
        return (
          <span
            key={key}
            className="inline-flex flex-col items-center justify-center align-middle mx-1.5 text-[0.92em]"
          >
            <span className="px-1.5 pb-0.5 border-b border-current leading-tight">
              {renderAstToReact(node.num, `${key}-n`)}
            </span>
            <span className="px-1.5 pt-0.5 leading-tight">
              {renderAstToReact(node.den, `${key}-d`)}
            </span>
          </span>
        );
      case "binom":
        return (
          <span
            key={key}
            className="inline-flex items-center align-middle mx-1 text-[0.9em]"
          >
            <span className="text-lg font-light not-italic">(</span>
            <span className="inline-flex flex-col items-center px-1 leading-tight">
              <span>{renderAstToReact(node.top, `${key}-t`)}</span>
              <span>{renderAstToReact(node.bot, `${key}-b`)}</span>
            </span>
            <span className="text-lg font-light not-italic">)</span>
          </span>
        );
      case "sqrt":
        return (
          <span
            key={key}
            className="inline-flex items-center align-middle mx-0.5"
          >
            {node.degree && (
              <sup className="text-[0.65em] -mr-0.5 -mt-2">
                {renderAstToReact(node.degree, `${key}-deg`)}
              </sup>
            )}
            <span className="font-serif text-base not-italic leading-none">
              √
            </span>
            <span className="border-t border-current px-1 pt-0.5 leading-tight">
              {renderAstToReact(node.body, `${key}-rad`)}
            </span>
          </span>
        );
      case "matrix": {
        const leftBr =
          node.env === "pmatrix"
            ? "("
            : node.env === "bmatrix"
              ? "["
              : node.env === "Bmatrix" || node.env === "cases"
                ? "{"
                : node.env === "vmatrix"
                  ? "|"
                  : "";
        const rightBr =
          node.env === "pmatrix"
            ? ")"
            : node.env === "bmatrix"
              ? "]"
              : node.env === "Bmatrix"
                ? "}"
                : node.env === "vmatrix"
                  ? "|"
                  : "";
        return (
          <span
            key={key}
            className="inline-flex items-center align-middle mx-1.5 my-1 not-italic"
          >
            {leftBr && (
              <span className="text-2xl font-light mr-1 select-none">
                {leftBr}
              </span>
            )}
            <span className="inline-grid gap-x-3 gap-y-1 text-sm">
              {node.rows.map((r, rIdx) => (
                <span
                  key={rIdx}
                  className="flex items-center justify-between gap-4"
                >
                  {r.map((cell, cIdx) => (
                    <span key={cIdx} className="text-left">
                      {renderAstToReact(cell, `${key}-r${rIdx}-c${cIdx}`)}
                    </span>
                  ))}
                </span>
              ))}
            </span>
            {rightBr && (
              <span className="text-2xl font-light ml-1 select-none">
                {rightBr}
              </span>
            )}
          </span>
        );
      }
      default:
        return <span key={key}>{node.value || ""}</span>;
    }
  });
}


export { renderAstToReact };
