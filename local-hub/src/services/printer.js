const { printer: ThermalPrinter, types: PrinterTypes } = require('node-thermal-printer');
const config = require('../config');

function buildPrinter() {
  return new ThermalPrinter({
    type: PrinterTypes[config.printer.type.toUpperCase()] || PrinterTypes.EPSON,
    interface: config.printer.target,
  });
}

// Printing and the cash drawer always go through the local hub,
// whichever path the order took (cloud or fallback) — there is no
// network route from the cloud straight to a LAN/USB printer.
async function printReceipt(order, items) {
  const printerInst = buildPrinter();
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
  }
  printerInst.drawLine();
  printerInst.println(`Total: ${order.total}`);

  if (config.printer.hasCashDrawer) {
    printerInst.openCashDrawer();
  }

  printerInst.cut();
  await printerInst.execute();
}

module.exports = { printReceipt };
