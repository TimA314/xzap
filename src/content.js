const processedPosts = new Set();

function getTweetElements() {
    return Array.from(document.querySelectorAll('article[role="article"]'))
        .filter(post => !post.hasAttribute('data-zap-processed'));
}

function getProfileImageUrl(post) {
    let imgElement = post.querySelector('div[data-testid="Tweet-User-Avatar"] img');
    if (!imgElement) {
        imgElement = post.querySelector('img[src*="profile_images"]');
    }
    if (imgElement && imgElement.src) {
        const largeImageUrl = imgElement.src.replace('_400x400', '');
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
  console.log(`Scanning image for LNURL: ${imageUrl}`);
  try {
      const response = await new Promise((resolve) => {
          chrome.runtime.sendMessage({ type: 'fetchImage', url: imageUrl }, resolve);
      });

      if (!response || response.error) {
          console.error('Image fetch failed:', response ? response.error : 'No response');
          return null;
      }

      const dataUrl = response.dataUrl;
      const img = new Image();
      img.src = dataUrl;

      return new Promise((resolve) => {
          img.onload = () => {
              const canvas = document.createElement('canvas');
              canvas.width = img.width;
              canvas.height = img.height;
              const ctx = canvas.getContext('2d');
              ctx.drawImage(img, 0, 0);

              // Define the QR code region (matches decode.js)
              const qrSize = 100;
              const xStart = 150; // 150px from left edge
              const yStart = img.height - qrSize - 10; // 10px from bottom edge

              // Check if the region is within bounds
              if (xStart < 0 || yStart < 0 || xStart + qrSize > img.width || yStart + qrSize > img.height) {
                  console.error('QR code region out of bounds');
                  resolve(null);
                  return;
              }

              // Crop the QR code region
              const croppedCanvas = document.createElement('canvas');
              croppedCanvas.width = qrSize;
              croppedCanvas.height = qrSize;
              const croppedCtx = croppedCanvas.getContext('2d');
              croppedCtx.drawImage(img, xStart, yStart, qrSize, qrSize, 0, 0, qrSize, qrSize);
              let croppedImageData = croppedCtx.getImageData(0, 0, qrSize, qrSize);

              // Preprocess the cropped image
              croppedImageData = toGrayscale(croppedImageData);
              const threshold = 128; // Adjust as needed
              croppedImageData = applyThreshold(croppedImageData, threshold);

              // Use jsQR to decode the QR code
              const code = jsQR(croppedImageData.data, qrSize, qrSize);
              if (code && code.data && (code.data.startsWith('lnurl') || code.data.includes('@') || code.data.startsWith('lnbc'))) {
                  console.log('QR code detected:', code.data);
                  resolve(code.data);
              } else {
                  console.log('No valid LNURL found in image');
                  resolve(null);
              }
          };
          img.onerror = () => {
              console.error('Failed to load image for scanning');
              resolve(null);
          };
      });
  } catch (error) {
      console.error('Error during image scan:', error);
      return null;
  }
}

// Helper functions for preprocessing
function toGrayscale(imageData) {
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
  return imageData;
}

function applyThreshold(imageData, threshold) {
  const data = imageData.data;
  for (let i = 0; i < data.length; i += 4) {
      const gray = data[i];
      const value = gray > threshold ? 255 : 0;
      data[i] = value;
      data[i + 1] = value;
      data[i + 2] = value;
  }
  return imageData;
}

function addZapButton(post, lnurl) {
    console.log(`Adding zap button with LNURL: ${lnurl || 'none'}`);
    const button = document.createElement('button');
    button.textContent = '⚡ Zap';
    button.style.margin = '5px';
    button.disabled = !lnurl;

    if (lnurl) {
        button.addEventListener('click', async () => {
            try {
                if (window.webln) {
                    await window.webln.enable();
                    const result = await window.webln.sendPayment(lnurl);
                    console.log('Payment successful:', result);
                    alert('Zap payment successful!');
                } else {
                    alert('WebLN is not available. Install a compatible wallet.');
                }
            } catch (error) {
                console.error('Payment failed:', error);
                alert('Payment failed: ' + error.message);
            }
        });
    }

    const actionBar = post.querySelector('div[role="group"]');
    if (actionBar) {
        actionBar.appendChild(button);
        console.log('Zap button added to tweet');
    } else {
        console.error('Action bar not found in tweet');
    }
}

async function processTweets() {
    const tweets = getTweetElements();
    for (const tweet of tweets) {
        if (processedPosts.has(tweet)) continue;
        tweet.setAttribute('data-zap-processed', 'true');
        processedPosts.add(tweet);

        const imageUrl = getProfileImageUrl(tweet);
        const lnurl = await scanImageForLNURL(imageUrl);
        addZapButton(tweet, lnurl);
    }
}

let debounceTimer;
const observer = new MutationObserver(() => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(processTweets, 200);
});

observer.observe(document.body, { childList: true, subtree: true });

processTweets();