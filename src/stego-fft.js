// stego-lsb.js

// Encodes an LNURL into an image using LSB steganography
function encodeLNURL(imgData, lnurl) {
    if (!imgData || !lnurl) throw new Error('Image data and LNURL are required');

    const { width, height, data } = imgData;
    const lnurlWithTerminator = lnurl + '\0'; // Add null terminator
    const lnurlBits = lnurlWithTerminator
        .split('')
        .map(char => char.charCodeAt(0).toString(2).padStart(8, '0'))
        .join('');

    if (lnurlBits.length > width * height) throw new Error('Image too small to encode LNURL');

    const newData = new Uint8ClampedArray(data);
    let bitIndex = 0;

    for (let i = 0; i < width * height && bitIndex < lnurlBits.length; i++) {
        const pixelIndex = i * 4; // Each pixel has 4 channels (RGBA)
        const red = newData[pixelIndex];
        const bit = parseInt(lnurlBits[bitIndex], 10);
        newData[pixelIndex] = (red & 0xFE) | bit; // Replace LSB of red channel
        bitIndex++;
    }

    return new ImageData(newData, width, height);
}

// Decodes an LNURL from an image using LSB steganography
function decodeLNURL(imageData) {
    if (!imageData) throw new Error('Image data is required');

    const { width, height, data } = imageData;
    let bits = '';
    let lnurl = '';

    for (let i = 0; i < width * height; i++) {
        const pixelIndex = i * 4;
        const red = data[pixelIndex];
        const bit = red & 1; // Extract LSB
        bits += bit.toString();

        if (bits.length % 8 === 0) { // Process 8 bits at a time
            const byte = bits.slice(-8);
            const charCode = parseInt(byte, 2);
            if (charCode === 0) break; // Stop at null terminator
            lnurl += String.fromCharCode(charCode);
        }
    }

    return lnurl.trim();
}

// Export functions
window.encodeLNURL = encodeLNURL;
window.decodeLNURL = decodeLNURL;