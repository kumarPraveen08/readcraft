import {
  useState,
  useEffect,
  useMemo,
  useRef,
  useDeferredValue,
  useCallback,
} from "react";
import {
  FileText,
  Plus,
  Trash2,
  Copy,
  Check,
  Download,
  LayoutTemplate,
  ChevronUp,
  ChevronDown,
  Search,
  Eye,
  Code2,
  Columns,
  RotateCcw,
  Bookmark,
  CheckCircle2,
  Sun,
  Moon,
  FileCode,
  FileJson,
  FileType,
  Printer,
  Layers,
  GripVertical,
  ChevronDown as CaretDown,
  ChevronLeft,
  FolderPlus,
  Edit3,
  Settings,
  X,
  Loader2,
} from "lucide-react";
import { DEFAULT_SECTION_LIBRARY, buildSectionsFromLibrary } from "./data/sectionLibrary";
import { THEME_PRESETS } from "./data/themes";
import { FONT_PRESETS } from "./data/fonts";
import { MarkdownPreview } from "./components/MarkdownPreview";
import { SettingsPanel } from "./components/SettingsPanel";
import { EditorFindBar } from "./components/EditorFindBar";
import { generateHighResPdfWithLatex } from "./lib/pdf/generatePdf";
import { safeLocalStorageSet } from "./lib/perf";
import { useDebouncedValue } from "./hooks/useDebouncedValue";

const MAX_SAVED_DOCS = 8;
const AUTOSAVE_MS = 1200;
const DOC_COMMIT_MS = 350;

