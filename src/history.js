document.addEventListener('DOMContentLoaded', () => {
    chrome.storage.local.get(['history'], (data) => {
      const history = data.history || [];
      const historyList = document.getElementById('historyList');
  
      // If no history exists, show a message
      if (history.length === 0) {
        const p = document.createElement('p');
        p.textContent = 'No history available.';
        historyList.appendChild(p);
        return;
      }
  
      // Iterate over each history item
      history.forEach((item, index) => {
        const div = document.createElement('div');
        div.className = 'history-item';

        // Add a type label to distinguish embedded vs parsed
        const typeLabel = document.createElement('span');
        typeLabel.className = 'type-label';
        typeLabel.textContent = item.type === 'lnurlEmbedded' ? 'Embedded' : 'Parsed';
        typeLabel.style.marginRight = '10px';
        typeLabel.style.color = item.type === 'lnurlEmbedded' ? '#ff9800' : '#4caf50'; // Orange for embedded, green for parsed
        div.appendChild(typeLabel);
  
        // Create a thumbnail image
        const img = document.createElement('img');
        img.src = item.dataUrl;
        div.appendChild(img);
  
        // Create a paragraph for the file name
        const pLnurl = document.createElement('p');
        pLnurl.textContent = `LNURL: ${item.lnurl}`;
        div.appendChild(pLnurl);
  
        // Copy button
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
  
        // Delete button
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