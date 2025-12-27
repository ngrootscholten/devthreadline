import Link from "next/link";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col">
      {/* Auth content - no duplicate nav since root layout already has one */}
      <main className="flex-1 flex items-center justify-center py-12">
        {children}
      </main>
    </div>
  );
}

