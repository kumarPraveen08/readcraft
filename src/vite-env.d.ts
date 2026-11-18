/// <reference types="vite/client" />

interface KatexOptions {
  displayMode?: boolean;
  throwOnError?: boolean;
}

interface Window {
  katex?: {
    renderToString: (latex: string, options?: KatexOptions) => string;
  };
}
