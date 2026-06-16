import { jsPDF } from "jspdf";
import type { ExtractedFrame } from "./video-utils";

/**
 * Generates a PDF from an array of extracted frames.
 * Uses 1 screenshot per page, matching the orientation and dimensions of the images.
 */
export async function generatePdfFromFrames(
  frames: ExtractedFrame[],
  videoWidth: number,
  videoHeight: number,
  onProgress?: (current: number, total: number) => void,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    try {
      if (!frames || frames.length === 0) {
        throw new Error("No frames provided to generate PDF.");
      }

      // Determine orientation based on video dimensions
      const orientation = videoWidth > videoHeight ? "l" : "p";

      // Initialize jsPDF with pixel units and matching dimensions
      const pdf = new jsPDF({
        orientation,
        unit: "px",
        format: [videoWidth, videoHeight],
      });

      const totalFrames = frames.length;

      // jsPDF blocks the main thread, so for a large number of images
      // we could use setTimeout to yield to the UI thread,
      // but jsPDF addImage is generally synchronous.
      // We will loop through them with brief pauses to update progress.

      let currentIndex = 0;

      const processNextFrame = () => {
        if (currentIndex >= totalFrames) {
          // All frames added, generate Blob
          const blob = pdf.output("blob");
          resolve(blob);
          return;
        }

        const frame = frames[currentIndex];

        // If it's not the first page, add a new page
        if (currentIndex > 0) {
          pdf.addPage([videoWidth, videoHeight], orientation);
        }

        // Add the image (dataUrl) to the current page
        // Format is expected to be JPEG from our video-utils
        pdf.addImage(frame.dataUrl, "JPEG", 0, 0, videoWidth, videoHeight);

        currentIndex++;

        if (onProgress) {
          onProgress(currentIndex, totalFrames);
        }

        // Yield to the main thread briefly so the UI (like a progress bar) can update
        setTimeout(processNextFrame, 0);
      };

      // Start processing
      processNextFrame();
    } catch (error) {
      reject(error);
    }
  });
}
