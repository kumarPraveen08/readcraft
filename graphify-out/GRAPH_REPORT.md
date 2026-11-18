# Graph Report - readcraft  (2026-11-18)

## Corpus Check
- 26 files · ~17,155 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 134 nodes · 168 edges · 15 communities (12 shown, 3 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 13|Community 13]]

## God Nodes (most connected - your core abstractions)
1. `compilerOptions` - 20 edges
2. `compilerOptions` - 15 edges
3. `scripts` - 7 edges
4. `generateHighResPdfWithLatex()` - 7 edges
5. `parseLatexToAst()` - 6 edges
6. `MathFormula()` - 4 edges
7. `FONT_PRESETS` - 4 edges
8. `parseMarkdownDocument()` - 4 edges
9. `measureMathAstOnCanvas()` - 4 edges
10. `drawMathNodeOnCanvas()` - 4 edges

## Surprising Connections (you probably didn't know these)
- `generateHighResPdfWithLatex()` --calls--> `parseLatexToAst()`  [EXTRACTED]
  src/lib/pdf/generatePdf.ts → src/lib/latex/parse.ts
- `App()` --calls--> `useDebouncedValue()`  [EXTRACTED]
  src/App.tsx → src/hooks/useDebouncedValue.ts
- `MathFormula()` --calls--> `renderAstToReact()`  [EXTRACTED]
  src/components/MathFormula.tsx → src/lib/latex/render.tsx
- `generateHighResPdfWithLatex()` --calls--> `parseMarkdownDocument()`  [EXTRACTED]
  src/lib/pdf/generatePdf.ts → src/lib/markdown/parse.ts
- `generateHighResPdfWithLatex()` --calls--> `yieldToMain()`  [EXTRACTED]
  src/lib/pdf/generatePdf.ts → src/lib/perf.ts

## Import Cycles
- None detected.

## Communities (15 total, 3 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.09
Nodes (21): compilerOptions, allowArbitraryExtensions, allowImportingTsExtensions, erasableSyntaxOnly, jsx, lib, module, moduleDetection (+13 more)

### Community 1 - "Community 1"
Cohesion: 0.23
Nodes (8): SettingsPanel(), FONT_PRESETS, buildSectionsFromLibrary(), DEFAULT_SECTION_LIBRARY, THEME_PRESETS, useDebouncedValue(), safeLocalStorageSet(), App()

### Community 2 - "Community 2"
Cohesion: 0.12
Nodes (16): compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, lib, module, moduleDetection, noEmit, noFallthroughCasesInSwitch (+8 more)

### Community 3 - "Community 3"
Cohesion: 0.12
Nodes (15): dependencies, lucide-react, react, react-dom, name, private, scripts, build (+7 more)

### Community 4 - "Community 4"
Cohesion: 0.20
Nodes (10): devDependencies, oxlint, tailwindcss, @tailwindcss/vite, @types/node, @types/react, @types/react-dom, typescript (+2 more)

### Community 5 - "Community 5"
Cohesion: 0.40
Nodes (7): yieldToMain(), parseMarkdownDocument(), drawMathAstOnCanvas(), drawMathNodeOnCanvas(), generateHighResPdfWithLatex(), measureMathAstOnCanvas(), measureMathNodeOnCanvas()

### Community 6 - "Community 6"
Cohesion: 0.33
Nodes (5): MarkdownPreview(), MemoMarkdownPreview, MathFormula(), renderAstToReact(), renderInlineMarkdown()

### Community 7 - "Community 7"
Cohesion: 0.33
Nodes (5): plugins, rules, react/only-export-components, react/rules-of-hooks, $schema

### Community 9 - "Community 9"
Cohesion: 0.50
Nodes (3): Expanding the Oxlint configuration, React Compiler, React + TypeScript + Vite

### Community 13 - "Community 13"
Cohesion: 0.39
Nodes (7): parseLatexToAst(), readBracedGroup(), readOptionalBracket(), BIG_OPERATORS, BLACKBOARD_BOLD, LATEX_SYMBOLS, UPRIGHT_FUNCTIONS

## Knowledge Gaps
- **70 isolated node(s):** `$schema`, `plugins`, `react/rules-of-hooks`, `react/only-export-components`, `name` (+65 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **3 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `devDependencies` connect `Community 4` to `Community 3`?**
  _High betweenness centrality (0.021) - this node is a cross-community bridge._
- **What connects `$schema`, `plugins`, `react/rules-of-hooks` to the rest of the system?**
  _70 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.09090909090909091 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.11764705882352941 - nodes in this community are weakly interconnected._
- **Should `Community 3` be split into smaller, more focused modules?**
  _Cohesion score 0.125 - nodes in this community are weakly interconnected._