// stego-dct.js

// Helper function: 2D DCT for an 8x8 block
// Transforms spatial domain (pixels) to frequency domain
function dct2(block) {
    const N = 8; // Block size
    const result = Array.from({ length: N }, () => new Float64Array(N));
    console.log('Applying DCT to block...');
    for (let u = 0; u < N; u++) {
        for (let v = 0; v < N; v++) {
            let sum = 0;
            for (let x = 0; x < N; x++) {
                for (let y = 0; y < N; y++) {
                    sum += block[x][y] *
                        Math.cos((2 * x + 1) * u * Math.PI / 16) *
                        Math.cos((2 * y + 1) * v * Math.PI / 16);
                }
            }
            // Scaling factors for DCT
            const cu = u === 0 ? 1 / Math.sqrt(2) : 1;
            const cv = v === 0 ? 1 / Math.sqrt(2) : 1;
            result[u][v] = (1 / 4) * cu * cv * sum;
        }
    }
    console.log('DCT completed for block.');
    return result;
}

// Helper function: 2D IDCT for an 8x8 block
// Transforms frequency domain back to spatial domain
function idct2(block) {
    const N = 8;
    const result = Array.from({ length: N }, () => new Float64Array(N));
    console.log('Applying IDCT to block...');
    for (let x = 0; x < N; x++) {
        for (let y = 0; y < N; y++) {
            let sum = 0;
            for (let u = 0; u < N; u++) {
                for (let v = 0; v < N; v++) {
                    const cu = u === 0 ? 1 / Math.sqrt(2) : 1;
                    const cv = v === 0 ? 1 / Math.sqrt(2) : 1;
                    sum += cu * cv * block[u][v] *
                        Math.cos((2 * x + 1) * u * Math.PI / 16) *
                        Math.cos((2 * y + 1) * v * Math.PI / 16);
                }
            }
            // Round to integer pixel values
            result[x][y] = Math.round((1 / 4) * sum);
        }
    }
    console.log('IDCT completed for block.');
    return result;
}

// Encodes an LNURL into an image using DCT-based steganography
// @param imgData: ImageData object from a canvas
// @param lnurl: String to embed
function encodeLNURL(imgData, lnurl) {
    console.log('Starting LNURL encoding...');
    if (!imgData || !lnurl) {
        console.error('Missing required inputs.');
        throw new Error('Image data and LNURL are required');
    }

    const { width, height, data } = imgData;
    console.log(`Image dimensions: ${width}x${height}`);
    if (width % 8 !== 0 || height % 8 !== 0) {
        console.error('Invalid image dimensions.');
        throw new Error('Image dimensions must be multiples of 8');
    }

    // Add null terminator to LNURL and convert to binary
    const lnurlWithTerminator = lnurl + '\0';
    const lnurlBits = lnurlWithTerminator
        .split('')
        .map(char => char.charCodeAt(0).toString(2).padStart(8, '0'))
        .join('');
    console.log(`LNURL length: ${lnurl.length}, Bits to encode: ${lnurlBits.length}`);

    // Calculate maximum capacity (3 bits per 8x8 block)
    const maxBits = (width / 8) * (height / 8) * 3;
    console.log(`Image capacity: ${maxBits} bits`);
    if (lnurlBits.length > maxBits) {
        console.error('LNURL too large for image.');
        throw new Error('Image too small to encode LNURL');
    }

    // Copy image data to modify
    const newData = new Uint8ClampedArray(data);
    let bitIndex = 0;
    const step = 20; // Increased step size for robustness against compression

    // Process each 8x8 block
    for (let y = 0; y < height; y += 8) {
        for (let x = 0; x < width; x += 8) {
            console.log(`Processing block at (${x}, ${y})`);

            // Extract 8x8 block from red channel
            const block = Array.from({ length: 8 }, () => new Float64Array(8));
            for (let i = 0; i < 8; i++) {
                for (let j = 0; j < 8; j++) {
                    const pixelIndex = ((y + i) * width + (x + j)) * 4;
                    block[i][j] = newData[pixelIndex]; // Red channel
                }
            }

            // Apply DCT
            const dctBlock = dct2(block);

            // Embed 3 bits into mid-frequency coefficients
            const positions = [[1, 2], [2, 1], [2, 2]]; // Mid-frequency positions
            for (let pos of positions) {
                if (bitIndex < lnurlBits.length) {
                    const bit = parseInt(lnurlBits[bitIndex], 10);
                    const coeff = dctBlock[pos[0]][pos[1]];
                    // Embed bit: '0' -> nearest multiple of step, '1' -> nearest (multiple of step + step/2)
                    const newCoeff = bit
                        ? step * Math.round((coeff - step / 2) / step) + step / 2
                        : step * Math.round(coeff / step);
                    dctBlock[pos[0]][pos[1]] = newCoeff;
                    console.log(`Embedded bit ${bit} at [${pos[0]},${pos[1]}]: ${coeff} -> ${newCoeff}`);
                    bitIndex++;
                }
            }

            // Apply IDCT and clamp to [0, 255]
            const idctBlock = idct2(dctBlock);
            for (let i = 0; i < 8; i++) {
                for (let j = 0; j < 8; j++) {
                    const pixelIndex = ((y + i) * width + (x + j)) * 4;
                    newData[pixelIndex] = Math.max(0, Math.min(255, idctBlock[i][j]));
                }
            }
        }
    }

    console.log(`Encoding complete. Embedded ${bitIndex} bits.`);
    return new ImageData(newData, width, height);
}