export default function App() {
  const [, setKatexReady] = useState(false);

  useEffect(() => {
    if (typeof document === "undefined") return;
    if (!document.getElementById("miranda-editorial-fonts")) {
      const fontLink = document.createElement("link");
      fontLink.id = "miranda-editorial-fonts";
      fontLink.rel = "stylesheet";
      fontLink.href =
        "https://fonts.googleapis.com/css2?family=Bodoni+Moda:opsz,wght@6..96,700;6..96,900&family=Playfair+Display:ital,wght@0,500;0,700;1,400&family=Source+Serif+4:ital,opsz,wght@0,8..60,300;0,8..60,400;0,8..60,600;1,8..60,300;1,8..60,400&display=swap";
      document.head.appendChild(fontLink);
    }
    if (!document.getElementById("fontshare-cabinet-satoshi")) {
      const fsLink = document.createElement("link");
      fsLink.id = "fontshare-cabinet-satoshi";
      fsLink.rel = "stylesheet";
      fsLink.href =
        "https://api.fontshare.com/v2/css?f[]=cabinet-grotesk@800,900&f[]=satoshi@500,700&display=swap";
      document.head.appendChild(fsLink);
    }
    if (!document.getElementById("katex-css")) {
      const link = document.createElement("link");
      link.id = "katex-css";
      link.rel = "stylesheet";
      link.href =
        "https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css";
      document.head.appendChild(link);
    }
    if (!document.getElementById("katex-js")) {
      const script = document.createElement("script");
      script.id = "katex-js";
      script.src =
        "https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js";
      script.onload = () => setKatexReady(true);
      document.head.appendChild(script);
    }
  }, []);

  // Settings State: Theme Preset, Font Preset, Editor Font Size
  const [themeId, setThemeId] = useState(() => {
    try {
      return localStorage.getItem("readcraft_theme_id_v6") || "miranda-light";
    } catch (e) {
      return "miranda-light";
    }
  });

  const [fontId, setFontId] = useState(() => {
    try {
      return localStorage.getItem("readcraft_font_id_v6") || "editorial";
    } catch (e) {
      return "editorial";
    }
  });

  const [editorFontSize, setEditorFontSize] = useState(14);
  const [pdfMarginPt, setPdfMarginPt] = useState(() => {
    try {
      const n = Number(localStorage.getItem("readcraft_pdf_margin_pt_v6"));
      return Number.isFinite(n) && n >= 24 && n <= 96 ? n : 48;
    } catch {
      return 48;
    }
  });

  const activeTheme = useMemo(
    () => THEME_PRESETS.find((t) => t.id === themeId) || THEME_PRESETS[0],
    [themeId],
  );

  const activeFont = useMemo(
    () => FONT_PRESETS.find((f) => f.id === fontId) || FONT_PRESETS[0],
    [fontId],
  );

  const [darkPreview, setDarkPreview] = useState(false);

  useEffect(() => {
    safeLocalStorageSet("readcraft_theme_id_v6", themeId);
  }, [themeId]);

  useEffect(() => {
    safeLocalStorageSet("readcraft_font_id_v6", fontId);
  }, [fontId]);

  useEffect(() => {
    safeLocalStorageSet("readcraft_pdf_margin_pt_v6", String(pdfMarginPt));
  }, [pdfMarginPt]);

  // Custom User-Created Section Library Items
  const [customLibrarySections, setCustomLibrarySections] = useState(() => {
    try {
      const saved = localStorage.getItem("readcraft_custom_sections_v6");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {}
    return [];
  });

  useEffect(() => {
    safeLocalStorageSet(
      "readcraft_custom_sections_v6",
      JSON.stringify(customLibrarySections),
    );
  }, [customLibrarySections]);

  const allLibrarySections = useMemo(
    () => [...customLibrarySections, ...DEFAULT_SECTION_LIBRARY],
    [customLibrarySections],
  );

  // Templates — EMPTY BY DEFAULT
  const [customTemplates, setCustomTemplates] = useState(() => {
    try {
      const saved = localStorage.getItem("readcraft_user_only_templates_v6");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {}
    return [];
  });

  useEffect(() => {
    safeLocalStorageSet(
      "readcraft_user_only_templates_v6",
      JSON.stringify(customTemplates),
    );
  }, [customTemplates]);

  // Current Working Document
  const [currentDoc, setCurrentDoc] = useState(() => {
    try {
      const saved = localStorage.getItem("readcraft_current_doc_v6");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && Array.isArray(parsed.sections)) return parsed;
      }
    } catch (e) {}
    return {
      id: "doc-1",
      title: "README.md",
      updatedAt: "Just now",
      sections: buildSectionsFromLibrary(["hello-world"]),
    };
  });

  // Saved READMEs List
  const [savedDocs, setSavedDocs] = useState(() => {
    try {
      const saved = localStorage.getItem("readcraft_autosaved_docs_v6");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed.slice(0, MAX_SAVED_DOCS);
      }
    } catch (e) {}
    return [];
  });

  const [storageWarning, setStorageWarning] = useState(false);
  const [pdfJob, setPdfJob] = useState(null); // { progress, label } | null
  const pdfAbortRef = useRef(null);
  // Native Ctrl+A on huge textareas freezes the browser; use logical select instead.
  const [editorAllSelected, setEditorAllSelected] = useState(false);
  const [findOpen, setFindOpen] = useState(false);
  const [findPreferReplace, setFindPreferReplace] = useState(false);
  const editorTaRef = useRef(null);
  const findNavRef = useRef(null);
  const [isFileDragOver, setIsFileDragOver] = useState(false);
  const fileDragDepthRef = useRef(0);
  const HUGE_EDITOR_CHARS = 50000;

  // Debounced persistence — never JSON.stringify huge docs on every keystroke
  const debouncedDoc = useDebouncedValue(currentDoc, AUTOSAVE_MS);
  useEffect(() => {
    if (!debouncedDoc?.id) return;
    const ok = safeLocalStorageSet(
      "readcraft_current_doc_v6",
      JSON.stringify(debouncedDoc),
    );
    if (!ok) setStorageWarning(true);

    setSavedDocs((prev) => {
      const snapshot = { ...debouncedDoc, updatedAt: "Auto-saved" };
      const without = prev.filter((d) => d.id !== debouncedDoc.id);
      return [snapshot, ...without].slice(0, MAX_SAVED_DOCS);
    });
  }, [debouncedDoc]);

  const debouncedSavedDocs = useDebouncedValue(savedDocs, AUTOSAVE_MS);
  useEffect(() => {
    const ok = safeLocalStorageSet(
      "readcraft_autosaved_docs_v6",
      JSON.stringify(debouncedSavedDocs),
    );
    if (!ok) setStorageWarning(true);
  }, [debouncedSavedDocs]);

  const [selectedSecId, setSelectedSecId] = useState(
    () => currentDoc?.sections?.[0]?.id || null,
  );

  useEffect(() => {
    if (currentDoc?.sections?.length > 0) {
      if (!currentDoc.sections.some((s) => s.id === selectedSecId)) {
        setSelectedSecId(currentDoc.sections[0].id);
      }
    } else {
      setSelectedSecId(null);
    }
  }, [currentDoc]);

  // DEFAULT TAB IS FREE-FORM ('freeform') AND LEFT DRAWER IS CLOSED BY DEFAULT (false)!
  const [activeNav, setActiveNav] = useState("freeform"); // 'freeform' | 'sections' | 'templates' | 'saved' | 'settings'
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [viewMode, setViewMode] = useState("split");
  const [searchQuery, setSearchQuery] = useState("");
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [toast, setToast] = useState(null);
  const [editorDraft, setEditorDraft] = useState(() =>
    (currentDoc?.sections || []).map((s) => s.markdown).join("\n\n"),
  );
  const editorDocIdRef = useRef(currentDoc?.id);
  const skipDraftSyncRef = useRef(false);

  const [isRenamingCurrent, setIsRenamingCurrent] = useState(false);
  const [renameCurrentVal, setRenameCurrentVal] = useState(currentDoc.title);
  const [renamingSavedId, setRenamingSavedId] = useState(null);
  const [renameSavedVal, setRenameSavedVal] = useState("");

  const [showNewLibSecForm, setShowNewLibSecForm] = useState(false);
  const [newLibSecName, setNewLibSecName] = useState("");
  const [newLibSecMarkdown, setNewLibSecMarkdown] = useState("");

  const [showNewTemplateForm, setShowNewTemplateForm] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState("");

  const [editorWidthPct, setEditorWidthPct] = useState(50);
  const [isDraggingSplit, setIsDraggingSplit] = useState(false);
  const splitContainerRef = useRef(null);
  const exportMenuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target)) {
        setExportMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!isDraggingSplit) return;

    const handleMove = (clientX) => {
      if (!splitContainerRef.current) return;
      const rect = splitContainerRef.current.getBoundingClientRect();
      const relX = clientX - rect.left;
      const pct = Math.min(78, Math.max(22, (relX / rect.width) * 100));
      setEditorWidthPct(Math.round(pct));
    };

    const onMouseMove = (e) => handleMove(e.clientX);
    const onTouchMove = (e) => {
      if (e.touches?.[0]) handleMove(e.touches[0].clientX);
    };
    const onStop = () => setIsDraggingSplit(false);

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onStop);
    window.addEventListener("touchmove", onTouchMove);
    window.addEventListener("touchend", onStop);

    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onStop);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onStop);
    };
  }, [isDraggingSplit]);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast((t) => (t === msg ? null : t)), 2200);
  };

  const activeSection = useMemo(
    () =>
      currentDoc?.sections?.find((s) => s.id === selectedSecId) ||
      currentDoc?.sections?.[0] ||
      null,
    [currentDoc, selectedSecId],
  );

  const committedMarkdown = useMemo(
    () => (currentDoc?.sections || []).map((s) => s.markdown).join("\n\n"),
    [currentDoc],
  );

  // Sync textarea only when doc / mode / section identity changes (not every keystroke commit)
  useEffect(() => {
    if (skipDraftSyncRef.current) {
      skipDraftSyncRef.current = false;
      return;
    }
    editorDocIdRef.current = currentDoc?.id;
    if (activeNav === "freeform") {
      setEditorDraft(
        (currentDoc?.sections || []).map((s) => s.markdown).join("\n\n"),
      );
    } else {
      setEditorDraft(activeSection?.markdown || "");
    }
  }, [currentDoc?.id, activeNav, activeSection?.id]);

  const isFreeFormMode = activeNav === "freeform";
  const liveEditorText = editorDraft;

  // Preview/export always show the full doc; section mode only edits one slice.
  const liveDocumentText = useMemo(() => {
    if (isFreeFormMode) return editorDraft;
    return (currentDoc?.sections || [])
      .map((s) => (s.id === activeSection?.id ? editorDraft : s.markdown))
      .join("\n\n");
  }, [isFreeFormMode, editorDraft, currentDoc?.sections, activeSection?.id]);

  // Live preview for normal docs. Only defer when the doc is huge so typing
  // stays smooth — useDeferredValue otherwise waits until you pause typing.
  const deferredHugePreview = useDeferredValue(liveDocumentText);
  const previewMd =
    (liveDocumentText?.length || 0) >= HUGE_EDITOR_CHARS
      ? deferredHugePreview
      : liveDocumentText;

  const lineCount = useMemo(() => {
    const t = liveEditorText || "";
    if (!t) return 0;
    let n = 1;
    for (let i = 0; i < t.length; i++) if (t.charCodeAt(i) === 10) n++;
    return n;
  }, [liveEditorText]);

  const updateCurrentDoc = useCallback((updater) => {
    setCurrentDoc((prev) => {
      const next = updater(prev);
      return { ...next, updatedAt: "Auto-saved" };
    });
  }, []);

  const editScopeRef = useRef("");
  editScopeRef.current = `${currentDoc?.id}|${isFreeFormMode ? "ff" : "sec"}|${activeSection?.id || ""}`;

  // Debounced commit — ignore stale timers after doc/section/mode switches
  useEffect(() => {
    const scope = editScopeRef.current;
    const text = liveEditorText;
    const timer = setTimeout(() => {
      if (editScopeRef.current !== scope) return;
      if (isFreeFormMode) {
        const current = (currentDoc?.sections || [])
          .map((s) => s.markdown)
          .join("\n\n");
        if (text === current) return;
        skipDraftSyncRef.current = true;
        updateCurrentDoc((d) => ({
          ...d,
          sections: [
            {
              id: d.sections?.[0]?.id || `sec-freeform-${Date.now()}`,
              slug: "freeform",
              name: "Document",
              markdown: text,
            },
          ],
        }));
        return;
      }
      if (!activeSection || text === activeSection.markdown) return;
      skipDraftSyncRef.current = true;
      const secId = activeSection.id;
      updateCurrentDoc((d) => ({
        ...d,
        sections: d.sections.map((s) =>
          s.id === secId ? { ...s, markdown: text } : s,
        ),
      }));
    }, DOC_COMMIT_MS);
    return () => clearTimeout(timer);
  }, [
    liveEditorText,
    isFreeFormMode,
    activeSection?.id,
    activeSection?.markdown,
    currentDoc?.sections,
    updateCurrentDoc,
  ]);

  const handleEditorChange = (val) => {
    setEditorAllSelected(false);
    setEditorDraft(val);
  };

  const writeClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      try {
        const ta = document.createElement("textarea");
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
        return true;
      } catch {
        return false;
      }
    }
  };

  const openFind = (withReplace = false) => {
    setFindPreferReplace(withReplace);
    setFindOpen(true);
  };

  // Cmd/Ctrl+F|H even when focus isn't in the textarea
  useEffect(() => {
    if (viewMode !== "split" && viewMode !== "editor") return;
    const onKey = (e) => {
      const mod = e.metaKey || e.ctrlKey;
      const k = e.key.toLowerCase();
      if (!mod) return;
      if (k === "f") {
        e.preventDefault();
        openFind(false);
      } else if (k === "h") {
        e.preventDefault();
        openFind(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [viewMode]);

  const handleEditorKeyDown = (e) => {
    const mod = e.metaKey || e.ctrlKey;
    const huge = (editorDraft?.length || 0) >= HUGE_EDITOR_CHARS;
    const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;

    if (e.key === "Escape" && findOpen) {
      e.preventDefault();
      setFindOpen(false);
      return;
    }

    // Keep stepping matches while the editor holds focus (for visible highlight)
    if (findOpen && (e.key === "Enter" || e.key === "F3")) {
      e.preventDefault();
      findNavRef.current?.go(e.shiftKey ? -1 : 1);
      return;
    }

    if (mod && key === "a") {
      if (!huge) return;
      e.preventDefault();
      setEditorAllSelected(true);
      const el = e.currentTarget;
      const pos = el.selectionStart ?? 0;
      // Collapse any accidental native mega-selection (painting it freezes the tab)
      requestAnimationFrame(() => {
        try {
          el.setSelectionRange(pos, pos);
        } catch {
          /* ignore */
        }
      });
      return;
    }

    if (editorAllSelected && mod && key === "c") {
      e.preventDefault();
      writeClipboard(editorDraft).then((ok) => {
        if (ok) showToast("Copied all");
      });
      return;
    }

    if (editorAllSelected && mod && key === "x") {
      e.preventDefault();
      writeClipboard(editorDraft).then((ok) => {
        if (ok) {
          setEditorDraft("");
          setEditorAllSelected(false);
          showToast("Cut all");
        }
      });
      return;
    }

    if (editorAllSelected && (e.key === "Backspace" || e.key === "Delete")) {
      e.preventDefault();
      setEditorDraft("");
      setEditorAllSelected(false);
      return;
    }

    if (editorAllSelected && !mod && e.key.length === 1 && !e.altKey) {
      e.preventDefault();
      setEditorDraft(e.key);
      setEditorAllSelected(false);
    }
  };

  // Immediate commit used by inserts / structural edits
  const commitFreeFormMarkdown = (val) => {
    setEditorDraft(val);
    skipDraftSyncRef.current = true;
    updateCurrentDoc((d) => ({
      ...d,
      sections: [
        {
          id: d.sections?.[0]?.id || `sec-freeform-${Date.now()}`,
          slug: "freeform",
          name: "Document",
          markdown: val,
        },
      ],
    }));
  };

  const isImportableTextFile = (file) => {
    if (!file) return false;
    const name = (file.name || "").toLowerCase();
    if (/\.(md|markdown|txt|mdx)$/.test(name)) return true;
    return (
      typeof file.type === "string" &&
      (file.type === "text/markdown" ||
        file.type === "text/plain" ||
        file.type === "text/x-markdown")
    );
  };

  const importMarkdownFile = async (file) => {
    if (!isImportableTextFile(file)) {
      showToast("Drop a .md, .markdown, or .txt file");
      return;
    }
    try {
      const text = await file.text();
      const baseName = (file.name || "README.md").replace(/\.(markdown|mdx|txt)$/i, ".md");
      const title = /\.md$/i.test(baseName) ? baseName : `${baseName}.md`;
      setEditorAllSelected(false);
      setActiveNav("freeform");
      setDrawerOpen(false);
      setRenameCurrentVal(title);
      skipDraftSyncRef.current = true;
      setEditorDraft(text);
      updateCurrentDoc((d) => ({
        ...d,
        title,
        sections: [
          {
            id: d.sections?.[0]?.id || `sec-freeform-${Date.now()}`,
            slug: "freeform",
            name: "Document",
            markdown: text,
          },
        ],
      }));
      showToast(`Opened ${file.name}`);
    } catch {
      showToast("Could not read that file");
    }
  };

  const onWorkspaceDragEnter = (e) => {
    if (![...e.dataTransfer.types].includes("Files")) return;
    e.preventDefault();
    fileDragDepthRef.current += 1;
    setIsFileDragOver(true);
  };

  const onWorkspaceDragOver = (e) => {
    if (![...e.dataTransfer.types].includes("Files")) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  };

  const onWorkspaceDragLeave = (e) => {
    if (![...e.dataTransfer.types].includes("Files")) return;
    e.preventDefault();
    fileDragDepthRef.current = Math.max(0, fileDragDepthRef.current - 1);
    if (fileDragDepthRef.current === 0) setIsFileDragOver(false);
  };

  const onWorkspaceDrop = (e) => {
    e.preventDefault();
    fileDragDepthRef.current = 0;
    setIsFileDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) importMarkdownFile(file);
  };

  const handleInsertFreeFormSnippet = (snippetText, label) => {
    const base = editorDraft || committedMarkdown;
    const nextMd = base ? `${base.replace(/\s+$/, "")}\n\n${snippetText}\n` : snippetText;
    commitFreeFormMarkdown(nextMd);
    showToast(`Inserted ${label}`);
  };

  const fullMarkdown = liveDocumentText;

  const handleAddSection = (tpl) => {
    const newSec = {
      id: `sec-${tpl.slug}-${Date.now()}`,
      slug: tpl.slug,
      name: tpl.name,
      markdown: tpl.markdown,
    };
    updateCurrentDoc((d) => ({ ...d, sections: [...d.sections, newSec] }));
    setSelectedSecId(newSec.id);
    showToast(`Added ${tpl.name}`);
  };

  const handleAddCustomSection = () => {
    const newSec = {
      id: `sec-custom-${Date.now()}`,
      slug: "custom",
      name: "Custom Section",
      markdown: `## Custom Section\n\nWrite your content here...`,
    };
    updateCurrentDoc((d) => ({ ...d, sections: [...d.sections, newSec] }));
    setSelectedSecId(newSec.id);
  };

  const handleSaveCustomLibrarySection = (e) => {
    e.preventDefault();
    const cleanName = newLibSecName.trim();
    if (!cleanName) {
      showToast("Please enter a section name");
      return;
    }
    const slug = `user-sec-${Date.now()}`;
    const md =
      newLibSecMarkdown.trim() ||
      `## ${cleanName}\n\nDescribe ${cleanName.toLowerCase()} details here.`;
    const customItem = {
      slug,
      name: cleanName,
      markdown: md,
      isCustom: true,
    };
    setCustomLibrarySections((prev) => [customItem, ...prev]);
    handleAddSection(customItem);
    setNewLibSecName("");
    setNewLibSecMarkdown("");
    setShowNewLibSecForm(false);
    showToast(`Saved "${cleanName}" to Section List!`);
  };

  const handleDeleteCustomLibrarySection = (slug, e) => {
    e.stopPropagation();
    setCustomLibrarySections((prev) =>
      prev.filter((item) => item.slug !== slug),
    );
    showToast("Removed custom section from library");
  };

  const handleSaveCustomTemplate = (e) => {
    e.preventDefault();
    const title =
      newTemplateName.trim() || currentDoc?.title || "My Custom Template";
    const currentSecs =
      currentDoc?.sections || buildSectionsFromLibrary(["hello-world"]);
    const newTpl = {
      id: `tpl-custom-${Date.now()}`,
      name: title,
      tag: "CUSTOM",
      role: "User Template",
      isCustom: true,
      customSectionsData: JSON.parse(JSON.stringify(currentSecs)),
      sections: currentSecs.map((s) => s.slug),
    };
    setCustomTemplates((prev) => [newTpl, ...prev]);
    setNewTemplateName("");
    setShowNewTemplateForm(false);
    showToast(`Created template "${title}"!`);
  };

  const handleDeleteCustomTemplate = (tplId, e) => {
    e.stopPropagation();
    setCustomTemplates((prev) => prev.filter((t) => t.id !== tplId));
    showToast("Deleted template");
  };

  const handleMoveSection = (idx, dir) => {
    const target = idx + dir;
    if (target < 0 || target >= currentDoc.sections.length) return;
    updateCurrentDoc((d) => {
      const list = [...d.sections];
      const [item] = list.splice(idx, 1);
      list.splice(target, 0, item);
      return { ...d, sections: list };
    });
  };

  const handleResetSection = (sec) => {
    const orig = allLibrarySections.find((x) => x.slug === sec.slug);
    if (!orig) return;
    updateCurrentDoc((d) => ({
      ...d,
      sections: d.sections.map((s) =>
        s.id === sec.id ? { ...s, markdown: orig.markdown } : s,
      ),
    }));
    showToast(`Reset ${sec.name}`);
  };

  const handleDeleteSection = (secId) => {
    if (currentDoc.sections.length <= 1) {
      showToast("Keep at least 1 section");
      return;
    }
    updateCurrentDoc((d) => ({
      ...d,
      sections: d.sections.filter((s) => s.id !== secId),
    }));
  };

  const handleCreateNewReadme = () => {
    const helloSec = buildSectionsFromLibrary(
      ["hello-world"],
      allLibrarySections,
    );
    const nextNum = savedDocs.length + 1;
    const newDoc = {
      id: `doc-${Date.now()}`,
      title: `Untitled-${nextNum}.md`,
      updatedAt: "Auto-saved",
      sections: helloSec,
    };
    setCurrentDoc(newDoc);
    setRenameCurrentVal(newDoc.title);
    setSelectedSecId(helloSec[0].id);
    showToast(`Created & auto-saved "${newDoc.title}"`);
  };

  const handleRenameCurrentFile = (e) => {
    e.preventDefault();
    const cleaned = renameCurrentVal.trim() || "README.md";
    updateCurrentDoc((d) => ({ ...d, title: cleaned }));
    setIsRenamingCurrent(false);
    showToast(`Renamed to "${cleaned}"`);
  };

  const handleRenameSavedDoc = (docId, e) => {
    e.preventDefault();
    e.stopPropagation();
    const cleaned = renameSavedVal.trim() || "README.md";
    setSavedDocs((prev) =>
      prev.map((d) => (d.id === docId ? { ...d, title: cleaned } : d)),
    );
    if (currentDoc.id === docId) {
      updateCurrentDoc((d) => ({ ...d, title: cleaned }));
      setRenameCurrentVal(cleaned);
    }
    setRenamingSavedId(null);
    showToast(`Renamed to "${cleaned}"`);
  };

  const handleDeleteSavedReadme = (docId, e) => {
    e.stopPropagation();
    const rem = savedDocs.filter((x) => x.id !== docId);
    setSavedDocs(rem);
    showToast("Removed from Saved READMEs");
  };

  const handleUseTemplate = (tpl) => {
    const newSecs = (tpl.customSectionsData || []).map((s, idx) => ({
      ...s,
      id: `sec-custom-tpl-${Date.now()}-${idx}`,
    }));

    if (newSecs.length > 0) {
      updateCurrentDoc((d) => ({
        ...d,
        title: `${tpl.name.replace(/[^a-zA-Z0-9_-]/g, "_")}.md`,
        sections: newSecs,
      }));
      setRenameCurrentVal(`${tpl.name.replace(/[^a-zA-Z0-9_-]/g, "_")}.md`);
      setSelectedSecId(newSecs[0]?.id || null);
      showToast(`Loaded "${tpl.name}"`);
    }
  };

  const handleCopyMarkdown = () => {
    try {
      navigator.clipboard.writeText(fullMarkdown);
    } catch (e) {
      const ta = document.createElement("textarea");
      ta.value = fullMarkdown;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
    showToast("Copied Markdown!");
  };

  const downloadBlob = (name, blob) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setExportMenuOpen(false);
    showToast(`Downloaded ${name}`);
  };

  const handleDownload = async (fmt) => {
    const baseName = (currentDoc?.title || "README").replace(/\.md$/i, "");
    const md = fullMarkdown;
    if (fmt === "md") {
      downloadBlob(
        `${baseName}.md`,
        new Blob([md], { type: "text/markdown;charset=utf-8" }),
      );
    } else if (fmt === "html") {
      const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${currentDoc?.title || "README"}</title><link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css"><style>body{font-family:Georgia,serif;max-width:840px;margin:40px auto;padding:24px;line-height:1.6;background:#e2dedb;color:#1d1d1b}pre{background:#1d1d1b;color:#e2dedb;padding:14px;border:1px solid #000000;overflow:auto}</style></head><body><pre style="white-space:pre-wrap;font-family:inherit">${md.replace(/</g, "&lt;")}</pre></body></html>`;
      downloadBlob(
        `${baseName}.html`,
        new Blob([html], { type: "text/html;charset=utf-8" }),
      );
    } else if (fmt === "txt") {
      downloadBlob(
        `${baseName}.txt`,
        new Blob([md.replace(/[#*`>]/g, "")], {
          type: "text/plain;charset=utf-8",
        }),
      );
    } else if (fmt === "json") {
      downloadBlob(
        `${baseName}.json`,
        new Blob([JSON.stringify(currentDoc, null, 2)], {
          type: "application/json",
        }),
      );
    } else if (fmt === "pdf") {
      if (pdfJob) return;
      const ac = new AbortController();
      pdfAbortRef.current = ac;
      setPdfJob({ progress: 0, label: "Starting PDF…" });
      setExportMenuOpen(false);
      try {
        const result = await generateHighResPdfWithLatex(
          currentDoc?.title || "README",
          md,
          {
            signal: ac.signal,
            marginPt: pdfMarginPt,
            onProgress: (progress, label) =>
              setPdfJob({ progress, label: label || "Working…" }),
          },
        );
        downloadBlob(`${baseName}.pdf`, result.blob);
        showToast(`PDF ready (${result.pageCount} pages)`);
      } catch (err) {
        const name = err && typeof err === "object" && "name" in err ? err.name : "";
        if (name !== "AbortError") {
          showToast("PDF export failed");
          console.error(err);
        }
      } finally {
        setPdfJob(null);
        pdfAbortRef.current = null;
      }
    }
  };

  const filteredLibrary = useMemo(
    () =>
      allLibrarySections.filter(
        (s) =>
          !searchQuery.trim() ||
          s.name.toLowerCase().includes(searchQuery.toLowerCase()),
      ),
    [allLibrarySections, searchQuery],
  );

  return (
    <div
      className={`h-screen flex flex-col ${activeFont.bodyClass} overflow-hidden select-none transition-colors ${activeTheme.pageBg}`}
    >
      {/* ====================================================================
          COMPACT, MOBILE-FRIENDLY HEADER BAR (No "PAPER", No "Broadsheet Edition")
         ==================================================================== */}
      <header
        className={`h-12 shrink-0 border-b ${activeTheme.borderRule} px-2.5 sm:px-4 flex items-center justify-between gap-2 z-30 ${activeTheme.pageBg}`}
      >
        {/* Left: Clean Brand Name "READCRAFT" + Current File Inline Rename */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <div
            className={`px-2 py-1 rounded-[2.88px] ${activeTheme.activeItem} shrink-0`}
          >
            <span
              className={`${activeFont.headingClass} text-sm sm:text-base leading-none`}
            >
              READCRAFT
            </span>
          </div>

          {/* Current File Title + Inline Rename */}
          <div
            className={`flex items-center gap-1.5 pl-2 sm:pl-3 border-l ${activeTheme.borderRule} min-w-0`}
          >
            {isRenamingCurrent ? (
              <form
                onSubmit={handleRenameCurrentFile}
                className="flex items-center gap-1"
              >
                <input
                  type="text"
                  value={renameCurrentVal}
                  onChange={(e) => setRenameCurrentVal(e.target.value)}
                  aria-label="README Title"
                  className={`text-xs px-2 py-1 border ${activeTheme.borderRule} rounded-[2.88px] focus:outline-none w-28 sm:w-40 ${activeTheme.cardBg}`}
                  autoFocus
                />
                <button
                  type="submit"
                  className={`px-2 py-1 rounded-[2.88px] text-[11px] ${activeTheme.activeItem}`}
                >
                  OK
                </button>
              </form>
            ) : (
              <div
                className={`flex items-center gap-1.5 px-2 py-1 rounded-[2.88px] ${activeTheme.cardBg} min-w-0`}
              >
                <span className="text-xs truncate max-w-[90px] sm:max-w-[160px]">
                  {currentDoc?.title}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setRenameCurrentVal(currentDoc?.title || "README.md");
                    setIsRenamingCurrent(true);
                  }}
                  className="p-0.5 opacity-70 hover:opacity-100 shrink-0"
                  title="Rename Current File"
                >
                  <Edit3 className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Center: View Switcher (Compact Icons on Mobile, Labels on Desktop) */}
        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
          {[
            { id: "split", label: "Split", icon: Columns },
            { id: "editor", label: "Editor", icon: Code2 },
            { id: "preview", label: "Preview", icon: Eye },
            { id: "raw", label: "Raw", icon: FileText },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = viewMode === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setViewMode(tab.id)}
                className={`flex items-center gap-1 px-2 py-1 rounded-[2.88px] text-xs transition-colors ${
                  isActive
                    ? activeTheme.activeItem
                    : `${activeTheme.cardBg} opacity-80 hover:opacity-100`
                }`}
                title={tab.label}
              >
                <Icon className="w-3.5 h-3.5" />
                <span className="hidden md:inline">{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Right: Copy + Export Dropdown */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={handleCopyMarkdown}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-[2.88px] border ${activeTheme.borderRule} text-xs transition-colors ${activeTheme.cardBg}`}
            title="Copy Markdown"
          >
            {copied ? (
              <Check className="w-3.5 h-3.5" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
            <span className="hidden sm:inline">
              {copied ? "Copied" : "Copy"}
            </span>
          </button>

          <div ref={exportMenuRef} className="relative">
            <button
              type="button"
              onClick={() => setExportMenuOpen(!exportMenuOpen)}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-[2.88px] text-xs transition-colors ${activeTheme.activeItem}`}
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden xs:inline">Export</span>
              <CaretDown className="w-3 h-3" />
            </button>

            {exportMenuOpen && (
              <div
                className={`absolute right-0 mt-1.5 w-48 border ${activeTheme.borderRule} shadow-xl py-1 z-50 rounded-[2.88px] ${activeTheme.cardBg}`}
              >
                <button
                  type="button"
                  onClick={() => handleDownload("md")}
                  className="w-full px-3.5 py-2 text-left text-xs hover:opacity-75 flex items-center gap-2 border-b border-current/10"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Markdown (.md)</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleDownload("pdf")}
                  className="w-full px-3.5 py-2 text-left text-xs hover:opacity-75 flex items-center gap-2 border-b border-current/10"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Download PDF (.pdf)</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleDownload("html")}
                  className="w-full px-3.5 py-2 text-left text-xs hover:opacity-75 flex items-center gap-2 border-b border-current/10"
                >
                  <FileCode className="w-3.5 h-3.5" />
                  <span>HTML (.html)</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleDownload("txt")}
                  className="w-full px-3.5 py-2 text-left text-xs hover:opacity-75 flex items-center gap-2 border-b border-current/10"
                >
                  <FileType className="w-3.5 h-3.5" />
                  <span>Plain Text (.txt)</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleDownload("json")}
                  className="w-full px-3.5 py-2 text-left text-xs hover:opacity-75 flex items-center gap-2"
                >
                  <FileJson className="w-3.5 h-3.5" />
                  <span>JSON (.json)</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ====================================================================
          MAIN WORKSPACE (Left Rail Closed by Default + Free-Form Default Tab)
         ==================================================================== */}
      <div className="flex-1 flex min-h-0 overflow-hidden relative">
        {/* 1. COMPACT LEFT ICON RAIL (Free-Form, Sections, Templates, Saved, Settings + Bottom New) */}
        <aside
          className={`w-11 sm:w-12 border-r ${activeTheme.borderRule} flex flex-col items-center justify-between py-2.5 shrink-0 z-20 ${activeTheme.cardBg}`}
        >
          <div className="flex flex-col items-center gap-2.5">
            {[
              {
                id: "freeform",
                label: "Free-Form Editor (No Sections)",
                icon: Edit3,
              },
              { id: "sections", label: "Sections Builder", icon: Layers },
              { id: "templates", label: "My Templates", icon: LayoutTemplate },
              {
                id: "saved",
                label: "Auto-Saved READMEs",
                icon: Bookmark,
                count: savedDocs.length,
              },
              {
                id: "settings",
                label: "Settings (Themes & Fonts)",
                icon: Settings,
              },
            ].map((item) => {
              const Icon = item.icon;
              const isSelected = activeNav === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    if (activeNav === item.id) {
                      setDrawerOpen(!drawerOpen);
                    } else {
                      setActiveNav(item.id);
                      // Free-form mode can work directly without opening the drawer, or open quick snippets if clicked again
                      setDrawerOpen(item.id !== "freeform");
                    }
                  }}
                  title={item.label}
                  aria-label={item.label}
                  className={`relative w-8 h-8 sm:w-9 sm:h-9 rounded-[2.88px] flex items-center justify-center transition-colors ${
                    isSelected
                      ? activeTheme.activeItem
                      : `${activeTheme.pageBg} border ${activeTheme.borderRule} opacity-80 hover:opacity-100`
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {item.count !== undefined && item.count > 0 && (
                    <span
                      className={`absolute -top-1 -right-1 px-1 min-w-[14px] h-3.5 rounded-[2.88px] text-[9px] flex items-center justify-center ${activeTheme.accentBg}`}
                    >
                      {item.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Bottom-Left "+ New README" Button */}
          <button
            type="button"
            onClick={handleCreateNewReadme}
            title="New README"
            aria-label="New README"
            className={`w-8 h-8 sm:w-9 sm:h-9 rounded-[2.88px] flex items-center justify-center transition-colors ${activeTheme.accentBg}`}
          >
            <Plus className="w-4 h-4" />
          </button>
        </aside>

        {/* 2. SLIM, CLEAN LEFT DRAWER (Closed by Default!) */}
        {drawerOpen && (
          <aside
            className={`w-56 sm:w-64 border-r ${activeTheme.borderRule} flex flex-col h-full shrink-0 overflow-hidden z-20 ${activeTheme.pageBg}`}
          >
            {/* Compact Drawer Header */}
            <div
              className={`h-9 px-3 border-b ${activeTheme.borderRule} flex items-center justify-between shrink-0 ${activeTheme.cardBg}`}
            >
              <span className={`${activeFont.headingClass} text-xs uppercase`}>
                {activeNav === "freeform" && "Free-Form Mode"}
                {activeNav === "sections" && "Sections"}
                {activeNav === "templates" && "My Templates"}
                {activeNav === "saved" && `Saved (${savedDocs.length})`}
                {activeNav === "settings" && "Settings"}
              </span>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="p-1 rounded-[2.88px] opacity-70 hover:opacity-100"
                title="Close Sidebar"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable Drawer Body */}
            <div className="flex-1 overflow-y-auto p-2.5 space-y-4">
              {/* TAB 0: FREE-FORM QUICK SNIPPETS */}
              {activeNav === "freeform" && (
                <div className="space-y-2.5">
                  <p className={`text-xs ${activeTheme.mutedText}`}>
                    Write your entire README as one continuous document without
                    section breaks.
                  </p>
                  <div className="text-[11px] font-semibold uppercase opacity-75 pt-1">
                    Quick Insert
                  </div>
                  <div className="grid grid-cols-1 gap-1.5">
                    {[
                      {
                        label: "+ Table",
                        md: `| Column 1 | Column 2 |\n| :--- | :--- |\n| Value A | Value B |`,
                      },
                      {
                        label: "+ Code Block",
                        md: `\`\`\`javascript\nconsole.log("Hello ReadCraft");\n\`\`\``,
                      },
                      {
                        label: "+ LaTeX Equation",
                        md: `$$\n\\sum_{i=1}^{n} i = \\frac{n(n+1)}{2}\n$$`,
                      },
                      {
                        label: "+ Task Checklist",
                        md: `- [x] Completed task\n- [ ] Pending task`,
                      },
                    ].map((snip) => (
                      <button
                        key={snip.label}
                        type="button"
                        onClick={() =>
                          handleInsertFreeFormSnippet(snip.md, snip.label)
                        }
                        className={`px-2.5 py-1.5 rounded-[2.88px] border ${activeTheme.borderRule} text-left text-xs ${activeTheme.cardBg} hover:opacity-85`}
                      >
                        {snip.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 1: SECTIONS (Curated 10 High-Quality Sections) */}
              {activeNav === "sections" && (
                <>
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between px-0.5">
                      <span
                        className={`text-[11px] uppercase ${activeTheme.mutedText}`}
                      >
                        Active ({currentDoc?.sections?.length || 0})
                      </span>
                      <button
                        type="button"
                        onClick={handleAddCustomSection}
                        className={`px-2 py-0.5 rounded-[2.88px] text-[11px] ${activeTheme.activeItem}`}
                      >
                        + Custom
                      </button>
                    </div>

                    <div className="space-y-1">
                      {(currentDoc?.sections || []).map((sec, idx) => {
                        const isSelected = sec.id === activeSection?.id;
                        return (
                          <div
                            key={sec.id}
                            onClick={() => setSelectedSecId(sec.id)}
                            className={`flex items-center justify-between px-2.5 py-1.5 rounded-[2.88px] text-xs cursor-pointer transition-colors ${
                              isSelected
                                ? activeTheme.activeItem
                                : `${activeTheme.cardBg} border ${activeTheme.borderRule}`
                            }`}
                          >
                            <span className="truncate pr-1.5">{sec.name}</span>

                            <div
                              className="flex items-center gap-0.5 shrink-0"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <button
                                type="button"
                                onClick={() => handleMoveSection(idx, -1)}
                                disabled={idx === 0}
                                className="p-0.5 opacity-75 hover:opacity-100 disabled:opacity-20"
                                title="Move Up"
                              >
                                <ChevronUp className="w-3 h-3" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleMoveSection(idx, 1)}
                                disabled={
                                  idx ===
                                  (currentDoc?.sections?.length || 1) - 1
                                }
                                className="p-0.5 opacity-75 hover:opacity-100 disabled:opacity-20"
                                title="Move Down"
                              >
                                <ChevronDown className="w-3 h-3" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleResetSection(sec)}
                                className="p-0.5 opacity-75 hover:opacity-100"
                                title="Reset"
                              >
                                <RotateCcw className="w-3 h-3" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteSection(sec.id)}
                                className="p-0.5 opacity-75 hover:opacity-100"
                                title="Delete"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Curated Section Library */}
                  <div
                    className={`space-y-2 pt-3 border-t ${activeTheme.borderRule}`}
                  >
                    <div className="flex items-center justify-between px-0.5">
                      <span
                        className={`text-[11px] uppercase ${activeTheme.mutedText}`}
                      >
                        Add Section ({filteredLibrary.length})
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowNewLibSecForm(!showNewLibSecForm)}
                        className={`px-1.5 py-0.5 rounded-[2.88px] text-[10px] flex items-center gap-0.5 ${activeTheme.accentBg}`}
                      >
                        <Plus className="w-2.5 h-2.5" />
                        <span>New in List</span>
                      </button>
                    </div>

                    {showNewLibSecForm && (
                      <form
                        onSubmit={handleSaveCustomLibrarySection}
                        className={`p-2.5 rounded-[2.88px] border ${activeTheme.borderRule} space-y-2 ${activeTheme.cardBg}`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-semibold">
                            New Library Section
                          </span>
                          <button
                            type="button"
                            onClick={() => setShowNewLibSecForm(false)}
                            className="p-0.5"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                        <input
                          type="text"
                          value={newLibSecName}
                          onChange={(e) => setNewLibSecName(e.target.value)}
                          placeholder="Section Name"
                          className={`w-full px-2 py-1 border ${activeTheme.borderRule} rounded-[2.88px] text-xs bg-transparent focus:outline-none`}
                        />
                        <textarea
                          rows={2}
                          value={newLibSecMarkdown}
                          onChange={(e) => setNewLibSecMarkdown(e.target.value)}
                          placeholder="## Title&#10;Markdown..."
                          className={`w-full px-2 py-1 border ${activeTheme.borderRule} rounded-[2.88px] text-xs font-mono bg-transparent focus:outline-none`}
                        />
                        <button
                          type="submit"
                          className={`w-full py-1 rounded-[2.88px] text-xs ${activeTheme.activeItem}`}
                        >
                          Save to Section List
                        </button>
                      </form>
                    )}

                    <div className="relative">
                      <Search
                        className={`w-3 h-3 absolute left-2.5 top-2 ${activeTheme.mutedText}`}
                      />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search sections..."
                        className={`w-full border ${activeTheme.borderRule} rounded-[2.88px] pl-7 pr-2 py-1 text-xs bg-transparent focus:outline-none`}
                      />
                    </div>

                    <div className="space-y-1">
                      {filteredLibrary.map((tpl) => (
                        <div
                          key={tpl.slug}
                          onClick={() => handleAddSection(tpl)}
                          className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-[2.88px] border ${activeTheme.borderRule} text-xs cursor-pointer transition-colors ${activeTheme.cardBg} hover:opacity-85`}
                        >
                          <span className="truncate">{tpl.name}</span>
                          <div className="flex items-center gap-1 shrink-0">
                            {tpl.isCustom && (
                              <button
                                type="button"
                                onClick={(e) =>
                                  handleDeleteCustomLibrarySection(tpl.slug, e)
                                }
                                className="p-0.5 hover:text-rose-500"
                                title="Remove"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}
                            <Plus className="w-3.5 h-3.5" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* TAB 2: TEMPLATES (Starts Empty — Only User-Created Templates) */}
              {activeNav === "templates" && (
                <div className="space-y-3">
                  {!showNewTemplateForm ? (
                    <button
                      type="button"
                      onClick={() => setShowNewTemplateForm(true)}
                      className={`w-full py-2 px-2.5 rounded-[2.88px] text-xs flex items-center justify-center gap-1.5 ${activeTheme.activeItem}`}
                    >
                      <FolderPlus className="w-3.5 h-3.5" />
                      <span>+ Save Current as My Template</span>
                    </button>
                  ) : (
                    <form
                      onSubmit={handleSaveCustomTemplate}
                      className={`p-2.5 rounded-[2.88px] border ${activeTheme.borderRule} space-y-2 ${activeTheme.cardBg}`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold">
                          Save Custom Template
                        </span>
                        <button
                          type="button"
                          onClick={() => setShowNewTemplateForm(false)}
                          className="p-0.5"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                      <input
                        type="text"
                        value={newTemplateName}
                        onChange={(e) => setNewTemplateName(e.target.value)}
                        placeholder="Template Name..."
                        className={`w-full px-2 py-1 border ${activeTheme.borderRule} rounded-[2.88px] text-xs bg-transparent focus:outline-none`}
                        autoFocus
                      />
                      <button
                        type="submit"
                        className={`w-full py-1 rounded-[2.88px] text-xs ${activeTheme.activeItem}`}
                      >
                        Save Template
                      </button>
                    </form>
                  )}

                  {customTemplates.length === 0 ? (
                    <div
                      className={`p-3.5 rounded-[2.88px] border ${activeTheme.borderRule} text-center space-y-1 ${activeTheme.cardBg}`}
                    >
                      <div className="text-xs font-semibold">
                        No Templates Yet
                      </div>
                      <p className={`text-[11px] ${activeTheme.mutedText}`}>
                        Click "+ Save Current as My Template" above to save your
                        own reusable README templates.
                      </p>
                    </div>
                  ) : (
                    customTemplates.map((tpl) => {
                      const previewMd = (tpl.customSectionsData || [])
                        .slice(0, 2)
                        .map((s) => s.markdown)
                        .join("\n\n");

                      return (
                        <div
                          key={tpl.id}
                          className={`rounded-[2.88px] border ${activeTheme.borderRule} p-2.5 flex flex-col gap-2 ${activeTheme.cardBg}`}
                        >
                          <div
                            onClick={() => handleUseTemplate(tpl)}
                            className="bg-[#e2dedb] p-2 border border-[#1d1d1b]/20 cursor-pointer"
                          >
                            <MarkdownPreview
                              markdown={previewMd}
                              darkPreview={false}
                              fontPreset={activeFont}
                              compact={true}
                            />
                          </div>

                          <div className="flex items-center justify-between gap-1">
                            <span className="text-xs font-semibold truncate">
                              {tpl.name}
                            </span>
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                onClick={(e) =>
                                  handleDeleteCustomTemplate(tpl.id, e)
                                }
                                className="p-1 opacity-75 hover:opacity-100"
                                title="Delete Template"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleUseTemplate(tpl)}
                                className={`px-2 py-0.5 rounded-[2.88px] text-[11px] ${activeTheme.activeItem}`}
                              >
                                Use
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}

              {/* TAB 3: AUTO-SAVED READMES */}
              {activeNav === "saved" && (
                <div className="space-y-2">
                  <div
                    className={`text-[11px] px-0.5 ${activeTheme.mutedText}`}
                  >
                    Your READMEs auto-save here automatically as you type.
                  </div>

                  {savedDocs.length === 0 ? (
                    <div
                      className={`p-3.5 rounded-[2.88px] border ${activeTheme.borderRule} text-center ${activeTheme.cardBg}`}
                    >
                      <p className={`text-xs ${activeTheme.mutedText}`}>
                        No saved files.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      {savedDocs.map((d) => {
                        const isCurrent = d.id === currentDoc?.id;
                        const isRenamingThis = renamingSavedId === d.id;
                        return (
                          <div
                            key={d.id}
                            onClick={() => {
                              setCurrentDoc(JSON.parse(JSON.stringify(d)));
                              setRenameCurrentVal(d.title);
                            }}
                            className={`flex items-center justify-between px-2.5 py-2 rounded-[2.88px] border cursor-pointer transition-colors ${
                              isCurrent
                                ? `${activeTheme.activeItem} border-transparent`
                                : `${activeTheme.cardBg} ${activeTheme.borderRule}`
                            }`}
                          >
                            {isRenamingThis ? (
                              <form
                                onSubmit={(e) => handleRenameSavedDoc(d.id, e)}
                                onClick={(e) => e.stopPropagation()}
                                className="flex items-center gap-1 flex-1 mr-1"
                              >
                                <input
                                  type="text"
                                  value={renameSavedVal}
                                  onChange={(e) =>
                                    setRenameSavedVal(e.target.value)
                                  }
                                  className="w-full px-1.5 py-0.5 bg-white text-black border border-black rounded-[2.88px] text-xs"
                                  autoFocus
                                />
                                <button
                                  type="submit"
                                  className="px-1.5 py-0.5 bg-[#c03f13] text-white rounded-[2.88px] text-[10px]"
                                >
                                  OK
                                </button>
                              </form>
                            ) : (
                              <div className="min-w-0">
                                <div className="text-xs font-medium truncate">
                                  {d.title}
                                </div>
                                <div className="text-[10px] opacity-70">
                                  {d.updatedAt}
                                </div>
                              </div>
                            )}

                            <div
                              className="flex items-center gap-0.5 shrink-0"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <button
                                type="button"
                                onClick={() => {
                                  setRenamingSavedId(d.id);
                                  setRenameSavedVal(d.title);
                                }}
                                className="p-1 opacity-75 hover:opacity-100"
                                title="Rename"
                              >
                                <Edit3 className="w-3 h-3" />
                              </button>
                              <button
                                type="button"
                                onClick={(e) =>
                                  handleDeleteSavedReadme(d.id, e)
                                }
                                className="p-1 opacity-75 hover:opacity-100"
                                title="Delete"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {activeNav === "settings" && (
                <SettingsPanel
                  themeId={themeId}
                  fontId={fontId}
                  editorFontSize={editorFontSize}
                  pdfMarginPt={pdfMarginPt}
                  activeTheme={activeTheme}
                  onThemeChange={(th) => {
                    setThemeId(th.id);
                    setDarkPreview(th.isDark);
                  }}
                  onFontChange={setFontId}
                  onFontSizeChange={setEditorFontSize}
                  onPdfMarginChange={setPdfMarginPt}
                />
              )}
            </div>
          </aside>
        )}

        {/* 3. RESPONSIVE RESIZABLE EDITOR & PREVIEW WORKSPACE */}
        <main
          ref={splitContainerRef}
          className="flex-1 flex flex-col md:flex-row min-w-0 h-full overflow-hidden relative"
          onDragEnter={onWorkspaceDragEnter}
          onDragOver={onWorkspaceDragOver}
          onDragLeave={onWorkspaceDragLeave}
          onDrop={onWorkspaceDrop}
        >
          {isFileDragOver && (
            <div
              className="absolute inset-0 z-40 flex items-center justify-center pointer-events-none"
              aria-hidden
            >
              <div
                className={`mx-4 px-5 py-4 rounded-[2.88px] border-2 border-dashed text-sm font-semibold shadow-lg ${activeTheme.activeItem} border-current`}
              >
                Drop README.md to open
              </div>
            </div>
          )}
          {(viewMode === "split" || viewMode === "editor") && (
            <div
              style={{
                width: viewMode === "split" ? `${editorWidthPct}%` : "100%",
              }}
              className={`relative flex flex-col min-w-0 max-md:!w-full overflow-hidden ${
                viewMode === "split" ? "h-1/2 md:h-full" : "h-full"
              } ${activeTheme.editorSurface}`}
            >
              <div
                className={`h-8 px-3 border-b ${activeTheme.borderRule} flex items-center justify-between text-xs shrink-0 ${activeTheme.cardBg}`}
              >
                <span className={`${activeFont.headingClass} text-xs truncate`}>
                  {isFreeFormMode
                    ? `Free-Form Editor — ${currentDoc?.title}`
                    : `Section: ${activeSection?.name || "Editor"}`}
                </span>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    title="Find (Ctrl/⌘+F)"
                    onClick={() => openFind(false)}
                    className={`p-1 rounded-[2.88px] border ${activeTheme.borderRule}`}
                  >
                    <Search className="w-3 h-3" />
                  </button>
                  <span
                    className={`text-[10px] font-mono ${activeTheme.mutedText}`}
                  >
                    {lineCount.toLocaleString()} lines
                  </span>
                </div>
              </div>
              {editorAllSelected && (
                <div
                  className={`px-3 py-1 text-[11px] border-b ${activeTheme.borderRule} ${activeTheme.accentBg}`}
                >
                  Entire document selected ({lineCount.toLocaleString()} lines) —
                  Ctrl/⌘+C copies without freezing. Click or type to clear.
                </div>
              )}
              <div className="relative flex-1 min-h-0">
                <EditorFindBar
                  open={findOpen}
                  onClose={() => setFindOpen(false)}
                  text={editorDraft}
                  textareaRef={editorTaRef}
                  preferReplace={findPreferReplace}
                  activeTheme={activeTheme}
                  navRef={findNavRef}
                  onReplace={(next) => {
                    setEditorAllSelected(false);
                    handleEditorChange(next);
                  }}
                />
                <textarea
                  ref={editorTaRef}
                  value={editorDraft}
                  onChange={(e) => handleEditorChange(e.target.value)}
                  onKeyDown={handleEditorKeyDown}
                  onMouseDown={() => setEditorAllSelected(false)}
                  style={{ fontSize: `${editorFontSize}px` }}
                  placeholder="Write Markdown here… or drop a .md / README file"
                  spellCheck={false}
                  className={`absolute inset-0 w-full h-full p-3.5 sm:p-5 font-mono leading-relaxed focus:outline-none resize-none overflow-y-auto select-text ${activeTheme.editorSurface} ${
                    findOpen ? "editor-find-active" : ""
                  } ${
                    editorAllSelected
                      ? "ring-2 ring-inset ring-[#c03f13]/50"
                      : ""
                  }`}
                />
              </div>
            </div>
          )}

          {/* DRAGGABLE RESIZE DIVIDER */}
          {viewMode === "split" && (
            <div
              onMouseDown={() => setIsDraggingSplit(true)}
              onTouchStart={() => setIsDraggingSplit(true)}
              title="Drag to resize Editor and Preview"
              className={`hidden md:flex w-2.5 shrink-0 cursor-col-resize items-center justify-center border-x ${activeTheme.borderRule} transition-colors ${
                isDraggingSplit
                  ? activeTheme.accentBg
                  : `${activeTheme.cardBg} hover:opacity-80`
              }`}
            >
              <GripVertical className="w-3 h-3" />
            </div>
          )}

          {(viewMode === "split" || viewMode === "preview") && (
            <div
              style={{
                width:
                  viewMode === "split" ? `${100 - editorWidthPct}%` : "100%",
              }}
              className={`flex flex-col min-w-0 max-md:!w-full overflow-hidden ${
                viewMode === "split"
                  ? "h-1/2 md:h-full border-t md:border-t-0"
                  : "h-full"
              } ${activeTheme.pageBg}`}
            >
              <div
                className={`h-8 px-3 border-b ${activeTheme.borderRule} flex items-center justify-between text-xs shrink-0 ${activeTheme.cardBg}`}
              >
                <span className={`${activeFont.headingClass} text-xs`}>
                  Preview
                </span>
                <div className="flex items-center gap-2">
                  {viewMode === "split" && (
                    <span
                      className={`text-[10px] font-mono hidden md:inline ${activeTheme.mutedText}`}
                    >
                      {100 - editorWidthPct}%
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => setDarkPreview(!darkPreview)}
                    className={`p-1 rounded-[2.88px] border ${activeTheme.borderRule}`}
                    title="Toggle Preview Light / Dark"
                  >
                    {darkPreview ? (
                      <Sun className="w-3 h-3 text-[#c03f13]" />
                    ) : (
                      <Moon className="w-3 h-3" />
                    )}
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-3 sm:p-5 select-text">
                <MarkdownPreview
                  markdown={previewMd}
                  darkPreview={darkPreview}
                  fontPreset={activeFont}
                  resetKey={currentDoc?.id}
                />
              </div>
            </div>
          )}

          {viewMode === "raw" && (
            <div
              className={`w-full h-full flex flex-col overflow-hidden ${activeTheme.pageBg}`}
            >
              <div
                className={`h-8 px-3 border-b ${activeTheme.borderRule} flex items-center justify-between text-xs shrink-0 ${activeTheme.cardBg}`}
              >
                <span className={`${activeFont.headingClass} text-xs`}>
                  Raw README.md
                </span>
                <button
                  type="button"
                  onClick={handleCopyMarkdown}
                  className={`px-2 py-0.5 rounded-[2.88px] text-[11px] ${activeTheme.activeItem}`}
                >
                  Copy All
                </button>
              </div>
              <textarea
                readOnly
                value={fullMarkdown}
                className="flex-1 p-4 sm:p-6 font-mono text-xs sm:text-sm bg-[#1d1d1b] text-[#e2dedb] overflow-y-auto whitespace-pre-wrap select-text resize-none border-0 focus:outline-none"
              />
            </div>
          )}
        </main>
      </div>

      {storageWarning && (
        <div
          className={`fixed top-14 left-1/2 -translate-x-1/2 z-50 max-w-md px-3.5 py-2 rounded-[2.88px] text-xs shadow-lg ${activeTheme.accentBg}`}
        >
          Browser storage is full — huge docs may not auto-save. Export .md to keep a copy.
          <button
            type="button"
            className="ml-2 underline"
            onClick={() => setStorageWarning(false)}
          >
            Dismiss
          </button>
        </div>
      )}

      {pdfJob && (
        <div className="fixed inset-0 z-[60] bg-black/45 flex items-center justify-center p-4">
          <div
            className={`w-full max-w-sm rounded-[2.88px] border p-4 shadow-xl ${activeTheme.cardBg} ${activeTheme.borderRule}`}
          >
            <div className="flex items-center gap-2 text-sm font-semibold mb-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              Generating PDF
            </div>
            <p className={`text-xs mb-3 ${activeTheme.mutedText}`}>
              {pdfJob.label}
            </p>
            <div
              className={`h-2 rounded-full overflow-hidden border ${activeTheme.borderRule}`}
            >
              <div
                className="h-full bg-[#c03f13] transition-[width] duration-200"
                style={{
                  width: `${Math.max(4, Math.round((pdfJob.progress || 0) * 100))}%`,
                }}
              />
            </div>
            <button
              type="button"
              className={`mt-3 w-full py-1.5 text-xs rounded-[2.88px] border ${activeTheme.borderRule}`}
              onClick={() => pdfAbortRef.current?.abort()}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {toast && (
        <div
          className={`fixed bottom-4 left-1/2 -translate-x-1/2 z-50 px-3.5 py-1.5 rounded-[2.88px] text-xs shadow-lg flex items-center gap-2 ${activeTheme.activeItem}`}
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>{toast}</span>
        </div>
      )}
    </div>
  );
}

