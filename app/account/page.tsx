import { auth } from "../api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function AccountPage() {
  const session = await auth();

  if (!session) {
    redirect("/auth/signin");
  }

  return (
    <main className="min-h-screen">
      <section className="max-w-4xl mx-auto px-6 py-24">
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-8 md:p-12">
          <h1 className="text-4xl font-bold mb-6 text-white">Your Account</h1>
          
          <div className="space-y-6">
            <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
              <p className="text-green-400 text-sm font-semibold mb-1">✓ Signed In</p>
              <p className="text-slate-300 text-sm">You are successfully authenticated!</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">
                  Email
                </label>
                <p className="text-white">{session.user?.email || "Not available"}</p>
              </div>

              {session.user?.name && (
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">
                    Name
                  </label>
                  <p className="text-white">{session.user.name}</p>
                </div>
              )}

              {(session.user as any)?.company && (
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">
                    Company
                  </label>
                  <p className="text-white">{(session.user as any).company}</p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">
                  User ID
                </label>
                <p className="text-slate-400 font-mono text-sm">
                  {(session.user as any)?.id || "Not available"}
                </p>
              </div>

              {session.user?.emailVerified && (
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">
                    Email Verified
                  </label>
                  <p className="text-green-400">
                    ✓ Verified on {new Date(session.user.emailVerified).toLocaleDateString()}
                  </p>
                </div>
              )}
            </div>

            <div className="pt-6 border-t border-slate-800">
              <form action="/api/auth/signout" method="POST">
                <button
                  type="submit"
                  className="px-6 py-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg hover:bg-red-500/20 transition-colors"
                >
                  Sign Out
                </button>
              </form>
            </div>

            <div className="pt-4">
              <Link
                href="/"
                className="text-green-400 hover:text-green-300 transition-colors"
              >
                ← Back to Home
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

