console.log('popup.js loaded successfully');

document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM fully loaded');

  // Get DOM elements
  const parseSelectButton = document.getElementById('parseSelectButton');
  const copyButton = document.getElementById('copyButton');

  // Open etch.html when "Start Etch" is clicked
  document.getElementById('startEtchButton').addEventListener('click', () => {
    chrome.windows.create({
      url: chrome.runtime.getURL('etch.html'),
      type: 'popup',
      width: 400,
      height: 300
    });
  });

  // Open file selection window
  if (parseSelectButton) {
    parseSelectButton.addEventListener('click', () => {
      chrome.windows.create({
        url: chrome.runtime.getURL('decode.html?section=parse'),
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

});