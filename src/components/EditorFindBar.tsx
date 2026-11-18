import { useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  Replace,
  CaseSensitive,
  WholeWord,
  Regex,
  X,
} from "lucide-react";

const MAX_MATCHES = 4000;

function buildRegex(query, { matchCase, wholeWord, useRegex }) {
  if (!query) return null;
  try {
    if (useRegex) {
      return new RegExp(query, matchCase ? "g" : "gi");
    }
    let escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    if (wholeWord) escaped = `\\b${escaped}\\b`;
    return new RegExp(escaped, matchCase ? "g" : "gi");
  } catch {
    return null;
  }
}

function collectMatches(text, re) {
  if (!re) return [];
  const out = [];
  let m;
  re.lastIndex = 0;
  while ((m = re.exec(text)) !== null) {
    out.push({ start: m.index, end: m.index + m[0].length });
    if (m[0].length === 0) re.lastIndex++;
    if (out.length >= MAX_MATCHES) break;
  }
  return out;
}

function scrollTaToSel(ta) {
  if (!ta) return;
  const pre = ta.value.slice(0, ta.selectionStart);
  const line = pre.split("\n").length - 1;
  const lh = parseFloat(getComputedStyle(ta).lineHeight) || 20;
  const pad = parseFloat(getComputedStyle(ta).paddingTop) || 0;
  ta.scrollTop = Math.max(0, line * lh + pad - ta.clientHeight / 3);
}

