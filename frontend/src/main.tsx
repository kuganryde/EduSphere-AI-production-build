/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
 
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';
 
const root = document.getElementById('root');
 
if (!root) {
  throw new Error(
    'Root element not found. Make sure index.html has <div id="root"></div>'
  );
}
 
createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>
);
 