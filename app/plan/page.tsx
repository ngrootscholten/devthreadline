import ReactMarkdown from 'react-markdown';
import { readFileSync } from 'fs';
import { join } from 'path';

export default async function Plan() {
  const planContent = readFileSync(
    join(process.cwd(), 'docs', 'AUTH_IMPLEMENTATION_PLAN.md'),
    'utf-8'
  );

  return (
    <main className="min-h-screen">
      <section className="max-w-5xl mx-auto px-6 py-24">
        <div className="prose prose-invert prose-lg max-w-none">
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-8 md:p-12">
            <ReactMarkdown
              components={{
                h1: ({ children }) => (
                  <h1 className="text-4xl font-bold mb-6 text-white">{children}</h1>
                ),
                h2: ({ children }) => (
                  <h2 className="text-3xl font-bold mt-12 mb-6 text-white border-b border-slate-700 pb-2">{children}</h2>
                ),
                h3: ({ children }) => (
                  <h3 className="text-2xl font-semibold mt-8 mb-4 text-green-400">{children}</h3>
                ),
                h4: ({ children }) => (
                  <h4 className="text-xl font-semibold mt-6 mb-3 text-slate-300">{children}</h4>
                ),
                p: ({ children }) => (
                  <p className="text-slate-300 mb-4 leading-relaxed">{children}</p>
                ),
                code: ({ children, className }) => {
                  const isInline = !className;
                  if (isInline) {
                    return (
                      <code className="bg-slate-800 px-1.5 py-0.5 rounded text-sm text-green-400">
                        {children}
                      </code>
                    );
                  }
                  return (
                    <code className="block bg-slate-950 border border-slate-800 rounded-lg p-4 overflow-x-auto text-sm text-slate-300">
                      {children}
                    </code>
                  );
                },
                pre: ({ children }) => (
                  <pre className="bg-slate-950 border border-slate-800 rounded-lg p-4 overflow-x-auto mb-4">
                    {children}
                  </pre>
                ),
                ul: ({ children }) => (
                  <ul className="list-disc list-inside mb-4 text-slate-300 space-y-2 ml-4">
                    {children}
                  </ul>
                ),
                ol: ({ children }) => (
                  <ol className="list-decimal list-inside mb-4 text-slate-300 space-y-2 ml-4">
                    {children}
                  </ol>
                ),
                li: ({ children }) => (
                  <li className="text-slate-300">{children}</li>
                ),
                blockquote: ({ children }) => (
                  <blockquote className="border-l-4 border-green-500 pl-4 italic text-slate-400 my-4">
                    {children}
                  </blockquote>
                ),
                hr: () => (
                  <hr className="border-slate-700 my-8" />
                ),
                strong: ({ children }) => (
                  <strong className="text-white font-semibold">{children}</strong>
                ),
                a: ({ href, children }) => (
                  <a href={href} className="text-green-400 hover:text-green-300 underline">
                    {children}
                  </a>
                ),
                table: ({ children }) => (
                  <div className="overflow-x-auto my-4">
                    <table className="min-w-full border border-slate-700">
                      {children}
                    </table>
                  </div>
                ),
                thead: ({ children }) => (
                  <thead className="bg-slate-800">{children}</thead>
                ),
                tbody: ({ children }) => (
                  <tbody className="bg-slate-900">{children}</tbody>
                ),
                tr: ({ children }) => (
                  <tr className="border-b border-slate-700">{children}</tr>
                ),
                th: ({ children }) => (
                  <th className="px-4 py-2 text-left text-slate-300 font-semibold">{children}</th>
                ),
                td: ({ children }) => (
                  <td className="px-4 py-2 text-slate-300">{children}</td>
                ),
              }}
            >
              {planContent}
            </ReactMarkdown>
          </div>
        </div>
      </section>
    </main>
  );
}

