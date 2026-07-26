// crypto.randomUUID() needs a secure context (HTTPS, or plain
// localhost). Production on Vercel is always HTTPS, but `npm run dev`
// opened from a phone via a LAN IP during testing isn't — so this
// falls back to a manual v4 implementation rather than throwing.
export function uuid() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
