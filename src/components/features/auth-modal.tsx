"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { LogIn, Key, Loader2, CheckCircle2, Trash2 } from "lucide-react";
import { Capacitor, registerPlugin } from "@capacitor/core";

interface AuthModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  hasCookies?: boolean;
}

export function AuthModal({
  open,
  onOpenChange,
  onSuccess,
  hasCookies = false,
}: AuthModalProps) {
  const [activeTab, setActiveTab] = useState<"google" | "cookies">("google");
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [cookieText, setCookieText] = useState("");
  const [savedCookies, setSavedCookies] = useState(hasCookies);

  const electronAPI =
    typeof window !== "undefined" ? window.electronAPI : undefined;

  const handleGoogleLogin = async () => {
    setIsLoggingIn(true);
    try {
      if (Capacitor.isNativePlatform()) {
        interface NativeAuthPlugin {
          loginGoogle: () => Promise<{ success: boolean; error?: string }>;
        }
        const NativeDownloader =
          registerPlugin<NativeAuthPlugin>("YouTubeDownloader");
        toast.info("Opening Google Account login dialog...");
        const res = await NativeDownloader.loginGoogle();
        if (res?.success) {
          setSavedCookies(true);
          toast.success("Google Account authenticated successfully!");
          onOpenChange(false);
          onSuccess?.();
        } else {
          toast.error(
            res?.error || "Google login was canceled or not completed.",
          );
        }
      } else if (electronAPI) {
        toast.info(
          "Opening Google login window... Please choose or sign in to your YouTube account.",
        );
        const res = await electronAPI.loginGoogle();
        if (res?.success) {
          setSavedCookies(true);
          toast.success("Google Account authenticated successfully!");
          onOpenChange(false);
          onSuccess?.();
        } else {
          toast.error(
            res?.error || "Google login was closed or not completed.",
          );
        }
      } else {
        toast.error(
          "Please run inside the Desktop or Android app to use Google Sign-In.",
        );
      }
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to initiate login",
      );
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleSaveCookies = async () => {
    if (!cookieText.trim()) {
      toast.error("Please paste your cookies in Netscape format");
      return;
    }

    if (!electronAPI) {
      toast.error("Manual cookies are supported in the Desktop app.");
      return;
    }

    try {
      const res = await electronAPI.saveCookies(cookieText.trim());
      if (res?.success) {
        setSavedCookies(true);
        setCookieText("");
        toast.success("Cookies saved locally!");
        onOpenChange(false);
        onSuccess?.();
      } else {
        toast.error("Failed to save cookies.");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error saving cookies");
    }
  };

  const handleClearCookies = async () => {
    try {
      if (Capacitor.isNativePlatform()) {
        interface NativeAuthPlugin {
          clearCookies: () => Promise<{ success: boolean }>;
        }
        const NativeDownloader =
          registerPlugin<NativeAuthPlugin>("YouTubeDownloader");
        await NativeDownloader.clearCookies();
        setSavedCookies(false);
        toast.success("Authentication cookies cleared.");
      } else if (electronAPI) {
        await electronAPI.clearCookies();
        setSavedCookies(false);
        toast.success("Authentication cookies cleared.");
      }
    } catch {
      toast.error("Failed to clear cookies.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-card/95 border-border/70 backdrop-blur-lg">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <LogIn className="w-5 h-5 text-primary" />
            YouTube Authentication
          </DialogTitle>
          <DialogDescription className="text-muted-foreground text-sm">
            Certain YouTube videos (age-restricted or private) require a
            verified account. Everything stays stored 100% locally on your
            machine.
          </DialogDescription>
        </DialogHeader>

        {savedCookies && (
          <div className="flex items-center justify-between p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-sm">
            <span className="flex items-center gap-2 font-medium">
              <CheckCircle2 className="w-4 h-4" />
              Active credentials saved locally
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleClearCookies}
              className="text-xs text-destructive hover:bg-destructive/10 h-7 px-2"
            >
              <Trash2 className="w-3.5 h-3.5 mr-1" />
              Clear
            </Button>
          </div>
        )}

        <div className="flex border-b border-border/50 gap-4 mt-2 text-sm font-medium">
          <button
            type="button"
            className={`pb-2 border-b-2 transition-colors cursor-pointer ${
              activeTab === "google"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => setActiveTab("google")}
          >
            Google Sign-In
          </button>
          <button
            type="button"
            className={`pb-2 border-b-2 transition-colors cursor-pointer ${
              activeTab === "cookies"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => setActiveTab("cookies")}
          >
            Manual Cookies (Netscape)
          </button>
        </div>

        {activeTab === "google" ? (
          <div className="space-y-4 py-3 text-sm text-muted-foreground">
            <p className="leading-relaxed">
              Click below to open a local Google login window. Once you sign in
              and redirect to YouTube, the session cookies will be captured
              locally for video fetching.
            </p>
            <div className="p-3 bg-muted/40 rounded-lg text-xs leading-relaxed border border-border/30">
              <strong>Local & Secure:</strong> Credentials and cookies are
              stored only on your computer in your local temporary directory and
              never sent to external servers.
            </div>
            <Button
              type="button"
              className="w-full h-11 text-base font-semibold"
              disabled={isLoggingIn}
              onClick={handleGoogleLogin}
            >
              {isLoggingIn ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Authenticating...
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4 mr-2" />
                  Sign In with Google
                </>
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-3 py-3">
            <p className="text-xs text-muted-foreground leading-relaxed">
              If you prefer using a browser extension (like{" "}
              <em>Get cookies.txt LOCALLY</em>), paste your exported YouTube
              Netscape cookies here:
            </p>
            <textarea
              className="w-full h-32 text-xs font-mono p-2.5 rounded-lg border border-input bg-background/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              placeholder="# Netscape HTTP Cookie File&#10;.youtube.com TRUE / TRUE 1800000000 ..."
              value={cookieText}
              onChange={(e) => setCookieText(e.target.value)}
            />
            <Button
              type="button"
              className="w-full h-10 font-semibold"
              onClick={handleSaveCookies}
              disabled={!cookieText.trim()}
            >
              <Key className="w-4 h-4 mr-2" />
              Save Cookies Locally
            </Button>
          </div>
        )}

        <DialogFooter className="border-t border-border/40 pt-3">
          <Button
            type="button"
            variant="ghost"
            className="w-full sm:w-auto"
            onClick={() => onOpenChange(false)}
          >
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
