import { useMemo, useState } from "react";
import {
  Palette,
  Type,
  Search,
  Sun,
  Moon,
  LayoutGrid,
  ChevronDown,
} from "lucide-react";
import { THEME_PRESETS } from "../data/themes";
import { FONT_PRESETS } from "../data/fonts";

export function SettingsPanel({
  themeId,
  fontId,
  editorFontSize,
  activeTheme,
  onThemeChange,
  onFontChange,
  onFontSizeChange,
}) {
  const [themeQuery, setThemeQuery] = useState("");
  const [tone, setTone] = useState("all"); // all | light | dark
  const [themeOpen, setThemeOpen] = useState(false);
  const [typefaceOpen, setTypefaceOpen] = useState(false);

  const activeFont = useMemo(
    () => FONT_PRESETS.find((f) => f.id === fontId) || FONT_PRESETS[0],
    [fontId],
  );

  const filteredThemes = useMemo(() => {
    const q = themeQuery.trim().toLowerCase();
    return THEME_PRESETS.filter((th) => {
      if (tone === "light" && th.isDark) return false;
      if (tone === "dark" && !th.isDark) return false;
      if (!q) return true;
      return (
        th.name.toLowerCase().includes(q) ||
        th.desc.toLowerCase().includes(q) ||
        th.id.toLowerCase().includes(q)
      );
    });
  }, [themeQuery, tone]);

  return (
    <div className="space-y-4">
      <section className="space-y-2">
        <button
          type="button"
          onClick={() => setThemeOpen((o) => !o)}
          aria-expanded={themeOpen}
          className="w-full flex items-center justify-between gap-2 text-left"
        >
          <div className="flex items-center gap-1.5 text-xs font-semibold tracking-wide uppercase opacity-80 min-w-0">
            <Palette className="w-3.5 h-3.5 shrink-0" />
            <span>Theme</span>
            {!themeOpen && (
              <span className={`normal-case tracking-normal font-medium truncate ${activeTheme.mutedText}`}>
                · {activeTheme.name}
              </span>
            )}
          </div>
          <ChevronDown
            className={`w-3.5 h-3.5 shrink-0 opacity-60 transition-transform ${themeOpen ? "rotate-180" : ""}`}
          />
        </button>

        {themeOpen && (
          <div className="space-y-2.5">
            <div
              className={`flex items-center gap-1.5 px-2 py-1.5 rounded-[2.88px] border ${activeTheme.borderRule} ${activeTheme.cardBg}`}
            >
              <Search
                className={`w-3.5 h-3.5 shrink-0 ${activeTheme.mutedText}`}
              />
              <input
                type="search"
                value={themeQuery}
                onChange={(e) => setThemeQuery(e.target.value)}
                placeholder="Search themes…"
                className="w-full bg-transparent text-xs focus:outline-none placeholder:opacity-50"
              />
            </div>

            <div className="grid grid-cols-3 gap-1">
              {[
                { id: "all", label: "All", icon: LayoutGrid },
                { id: "light", label: "Light", icon: Sun },
                { id: "dark", label: "Dark", icon: Moon },
              ].map(({ id, label, icon: Icon }) => {
                const on = tone === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setTone(id)}
                    className={`flex items-center justify-center gap-1 py-1.5 rounded-[2.88px] border text-[11px] transition-colors ${
                      on
                        ? `${activeTheme.activeItem} border-transparent`
                        : `${activeTheme.cardBg} ${activeTheme.borderRule}`
                    }`}
                  >
                    <Icon className="w-3 h-3" />
                    {label}
                  </button>
                );
              })}
            </div>

            {/* Padding inside scroll so selected ring (box-shadow) isn't clipped */}
            <div className="max-h-[min(52vh,420px)] overflow-y-auto no-scrollbar">
              <div className="grid grid-cols-1 gap-1.5 p-1">
                {filteredThemes.length === 0 ? (
                  <div
                    className={`px-3 py-4 text-center text-xs rounded-[2.88px] border ${activeTheme.borderRule} ${activeTheme.mutedText}`}
                  >
                    No themes match “{themeQuery}”
                  </div>
                ) : (
                  filteredThemes.map((th) => {
                    const selected = th.id === themeId;
                    const [bg, card, text, accent] = th.swatch;
                    return (
                      <button
                        key={th.id}
                        type="button"
                        title={th.desc}
                        onClick={() => onThemeChange(th)}
                        style={{
                          backgroundColor: bg,
                          color: accent,
                          boxShadow: selected
                            ? `0 0 0 2px ${accent}`
                            : `0 0 0 1px ${card}`,
                        }}
                        className="group relative w-full px-2.5 py-2.5 rounded-[6px] text-center transition-[box-shadow,transform] duration-150 hover:scale-[1.01]"
                      >
                        <span className="text-xs font-semibold tracking-wide">
                          {th.name}
                        </span>
                        <span
                          className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-0.5 opacity-70 group-hover:opacity-100"
                          aria-hidden
                        >
                          {[card, text, accent].map((hex, i) => (
                            <span
                              key={i}
                              style={{ backgroundColor: hex }}
                              className="w-2.5 h-2.5 rounded-full border border-black/15"
                            />
                          ))}
                        </span>
                        {selected && (
                          <span
                            className="absolute left-2 top-1/2 -translate-y-1/2 text-[9px] font-bold uppercase tracking-wider opacity-80"
                            style={{ color: text }}
                          >
                            on
                          </span>
                        )}
                      </button>
                    );
                  })
                )}
              </div>
            </div>
            <div className={`text-[10px] text-right ${activeTheme.mutedText}`}>
              {filteredThemes.length}/{THEME_PRESETS.length}
            </div>
          </div>
        )}
      </section>

      <section className={`space-y-2 pt-1 border-t ${activeTheme.borderRule}`}>
        <button
          type="button"
          onClick={() => setTypefaceOpen((o) => !o)}
          aria-expanded={typefaceOpen}
          className="w-full flex items-center justify-between gap-2 text-left"
        >
          <div className="flex items-center gap-1.5 text-xs font-semibold tracking-wide uppercase opacity-80 min-w-0">
            <Type className="w-3.5 h-3.5 shrink-0" />
            <span>Typeface</span>
            {!typefaceOpen && (
              <span className={`normal-case tracking-normal font-medium truncate ${activeTheme.mutedText}`}>
                · {activeFont.name}
              </span>
            )}
          </div>
          <ChevronDown
            className={`w-3.5 h-3.5 shrink-0 opacity-60 transition-transform ${typefaceOpen ? "rotate-180" : ""}`}
          />
        </button>

        {typefaceOpen && (
          <div className="space-y-1">
            {FONT_PRESETS.map((fp) => {
              const selected = fp.id === fontId;
              return (
                <button
                  key={fp.id}
                  type="button"
                  onClick={() => onFontChange(fp.id)}
                  className={`w-full px-2.5 py-2 rounded-[2.88px] border text-left transition-colors ${
                    selected
                      ? `${activeTheme.activeItem} border-transparent`
                      : `${activeTheme.cardBg} ${activeTheme.borderRule} hover:opacity-90`
                  }`}
                >
                  <div className={`text-xs ${fp.headingClass}`}>{fp.name}</div>
                  <div className="text-[10px] opacity-70 mt-0.5">{fp.desc}</div>
                </button>
              );
            })}
          </div>
        )}
      </section>

      <section className={`space-y-2 pt-1 border-t ${activeTheme.borderRule}`}>
        <div className="text-xs font-semibold tracking-wide uppercase opacity-80">
          Editor size
        </div>
        <div className="grid grid-cols-4 gap-1">
          {[12, 14, 16, 18].map((sz) => (
            <button
              key={sz}
              type="button"
              onClick={() => onFontSizeChange(sz)}
              className={`py-1.5 rounded-[2.88px] border text-xs ${
                editorFontSize === sz
                  ? `${activeTheme.activeItem} border-transparent`
                  : `${activeTheme.cardBg} ${activeTheme.borderRule}`
              }`}
            >
              {sz}
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
