import React from 'react';
import ReactDOM from 'react-dom/client';
import {MantineProvider} from '@mantine/core';
import '@mantine/core/styles.css';
import App from './App';
import './styles/app.css';
import {theme} from './styles/theme';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <MantineProvider theme={theme} defaultColorScheme="dark">
      <App />
    </MantineProvider>
  </React.StrictMode>,
);
