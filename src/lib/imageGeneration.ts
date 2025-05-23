// AmigcChat.io API for image generation
const AMIGOCHAT_API_URL = 'https://api.amigochat.io/v1/images/generations';
const AMIGOCHAT_API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIwNmUyMzExNC1jNTBiLTQzOTYtYTAwNS1jYzI4NGEyZTk0MDEiLCJpYXQiOjE3NDYxOTE3NDQsImV4cCI6MTc0ODc4Mzc0NH0.mSAy7_BiRpe5KnKDXG2TstQ7QA_o7cCQCZx2GaSJhjY';
const DEVICE_UUID = '8d9ffae4-d504-40c1-adba-53abfcfa9923';

export async function generateImage(prompt: string): Promise<Blob> {
  try {
    // Generate a random chat ID for each request
    const chatId = generateRandomUUID();
    
    const response = await fetch(AMIGOCHAT_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${AMIGOCHAT_API_KEY}`,
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'en-US,en;q=0.6',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36',
        'x-device-language': 'en',
        'x-device-platform': 'web',
        'x-device-uuid': DEVICE_UUID,
        'x-device-version': '1.1.11',
      },
      body: JSON.stringify({
        chatId: chatId,
        prompt: prompt,
        model: "recraft-v3",
        personaId: "image-generator"
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || 'Failed to generate image');
    }

    const data = await response.json();
    
    // Check if we have the image URL in the response
    if (!data.imageUrl) {
      throw new Error('No image URL in response');
    }
    
    // Fetch the image from the URL
    const imageResponse = await fetch(data.imageUrl);
    if (!imageResponse.ok) {
      throw new Error('Failed to fetch generated image');
    }
    
    return await imageResponse.blob();
  } catch (error: any) {
    console.error('Error generating image:', error);
    throw new Error(error.message || 'Failed to generate image');
  }
}

// Helper to generate UUID
function generateRandomUUID(): string {
  return 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'.replace(/[x]/g, function() {
    return Math.floor(Math.random() * 16).toString(16);
  });
}

export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Failed to convert blob to data URL'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read blob'));
    reader.readAsDataURL(blob);
  });
}