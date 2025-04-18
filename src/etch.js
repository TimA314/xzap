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

        // Step 1: Crop the image to a square
        const size = Math.min(img.width, img.height); // Use the smaller dimension
        const cropX = (img.width - size) / 2; // Center the crop horizontally
        const cropY = (img.height - size) / 2; // Center the crop vertically

        // Create a canvas for cropping
        const cropCanvas = document.createElement('canvas');
        cropCanvas.width = size;
        cropCanvas.height = size;
        const cropCtx = cropCanvas.getContext('2d');
        cropCtx.drawImage(img, cropX, cropY, size, size, 0, 0, size, size);

        // Step 2: Resize the cropped image to 400x400
        const canvas = document.createElement('canvas');
        canvas.width = 400; // X.com profile picture size
        canvas.height = 400;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(cropCanvas, 0, 0, 400, 400);

        // Step 3: Encode the LNURL
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        console.log(`etch.js: Embedding LNURL: ${lnurl}`);
        const encodedImageData = encodeLNURL(imageData, lnurl); // From stego-dct.js
        console.log('etch.js: Encoding completed');

        ctx.putImageData(encodedImageData, 0, 0);

        // Step 4: Download the result
        const link = document.createElement('a');
        link.download = 'etched-image.png'; // PNG for testing
        link.href = canvas.toDataURL('image/png'); // Lossless format
        console.log('etch.js: Triggering download');
        link.click();
        console.log('Embedded Lightning Address:', lnurl);

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