const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const uploadDir = path.join(__dirname, "../public/uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const name = `${Date.now()}_${Math.round(Math.random()*10000)}${ext}`;
    cb(null, name);
  },
});
const upload = multer({ storage });

// POST /api/upload - handle single file upload and return a relative URL
router.post("/", upload.single("file"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file provided" });
  // Prefer returning an absolute URL so clients behind proxies or different origins
  // can use the returned path directly. Use the request host/protocol when available.
  try {
    // Return relative paths for uploaded files. Let the client resolve to an absolute URL
    // using its configured API base (this avoids returning hostnames that are internal
    // to the server process and can break production when behind proxies).
    const url = `/uploads/${req.file.filename}`;

    // Try to create a thumbnail server-side if sharp is available
    let thumbUrl = null;
    try {
      const sharp = require('sharp');
      const filepath = path.join(uploadDir, req.file.filename);
      const thumbName = `thumb_${req.file.filename}`;
      const thumbPath = path.join(uploadDir, thumbName);
      // generate thumbnail with max width/height 400 (preserve aspect)
      await sharp(filepath).resize({ width: 400, height: 400, fit: 'inside' }).toFile(thumbPath);
      thumbUrl = `/uploads/${thumbName}`;
    } catch (e) {
      // sharp not installed or processing failed; ignore and continue
      // console.debug('[UPLOAD] thumbnail generation skipped:', e?.message || e);
    }

    return res.json({ url, thumbUrl });
  } catch (e) {
    // Fallback to relative path
    const url = `/uploads/${req.file.filename}`;
    return res.json({ url });
  }
});

module.exports = router;
