document.getElementById('etchButton').addEventListener('click', () => {
    const lnurl = document.getElementById('lnurlInput').value;
    const fileInput = document.getElementById('imageInput').files[0];
    
    if (!lnurl || !fileInput) {
      alert('Please provide an LNURL and select an image.');
      return;
    }
  
    const img = new Image();
    const reader = new FileReader();
    
    reader.onload = (e) => {
      img.src = e.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        
        // Simple steganography: embed LNURL in least significant bits
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        let lnurlBits = lnurl.split('').map(char => char.charCodeAt(0).toString(2).padStart(8, '0')).join('');
        
        for (let i = 0; i < lnurlBits.length; i++) {
          data[i] = (data[i] & 0xFE) | parseInt(lnurlBits[i]);
        }
        
        ctx.putImageData(imageData, 0, 0);
        
        // Download the etched image
        const link = document.createElement('a');
        link.download = 'etched-image.png';
        link.href = canvas.toDataURL('image/png');
        link.click();
      };
    };
    reader.readAsDataURL(fileInput);
  });