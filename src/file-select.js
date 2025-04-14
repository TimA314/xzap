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
        // Validate image dimensions (must be multiples of 8)
        if (img.width % 8 !== 0 || img.height % 8 !== 0) {
          console.error('file-select.js: Image dimensions must be multiples of 8.');
          spinner.style.display = 'none';
          lnurlText.textContent = 'Error: Image dimensions must be multiples of 8.';
          resultDisplay.style.display = 'block';
          return;
        }

        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);

        // Extract LNURL using frequency-domain steganography
        try {
          const imageData = ctx.getImageData(0, 0, img.width, img.height);
          console.log('file-select.js: Starting decoding...');
          fullLnurl = decodeLNURL(imageData); // From stego-dct.js
          console.log('file-select.js: Decoding completed');

          spinner.style.display = 'none';
          if (fullLnurl.startsWith('lnurl') || fullLnurl.startsWith('lnbc')) {
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
          console.error('file-select.js: Error during decoding:', error);
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