
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { AuthProvider } from './contexts/AuthContext.tsx';

console.log("System Entry: Loading index.tsx");

const rootElement = document.getElementById('root');

if (rootElement) {
  try {
    const root = createRoot(rootElement);
    root.render(
      <AuthProvider>
        <App />
      </AuthProvider>
    );
    console.log("System Core Mounted Successfully");
  } catch (err) {
    console.error("Critical Mount Error:", err);
    rootElement.innerHTML = `
      <div style="color:red; padding:20px; background:white; height:100vh;">
        <h1>Application Error</h1>
        <pre>${err.message}\n${err.stack}</pre>
      </div>
    `;
  }
} else {
  console.error("Critical Failure: Root element not found.");
}
