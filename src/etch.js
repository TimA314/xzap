document.addEventListener('DOMContentLoaded', () => {
  console.log('etch.js: DOMContentLoaded');

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
    console.log('etch.js: Select Image button clicked');
    fileInput.click();
  });

  // Handle image selection
  fileInput.addEventListener('change', (event) => {
    console.log('etch.js: File selected');
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          selectedFileDataUrl = e.target.result;
          fileNameDisplay.textContent = `Selected: ${file.name}`;
          fileNameDisplay.style.display = 'block';
          checkReady();
          console.log('etch.js: File reader onload completed');
        } catch (error) {
          console.error('etch.js: Error in file reader onload:', error);
          alert('Error reading file: ' + error.message);
        }
      };
      reader.onerror = (error) => {
        console.error('etch.js: File reader error:', error);
        alert('Error reading file: ' + error.message);
      };
      reader.readAsDataURL(file);
    }
  });

  // Update button state when LNURL input changes
  lnurlInput.addEventListener('input', () => {
    console.log('etch.js: LNURL input changed');
    checkReady();
  });

  // Perform etching and download
  etchButton.addEventListener('click', () => {
    console.log('etch.js: Etch button clicked');
    const lnurl = lnurlInput.value.trim();
    if (!lnurl || !selectedFileDataUrl) {
      alert('Please provide a Lightning Address and select an image.');
      return;
    }

    const img = new Image();
    img.src = selectedFileDataUrl;
    img.onload = () => {
      try {
        console.log('etch.js: Image loaded, starting encoding');
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        console.log('etch.js: Calling encodeLNURL');
        const encodedImageData = encodeLNURL(imageData, lnurl);
        console.log('etch.js: encodeLNURL completed');
        ctx.putImageData(encodedImageData, 0, 0);

        const link = document.createElement('a');
        link.download = 'etched-image.png';
        link.href = canvas.toDataURL('image/png');
        console.log('etch.js: Triggering download');
        link.click();
        console.log('Embedded Lightning Address:', lnurl);

        chrome.storage.local.get(['history'], (data) => {
          const history = data.history || [];
          history.unshift({
            type: 'lnurlEmbedded',
            fileName: fileInput.files[0].name,
            lnurl: lnurl,
            dataUrl: selectedFileDataUrl,
            timestamp: new Date().toISOString()
          });
          chrome.storage.local.set({ history }, () => {
            console.log('etch.js: History updated');
            // window.close();
          });
        });
      } catch (error) {
        console.error('etch.js: Error during encoding:', error);
        alert('Error embedding Lightning Address: ' + error.message);
      }
    };
    img.onerror = (error) => {
      console.error('etch.js: Image load error:', error);
      alert('Error loading image: ' + error.message);
    };
  });
});