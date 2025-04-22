const processedPosts = new Set();

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
                    console.error(`Bounds check failed: xStart=${xStart}, yStart=${yStart}, qrSize=${qrSize}, imgWidth=${img.width}, imgHeight=${img.height}`);
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
                console.log('Cropped image data URL:', croppedDataUrl);

                console.log('Attempting QR code detection with jsQR');
                const code = jsQR(croppedImageData.data, qrSize, qrSize);
                if (code) {
                    console.log('QR code detected, raw data:', code.data);
                    if (code.data.startsWith('lnurl') || code.data.includes('@') || code.data.startsWith('lnbc')) {
                        console.log('Valid LNURL found:', code.data);
                        resolve(code.data);
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
        console.error('Stack trace:', error.stack);
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

function addZapButton(post, lnurl) {
    console.log(`Adding zap button with LNURL: ${lnurl || 'none'}`);
    const button = document.createElement('button');
    button.textContent = '⚡ Zap';
    button.style.margin = '5px';
    button.disabled = !lnurl;
    console.log('Zap button created, disabled:', button.disabled);

    if (lnurl) {
        console.log('Attaching click event listener to zap button');
        button.addEventListener('click', async () => {
            try {
                console.log('Zap button clicked, checking WebLN availability');
                if (window.webln) {
                    console.log('Enabling WebLN');
                    await window.webln.enable();
                    console.log('Sending payment with LNURL:', lnurl);
                    const result = await window.webln.sendPayment(lnurl);
                    console.log('Payment successful:', result);
                    alert('Zap payment successful!');
                } else {
                    console.error('WebLN not available');
                    alert('WebLN is not available. Install a compatible wallet.');
                }
            } catch (error) {
                console.error('Payment failed:', error.message);
                alert('Payment failed: ' + error.message);
            }
        });
    }

    const actionBar = post.querySelector('div[role="group"]');
    if (actionBar) {
        console.log('Appending zap button to action bar');
        actionBar.appendChild(button);
        console.log('Zap button added to tweet');
    } else {
        console.error('Action bar not found in tweet');
    }
}

async function processTweets() {
    console.log('Processing tweets');
    const tweets = getTweetElements();
    console.log(`Processing ${tweets.length} tweets`);
    for (const tweet of tweets) {
        if (processedPosts.has(tweet)) {
            console.log('Tweet already processed, skipping');
            continue;
        }
        console.log('Marking tweet as processed');
        tweet.setAttribute('data-zap-processed', 'true');
        processedPosts.add(tweet);

        const imageUrl = getProfileImageUrl(tweet);
        console.log('Starting LNURL scan for tweet');
        const lnurl = await scanImageForLNURL(imageUrl);
        console.log('LNURL scan completed, result:', lnurl);
        addZapButton(tweet, lnurl);
    }
    console.log('Tweet processing complete');
}

function calculateAverageBrightness(imageData) {
  const data = imageData.data;
  let sum = 0;
  for (let i = 0; i < data.length; i += 4) {
      sum += data[i]; // Grayscale, so r = g = b
  }
  return sum / (data.length / 4);
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