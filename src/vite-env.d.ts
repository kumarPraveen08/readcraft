/// <reference types="vite/client" />

interface KatexOptions {
  displayMode?: boolean;
  throwOnError?: boolean;
  strict?: boolean | string;
}

interface Window {
  katex?: {
    renderToString: (latex: string, options?: KatexOptions) => string;
  };
}
