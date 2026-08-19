const prisma = require('../config/db');

const MIN_WITHDRAWAL = 10; // adjust to your payout provider's minimum

async function requestWithdrawal(req, res) {
  const { amount, method } = req.body;
  if (!amount || amount < MIN_WITHDRAWAL) {
    return res.status(400).json({ error: `Minimum withdrawal is $${MIN_WITHDRAWAL}` });
  }
  if (!method) {
    return res.status(400).json({ error: 'method is required (e.g. M-Pesa, Bank transfer, PayPal)' });
  }

  // In production: check the user's actual available balance here before allowing the request.
  const withdrawal = await prisma.withdrawal.create({
    data: { userId: req.user.id, amount, method, status: 'PENDING' }
  });
  res.status(201).json({ withdrawal });
}

async function listMyWithdrawals(req, res) {
  const withdrawals = await prisma.withdrawal.findMany({
    where: { userId: req.user.id },
    orderBy: { requestedAt: 'desc' }
  });
  res.json({ withdrawals });
}

module.exports = { requestWithdrawal, listMyWithdrawals };
