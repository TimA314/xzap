const chooseFileButton = document.getElementById('chooseFileButton');
    const fileInput = document.getElementById('fileInput');
    const processButton = document.getElementById('processButton');
    const fileNameDisplay = document.getElementById('fileName');
    const spinner = document.getElementById('spinner');
    const resultDisplay = document.getElementById('result');

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

          // Extract bits
          const imageData = ctx.getImageData(0, 0, img.width, img.height);
          let bits = '';
          for (let i = 0; i < imageData.data.length && bits.length < 4096; i++) {
            bits += imageData.data[i] & 1;
          }

          // Convert to LNURL
          let lnurl = '';
          for (let i = 0; i < bits.length; i += 8) {
            const byte = bits.slice(i, i + 8);
            if (byte.length < 8) break;
            const charCode = parseInt(byte, 2);
            if (charCode === 0) break;
            lnurl += String.fromCharCode(charCode);
          }
          lnurl = lnurl.trim();

          // Display result
          spinner.style.display = 'none';
          if (lnurl.startsWith('lnurl') || lnurl.startsWith('lnbc')) {
            const shortened = lnurl;
            resultDisplay.textContent = `${shortened}`;
            resultDisplay.style.display = 'block';

            // Store in history
            chrome.storage.local.get(['history'], (data) => {
              const history = data.history || [];
              history.unshift({
                fileName: file.name,
                lnurl,
                timestamp: new Date().toISOString()
              });
              chrome.storage.local.set({ history }, () => {
                // Update popup
                chrome.runtime.sendMessage({
                  type: 'lnurlProcessed',
                  fileName: file.name,
                  lnurl
                });
              });
            });
          } else {
            resultDisplay.textContent = 'No LN Address Found.';
            resultDisplay.style.display = 'block';
          }
        };
      };
      reader.readAsDataURL(file);
    });