import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router-dom'; // ← Change this
import App from './App';
import './index.css';

import { ThemeProvider } from "@material-tailwind/react";
import { SettingsProvider } from "./pages/Eac-attendance/context/SettingsContext";
import { ThemeProvider as AppThemeProvider } from "./context/ThemeContext";
import AppDialogProvider from "./components/AppDialogProvider";

createRoot(document.getElementById('root')).render(
  <HashRouter>  {/* ← Change from BrowserRouter to HashRouter */}
    <AppThemeProvider>
      <ThemeProvider>
        <SettingsProvider>
          <AppDialogProvider>
            <App />
          </AppDialogProvider>
        </SettingsProvider>
      </ThemeProvider>
    </AppThemeProvider>
  </HashRouter>
);
