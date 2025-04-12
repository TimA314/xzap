document.addEventListener('DOMContentLoaded', () => {
  const etchSelectButton = document.getElementById('etchSelectButton');
  const etchButton = document.getElementById('etchButton');
  const lnurlInput = document.getElementById('lnurlInput');
  let selectedFileDataUrl = null;

  // Open file selection window for etching
  etchSelectButton.addEventListener('click', () => {
    chrome.windows.create({
      url: chrome.runtime.getURL('file-select.html?section=etch'),
      type: 'popup',
      width: 400,
      height: 200
    });
  });

  // Listen for file selection
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'fileSelected' && message.section === 'etch') {
      selectedFileDataUrl = message.dataUrl;
      etchButton.disabled = false;
      sendResponse({ received: true });
    }
  });

  // Handle etching
  etchButton.addEventListener('click', () => {
    const lnurl = lnurlInput.value;
    if (!lnurl || !selectedFileDataUrl) {
      alert('Please provide an LNURL and select an image.');
      return;
    }

    const img = new Image();
    img.src = selectedFileDataUrl;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);

      // Embed LNURL
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      const lnurlWithTerminator = lnurl + '\0';
      const lnurlBits = lnurlWithTerminator
        .split('')
        .map(char => char.charCodeAt(0).toString(2).padStart(8, '0'))
        .join('');

      if (data.length < lnurlBits.length) {
        alert('Image too small to embed LNURL.');
        return;
      }

      for (let i = 0; i < lnurlBits.length; i++) {
        data[i] = (data[i] & 0xFE) | parseInt(lnurlBits[i]);
      }
      ctx.putImageData(imageData, 0, 0);

      // Download
      const link = document.createElement('a');
      link.download = 'etched-image.png';
      link.href = canvas.toDataURL('image/png');
      link.click();
      console.log('Etched LNURL:', lnurl);
    };
  });
});