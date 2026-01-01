import fs from 'fs';
import path from 'path';
import ReactMarkdown from 'react-markdown';
import Link from 'next/link';

export default function AccountEntityDesign() {
  const filePath = path.join(process.cwd(), 'docs', 'account-entity-design.md');
  const content = fs.readFileSync(filePath, 'utf-8');

  return (
    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-8 md:p-12">
      <div className="mb-6">
        <Link 
          href="/docs/upcoming-features" 
          className="text-green-400 hover:text-green-300 text-sm mb-4 inline-block"
        >
          ← Back to Upcoming Features
        </Link>
        <div className="bg-yellow-900/30 border border-yellow-700 rounded-lg p-4 mb-6">
          <p className="text-yellow-200 text-sm">
            <strong>Design Document:</strong> This document outlines the planned Account/Customer entity feature for enabling team collaboration in Threadline.
          </p>
        </div>
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
              return (
                <code className="block bg-slate-800 p-4 rounded-lg text-sm text-slate-200 overflow-x-auto mb-4">
                  {children}
                </code>
              );
            },
            pre: ({ children }) => <pre className="bg-slate-800 p-4 rounded-lg text-sm text-slate-200 overflow-x-auto mb-4">{children}</pre>,
            blockquote: ({ children }) => (
              <blockquote className="border-l-4 border-green-400 pl-4 italic text-slate-300 mb-4">
                {children}
              </blockquote>
            ),
            table: ({ children }) => (
              <div className="overflow-x-auto mb-4">
                <table className="min-w-full border-collapse border border-slate-700">
                  {children}
                </table>
              </div>
            ),
            thead: ({ children }) => <thead className="bg-slate-800">{children}</thead>,
            tbody: ({ children }) => <tbody>{children}</tbody>,
            tr: ({ children }) => <tr className="border-b border-slate-700">{children}</tr>,
            th: ({ children }) => <th className="px-4 py-2 text-left text-white font-semibold">{children}</th>,
            td: ({ children }) => <td className="px-4 py-2 text-slate-300">{children}</td>,
            strong: ({ children }) => <strong className="text-white font-semibold">{children}</strong>,
            em: ({ children }) => <em className="text-slate-300 italic">{children}</em>,
            hr: () => <hr className="border-slate-700 my-8" />,
            a: ({ href, children }) => (
              <a href={href} className="text-green-400 hover:text-green-300 underline">
                {children}
              </a>
            ),
          }}
        >
          {content}
        </ReactMarkdown>
      </div>
    </div>
  );
}

