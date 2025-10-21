import React from 'react';
import ReactDOM from 'react-dom/client';
import { Buffer } from 'buffer';
import App from './App.jsx';
import './App.css';
import { initializeBitcoinLibraries } from './utils/bitcoinLibraries.js';

window.Buffer = Buffer;
globalThis.Buffer = Buffer;

async function initializeApp() {
  try {
    await initializeBitcoinLibraries();
    
    ReactDOM.createRoot(document.getElementById('root')).render(
      <App />
    );
  } catch (error) {
    
    ReactDOM.createRoot(document.getElementById('root')).render(
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        height: '100vh',
        flexDirection: 'column',
        fontFamily: 'system-ui',
        color: '#dc3545'
      }}>
        <h2> Initialization Error</h2>
        <p>Failed to load Bitcoin libraries. Please refresh the page.</p>
        <button 
          onClick={() => window.location.reload()}
          style={{
            marginTop: '1rem',
            padding: '8px 16px',
            background: '#dc3545',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Reload Page
        </button>
      </div>
    );
  }
}

initializeApp();