export function EditorFindBar({
  open,
  onClose,
  text,
  textareaRef,
  onReplace,
  activeTheme,
  preferReplace = false,
  navRef = null,
}) {
  const [query, setQuery] = useState("");
  const [replacement, setReplacement] = useState("");
  const [showReplace, setShowReplace] = useState(false);
  const [matchCase, setMatchCase] = useState(false);
  const [wholeWord, setWholeWord] = useState(false);
  const [useRegex, setUseRegex] = useState(false);
  const [idx, setIdx] = useState(0);
  const findInputRef = useRef(null);
  const needFirstLand = useRef(true);
  const latestRef = useRef({
    matches: [],
    idx: 0,
    text: "",
  });

  const matches = useMemo(() => {
    const re = buildRegex(query, { matchCase, wholeWord, useRegex });
    return collectMatches(text || "", re);
  }, [text, query, matchCase, wholeWord, useRegex]);

  latestRef.current = { matches, idx, text };

  useEffect(() => {
    if (!open) return;
    if (preferReplace) setShowReplace(true);
    const t = requestAnimationFrame(() => {
      findInputRef.current?.focus();
      findInputRef.current?.select();
    });
    return () => cancelAnimationFrame(t);
  }, [open, preferReplace]);

  useEffect(() => {
    setIdx(0);
    needFirstLand.current = true;
  }, [query, matchCase, wholeWord, useRegex]);

  useEffect(() => {
    setIdx((i) => (matches.length ? Math.min(i, matches.length - 1) : 0));
  }, [matches.length]);

  /** Focus editor + select match so highlight is visible in the README. */
  const selectMatch = (i, list = matches) => {
    const ta = textareaRef?.current;
    const m = list[i];
    if (!ta || !m) return;
    setIdx(i);
    ta.focus();
    ta.setSelectionRange(m.start, m.end);
    scrollTaToSel(ta);
  };

  const go = (dir) => {
    const list = latestRef.current.matches;
    if (!list.length) return;
    let next;
    if (needFirstLand.current) {
      needFirstLand.current = false;
      next = Math.min(latestRef.current.idx, list.length - 1);
    } else {
      next = (latestRef.current.idx + dir + list.length) % list.length;
    }
    selectMatch(next, list);
  };

  if (navRef) navRef.current = { go };

  if (!open) return null;

  const replaceOne = () => {
    const m = matches[idx];
    if (!m) return;
    const before = text.slice(0, m.start);
    const after = text.slice(m.end);
    onReplace(before + replacement + after);
    needFirstLand.current = true;
  };

  const replaceAll = () => {
    const re = buildRegex(query, { matchCase, wholeWord, useRegex });
    if (!re || !query) return;
    onReplace((text || "").replace(re, () => replacement));
  };

  const onFindKey = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      go(e.shiftKey ? -1 : 1);
    } else if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    }
  };

  const toggleCls = (on) =>
    on
      ? `${activeTheme.activeItem} border-transparent`
      : `${activeTheme.cardBg} ${activeTheme.borderRule}`;

  return (
    <div
      className={`absolute top-2 right-2 z-30 w-[min(100%-1rem,320px)] rounded-[2.88px] border shadow-lg ${activeTheme.cardBg} ${activeTheme.borderRule}`}
      role="search"
    >
      <div className="flex items-start gap-1 p-1.5">
        <button
          type="button"
          title="Toggle replace"
          onClick={() => setShowReplace((v) => !v)}
          className={`mt-0.5 p-1 rounded-[2.88px] border ${activeTheme.borderRule}`}
        >
          <ChevronDown
            className={`w-3.5 h-3.5 transition-transform ${showReplace ? "rotate-180" : ""}`}
          />
        </button>

        <div className="flex-1 min-w-0 space-y-1">
          <div
            className={`flex items-center gap-0.5 rounded-[2.88px] border px-1.5 ${activeTheme.borderRule}`}
          >
            <input
              ref={findInputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={onFindKey}
              placeholder="Find"
              className="flex-1 min-w-0 bg-transparent text-xs py-1.5 focus:outline-none"
            />
            <button
              type="button"
              title="Match case"
              onClick={() => setMatchCase((v) => !v)}
              className={`p-0.5 rounded-[2px] border ${toggleCls(matchCase)}`}
            >
              <CaseSensitive className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              title="Whole word"
              onClick={() => setWholeWord((v) => !v)}
              className={`p-0.5 rounded-[2px] border ${toggleCls(wholeWord)}`}
            >
              <WholeWord className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              title="Regex"
              onClick={() => setUseRegex((v) => !v)}
              className={`p-0.5 rounded-[2px] border ${toggleCls(useRegex)}`}
            >
              <Regex className="w-3.5 h-3.5" />
            </button>
          </div>

          {showReplace && (
            <div
              className={`flex items-center gap-0.5 rounded-[2.88px] border px-1.5 ${activeTheme.borderRule}`}
            >
              <input
                value={replacement}
                onChange={(e) => setReplacement(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    replaceOne();
                  } else if (e.key === "Escape") onClose();
                }}
                placeholder="Replace"
                className="flex-1 min-w-0 bg-transparent text-xs py-1.5 focus:outline-none"
              />
              <button
                type="button"
                title="Replace"
                onClick={replaceOne}
                disabled={!matches.length}
                className={`p-0.5 rounded-[2px] border ${activeTheme.borderRule} disabled:opacity-40`}
              >
                <Replace className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                title="Replace all"
                onClick={replaceAll}
                disabled={!matches.length}
                className={`px-1.5 py-0.5 text-[10px] rounded-[2px] border ${activeTheme.borderRule} disabled:opacity-40`}
              >
                All
              </button>
            </div>
          )}
        </div>

        <div className="flex flex-col items-end gap-0.5 shrink-0 pt-0.5">
          <div className="flex items-center gap-0.5">
            <span className={`text-[10px] tabular-nums px-1 ${activeTheme.mutedText}`}>
              {query
                ? matches.length
                  ? `${idx + 1} of ${matches.length}${matches.length >= MAX_MATCHES ? "+" : ""}`
                  : "No results"
                : ""}
            </span>
            <button
              type="button"
              title="Previous"
              onClick={() => go(-1)}
              disabled={!matches.length}
              className={`p-0.5 rounded-[2px] border ${activeTheme.borderRule} disabled:opacity-40`}
            >
              <ChevronUp className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              title="Next"
              onClick={() => go(1)}
              disabled={!matches.length}
              className={`p-0.5 rounded-[2px] border ${activeTheme.borderRule} disabled:opacity-40`}
            >
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              title="Close"
              onClick={onClose}
              className={`p-0.5 rounded-[2px] border ${activeTheme.borderRule}`}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
