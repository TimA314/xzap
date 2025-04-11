document.getElementById('selectImageButton').addEventListener('click', function() {
  document.getElementById('imageInputParse').click();
});

document.getElementById('imageInputParse').addEventListener('change', function(event) {
  // Pause execution here if DevTools are open
  debugger;

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
            for (let i = 0; i < data.length && bits.length < 256; i++) {
              bits += data[i] & 1;
            }
            console.log('Bits extracted:', bits);

            let lnurl = '';
            for (let i = 0; i < bits.length; i += 8) {
              const byte = bits.slice(i, i + 8);
              if (byte.length === 8) {
                lnurl += String.fromCharCode(parseInt(byte, 2));
              }
            }
            lnurl = lnurl.trim();
            console.log('Extracted LNURL:', lnurl);

            if (lnurl.startsWith('lnurl')) {
              document.getElementById('result').textContent = `LN Address Found: ${lnurl}`;
            } else {
              document.getElementById('result').textContent = 'No LN Address Found.';
            }
            console.log('Result set');
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