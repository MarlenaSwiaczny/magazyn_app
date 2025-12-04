// DEPRECATED: separate image-multiple-upload handler. The main `upload.js`
// covers single-file uploads; `uploadImages.js` may be unused by the client.
// Keep this file for now and remove after confirming no usage in production.
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const router = express.Router();

const uploadDir = path.join(__dirname, '..', 'public', 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const safe = Date.now() + '-' + Math.random().toString(36).slice(2,8) + '-' + file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, safe);
  }
});

const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

// Accept multiple images under 'images' field
router.post('/', upload.array('images', 500), (req, res) => {
  const files = req.files || [];
  const result = files.map(f => ({ name: f.originalname.toLowerCase(), url: `/uploads/${f.filename}` }));
  res.json(result);
});

module.exports = router;
