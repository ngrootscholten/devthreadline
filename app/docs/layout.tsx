import Link from "next/link";

const docsNav = [
  { href: "/docs/getting-started", label: "Getting Started" },
  { href: "/docs/creating-threadlines", label: "Creating Threadlines" },
  { href: "/docs/using-cli", label: "Using the CLI" },
  { href: "/docs/ci-cd", label: "CI/CD Integration" },
  { href: "/docs/examples", label: "Examples & Patterns" },
  { href: "/docs/configuration", label: "Configuration" },
  { href: "/docs/troubleshooting", label: "Troubleshooting" },
];

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex gap-8">
          {/* Left Navigation */}
          <aside className="w-64 flex-shrink-0">
            <nav className="sticky top-24">
              <ul className="space-y-2">
                {docsNav.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className="block px-4 py-2 text-slate-300 hover:text-white hover:bg-slate-800/50 rounded-lg transition-colors"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </aside>

          {/* Main Content */}
          <main className="flex-1 max-w-4xl">
            <div className="prose prose-invert prose-lg max-w-none">
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

