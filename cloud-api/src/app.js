const express = require('express');
const cors = require('cors');
const { authenticateHub } = require('./middleware/auth');
const authRouter = require('./routes/auth');
const googleAuthRouter = require('./routes/googleAuth');
const platformAdminRouter = require('./routes/platformAdmin');
const ordersRouter = require('./routes/orders');
const storesRouter = require('./routes/stores');
const adminRouter = require('./routes/admin');
const adminHubsRouter = require('./routes/adminHubs');
const staffRouter = require('./routes/staff');
const orderActionsRouter = require('./routes/orderActions');
const analyticsRouter = require('./routes/analytics');
const uploadsRouter = require('./routes/uploads');
const pushTokensRouter = require('./routes/pushTokens');
const serviceRequestsRouter = require('./routes/serviceRequests');
const hubRegistrationRouter = require('./routes/hubRegistration');
const publicMenuRouter = require('./routes/publicMenu');
const publicOrdersRouter = require('./routes/publicOrders');
const orderPulldownRouter = require('./routes/orderPulldown');

const app = express();
app.use(cors());
// Raised from Express's 100kb default — base64-encoded images/audio
// need headroom (base64 adds ~33% size), up to the 5MB file cap in
// routes/uploads.js.
app.use(express.json({ limit: '8mb' }));

app.get('/health', (req, res) => res.json({ status: 'ok' }));

// Public, but gated by a short-lived provisioning code — a new hub has
// no API key yet, so it can't go through authenticateHub.
app.use(hubRegistrationRouter);

// Public and unauthenticated on purpose — this is what a customer's
// phone calls after scanning a table QR code, before any login exists.
app.use(publicMenuRouter);
app.use(publicOrdersRouter);

// Public login endpoints (email/password, Google exchange, platform
// admin). Auth for everything under /admin/* and /platform/* is
// handled per-route (authenticateUser + role checks, or
// authenticatePlatformAdmin) rather than blanket middleware here,
// since different routes need different checks.
app.use(authRouter);
app.use(googleAuthRouter);
app.use(platformAdminRouter);
app.use(adminRouter);
app.use(adminHubsRouter);
app.use(staffRouter);
app.use(orderActionsRouter);
app.use(analyticsRouter);
app.use(uploadsRouter);
app.use(pushTokensRouter);
app.use(serviceRequestsRouter);

// Everything past this point requires a valid hub API key.
app.use(authenticateHub, ordersRouter);
app.use(authenticateHub, storesRouter);
app.use(authenticateHub, orderPulldownRouter);

module.exports = app;
