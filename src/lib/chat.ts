import type { Message } from './types';

export type ModelProvider = 'openrouter' | 'puter' | 'typegpt' | 'samurai';

interface ChatResponse {
  content: string; // This might represent initial successful connection or final content for non-streamed
  error?: string;
}

const SAMURAI_API_ENDPOINT = 'https://newapi-9qln.onrender.com/';
const SAMURAI_API_KEY = 'Samurai-AP1-Fr33';
// New Samurai v2 endpoint - will use the Netlify function in production
const SAMURAI_V2_API_ENDPOINT = process.env.NODE_ENV === 'production' 
  ? '/api/samurai-v2' 
  : 'http://localhost:8888/.netlify/functions/samurai-v2';

// Proxy URLs to hide API endpoints
const PROXY_URLS = {
  openrouter: 'https://openrouter.ai/api/v1/chat/completions',
  typegpt: 'https://fast.typegpt.net/v1/chat/completions',
  samurai: `${SAMURAI_API_ENDPOINT}v1/chat/completions` // Adjusted for typical OpenAI style
} as const;

// Function to encode and encrypt API keys
const encodeApiKey = (key: string, provider: string) => {
  const timestamp = Date.now().toString(36);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const encoder = new TextEncoder();
  const keyData = encoder.encode(`${timestamp}:${key}`);
  
  // XOR encryption with salt
  const encryptedData = new Uint8Array(keyData.length);
  for (let i = 0; i < keyData.length; i++) {
    encryptedData[i] = keyData[i] ^ salt[i % salt.length];
  }
  
  // Convert to base64 with salt prefix
  const encoded = btoa(String.fromCharCode.apply(null, [...salt, ...encryptedData]));
  return encoded;
};

// Secure key storage using closure
const secureKeyStore = (() => {
  const store = new Map<string, string>();
  return {
    set: (provider: string, key: string) => store.set(provider, encodeApiKey(key, provider)),
    get: (provider: string) => store.get(provider)
  };
})();

// Initialize API keys securely
const initializeApiKeys = () => {
  if (import.meta.env.VITE_TYPEGPT_API_KEY) {
    secureKeyStore.set('typegpt', import.meta.env.VITE_TYPEGPT_API_KEY);
  }
  if (import.meta.env.VITE_OPENROUTER_API_KEY) {
    secureKeyStore.set('openrouter', import.meta.env.VITE_OPENROUTER_API_KEY);
  }
  // No need to store Samurai key as it's hardcoded for now, but you might want to use VITE_SAMURAI_API_KEY in future
};

// Initialize keys
initializeApiKeys();

