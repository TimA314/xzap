document.addEventListener('DOMContentLoaded', () => {
  const etchButton = document.getElementById('etchButton');
  if (!etchButton) {
    console.error('Etch button not found in the DOM');
    return;
  }
  
  etchButton.addEventListener('click', () => {
    console.log('Etch button clicked');
    const lnurl = document.getElementById('lnurlInput').value;
    const fileInput = document.getElementById('imageInputEtch').files[0];
    
    if (!lnurl || !fileInput) {
      console.error('Please provide an LNURL and select an image');
      return;
    }
    console.log('Inputs validated:', { lnurl, file: fileInput.name });
    
    const reader = new FileReader();
    reader.onload = (e) => {
      console.log('File read successfully');
      const img = new Image();
      img.src = e.target.result;
      img.onload = () => {
        console.log('Image loaded');
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        console.log('Image drawn to canvas');
        
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        const lnurlWithTerminator = lnurl + '\0';
        const lnurlBits = lnurlWithTerminator
          .split('')
          .map(char => char.charCodeAt(0).toString(2).padStart(8, '0'))
          .join('');
        console.log('LNURL bits to embed:', lnurlBits);
        
        if (data.length < lnurlBits.length) {
          console.error('Image too small to embed LNURL');
          return;
        }
        
        for (let i = 0; i < lnurlBits.length; i++) {
          data[i] = (data[i] & 0xFE) | parseInt(lnurlBits[i]);
        }
        console.log('First 10 modified bytes:', Array.from(data.slice(0, 10)).map(b => b.toString(2).padStart(8, '0')));
        ctx.putImageData(imageData, 0, 0);
        console.log('Image data updated');
        
        const link = document.createElement('a');
        link.download = 'etched-image.png';
        const dataURL = canvas.toDataURL('image/png');
        console.log('Data URL generated:', dataURL.substring(0, 50) + '...');
        link.href = dataURL;
        link.click();
        console.log('Download triggered');
      };
    };
    reader.readAsDataURL(fileInput);
  });
});