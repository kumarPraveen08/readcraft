export const DEFAULT_SECTION_LIBRARY = [
  {
    slug: "hello-world",
    name: "Hello World",
    markdown: `# 👋 Hello World\n\nWelcome to **ReadCraft**! Write freely in the editor on the left and see the live rendered output on the right.`,
  },
  {
    slug: "title-banner",
    name: "Title & Hero Banner",
    markdown: `<div align="center">\n\n# 🚀 Project Name\n\n**A fast, developer-first toolkit for modern web and mobile applications.**\n\n[![License: MIT](https://img.shields.io/badge/License-MIT-1d1d1b?style=for-the-badge)](https://opensource.org/licenses/MIT)\n[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-c03f13?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)\n\n</div>`,
  },
  {
    slug: "features",
    name: "Key Features",
    markdown: `## ✨ Key Features\n\n- ⚡ **Zero-Config Setup** — Start in seconds with instant live preview and hot reload.\n- 🧮 **Full LaTeX Engine** — Native support for \`amsmath\`, \`amssymb\`, \`amsthm\`, and \`mathtools\`.\n- 🎨 **Multi-Theme Studio** — Switch seamlessly between Editorial, GitHub, Neo-Brutalist, and Slate themes.\n- 📄 **Direct PDF Export** — High-DPI multi-page PDF rendering with 2D mathematical equations.`,
  },
  {
    slug: "tech-stack",
    name: "Tech Stack Table",
    markdown: `## 🧰 Tech Stack\n\n| Layer | Technology | Purpose |\n| :--- | :--- | :--- |\n| **Frontend** | React 18, Next.js, Tailwind CSS | UI rendering & responsive design system |\n| **Backend** | Node.js, Supabase, PostgreSQL | Relational database, Auth & Edge APIs |\n| **Mobile** | React Native, Android SDK | Cross-platform native mobile client |`,
  },
  {
    slug: "installation",
    name: "Installation & Setup",
    markdown: `## 📦 Installation\n\n\`\`\`bash\n# Clone the repository\ngit clone https://github.com/username/project-name.git\n\n# Navigate and install dependencies\ncd project-name\nnpm install\n\n# Start development server\nnpm run dev\n\`\`\``,
  },
  {
    slug: "usage",
    name: "Usage & Code Examples",
    markdown: `## 💻 Usage\n\n\`\`\`javascript\nimport { createClient } from '@org/project-sdk';\n\nconst client = createClient({ apiKey: process.env.API_KEY });\nconst result = await client.compile({ format: 'pdf' });\nconsole.log(result.status);\n\`\`\``,
  },
  {
    slug: "env-vars",
    name: "Environment Variables",
    markdown: `## 🔐 Environment Variables\n\nCreate a \`.env.local\` file in the root directory:\n\n| Variable | Type | Required | Description |\n| :--- | :--- | :---: | :--- |\n| \`NEXT_PUBLIC_SUPABASE_URL\` | \`string\` | Yes | Supabase project endpoint URL |\n| \`NEXT_PUBLIC_SUPABASE_ANON_KEY\` | \`string\` | Yes | Public anonymous client key |`,
  },
  {
    slug: "api-ref",
    name: "API Reference",
    markdown: `## 📡 API Reference\n\n\`\`\`http\nGET /api/v1/documents/:id\n\`\`\`\n\n| Parameter | Type | Description |\n| :--- | :--- | :--- |\n| \`id\` | \`string\` | **Required.** Unique identifier of the document |\n| \`format\` | \`string\` | Optional export format (\`md\`, \`pdf\`, \`html\`) |`,
  },
  {
    slug: "math-equations",
    name: "Math & LaTeX (amsmath / amsthm)",
    markdown: `## 🧮 Math & Full LaTeX\n\n\\documentclass[11pt]{article}\n\\usepackage{amsmath, amssymb, amsthm, mathtools}\n\nInline math works seamlessly: $E = mc^2$, $f(x) \\coloneqq \\alpha x^2 + \\beta$, and Euler's identity $e^{i\\pi} + 1 = 0$.\n\n\\begin{theorem}[Gauss Summation & Gaussian Integral]\nFor any integer $n \\geq 1$, the finite series $S_n \\coloneqq \\sum_{i=1}^{n} i$ and improper Gaussian integral satisfy:\n\\end{theorem}\n\n$$\nS_n \\coloneqq \\sum_{i=1}^{n} i = \\frac{n(n+1)}{2} \\implies \\int_{-\\infty}^{\\infty} e^{-x^2}\\,dx = \\sqrt{\\pi}\n$$\n\n\\begin{proof}\nPair terms $k$ and $(n - k + 1)$ across the finite sum to obtain $n(n+1)/2$.\n\\end{proof}\n\n$$\nA = \\begin{pmatrix} a_{11} & a_{12} \\\\ a_{21} & a_{22} \\end{pmatrix}, \\quad |x| \\coloneqq \\begin{cases} x & \\text{if } x \\geq 0 \\\\ -x & \\text{if } x < 0 \\end{cases}\n$$`,
  },
  {
    slug: "license",
    name: "Contributing & License",
    markdown: `## 🤝 Contributing & License\n\nPull requests are welcome! For major changes, please open an issue first to discuss what you would like to change.\n\nDistributed under the [MIT License](https://choosealicense.com/licenses/mit/).`,
  },
];

export const buildSectionsFromLibrary = (slugs, library = DEFAULT_SECTION_LIBRARY) =>
  slugs.map((slug, idx) => {
    const found = library.find((s) => s.slug === slug) || library[0];
    return {
      id: `sec-${found.slug}-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 5)}`,
      slug: found.slug,
      name: found.name,
      markdown: found.markdown,
    };
  });
