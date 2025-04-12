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
  
      history.forEach((item, index) => {
        const div = document.createElement('div');
        div.className = 'history-item';
  
        const img = document.createElement('img');
        img.src = item.dataUrl;
        div.appendChild(img);
  
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
  
        const deleteButton = document.createElement('button');
        deleteButton.className = 'delete-button';
        deleteButton.textContent = '✕'; // Small "X" symbol for delete
        deleteButton.setAttribute('data-index', index);
        deleteButton.addEventListener('click', (e) => {
          const confirmDelete = confirm('Are you sure you want to delete this history entry?');
          if (confirmDelete) {
            const indexToDelete = e.target.getAttribute('data-index');
            history.splice(indexToDelete, 1);
            chrome.storage.local.set({ history }, () => {
              div.remove(); // Remove the DOM element immediately
            });
          }
        });
        div.appendChild(deleteButton);
  
        historyList.appendChild(div);
      });
    });
  });