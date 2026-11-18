import {
  LATEX_SYMBOLS,
  BIG_OPERATORS,
  UPRIGHT_FUNCTIONS,
  BLACKBOARD_BOLD,
} from "./symbols";

function readBracedGroup(str, startIdx) {
  let i = startIdx;
  while (i < str.length && /\s/.test(str[i])) i++;
  if (i >= str.length) return { content: "", nextIdx: i };

  if (str[i] === "{") {
    let depth = 1;
    let j = i + 1;
    while (j < str.length && depth > 0) {
      if (str[j] === "\\") {
        j += 2;
        continue;
      }
      if (str[j] === "{") depth++;
      else if (str[j] === "}") depth--;
      j++;
    }
    return { content: str.slice(i + 1, j - 1), nextIdx: j };
  }

  if (str[i] === "\\") {
    let j = i + 1;
    while (j < str.length && /[a-zA-Z]/.test(str[j])) j++;
    if (j === i + 1 && j < str.length) j++;
    return { content: str.slice(i, j), nextIdx: j };
  }

  return { content: str[i], nextIdx: i + 1 };
}

function readOptionalBracket(str, startIdx) {
  let i = startIdx;
  while (i < str.length && /\s/.test(str[i])) i++;
  if (str[i] !== "[") return { content: null, nextIdx: startIdx };
  let depth = 1;
  let j = i + 1;
  while (j < str.length && depth > 0) {
    if (str[j] === "[") depth++;
    else if (str[j] === "]") depth--;
    j++;
  }
  return { content: str.slice(i + 1, j - 1), nextIdx: j };
}

