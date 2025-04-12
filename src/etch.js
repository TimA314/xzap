document.addEventListener('DOMContentLoaded', () => {
  // Get DOM elements
  const lnurlInput = document.getElementById('lnurlInput');
  const selectImageButton = document.getElementById('selectImageButton');
  const fileInput = document.getElementById('fileInput');
  const fileNameDisplay = document.getElementById('fileName');
  const etchButton = document.getElementById('etchButton');
  let selectedFileDataUrl = null;

  // Function to check if both LNURL and image are ready
  function checkReady() {
    if (lnurlInput.value.trim() !== '' && selectedFileDataUrl) {
      etchButton.disabled = false;
    } else {
      etchButton.disabled = true;
    }
  }

  // Trigger file input when "Select Image" is clicked
  selectImageButton.addEventListener('click', () => {
    fileInput.click();
  });

  // Handle image selection
  fileInput.addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        selectedFileDataUrl = e.target.result;
        fileNameDisplay.textContent = `Selected: ${file.name}`;
        fileNameDisplay.style.display = 'block';
        checkReady();
      };
      reader.readAsDataURL(file);
    }
  });

  // Update button state when LNURL input changes
  lnurlInput.addEventListener('input', checkReady);

  // Perform etching and download
  etchButton.addEventListener('click', () => {
    const lnurl = lnurlInput.value.trim();
    if (!lnurl || !selectedFileDataUrl) {
      alert('Please provide a Lightning Address and select an image.');
      return;
    }

    const img = new Image();
    img.src = selectedFileDataUrl;
    img.onload = () => {
      // Create canvas to manipulate image
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);

      // Embed LNURL using steganography
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      const lnurlWithTerminator = lnurl + '\0';
      const lnurlBits = lnurlWithTerminator
        .split('')
        .map(char => char.charCodeAt(0).toString(2).padStart(8, '0'))
        .join('');

      if (data.length < lnurlBits.length) {
        alert('Image too small to embed the Lightning Address.');
        return;
      }

      for (let i = 0; i < lnurlBits.length; i++) {
        data[i] = (data[i] & 0xFE) | parseInt(lnurlBits[i]);
      }
      ctx.putImageData(imageData, 0, 0);

      // // Create a thumbnail canvas for history preview (e.g., 100x100px)
      // const thumbCanvas = document.createElement('canvas');
      // thumbCanvas.width = 100;
      // thumbCanvas.height = 100;
      // const thumbCtx = thumbCanvas.getContext('2d');
      // thumbCtx.drawImage(canvas, 0, 0, img.width, img.height, 0, 0, 100, 100);

      // // Get compressed data URL (quality 0.7 for smaller size)
      // const etchedDataUrl = thumbCanvas.toDataURL('image/jpeg', 0.7);

      // // Store in history
      // chrome.storage.local.get(['history'], (data) => {
      //   const history = data.history || [];
      //   history.unshift({
      //     type: 'lnurlEmbedded',
      //     fileName: file.name,
      //     lnurl: lnurl,
      //     dataUrl: etchedDataUrl,
      //     timestamp: new Date().toISOString()
      //   });
      //   chrome.storage.local.set({ history }, () => {
      //     // Update popup
      //     chrome.runtime.sendMessage({
      //         type: 'lnurlProcessed',
      //         fileName: file.name,
      //         lnurl: lnurl,
      //         dataUrl: etchedDataUrl,
      //         timestamp: new Date().toISOString()
      //     });
      //   });
      // });
      
      // Download the modified image 
      const link = document.createElement('a');
      link.download = 'etched-image.png';
      link.href = canvas.toDataURL('image/png');
      link.click();
      console.log('Embedded Lightning Address:', lnurl);
    };
  });
});