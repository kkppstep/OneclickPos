-- Network printer config, settable from admin-app's Hub setup tab.
-- Read by both local-hub and print-bridge via GET /stores/:id/settings
-- (hub-authenticated) — one setting, works for either. printer_model
-- maps to node-thermal-printer's PrinterTypes; 'epson' covers the
-- vast majority of budget 80mm ESC/POS clones (Xprinter, ZJiang, etc)
-- since they implement the Epson command set.
ALTER TABLE stores ADD COLUMN IF NOT EXISTS printer_enabled BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE stores ADD COLUMN IF NOT EXISTS printer_ip TEXT;
ALTER TABLE stores ADD COLUMN IF NOT EXISTS printer_port INTEGER NOT NULL DEFAULT 9100;
ALTER TABLE stores ADD COLUMN IF NOT EXISTS printer_model TEXT NOT NULL DEFAULT 'epson' CHECK (printer_model IN ('epson', 'star', 'tanca', 'daruma'));
ALTER TABLE stores ADD COLUMN IF NOT EXISTS printer_has_cash_drawer BOOLEAN NOT NULL DEFAULT false;
