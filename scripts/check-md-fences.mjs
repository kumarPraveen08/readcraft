/**
 * Runnable check: fence length N only closes on >= N backticks.
 * Run: node scripts/check-md-fences.mjs
 */
function parseFences(markdown) {
  const lines = (markdown || "").split("\n");
  const out = [];
  let i = 0;
  while (i < lines.length) {
    const t = lines[i].trim();
    if (!t) {
      i++;
      continue;
    }
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
      out.push({ type: "code", lang, content: code.join("\n") });
      continue;
    }
    out.push({ type: "p", text: t });
    i++;
  }
  return out;
}

function assert(cond, msg) {
  if (!cond) {
    console.error("FAIL:", msg);
    process.exit(1);
  }
}

const nested = parseFences(`## Install

\`\`\`\`bash
echo \`\`\`
nested fence
\`\`\`
code still here
\`\`\`\`

after`);

assert(nested.length === 3, "expected p + code + after");
assert(nested[1].type === "code" && nested[1].lang === "bash", "lang bash");
assert(
  nested[1].content.includes("```") &&
    nested[1].content.includes("code still here"),
  "inner triple ticks must stay inside 4-tick fence",
);
assert(nested[2].text === "after", "content after fence preserved");

const plain = parseFences("```js\nconsole.log(1)\n```\nok");
assert(plain[0].type === "code" && plain[0].lang === "js", "plain fence");
assert(plain[1].text === "ok", "after plain fence");

console.log("check-md-fences: ok");