function parseLatexToAst(input) {
  const str = (input || "").trim();
  const nodes = [];
  let i = 0;

  const parseSubSup = (baseNode, currIdx) => {
    let subAst = null;
    let supAst = null;
    let idx = currIdx;

    while (idx < str.length) {
      while (idx < str.length && /\s/.test(str[idx])) idx++;
      if (str[idx] === "_") {
        const g = readBracedGroup(str, idx + 1);
        subAst = parseLatexToAst(g.content);
        idx = g.nextIdx;
      } else if (str[idx] === "^") {
        const g = readBracedGroup(str, idx + 1);
        supAst = parseLatexToAst(g.content);
        idx = g.nextIdx;
      } else if (str[idx] === "'") {
        supAst = [{ type: "text", value: "′" }];
        idx++;
      } else {
        break;
      }
    }

    if (subAst || supAst) {
      if (baseNode.type === "bigop") {
        return {
          node: { ...baseNode, sub: subAst, sup: supAst },
          nextIdx: idx,
        };
      }
      return {
        node: { type: "msubsup", base: baseNode, sub: subAst, sup: supAst },
        nextIdx: idx,
      };
    }
    return { node: baseNode, nextIdx: idx };
  };

  while (i < str.length) {
    const ch = str[i];

    if (/\s/.test(ch)) {
      i++;
      continue;
    }

    if (ch === "{") {
      const g = readBracedGroup(str, i);
      const groupNode = { type: "group", children: parseLatexToAst(g.content) };
      const res = parseSubSup(groupNode, g.nextIdx);
      nodes.push(res.node);
      i = res.nextIdx;
      continue;
    }

    if (ch === "\\") {
      const nextCh = str[i + 1];
      if (nextCh === "," || nextCh === ";" || nextCh === ":") {
        nodes.push({ type: "space", width: 0.25 });
        i += 2;
        continue;
      }
      if (nextCh === "!") {
        i += 2;
        continue;
      }
      if (
        nextCh === "{" ||
        nextCh === "}" ||
        nextCh === "%" ||
        nextCh === "&" ||
        nextCh === "$" ||
        nextCh === "_"
      ) {
        const symNode = { type: "text", value: nextCh };
        const res = parseSubSup(symNode, i + 2);
        nodes.push(res.node);
        i = res.nextIdx;
        continue;
      }
      if (nextCh === "\\") {
        nodes.push({ type: "newline" });
        i += 2;
        continue;
      }

      let j = i + 1;
      while (j < str.length && /[a-zA-Z]/.test(str[j])) j++;
      const cmd = str.slice(i + 1, j);

      if (cmd === "begin") {
        const envGroup = readBracedGroup(str, j);
        const envName = envGroup.content.trim();
        const endTag = `\\end{${envName}}`;
        const endPos = str.indexOf(endTag, envGroup.nextIdx);
        const bodyContent =
          endPos !== -1
            ? str.slice(envGroup.nextIdx, endPos)
            : str.slice(envGroup.nextIdx);
        i = endPos !== -1 ? endPos + endTag.length : str.length;

        const rawRows = bodyContent
          .split(/\\\\/)
          .map((r) => r.trim())
          .filter(Boolean);
        const rows = rawRows.map((r) =>
          r.split("&").map((cell) => parseLatexToAst(cell.trim())),
        );
        nodes.push({
          type: "matrix",
          env: envName.replace("dcases", "cases"),
          rows,
        });
        continue;
      }

      if (
        cmd === "frac" ||
        cmd === "dfrac" ||
        cmd === "tfrac" ||
        cmd === "cfrac"
      ) {
        const numG = readBracedGroup(str, j);
        const denG = readBracedGroup(str, numG.nextIdx);
        const fracNode = {
          type: "frac",
          num: parseLatexToAst(numG.content),
          den: parseLatexToAst(denG.content),
        };
        const res = parseSubSup(fracNode, denG.nextIdx);
        nodes.push(res.node);
        i = res.nextIdx;
        continue;
      }

      if (cmd === "binom") {
        const topG = readBracedGroup(str, j);
        const botG = readBracedGroup(str, topG.nextIdx);
        const binomNode = {
          type: "binom",
          top: parseLatexToAst(topG.content),
          bot: parseLatexToAst(botG.content),
        };
        const res = parseSubSup(binomNode, botG.nextIdx);
        nodes.push(res.node);
        i = res.nextIdx;
        continue;
      }

      if (cmd === "sqrt") {
        const opt = readOptionalBracket(str, j);
        const radG = readBracedGroup(str, opt.nextIdx);
        const sqrtNode = {
          type: "sqrt",
          degree: opt.content ? parseLatexToAst(opt.content) : null,
          body: parseLatexToAst(radG.content),
        };
        const res = parseSubSup(sqrtNode, radG.nextIdx);
        nodes.push(res.node);
        i = res.nextIdx;
        continue;
      }

      if (
        [
          "hat",
          "bar",
          "vec",
          "tilde",
          "dot",
          "ddot",
          "overline",
          "underline",
        ].includes(cmd)
      ) {
        const g = readBracedGroup(str, j);
        const accNode = {
          type: "accent",
          accent: cmd,
          body: parseLatexToAst(g.content),
        };
        const res = parseSubSup(accNode, g.nextIdx);
        nodes.push(res.node);
        i = res.nextIdx;
        continue;
      }

      if (
        [
          "text",
          "textbf",
          "textit",
          "mathrm",
          "mathbf",
          "mathcal",
          "mathbb",
          "operatorname",
        ].includes(cmd)
      ) {
        const g = readBracedGroup(str, j);
        let textVal = g.content;
        if (cmd === "mathbb" && BLACKBOARD_BOLD[textVal.trim()]) {
          textVal = BLACKBOARD_BOLD[textVal.trim()];
        }
        const tNode = {
          type: "styledText",
          style: cmd,
          value: textVal,
        };
        const res = parseSubSup(tNode, g.nextIdx);
        nodes.push(res.node);
        i = res.nextIdx;
        continue;
      }

      if (cmd === "left" || cmd === "right") {
        let k = j;
        while (k < str.length && /\s/.test(str[k])) k++;
        let delim = str[k] || "";
        if (delim === "\\") {
          if (str[k + 1] === "{" || str[k + 1] === "}") {
            delim = str[k + 1];
            k += 2;
          } else {
            let m = k + 1;
            while (m < str.length && /[a-zA-Z]/.test(str[m])) m++;
            const dCmd = str.slice(k + 1, m);
            delim = dCmd === "langle" ? "⟨" : dCmd === "rangle" ? "⟩" : "|";
            k = m;
          }
        } else {
          k++;
        }
        if (delim !== ".") {
          nodes.push({ type: "delim", value: delim });
        }
        i = k;
        continue;
      }

      if (BIG_OPERATORS[cmd]) {
        const opNode = {
          type: "bigop",
          op: BIG_OPERATORS[cmd],
          isWord:
            cmd.startsWith("lim") ||
            cmd === "max" ||
            cmd === "min" ||
            cmd === "sup" ||
            cmd === "inf",
        };
        const res = parseSubSup(opNode, j);
        nodes.push(res.node);
        i = res.nextIdx;
        continue;
      }

      if (UPRIGHT_FUNCTIONS.has(cmd)) {
        const fnNode = { type: "func", name: cmd };
        const res = parseSubSup(fnNode, j);
        nodes.push(res.node);
        i = res.nextIdx;
        continue;
      }

      // Em-spaces — don't rely on canvas measuring "  " (often near-zero)
      if (cmd === "quad") {
        nodes.push({ type: "space", width: 1 });
        i = j;
        continue;
      }
      if (cmd === "qquad") {
        nodes.push({ type: "space", width: 2 });
        i = j;
        continue;
      }
      if (cmd === "enspace") {
        nodes.push({ type: "space", width: 0.5 });
        i = j;
        continue;
      }

      if (LATEX_SYMBOLS[cmd]) {
        const symNode = { type: "symbol", value: LATEX_SYMBOLS[cmd] };
        const res = parseSubSup(symNode, j);
        nodes.push(res.node);
        i = res.nextIdx;
        continue;
      }

      nodes.push({ type: "text", value: cmd });
      i = j;
      continue;
    }

    const isOperator = "+-=<>*/,:;|()[]".includes(ch);
    const baseNode = {
      type: isOperator ? "op" : "var",
      value: ch === "-" ? "−" : ch,
    };
    const res = parseSubSup(baseNode, i + 1);
    nodes.push(res.node);
    i = res.nextIdx;
  }

  return nodes;
}

export { readBracedGroup, readOptionalBracket, parseLatexToAst };
