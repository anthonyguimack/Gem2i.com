import React from "react";
import ReactDOM from "react-dom/client";
import "@/index.css";
import 'react-quill-new/dist/quill.snow.css';
import App from "@/App";

// Suppress noisy errors raised by browser extensions (e.g. MetaMask injecting
// `window.ethereum` and reporting `Failed to connect to MetaMask` when the
// site never calls a wallet API). These bubble up through CRA's runtime error
// overlay even though they have nothing to do with our code.  We swallow only
// the well-known patterns and let everything else propagate normally.
const SUPPRESSED_ERROR_PATTERNS = [
  /metamask/i,
  /ethereum/i,
  /web3/i,
  /pelagos/i,
  /chrome-extension:/i,
  /moz-extension:/i,
];
const isExtensionNoise = (msg, src) => {
  const text = `${msg || ''} ${src || ''}`;
  return SUPPRESSED_ERROR_PATTERNS.some(p => p.test(text));
};
window.addEventListener('error', (e) => {
  if (isExtensionNoise(e.message, e.filename)) {
    e.stopImmediatePropagation();
    e.preventDefault();
  }
}, true);
window.addEventListener('unhandledrejection', (e) => {
  const reason = e.reason;
  const text = (reason && (reason.message || String(reason))) || '';
  if (isExtensionNoise(text, '')) {
    e.stopImmediatePropagation();
    e.preventDefault();
  }
}, true);

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
