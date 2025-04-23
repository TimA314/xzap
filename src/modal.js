function createModal(lnurl, croppedDataUrl, isWebLNAvailable, onPay) {
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

    if (isWebLNAvailable) {
        const instructions = document.createElement('p');
        instructions.innerHTML = 'You can enter an amount below or scan the QR code to let your wallet decide the amount. If you choose to scan the QR code, your wallet will determine the payment amount.';
        instructions.style.margin = '10px 0';
        instructions.style.color = '#bbb';
        instructions.style.fontSize = '14px';
        instructions.style.lineHeight = '1.5';
        modalContent.appendChild(instructions);

        const amountInput = document.createElement('input');
        amountInput.type = 'number';
        amountInput.placeholder = 'Enter amount in sats';
        amountInput.min = '1';
        amountInput.step = '1';
        amountInput.addEventListener('input', () => {
            if (amountInput.value < 1) {
                amountInput.value = 1;
            }
        });
        amountInput.style.width = '100%';
        amountInput.style.padding = '10px';
        amountInput.style.marginBottom = '10px';
        amountInput.style.border = '1px solid #ff9800';
        amountInput.style.borderRadius = '10px';
        amountInput.style.backgroundColor = '#121212';
        amountInput.style.color = '#fff';
        amountInput.style.textAlign = 'center';
        modalContent.appendChild(amountInput);

        const saveDefaultCheckbox = document.createElement('input');
        saveDefaultCheckbox.type = 'checkbox';
        saveDefaultCheckbox.id = 'saveDefault';
        saveDefaultCheckbox.style.marginRight = '5px';
        modalContent.appendChild(saveDefaultCheckbox);

        const saveDefaultLabel = document.createElement('label');
        saveDefaultLabel.htmlFor = 'saveDefault';
        saveDefaultLabel.textContent = 'Save as default amount';
        saveDefaultLabel.style.color = '#bbb';
        modalContent.appendChild(saveDefaultLabel);

        const payButtonContainer = document.createElement('div');
        payButtonContainer.style.display = 'flex';
        payButtonContainer.style.justifyContent = 'center';
        payButtonContainer.style.marginTop = '15px';

        const payButton = document.createElement('button');
        payButton.textContent = 'Pay';
        payButton.style.padding = '10px 15px';
        payButton.style.backgroundColor = '#4caf50';
        payButton.style.color = '#fff';
        payButton.style.border = 'none';
        payButton.style.borderRadius = '10px';
        payButton.style.cursor = 'pointer';
        payButton.style.fontSize = '14px';
        payButton.addEventListener('click', () => {
            const amount = amountInput.value;
            if (amount) {
                if (saveDefaultCheckbox.checked) {
                    chrome.storage.local.set({ defaultAmount: amount }, () => {
                        console.log('Default amount saved:', amount);
                    });
                }
                onPay(amount);
                document.body.removeChild(modal);
            } else {
                alert('Please enter an amount');
            }
        });
        payButtonContainer.appendChild(payButton);
        modalContent.appendChild(payButtonContainer);
    } else {
        const message = document.createElement('p');
        message.innerHTML = 'WebLN is not available. Please scan the QR code or copy the Lightning address to complete the payment.';
        message.style.margin = '10px 0';
        message.style.color = '#bbb';
        message.style.fontSize = '14px';
        message.style.lineHeight = '1.5';
        modalContent.appendChild(message);
    }

    const qrImage = document.createElement('img');
    qrImage.src = croppedDataUrl;
    qrImage.style.width = '250px';
    qrImage.style.height = '250px';
    qrImage.style.border = '1px solid #ff9800';
    qrImage.style.borderRadius = '10px';
    qrImage.style.display = 'block';
    qrImage.style.margin = '10px auto';
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
    closeButton.addEventListener('click', () => {
        document.body.removeChild(modal);
    });
    modalContent.appendChild(closeButton);

    modal.appendChild(modalContent);
    document.body.appendChild(modal);
}