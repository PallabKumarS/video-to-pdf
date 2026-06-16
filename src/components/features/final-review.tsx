"use client";

import { useState } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SubExtractionDialog } from "./sub-extraction-dialog";
import {
  ExtractedFrame,
  VideoMetadata,
  extractFrames,
} from "@/lib/video-utils";
import { Trash2, Crosshair, GripVertical, CheckCircle2 } from "lucide-react";
import Image from "next/image";

interface SortableFrameItemProps {
  frame: ExtractedFrame;
  index: number;
  metadata: VideoMetadata;
  onRemove: (id: string) => void;
  onOrderChange: (id: string, newIndex: number) => void;
  totalFrames: number;
}

function SortableFrameItem({
  frame,
  index,
  metadata,
  onRemove,
  onOrderChange,
  totalFrames,
}: SortableFrameItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: frame.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 1,
  };

  const [inputValue, setInputValue] = useState((index + 1).toString());

  // Update input value when index prop changes
  if (
    inputValue !== (index + 1).toString() &&
    document.activeElement?.id !== `order-input-${frame.id}`
  ) {
    setInputValue((index + 1).toString());
  }

  const handleOrderSubmit = () => {
    let newIndex = parseInt(inputValue, 10) - 1;
    if (Number.isNaN(newIndex)) newIndex = index;
    newIndex = Math.max(0, Math.min(newIndex, totalFrames - 1));
    setInputValue((newIndex + 1).toString());
    if (newIndex !== index) {
      onOrderChange(frame.id, newIndex);
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative group bg-card rounded-xl overflow-hidden border-2 shadow-sm transition-opacity
        ${isDragging ? "opacity-50 border-primary" : "border-border/50 hover:border-primary/50"}
      `}
    >
      <div className="absolute top-2 left-2 z-20 flex items-center gap-1 bg-black/70 backdrop-blur-md rounded-md p-1 shadow-sm">
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing text-white/70 hover:text-white p-1"
        >
          <GripVertical className="w-4 h-4" />
        </div>
        <Input
          id={`order-input-${frame.id}`}
          type="number"
          min={1}
          max={totalFrames}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onBlur={handleOrderSubmit}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.currentTarget.blur();
            }
          }}
          className="h-6 w-12 px-1 py-0 text-center text-xs font-bold bg-transparent border-none text-white focus-visible:ring-1 focus-visible:ring-white/50"
        />
      </div>

      <div className="absolute top-2 right-2 z-20 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button
          variant="destructive"
          size="icon"
          className="w-7 h-7 rounded-md"
          onClick={() => onRemove(frame.id)}
        >
          <Trash2 className="w-3 h-3" />
        </Button>
      </div>

      <div className="aspect-video relative">
        <Image
          src={frame.dataUrl}
          alt={`Frame at ${frame.time}s`}
          className="w-full h-full object-cover bg-black"
          loading="lazy"
          width={metadata?.width ?? 1280}
          height={metadata?.height ?? 720}
        />
      </div>

      <div className="absolute bottom-2 right-2 bg-black/70 backdrop-blur-md text-white text-[10px] px-2 py-1 rounded-md font-mono z-10 pointer-events-none">
        {new Date(frame.time * 1000).toISOString().substr(14, 5)}
      </div>
    </div>
  );
}

interface FinalReviewProps {
  initialFrames: ExtractedFrame[];
  video: File;
  metadata: VideoMetadata;
  onComplete: (finalFrames: ExtractedFrame[]) => void;
  onCancel: () => void;
}

export function FinalReview({
  initialFrames,
  video,
  metadata,
  onComplete,
  onCancel,
}: FinalReviewProps) {
  const [frames, setFrames] = useState<ExtractedFrame[]>(initialFrames);
  const [isExtractionDialogOpen, setIsExtractionDialogOpen] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5, // Delay drag start to distinguish from clicks
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setFrames((items) => {
        const oldIndex = items.findIndex((i) => i.id === active.id);
        const newIndex = items.findIndex((i) => i.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const handleOrderChange = (id: string, newIndex: number) => {
    setFrames((items) => {
      const oldIndex = items.findIndex((i) => i.id === id);
      return arrayMove(items, oldIndex, newIndex);
    });
  };

  const handleRemove = (id: string) => {
    setFrames((prev) => prev.filter((f) => f.id !== id));
  };

  const handleSubExtraction = async (data: {
    startTime: number;
    endTime: number;
    interval: number;
  }) => {
    setIsExtracting(true);
    try {
      const extracted = await extractFrames(
        video,
        data.startTime,
        data.endTime,
        data.interval,
      );

      // Select all newly extracted frames and append them to the end
      const newFrames = extracted.map((f) => ({ ...f, selected: true }));
      setFrames((prev) => [...prev, ...newFrames]);
      setIsExtractionDialogOpen(false);
    } catch (error) {
      console.error("Sub-extraction failed:", error);
    } finally {
      setIsExtracting(false);
    }
  };

  return (
    <Card className="w-full max-w-6xl mx-auto border-border/50 shadow-lg bg-card/50 backdrop-blur-sm flex flex-col h-[85vh]">
      <CardHeader className="flex-none border-b border-border/50 bg-muted/20">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <CardTitle className="text-2xl flex items-center">
              Final Review & Reorder
            </CardTitle>
            <CardDescription className="mt-1">
              Drag and drop frames, change their page numbers, or extract
              missing frames.
            </CardDescription>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right border-l pl-4 border-border">
              <p className="text-sm font-medium text-muted-foreground">
                Total Pages
              </p>
              <p className="text-2xl font-bold text-primary">{frames.length}</p>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 overflow-hidden p-0 relative bg-muted/5">
        <ScrollArea className="h-full w-full p-6">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={frames.map((f) => f.id)}
              strategy={rectSortingStrategy}
            >
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 pb-20">
                {frames.map((frame, index) => (
                  <SortableFrameItem
                    key={frame.id}
                    frame={frame}
                    index={index}
                    metadata={metadata}
                    onRemove={handleRemove}
                    onOrderChange={handleOrderChange}
                    totalFrames={frames.length}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </ScrollArea>
      </CardContent>

      <CardFooter className="flex-none justify-between border-t border-border/50 bg-muted/20 p-6 flex-wrap gap-4">
        <Button variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <div className="flex items-center gap-4 ml-auto">
          <Button
            variant="secondary"
            onClick={() => setIsExtractionDialogOpen(true)}
            className="h-12 font-medium"
          >
            <Crosshair className="w-4 h-4 mr-2" />
            Extract Missing Frames
          </Button>
          <Button
            onClick={() => onComplete(frames)}
            disabled={frames.length === 0}
            className="min-w-50 h-12 text-lg font-semibold shadow-lg hover:shadow-primary/25"
          >
            Generate PDF
            <CheckCircle2 className="w-5 h-5 ml-2" />
          </Button>
        </div>
      </CardFooter>

      <SubExtractionDialog
        open={isExtractionDialogOpen}
        onOpenChange={setIsExtractionDialogOpen}
        videoDuration={metadata?.duration ?? 0}
        onExtract={handleSubExtraction}
        isExtracting={isExtracting}
      />
    </Card>
  );
}
