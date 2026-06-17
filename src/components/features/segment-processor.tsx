"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Loader2,
  ArrowRight,
  ArrowLeft,
  Image as ImageIcon,
  CheckCircle2,
  FileUp,
} from "lucide-react";
import {
  extractFrames,
  getVideoMetadata,
  ExtractedFrame,
  VideoMetadata,
} from "@/lib/video-utils";
import Image from "next/image";

const SEGMENT_DURATION_SECONDS = 10 * 60; // 5 minutes

interface SegmentProcessorProps {
  video: File;
  interval: number;
  onComplete: (
    selectedFrames: ExtractedFrame[],
    metadata: VideoMetadata,
  ) => void;
  onCancel: () => void;
}

export function SegmentProcessor({
  video,
  interval,
  onComplete,
  onCancel,
}: SegmentProcessorProps) {
  const [metadata, setMetadata] = useState<VideoMetadata | null>(null);
  const [currentSegment, setCurrentSegment] = useState(0);
  const [totalSegments, setTotalSegments] = useState(1);
  const [error, setError] = useState<string | null>(null);
  
  type Status = "idle" | "extracting" | "done";
  const [framesBySegment, setFramesBySegment] = useState<Record<number, ExtractedFrame[]>>({});
  const [statusBySegment, setStatusBySegment] = useState<Record<number, Status>>({});
  const [progressBySegment, setProgressBySegment] = useState<Record<number, { current: number; total: number }>>({});

  const [allSelectedFrames, setAllSelectedFrames] = useState<ExtractedFrame[]>([]);

  // Load metadata on mount
  useEffect(() => {
    let mounted = true;

    const init = async () => {
      try {
        const meta = await getVideoMetadata(video);
        if (!mounted) return;
        setMetadata(meta);
        const total = Math.ceil(meta.duration / SEGMENT_DURATION_SECONDS);
        setTotalSegments(total);
        
        const initialStatus: Record<number, Status> = {};
        for (let i = 0; i < total; i++) {
           initialStatus[i] = "idle";
        }
        setStatusBySegment(initialStatus);
      } catch (err) {
        if (!mounted) return;
        setError(err instanceof Error ? err.message : "Failed to load video");
      }
    };

    init();

    return () => {
      mounted = false;
    };
  }, [video]);

  // Background Extraction Orchestrator
  useEffect(() => {
    let mounted = true;

    if (!metadata || totalSegments <= 0) return;

    // Determine the next segment to extract
    // Priority: currentSegment if it's idle. Otherwise currentSegment + 1 if it's idle.
    let targetSegment = -1;
    if (statusBySegment[currentSegment] === "idle") {
      targetSegment = currentSegment;
    } else if (
      statusBySegment[currentSegment] === "done" &&
      currentSegment + 1 < totalSegments &&
      statusBySegment[currentSegment + 1] === "idle"
    ) {
      targetSegment = currentSegment + 1;
    }

    if (targetSegment === -1) return; // Nothing to extract right now

    // Check if anything is currently extracting
    const isAnyExtracting = Object.values(statusBySegment).includes("extracting");
    if (isAnyExtracting) return;

    const runExtraction = async () => {
      setStatusBySegment((prev) => ({ ...prev, [targetSegment]: "extracting" }));
      setError(null);

      const startTime = targetSegment * SEGMENT_DURATION_SECONDS;
      const endTime = Math.min(
        (targetSegment + 1) * SEGMENT_DURATION_SECONDS,
        metadata.duration,
      );

      try {
        const frames = await extractFrames(
          video,
          startTime,
          endTime,
          interval,
          (current, total) => {
            if (mounted) {
              setProgressBySegment((prev) => ({
                ...prev,
                [targetSegment]: { current, total },
              }));
            }
          },
        );

        if (!mounted) return;
        
        setFramesBySegment((prev) => ({ ...prev, [targetSegment]: frames }));
        setStatusBySegment((prev) => ({ ...prev, [targetSegment]: "done" }));
      } catch (err) {
        if (!mounted) return;
        setError(
          err instanceof Error ? err.message : "Failed to extract frames",
        );
        setStatusBySegment((prev) => ({ ...prev, [targetSegment]: "idle" }));
      }
    };

    runExtraction();

    return () => {
      mounted = false;
    };
  }, [metadata, currentSegment, totalSegments, statusBySegment, video, interval]);

  const toggleFrameSelection = (id: string) => {
    setFramesBySegment((prev) => {
      const frames = prev[currentSegment] || [];
      return {
        ...prev,
        [currentSegment]: frames.map((f) =>
          f.id === id ? { ...f, selected: !f.selected } : f
        ),
      };
    });
  };

  const handleNextSegment = () => {
    const currentFrames = framesBySegment[currentSegment] || [];
    // Save selected frames from current segment
    const selectedFromCurrent = currentFrames.filter((f) => f.selected);
    setAllSelectedFrames((prev) => [...prev, ...selectedFromCurrent]);

    if (currentSegment < totalSegments - 1) {
      setCurrentSegment((prev) => prev + 1);
    } else {
      // Finished all segments
      // biome-ignore lint/style/noNonNullAssertion: <>
      onComplete([...allSelectedFrames, ...selectedFromCurrent], metadata!);
    }
  };

  const isExtracting = statusBySegment[currentSegment] === "extracting" || statusBySegment[currentSegment] === "idle";
  const currentFrames = framesBySegment[currentSegment] || [];
  const progress = progressBySegment[currentSegment] || { current: 0, total: 100 };

  if (error) {
    return (
      <Card className="w-full max-w-4xl mx-auto border-destructive/50">
        <CardHeader>
          <CardTitle className="text-destructive">
            Error Processing Video
          </CardTitle>
          <CardDescription>{error}</CardDescription>
        </CardHeader>
        <CardFooter>
          <Button variant="outline" onClick={onCancel}>
            Go Back
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card className="w-full mx-auto border-border/50 shadow-lg bg-card/50 backdrop-blur-sm flex flex-col h-[85vh]">
      <CardHeader className="flex-none border-b border-border/50 bg-muted/20">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-2xl flex items-center">
              Segment {currentSegment + 1} of {totalSegments}
              {isExtracting && (
                <Loader2 className="w-5 h-5 ml-3 animate-spin text-primary" />
              )}
            </CardTitle>
            <CardDescription className="mt-1">
              Review and select the screenshots you want to keep for the PDF.
            </CardDescription>
          </div>
          <div className="text-right">
            <p className="text-sm font-medium text-muted-foreground">
              Total Selected
            </p>
            <p className="text-2xl font-bold text-primary">
              {allSelectedFrames.length +
                currentFrames.filter((f) => f.selected).length}
            </p>
          </div>
        </div>

        {isExtracting && (
          <div className="mt-6 space-y-2">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Extracting frames...</span>
              <span>
                {Math.round(
                  (progress.current / Math.max(progress.total, 1)) * 100,
                )}
                %
              </span>
            </div>
            <Progress
              value={(progress.current / Math.max(progress.total, 1)) * 100}
              className="h-2"
            />
          </div>
        )}
      </CardHeader>

      <CardContent className="flex-1 overflow-hidden p-0 relative">
        {isExtracting ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground bg-background/50 backdrop-blur-sm z-10">
            <FileUp className="w-12 h-12 mb-4 animate-bounce opacity-50" />
            <p className="text-lg font-medium">Processing video segment...</p>
            <p className="text-sm opacity-75 mt-1">
              This might take a moment depending on the interval
            </p>
          </div>
        ) : currentFrames.length === 0 ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground">
            <ImageIcon className="w-12 h-12 mb-4 opacity-20" />
            <p>No frames extracted for this segment.</p>
          </div>
        ) : (
          <ScrollArea className="h-full w-full p-6">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-4 pb-20">
              {currentFrames.map((frame, _index) => (
                // biome-ignore lint/a11y/noStaticElementInteractions: <>
                // biome-ignore lint/a11y/useKeyWithClickEvents: <>
                <div
                  key={frame.id}
                  className={`group relative aspect-video rounded-xl overflow-hidden border-2 transition-all duration-200 cursor-pointer shadow-sm
                    ${frame.selected ? "border-primary ring-2 ring-primary/20 ring-offset-2 ring-offset-background" : "border-border/50 opacity-70 hover:opacity-100 hover:border-primary/50"}
                  `}
                  onClick={() => toggleFrameSelection(frame.id)}
                >
                  <Image
                    src={frame.dataUrl}
                    alt="Frame"
                    className="w-full h-full object-cover bg-black"
                    loading="lazy"
                    width={metadata?.width ?? 1280}
                    height={metadata?.height ?? 720}
                  />

                  {/* Time Badge */}
                  <div className="absolute bottom-2 left-2 bg-black/70 backdrop-blur-md text-white text-xs px-2 py-1 rounded-md font-mono">
                    {new Date(frame.time * 1000).toISOString().substr(14, 5)}
                  </div>

                  {/* Selection Indicator */}
                  <div
                    className={`absolute top-2 right-2 rounded-full p-1 transition-all duration-200
                    ${frame.selected ? "bg-primary text-primary-foreground scale-100" : "bg-black/50 text-white/50 scale-90 opacity-0 group-hover:opacity-100"}
                  `}
                  >
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>

      <CardFooter className="flex-none flex-col sm:flex-row justify-between border-t border-border/50 bg-muted/20 p-4 sm:p-6 gap-4">
        <Button variant="ghost" onClick={onCancel} disabled={isExtracting} className="w-full sm:w-auto order-last sm:order-first">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Cancel
        </Button>
        <Button
          onClick={handleNextSegment}
          disabled={isExtracting}
          className="min-w-37.5 w-full sm:w-auto"
        >
          {currentSegment < totalSegments - 1 ? (
            <>
              Next Segment
              <ArrowRight className="w-4 h-4 ml-2" />
            </>
          ) : (
            <>
              Review Final Selection
              <CheckCircle2 className="w-4 h-4 ml-2" />
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}
