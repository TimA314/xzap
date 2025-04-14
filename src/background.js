console.log('XZap background script loaded');

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'lnurlProcessed') {
      console.log('background.js: Received lnurlProcessed message:', {
        fileName: message.fileName,
        lnurl: message.lnurl,
        timestamp: message.timestamp
      });
      // Optionally process the LNURL here (e.g., log to storage, notify user)
      sendResponse({ status: 'received' });

    }
  });