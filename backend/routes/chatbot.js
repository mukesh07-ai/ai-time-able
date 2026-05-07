const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const c = require('../controllers/chatbotController');

router.post('/ask', protect, c.ask);
router.post('/suggest-improvements', protect, c.suggestImprovements);
router.get('/quick-questions/:institutionId', protect, c.getQuickQuestions);

module.exports = router;
