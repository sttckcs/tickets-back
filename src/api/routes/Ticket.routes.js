const express = require('express')
const router = express.Router()
const authMiddleware = require('../../middlewares/auth')
const { getAllTickets, getUserTickets, addTicket, getTicketById, markTicket, toggleNotis, closeTicket, addTicketMessage, uploadImage, upload, getTicketMessages, ticketOwnerAndStatus, deleteTicket, editTicketMessage, deleteTicketMessage } = require('../controllers/Ticket.controller')

router.post('/all', [authMiddleware], getAllTickets);
router.post('/id', [authMiddleware], getTicketById);
router.post('/user', [authMiddleware], getUserTickets);
router.post('/add', [authMiddleware], addTicket);
router.post('/mark', [authMiddleware], markTicket);
router.post('/close', [authMiddleware], closeTicket);
router.post('/notify', [authMiddleware], toggleNotis);
router.post('/messages', [authMiddleware], getTicketMessages);
router.post('/newmessage', [authMiddleware], addTicketMessage);
router.post('/image', [authMiddleware], upload.single('image'), uploadImage);
router.post('/open', [authMiddleware], ticketOwnerAndStatus);
router.post('/delete', [authMiddleware], deleteTicket);
router.post('/editmessage', [authMiddleware], editTicketMessage);
router.post('/deletemessage', [authMiddleware], deleteTicketMessage);

module.exports = router;