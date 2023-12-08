const express = require('express')
const router = express.Router()
const authMiddleware = require('../../middlewares/auth')
const { getAllTickets, getUserTickets, addTicket, toggleNotis, closeTicket, addTicketMessage, uploadImage, upload, getTicketMessages, ticketOwnerAndStatus, deleteTicket } = require('../controllers/Ticket.controller')

router.post('/user', [authMiddleware], getUserTickets);
router.post('/all', [authMiddleware], getAllTickets);
router.post('/add', [authMiddleware], addTicket);
router.post('/close', [authMiddleware], closeTicket);
router.post('/notify', [authMiddleware], toggleNotis);
router.post('/messages', [authMiddleware], getTicketMessages);
router.post('/newmessage', [authMiddleware], addTicketMessage);
router.post('/image', [authMiddleware], upload.single('image'), uploadImage);
router.post('/open', [authMiddleware], ticketOwnerAndStatus);
router.post('/delete', [authMiddleware], deleteTicket);

module.exports = router;