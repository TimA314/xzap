const scannedAvatars = new Map();

async function scanImageForLNURL(imageUrl) {
  console.log(`Scanning image: ${imageUrl}`);
  if (scannedAvatars.has(imageUrl)) {
    console.log(`Cache hit for ${imageUrl}`);
    return scannedAvatars.get(imageUrl);
  }

  // Modify the URL to fetch the 400x400 version
  let modifiedUrl = imageUrl.replace('_normal', '_400x400');
  if (modifiedUrl === imageUrl) {
    // Fallback if '_normal' isn’t in the URL
    modifiedUrl = imageUrl.replace(/(\.\w+)$/, '_400x400$1');
  }
  console.log(`Fetching modified URL: ${modifiedUrl}`);

  try {
    const response = await fetch(modifiedUrl, { mode: 'cors' });
    if (!response.ok) {
      console.error(`Failed to fetch image: ${modifiedUrl}`);
      return null;
    }
    const blob = await response.blob();
    const img = new Image();
    img.src = URL.createObjectURL(blob);

    return new Promise((resolve) => {
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);

        // Extract the 100x100 pixel region at x: 150, y: height - 100 - 10
        const qrSize = 100;
        const xStart = 150; // 150px from left edge
        const yStart = img.height - qrSize - 10; // 10px from bottom edge

        // Check if the region is within bounds
        if (xStart < 0 || yStart < 0 || xStart + qrSize > img.width || yStart + qrSize > img.height) {
          console.error('QR code region out of bounds');
          URL.revokeObjectURL(img.src);
          resolve(null);
          return;
        }

        // Crop the region
        const croppedCanvas = document.createElement('canvas');
        croppedCanvas.width = qrSize;
        croppedCanvas.height = qrSize;
        const croppedCtx = croppedCanvas.getContext('2d');
        croppedCtx.drawImage(img, xStart, yStart, qrSize, qrSize, 0, 0, qrSize, qrSize);
        let croppedImageData = croppedCtx.getImageData(0, 0, qrSize, qrSize);

        // Preprocess to enhance contrast for semi-transparent QR code
        croppedImageData = toGrayscale(croppedImageData);
        const threshold = 128; // Adjust as needed
        croppedImageData = applyThreshold(croppedImageData, threshold);

        // Decode with jsQR
        const code = jsQR(croppedImageData.data, qrSize, qrSize);
        let lnurl = null;
        if (code && (code.data.startsWith('lnurl') || code.data.includes('@') || code.data.startsWith('lnbc'))) {
          lnurl = code.data;
        }

        URL.revokeObjectURL(img.src);
        scannedAvatars.set(imageUrl, lnurl);
        console.log(`Scanned ${imageUrl}: ${lnurl ? 'LNURL found' : 'No LNURL'}`);
        resolve(lnurl);
      };
      img.onerror = () => {
        console.error(`Failed to load image: ${modifiedUrl}`);
        URL.revokeObjectURL(img.src);
        resolve(null);
      };
    });
  } catch (error) {
    console.error(`Error scanning image ${imageUrl}:`, error);
    return null;
  }
}

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

function addZapButton(post, lnurl) {
  if (post.querySelector('.zap-button')) return;
  const actionBar = post.querySelector('div[role="group"]');
  if (!actionBar) return;

  const zapButton = document.createElement('button');
  zapButton.className = 'zap-button css-175oi2r r-1777fci r-bt1l66 r-bztko3 r-lrvibr r-1loqt21 r-1ny4l3l';
  zapButton.setAttribute('aria-label', 'Zap');
  zapButton.innerHTML = `
    <div dir="ltr" class="css-146c3p1 r-bcqeeo r-1ttztb7 r-qvutc0 r-37j5jr r-a023e6 r-rjixqe r-16dba41 r-1awozwy r-6koalj r-1h0z5md r-o7ynqc r-clp7b1 r-3s2u2q" style="color: rgb(113, 118, 123);">
      <div class="css-175oi2r r-xoduu5">
        <svg viewBox="0 0 24 24" aria-hidden="true" class="r-4qtqp9 r-yyyyoo r-dnmrzs r-bnwqim r-lrvibr r-m6rgpd r-1xvli5t r-1hdv0qi">
          <path d="M12 21.5l-9-9L9 2h6l-6 10.5L21 2v18z"></path>
        </svg>
      </div>
    </div>
  `;
  zapButton.disabled = !lnurl;
  zapButton.style.opacity = lnurl ? '1' : '0.5';
  zapButton.addEventListener('click', () => {
    if (lnurl) {
      console.log(`Zap button clicked for LNURL: ${lnurl}`);
      handleZap(lnurl);
    } else {
      console.log('Zap button clicked but no LNURL available');
    }
  });
  actionBar.appendChild(zapButton);
  console.log(`Added zap button to post: ${lnurl ? 'enabled' : 'disabled'}`);
}

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
  instruction.textContent = 'Scan this QR code with your Lightning wallet to send a zap. If you have a wallet extension installed, ensure it’s enabled and refresh the page.';
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

startScanning();