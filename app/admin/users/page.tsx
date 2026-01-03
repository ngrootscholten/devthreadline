"use client";

import { useSession } from "next-auth/react";
import { useState, useEffect, useCallback, useRef, Suspense } from "react";
import { useRouter } from "next/navigation";
import { InviteUsersModal } from "../../components/invite-users-modal";
import { EditUserModal } from "../../components/edit-user-modal";
import { useToast } from "../../components/toast";

interface User {
  id: string;
  email: string;
  name: string | null;
  role: string;
  isActive: boolean;
  createdAt: string | null;
  emailVerified: string | null;
}

function UsersPageContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { showToast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [actionLoading, setActionLoading] = useState<{ [key: string]: boolean }>({});
  const hasInitializedRef = useRef(false);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch("/api/admin/users", {
        credentials: "include",
      });

      if (!response.ok) {
        if (response.status === 403) {
          router.push("/dashboard");
          return;
        }
        throw new Error("Failed to fetch users");
      }

      const data = await response.json();
      setUsers(data.users || []);
    } catch (err: any) {
      setError(err.message || "Failed to fetch users");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    // Only initialize once when status becomes authenticated
    if (status === "loading" || hasInitializedRef.current) {
      return;
    }

    if (status === "authenticated" && session) {
      hasInitializedRef.current = true;
      // Check if user is account admin
      const role = (session.user as any).role;
      if (role !== "account_admin") {
        router.push("/dashboard");
        return;
      }
      fetchUsers();
    } else if (status === "unauthenticated") {
      router.push("/dashboard");
    }
  }, [status, session, fetchUsers, router]);

  const handleInviteSuccess = () => {
    setShowInviteModal(false);
    fetchUsers();
  };

  const handleEditSuccess = (updatedData: { name: string | null; role: string }) => {
    if (editingUser) {
      // Update only the specific user in state instead of refetching all users
      setUsers(prevUsers => 
        prevUsers.map(u => 
          u.id === editingUser.id 
            ? { ...u, name: updatedData.name, role: updatedData.role }
            : u
        )
      );
    }
    setEditingUser(null);
  };

  const handleSendMagicLink = async (userId: string) => {
    const loadingKey = `${userId}-send-link`;
    try {
      setActionLoading(prev => ({ ...prev, [loadingKey]: true }));
      const response = await fetch(`/api/admin/users/${userId}/send-magic-link`, {
        method: "POST",
        credentials: "include",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to send magic link");
      }

      showToast("Magic link sent successfully!", "success");
    } catch (err: any) {
      showToast(err.message || "Failed to send magic link", "error");
    } finally {
      setActionLoading(prev => ({ ...prev, [loadingKey]: false }));
    }
  };

  const handleToggleActive = async (user: User) => {
    const loadingKey = `${user.id}-toggle-active`;
    try {
      setActionLoading(prev => ({ ...prev, [loadingKey]: true }));
      const endpoint = user.isActive
        ? `/api/admin/users/${user.id}/deactivate`
        : `/api/admin/users/${user.id}/activate`;

      const response = await fetch(endpoint, {
        method: "POST",
        credentials: "include",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || `Failed to ${user.isActive ? "deactivate" : "activate"} user`);
      }

      // Update only the specific user in state instead of refetching all users
      setUsers(prevUsers => 
        prevUsers.map(u => 
          u.id === user.id ? { ...u, isActive: !u.isActive } : u
        )
      );

      showToast(`User ${user.isActive ? "deactivated" : "activated"} successfully!`, "success");
    } catch (err: any) {
      showToast(err.message || `Failed to ${user.isActive ? "deactivate" : "activate"} user`, "error");
    } finally {
      setActionLoading(prev => ({ ...prev, [loadingKey]: false }));
    }
  };

  if (status === "loading" || loading) {
    return (
      <main className="min-h-screen">
        <section className="max-w-7xl mx-auto px-6 py-12">
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 md:p-6">
            <p className="text-slate-400">Loading...</p>
          </div>
        </section>
      </main>
    );
  }

  if (status === "unauthenticated") {
    return null;
  }

  const formatRelativeTime = (dateString: string | null): { display: string; tooltip: string } => {
    if (!dateString) return { display: "—", tooltip: "Never" };
    
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    const tooltip = date.toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
    
    if (diffSeconds < 60) {
      return { display: `${diffSeconds}s ago`, tooltip };
    } else if (diffMinutes < 60) {
      return { display: `${diffMinutes}m ago`, tooltip };
    } else if (diffHours < 24) {
      return { display: `${diffHours}h ago`, tooltip };
    } else if (diffDays < 7) {
      return { display: `${diffDays}d ago`, tooltip };
    }
    
    return { display: date.toLocaleDateString(), tooltip };
  };

  return (
    <main className="min-h-screen">
      <section className="max-w-7xl mx-auto px-6 py-12">
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 md:p-6">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-4xl font-bold text-white">Manage Users</h1>
            <button
              onClick={() => setShowInviteModal(true)}
              className="px-4 py-2 bg-green-400 text-black font-semibold rounded-lg hover:bg-green-500 transition-all"
            >
              Invite Users
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {users.length === 0 && !loading ? (
            <p className="text-slate-400">No users found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-slate-700">
                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-400">Name</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-400">Email</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-400">Role</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-400">Status</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-400">Created</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-400">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => {
                    const createdTime = formatRelativeTime(user.createdAt);
                    return (
                      <tr key={user.id} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                        <td className="py-3 px-4 text-white">
                          {user.name || <span className="text-slate-500 italic">Not set</span>}
                        </td>
                        <td className="py-3 px-4 text-slate-300 text-sm">{user.email}</td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            user.role === "account_admin"
                              ? "bg-purple-500/20 text-purple-400 border border-purple-500/30"
                              : "bg-slate-500/20 text-slate-300 border border-slate-500/30"
                          }`}>
                            {user.role === "account_admin" ? "Account Admin" : "Regular User"}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            user.isActive
                              ? "bg-green-500/20 text-green-400 border border-green-500/30"
                              : "bg-red-500/20 text-red-400 border border-red-500/30"
                          }`}>
                            {user.isActive ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-300 text-sm" title={createdTime.tooltip}>
                          {createdTime.display}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setEditingUser(user)}
                              className="px-2 py-1 text-sm text-slate-300 hover:underline transition-colors"
                              title="Edit user"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleSendMagicLink(user.id)}
                              disabled={actionLoading[`${user.id}-send-link`]}
                              className="px-2 py-1 text-sm text-slate-300 hover:underline transition-colors disabled:opacity-50"
                              title="Send magic link"
                            >
                              {actionLoading[`${user.id}-send-link`] ? "Sending..." : "Send link"}
                            </button>
                            <button
                              onClick={() => handleToggleActive(user)}
                              disabled={actionLoading[`${user.id}-toggle-active`]}
                              className="px-2 py-1 text-sm text-slate-300 hover:underline transition-colors disabled:opacity-50"
                              title={user.isActive ? "Deactivate user" : "Activate user"}
                            >
                              {actionLoading[`${user.id}-toggle-active`] ? "..." : user.isActive ? "Deactivate" : "Activate"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      {showInviteModal && (
        <InviteUsersModal
          onClose={() => setShowInviteModal(false)}
          onSuccess={handleInviteSuccess}
        />
      )}

      {editingUser && (
        <EditUserModal
          user={editingUser}
          onClose={() => setEditingUser(null)}
          onSuccess={handleEditSuccess}
        />
      )}
    </main>
  );
}

export default function UsersPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen">
          <section className="max-w-7xl mx-auto px-6 py-12">
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 md:p-6">
              <p className="text-slate-400">Loading...</p>
            </div>
          </section>
        </main>
      }
    >
      <UsersPageContent />
    </Suspense>
  );
}

