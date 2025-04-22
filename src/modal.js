function createModal(lnurl, croppedDataUrl) {
    const modal = document.createElement('div');
    modal.style.position = 'fixed';
    modal.style.top = '0';
    modal.style.left = '0';
    modal.style.width = '100%';
    modal.style.height = '100%';
    modal.style.backgroundColor = 'rgba(18, 18, 18, 0.8)';
    modal.style.display = 'flex';
    modal.style.justifyContent = 'center';
    modal.style.alignItems = 'center';
    modal.style.zIndex = '1000';

    const modalContent = document.createElement('div');
    modalContent.style.backgroundColor = '#1e1e1e';
    modalContent.style.padding = '20px';
    modalContent.style.borderRadius = '20px';
    modalContent.style.maxWidth = '400px';
    modalContent.style.width = '90%';
    modalContent.style.boxShadow = '0 2px 8px rgba(255, 152, 0, 0.3)';
    modalContent.style.border = '1px solid #ff9800';
    modalContent.style.fontFamily = "'Roboto', sans-serif";
    modalContent.style.textAlign = 'center';
    modalContent.style.color = '#fff';

    const header = document.createElement('h4');
    header.textContent = 'Complete Your Zap Payment';
    header.style.margin = '0 0 15px';
    header.style.fontSize = '16px';
    header.style.color = '#ff9800';
    modalContent.appendChild(header);

    const instructions = document.createElement('p');
    instructions.innerHTML = 'Since no WebLN wallet was detected, scan the QR code below with your mobile Lightning wallet to complete your Zap payment. Alternatively, copy the Lightning address and paste it into your wallet.';
    instructions.style.margin = '10px 0';
    instructions.style.color = '#bbb';
    instructions.style.fontSize = '14px';
    instructions.style.lineHeight = '1.5';
    modalContent.appendChild(instructions);

    const qrImage = document.createElement('img');
    qrImage.src = croppedDataUrl;
    qrImage.style.width = '250px';
    qrImage.style.height = '250px';
    qrImage.style.border = '1px solid #ff9800';
    qrImage.style.borderRadius = '10px';
    qrImage.style.margin = '10px 0';
    modalContent.appendChild(qrImage);

    const lnurlText = document.createElement('p');
    lnurlText.textContent = lnurl;
    lnurlText.style.backgroundColor = '#121212';
    lnurlText.style.padding = '10px';
    lnurlText.style.border = '1px solid #ff9800';
    lnurlText.style.borderRadius = '10px';
    lnurlText.style.color = '#fff';
    lnurlText.style.wordBreak = 'break-all';
    lnurlText.style.margin = '10px 0';
    lnurlText.style.fontSize = '14px';
    modalContent.appendChild(lnurlText);

    const copyButton = document.createElement('button');
    copyButton.textContent = 'Copy Lightning Address';
    copyButton.style.padding = '10px 15px';
    copyButton.style.backgroundColor = '#ff9800';
    copyButton.style.color = '#121212';
    copyButton.style.border = 'none';
    copyButton.style.borderRadius = '10px';
    copyButton.style.cursor = 'pointer';
    copyButton.style.fontSize = '14px';
    copyButton.style.margin = '5px';
    copyButton.style.transition = 'background-color 0.3s ease';
    copyButton.addEventListener('mouseover', () => {
        copyButton.style.backgroundColor = '#e68900';
    });
    copyButton.addEventListener('mouseout', () => {
        copyButton.style.backgroundColor = '#ff9800';
    });
    copyButton.addEventListener('click', () => {
        navigator.clipboard.writeText(lnurl).then(() => {
            alert('Lightning address copied to clipboard!');
        }).catch(err => {
            console.error('Failed to copy:', err);
        });
    });
    modalContent.appendChild(copyButton);

    const closeButton = document.createElement('button');
    closeButton.textContent = 'Close';
    closeButton.style.padding = '10px 15px';
    closeButton.style.backgroundColor = '#666';
    closeButton.style.color = '#fff';
    closeButton.style.border = 'none';
    closeButton.style.borderRadius = '10px';
    closeButton.style.cursor = 'pointer';
    closeButton.style.fontSize = '14px';
    closeButton.style.margin = '5px';
    closeButton.style.transition = 'background-color 0.3s ease';
    closeButton.addEventListener('mouseover', () => {
        closeButton.style.backgroundColor = '#555';
    });
    closeButton.addEventListener('mouseout', () => {
        closeButton.style.backgroundColor = '#666';
    });
    closeButton.addEventListener('click', () => {
        document.body.removeChild(modal);
    });
    modalContent.appendChild(closeButton);

    modal.appendChild(modalContent);
    document.body.appendChild(modal);
}