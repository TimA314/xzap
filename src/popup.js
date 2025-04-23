console.log('popup.js loaded successfully');

document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM fully loaded');

  // Get DOM elements
  const parseSelectButton = document.getElementById('parseSelectButton');
  const copyButton = document.getElementById('copyButton');
  const defaultAmountInput = document.getElementById('defaultAmountInput');
  const saveDefaultButton = document.getElementById('saveDefaultButton');
  const deleteDefaultButton = document.getElementById('deleteDefaultButton');

  // Load the current default amount
  chrome.storage.local.get(['defaultAmount'], (result) => {
    if (result.defaultAmount) {
      defaultAmountInput.value = result.defaultAmount;
    }
  });

  // Save default amount
  saveDefaultButton.addEventListener('click', () => {
    const amount = parseInt(defaultAmountInput.value, 10);
    if (amount > 0) {
      chrome.storage.local.set({ defaultAmount: amount }, () => {
        console.log('Default amount saved:', amount);
        saveDefaultButton.textContent = 'Saved!';
        setTimeout(() => {
          saveDefaultButton.textContent = 'Save Default';
        }, 2000);
      });
    } else {
      alert('Please enter a positive number');
    }
  });

  // Delete default amount
  deleteDefaultButton.addEventListener('click', () => {
    chrome.storage.local.remove('defaultAmount', () => {
      console.log('Default amount deleted');
      defaultAmountInput.value = '';
      deleteDefaultButton.textContent = 'Deleted!';
      setTimeout(() => {
        deleteDefaultButton.textContent = 'Delete Default';
      }, 2000);
    });
  });

  // Hide deleteDefaultButton if there is no default amount
  chrome.storage.local.get(['defaultAmount'], (result) => {
    if (!result.defaultAmount) {
      deleteDefaultButton.style.display = 'none';
    }
  });

  // Show deleteDefaultButton when a default amount is saved
  saveDefaultButton.addEventListener('click', () => {
    const amount = parseInt(defaultAmountInput.value, 10);
    if (amount > 0) {
      deleteDefaultButton.style.display = 'inline-block';
    }
  });

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