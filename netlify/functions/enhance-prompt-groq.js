const Groq = require('groq-sdk');

const groqApiKey = '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';
const client = new Groq({ apiKey: groqApiKey });

exports.handler = async function(event, context) {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method Not Allowed' })
    };
  }

  try {
    const { prompt } = JSON.parse(event.body);

    if (!prompt) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Prompt is required' })
      };
    }

    const chatCompletion = await client.chat.completions.create({
      messages: [
        {
          role: "system",
          content: "You are a prompt enhancer. Your task is to improve the given prompt by making it more detailed, structured, and effective for an AI model. Add relevant details, context, and specific instructions. Output ONLY the enhanced prompt text. Do not add any explanations, formatting, quotation marks, or additional text."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      model: "llama-3.3-70b-versatile",
      temperature: 0.7, // Add some creativity
      max_tokens: 1024, // Allow for longer, more detailed prompts
    });

    const enhancedPrompt = chatCompletion.choices[0]?.message?.content;

    if (!enhancedPrompt) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Failed to get enhanced prompt from Groq API' })
      };
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*', // Adjust in production
        'Access-Control-Allow-Headers': 'Content-Type'
      },
      body: JSON.stringify({ enhancedPrompt })
    };

  } catch (error) {
    console.error('Groq API Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Error communicating with Groq API',
        details: error.message
      })
    };
  }
}; 