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
import { Slider } from "@/components/ui/slider";
import { Upload, FileVideo, Settings2 } from "lucide-react";
import { useState, useRef } from "react";
import { Label } from "@/components/ui/label";

const configSchema = z.object({
  video: z.instanceof(File, { message: "Please select a valid video file." }),
  interval: z.number().min(1).max(60),
});

export type ConfigInput = z.infer<typeof configSchema>;

interface ConfigurationFormProps {
  onSubmit: (data: ConfigInput) => void;
}

export function ConfigurationForm({ onSubmit }: ConfigurationFormProps) {
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const {
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ConfigInput>({
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
        setValue("video", file, { shouldValidate: true });
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      inputRef.current?.click();
    }
  };

  const selectedFile = watch("video");

  return (
    <Card className="w-full max-w-2xl mx-auto border-border/50 shadow-lg bg-card/50 backdrop-blur-sm">
      <CardHeader className="text-center pb-8">
        <CardTitle className="text-3xl font-bold tracking-tight">
          Convert Video to PDF
        </CardTitle>
        <CardDescription className="text-muted-foreground mt-2">
          Extract high-quality frames from your video and compile them into a
          seamless PDF.
        </CardDescription>
      </CardHeader>

      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="space-y-8">
          <div className="space-y-2">
            <Controller
              control={control}
              name="video"
              render={({ field: { onChange } }) => (
                // biome-ignore lint/a11y/useSemanticElements: <>
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
                        onChange(e.target.files[0]);
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
                          setValue("video", undefined as unknown as File, {
                            shouldValidate: true,
                          });
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
              )}
            />
            {errors.video && (
              <p className="text-sm font-medium text-destructive text-center mt-2">
                {errors.video.message}
              </p>
            )}
          </div>

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
                    onValueChange={(val: any) => onChange(Array.isArray(val) ? val[0] : val)}
                    className="py-4"
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
            disabled={!selectedFile}
          >
            Start Processing
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
