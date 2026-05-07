const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const upload = require('../middleware/upload');
const c = require('../controllers/uploadController');

router.post('/file', auth, upload.single('file'), c.uploadFile);
router.post('/confirm', auth, c.confirmUpload);
router.get('/template', auth, c.downloadTemplate);

module.exports = router;
