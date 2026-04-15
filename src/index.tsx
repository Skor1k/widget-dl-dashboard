import { setI18nLang } from '@adv-frontend/l10n';
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

setI18nLang('ru');

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
