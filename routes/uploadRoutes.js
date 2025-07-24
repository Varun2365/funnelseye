// routes/uploadRoutes.js
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto'); // Node.js built-in crypto module
const File = require('../schema/File'); // Your File model
const { protect } = require('../middleware/auth'); // Your authentication middleware

const router = express.Router();

const UPLOADS_DIR = path.join(__dirname, '../public/uploads'); // Path to store files

// Ensure the upload directory exists
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Multer Storage Configuration
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, `${UPLOADS_DIR}`); // Files will be stored in public/uploads/
  },
  filename: function (req, file, cb) {
    // Create a unique filename to prevent conflicts
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const fileExtension = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + fileExtension);
  }
});

// Configure Multer instance
const upload = multer({
  storage: storage,
  limits: { fileSize: 1024 * 1024 * 100 }, // Max 100MB file size (adjust as needed)
  fileFilter: (req, file, cb) => {
    // Basic file type validation
    const allowedMimeTypes = [
      'application/pdf',
      'application/msword', // .doc
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
      'video/mp4', 'video/webm', 'video/ogg', // common video formats
      'audio/mpeg', 'audio/wav', 'audio/ogg' // common audio formats
    ];
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type.'), false);
    }
  }
});

// Express Route for File Upload
// Apply the 'protect' middleware to secure this endpoint
router.post('/upload', protect, upload.single('file'), async (req, res) => {
  try {
    console.log(req.coachId)
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded.' });
    }

    const { originalname, mimetype, size, filename, path: filePath } = req.file;

    // --- Generate file hash ---
    // Read the temporarily saved file to generate its hash
    const fileBuffer = fs.readFileSync(filePath);
    const fileHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');

    // --- Check if file already exists in DB ---
    const existingFile = await File.findOne({ fileHash: fileHash });

    if (existingFile) {
      // File with this content already exists
      // Delete the newly uploaded duplicate file from disk
      fs.unlinkSync(filePath);
      return res.status(200).json({
        message: 'File already uploaded.',
        file: {
          id: existingFile._id,
          originalName: existingFile.originalName,
          fileUrl: existingFile.fileUrl,
          mimeType: existingFile.mimeType,
          size: existingFile.size
        }
      });
    }

    // --- If not existing, proceed to save new file metadata ---
    // Construct the public URL for the file
    // Assumes your server is accessible at `http://yourdomain.com` and serves static files from `public/uploads`
    const fileUrl = `${req.protocol}://${req.get('host')}/uploads/${filename}`;

    // Save file metadata to MongoDB
    const newFile = new File({
      originalName: originalname,
      storedFileName: filename,
      fileUrl: fileUrl,
      mimeType: mimetype,
      size: size,
      fileHash: fileHash, // Save the hash
      uploadedBy: req.user.id // User ID from your protect middleware
    });

    await newFile.save();

    res.status(200).json({
      message: 'File uploaded successfully!',
      file: {
        id: newFile._id,
        originalName: newFile.originalName,
        fileUrl: newFile.fileUrl,
        mimeType: newFile.mimeType,
        size: newFile.size
      }
    });

  } catch (error) {
    console.error('File upload error:', error);
    // If an error occurred after the file was saved to disk but before DB, clean up
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    // Handle Multer errors specifically (e.g., file size limits)
    if (error instanceof multer.MulterError) {
      return res.status(400).json({ message: error.message });
    }
    // Handle other errors
    res.status(500).json({ message: 'Server error during file upload.', error: error.message });
  }
});

module.exports = router;