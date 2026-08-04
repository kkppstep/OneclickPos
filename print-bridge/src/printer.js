const { printer: ThermalPrinter, types: PrinterTypes } = require('node-thermal-printer');
const axios = require('axios');

// printerSettings is whatever GET /stores/:id/settings last returned
// (printer_ip, printer_port, printer_model, printer_has_cash_drawer) —
// fetched fresh each poll cycle in index.js, so a shop owner changing
// the printer's IP in admin-app takes effect within one cycle, no
// restart needed.
function buildPrinter(printerSettings) {
  return new ThermalPrinter({
    type: PrinterTypes[printerSettings.printer_model.toUpperCase()] || PrinterTypes.EPSON,
    interface: `tcp://${printerSettings.printer_ip}:${printerSettings.printer_port}`,
  });
}

async function printReceipt(order, items, printerSettings) {
  if (!printerSettings.printer_enabled || !printerSettings.printer_ip) {
    throw new Error('printer_not_configured');
  }

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

  if (printerSettings.printer_has_cash_drawer) {
    printerInst.openCashDrawer();
  }

  printerInst.cut();
  await printerInst.execute();
}

// For on-demand receipts (payment confirmation) — a pre-rendered PNG
// from admin-app, printed as-is rather than built from text commands,
// so what prints always matches exactly what staff saw on screen.
async function printImageFromUrl(imageUrl, printerSettings) {
  if (!printerSettings.printer_enabled || !printerSettings.printer_ip) {
    throw new Error('printer_not_configured');
  }

  const imageRes = await axios.get(imageUrl, { responseType: 'arraybuffer' });
  const printerInst = buildPrinter(printerSettings);
  const connected = await printerInst.isPrinterConnected().catch(() => false);
  if (!connected) throw new Error('printer_unreachable');

  await printerInst.printImageBuffer(Buffer.from(imageRes.data));
  if (printerSettings.printer_has_cash_drawer) {
    printerInst.openCashDrawer();
  }
  printerInst.cut();
  await printerInst.execute();
}

module.exports = { printReceipt, printImageFromUrl };
