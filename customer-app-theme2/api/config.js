module.exports = (req, res) => {
  res.setHeader('Content-Type', 'application/javascript');
  res.setHeader('Cache-Control', 'no-store');
  res.send(`window.POS_CONFIG = ${JSON.stringify({ CLOUD_API_BASE: process.env.CLOUD_API_BASE || '' })};`);
};