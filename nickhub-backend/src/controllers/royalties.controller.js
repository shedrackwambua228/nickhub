const prisma = require('../config/db');

async function listMyRoyalties(req, res) {
  const lines = await prisma.royaltyLine.findMany({
    where: { release: { userId: req.user.id } },
    include: { release: { select: { title: true } } },
    orderBy: { periodStart: 'desc' }
  });
  res.json({ royalties: lines });
}

async function earningsSummary(req, res) {
  const lines = await prisma.royaltyLine.findMany({
    where: { release: { userId: req.user.id } }
  });
  const lifetimeEarnings = lines.reduce((sum, l) => sum + l.revenue, 0);
  res.json({ lifetimeEarnings });
}

module.exports = { listMyRoyalties, earningsSummary };
