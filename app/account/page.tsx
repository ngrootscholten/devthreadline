"use client";

import { useSession } from "next-auth/react";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function AccountPage() {
  const { data: session, status, update } = useSession();
  const router = useRouter();
  const [editingName, setEditingName] = useState(false);
  const [editingCompany, setEditingCompany] = useState(false);
  const [nameValue, setNameValue] = useState("");
  const [companyValue, setCompanyValue] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [savingCompany, setSavingCompany] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);
  const [companyError, setCompanyError] = useState<string | null>(null);
  const [nameSuccess, setNameSuccess] = useState(false);
  const [companySuccess, setCompanySuccess] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const companyInputRef = useRef<HTMLInputElement>(null);

  // Initialize form values from session
  useEffect(() => {
    if (session?.user) {
      setNameValue(session.user.name || "");
      setCompanyValue((session.user as any).company || "");
    }
  }, [session]);

  if (status === "loading") {
    return (
      <main className="min-h-screen">
        <section className="max-w-4xl mx-auto px-6 py-12">
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 md:p-6">
            <p className="text-slate-400">Loading...</p>
          </div>
        </section>
      </main>
    );
  }

  if (status === "unauthenticated" || !session) {
    router.push("/auth/signin");
    return null;
  }

  const handleSaveName = async () => {
    setSavingName(true);
    setNameError(null);
    setNameSuccess(false);

    try {
      const response = await fetch("/api/auth/update-name", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ name: nameValue.trim() || null }),
      });

      const data = await response.json();

      if (!response.ok) {
        setNameError(data.error || "Failed to update name");
        setSavingName(false);
        return;
      }

      setNameSuccess(true);
      setEditingName(false);
      // Update the session to reflect the change
      await update();
      setTimeout(() => setNameSuccess(false), 3000);
    } catch (err: any) {
      setNameError(err.message || "Failed to update name");
    } finally {
      setSavingName(false);
    }
  };

  const handleSaveCompany = async () => {
    setSavingCompany(true);
    setCompanyError(null);
    setCompanySuccess(false);

    try {
      const response = await fetch("/api/auth/update-company", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ company: companyValue.trim() || null }),
      });

      const data = await response.json();

      if (!response.ok) {
        setCompanyError(data.error || "Failed to update company");
        setSavingCompany(false);
        return;
      }

      setCompanySuccess(true);
      setEditingCompany(false);
      // Update the session to reflect the change
      await update();
      setTimeout(() => setCompanySuccess(false), 3000);
    } catch (err: any) {
      setCompanyError(err.message || "Failed to update company");
    } finally {
      setSavingCompany(false);
    }
  };

  const handleCancelName = () => {
    setNameValue(session.user?.name || "");
    setNameError(null);
    setEditingName(false);
  };

  const handleCancelCompany = () => {
    setCompanyValue((session.user as any)?.company || "");
    setCompanyError(null);
    setEditingCompany(false);
  };

  return (
    <main className="min-h-screen">
      <section className="max-w-4xl mx-auto px-6 py-12">
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 md:p-6">
          <h1 className="text-4xl font-medium mb-3 text-white">Your Profile</h1>
          
          <div className="space-y-6">
            {/* Email - Read Only */}
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">
                Email
              </label>
              <p className="text-white">{session.user?.email || "Not available"}</p>
            </div>

            {/* Name - Editable */}
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">
                Name
              </label>
              {editingName ? (
                <div className="space-y-2">
                  <input
                    ref={nameInputRef}
                    type="text"
                    value={nameValue}
                    onChange={(e) => setNameValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSaveName();
                      } else if (e.key === "Escape") {
                        e.preventDefault();
                        handleCancelName();
                      }
                    }}
                    className="w-full px-4 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                    placeholder="Enter your name"
                    autoFocus
                    disabled={savingName}
                  />
                  {nameError && (
                    <p className="text-red-400 text-sm flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {nameError}
                    </p>
                  )}
                  {nameSuccess && (
                    <p className="text-green-400 text-sm flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Name updated successfully
                    </p>
                  )}
                  <div className="flex gap-2">
                    <button
                      onClick={handleSaveName}
                      disabled={savingName}
                      className="px-4 py-2 bg-green-400 text-black font-semibold rounded-lg hover:bg-green-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {savingName ? (
                        <>
                          <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Saving...
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          Save
                        </>
                      )}
                    </button>
                    <button
                      onClick={handleCancelName}
                      disabled={savingName}
                      className="px-4 py-2 border border-slate-700 text-slate-300 rounded-lg hover:border-slate-600 hover:text-white transition-colors disabled:opacity-50"
                    >
                      Cancel
                    </button>
                  </div>
                  <p className="text-xs text-slate-500">Press Enter to save, Esc to cancel</p>
                </div>
              ) : (
                <div className="flex items-center gap-2 group">
                  <p className="text-white">
                    {session.user?.name || <span className="text-slate-500 italic">Not set</span>}
                  </p>
                  <button
                    onClick={() => setEditingName(true)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-slate-800"
                    title="Edit name"
                    aria-label="Edit name"
                  >
                    <svg
                      className="w-4 h-4 text-slate-400 hover:text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                      />
                    </svg>
                  </button>
                </div>
              )}
            </div>

            {/* Company - Editable */}
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">
                Company
              </label>
              {editingCompany ? (
                <div className="space-y-2">
                  <input
                    ref={companyInputRef}
                    type="text"
                    value={companyValue}
                    onChange={(e) => setCompanyValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSaveCompany();
                      } else if (e.key === "Escape") {
                        e.preventDefault();
                        handleCancelCompany();
                      }
                    }}
                    className="w-full px-4 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                    placeholder="Enter your company name"
                    autoFocus
                    disabled={savingCompany}
                  />
                  {companyError && (
                    <p className="text-red-400 text-sm flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {companyError}
                    </p>
                  )}
                  {companySuccess && (
                    <p className="text-green-400 text-sm flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Company updated successfully
                    </p>
                  )}
                  <div className="flex gap-2">
                    <button
                      onClick={handleSaveCompany}
                      disabled={savingCompany}
                      className="px-4 py-2 bg-green-400 text-black font-semibold rounded-lg hover:bg-green-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {savingCompany ? (
                        <>
                          <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Saving...
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          Save
                        </>
                      )}
                    </button>
                    <button
                      onClick={handleCancelCompany}
                      disabled={savingCompany}
                      className="px-4 py-2 border border-slate-700 text-slate-300 rounded-lg hover:border-slate-600 hover:text-white transition-colors disabled:opacity-50"
                    >
                      Cancel
                    </button>
                  </div>
                  <p className="text-xs text-slate-500">Press Enter to save, Esc to cancel</p>
                </div>
              ) : (
                <div className="flex items-center gap-2 group">
                  <p className="text-white">
                    {(session.user as any)?.company || <span className="text-slate-500 italic">Not set</span>}
                  </p>
                  <button
                    onClick={() => setEditingCompany(true)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-slate-800"
                    title="Edit company"
                    aria-label="Edit company"
                  >
                    <svg
                      className="w-4 h-4 text-slate-400 hover:text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                      />
                    </svg>
                  </button>
                </div>
              )}
            </div>

          </div>
        </div>
      </section>
    </main>
  );
}
