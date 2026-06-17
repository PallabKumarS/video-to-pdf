self.onmessage = async (e: MessageEvent) => {
  const { bitmap, id, time } = e.data;

  try {
    const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
    const ctx = canvas.getContext("2d");
    
    if (!ctx) {
      throw new Error("Could not get 2d context from OffscreenCanvas");
    }

    ctx.drawImage(bitmap, 0, 0);

    const blob = await canvas.convertToBlob({
      type: "image/jpeg",
      quality: 0.9,
    });

    const reader = new FileReader();
    reader.onloadend = () => {
      self.postMessage({
        success: true,
        id,
        time,
        dataUrl: reader.result as string,
      });
    };
    
    reader.onerror = () => {
      self.postMessage({ success: false, error: "Failed to read blob" });
    };
    
    reader.readAsDataURL(blob);
  } catch (error) {
    self.postMessage({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  } finally {
    // Release bitmap memory
    bitmap.close();
  }
};
