const processedPosts = new Set();

// Listener for fetch requests from weblnDetector.js
window.addEventListener('message', async function(event) {
    if (event.data.type === 'FETCH_URL') {
        const { requestId, url } = event.data;
        try {
            const response = await fetch(url);
            const data = await response.json();
            window.postMessage({ type: 'FETCH_URL_RESPONSE', requestId, success: true, data }, '*');
        } catch (error) {
            window.postMessage({ type: 'FETCH_URL_RESPONSE', requestId, success: false, error: error.message }, '*');
        }
    }
});

async function getDefaultAmount() {
    return new Promise((resolve) => {
        chrome.storage.local.get(['defaultAmount'], (result) => {
            resolve(result.defaultAmount || null);
        });
    });
}

function saveDefaultAmount(amount) {
    chrome.storage.local.set({ defaultAmount: amount }, () => {
        console.log('Default amount saved:', amount);
    });
}

function getTweetElements() {
    console.log('Fetching tweet elements');
    const tweets = Array.from(document.querySelectorAll('article[role="article"]'))
        .filter(post => !post.hasAttribute('data-zap-processed'));
    console.log(`Found ${tweets.length} unprocessed tweet elements`);
    return tweets;
}

function getProfileImageUrl(post) {
    let imgElement = post.querySelector('div[data-testid="Tweet-User-Avatar"] img');
    if (!imgElement) {
        imgElement = post.querySelector('img[src*="profile_images"]');
    }
    if (imgElement && imgElement.src) {
        const largeImageUrl = imgElement.src.replace('_x96', '_400x400').replace('_normal', '_400x400');
        console.log(`Profile image URL found: ${largeImageUrl}`);
        return largeImageUrl;
    } else {
        console.error('No profile image found in tweet');
        return null;
    }
}

async function scanImageForLNURL(imageUrl) {
    if (!imageUrl) {
        console.log('No image URL provided for scanning');
        return null;
    }
    console.log(`Starting LNURL scan for image: ${imageUrl}`);
    try {
        console.log('Sending fetchImage message to background script');
        const response = await new Promise((resolve) => {
            chrome.runtime.sendMessage({ type: 'fetchImage', url: imageUrl }, resolve);
        });

        console.log('Received response from background script:', response);
        if (!response || response.error) {
            console.error('Image fetch failed:', response ? response.error : 'No response');
            return null;
        }

        const dataUrl = response.dataUrl;
        console.log('Image fetched successfully, dataUrl length:', dataUrl.length);
        console.log('Sample of dataUrl:', dataUrl.substring(0, 50) + '...');

        const img = new Image();
        console.log('Creating new Image object');
        img.src = dataUrl;

        return new Promise((resolve) => {
            img.onload = () => {
                console.log('Image loaded successfully');
                console.log('Image dimensions - width:', img.width, 'height:', img.height);

                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                console.log('Canvas created with width:', canvas.width, 'height:', canvas.height);
                ctx.drawImage(img, 0, 0);
                console.log('Image drawn onto canvas');

                const qrSize = Math.min(100, img.width / 4, img.height / 4);
                const xStart = (img.width - qrSize) / 2;
                const yStart = img.height - qrSize - 10;
                console.log(`Calculated QR code region: xStart=${xStart}, yStart=${yStart}, qrSize=${qrSize}`);

                if (xStart < 0 || yStart < 0 || xStart + qrSize > img.width || yStart + qrSize > img.height) {
                    console.error('QR code region out of bounds');
                    resolve(null);
                    return;
                }
                console.log('QR code region within bounds');

                const croppedCanvas = document.createElement('canvas');
                croppedCanvas.width = qrSize;
                croppedCanvas.height = qrSize;
                const croppedCtx = croppedCanvas.getContext('2d');
                console.log('Cropped canvas created with size:', qrSize);
                croppedCtx.drawImage(img, xStart, yStart, qrSize, qrSize, 0, 0, qrSize, qrSize);
                console.log('Image cropped to QR code region');

                let croppedImageData = croppedCtx.getImageData(0, 0, qrSize, qrSize);
                console.log('Cropped image data obtained, length:', croppedImageData.data.length);

                console.log('Converting image to grayscale');
                croppedImageData = toGrayscale(croppedImageData);
                console.log('Grayscale conversion complete, sample pixel:', croppedImageData.data[0]);

                const averageBrightness = calculateAverageBrightness(croppedImageData);
                const threshold = averageBrightness;
                console.log(`Calculated threshold: ${threshold}`);

                croppedImageData = applyThreshold(croppedImageData, threshold);
                console.log('Threshold applied, sample pixel:', croppedImageData.data[0]);

                const croppedDataUrl = croppedCanvas.toDataURL();
                console.log('Cropped image data URL generated');

                console.log('Attempting QR code detection with jsQR');
                const code = jsQR(croppedImageData.data, qrSize, qrSize);
                if (code) {
                    console.log('QR code detected, raw data:', code.data);
                    if (code.data.startsWith('lnurl') || code.data.includes('@') || code.data.startsWith('lnbc')) {
                        console.log('Valid LNURL found:', code.data);
                        resolve({ lnurl: code.data, croppedDataUrl });
                    } else {
                        console.log('QR code data does not match LNURL patterns:', code.data);
                        resolve(null);
                    }
                } else {
                    console.log('No QR code detected in cropped image');
                    resolve(null);
                }
            };
            img.onerror = () => {
                console.error('Image failed to load from dataUrl');
                resolve(null);
            };
        });
    } catch (error) {
        console.error('Exception during image scan:', error.message);
        return null;
    }
}

