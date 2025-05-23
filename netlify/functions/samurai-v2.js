// Netlify function for Samurai Ai v2 model using Blackbox.ai API
const axios = require('axios');

exports.handler = async function(event, context) {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method Not Allowed' })
    };
  }

  try {
    // Parse the incoming request body
    const requestBody = JSON.parse(event.body);
    const { messages } = requestBody;

    if (!messages || !Array.isArray(messages)) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Invalid request format. Messages array is required.' })
      };
    }

    // Format the request for Blackbox API
    const blackboxPayload = {
      messages: messages.map(msg => ({
        id: msg.id || generateId(),
        content: msg.content,
        role: msg.role
      })),
      agentMode: {},
      id: generateId(),
      codeModelMode: true,
      maxTokens: 1024,
      isMemoryEnabled: true,
      validated: "00f37b34-a166-4efb-bce5-1312d87f2f94", // Using the validation from your curl example
      webSearchModeOption: {
        autoMode: true,
        webMode: false,
        offlineMode: false
      },
      isPremium: true
    };

    // The sessionId and other cookies from your curl example
    const sessionId = '50acbbab-f9be-4f46-82b3-c4236c67a5a7';
    const authSessionToken = 'eyJhbGciOiJkaXIiLCJlbmMiOiJBMjU2R0NNIn0..JhkvOOGgyN3zJokF.lAdpZP1LhT92TaGYllHtAQoYmyNm97owqVf2O8Iv65DmPDJ7v6yrcO3Dyqeiau-MHDp3pJfeLKIflZdjNXiJZfj9mbq0KGyGKu-pj140bj6GVlA9xz7eI8qLfPkOhMHcKCbmfqaMCidL5-qwWEy9JVP12rkECQIKIILoAKGait6slBZ0-g7yKbSLhCpiI_6BN3dRqo6_Y9L5JSnpvlYsLhHrpJgk_ntNX3cOpXoh1ngVNdul7H7GIRSWCv5dFDBqrIrwffx4Un432J-9at67w-QBZnGzDqXoOX8Ul0DCDDhyTy9eJz6Z89DWb_mdVb8uZCKh8OhASaG2jFx1NO5-7oUZqLruBey7Ar9N9arYIWfKONMbcc_-24vHJ-l4lGy4kHJxr2vlskBGmT3FfoWw8tmQmv--z7BiIDDTJV1YRWOfi2tLsCyPHQ7HtmTfdy50MkPeaohGo99F4-iT5KzyAXjM2dlWRgK62e8apNwWFYCV4bqH9bafZo6EIW6d1GmBeWLTa-09cXv95c2OtDrlk8G-1uz6L7VFQ4xI.GTEaVEnajW692gYjqASqwQ';

    // Headers for the Blackbox API request
    const headers = {
      'accept': '*/*',
      'accept-language': 'en-US,en;q=0.8',
      'content-type': 'application/json',
      'origin': 'https://www.blackbox.ai',
      'referer': 'https://www.blackbox.ai/',
      'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36',
      'Cookie': `sessionId=${sessionId}; __Secure-authjs.session-token=${authSessionToken}`
    };

    // Make the request to Blackbox API
    const response = await axios.post(
      'https://www.blackbox.ai/api/chat',
      blackboxPayload,
      { headers }
    );

    // Stream the response (simplified here - full streaming would require more complex setup)
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*', // Allow cross-origin requests
        'Access-Control-Allow-Headers': 'Content-Type'
      },
      body: JSON.stringify({
        model: "Samurai Ai v2",
        response: response.data,
        message: "Response from Blackbox.ai (Samurai Ai v2)"
      })
    };

  } catch (error) {
    console.error('Error processing request:', error);
    
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: 'Error communicating with Blackbox API',
        details: error.message
      })
    };
  }
};

// Helper function to generate random IDs similar to those in your example
function generateId() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 7; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
} 