# Strawberry AI Chat Interface

A modern chat interface for interacting with various AI models, including custom models.

## Features

- Chat interface for multiple AI models
- Markdown support with syntax highlighting
- Mobile-responsive design
- Authentication and session management
- Custom scrollbar styling
- API integration with multiple providers

## Netlify Functions

This project uses Netlify Functions to provide server-side capabilities:

### Samurai AI v2

A custom function (`netlify/functions/samurai-v2.js`) is used to interact with the Blackbox.ai API specifically for the "Samurai AI v2" model. This provides:

- Secure API key management (keys not exposed to client)
- Response formatting and error handling
- Cross-origin request support

## Development

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the development server:
   ```bash
   npm run dev
   ```

3. For Netlify Function development, install the Netlify CLI:
   ```bash
   npm install -g netlify-cli
   ```

4. Run Netlify dev server (includes function support):
   ```bash
   netlify dev
   ```

## Deployment

This project is configured for deployment on Netlify. Simply connect your GitHub repository to Netlify and it will automatically build and deploy the site according to the settings in `netlify.toml`.

## Credits

- Powered by Vite, React, and TypeScript
- Styling with Tailwind CSS
- Icons from Lucide
- Syntax highlighting with react-syntax-highlighter 