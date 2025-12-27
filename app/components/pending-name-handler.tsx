"use client";

import { usePendingName } from "../hooks/use-pending-name";

/**
 * Component to handle pending name updates from sign-up flow
 * This runs after authentication to save the name collected during sign-up
 */
export function PendingNameHandler() {
  usePendingName();
  return null; // This component doesn't render anything
}

