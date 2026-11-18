import { Palette, Type } from "lucide-react";
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
  return (
    <div className="space-y-5">
      <section className="space-y-2">
        <div className="flex items-center gap-1.5 text-xs font-semibold tracking-wide uppercase opacity-80">
          <Palette className="w-3.5 h-3.5" />
          Theme
        </div>
        <div className="space-y-1">
          {THEME_PRESETS.map((th) => {
            const selected = th.id === themeId;
            return (
              <button
                key={th.id}
                type="button"
                onClick={() => onThemeChange(th)}
                className={`w-full px-2.5 py-2 rounded-[2.88px] border text-left flex items-center gap-2.5 transition-colors ${
                  selected
                    ? `${activeTheme.activeItem} border-transparent`
                    : `${activeTheme.cardBg} ${activeTheme.borderRule} hover:opacity-90`
                }`}
              >
                <div className="flex gap-0.5 shrink-0">
                  {th.swatch.slice(0, 3).map((hex, i) => (
                    <span
                      key={i}
                      style={{ backgroundColor: hex }}
                      className="w-3.5 h-3.5 rounded-[2px] border border-black/20"
                    />
                  ))}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-semibold truncate">{th.name}</div>
                  <div className="text-[10px] opacity-70 truncate">{th.desc}</div>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      <section className={`space-y-2 pt-1 border-t ${activeTheme.borderRule}`}>
        <div className="flex items-center gap-1.5 text-xs font-semibold tracking-wide uppercase opacity-80">
          <Type className="w-3.5 h-3.5" />
          Typeface
        </div>
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
