const prisma = require('../config/db');

async function createTicket(req, res) {
  const { topic, message } = req.body;
  if (!topic || !message) {
    return res.status(400).json({ error: 'topic and message are required' });
  }
  const ticket = await prisma.supportTicket.create({
    data: { userId: req.user.id, topic, message, status: 'OPEN' }
  });
  res.status(201).json({ ticket });
}

async function listMyTickets(req, res) {
  const tickets = await prisma.supportTicket.findMany({
    where: { userId: req.user.id },
    orderBy: { createdAt: 'desc' }
  });
  res.json({ tickets });
}

module.exports = { createTicket, listMyTickets };
