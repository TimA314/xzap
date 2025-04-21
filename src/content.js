const scannedAvatars = new Map();

// Function to get posts and their avatar images
function getPostsAndAvatars() {
  console.log('Getting posts and avatars');
  const posts = document.querySelectorAll('article[role="article"]');
  const postAvatarMap = new Map();
  posts.forEach((post) => {
    const avatarImg = post.querySelector('img.css-9pa8cd');
    if (avatarImg && avatarImg.src) {
      postAvatarMap.set(post, avatarImg.src);
    }
  });
  console.log(`Found ${postAvatarMap.size} posts with avatars`);
  return postAvatarMap;
}

// Function to remove thumbnail suffix from the filename only
function removeThumbnailSuffix(url) {
  const urlParts = url.split('/');
  const filename = urlParts.pop(); // Get the filename, e.g., "zBgjidNg_x96.png"
  const modifiedFilename = filename.replace(/_[^.]+(\.[^.]+)$/, '$1'); // Remove "_x96", keep ".png"
  urlParts.push(modifiedFilename);
  return urlParts.join('/'); // Reconstruct the URL
}

// Function to scan an image for LNURL (QR code detection) using background script
async function scanImageForLNURL(imageUrl) {
  console.log(`Scanning image: ${imageUrl}`);
  if (scannedAvatars.has(imageUrl)) {
    console.log(`Using Cache for ${imageUrl}`);
    return scannedAvatars.get(imageUrl);
  }

  const modifiedUrl = removeThumbnailSuffix(imageUrl);
  console.log(`Original URL: ${imageUrl}`);
  console.log(`Modified URL: ${modifiedUrl}`);

  try {
    const response = await new Promise((resolve) => {
      chrome.runtime.sendMessage({ type: 'fetchImage', url: modifiedUrl }, (response) => {
        if (chrome.runtime.lastError) {
          console.error('Runtime error:', chrome.runtime.lastError.message);
          resolve(null);
        } else {
          resolve(response);
        }
      });
    });

    if (!response) {
      console.error('No response from background script');
      return null;
    }

    if (response.error) {
      console.error(`Failed to fetch image: ${response.error}`);
      return null;
    }

    const dataUrl = response.dataUrl;
    const img = new Image();
    img.src = dataUrl;

    return new Promise((resolve) => {
      img.onload = () => {
        console.log(`Image loaded: width=${img.width}, height=${img.height}`);
        // Add your QR code detection or LNURL scanning logic here
        resolve(null); // Replace with actual result if scanning succeeds
      };
      img.onerror = () => {
        console.error(`Failed to load image from data URL`);
        resolve(null);
      };
    });
  } catch (error) {
    console.error(`Error scanning image ${imageUrl}:`, error);
    return null;
  }
}

// Function to create the zap button
function createZapButton(lnurl) {
  const zapButton = document.createElement('button');
  zapButton.innerHTML = `
    <div class="css-146c3p1 r-1ttztb7 r-qvutc0 r-37j5jr r-a023e6 r-rjixqe r-16dba41 r-1awozwy r-6koalj r-1h0z5md r-o7ynqc r-clp7b1 r-3s2u2q" style="color: rgb(113, 118, 123);">
      <svg viewBox="0 0 24 24" width="20" height="20" class="r-4qtqp9 r-yyyyoo r-dnmrzs r-bnwqim r-lrvibr r-m6rgpd r-1xvli5t r-1hdv0qi">
        <path fill="currentColor" d="M14.5 2l-3 7h4.5l-3 7h-4.5l3-7h-4.5l3-7z"></path>
      </svg>
    </div>
  `;
  zapButton.style.cursor = 'pointer';
  zapButton.title = 'Zap';
  zapButton.onclick = () => {
    if (lnurl) {
      console.log(`Zap button clicked for LNURL: ${lnurl}`);
      handleZap(lnurl);
    } else {
      console.log('Zap button clicked but no LNURL available');
    }
  };
  return zapButton;
}

