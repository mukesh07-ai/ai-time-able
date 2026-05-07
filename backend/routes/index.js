const express = require('express');
const router = express.Router();

router.use('/auth', require('./auth'));
router.use('/users', require('./users'));
router.use('/teachers', require('./teachers'));
router.use('/subjects', require('./subjects'));
router.use('/rooms', require('./rooms'));
router.use('/timetables', require('./timetables'));
router.use('/upload', require('./upload'));
router.use('/chatbot', require('./chatbot'));
router.use('/dashboard', require('./dashboard'));
router.use('/departments', require('./departments'));
router.use('/leave', require('./leave'));

module.exports = router;
