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

// Helper function: Extract 8x8 block from imageData at (x,y) for a specific channel
function extractBlock(imageData, x, y, channel) {
    const block = Array.from({ length: 8 }, () => new Float64Array(8));
    const width = imageData.width;
    for (let i = 0; i < 8; i++) {
        for (let j = 0; j < 8; j++) {
            const pixelIndex = ((y + i) * width + (x + j)) * 4 + channel;
            block[i][j] = imageData.data[pixelIndex];
        }
    }
    return block;
}

// Helper function: Write 8x8 block back to imageData at (x,y) for a specific channel
function writeBlock(imageData, x, y, block, channel) {
    const width = imageData.width;
    for (let i = 0; i < 8; i++) {
        for (let j = 0; j < 8; j++) {
            const pixelIndex = ((y + i) * width + (x + j)) * 4 + channel;
            imageData.data[pixelIndex] = Math.max(0, Math.min(255, block[i][j]));
        }
    }
}

// Helper functions to apply DCT and IDCT
function applyDCT(block) {
    return dct2(block);
}

function applyIDCT(block) {
    return idct2(block);
}

// Encodes an LNURL into an image using DCT-based steganography
// @param imageData: ImageData object from a canvas
// Encodes an LNURL into an image using DCT-based steganography
function encodeLNURL(imageData, lnurl) {
    const width = imageData.width;
    const height = imageData.height;
    const step = 40; // Increased step size for robustness
    const positions = [[1, 2], [2, 1], [2, 2]]; // Coefficients to modify

    // Convert LNURL to bits with null terminator
    const lnurlWithTerminator = lnurl + '\0';
    const lnurlBits = lnurlWithTerminator
        .split('')
        .map(char => char.charCodeAt(0).toString(2).padStart(8, '0'))
        .join('');

    let bitIndex = 0;

    for (let y = 0; y < height; y += 8) {
        for (let x = 0; x < width; x += 8) {
            const block = extractBlock(imageData, x, y, 0);
            const dctBlock = dct2(block);

            if (bitIndex < lnurlBits.length) {
                const bit = parseInt(lnurlBits[bitIndex], 10);
                for (let pos of positions) {
                    const coeff = dctBlock[pos[0]][pos[1]];
                    // Embed 0 as multiples of step, 1 as step/2 offset
                    const newCoeff = bit
                        ? step * Math.round((coeff - step / 2) / step) + step / 2
                        : step * Math.round(coeff / step);
                    console.log(`Embedding bit ${bit} at (${x}, ${y}), [${pos[0]},${pos[1]}]: ${coeff} -> ${newCoeff}`);
                    dctBlock[pos[0]][pos[1]] = newCoeff;
                }
                bitIndex++;
            }

            const idctBlock = idct2(dctBlock);
            writeBlock(imageData, x, y, idctBlock, 0);
        }
    }

    console.log(`Encoding complete. Embedded ${bitIndex} bits for LNURL: ${lnurl}`);
    return imageData;
}

// Decodes an LNURL from an image using DCT-based steganography
function decodeLNURL(imageData) {
    const width = imageData.width;
    const height = imageData.height;
    const step = 40; // Match encoding step size
    const positions = [[1, 2], [2, 1], [2, 2]];
    let bits = '';

    outer: for (let y = 0; y < height; y += 8) {
        for (let x = 0; x < width; x += 8) {
            console.log(`Processing block at (${x}, ${y})`);
            const block = extractBlock(imageData, x, y, 0);
            const dctBlock = dct2(block);

            let bitVotes = [0, 0]; // [count0, count1]
            for (let pos of positions) {
                const coeff = dctBlock[pos[0]][pos[1]];
                const nearest0 = step * Math.round(coeff / step);
                const nearest1 = step * Math.round((coeff - step / 2) / step) + step / 2;
                const dist0 = Math.abs(coeff - nearest0);
                const dist1 = Math.abs(coeff - nearest1);
                const bit = dist1 < dist0 ? 1 : 0;
                console.log(`Extracted bit ${bit} from [${pos[0]},${pos[1]}]: ${coeff}, dist0: ${dist0}, dist1: ${dist1}`);
                bitVotes[bit]++;
            }

            const bit = bitVotes[1] > bitVotes[0] ? 1 : 0;
            bits += bit.toString();

            if (bits.length >= 8 && bits.length % 8 === 0) {
                const byte = bits.slice(-8);
                if (parseInt(byte, 2) === 0) {
                    console.log('Null terminator found, stopping extraction.');
                    break outer;
                }
            }
        }
    }

    let lnurl = '';
    for (let i = 0; i < bits.length - 8; i += 8) {
        const byte = bits.slice(i, i + 8);
        const charCode = parseInt(byte, 2);
        if (charCode !== 0) lnurl += String.fromCharCode(charCode);
    }

    console.log(`Decoded bits (first 80): ${bits.slice(0, 80)}`);
    console.log(`Decoded LNURL: ${lnurl}`);
    return lnurl;
}

// Make functions globally accessible
window.encodeLNURL = encodeLNURL;
window.decodeLNURL = decodeLNURL;