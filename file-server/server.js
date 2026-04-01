const express = require('express');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.FILE_SERVER_PORT || 4000;
const SUPABASE_JWT_SECRET = process.env.SUPABASE_JWT_SECRET;
const ASSETS_BASE_PATH = process.env.ASSETS_BASE_PATH;
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || 'http://localhost:5173';

if (!SUPABASE_JWT_SECRET) {
  console.error('ERROR: SUPABASE_JWT_SECRET is not set in .env');
  process.exit(1);
}

if (!ASSETS_BASE_PATH) {
  console.error('ERROR: ASSETS_BASE_PATH is not set in .env');
  process.exit(1);
}

// CORS configuration
app.use(cors({
  origin: ALLOWED_ORIGIN,
  credentials: true,
  methods: ['GET', 'HEAD', 'OPTIONS'],
  allowedHeaders: ['Authorization', 'Range', 'Content-Type']
}));

// JWT verification middleware
function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Missing or invalid Authorization header' });
  }

  const token = authHeader.substring(7);

  try {
    const decoded = jwt.verify(token, SUPABASE_JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Unauthorized: Token expired' });
    }
    return res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }
}

// Path traversal prevention
function validateFilePath(filePath) {
  // Reject paths with '..' to prevent directory traversal
  if (filePath.includes('..')) {
    return false;
  }
  
  // Normalize path and check if it starts with the base path
  const fullPath = path.resolve(ASSETS_BASE_PATH, filePath);
  const normalizedBase = path.resolve(ASSETS_BASE_PATH);
  
  return fullPath.startsWith(normalizedBase);
}

// Content-Type mapping
function getContentType(ext) {
  const types = {
    '.mp4': 'video/mp4',
    '.webm': 'video/webm',
    '.ogg': 'video/ogg',
    '.mov': 'video/quicktime',
    '.avi': 'video/x-msvideo',
    '.mkv': 'video/x-matroska'
  };
  return types[ext.toLowerCase()] || 'application/octet-stream';
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Video streaming endpoint
app.get('/stream/:filePath(*)', verifyToken, (req, res) => {
  const filePath = req.params.filePath;

  // Validate path
  if (!validateFilePath(filePath)) {
    return res.status(400).json({ error: 'Invalid file path' });
  }

  const fullPath = path.resolve(ASSETS_BASE_PATH, filePath);

  // Check if file exists
  if (!fs.existsSync(fullPath)) {
    return res.status(404).json({ error: 'File not found' });
  }

  const stat = fs.statSync(fullPath);
  const fileSize = stat.size;
  const ext = path.extname(fullPath);
  const contentType = getContentType(ext);

  // Handle range requests for video seeking
  const range = req.headers.range;

  if (range) {
    // Parse range header (e.g., "bytes=0-1024")
    const parts = range.replace(/bytes=/, "").split("-");
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
    const chunkSize = (end - start) + 1;

    res.status(206); // Partial Content
    res.set({
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunkSize,
      'Content-Type': contentType,
      'Cache-Control': 'private, max-age=3600'
    });

    const stream = fs.createReadStream(fullPath, { start, end });
    stream.pipe(res);
  } else {
    // No range, send entire file
    res.status(200);
    res.set({
      'Content-Length': fileSize,
      'Content-Type': contentType,
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'private, max-age=3600'
    });

    const stream = fs.createReadStream(fullPath);
    stream.pipe(res);
  }

  // Error handling
  res.on('error', (err) => {
    console.error('Response error:', err);
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🎥 File Server running on port ${PORT}`);
  console.log(`📁 Serving files from: ${ASSETS_BASE_PATH}`);
  console.log(`🔒 CORS allowed origin: ${ALLOWED_ORIGIN}`);
});
