const prisma = require('../config/db');
const catalogCache = new Map();

const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
async function fetchCatalog(url) {
  let lastStatus = 0;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: { 'User-Agent': 'NickHub/1.0 (support@nickhub.example)', Accept: 'application/json' },
        signal: AbortSignal.timeout(10000)
      });
      lastStatus = response.status;
      if (response.ok) return response.json();
      if (![429, 500, 502, 503, 504].includes(response.status)) break;
    } catch (error) {
      if (attempt === 2) break;
    }
    await wait(1100 * (attempt + 1));
  }
  const error = new Error(`Catalog provider is temporarily unavailable${lastStatus ? ` (${lastStatus})` : ''}. Please try again in a few minutes.`);
  error.status = 503;
  throw error;
}

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

async function searchArtistCatalog(req, res) {
  const artist = String(req.query.artist || '').trim();
  if (artist.length < 2 || artist.length > 100) {
    return res.status(400).json({ error: 'Enter an artist name between 2 and 100 characters' });
  }
  const cacheKey = artist.toLowerCase();
  const cached = catalogCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return res.json(cached.value);
  const params = new URLSearchParams({ query: `artist:${artist}`, fmt: 'json', limit: '100' });
  const payload = await fetchCatalog(`https://musicbrainz.org/ws/2/recording?${params}`);
  const normalized = (payload.recordings || []).map((recording) => ({
    sourceId: recording.id,
    title: recording.title,
    artistName: (recording['artist-credit'] || []).map((credit) => credit.name).join(' & ') || artist,
    releaseDate: recording['first-release-date'] || null,
    isrc: recording.isrcs?.[0] || null,
    length: recording.length || null,
    score: recording.score || 0
  }));
  const value = { artist, recordings: normalized };
  catalogCache.set(cacheKey, { value, expiresAt: Date.now() + 10 * 60 * 1000 });
  res.json(value);
}

async function importCatalog(req, res) {
  const { recordings, ownershipConfirmed } = req.body;
  if (ownershipConfirmed !== true) {
    return res.status(400).json({ error: 'You must confirm that you control the rights to these recordings' });
  }
  if (!Array.isArray(recordings) || recordings.length < 1 || recordings.length > 50) {
    return res.status(400).json({ error: 'Select between 1 and 50 recordings' });
  }
  const clean = recordings.map((item) => ({
    title: String(item.title || '').trim().slice(0, 200),
    artistName: String(item.artistName || '').trim().slice(0, 200),
    releaseDate: item.releaseDate && /^\d{4}(-\d{2})?(-\d{2})?$/.test(item.releaseDate) ? new Date(`${item.releaseDate.length === 4 ? `${item.releaseDate}-01-01` : item.releaseDate.length === 7 ? `${item.releaseDate}-01` : item.releaseDate}T00:00:00.000Z`) : null,
    isrc: item.isrc ? String(item.isrc).replace(/[^A-Za-z0-9]/g, '').slice(0, 12) : null
  }));
  if (clean.some((item) => !item.title || !item.artistName)) {
    return res.status(400).json({ error: 'Every recording needs a title and artist name' });
  }
  const isrcs = clean.map((item) => item.isrc).filter(Boolean);
  const existing = isrcs.length ? await prisma.release.findMany({
    where: { userId: req.user.id, isrc: { in: isrcs } }, select: { isrc: true }
  }) : [];
  const existingIsrcs = new Set(existing.map((item) => item.isrc));
  const unique = clean.filter((item, index) => (!item.isrc || !existingIsrcs.has(item.isrc)) && (!item.isrc || clean.findIndex((candidate) => candidate.isrc === item.isrc) === index));
  if (!unique.length) return res.status(409).json({ error: 'All selected recordings already exist in your catalog' });
  await prisma.release.createMany({
    data: unique.map((item) => ({ ...item, userId: req.user.id, releaseType: 'Single', status: 'DRAFT' }))
  });
  res.status(201).json({ imported: unique.length, skipped: clean.length - unique.length });
}

module.exports = { listMyReleases, createRelease, getRelease, submitRelease, searchArtistCatalog, importCatalog };
