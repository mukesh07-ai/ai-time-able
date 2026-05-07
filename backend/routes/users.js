const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { protect, adminOnly } = require('../middleware/auth');

router.post('/add-teacher', protect, adminOnly, userController.addTeacher);
router.post('/add-student', protect, adminOnly, userController.addStudent);
router.get('/', protect, adminOnly, userController.getAllUsers);
router.delete('/:id', protect, adminOnly, userController.deleteUser);

module.exports = router;
