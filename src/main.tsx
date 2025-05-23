import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { ClerkProvider } from '@clerk/clerk-react';

// Get the Frontend API key from environment variables
const CLERK_FRONTEND_API_KEY = import.meta.env.VITE_CLERK_FRONTEND_API_KEY;

if (!CLERK_FRONTEND_API_KEY) {
  throw new Error("Missing VITE_CLERK_FRONTEND_API_KEY environment variable");
}

// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', () => {
  const rootElement = document.getElementById('root');

  if (!rootElement) {
    console.error('Failed to find the root element');
    return;
  }

  // Clear any loading content
  rootElement.innerHTML = '';

  createRoot(rootElement).render(
    <React.StrictMode>
      <ClerkProvider publishableKey={CLERK_FRONTEND_API_KEY}>
        <App />
      </ClerkProvider>
    </React.StrictMode>
  );
});