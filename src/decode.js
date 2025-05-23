document.addEventListener('DOMContentLoaded', () => {
  const chooseFileButton = document.getElementById('chooseFileButton');
  const fileInput = document.getElementById('fileInput');
  const processButton = document.getElementById('processButton');
  const fileNameDisplay = document.getElementById('fileName');
  const spinner = document.getElementById('spinner');
  const resultDisplay = document.getElementById('result');
  const lnurlText = document.getElementById('lnurlText');
  const copyButton = document.getElementById('copyButton');

  let fullLnurl = ''; // Store the full LNURL for copying

  chooseFileButton.addEventListener('click', () => {
    fileInput.click();
  });

  fileInput.addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (file) {
      fileNameDisplay.textContent = `Selected: ${file.name}`;
      fileNameDisplay.style.display = 'block';
      processButton.disabled = false;
    }
  });

  processButton.addEventListener('click', () => {
    const file = fileInput.files[0];
    if (!file) return;

    processButton.disabled = true;
    spinner.style.display = 'block';
    resultDisplay.style.display = 'none';

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.src = e.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);

        try {
          // Extract the 100x100 pixel region at x: 150, y: height - 100 - 10
          const qrSize = 100;
          const xStart = 150; // 150px from left edge
          const yStart = img.height - qrSize - 10; // 10px from bottom edge

          // Check if the region is within bounds
          if (xStart < 0 || yStart < 0 || xStart + qrSize > img.width || yStart + qrSize > img.height) {
            throw new Error('QR code region out of bounds');
          }

          // Create a cropped canvas for the QR code region
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

          // Use jsQR to decode the QR code
          const code = jsQR(croppedImageData.data, qrSize, qrSize);
          console.log('decode.js: Decoding completed');

          spinner.style.display = 'none';
          if (code && (code.data.startsWith('lnurl') || code.data.includes('@') || code.data.startsWith('lnbc'))) {
            fullLnurl = code.data;
            const shortened = fullLnurl.length > 20 ? `${fullLnurl.slice(0, 6)}...${fullLnurl.slice(-6)}` : fullLnurl;
            lnurlText.textContent = `LN Address: ${shortened}`;
            copyButton.style.display = 'inline-block';
            resultDisplay.style.display = 'flex';

            // Store in history
            chrome.storage.local.get(['history'], (data) => {
              const history = data.history || [];
              history.unshift({
                type: 'lnurlProcessed',
                fileName: file.name,
                lnurl: fullLnurl,
                dataUrl: e.target.result,
                timestamp: new Date().toISOString()
              });
              chrome.storage.local.set({ history }, () => {
                chrome.runtime.sendMessage({
                  type: 'lnurlProcessed',
                  fileName: file.name,
                  lnurl: fullLnurl,
                  dataUrl: e.target.result,
                  timestamp: new Date().toISOString()
                });
              });
            });
          } else {
            lnurlText.textContent = 'No LN Address Found.';
            copyButton.style.display = 'none';
            resultDisplay.style.display = 'block';
          }
        } catch (error) {
          console.error('decode.js: Error during QR scanning:', error);
          spinner.style.display = 'none';
          lnurlText.textContent = 'Error extracting LN Address.';
          copyButton.style.display = 'none';
          resultDisplay.style.display = 'block';
        }
      };
    };
    reader.readAsDataURL(file);
  });

  // Copy button functionality
  copyButton.addEventListener('click', () => {
    if (fullLnurl) {
      navigator.clipboard.writeText(fullLnurl).then(() => {
        console.log('Copied to clipboard');
        const originalText = copyButton.textContent;
        copyButton.textContent = 'Copied!';
        setTimeout(() => {
          copyButton.textContent = originalText;
        }, 2000);
      }).catch(err => {
        console.error('Failed to copy:', err);
      });
    }
  });
});

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