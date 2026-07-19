const express = require('express');
const { authenticateHub } = require('./middleware/auth');
const authRouter = require('./routes/auth');
const ordersRouter = require('./routes/orders');
const storesRouter = require('./routes/stores');
const adminRouter = require('./routes/admin');
const adminHubsRouter = require('./routes/adminHubs');
const staffRouter = require('./routes/staff');
const orderActionsRouter = require('./routes/orderActions');
const hubRegistrationRouter = require('./routes/hubRegistration');
const publicMenuRouter = require('./routes/publicMenu');
const publicOrdersRouter = require('./routes/publicOrders');
const orderPulldownRouter = require('./routes/orderPulldown');

const app = express();
app.use(express.json());

app.get('/health', (req, res) => res.json({ status: 'ok' }));

// Public, but gated by a short-lived provisioning code — a new hub has
// no API key yet, so it can't go through authenticateHub.
app.use(hubRegistrationRouter);

// Public and unauthenticated on purpose — this is what a customer's
// phone calls after scanning a table QR code, before any login exists.
app.use(publicMenuRouter);
app.use(publicOrdersRouter);

// Public login endpoint. Auth for everything under /admin/* is now
// handled per-route inside admin.js / adminHubs.js (authenticateUser +
// role checks, or authenticatePlatform for the one tenant-bootstrap
// route) rather than blanket middleware here, since different admin
// routes need different checks.
app.use(authRouter);
app.use(adminRouter);
app.use(adminHubsRouter);
app.use(staffRouter);
app.use(orderActionsRouter);

// Everything past this point requires a valid hub API key.
app.use(authenticateHub, ordersRouter);
app.use(authenticateHub, storesRouter);
app.use(authenticateHub, orderPulldownRouter);

module.exports = app;