export async function sendChatMessage(
  messages: Message[],
  model: string,
  provider: ModelProvider,
  signal?: AbortSignal,
  onChunk?: (chunk: string, isDone: boolean) => void // Callback for streaming updates
): Promise<ChatResponse> {
  try {
    // Special handling for Samurai Ai v2
    if (model === 'Samurai Ai v2') {
      return await sendSamuraiV2Message(messages, signal, onChunk);
    }
    
    let apiUrl: string;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
     // For streaming, accept text/event-stream or application/x-ndjson depending on API
    if (provider === 'samurai' && onChunk) {
        headers['Accept'] = 'text/event-stream'; 
    } else {
        headers['Accept'] = 'application/json';
    }

    if (provider === 'samurai') {
      apiUrl = PROXY_URLS.samurai;
      headers['Authorization'] = `Bearer ${SAMURAI_API_KEY}`;
    } else if (provider === 'typegpt') {
      apiUrl = PROXY_URLS.typegpt;
      // Assuming typegpt key is still needed and stored securely if VITE_TYPEGPT_API_KEY is set
      const typeGptApiKey = secureKeyStore.get('typegpt');
      if (typeGptApiKey) {
        headers['Authorization'] = `Bearer ${atob(typeGptApiKey).split(':')[1]}`;
      } else {
        // Fallback or error if key not found for typegpt, though Samurai is the new primary
        console.warn('TypeGPT API key not found, but provider is typegpt. This might fail.');
      }
    } else if (provider === 'openrouter') {
      apiUrl = PROXY_URLS.openrouter;
      // Assuming openrouter key is still needed and stored securely if VITE_OPENROUTER_API_KEY is set
      const openRouterApiKey = secureKeyStore.get('openrouter');
      if (openRouterApiKey) {
        headers['Authorization'] = `Bearer ${atob(openRouterApiKey).split(':')[1]}`;
        headers['HTTP-Referer'] = window.location.href; // Specific to OpenRouter
        headers['X-Title'] = 'Strawberry AI'; // Specific to OpenRouter
      } else {
        console.warn('OpenRouter API key not found, but provider is openrouter. This might fail.');
      }
    } else if (provider === 'puter') {
      // Handle Puter AI separately as it uses a different client-side SDK method
      if (typeof window === 'undefined' || !window.puter?.ai?.chat) {
        throw new Error('Puter AI is not available yet. Please try again in a moment.');
      }
      const response = await window.puter.ai.chat(
        messages.map(m => m.content).join('\n'),
        { model: model, stream: !!onChunk } // Enable puter stream if onChunk is provided
      );

      if (onChunk && response && typeof response.getReader === 'function') { // Check if it's a ReadableStream
        const reader = response.getReader();
        const decoder = new TextDecoder();
        let done = false;
        while(!done) {
            const { value, done: streamDone } = await reader.read();
            done = streamDone;
            if (value) {
                // Assuming puter stream provides chunks directly as text or needs specific parsing
                const puterChunk = decoder.decode(value, {stream: !done});
                 // This part needs to be adapted based on actual Puter stream format
                // For now, let's assume it sends objects like { content: "..." } or just text strings
                try {
                    const parsedChunk = JSON.parse(puterChunk); // Example if chunk is JSON
                    if(parsedChunk.message && parsedChunk.message.content && parsedChunk.message.content[0].text) {
                         onChunk(parsedChunk.message.content[0].text, done);
                    } else if (typeof parsedChunk.content === 'string'){
                        onChunk(parsedChunk.content, done);
                    }
                } catch(e) {
                    if(typeof puterChunk === 'string') onChunk(puterChunk, done); // If not JSON, assume raw text
                }
            }
        }
        return { content: '' }; // Final content handled by stream
      } else if (response && response.message && response.message.content) {
          // Non-streamed Puter response
          return { content: response.message.content[0]?.text || 'No response generated' };
      }
      throw new Error('Invalid response format from Puter AI');
    } else {
      throw new Error(`Unsupported provider: ${provider}`);
    }

    const payload = {
      model,
      messages: messages.map(msg => ({
        role: msg.role,
        content: msg.content,
      })),
      temperature: 0.7,
      max_tokens: 2000, // Increased max_tokens for potentially longer responses
      stream: !!onChunk // Enable stream if onChunk callback is provided
    };

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      signal,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.error?.message || 
                          errorData.message || 
                          errorData.error || 
                          `Failed to get response (${response.status}) from ${provider}`;
      console.error(`${provider} API error:`, errorData);
      throw new Error(errorMessage);
    }

    if (payload.stream && response.body && onChunk) {
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let done = false;

      while (!done) {
        const { value, done: streamDone } = await reader.read();
        done = streamDone;
        if (value) {
          const chunk = decoder.decode(value, { stream: !done });
          const lines = chunk.split('\n').filter(line => line.trim() !== '');
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const jsonData = line.substring(6).trim();
              if (jsonData === '[DONE]') {
                onChunk('', true); // Signal stream completion
                done = true; // Ensure outer loop also exits if [DONE] is the only thing in this chunk
                break;
              }
              try {
                const parsed = JSON.parse(jsonData);
                if (parsed.choices && parsed.choices[0] && parsed.choices[0].delta && parsed.choices[0].delta.content) {
                  onChunk(parsed.choices[0].delta.content, false);
                }
              } catch (e) {
                console.warn('Error parsing stream data chunk:', e, jsonData);
              }
            }
          }
        }
        if (done && onChunk) { // If stream ended without a [DONE] message from server
            onChunk('', true);
        }
      }
      return { content: '' }; // Main content is delivered via onChunk
    } else {
      const data = await response.json();
      if (!data || !data.choices || !data.choices[0] || !data.choices[0].message) {
        console.error('Invalid API response (non-streamed):', data);
        throw new Error('Invalid response format from API (non-streamed)');
      }
      return { 
          content: typeof data.choices[0].message.content === 'string' ? data.choices[0].message.content : JSON.stringify(data.choices[0].message.content) 
      };
    }

  } catch (error: any) {
    console.error('Chat error:', error);
    if (onChunk) onChunk('', true); // Ensure isDone is called on error for cleanup
    if (error.name === 'AbortError') {
      return { content: '', error: 'Request was cancelled' };
    }
    const errorMessage = error.message.includes('API') || error.message.includes('Failed to get response')
      ? error.message 
      : 'Failed to get response from AI. Please try again.';
    return { content: '', error: errorMessage };
  }
}

// New function to handle Samurai Ai v2 requests via our Netlify function
async function sendSamuraiV2Message(
  messages: Message[],
  signal?: AbortSignal,
  onChunk?: (chunk: string, isDone: boolean) => void
): Promise<ChatResponse> {
  try {
    const response = await fetch(SAMURAI_V2_API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: messages.map(msg => ({
          role: msg.role,
          content: msg.content,
          id: Math.random().toString(36).substring(2, 9) // Generate a random ID similar to the Blackbox format
        }))
      }),
      signal
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.error || errorData.details || `Failed to get response (${response.status}) from Samurai Ai v2`;
      console.error('Samurai V2 API error:', errorData);
      throw new Error(errorMessage);
    }

    const data = await response.json();
    
    // If there's a streaming callback, simulate streaming with the full response
    if (onChunk && data.response && data.response.choices && data.response.choices[0] && data.response.choices[0].message) {
      const content = data.response.choices[0].message.content;
      
      // Simple simulation of streaming by sending chunks of text with delays
      // In a real implementation, the Netlify function would handle the streaming
      const chunkSize = 5; // characters
      for (let i = 0; i < content.length; i += chunkSize) {
        const chunk = content.substring(i, i + chunkSize);
        onChunk(chunk, false);
        // Small delay to simulate streaming
        await new Promise(resolve => setTimeout(resolve, 10));
      }
      onChunk('', true); // Signal stream completion
      return { content: '' }; // Content delivered via onChunk
    }
    
    // Non-streaming response
    if (data.response && data.response.choices && data.response.choices[0] && data.response.choices[0].message) {
      return { content: data.response.choices[0].message.content };
    } else {
      console.error('Invalid Samurai V2 API response:', data);
      throw new Error('Invalid response format from Samurai Ai v2 API');
    }

  } catch (error: any) {
    console.error('Samurai V2 error:', error);
    if (onChunk) onChunk('', true); // Ensure isDone is called on error for cleanup
    if (error.name === 'AbortError') {
      return { content: '', error: 'Request was cancelled' };
    }
    return { content: '', error: error.message || 'Failed to get response from Samurai Ai v2. Please try again.' };
  }
}