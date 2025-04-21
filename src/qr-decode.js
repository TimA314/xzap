// qr-decode.js
// Dependency-free QR code decoder for 25x25 pixel Version 1 QR codes

/**
 * Decodes a QR code from the bottom-left corner of an image.
 * @param {ImageData} imageData - The image data to decode (400x400 expected).
 * @returns {string|null} - The decoded LNURL or null if not found.
 */
function decodeQRCode(imageData) {
    const width = imageData.width;
    const height = imageData.height;
    const data = imageData.data;
  
    // Extract the bottom-left 25x25 pixel region (with 5px margin)
    const qrSize = 25;
    const xStart = 5;
    const yStart = height - qrSize - 5;
    const qrMatrix = Array(qrSize).fill().map(() => Array(qrSize).fill(0));
  
    // Step 1: Binarize the region (convert to black/white modules)
    for (let y = 0; y < qrSize; y++) {
      for (let x = 0; x < qrSize; x++) {
        const pixelIndex = ((yStart + y) * width + (xStart + x)) * 4;
        const r = data[pixelIndex];
        const g = data[pixelIndex + 1];
        const b = data[pixelIndex + 2];
        // Simple thresholding: average RGB < 128 for black (1), else white (0)
        const avg = (r + g + b) / 3;
        qrMatrix[y][x] = avg < 128 ? 1 : 0;
      }
    }
  
    // Step 2: Verify finder patterns (simplified check for Version 1)
    const finderPattern = [
      [1, 1, 1, 1, 1, 1, 1],
      [1, 0, 0, 0, 0, 0, 1],
      [1, 0, 1, 1, 1, 0, 1],
      [1, 0, 1, 0, 1, 0, 1],
      [1, 0, 1, 1, 1, 0, 1],
      [1, 0, 0, 0, 0, 0, 1],
      [1, 1, 1, 1, 1, 1, 1],
    ];
    let hasFinders = true;
    // Check top-left finder
    for (let i = 0; i < 7; i++) {
      for (let j = 0; j < 7; j++) {
        if (qrMatrix[i][j] !== finderPattern[i][j]) {
          hasFinders = false;
          break;
        }
      }
      if (!hasFinders) break;
    }
    // Check top-right and bottom-left (simplified)
    if (hasFinders) {
      for (let i = 0; i < 7; i++) {
        for (let j = 0; j < 7; j++) {
          if (qrMatrix[i][matrixSize - 7 + j] !== finderPattern[i][j] ||
              qrMatrix[matrixSize - 7 + i][j] !== finderPattern[i][j]) {
            hasFinders = false;
            break;
          }
        }
        if (!hasFinders) break;
      }
    }
  
    if (!hasFinders) {
      console.log('No valid QR code found in bottom-left corner');
      return null;
    }
  
    // Step 3: Extract data bits (undo mask pattern 0: (i + j) % 2 == 0)
    const matrixSize = 21; // Version 1
    const bits = [];
    let up = true;
    for (let col = matrixSize - 1; col >= 0; col -= 2) {
      if (col === 6) col--; // Skip timing pattern
      const cols = [col, col - 1];
      for (let row = up ? matrixSize - 1 : 0; up ? row >= 0 : row < matrixSize; row += up ? -1 : 1) {
        for (let c of cols) {
          // Skip reserved areas (finder patterns, timing patterns)
          if ((row < 7 && c < 7) || (row < 7 && c >= matrixSize - 7) ||
              (row >= matrixSize - 7 && c < 7) || row === 6 || c === 6) {
            continue;
          }
          let module = qrMatrix[row][c];
          // Apply mask pattern 0
          if ((row + c) % 2 === 0) {
            module = module === 1 ? 0 : 1;
          }
          bits.push(module);
        }
      }
      up = !up;
    }
  
    // Step 4: Decode the bit stream
    // Expect byte mode (0100)
    if (bits.slice(0, 4).join('') !== '0100') {
      console.log('Invalid mode indicator');
      return null;
    }
    // Character count (8 bits)
    const charCount = parseInt(bits.slice(4, 12).join(''), 2);
    if (charCount > 17) {
      console.log('Invalid character count');
      return null;
    }
    // Data bits
    let lnurl = '';
    for (let i = 0; i < charCount; i++) {
      const start = 12 + i * 8;
      if (start + 8 > bits.length) break;
      const byte = bits.slice(start, start + 8).join('');
      const charCode = parseInt(byte, 2);
      lnurl += String.fromCharCode(charCode);
    }
  
    return lnurl || null;
  }