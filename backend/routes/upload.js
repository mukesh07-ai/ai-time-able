const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const upload = require('../middleware/upload');
const c = require('../controllers/uploadController');

router.post('/file', protect, upload.single('file'), c.uploadFile);
router.post('/confirm', protect, c.confirmUpload);
router.get('/template', protect, c.downloadTemplate);

module.exports = router;
