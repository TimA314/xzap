import { generatePrivateKey, getPublicKey, relayInit } from 'nostr-tools';

const browser = window.chrome || window.browser;


document.addEventListener('DOMContentLoaded', () => {
  const relay = relayInit('wss://relay.damus.io');
  relay.connect().then(() => console.log('Relay connected'));

  document.getElementById('generate').onclick = () => {
    const privKey = generatePrivateKey();
    const pubKey = getPublicKey(privKey);
    document.getElementById('pubkey').textContent = pubKey.slice(0, 10) + '...';
    localStorage.setItem('nostrPrivKey', privKey);
  };
});