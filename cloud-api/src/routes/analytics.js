const express = require('express');
const db = require('../db');
const { authenticateUser } = require('../middleware/userAuth');
const { requireStoreRole } = require('../middleware/roles');
const { requireFeature } = require('../middleware/features');

const router = express.Router();

// GET /admin/stores/:storeId/analytics?days=7 — owner/manager only.
// Voided and refunded orders are excluded throughout — they aren't
// real completed sales, and counting them would overstate revenue.
router.get('/admin/stores/:storeId/analytics', authenticateUser, requireFeature('analytics'), requireStoreRole(['owner', 'manager']), async (req, res) => {
  const storeId = req.params.storeId;
  const days = Math.min(Math.max(Number(req.query.days) || 7, 1), 90);

  const summaryRes = await db.query(
    `SELECT COUNT(*)::int AS total_orders,
            COALESCE(SUM(total), 0) AS total_revenue,
            COALESCE(AVG(total), 0) AS avg_order_value
     FROM orders
     WHERE store_id = $1 AND status NOT IN ('voided', 'refunded')
       AND created_at >= now() - ($2 || ' days')::interval`,
    [storeId, days]
  );

  const dailyRes = await db.query(
    `SELECT to_char(date_trunc('day', created_at), 'YYYY-MM-DD') AS day,
            COUNT(*)::int AS order_count,
            COALESCE(SUM(total), 0) AS revenue
     FROM orders
     WHERE store_id = $1 AND status NOT IN ('voided', 'refunded')
       AND created_at >= now() - ($2 || ' days')::interval
     GROUP BY day ORDER BY day ASC`,
    [storeId, days]
  );

  const bestSellersRes = await db.query(
    `SELECT oi.product_name_snapshot AS name,
            SUM(oi.qty)::int AS qty_sold,
            COALESCE(SUM(oi.line_total), 0) AS revenue
     FROM order_items oi
     JOIN orders o ON o.id = oi.order_id
     WHERE o.store_id = $1 AND o.status NOT IN ('voided', 'refunded')
       AND o.created_at >= now() - ($2 || ' days')::interval
     GROUP BY oi.product_name_snapshot
     ORDER BY qty_sold DESC
     LIMIT 10`,
    [storeId, days]
  );

  res.json({
    range_days: days,
    summary: summaryRes.rows[0],
    daily_revenue: dailyRes.rows,
    best_sellers: bestSellersRes.rows,
  });
});

module.exports = router;
