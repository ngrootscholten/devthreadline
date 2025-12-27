"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";

/**
 * Hook to check for pending name from sign-up flow and update user profile
 * This runs after the user is authenticated to save their name from sign-up
 */
export function usePendingName() {
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status !== "authenticated" || !session?.user) {
      return;
    }

    // Check if user already has a name
    if (session.user.name) {
      // Clear any pending name cookie since user already has a name
      document.cookie = "pendingUserName=; path=/; max-age=0";
      return;
    }

    // Check for pending name cookie
    const cookies = document.cookie.split(";");
    const pendingNameCookie = cookies.find((cookie) =>
      cookie.trim().startsWith("pendingUserName=")
    );

    if (pendingNameCookie) {
      const name = decodeURIComponent(
        pendingNameCookie.split("=")[1]?.trim() || ""
      );

      if (name) {
        // Update user's name via API
        fetch("/api/auth/update-name", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ name }),
        })
          .then((response) => {
            if (response.ok) {
              // Clear the cookie after successful update
              document.cookie = "pendingUserName=; path=/; max-age=0";
              // Refresh the session to get updated name
              window.location.reload();
            }
          })
          .catch((error) => {
            console.error("Failed to update name:", error);
          });
      }
    }
  }, [session, status]);
}

