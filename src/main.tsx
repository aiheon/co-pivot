import React from 'react';
import ReactDOM from 'react-dom/client';
import {
  ColorSchemeScript,
  MantineProvider,
  localStorageColorSchemeManager,
} from '@mantine/core';
import '@mantine/core/styles.css';
import App from './App';
import './styles/app.css';
import {theme} from './styles/theme';

const colorSchemeManager = localStorageColorSchemeManager({
  key: 'co-pivot-color-scheme',
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ColorSchemeScript defaultColorScheme="dark" />
    <MantineProvider
      theme={theme}
      defaultColorScheme="dark"
      colorSchemeManager={colorSchemeManager}
    >
      <App />
    </MantineProvider>
  </React.StrictMode>,
);
