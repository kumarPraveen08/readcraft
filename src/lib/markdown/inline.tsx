import { Award } from "lucide-react";
import { MathFormula } from "../../components/MathFormula";

function renderInlineMarkdown(text, refLinks = {}, darkPreview = false) {
  if (!text) return null;
  const elements = [];
  let remaining = text;
  let k = 0;

  const tokenRegex =
    /(\[!\[([^\]]*)\]\(([^)]+)\)\]\(([^)]+)\)|!\[([^\]]*)\]\(([^)]+)\)|\[([^\]]+)\]\(([^)]+)\)|\[([^\]]+)\]\[([^\]]+)\]|(\[\^([^\]]+)\])|\\\((.+?)\\\)|\$([^$\n]+)\$|`([^`]+)`|\*\*\*([^*]+)\*\*\*|\*\*([^*]+)\*\*|<b>([^<]+)<\/b>|~~([^~]+)~~|\*([^*]+)\*)/;

  while (remaining.length > 0) {
    const match = remaining.match(tokenRegex);
    if (!match) {
      elements.push(<span key={k++}>{remaining}</span>);
      break;
    }
    if (match.index > 0) {
      elements.push(<span key={k++}>{remaining.slice(0, match.index)}</span>);
    }

    const full = match[0];
    if (
      match[2] !== undefined &&
      match[3] !== undefined &&
      match[4] !== undefined
    ) {
      elements.push(
        <a
          key={k++}
          href={match[4]}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block mr-1.5 my-0.5 align-middle"
        >
          <img
            src={match[3]}
            alt={match[2]}
            className="inline-block h-5 rounded-none"
          />
        </a>,
      );
    } else if (match[5] !== undefined && match[6] !== undefined) {
      const isStats =
        match[6].includes("github-readme-stats") ||
        match[6].includes("streak-stats") ||
        match[6].includes("komarev.com");
      if (isStats) {
        elements.push(
          <div
            key={k++}
            className="inline-flex items-center gap-2 px-3 py-1.5 m-1 bg-[#cdc6be] text-[#1d1d1b] border border-[#1d1d1b]/40 text-xs"
          >
            <Award className="w-4 h-4 text-[#c03f13] shrink-0" />
            <span>{match[5] || "GitHub Analytics Card"}</span>
          </div>,
        );
      } else {
        elements.push(
          <img
            key={k++}
            src={match[6]}
            alt={match[5]}
            className="inline-block max-h-48 max-w-full mr-1.5 my-1 align-middle rounded-none"
          />,
        );
      }
    } else if (match[7] !== undefined && match[8] !== undefined) {
      elements.push(
        <a
          key={k++}
          href={match[8]}
          target="_blank"
          rel="noopener noreferrer"
          className={`underline decoration-1 underline-offset-[3px] transition-colors ${
            darkPreview
              ? "text-[#e2dedb] hover:text-[#c03f13]"
              : "text-[#1d1d1b] hover:text-[#c03f13]"
          }`}
        >
          {match[7]}
        </a>,
      );
    } else if (match[9] !== undefined && match[10] !== undefined) {
      const refUrl = refLinks[match[10].toLowerCase()] || "#";
      elements.push(
        <a
          key={k++}
          href={refUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={`underline decoration-1 underline-offset-[3px] ${
            darkPreview
              ? "text-[#e2dedb] hover:text-[#c03f13]"
              : "text-[#1d1d1b] hover:text-[#c03f13]"
          }`}
        >
          {match[9]}
        </a>,
      );
    } else if (match[11] !== undefined && match[12] !== undefined) {
      elements.push(
        <sup
          key={k++}
          className="text-[10px] bg-[#c03f13] text-[#e2dedb] rounded-[2.88px] px-1 mx-0.5 cursor-pointer"
        >
          [{match[12]}]
        </sup>,
      );
    } else if (match[13] !== undefined || match[14] !== undefined) {
      elements.push(
        <MathFormula
          key={k++}
          latex={match[13] || match[14]}
          display={false}
          darkPreview={darkPreview}
        />,
      );
    } else if (match[15] !== undefined) {
      elements.push(
        <code
          key={k++}
          className={`px-1.5 py-0.5 mx-0.5 text-xs font-mono rounded-[2.88px] ${
            darkPreview
              ? "bg-[#272624] text-[#e2dedb]"
              : "bg-[#cdc6be] text-[#1d1d1b]"
          }`}
        >
          {match[15]}
        </code>,
      );
    } else if (match[16] !== undefined) {
      elements.push(
        <strong key={k++} className="font-semibold italic">
          {match[16]}
        </strong>,
      );
    } else if (match[17] !== undefined || match[18] !== undefined) {
      elements.push(
        <strong key={k++} className="font-semibold">
          {match[17] || match[18]}
        </strong>,
      );
    } else if (match[19] !== undefined) {
      elements.push(
        <del key={k++} className="line-through opacity-75">
          {match[19]}
        </del>,
      );
    } else if (match[20] !== undefined) {
      elements.push(<em key={k++}>{match[20]}</em>);
    }

    remaining = remaining.slice(match.index + full.length);
  }
  return elements;
}

export { renderInlineMarkdown };
