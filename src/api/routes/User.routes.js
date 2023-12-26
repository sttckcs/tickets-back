const express = require('express')
const router = express.Router()
const authMiddleware = require('../../middlewares/auth')
const {register, login, getCurrentUser, getAllAdmins, changePermissions, editUser, getStatistics, editUserBilling, getBillPDF, verifyUser, resendVerifyEmail, verifyAdmin, recoverPassword, changePassword, getUserById, sendEmail, sendRecoveryEmail, logout} = require('../controllers/User.controller')

router.get('/bills/:billId', [authMiddleware], getBillPDF);
router.get('/current', [authMiddleware], getCurrentUser);
router.post('/id', [authMiddleware], getUserById);
router.post('/verify', verifyUser);
router.post('/admins', [authMiddleware], getAllAdmins);
router.post('/recover', recoverPassword);
router.post('/password', changePassword);
router.post('/email', [authMiddleware], sendEmail);
router.post('/stats', [authMiddleware], getStatistics);
router.post('/recovery', sendRecoveryEmail);
router.post('/sendverify', resendVerifyEmail);
router.post('/register', register);
router.post('/login', login);
router.post('/logout', logout);
router.put('/verifyAdmin', [authMiddleware], verifyAdmin);
router.put('/edit', [authMiddleware], editUser);
router.put('/billing', [authMiddleware], editUserBilling);
router.put('/permissions', [authMiddleware], changePermissions);

module.exports = router;