/**
 * Authentication persistence helper for storing and retrieving
 * account login state across browser reloads and app restarts.
 */

const AUTH_KEY = "vidtopdf_account_connected";
const ACCOUNT_NAME_KEY = "vidtopdf_account_name";

export function isAccountConnected(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(AUTH_KEY) === "true";
}

export function setAccountConnected(
  connected: boolean,
  accountName?: string,
): void {
  if (typeof window === "undefined") return;
  if (connected) {
    localStorage.setItem(AUTH_KEY, "true");
    if (accountName) {
      localStorage.setItem(ACCOUNT_NAME_KEY, accountName);
    }
  } else {
    localStorage.removeItem(AUTH_KEY);
    localStorage.removeItem(ACCOUNT_NAME_KEY);
  }
}

export function getSavedAccountName(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(ACCOUNT_NAME_KEY);
}
