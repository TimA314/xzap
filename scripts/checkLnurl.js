const { createCanvas, loadImage } = require('canvas');
const fs = require('fs').promises;
const path = require('path');

async function checkLNURL(imagePath) {
  try {
    // Load the image
    const image = await loadImage(imagePath);
    const canvas = createCanvas(image.width, image.height);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(image, 0, 0);

    // Get pixel data
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const pixels = imageData.data;

    // Extract bits from least significant bits (LSB)
    let binary = '';
    for (let i = 0; i < pixels.length && binary.length < 4096; i++) { // Cap at ~512 chars
      binary += pixels[i] & 1;
    }

    // Convert binary to string
    let lnurl = '';
    for (let i = 0; i < binary.length; i += 8) {
      const byte = binary.slice(i, i + 8);
      if (byte.length < 8) break;
      const charCode = parseInt(byte, 2);
      if (charCode === 0) break; // Stop at null terminator
      lnurl += String.fromCharCode(charCode);
    }

    // Validate LNURL
    lnurl = lnurl.trim();
    if (lnurl.startsWith('lnurl1')) {
      console.log('Parsed LNURL:', lnurl);
      return lnurl;
    } else {
      console.log('No valid LNURL found in image.');
      return null;
    }
  } catch (error) {
    console.error('Error processing image:', error.message);
    return null;
  }
}

// Run with command-line argument
async function main() {
  const imagePath = process.argv[2];
  if (!imagePath) {
    console.error('Please provide an image file path: node check_lnurl.js path/to/image.png');
    process.exit(1);
  }
  await checkLNURL(imagePath);
}

main();