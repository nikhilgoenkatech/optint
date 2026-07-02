import React from 'react';
import { createRoot } from 'react-dom/client';
import { IntlProvider } from 'react-intl';
import { App } from './components/App';

const container = document.getElementById('root');
if (!container) throw new Error('Root element #root not found');

createRoot(container).render(
  <React.StrictMode>
    <IntlProvider locale="en" defaultLocale="en">
      <App />
    </IntlProvider>
  </React.StrictMode>
);
