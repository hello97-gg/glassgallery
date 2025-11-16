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
 * Uploads a file to Catbox via our own server-side API proxy.
 * This avoids CORS issues by having the server handle the upload.
 * @param file The image file to upload.
 * @returns A promise that resolves with the direct URL to the uploaded file.
 */
export const uploadToCatbox = async (file: File): Promise<string> => {
  try {
    // 1. Convert the file to a Base64 string.
    const base64File = await fileToBase64(file);

    // 2. Send the Base64 string and filename to our local API endpoint.
    const response = await fetch('/api/uploadToCatbox', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        file: base64File,
        name: file.name,
      }),
    });

    // 3. Handle the response from our API.
    if (!response.ok) {
      const errorData = await response.json();
      console.error("API proxy error response:", errorData);
      throw new Error(`Upload failed: ${errorData.error || response.statusText}`);
    }

    const data = await response.json();
    const fileUrl = data.url;

    if (!fileUrl || !fileUrl.startsWith('http')) {
        throw new Error(`Invalid URL received from server: ${fileUrl}`);
    }
    
    // 4. Return the final URL from Catbox.
    return fileUrl;
    
  } catch (error) {
    console.error("Failed to upload via API proxy:", error);
    // Re-throw the error so the UI component can catch it.
    throw error;
  }
};
