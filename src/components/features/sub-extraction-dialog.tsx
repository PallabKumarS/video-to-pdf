"use client";

import { z } from "zod";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

const subExtractionSchema = z
  .object({
    startTime: z.number().min(0, "Start time must be at least 0"),
    endTime: z.number().min(0.1, "End time must be greater than 0"),
    interval: z
      .number()
      .min(0.1, "Interval must be at least 0.1s")
      .max(60, "Max interval is 60s"),
  })
  .refine((data) => data.endTime > data.startTime, {
    message: "End time must be greater than start time",
    path: ["endTime"],
  });

type SubExtractionInput = z.infer<typeof subExtractionSchema>;

interface SubExtractionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  videoDuration: number;
  onExtract: (data: SubExtractionInput) => Promise<void>;
  isExtracting: boolean;
}

export function SubExtractionDialog({
  open,
  onOpenChange,
  videoDuration,
  onExtract,
  isExtracting,
}: SubExtractionDialogProps) {
  const {
    control,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<SubExtractionInput>({
    resolver: zodResolver(subExtractionSchema),
    defaultValues: {
      startTime: 0,
      endTime: Math.min(10, videoDuration),
      interval: 1, // Default 1s interval for sub-extraction
    },
  });

  const onSubmit = async (data: SubExtractionInput) => {
    await onExtract(data);
    reset();
  };

  return (
    <Dialog open={open} onOpenChange={isExtracting ? undefined : onOpenChange}>
      <DialogContent className="sm:max-w-106.25">
        <DialogHeader>
          <DialogTitle>Extract Specific Frames</DialogTitle>
          <DialogDescription>
            Specify a precise time range and interval (down to 100ms / 0.1s) to
            extract missing screenshots.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="grid gap-6 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startTime">Start Time (s)</Label>
                <Controller
                  control={control}
                  name="startTime"
                  render={({ field }) => (
                    <Input
                      id="startTime"
                      type="number"
                      step="0.1"
                      min={0}
                      disabled={isExtracting}
                      value={field.value}
                      onChange={(e) =>
                        field.onChange(parseFloat(e.target.value) || 0)
                      }
                    />
                  )}
                />
                {errors.startTime && (
                  <p className="text-xs text-destructive">
                    {errors.startTime.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="endTime">End Time (s)</Label>
                <Controller
                  control={control}
                  name="endTime"
                  render={({ field }) => (
                    <Input
                      id="endTime"
                      type="number"
                      step="0.1"
                      min={0.1}
                      max={videoDuration}
                      disabled={isExtracting}
                      value={field.value}
                      onChange={(e) =>
                        field.onChange(parseFloat(e.target.value) || 0)
                      }
                    />
                  )}
                />
                {errors.endTime && (
                  <p className="text-xs text-destructive">
                    {errors.endTime.message}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-2 bg-accent/30 p-4 rounded-lg border border-border/50">
              <Label htmlFor="interval">Capture Interval (seconds)</Label>
              <Controller
                control={control}
                name="interval"
                render={({ field }) => (
                  <Input
                    id="interval"
                    type="number"
                    step="0.1"
                    min={0.1}
                    max={60}
                    disabled={isExtracting}
                    value={field.value}
                    onChange={(e) =>
                      field.onChange(parseFloat(e.target.value) || 0.1)
                    }
                  />
                )}
              />
              <p className="text-xs text-muted-foreground mt-1">
                E.g., 0.1 for 100ms, 1 for 1s. Lower interval = more frames.
              </p>
              {errors.interval && (
                <p className="text-xs text-destructive">
                  {errors.interval.message}
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isExtracting}>
              {isExtracting && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Extract Frames
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
