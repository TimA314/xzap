console.log('popup.js loaded successfully');

document.addEventListener('DOMContentLoaded', function() {
  console.log('DOM fully loaded');
  console.log('selectImageButton:', document.getElementById('selectImageButton'));
  console.log('imageInputParse:', document.getElementById('imageInputParse'));

  // Load stored result when popup opens
  chrome.storage.local.get(['lnurlResult'], function(data) {
    if (data.lnurlResult) {
      document.getElementById('result').textContent = data.lnurlResult;
    }
  });

  document.getElementById('selectImageButton').addEventListener('click', function() {
    console.log('Select Image button clicked');
    document.getElementById('imageInputParse').click();
  });

  document.getElementById('imageInputParse').addEventListener('change', function(event) {
    try {
      console.log('File selected');
      const file = event.target.files[0];
      if (!file) {
        console.log('No file selected');
        return;
      }

      const reader = new FileReader();
      reader.onload = function(e) {
        try {
          console.log('FileReader onload triggered');
          const img = new Image();
          img.src = e.target.result;

          img.onload = function() {
            try {
              console.log('Image loaded');
              const canvas = document.createElement('canvas');
              canvas.width = img.width;
              canvas.height = img.height;
              const ctx = canvas.getContext('2d');
              ctx.drawImage(img, 0, 0);
              const imageData = ctx.getImageData(0, 0, img.width, img.height);
              const data = imageData.data;

              console.log('Extracting bits');
              let bits = '';
              for (let i = 0; i < data.length && bits.length < 4096; i++) {
                bits += data[i] & 1;
              }
              console.log('Bits extracted:', bits);

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

              let resultText;
              if (lnurl.startsWith('lnurl')) {
                resultText = `LN Address Found: ${lnurl}`;
              } else {
                resultText = 'No LN Address Found.';
              }
              document.getElementById('result').textContent = resultText;
              console.log('Result set');

              // Store the result in chrome.storage.local
              chrome.storage.local.set({ 'lnurlResult': resultText }, function() {
                console.log('Result stored in chrome.storage.local');
              });
            } catch (error) {
              console.error('Error in image onload:', error);
            }
          };

          img.onerror = function() {
            console.error('Error loading image');
          };
        } catch (error) {
          console.error('Error in FileReader onload:', error);
        }
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Error in file change event:', error);
    }
  });
});