const express = require('express');
const router = express.Router();

// Import route modules
const authRouter = require('./auth');
const usersRouter = require('./users');
const addressesRouter = require('./addresses');
const depositAddressesRouter = require('./depositAddresses');
const depositsRouter = require('./deposits');
const withdrawalsRouter = require('./withdrawals');

/**
 * @swagger
 * /api/health:
 *   get:
 *     summary: Health check endpoint
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Server is running
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: ok
 *                 timestamp:
 *                   type: string
 *                   example: 2024-01-01T00:00:00.000Z
 */
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString()
  });
});

// Mount route modules
router.use('/auth', authRouter);
router.use('/users', usersRouter);
router.use('/addresses', addressesRouter);
router.use('/depositAddresses', depositAddressesRouter);
router.use('/deposits', depositsRouter);
router.use('/withdrawals', withdrawalsRouter);

module.exports = router;
