document.addEventListener('DOMContentLoaded', () => {
    chrome.storage.local.get(['history'], (data) => {
      const history = data.history || [];
      const historyList = document.getElementById('historyList');
  
      if (history.length === 0) {
        const p = document.createElement('p');
        p.textContent = 'No history available.';
        historyList.appendChild(p);
        return;
      }
  
      history.forEach((item) => {
        const div = document.createElement('div');
        div.className = 'history-item';
  
        const img = document.createElement('img');
        img.src = item.dataUrl;
        div.appendChild(img);
  
        // const pFileName = document.createElement('p');
        // pFileName.textContent = `File: ${item.fileName}`;
        // div.appendChild(pFileName);
  
        const pLnurl = document.createElement('p');
        pLnurl.textContent = `LNURL: ${item.lnurl}`;
        div.appendChild(pLnurl);
  
        const copyButton = document.createElement('button');
        copyButton.className = 'copy-button';
        copyButton.textContent = 'Copy';
        copyButton.addEventListener('click', () => {
          navigator.clipboard.writeText(item.lnurl).then(() => {
            copyButton.textContent = 'Copied!';
            setTimeout(() => {
              copyButton.textContent = 'Copy';
            }, 2000);
          });
        });
        div.appendChild(copyButton);
  
        historyList.appendChild(div);
      });
    });
  });