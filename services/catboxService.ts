
// The original Catbox API URL.
const CATBOX_API_URL = "https://catbox.moe/user/api.php";

// A CORS proxy is used to bypass browser restrictions on cross-origin requests.
// The Catbox.moe API does not send the required CORS headers for direct client-side access,
// so we route the request through a proxy that adds the necessary headers.
// Note: Public proxies are not recommended for production use.
const PROXIED_CATBOX_URL = `https://cors-anywhere.herokuapp.com/${CATBOX_API_URL}`;

export const uploadToCatbox = async (file: File): Promise<string> => {
  const formData = new FormData();
  formData.append('reqtype', 'fileupload');
  formData.append('userhash', ''); // Anonymous upload
  formData.append('fileToUpload', file);

  try {
    // We send the request to the proxied URL instead of the direct API URL.
    const response = await fetch(PROXIED_CATBOX_URL, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      // It's useful to log the response body on error for debugging proxy issues.
      const errorBody = await response.text();
      console.error("Proxy or API error response:", errorBody);
      throw new Error(`Catbox API Error: ${response.status} ${response.statusText}`);
    }

    const fileUrl = await response.text();
    if (!fileUrl.startsWith('http')) {
        throw new Error(`Invalid response from Catbox: ${fileUrl}`);
    }
    return fileUrl;
  } catch (error) {
    console.error("Failed to upload to Catbox:", error);
    throw error;
  }
};
