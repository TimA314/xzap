console.log('popup.js loaded successfully');

document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM fully loaded');

  // Function to shorten LNURL for display
  function shortenLnurl(lnurl) {
    return lnurl.length > 20 ? `${lnurl.slice(0, 6)}...${lnurl.slice(-6)}` : lnurl;
  }

  // Get DOM elements
  const imageInputParse = document.getElementById('imageInputParse');
  const resultElement = document.getElementById('result');
  const copyButton = document.getElementById('copyButton');
  console.log('imageInputParse:', imageInputParse);
  console.log('resultElement:', resultElement);
  console.log('copyButton:', copyButton);

  // Load stored result from chrome.storage.local
  if (resultElement) {
    chrome.storage.local.get(['lnurlResult'], (data) => {
      if (data.lnurlResult) {
        // Extract the LNURL from the stored string (backward compatibility)
        const storedLnurl = data.lnurlResult.startsWith('LN Address Found: ')
          ? data.lnurlResult.slice(18)
          : data.lnurlResult;
        const shortened = shortenLnurl(storedLnurl);
        resultElement.textContent = `LN Address Found: ${shortened}`;
        if (copyButton) {
          copyButton.style.display = 'inline-block'; // Show button if LNURL exists
        }
        console.log('Loaded stored result:', data.lnurlResult);
        console.log('Displayed shortened LNURL:', shortened);
      } else {
        console.log('No stored result found');
        resultElement.textContent = 'No previous result found.';
        if (copyButton) {
          copyButton.style.display = 'none'; // Hide button if no LNURL
        }
      }
    });
  } else {
    console.error('resultElement not found');
  }

  // Handle copy button click
  if (copyButton) {
    copyButton.addEventListener('click', () => {
      chrome.storage.local.get(['lnurlResult'], (data) => {
        if (data.lnurlResult) {
          const lnurl = data.lnurlResult.startsWith('LN Address Found: ')
            ? data.lnurlResult.slice(18)
            : data.lnurlResult;
          navigator.clipboard.writeText(lnurl).then(() => {
            const originalText = copyButton.textContent;
            copyButton.textContent = 'Copied!';
            console.log('Copied LNURL to clipboard:', lnurl);
            setTimeout(() => {
              copyButton.textContent = originalText;
            }, 2000);
          }).catch((err) => {
            console.error('Failed to copy LNURL:', err);
          });
        } else {
          console.log('No LNURL to copy');
        }
      });
    });
  } else {
    console.error('copyButton not found');
  }

  // Handle file selection and processing
  if (imageInputParse) {
    imageInputParse.addEventListener('change', (event) => {
      console.log('File selected');
      const file = event.target.files[0];
      if (!file) {
        console.log('No file selected');
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        console.log('FileReader onload triggered');
        const img = new Image();
        img.src = e.target.result;

        img.onload = () => {
          console.log('Image loaded');
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0);

          // Extract bits from image data
          console.log('Extracting bits');
          const imageData = ctx.getImageData(0, 0, img.width, img.height);
          const data = imageData.data;
          let bits = '';
          for (let i = 0; i < data.length && bits.length < 4096; i++) {
            bits += data[i] & 1; // Get least significant bit
          }
          console.log('Bits extracted:', bits);

          // Convert bits to LNURL string
          let lnurl = '';
          for (let i = 0; i < bits.length; i += 8) {
            const byte = bits.slice(i, i + 8);
            if (byte.length < 8) break;
            const charCode = parseInt(byte, 2);
            if (charCode === 0) break; // Stop at null terminator
            lnurl += String.fromCharCode(charCode);
          }
          lnurl = lnurl.trim();
          console.log('Extracted LNURL:', lnurl);

          // Update result and store it
          let resultText;
          if (lnurl.startsWith('lnurl') || lnurl.startsWith('lnbc')) {
            const shortened = shortenLnurl(lnurl);
            resultText = `LN Address Found: ${shortened}`;
            if (copyButton) {
              copyButton.style.display = 'inline-block'; // Show button
            }
          } else {
            resultText = 'No LN Address Found.';
            if (copyButton) {
              copyButton.style.display = 'none'; // Hide button
            }
          }

          if (resultElement) {
            resultElement.textContent = resultText;
            console.log('Result set:', resultText);

            // Store the full LNURL to preserve data integrity
            chrome.storage.local.set({ 'lnurlResult': lnurl }, () => {
              if (chrome.runtime.lastError) {
                console.error('Error storing result:', chrome.runtime.lastError);
              } else {
                console.log('Result stored in chrome.storage.local:', lnurl);
              }
            });
          } else {
            console.error('resultElement not found for result update');
          }
        };

        img.onerror = () => {
          console.error('Error loading image');
        };
      };

      reader.onerror = () => {
        console.error('Error reading file');
      };
      reader.readAsDataURL(file);
    });
  } else {
    console.error('imageInputParse not found');
  }
});