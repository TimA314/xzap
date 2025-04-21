function generateQRCodeCanvas(text) {
    const matrixSize = 21; // Version 1
    const matrix = Array(matrixSize).fill().map(() => Array(matrixSize).fill(0));
  
    // Finder patterns
    const finder = [
      [1,1,1,1,1,1,1],
      [1,0,0,0,0,0,1],
      [1,0,1,1,1,0,1],
      [1,0,1,1,1,0,1],
      [1,0,1,1,1,0,1],
      [1,0,0,0,0,0,1],
      [1,1,1,1,1,1,1]
    ];
    for (let i = 0; i < 7; i++) {
      for (let j = 0; j < 7; j++) {
        matrix[i][j] = finder[i][j];               // Top-left
        matrix[i][matrixSize-7+j] = finder[i][j];  // Top-right
        matrix[matrixSize-7+i][j] = finder[i][j];  // Bottom-left
      }
    }
  
    // Timing patterns
    for (let i = 8; i < matrixSize-8; i += 2) {
      matrix[i][6] = 1;
      matrix[6][i] = 1;
    }
  
    // Alignment pattern (not needed for Version 1)
    // Dark module
    matrix[matrixSize-8][8] = 1;
  
    // Format information (Level H, Mask 0: "001001101101110")
    const formatBits = [0,0,1,0,0,1,1,0,1,1,0,1,1,1,0];
    for (let i = 0; i < 8; i++) {
      if (i < 6) matrix[i][8] = formatBits[i];
      else if (i === 6) matrix[7][8] = formatBits[i];
      else matrix[8][8] = formatBits[i];
      matrix[8][matrixSize-1-i] = formatBits[14-i];
    }
  
    // Data encoding (Byte mode)
    const bits = [];
    bits.push(0,1,0,0); // Mode: 0100
    const charCount = Math.min(text.length, 17);
    bits.push(...charCount.toString(2).padStart(8, '0').split('').map(Number));
    for (let i = 0; i < charCount; i++) {
      bits.push(...text.charCodeAt(i).toString(2).padStart(8, '0').split('').map(Number));
    }
    const terminatorLength = Math.min(4, 72 - bits.length);
    bits.push(...Array(terminatorLength).fill(0));
    while (bits.length < 72) {
      bits.push(...[1,1,1,0,1,1,0,0]); // 11101100
      if (bits.length < 72) bits.push(...[0,0,0,1,0,0,0,1]); // 00010001
    }
    bits.length = 72;
  
    // Convert to data codewords
    const dataCodewords = [];
    for (let i = 0; i < 9; i++) {
      const byte = parseInt(bits.slice(i*8, i*8+8).join(''), 2);
      dataCodewords.push(byte);
    }
  
    // Error correction
    const codewords = rsEncode(dataCodewords, 10);
  
    // Convert to bits
    const finalBits = [];
    for (const cw of codewords) {
      for (let j = 7; j >= 0; j--) {
        finalBits.push((cw >> j) & 1);
      }
    }
  
    // Place bits in matrix with Mask 0 (i + j) % 2 === 0
    let bitIndex = 0;
    let up = true;
    for (let col = matrixSize - 1; col >= 0; col -= 2) {
      if (col === 6) col--; // Skip timing pattern
      const cols = [col, col - 1];
      for (let row = up ? matrixSize - 1 : 0; up ? row >= 0 : row < matrixSize; row += up ? -1 : 1) {
        for (let c of cols) {
          if (matrix[row][c] === 0) {
            const bit = bitIndex < finalBits.length ? finalBits[bitIndex++] : 0;
            matrix[row][c] = bit ^ ((row + c) % 2 === 0 ? 1 : 0); // Mask 0
          }
        }
      }
      up = !up;
    }
  
    // Render (for testing, assuming canvas context)
    const canvas = document.createElement('canvas');
    canvas.width = matrixSize * 10;
    canvas.height = matrixSize * 10;
    const ctx = canvas.getContext('2d');
    for (let i = 0; i < matrixSize; i++) {
      for (let j = 0; j < matrixSize; j++) {
        ctx.fillStyle = matrix[i][j] ? 'black' : 'white';
        ctx.fillRect(j * 10, i * 10, 10, 10);
      }
    }
    return canvas;
  }
