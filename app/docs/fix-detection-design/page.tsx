import Link from "next/link";
import ReactMarkdown from "react-markdown";
import * as fs from "fs";
import * as path from "path";

export default function FixDetectionDesign() {
  // Read the markdown file
  const filePath = path.join(process.cwd(), "docs", "fix-detection-design.md");
  const markdownContent = fs.readFileSync(filePath, "utf-8");

  return (
    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-8 md:p-12">
      <div className="mb-6">
        <Link href="/docs/troubleshooting" className="text-green-400 hover:text-green-300 transition-colors">
          ← Back to Troubleshooting
        </Link>
      </div>

      <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 mb-8">
        <p className="text-yellow-400 font-semibold mb-2">🚧 Upcoming Feature</p>
        <p className="text-slate-300 text-sm">
          This design document describes a feature currently in development. The violation fix detection system will automatically track when threadline violations are addressed between consecutive checks.
        </p>
      </div>

      <div className="prose prose-invert prose-lg max-w-none">
        <ReactMarkdown
          components={{
            h1: ({ children }) => <h1 className="text-4xl font-bold mb-6 text-white">{children}</h1>,
            h2: ({ children }) => <h2 className="text-2xl font-semibold mt-8 mb-4 text-green-400">{children}</h2>,
            h3: ({ children }) => <h3 className="text-xl font-semibold mt-6 mb-3 text-slate-300">{children}</h3>,
            h4: ({ children }) => <h4 className="text-lg font-semibold mt-4 mb-2 text-slate-300">{children}</h4>,
            p: ({ children }) => <p className="text-slate-300 mb-4">{children}</p>,
            ul: ({ children }) => <ul className="list-disc list-inside mb-4 text-slate-300 space-y-2 ml-4">{children}</ul>,
            ol: ({ children }) => <ol className="list-decimal list-inside mb-4 text-slate-300 space-y-2 ml-4">{children}</ol>,
            li: ({ children }) => <li className="mb-1">{children}</li>,
            code: ({ children, className }) => {
              const isInline = !className;
              if (isInline) {
                return <code className="bg-slate-800 px-1.5 py-0.5 rounded text-sm text-green-400">{children}</code>;
              }
              // Code block - handled by pre component
              return <code className="text-slate-300">{children}</code>;
            },
            pre: ({ children }) => (
              <pre className="bg-slate-950 border border-slate-800 rounded-lg p-4 overflow-x-auto text-sm text-slate-300 mb-4">
                {children}
              </pre>
            ),
            blockquote: ({ children }) => (
              <blockquote className="border-l-4 border-slate-700 pl-4 ml-0 text-slate-400 italic mb-4">
                {children}
              </blockquote>
            ),
            strong: ({ children }) => <strong className="text-white font-semibold">{children}</strong>,
            hr: () => <hr className="border-slate-800 my-8" />,
          }}
        >
          {markdownContent}
        </ReactMarkdown>
      </div>
    </div>
  );
}
