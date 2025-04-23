console.log('weblnDetector.js running');

// Function to perform WebLN actions in the webpage's context
async function performWebLNAction(action, data) {
  if (!window.webln) {
    console.error('WebLN not available');
    window.postMessage({ type: 'WEBLN_UNAVAILABLE' }, '*');
    return;
  }

  try {
    if (action === 'enable') {
      await window.webln.enable();
      window.postMessage({ type: 'WEBLN_ACTION_RESPONSE', success: true, result: 'enabled' }, '*');
    } else if (action === 'sendPayment') {
      const result = await window.webln.sendPayment(data.lnurl);
      window.postMessage({ type: 'WEBLN_ACTION_RESPONSE', success: true, result: result }, '*');
    }
  } catch (error) {
    console.error('WebLN action failed:', error.message);
    window.postMessage({ type: 'WEBLN_ACTION_RESPONSE', success: false, error: error.message }, '*');
  }
}

// Listen for payment requests from the content script
window.addEventListener('message', function(event) {
  if (event.data.type === 'ZAP_PAYMENT_REQUEST') {
    console.log('Received ZAP_PAYMENT_REQUEST for LNURL:', event.data.lnurl);
    // First, enable WebLN if needed, then send the payment
    performWebLNAction('enable').then(() => {
      performWebLNAction('sendPayment', { lnurl: event.data.lnurl });
    });
  }
});

// Check for WebLN availability periodically
function checkWebLN() {
  if (window.webln) {
    console.log('WebLN detected');
  } else {
    console.log('WebLN not yet available, retrying...');
    setTimeout(checkWebLN, 500); // Retry every 500ms
  }
}

// Start checking for WebLN
checkWebLN();

// Listen for the webln:ready event (optional, for some providers)
window.addEventListener('webln:ready', function() {
  console.log('webln:ready event fired');
  if (window.webln) {
    console.log('WebLN confirmed available after webln:ready');
  }
});