const prisma = require('../config/db');

async function listUsers(req, res) {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      displayName: true,
      email: true,
      role: true,
      country: true,
      subscriptionStatus: true,
      createdAt: true,
      _count: { select: { releases: true } }
    },
    orderBy: { createdAt: 'desc' }
  });
  res.json({ users });
}

async function listReleasesForReview(req, res) {
  const releases = await prisma.release.findMany({
    where: { status: 'PENDING_REVIEW' },
    include: { user: { select: { displayName: true, email: true } } },
    orderBy: { createdAt: 'asc' }
  });
  res.json({ releases });
}

async function reviewRelease(req, res) {
  const { decision, rejectionReason } = req.body; // 'approve' | 'reject'
  if (!['approve', 'reject'].includes(decision)) {
    return res.status(400).json({ error: 'decision must be "approve" or "reject"' });
  }
  const status = decision === 'approve' ? 'APPROVED' : 'REJECTED';
  const release = await prisma.release.update({
    where: { id: req.params.id },
    data: { status, rejectionReason: status === 'REJECTED' ? rejectionReason || null : null }
  });
  res.json({ release });
}

async function listWithdrawals(req, res) {
  const withdrawals = await prisma.withdrawal.findMany({
    include: { user: { select: { displayName: true, email: true, payoutMethod: true } } },
    orderBy: { requestedAt: 'desc' }
  });
  res.json({ withdrawals });
}

async function updateWithdrawal(req, res) {
  const { status } = req.body; // APPROVED | PAID | REJECTED
  if (!['APPROVED', 'PAID', 'REJECTED'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }
  const withdrawal = await prisma.withdrawal.update({
    where: { id: req.params.id },
    data: {
      status,
      processedAt: ['PAID', 'REJECTED'].includes(status) ? new Date() : null
    }
  });
  res.json({ withdrawal });
}

// Bulk-import royalty lines, e.g. parsed from a platform CSV/TSV report on the client
// before sending here as JSON. Expects: { lines: [{ releaseId, platform, territory,
// streams, revenue, periodStart, periodEnd }, ...] }
async function importRoyaltyReport(req, res) {
  const { lines } = req.body;
  if (!Array.isArray(lines) || lines.length === 0) {
    return res.status(400).json({ error: 'lines[] is required' });
  }
  const created = await prisma.$transaction(
    lines.map((l) =>
      prisma.royaltyLine.create({
        data: {
          releaseId: l.releaseId,
          platform: l.platform,
          territory: l.territory,
          streams: l.streams || 0,
          revenue: l.revenue || 0,
          periodStart: new Date(l.periodStart),
          periodEnd: new Date(l.periodEnd)
        }
      })
    )
  );
  res.status(201).json({ imported: created.length });
}

async function listTickets(req, res) {
  const tickets = await prisma.supportTicket.findMany({
    include: { user: { select: { displayName: true, email: true } } },
    orderBy: { createdAt: 'desc' }
  });
  res.json({ tickets });
}

async function updateTicket(req, res) {
  const { status } = req.body; // OPEN | IN_PROGRESS | RESOLVED
  if (!['OPEN', 'IN_PROGRESS', 'RESOLVED'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }
  const ticket = await prisma.supportTicket.update({
    where: { id: req.params.id },
    data: { status }
  });
  res.json({ ticket });
}

module.exports = {
  listUsers,
  listReleasesForReview,
  reviewRelease,
  listWithdrawals,
  updateWithdrawal,
  importRoyaltyReport,
  listTickets,
  updateTicket
};
