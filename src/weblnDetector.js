console.log('weblnDetector.js running');

let weblnAvailable = false;

function checkWebLN() {
    if (window.webln) {
        if (!weblnAvailable) {
            weblnAvailable = true;
            window.postMessage({ type: 'WEBLN_STATUS', available: true }, '*');
            console.log('WebLN detected');
        }
    } else {
        if (weblnAvailable) {
            weblnAvailable = false;
            window.postMessage({ type: 'WEBLN_STATUS', available: false }, '*');
            console.log('WebLN not available');
        }
        setTimeout(checkWebLN, 500);
    }
}

// Helper function to request a fetch from the content script
async function fetchFromContentScript(url) {
    return new Promise((resolve, reject) => {
        const requestId = Math.random().toString(36).substring(7);
        window.postMessage({ type: 'FETCH_URL', requestId, url }, '*');

        const listener = (event) => {
            if (event.data.type === 'FETCH_URL_RESPONSE' && event.data.requestId === requestId) {
                window.removeEventListener('message', listener);
                if (event.data.success) {
                    resolve(event.data.data);
                } else {
                    reject(new Error(event.data.error));
                }
            }
        };
        window.addEventListener('message', listener);
    });
}

// Function to determine the type of payment request
function getLNURLType(lnurl) {
    if (lnurl.startsWith('lnbc')) return 'direct';
    if (lnurl.includes('@')) return 'lightning-address';
    if (lnurl.startsWith('lnurl')) return 'lnurl-pay';
    return 'unknown';
}

// Function to resolve LNURL-Pay and Lightning Addresses to an invoice
async function resolveToInvoice(lnurl, amount) {
    const type = getLNURLType(lnurl);
    let lnurlPayUrl;

    if (type === 'lightning-address') {
        const [username, domain] = lnurl.split('@');
        lnurlPayUrl = `https://${domain}/.well-known/lnurlp/${username}`;
    } else if (type === 'lnurl-pay') {
        lnurlPayUrl = lnurl; // Assuming it's a URL
    } else {
        throw new Error('Invalid payment type for resolution');
    }

    const lnurlPayData = await fetchFromContentScript(lnurlPayUrl);
    const minSendable = lnurlPayData.minSendable / 1000;
    const maxSendable = lnurlPayData.maxSendable / 1000;
    if (amount < minSendable || amount > maxSendable) {
        throw new Error(`Amount must be between ${minSendable} and ${maxSendable} sats`);
    }

    const invoiceUrl = `${lnurlPayData.callback}?amount=${amount * 1000}`;
    const invoiceData = await fetchFromContentScript(invoiceUrl);
    return invoiceData.pr;
}

// Function to perform WebLNAction in the webpage's context
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
            const { lnurl, amount } = data;
            const type = getLNURLType(lnurl);
            let invoice = lnurl;

            if (type === 'lnurl-pay' || type === 'lightning-address') {
                if (!amount) {
                    throw new Error('Amount is required for LNURL-Pay and Lightning Addresses');
                }
                invoice = await resolveToInvoice(lnurl, amount);
            }

            const result = await window.webln.sendPayment(invoice);
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
        console.log('Received ZAP_PAYMENT_REQUEST:', event.data);
        performWebLNAction('enable').then(() => {
            performWebLNAction('sendPayment', { lnurl: event.data.lnurl, amount: event.data.amount });
        });
    }
});

window.addEventListener('webln:ready', function() {
    console.log('webln:ready event fired');
    if (window.webln) {
        weblnAvailable = true;
        window.postMessage({ type: 'WEBLN_STATUS', available: true }, '*');
    }
});

checkWebLN();