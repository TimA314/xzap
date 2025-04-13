const scannedAvatars = new Map();

async function scanImageForLNURL(imageUrl) {
  console.log(`Scanning image: ${imageUrl}`);
  if (scannedAvatars.has(imageUrl)) {
    console.log(`Cache hit for ${imageUrl}`);
    return scannedAvatars.get(imageUrl);
  }

  try {
    const response = await fetch(imageUrl, { mode: 'cors' });
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
        const imageData = ctx.getImageData(0, 0, img.width, img.height);
        const lnurl = decodeLNURL(imageData); // Use new function
        URL.revokeObjectURL(img.src);
        scannedAvatars.set(imageUrl, lnurl);
        console.log(`Scanned ${imageUrl}: ${lnurl ? 'LNURL found' : 'No LNURL'}`);
        resolve(lnurl || null);
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
      const invoice = await fetchInvoice(lnurl);
      await window.webln.sendPayment(invoice);
      console.log('Zap successful');
    } catch (error) {
      console.error('Error with webln:', error);
      alert('Failed to send zap. Please check your wallet.');
    }
  } else {
    alert('Please install a Lightning wallet extension like Alby.');
  }
}

async function fetchInvoice(lnurl) {
  console.log(`Fetching invoice for LNURL: ${lnurl}`);
  // Replace with actual LNURL resolution
  return 'lnbc...';
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

startScanning();