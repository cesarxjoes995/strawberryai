// AmigcChat.io API for image generation
const AMIGOCHAT_API_URL = 'https://api.amigochat.io/v1/images/generations';
const AMIGOCHAT_API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIwNmUyMzExNC1jNTBiLTQzOTYtYTAwNS1jYzI4NGEyZTk0MDEiLCJpYXQiOjE3NDYxOTE3NDQsImV4cCI6MTc0ODc4Mzc0NH0.mSAy7_BiRpe5KnKDXG2TstQ7QA_o7cCQCZx2GaSJhjY';
const DEVICE_UUID = '8d9ffae4-d504-40c1-adba-53abfcfa9923';

// Using the exact chatId from the example to ensure compatibility
const FIXED_CHAT_ID = '432f275e-76a4-294f-9ff3-a08ed1a3e56c';

export async function generateImage(prompt: string): Promise<Blob> {
  try {
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
        chatId: FIXED_CHAT_ID,
        prompt: prompt,
        model: "recraft-v3",
        personaId: "image-generator"
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('API Error Response:', errorData);
      throw new Error(errorData.error?.message || 'Failed to generate image');
    }

    const data = await response.json();
    console.log('API Success Response:', data);
    
    // Extract URL from the correct location in the response
    // The API returns { created: timestamp, data: [{ revised_prompt: string, url: string }] }
    if (!data.data || !Array.isArray(data.data) || data.data.length === 0 || !data.data[0].url) {
      console.error('Response format incorrect:', data);
      throw new Error('No image URL in response');
    }
    
    const imageUrl = data.data[0].url;
    console.log('Image URL extracted:', imageUrl);
    
    // Fetch the image from the URL
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      throw new Error('Failed to fetch generated image');
    }
    
    return await imageResponse.blob();
  } catch (error: any) {
    console.error('Error generating image:', error);
    throw new Error(error.message || 'Failed to generate image');
  }
}

// No longer needed as we're using a fixed chatId
// function generateRandomUUID(): string {
//   return 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'.replace(/[x]/g, function() {
//     return Math.floor(Math.random() * 16).toString(16);
//   });
// }

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