// Decodes an LNURL from an image using DCT-based steganography
// @param imageData: ImageData object from a canvas
function decodeLNURL(imageData) {
    console.log('Starting LNURL decoding...');
    if (!imageData) {
        console.error('Missing image data.');
        throw new Error('Image data is required');
    }

    const { width, height, data } = imageData;
    console.log(`Image dimensions: ${width}x${height}`);
    if (width % 8 !== 0 || height % 8 !== 0) {
        console.error('Invalid image dimensions.');
        throw new Error('Image dimensions must be multiples of 8');
    }

    let bits = '';
    const step = 20; // Match encoding step size for robustness

    for (let y = 0; y < height; y += 8) {
        for (let x = 0; x < width; x += 8) {
            console.log(`Processing block at (${x}, ${y})`);

            // Extract 8x8 block from red channel
            const block = Array.from({ length: 8 }, () => new Float64Array(8));
            for (let i = 0; i < 8; i++) {
                for (let j = 0; j < 8; j++) {
                    const pixelIndex = ((y + i) * width + (x + j)) * 4;
                    block[i][j] = data[pixelIndex]; // Red channel
                }
            }

            // Apply DCT
            const dctBlock = dct2(block);

            // Extract bits from mid-frequency coefficients
            const positions = [[1, 2], [2, 1], [2, 2]];
            for (let pos of positions) {
                const coeff = dctBlock[pos[0]][pos[1]];
                // Determine bit by comparing distances to target values
                const nearest0 = step * Math.round(coeff / step); // Target for bit 0
                const nearest1 = step * Math.round((coeff - step / 2) / step) + step / 2; // Target for bit 1
                const dist0 = Math.abs(coeff - nearest0);
                const dist1 = Math.abs(coeff - nearest1);
                const bit = dist1 < dist0 ? 1 : 0;
                bits += bit.toString();
                console.log(`Extracted bit ${bit} from [${pos[0]},${pos[1]}]: ${coeff}, dist0: ${dist0}, dist1: ${dist1}`);
            }

            // Check for null terminator every 8 bits
            if (bits.length >= 8 && bits.length % 8 === 0) {
                const byte = bits.slice(-8);
                const charCode = parseInt(byte, 2);
                if (charCode === 0) {
                    console.log('Null terminator found, stopping extraction.');
                    break;
                }
            }
        }
        if (bits.length >= 8 && bits.length % 8 === 0 && parseInt(bits.slice(-8), 2) === 0) break;
    }

    // Convert bits to string
    let lnurl = '';
    for (let i = 0; i < bits.length; i += 8) {
        const byte = bits.slice(i, i + 8);
        if (byte.length < 8) break;
        const charCode = parseInt(byte, 2);
        if (charCode === 0) break;
        lnurl += String.fromCharCode(charCode);
    }

    console.log(`Decoded bits (first 80): ${bits.slice(0, 80)}`);
    console.log(`Decoded LNURL: ${lnurl.trim()}`);
    return lnurl.trim();
}

// Make functions globally accessible
window.encodeLNURL = encodeLNURL;
window.decodeLNURL = decodeLNURL;