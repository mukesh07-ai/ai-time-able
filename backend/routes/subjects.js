const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const c = require('../controllers/subjectController');

router.get('/', auth, c.getAll);
router.post('/', auth, c.create);
router.get('/:id', auth, c.getOne);
router.put('/:id', auth, c.update);
router.delete('/:id', auth, c.remove);

module.exports = router;
