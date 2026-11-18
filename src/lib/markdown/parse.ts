function parseMarkdownDocument(markdown) {
  const rawLines = (markdown || "").split("\n");
  const refs = {};
  const notes = [];
  const lines = [];

  for (let idx = 0; idx < rawLines.length; idx++) {
    const line = rawLines[idx].trim();
    if (line.startsWith("<!--") && line.endsWith("-->")) continue;
    const fnMatch = line.match(/^\[\^([^\]]+)\]:\s*(.+)$/);
    if (fnMatch) {
      notes.push({ id: fnMatch[1], text: fnMatch[2] });
      continue;
    }
    const refMatch = line.match(/^\[([^\]]+)\]:\s*(\S+)$/);
    if (refMatch) {
      refs[refMatch[1].toLowerCase()] = refMatch[2];
      continue;
    }
    lines.push(rawLines[idx]);
  }

  const out = [];
  let i = 0;
  let center = false;

  while (i < lines.length) {
    const rawLine = lines[i];
    const normLine = rawLine.replace(/\u00A0/g, " ");
    const t = normLine.trim();

    if (
      t === '<div align="center">' ||
      t === "\\begin{document}" ||
      t === "\\end{document}" ||
      t === "\\maketitle"
    ) {
      if (t === '<div align="center">') center = true;
      i++;
      continue;
    }
    if (t === "</div>") {
      center = false;
      i++;
      continue;
    }
    if (!t) {
      i++;
      continue;
    }

    const docClassMatch = t.match(
      /^\\documentclass(?:\[([^\]]*)\])?\{([^}]+)\}/,
    );
    if (docClassMatch) {
      const pkgs = [];
      let nextIdx = i + 1;
      while (
        nextIdx < lines.length &&
        lines[nextIdx].trim().startsWith("\\usepackage")
      ) {
        const pkgM = lines[nextIdx]
          .trim()
          .match(/^\\usepackage(?:\[[^\]]*\])?\{([^}]+)\}/);
        if (pkgM) pkgs.push(pkgM[1]);
        nextIdx++;
      }
      out.push({
        type: "latexPreamble",
        docClass: docClassMatch[2],
        options: docClassMatch[1] || "11pt",
        packages: pkgs,
      });
      i = nextIdx;
      continue;
    }

    const usePkgMatch = t.match(/^\\usepackage(?:\[[^\]]*\])?\{([^}]+)\}/);
    if (usePkgMatch) {
      out.push({
        type: "latexPreamble",
        docClass: "article",
        options: "11pt",
        packages: [usePkgMatch[1]],
      });
      i++;
      continue;
    }

    const secMatch = t.match(
      /^\\(section|subsection|subsubsection)\*?\{([^}]+)\}/,
    );
    if (secMatch) {
      const lvl = secMatch[1];
      out.push({
        type: lvl === "section" ? "h1" : lvl === "subsection" ? "h2" : "h3",
        text: secMatch[2],
        center,
      });
      i++;
      continue;
    }

    const thmMatch = t.match(
      /^\\begin\{(theorem|lemma|proposition|corollary|definition|remark|proof)\}(?:\[([^\]]+)\])?(.*)$/,
    );
    if (thmMatch) {
      const envType = thmMatch[1];
      const optTitle = thmMatch[2] || "";
      const endTag = `\\end{${envType}}`;
      const bodyParts = [];
      if (thmMatch[3]) {
        const inlineRest = thmMatch[3].replace(endTag, "").trim();
        if (inlineRest) bodyParts.push(inlineRest);
      }
      if (!t.includes(endTag)) {
        i++;
        while (i < lines.length && !lines[i].includes(endTag)) {
          bodyParts.push(lines[i].trim());
          i++;
        }
        if (i < lines.length) {
          const beforeEnd = lines[i].replace(endTag, "").trim();
          if (beforeEnd) bodyParts.push(beforeEnd);
          i++;
        }
      } else {
        i++;
      }
      out.push({
        type: "theorem",
        env: envType,
        title: optTitle,
        body: bodyParts.join(" "),
      });
      continue;
    }

    if (t.startsWith("$$") || t.startsWith("\\[")) {
      const closeToken = t.startsWith("$$") ? "$$" : "\\]";
      if (t.endsWith(closeToken) && t.length > closeToken.length * 2) {
        out.push({
          type: "math",
          latex: t.slice(closeToken.length, -closeToken.length).trim(),
        });
        i++;
        continue;
      }
      const mathLines = [];
      if (t.slice(closeToken.length).trim()) {
        mathLines.push(t.slice(closeToken.length).trim());
      }
      i++;
      while (i < lines.length && !lines[i].trim().endsWith(closeToken)) {
        mathLines.push(lines[i]);
        i++;
      }
      if (i < lines.length) {
        const closing = lines[i].trim().slice(0, -closeToken.length).trim();
        if (closing) mathLines.push(closing);
        i++;
      }
      out.push({ type: "math", latex: mathLines.join("\n") });
      continue;
    }

    const envMatch = t.match(
      /^\\begin\{(equation\*?|align\*?|aligned|gather\*?|pmatrix|bmatrix|vmatrix|cases|dcases|matrix)\}/,
    );
    if (envMatch) {
      const envName = envMatch[1];
      const endTag = `\\end{${envName}}`;
      const mathLines = [normLine];
      if (!t.includes(endTag)) {
        i++;
        while (i < lines.length && !lines[i].includes(endTag)) {
          mathLines.push(lines[i]);
          i++;
        }
        if (i < lines.length) {
          mathLines.push(lines[i]);
          i++;
        }
      } else {
        i++;
      }
      const joined = mathLines.join("\n");
      const cleaned =
        envName.startsWith("equation") || envName.startsWith("gather")
          ? joined
              .replace(
                new RegExp(`^\\\\begin\\{${envName.replace("*", "\\*")}\\}`),
                "",
              )
              .replace(
                new RegExp(`\\\\end\\{${envName.replace("*", "\\*")}\\}$`),
                "",
              )
              .trim()
          : joined;
      out.push({ type: "math", latex: cleaned });
      continue;
    }

    // CommonMark-style fences: opening run length N (3+), close only with >= N ticks
    const fenceOpen = t.match(/^(`{3,})(.*)$/);
    if (fenceOpen) {
      const fenceLen = fenceOpen[1].length;
      const lang = fenceOpen[2].trim() || "code";
      const code = [];
      i++;
      while (i < lines.length) {
        const closeLine = lines[i].replace(/\u00A0/g, " ").trim();
        const fenceClose = closeLine.match(/^(`{3,})\s*$/);
        if (fenceClose && fenceClose[1].length >= fenceLen) {
          i++;
          break;
        }
        code.push(lines[i].replace(/\u00A0/g, " "));
        i++;
      }
      if (lang === "math" || lang === "latex" || lang === "tex") {
        out.push({ type: "math", latex: code.join("\n") });
      } else {
        out.push({ type: "code", lang, content: code.join("\n") });
      }
      continue;
    }

    if (t.startsWith("<details>")) {
      let summary = "Details";
      const body = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith("</details>")) {
        const l = lines[i].trim();
        const m = l.match(/<summary>(.*)<\/summary>/);
        if (m) summary = m[1].replace(/<\/?b>/g, "");
        else if (l) body.push(l);
        i++;
      }
      i++;
      out.push({ type: "details", summary, body: body.join(" ") });
      continue;
    }

    if (
      t.startsWith("|") &&
      i + 1 < lines.length &&
      lines[i + 1].trim().startsWith("|")
    ) {
      const tLines = [];
      while (i < lines.length && lines[i].trim().startsWith("|")) {
        tLines.push(lines[i].trim());
        i++;
      }
      const splitRow = (r) =>
        r
          .replace(/^\|/, "")
          .replace(/\|$/, "")
          .split("|")
          .map((c) => c.trim());
      const headers = splitRow(tLines[0]);
      const alignRow = splitRow(tLines[1] || "");
      const alignments = alignRow.map((a) => {
        if (a.startsWith(":") && a.endsWith(":")) return "text-center";
        if (a.endsWith(":")) return "text-right";
        return "text-left";
      });
      out.push({
        type: "table",
        headers,
        alignments,
        rows: tLines.slice(2).map(splitRow),
      });
      continue;
    }

    if (t.startsWith("# ")) {
      out.push({ type: "h1", text: t.slice(2), center });
      i++;
      continue;
    }
    if (t.startsWith("## ")) {
      out.push({ type: "h2", text: t.slice(3), center });
      i++;
      continue;
    }
    if (t.startsWith("### ")) {
      out.push({ type: "h3", text: t.slice(4), center });
      i++;
      continue;
    }
    if (t.startsWith("#### ")) {
      out.push({ type: "h4", text: t.slice(5), center });
      i++;
      continue;
    }
    if (t === "---" || t === "***") {
      out.push({ type: "hr" });
      i++;
      continue;
    }
    if (t.startsWith(">")) {
      const quoteLines = [];
      while (i < lines.length && lines[i].trim().startsWith(">")) {
        const qLine = lines[i].trim().replace(/^>\s?/, "");
        if (qLine) quoteLines.push(qLine);
        i++;
      }
      out.push({ type: "blockquote", lines: quoteLines });
      continue;
    }
    if (/^[-*+]\s/.test(t)) {
      const items = [];
      while (
        i < lines.length &&
        /^(\s*)[-*+]\s/.test(lines[i].replace(/\u00A0/g, " "))
      ) {
        const lineNorm = lines[i].replace(/\u00A0/g, " ");
        const indentMatch = lineNorm.match(/^(\s*)[-*+]\s+(.*)$/);
        const indentSpaces = indentMatch ? indentMatch[1].length : 0;
        const raw = indentMatch
          ? indentMatch[2].trim()
          : lineNorm.trim().slice(2);
        if (raw.startsWith("[x] ") || raw.startsWith("[X] ")) {
          items.push({
            task: true,
            checked: true,
            text: raw.slice(4),
            indent: indentSpaces >= 2,
          });
        } else if (raw.startsWith("[ ] ")) {
          items.push({
            task: true,
            checked: false,
            text: raw.slice(4),
            indent: indentSpaces >= 2,
          });
        } else {
          items.push({ task: false, text: raw, indent: indentSpaces >= 2 });
        }
        i++;
      }
      out.push({ type: "ul", items });
      continue;
    }
    if (/^\d+\.\s/.test(t)) {
      const items = [];
      while (i < lines.length && /^\d+\.\s/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^\d+\.\s+/, ""));
        i++;
      }
      out.push({ type: "ol", items });
      continue;
    }

    out.push({ type: "p", text: t, center });
    i++;
  }

  return { blocks: out, refLinks: refs, footnotes: notes };
}

export { parseMarkdownDocument };
