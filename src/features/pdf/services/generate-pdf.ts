/**
 * Heavy Service: Generates a multi-page PDF document from extracted video frames
 * matching the exact aspect ratio and orientation of the video.
 */

import { jsPDF } from "jspdf";
import type { ExtractedFrame } from "../../video/services/extract-frames";
import { calculatePdfDimensions } from "../utils/pdf-dimensions";

export async function generatePdfFromFrames(
  frames: ExtractedFrame[],
  videoWidth: number,
  videoHeight: number,
  onProgress?: (current: number, total: number) => void,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    try {
      if (!frames || frames.length === 0) {
        throw new Error("No frames provided for PDF generation");
      }

      const { orientation, format } = calculatePdfDimensions(
        videoWidth,
        videoHeight,
      );

      const pdf = new jsPDF({
        orientation,
        unit: "px",
        format,
      });

      const totalFrames = frames.length;
      let currentIndex = 0;

      const processNextPage = () => {
        if (currentIndex >= totalFrames) {
          const blob = pdf.output("blob");
          resolve(blob);
          return;
        }

        const frame = frames[currentIndex];

        if (currentIndex > 0) {
          pdf.addPage(format, orientation);
        }

        pdf.addImage(frame.dataUrl, "JPEG", 0, 0, format[0], format[1]);

        currentIndex++;
        if (onProgress) {
          onProgress(currentIndex, totalFrames);
        }

        setTimeout(processNextPage, 0);
      };

      processNextPage();
    } catch (error) {
      reject(error);
    }
  });
}
