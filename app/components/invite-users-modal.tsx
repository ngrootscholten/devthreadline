"use client";

import { useState } from "react";
import { parseEmails } from "../lib/utils/email-parser";
import { useToast } from "./toast";

interface InviteUsersModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export function InviteUsersModal({ onClose, onSuccess }: InviteUsersModalProps) {
  const { showToast } = useToast();
  const [emailInput, setEmailInput] = useState("");
  const [parsedEmails, setParsedEmails] = useState<string[]>([]);
  const [inviting, setInviting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setEmailInput(value);
    
    // Parse emails in real-time for preview
    if (value.trim()) {
      const parsed = parseEmails(value);
      setParsedEmails(parsed);
    } else {
      setParsedEmails([]);
    }
  };

  const handleInvite = async () => {
    if (!emailInput.trim()) {
      setError("Please enter at least one email address");
      return;
    }

    const emails = parseEmails(emailInput);
    if (emails.length === 0) {
      setError("No valid email addresses found");
      return;
    }

    setInviting(true);
    setError(null);
    setSuccess(false);

    try {
      const response = await fetch("/api/admin/users/invite", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ emails: emailInput }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to invite users");
      }

      const invitedCount = data.invited || parsedEmails.length;
      setSuccess(true);
      showToast(`Successfully invited ${invitedCount} user${invitedCount !== 1 ? "s" : ""}!`, "success");
      setTimeout(() => {
        onSuccess();
      }, 1500);
    } catch (err: any) {
      const errorMessage = err.message || "Failed to invite users";
      setError(errorMessage);
      showToast(errorMessage, "error");
    } finally {
      setInviting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-white">Invite Users</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <p className="text-slate-400 text-sm mb-4">
          Paste email addresses in any format (comma-separated, line-separated, or Outlook format).
          Each user will receive a magic link to sign in.
        </p>

        <div className="mb-4">
          <label className="block text-sm font-medium text-slate-400 mb-2">
            Email Addresses
          </label>
          <textarea
            value={emailInput}
            onChange={handleInputChange}
            placeholder="john@example.com&#10;jane@example.com&#10;or: john@example.com, jane@example.com&#10;or: &quot;John Doe&quot; &lt;john@example.com&gt;"
            className="w-full h-32 px-4 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent font-mono text-sm"
            disabled={inviting}
          />
        </div>

        {parsedEmails.length > 0 && (
          <div className="mb-4 p-3 bg-slate-800/50 border border-slate-700 rounded-lg">
            <p className="text-sm text-slate-400 mb-2">
              Found {parsedEmails.length} email{parsedEmails.length !== 1 ? "s" : ""}:
            </p>
            <div className="flex flex-wrap gap-2">
              {parsedEmails.map((email, index) => (
                <span
                  key={index}
                  className="px-2 py-1 bg-slate-700 text-slate-200 rounded text-xs"
                >
                  {email}
                </span>
              ))}
            </div>
          </div>
        )}

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
            <p className="text-green-400 text-sm">
              ✓ Users invited successfully! Magic links have been sent.
            </p>
          </div>
        )}

        <div className="flex gap-3 justify-end">
          <button
            onClick={onClose}
            disabled={inviting}
            className="px-4 py-2 border border-slate-700 text-slate-300 rounded-lg hover:border-slate-600 hover:text-white transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleInvite}
            disabled={inviting || parsedEmails.length === 0}
            className="px-4 py-2 bg-green-400 text-black font-semibold rounded-lg hover:bg-green-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {inviting ? (
              <>
                <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Inviting...
              </>
            ) : (
              `Invite ${parsedEmails.length > 0 ? parsedEmails.length : ""} User${parsedEmails.length !== 1 ? "s" : ""}`
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

