console.log('popup.js loaded successfully');

document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM fully loaded');

  // Function to shorten LNURL for display
  function shortenLnurl(lnurl) {
    return lnurl.length > 20 ? `${lnurl.slice(0, 6)}...${lnurl.slice(-6)}` : lnurl;
  }

  // Get DOM elements
  const parseSelectButton = document.getElementById('parseSelectButton');
  const resultElement = document.getElementById('result');
  const copyButton = document.getElementById('copyButton');
  console.log('parseSelectButton:', parseSelectButton);
  console.log('resultElement:', resultElement);
  console.log('copyButton:', copyButton);

  // Load latest stored result
  if (resultElement) {
    chrome.storage.local.get(['history'], (data) => {
      if (data.history && data.history.length > 0) {
        const latest = data.history[0];
        resultElement.textContent = `LN Address: ${shortenLnurl(latest.lnurl)}`;
        copyButton.style.display = 'inline-block';
        console.log('Loaded latest result:', latest);
      } else {
        console.log('No stored result found');
        resultElement.textContent = 'No previous result found.';
        copyButton.style.display = 'none';
      }
    });
  } else {
    console.error('resultElement not found');
  }

  // Open file selection window
  if (parseSelectButton) {
    parseSelectButton.addEventListener('click', () => {
      chrome.windows.create({
        url: chrome.runtime.getURL('file-select.html?section=parse'),
        type: 'popup',
        width: 400,
        height: 300
      });
    });
  }

  // Handle copy button
  if (copyButton) {
    copyButton.addEventListener('click', () => {
      chrome.storage.local.get(['history'], (data) => {
        if (data.history && data.history.length > 0) {
          const lnurl = data.history[0].lnurl;
          navigator.clipboard.writeText(lnurl).then(() => {
            copyButton.textContent = 'Copied!';
            console.log('Copied LNURL:', lnurl);
            setTimeout(() => {
              copyButton.textContent = 'Copy';
            }, 2000);
          }).catch((err) => {
            console.error('Failed to copy:', err);
          });
        }
      });
    });
  }

  // Open history.html when "View History" is clicked
  document.getElementById('historyButton').addEventListener('click', () => {
    chrome.windows.create({
      url: chrome.runtime.getURL('history.html'),
      type: 'popup',
      width: 600,
      height: 400
    });
  });

  // Listen for processed LNURL from file-select.html
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'lnurlProcessed') {
      const { lnurl } = message;
      if (resultElement && (lnurl.startsWith('lnurl') || lnurl.startsWith('lnbc'))) {
        resultElement.textContent = `LN Address: ${shortenLnurl(lnurl)}`;
        copyButton.style.display = 'inline-block';
      }
      sendResponse({ received: true });
    }
  });
});