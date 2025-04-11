function extractLNURLFromImage(img) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = img.width;
    canvas.height = img.height;
    ctx.drawImage(img, 0, 0);
    
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    let bits = '';
    
    // Extract bits from least significant bits
    for (let i = 0; i < data.length && bits.length < 256; i++) {
      bits += data[i] & 1;
    }
    
    let lnurl = '';
    for (let i = 0; i < bits.length; i += 8) {
      const byte = bits.slice(i, i + 8);
      if (byte.length === 8) {
        lnurl += String.fromCharCode(parseInt(byte, 2));
      }
    }
    
    return lnurl.trim().startsWith('lnurl') ? lnurl.trim() : null;
  }
  
  function addZapButton(post, lnurl) {
    if (!post.querySelector('.zap-button')) {
      const button = document.createElement('button');
      button.textContent = 'Zap';
      button.className = 'zap-button';
      button.onclick = () => alert(`Zapping with LNURL: ${lnurl}`); // Replace with payment logic
      post.appendChild(button);
    }
  }
  
  const observer = new MutationObserver(() => {
    document.querySelectorAll('article').forEach(post => {
      const img = post.querySelector('img[alt="Profile picture"]'); // Adjust selector as needed
      if (img && !img.dataset.processed) {
        img.dataset.processed = true;
        img.crossOrigin = 'Anonymous'; // May require server-side support
        img.onload = () => {
          const lnurl = extractLNURLFromImage(img);
          if (lnurl) addZapButton(post, lnurl);
        };
        if (img.complete) img.onload();
      }
    });
  });
  
  observer.observe(document.body, { childList: true, subtree: true });