const express = require('express')
const router = express.Router()
const authMiddleware = require('../../middlewares/auth')
const verifyRecaptcha = require('../../middlewares/recaptcha')
const limiter = require('../../middlewares/rateLimit')
const {register, login, getCurrentUser, getAllAdmins, changePermissions, editUser, deleteUser, banUser, getUserIdByNick, getStatistics, editUserBilling, getBillPDF, verifyUser, resendVerifyEmail, verifyAdmin, recoverPassword, changePassword, getUserById, sendEmail, sendRecoveryEmail, logout} = require('../controllers/User.controller')

router.get('/bills/:billId', [authMiddleware], getBillPDF);
router.get('/current', [authMiddleware], getCurrentUser);
router.post('/id', [authMiddleware], getUserById);
router.post('/nick', [authMiddleware], getUserIdByNick);
router.post('/verify', verifyUser);
router.post('/admins', [authMiddleware], getAllAdmins);
router.post('/recover', recoverPassword);
router.post('/password', changePassword);
router.post('/email', [authMiddleware, limiter], sendEmail);
router.post('/stats', [authMiddleware], getStatistics);
router.post('/recovery', [verifyRecaptcha, limiter], sendRecoveryEmail);
router.post('/sendverify', [verifyRecaptcha, limiter], resendVerifyEmail);
router.post('/register', [verifyRecaptcha, limiter], register);
router.post('/login', [limiter], login);
router.post('/logout', logout);
router.put('/verifyAdmin', [authMiddleware], verifyAdmin);
router.put('/ban', [authMiddleware], banUser);
router.put('/edit', [authMiddleware, limiter], editUser);
router.put('/billing', [authMiddleware], editUserBilling);
router.put('/permissions', [authMiddleware], changePermissions);
router.delete('/delete', [authMiddleware], deleteUser);
module.exports = router;