"use client";

import { z } from "zod";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Progress } from "@/components/ui/progress";
import { Capacitor, registerPlugin } from "@capacitor/core";
import {
  Upload,
  FileVideo,
  Settings2,
  PlaySquare,
  Link as LinkIcon,
  Download,
  Loader2,
  Lock,
  Key,
} from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { AuthModal } from "./auth-modal";

const configSchema = z.object({
  interval: z.number().min(1).max(60),
});

export type ConfigFormData = z.infer<typeof configSchema>;

export interface ConfigInput {
  video: File | string;
  interval: number;
}

interface ConfigurationFormProps {
  onSubmit: (data: ConfigInput) => void;
}

export function ConfigurationForm({ onSubmit }: ConfigurationFormProps) {
  const [sourceType, setSourceType] = useState<"file" | "youtube">("file");
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [isDownloadingYt, setIsDownloadingYt] = useState(false);
  const [ytProgress, setYtProgress] = useState<{
    percent: number;
    speed: string;
    eta: string;
  } | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [hasSavedCookies, setHasSavedCookies] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  const electronAPI =
    typeof window !== "undefined" ? window.electronAPI : undefined;

  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      interface NativeAuthPlugin {
        checkCookies: () => Promise<{ hasCookies: boolean }>;
      }
      const NativeDownloader =
        registerPlugin<NativeAuthPlugin>("YouTubeDownloader");
      NativeDownloader.checkCookies()
        .then((res) => {
          setHasSavedCookies(res?.hasCookies || false);
        })
        .catch(() => {});
    } else if (electronAPI?.checkCookies) {
      electronAPI.checkCookies().then((res: { hasCookies: boolean }) => {
        setHasSavedCookies(res?.hasCookies || false);
      });
    }
  }, [electronAPI]);

  useEffect(() => {
    if (electronAPI?.onDownloadProgress) {
      const unsub = electronAPI.onDownloadProgress(
        (prog: { percent: number; speed: string; eta: string }) => {
          setYtProgress(prog);
        },
      );
      return () => unsub?.();
    }
  }, [electronAPI]);

  const {
    control,
    handleSubmit,
    getValues,
    formState: { errors },
  } = useForm<ConfigFormData>({
    resolver: zodResolver(configSchema),
    defaultValues: {
      interval: 5,
    },
  });

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    // biome-ignore lint/complexity/useOptionalChain: Required check
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith("video/")) {
        setSelectedFile(file);
      } else {
        toast.error("Please drop a valid video file.");
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      inputRef.current?.click();
    }
  };

  const onFormSubmit = async (values: ConfigFormData) => {
    if (sourceType === "file") {
      if (!selectedFile) {
        toast.error("Please select a video file.");
        return;
      }
      onSubmit({
        video: selectedFile,
        interval: values.interval,
      });
    } else {
      if (!youtubeUrl.trim()) {
        toast.error("Please enter a YouTube video URL.");
        return;
      }

      if (!electronAPI?.downloadYoutube && !Capacitor.isNativePlatform()) {
        toast.error(
          "Please use the Desktop or Android application to download YouTube videos locally.",
        );
        return;
      }

      setIsDownloadingYt(true);
      setYtProgress({ percent: 0, speed: "Starting...", eta: "" });

      try {
        if (Capacitor.isNativePlatform()) {
          interface YouTubeDownloaderPluginType {
            downloadVideo: (options: { url: string }) => Promise<{
              filePath: string;
              streamUrl: string;
              title: string;
            }>;
            addListener: (
              eventName: string,
              listenerFunc: (info: {
                percent: number;
                speed: string;
                eta: string;
              }) => void,
            ) => Promise<{ remove: () => Promise<void> }>;
          }

          const NativeDownloader =
            registerPlugin<YouTubeDownloaderPluginType>("YouTubeDownloader");

          const listener = await NativeDownloader.addListener(
            "youtube:progress",
            (info) => {
              setYtProgress(info);
            },
          );

          try {
            const res = await NativeDownloader.downloadVideo({
              url: youtubeUrl.trim(),
            });
            await listener.remove();

            if (res?.streamUrl) {
              toast.success("YouTube video downloaded successfully!");
              onSubmit({
                video: res.streamUrl,
                interval: values.interval,
              });
            } else {
              toast.error("Could not retrieve video stream on Android.");
            }
          } catch (nativeErr) {
            await listener.remove();
            const errorMsg =
              nativeErr instanceof Error
                ? nativeErr.message
                : String(nativeErr);

            if (
              errorMsg.includes("LOGIN_REQUIRED") ||
              errorMsg.includes("Sign in") ||
              errorMsg.includes("bot") ||
              errorMsg.includes("cookies")
            ) {
              toast.error(
                "This video requires authentication. Please sign in with your Google account.",
              );
              setAuthModalOpen(true);
            } else {
              toast.error(errorMsg);
            }
            return;
          }
        } else if (electronAPI?.downloadYoutube) {
          const res = await electronAPI.downloadYoutube(youtubeUrl.trim());
          if (res?.success && res.data?.streamUrl) {
            toast.success("YouTube video downloaded successfully!");
            onSubmit({
              video: res.data.streamUrl,
              interval: values.interval,
            });
          } else {
            const errorMsg = res?.error || "Download failed";
            if (
              errorMsg.includes("LOGIN_REQUIRED") ||
              errorMsg.includes("Sign in") ||
              errorMsg.includes("bot") ||
              errorMsg.includes("cookies")
            ) {
              toast.error(
                "This video requires authentication. Please sign in with your Google account.",
              );
              setAuthModalOpen(true);
            } else {
              toast.error(errorMsg);
            }
          }
        }
      } catch (err) {
        toast.error(
          err instanceof Error
            ? err.message
            : "Failed to download YouTube video.",
        );
      } finally {
        setIsDownloadingYt(false);
        setYtProgress(null);
      }
    }
  };

  return (
    <>
      <Card className="w-full max-w-2xl mx-auto border-border/50 shadow-lg bg-card/50 backdrop-blur-sm">
        <CardHeader className="text-center pb-6">
          <CardTitle className="text-3xl font-bold tracking-tight">
            Convert Video to PDF
          </CardTitle>
          <CardDescription className="text-muted-foreground mt-2">
            Extract high-quality frames from your video file or YouTube URL and
            compile them into a seamless PDF.
          </CardDescription>

          <div className="flex justify-center mt-6">
            <div className="inline-flex rounded-xl p-1 bg-muted/60 border border-border/40">
              <Button
                type="button"
                variant={sourceType === "file" ? "default" : "ghost"}
                size="sm"
                className="rounded-lg text-sm font-semibold gap-2"
                onClick={() => setSourceType("file")}
              >
                <Upload className="w-4 h-4" />
                Upload File
              </Button>
              <Button
                type="button"
                variant={sourceType === "youtube" ? "default" : "ghost"}
                size="sm"
                className="rounded-lg text-sm font-semibold gap-2"
                onClick={() => setSourceType("youtube")}
              >
                <PlaySquare className="w-4 h-4 text-red-500" />
                YouTube Link
              </Button>
            </div>
          </div>
        </CardHeader>

        <form onSubmit={handleSubmit(onFormSubmit)}>
          <CardContent className="space-y-6">
            {sourceType === "file" ? (
              <div className="space-y-2">
                {/* biome-ignore lint/a11y/useSemanticElements: <> */}
                <div
                  role="button"
                  tabIndex={0}
                  className={`relative flex flex-col items-center justify-center w-full p-12 border-2 border-dashed rounded-xl transition-all duration-200 ease-in-out cursor-pointer
                    ${dragActive ? "border-primary bg-primary/5 scale-[1.02]" : "border-muted-foreground/25 hover:border-primary/50 hover:bg-accent/50"}
                    ${selectedFile ? "border-primary/50 bg-primary/5" : ""}
                  `}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                  onClick={() => inputRef.current?.click()}
                  onKeyDown={handleKeyDown}
                >
                  <input
                    type="file"
                    accept="video/*"
                    className="hidden"
                    ref={inputRef}
                    onChange={(e) => {
                      if (e.target.files?.[0]) {
                        setSelectedFile(e.target.files[0]);
                      }
                    }}
                  />

                  {selectedFile ? (
                    <div className="flex flex-col items-center space-y-3 text-center">
                      <div className="p-3 rounded-full bg-primary/10 text-primary">
                        <FileVideo className="w-10 h-10" />
                      </div>
                      <div>
                        <p className="font-semibold text-foreground">
                          {selectedFile.name}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="mt-2 text-muted-foreground hover:text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedFile(null);
                        }}
                      >
                        Remove Video
                      </Button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center space-y-4 text-center">
                      <div className="p-4 rounded-full bg-accent text-muted-foreground">
                        <Upload className="w-8 h-8" />
                      </div>
                      <div>
                        <p className="text-lg font-medium text-foreground">
                          Click or drag video to upload
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">
                          MP4, WebM, or OGG (Max size depends on your local
                          memory)
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-4 bg-accent/20 p-6 rounded-xl border border-border/50">
                <div className="flex items-center justify-between">
                  <Label
                    htmlFor="youtube-url"
                    className="text-base font-semibold flex items-center gap-2"
                  >
                    <LinkIcon className="w-4 h-4 text-primary" />
                    YouTube Video URL
                  </Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="text-xs h-8 gap-1.5"
                    onClick={() => setAuthModalOpen(true)}
                  >
                    {hasSavedCookies ? (
                      <>
                        <Key className="w-3.5 h-3.5 text-emerald-500" />
                        Account Connected
                      </>
                    ) : (
                      <>
                        <Lock className="w-3.5 h-3.5" />
                        Google Login / Cookies
                      </>
                    )}
                  </Button>
                </div>

                <Input
                  id="youtube-url"
                  placeholder="https://www.youtube.com/watch?v=..."
                  value={youtubeUrl}
                  onChange={(e) => setYoutubeUrl(e.target.value)}
                  disabled={isDownloadingYt}
                  className="h-11 text-sm bg-background/80"
                />

                {!electronAPI?.downloadYoutube &&
                  !Capacitor.isNativePlatform() && (
                    <div className="p-3 bg-primary/10 border border-primary/20 rounded-lg text-xs text-muted-foreground">
                      Direct YouTube downloading runs 100% locally on your
                      device inside the Desktop (Windows) and Mobile (Android)
                      applications. In web browsers, please use the{" "}
                      <strong>Upload File</strong> tab to process local videos.
                    </div>
                  )}

                <p className="text-xs text-muted-foreground leading-relaxed">
                  The video is retrieved locally on your device without
                  third-party servers, then extracted into high-resolution
                  frames.
                </p>

                {isDownloadingYt && ytProgress && (
                  <div className="space-y-2 pt-2">
                    <div className="flex justify-between text-xs font-medium text-muted-foreground">
                      <span>Downloading video... ({ytProgress.speed})</span>
                      <span className="text-primary font-semibold">
                        {ytProgress.percent.toFixed(1)}%
                      </span>
                    </div>
                    <Progress value={ytProgress.percent} className="h-2" />
                    {ytProgress.eta && (
                      <p className="text-[11px] text-muted-foreground text-right">
                        ETA: {ytProgress.eta}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            <div className="space-y-4 bg-accent/30 p-6 rounded-xl border border-border/50">
              <Controller
                control={control}
                name="interval"
                render={({ field: { value, onChange } }) => (
                  <>
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <Label className="flex items-center text-base font-semibold">
                          <Settings2 className="w-4 h-4 mr-2" />
                          Capture Interval
                        </Label>
                        <p className="text-sm text-muted-foreground mt-1">
                          How often should we extract a screenshot?
                        </p>
                      </div>
                      <div className="text-2xl font-bold text-primary">
                        {value}s
                      </div>
                    </div>
                    <Slider
                      min={1}
                      max={60}
                      step={1}
                      value={value}
                      // biome-ignore lint/suspicious/noExplicitAny: <>
                      onValueChange={(val: any) =>
                        onChange(Array.isArray(val) ? val[0] : val)
                      }
                      className="py-4"
                      disabled={isDownloadingYt}
                    />
                    {errors.interval && (
                      <p className="text-sm font-medium text-destructive mt-2">
                        {errors.interval.message}
                      </p>
                    )}
                  </>
                )}
              />
            </div>
          </CardContent>

          <CardFooter className="pt-4 pb-8 px-6">
            <Button
              type="submit"
              className="w-full h-12 text-lg font-medium rounded-xl shadow-lg hover:shadow-primary/25 transition-all"
              disabled={
                isDownloadingYt ||
                (sourceType === "file" && !selectedFile) ||
                (sourceType === "youtube" && !youtubeUrl.trim())
              }
            >
              {isDownloadingYt ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Downloading YouTube Video...
                </>
              ) : (
                <>
                  <Download className="w-5 h-5 mr-2" />
                  Start Processing
                </>
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>

      <AuthModal
        open={authModalOpen}
        onOpenChange={setAuthModalOpen}
        hasCookies={hasSavedCookies}
        onSuccess={() => {
          setHasSavedCookies(true);
          if (youtubeUrl.trim()) {
            toast.info("Account authenticated! Starting download...");
            onFormSubmit(getValues());
          }
        }}
      />
    </>
  );
}
