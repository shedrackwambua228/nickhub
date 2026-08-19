const prisma = require('../config/db');

async function listMyReleases(req, res) {
  const releases = await prisma.release.findMany({
    where: { userId: req.user.id },
    orderBy: { createdAt: 'desc' }
  });
  res.json({ releases });
}

async function createRelease(req, res) {
  const d = req.body;
  if (!d.title || !d.artistName) {
    return res.status(400).json({ error: 'title and artistName are required' });
  }

  const release = await prisma.release.create({
    data: {
      userId: req.user.id,
      title: d.title,
      artistName: d.artistName,
      featuredArtists: d.featuredArtists,
      releaseType: d.releaseType || 'Single',
      genre: d.genre,
      language: d.language,
      releaseDate: d.releaseDate ? new Date(d.releaseDate) : null,
      songwriters: d.songwriters,
      producers: d.producers,
      copyrightLine: d.copyrightLine,
      isrc: d.isrc,
      upc: d.upc,
      audioUrl: d.audioUrl,
      artworkUrl: d.artworkUrl,
      status: 'DRAFT'
    }
  });
  res.status(201).json({ release });
}

async function getRelease(req, res) {
  const release = await prisma.release.findUnique({ where: { id: req.params.id } });
  if (!release || (release.userId !== req.user.id && req.user.role !== 'ADMIN')) {
    return res.status(404).json({ error: 'Release not found' });
  }
  res.json({ release });
}

async function submitRelease(req, res) {
  const release = await prisma.release.findUnique({ where: { id: req.params.id } });
  if (!release || release.userId !== req.user.id) {
    return res.status(404).json({ error: 'Release not found' });
  }
  if (!['DRAFT', 'REJECTED'].includes(release.status)) {
    return res.status(400).json({ error: `Release is already ${release.status.toLowerCase()}` });
  }
  const updated = await prisma.release.update({
    where: { id: release.id },
    data: { status: 'PENDING_REVIEW', rejectionReason: null }
  });
  res.json({ release: updated });
}

module.exports = { listMyReleases, createRelease, getRelease, submitRelease };
