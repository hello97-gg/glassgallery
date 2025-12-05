
/**
 * Converts a File object to a Base64 encoded string.
 * @param file The file to convert.
 * @returns A promise that resolves with the Base64 string (without the data URL prefix).
 */
const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        // The result is a data URL like "data:image/jpeg;base64,LzlqLzRBQ...".
        // We only need the part after the comma.
        const base64String = result.split(',')[1];
        if (base64String) {
          resolve(base64String);
        } else {
          reject(new Error("Failed to extract Base64 string from file."));
        }
      };
      reader.onerror = error => reject(error);
    });
  };
  
  /**
   * Uploads a file to our storage provider (Cloudflare R2) via the server-side API.
   * @param file The image file to upload.
   * @returns A promise that resolves with an object containing the direct URL.
   */
  export const uploadImage = async (file: File): Promise<{ url: string; }> => {
    try {
      // 1. Convert the file to a Base64 string.
      const base64File = await fileToBase64(file);
  
      // 2. Send to R2 API endpoint
      const response = await fetch('/api/uploadToR2', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          file: base64File,
          name: file.name,
        }),
      });
  
      // 3. Handle the response
      if (!response.ok) {
        const errorData = await response.json();
        console.error("Storage API error:", errorData);
        throw new Error(errorData.error || `Upload failed: ${response.statusText}`);
      }
  
      const data = await response.json();
      
      if (!data.url || !data.url.startsWith('http')) {
          throw new Error(`Invalid URL received from server: ${data.url}`);
      }
      
      return { url: data.url };
      
    } catch (error) {
      console.error("Failed to upload image:", error);
      throw error;
    }
  };
