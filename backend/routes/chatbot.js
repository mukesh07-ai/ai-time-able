const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const c = require('../controllers/chatbotController');

router.post('/ask', auth, c.ask);
router.post('/suggest-improvements', auth, c.suggestImprovements);
router.get('/quick-questions/:institutionId', auth, c.getQuickQuestions);

module.exports = router;