function toGrayscale(imageData) {
    console.log('Starting grayscale conversion');
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const gray = 0.299 * r + 0.587 * g + 0.114 * b;
        data[i] = gray;
        data[i + 1] = gray;
        data[i + 2] = gray;
    }
    console.log('Grayscale conversion finished');
    return imageData;
}

function applyThreshold(imageData, threshold) {
    console.log('Starting threshold application');
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
        const gray = data[i];
        const value = gray > threshold ? 255 : 0;
        data[i] = value;
        data[i + 1] = value;
        data[i + 2] = value;
    }
    console.log('Threshold application finished');
    return imageData;
}

function calculateAverageBrightness(imageData) {
    const data = imageData.data;
    let sum = 0;
    for (let i = 0; i < data.length; i += 4) {
        sum += data[i];
    }
    return sum / (data.length / 4);
}

function injectScript() {
    const script = document.createElement('script');
    script.src = chrome.runtime.getURL('weblnDetector.js');
    document.body.appendChild(script);
    console.log('weblnDetector.js injected');
}

// Listen for responses from weblnDetector.js
window.addEventListener('message', function(event) {
    if (event.data.type === 'WEBLN_ACTION_RESPONSE') {
        if (event.data.success) {
            console.log('WebLN action successful:', event.data.result);
        } else {
            console.error('WebLN action failed:', event.data.error);
            alert('Payment failed: ' + event.data.error);
        }
    } else if (event.data.type === 'WEBLN_UNAVAILABLE') {
        console.error('WebLN not available');
    }
});

async function processTweets() {
  console.log('Processing tweets');
  const tweets = getTweetElements();
  console.log(`Processing ${tweets.length} tweets`);
  for (const tweet of tweets) {
      if (processedPosts.has(tweet)) {
          continue;
      }
      const imageUrl = getProfileImageUrl(tweet);
      console.log('Starting LNURL scan for tweet');
      const result = await scanImageForLNURL(imageUrl);
      console.log('LNURL scan completed, result:', result);
      const lnurl = result ? result.lnurl : null;
      const croppedDataUrl = result ? result.croppedDataUrl : null;
      if (addZapButton(tweet, lnurl, croppedDataUrl)) {
          tweet.setAttribute('data-zap-processed', 'true');
          processedPosts.add(tweet);
      }
  }
  console.log('Tweet processing complete');
}

function addZapButton(post, lnurl, croppedDataUrl) {
  console.log(`Adding zap button with LNURL: ${lnurl || 'none'}`);
  const button = document.createElement('button');
  button.textContent = '⚡ Zap';
  button.className = 'css-175oi2r r-1777fci r-bt1l66 r-bztko3 r-lrvibr r-1loqt21 r-1ny4l3l';
  button.style.color = 'rgb(113, 118, 123)';
  button.disabled = !lnurl;
  button.title = lnurl ? 'Zap this post' : 'No LNURL found';

  if (!lnurl) {
      button.style.opacity = '0.5';
      button.style.cursor = 'not-allowed';
  } else {
      button.addEventListener('click', async () => {
          console.log('Zap button clicked');
          const defaultAmount = await getDefaultAmount();
          if (window.webln && defaultAmount) {
              console.log('WebLN available, proceeding with payment');
              window.postMessage({ type: 'ZAP_PAYMENT_REQUEST', lnurl: lnurl, amount: defaultAmount }, '*');
          } else {
              console.log('Showing modal');
              createModal(lnurl, croppedDataUrl, (amount) => {
                  window.postMessage({ type: 'ZAP_PAYMENT_REQUEST', lnurl: lnurl, amount: amount }, '*');
              });
          }
      });
  }

  const likeButton = post.querySelector('button[data-testid="like"]');
  if (likeButton) {
      const likeButtonDiv = likeButton.parentNode;
      const zapButtonDiv = document.createElement('div');
      zapButtonDiv.className = likeButtonDiv.className;
      zapButtonDiv.appendChild(button);
      likeButtonDiv.parentNode.insertBefore(zapButtonDiv, likeButtonDiv.nextSibling);
      console.log('Zap button added after like button');
      return true;
  } else {
      console.error('Like button not found in tweet');
      return false;
  }
}

let debounceTimer;
console.log('Setting up MutationObserver');
const observer = new MutationObserver(() => {
    console.log('DOM mutation detected');
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(processTweets, 200);
    console.log('Debounced tweet processing scheduled');
});

console.log('Starting observer on document.body');
observer.observe(document.body, { childList: true, subtree: true });

console.log('Initial tweet processing');
processTweets();
injectScript();