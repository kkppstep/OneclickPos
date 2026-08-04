const { printer: ThermalPrinter, types: PrinterTypes } = require('node-thermal-printer');
const axios = require('axios');
const config = require('../config');
const { getCached } = require('./settings');

// Remote settings (admin-app's Hub setup tab, fetched via
// GET /stores/:id/settings and refreshed every sync cycle — see
// index.js) take priority over the old .env-based PRINTER_TARGET, so
// a device that's been given a remote printer_ip doesn't also need
// .env edited. Devices set up before this existed keep working
// unchanged, since printer_ip only exists once someone sets it.
function resolvePrinterSettings() {
  const remote = getCached('store_settings');
  if (remote?.printer_ip) {
    return {
      type: remote.printer_model || 'epson',
      target: `tcp://${remote.printer_ip}:${remote.printer_port || 9100}`,
      hasCashDrawer: Boolean(remote.printer_has_cash_drawer),
    };
  }
  return { type: config.printer.type, target: config.printer.target, hasCashDrawer: config.printer.hasCashDrawer };
}

function buildPrinter(printerSettings) {
  return new ThermalPrinter({
    type: PrinterTypes[printerSettings.type.toUpperCase()] || PrinterTypes.EPSON,
    interface: printerSettings.target,
  });
}

// Printing and the cash drawer always go through the local hub,
// whichever path the order took (cloud or fallback) — there is no
// network route from the cloud straight to a LAN/USB printer.
async function printReceipt(order, items) {
  const printerSettings = resolvePrinterSettings();
  if (!printerSettings.target) throw new Error('printer_not_configured');

  const printerInst = buildPrinter(printerSettings);
  const connected = await printerInst.isPrinterConnected().catch(() => false);
  if (!connected) throw new Error('printer_unreachable');

  printerInst.alignCenter();
  printerInst.println('RECEIPT');
  if (order.table_number) {
    printerInst.bold(true);
    printerInst.println(`TABLE ${order.table_number}`);
    printerInst.bold(false);
  }
  printerInst.drawLine();
  printerInst.alignLeft();
  for (const item of items) {
    printerInst.println(`${item.qty} x ${item.product_name_snapshot}  ${item.line_total}`);
    if (item.notes) {
      printerInst.println(`  note: ${item.notes}`);
    }
  }
  printerInst.drawLine();
  printerInst.println(`Total: ${order.total}`);

  if (printerSettings.hasCashDrawer) {
    printerInst.openCashDrawer();
  }

  printerInst.cut();
  await printerInst.execute();
}

// For on-demand receipts (payment confirmation) — a pre-rendered PNG
// from admin-app, printed as-is rather than built from text commands,
// so what prints always matches exactly what staff saw on screen.
// Pulled from the same print-jobs queue print-bridge uses — see
// services/pullDown.js.
async function printImageFromUrl(imageUrl) {
  const printerSettings = resolvePrinterSettings();
  if (!printerSettings.target) throw new Error('printer_not_configured');

  const imageRes = await axios.get(imageUrl, { responseType: 'arraybuffer' });
  const printerInst = buildPrinter(printerSettings);
  const connected = await printerInst.isPrinterConnected().catch(() => false);
  if (!connected) throw new Error('printer_unreachable');

  await printerInst.printImageBuffer(Buffer.from(imageRes.data));
  if (printerSettings.hasCashDrawer) {
    printerInst.openCashDrawer();
  }
  printerInst.cut();
  await printerInst.execute();
}

module.exports = { printReceipt, printImageFromUrl };
