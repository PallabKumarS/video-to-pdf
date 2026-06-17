"use client";

import { useState } from "react";
import { ConfigurationForm, ConfigInput } from "./configuration-form";
import { SegmentProcessor } from "./segment-processor";
import { FinalReview } from "./final-review";
import { generatePdfFromFrames } from "@/lib/pdf-utils";
import { ExtractedFrame, VideoMetadata } from "@/lib/video-utils";
import { Capacitor } from "@capacitor/core";
import { Filesystem, Directory } from "@capacitor/filesystem";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Download, FileText, RefreshCcw, CheckCircle2 } from "lucide-react";

type AppState =
  | "config"
  | "processing"
  | "review"
  | "generating"
  | "complete"
  | "error";

export function ConvertFlow() {
  const [appState, setAppState] = useState<AppState>("config");
  const [config, setConfig] = useState<ConfigInput | null>(null);
  const [metadata, setMetadata] = useState<VideoMetadata | null>(null);
  const [allFrames, setAllFrames] = useState<ExtractedFrame[]>([]);
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const [pdfProgress, setPdfProgress] = useState({ current: 0, total: 100 });
  const [error, setError] = useState<string | null>(null);

  const handleConfigSubmit = (data: ConfigInput) => {
    setConfig(data);
    setAppState("processing");
  };

  const handleSegmentComplete = (
    selectedFrames: ExtractedFrame[],
    meta: VideoMetadata,
  ) => {
    setAllFrames(selectedFrames);
    setMetadata(meta);
    setAppState("review");
  };

  const handleReviewComplete = async (finalFrames: ExtractedFrame[]) => {
    if (!metadata) return;

    try {
      setAppState("generating");

      const blob = await generatePdfFromFrames(
        finalFrames,
        metadata.width,
        metadata.height,
        (current, total) => {
          setPdfProgress({ current, total });
        },
      );

      setPdfBlob(blob);
      setAppState("complete");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate PDF.");
      setAppState("error");
    }
  };

  const handleDownload = async () => {
    if (!pdfBlob) return;

    if (Capacitor.isNativePlatform()) {
      try {
        const reader = new FileReader();
        reader.readAsDataURL(pdfBlob);
        reader.onloadend = async () => {
          const base64data = reader.result as string;
          const fileName = `video-to-pdf-${Date.now()}.pdf`;

          await Filesystem.writeFile({
            path: fileName,
            data: base64data,
            directory: Directory.Documents,
          });

          toast.success("PDF successfully saved to your Documents folder!");
        };
      } catch (e) {
        console.error("Error saving file", e);
        toast.error("Could not save the PDF to your device.");
      }
    } else {
      const url = URL.createObjectURL(pdfBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `video-to-pdf-${Date.now()}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  const resetApp = () => {
    setConfig(null);
    setPdfBlob(null);
    setError(null);
    setAllFrames([]);
    setMetadata(null);
    setAppState("config");
  };

  return (
    <div className="w-full max-w-7xl mx-auto space-y-8 relative">
      {/* Decorative Background Blur */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-125 h-125 bg-primary/20 rounded-full blur-[120px] -z-10 pointer-events-none" />

      {appState === "config" && (
        <div className="animate-in fade-in zoom-in-95 duration-500">
          <ConfigurationForm onSubmit={handleConfigSubmit} />
        </div>
      )}

      {appState === "processing" && config && (
        <div className="animate-in slide-in-from-bottom-8 duration-500">
          <SegmentProcessor
            video={config.video}
            interval={config.interval}
            onComplete={handleSegmentComplete}
            onCancel={resetApp}
          />
        </div>
      )}

      {appState === "review" && config && metadata && (
        <div className="animate-in slide-in-from-bottom-8 duration-500">
          <FinalReview
            initialFrames={allFrames}
            video={config.video}
            metadata={metadata}
            onComplete={handleReviewComplete}
            onCancel={resetApp}
          />
        </div>
      )}

      {appState === "generating" && (
        <div className="animate-in zoom-in-95 duration-500 flex justify-center">
          <Card className="w-full max-w-md border-border/50 shadow-2xl bg-card/80 backdrop-blur-md">
            <CardHeader className="text-center">
              <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                <FileText className="w-8 h-8 text-primary animate-pulse" />
              </div>
              <CardTitle className="text-2xl">Generating PDF</CardTitle>
              <CardDescription>
                Compiling your selected frames into a high-quality PDF
                document...
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pb-8">
              <div className="flex justify-between text-sm font-medium">
                <span className="text-muted-foreground">Progress</span>
                <span className="text-primary">
                  {Math.round(
                    (pdfProgress.current / Math.max(pdfProgress.total, 1)) *
                      100,
                  )}
                  %
                </span>
              </div>
              <Progress
                value={
                  (pdfProgress.current / Math.max(pdfProgress.total, 1)) * 100
                }
                className="h-3"
              />
              <p className="text-center text-xs text-muted-foreground mt-4">
                Please wait, this may take a moment.
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {appState === "complete" && (
        <div className="animate-in zoom-in-95 duration-500 flex justify-center">
          <Card className="w-full max-w-md border-primary/20 shadow-2xl shadow-primary/10 bg-card/80 backdrop-blur-md">
            <CardHeader className="text-center">
              <div className="mx-auto w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mb-4">
                <CheckCircle2 className="w-10 h-10 text-green-500" />
              </div>
              <CardTitle className="text-3xl">Success!</CardTitle>
              <CardDescription className="text-base mt-2">
                Your PDF has been generated successfully and is ready to
                download.
              </CardDescription>
            </CardHeader>
            <CardFooter className="flex-col gap-3 pt-6 pb-8">
              <Button
                onClick={handleDownload}
                size="lg"
                className="w-full h-14 text-lg shadow-lg hover:shadow-primary/25 transition-all"
              >
                <Download className="w-5 h-5 mr-2" />
                Download PDF
              </Button>
              <Button
                onClick={resetApp}
                variant="ghost"
                className="w-full text-muted-foreground hover:text-foreground"
              >
                <RefreshCcw className="w-4 h-4 mr-2" />
                Convert Another Video
              </Button>
            </CardFooter>
          </Card>
        </div>
      )}

      {appState === "error" && (
        <div className="animate-in zoom-in-95 duration-500 flex justify-center">
          <Card className="w-full max-w-md border-destructive/50 shadow-2xl bg-card/80 backdrop-blur-md">
            <CardHeader className="text-center">
              <CardTitle className="text-destructive text-2xl">
                An Error Occurred
              </CardTitle>
              <CardDescription className="text-base mt-2">
                {error}
              </CardDescription>
            </CardHeader>
            <CardFooter className="pb-8">
              <Button
                onClick={resetApp}
                variant="outline"
                className="w-full h-12"
              >
                Try Again
              </Button>
            </CardFooter>
          </Card>
        </div>
      )}
    </div>
  );
}