// Function to add the zap button to a post
function addZapButton(post, lnurl) {
  if (post.querySelector('.zap-button')) return;
  const actionBar = post.querySelector('div[role="group"]');
  if (!actionBar) return;

  const zapButton = createZapButton(lnurl);
  zapButton.className = 'zap-button css-175oi2r r-1777fci r-bt1l66 r-bztko3 r-lrvibr r-1loqt21 r-1ny4l3l';
  zapButton.setAttribute('aria-label', 'Zap');
  zapButton.disabled = !lnurl;
  zapButton.style.opacity = lnurl ? '1' : '0.5';
  actionBar.appendChild(zapButton);
  console.log(`Added zap button to post: ${lnurl ? 'enabled' : 'disabled'}`);
}

// Function to handle the zap action
async function handleZap(lnurl) {
  console.log(`Handling zap for LNURL: ${lnurl}`);
  if (window.webln) {
    try {
      await window.webln.enable();
      if (lnurl.startsWith('lnbc')) {
        await window.webln.sendPayment(lnurl);
        console.log('Zap successful');
        alert('Zap sent successfully!');
      } else {
        const invoice = await fetchInvoice(lnurl);
        await window.webln.sendPayment(invoice);
        console.log('Zap successful');
        alert('Zap sent successfully!');
      }
    } catch (error) {
      console.error('Error with WebLN:', error);
      alert('Failed to send zap. Please ensure your wallet is unlocked and try again.');
    }
  } else {
    try {
      const invoice = lnurl.startsWith('lnbc') ? lnurl : await fetchInvoice(lnurl);
      showQRCode(invoice);
    } catch (error) {
      console.error('Error generating QR code:', error);
      alert('Failed to generate QR code. Please try again.');
    }
  }
}

// Function to fetch an invoice for LNURL-pay
async function fetchInvoice(lnurl) {
  console.log(`Fetching invoice for LNURL: ${lnurl}`);
  try {
    const response = await fetch(lnurl);
    const data = await response.json();
    if (data.tag !== 'payRequest') {
      throw new Error('Unsupported LNURL type');
    }
    const amount = 1000; // Amount in satoshis (customize as needed)
    const invoiceResponse = await fetch(`${data.callback}?amount=${amount}`);
    const invoiceData = await invoiceResponse.json();
    if (!invoiceData.pr) {
      throw new Error('No invoice returned');
    }
    return invoiceData.pr;
  } catch (error) {
    console.error('Error fetching invoice:', error);
    throw error;
  }
}

// Function to show a QR code for manual zapping
function showQRCode(invoice) {
  const qrContainer = document.createElement('div');
  qrContainer.style.position = 'fixed';
  qrContainer.style.top = '50%';
  qrContainer.style.left = '50%';
  qrContainer.style.transform = 'translate(-50%, -50%)';
  qrContainer.style.background = 'white';
  qrContainer.style.padding = '20px';
  qrContainer.style.boxShadow = '0 0 10px rgba(0,0,0,0.5)';
  qrContainer.style.zIndex = '10000';
  qrContainer.style.textAlign = 'center';

  const instruction = document.createElement('p');
  instruction.textContent = 'Scan this QR code with your Lightning wallet to send a zap.';
  qrContainer.appendChild(instruction);

  const qrCode = document.createElement('div');
  qrCode.textContent = 'QR code generation not implemented in this context.';
  qrContainer.appendChild(qrCode);

  const closeButton = document.createElement('button');
  closeButton.textContent = 'Close';
  closeButton.addEventListener('click', () => {
    document.body.removeChild(qrContainer);
  });
  qrContainer.appendChild(closeButton);

  document.body.appendChild(qrContainer);
}

// Function to start scanning for posts and avatars
function startScanning() {
  console.log('Starting scanning');
  const observer = new MutationObserver(async (mutations) => {
    console.log('DOM mutation detected');
    const postAvatarMap = getPostsAndAvatars();
    for (const [post, avatarUrl] of postAvatarMap) {
      const lnurl = await scanImageForLNURL(avatarUrl);
      addZapButton(post, lnurl);
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });

  (async () => {
    console.log('Initial scan');
    const postAvatarMap = getPostsAndAvatars();
    for (const [post, avatarUrl] of postAvatarMap) {
      const lnurl = await scanImageForLNURL(avatarUrl);
      addZapButton(post, lnurl);
    }
  })();
}

// Helper functions for image preprocessing
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

// Start the scanning process
startScanning();