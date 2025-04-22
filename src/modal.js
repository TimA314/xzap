// modal.js

function createModal(lnurl, croppedDataUrl) {
    // Modal overlay
    const modal = document.createElement('div');
    modal.style.position = 'fixed';
    modal.style.top = '0';
    modal.style.left = '0';
    modal.style.width = '100%';
    modal.style.height = '100%';
    modal.style.backgroundColor = 'rgba(0, 0, 0, 0.6)';
    modal.style.display = 'flex';
    modal.style.justifyContent = 'center';
    modal.style.alignItems = 'center';
    modal.style.zIndex = '1000';

    // Modal content container
    const modalContent = document.createElement('div');
    modalContent.style.backgroundColor = '#ffffff';
    modalContent.style.padding = '24px';
    modalContent.style.borderRadius = '12px';
    modalContent.style.maxWidth = '450px';
    modalContent.style.width = '90%';
    modalContent.style.boxShadow = '0 6px 12px rgba(0, 0, 0, 0.15)';
    modalContent.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    modalContent.style.textAlign = 'center';

    // Header
    const header = document.createElement('h2');
    header.textContent = 'Complete Your Zap Payment';
    header.style.margin = '0 0 16px';
    header.style.fontSize = '1.5em';
    header.style.color = '#1a1a1a';
    modalContent.appendChild(header);

    // Instructions
    const instructions = document.createElement('p');
    instructions.innerHTML = 'To send your Zap payment, open your Lightning-compatible mobile wallet and scan the QR code below. Alternatively, copy the Lightning address and paste it into your wallet to proceed with the payment.';
    instructions.style.marginBottom = '20px';
    instructions.style.color = '#555';
    instructions.style.lineHeight = '1.5';
    modalContent.appendChild(instructions);

    // QR Code Image
    const qrImage = document.createElement('img');
    qrImage.src = croppedDataUrl;
    qrImage.style.width = '250px';
    qrImage.style.height = '250px';
    qrImage.style.marginBottom = '20px';
    qrImage.style.border = '1px solid #e0e0e0';
    qrImage.style.borderRadius = '8px';
    modalContent.appendChild(qrImage);

    // LNURL Text
    const lnurlText = document.createElement('p');
    lnurlText.textContent = lnurl;
    lnurlText.style.wordBreak = 'break-all';
    lnurlText.style.backgroundColor = '#f5f5f5';
    lnurlText.style.padding = '10px';
    lnurlText.style.borderRadius = '6px';
    lnurlText.style.marginBottom = '16px';
    lnurlText.style.color = '#333';
    modalContent.appendChild(lnurlText);

    // Copy Button
    const copyButton = document.createElement('button');
    copyButton.textContent = 'Copy Lightning Address';
    copyButton.style.padding = '10px 20px';
    copyButton.style.backgroundColor = '#1da1f2';
    copyButton.style.color = 'white';
    copyButton.style.border = 'none';
    copyButton.style.borderRadius = '6px';
    copyButton.style.cursor = 'pointer';
    copyButton.style.fontSize = '1em';
    copyButton.style.marginBottom = '12px';
    copyButton.style.transition = 'background-color 0.2s';
    copyButton.addEventListener('mouseover', () => {
        copyButton.style.backgroundColor = '#1991db';
    });
    copyButton.addEventListener('mouseout', () => {
        copyButton.style.backgroundColor = '#1da1f2';
    });
    copyButton.addEventListener('click', () => {
        navigator.clipboard.writeText(lnurl).then(() => {
            alert('Lightning address copied to clipboard!');
        }).catch(err => {
            console.error('Failed to copy:', err);
        });
    });
    modalContent.appendChild(copyButton);

    // Close Button
    const closeButton = document.createElement('button');
    closeButton.textContent = 'Close';
    closeButton.style.padding = '10px 20px';
    closeButton.style.backgroundColor = '#e0e0e0';
    closeButton.style.color = '#333';
    closeButton.style.border = 'none';
    closeButton.style.borderRadius = '6px';
    closeButton.style.cursor = 'pointer';
    closeButton.style.fontSize = '1em';
    closeButton.style.transition = 'background-color 0.2s';
    closeButton.addEventListener('mouseover', () => {
        closeButton.style.backgroundColor = '#d0d0d0';
    });
    closeButton.addEventListener('mouseout', () => {
        closeButton.style.backgroundColor = '#e0e0e0';
    });
    closeButton.addEventListener('click', () => {
        document.body.removeChild(modal);
    });
    modalContent.appendChild(closeButton);

    // Assemble and append
    modal.appendChild(modalContent);
    document.body.appendChild(modal);
}