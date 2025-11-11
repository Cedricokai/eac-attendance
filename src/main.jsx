import React from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router-dom'; // ← Change this
import App from './App';
import './index.css';

import { ThemeProvider } from "@material-tailwind/react";

createRoot(document.getElementById('root')).render(
  <HashRouter>  {/* ← Change from BrowserRouter to HashRouter */}
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </HashRouter>
);