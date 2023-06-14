const express = require('express')
const router = express.Router()
const authMiddleware = require('../../middlewares/auth')
const { getAllTickets, getUserTickets, addTicket, toggleNotis, closeTicket, addTicketMessage, getTicketMessages, ticketOwnerAndStatus, deleteTicket } = require('../controllers/Ticket.controller')

router.get('/all', [authMiddleware], getAllTickets);
router.get('/user', [authMiddleware], getUserTickets);
router.post('/add', [authMiddleware], addTicket);
router.post('/close', [authMiddleware], closeTicket);
router.post('/notify', [authMiddleware], toggleNotis);
router.post('/messages', [authMiddleware], getTicketMessages);
router.post('/newmessage', [authMiddleware], addTicketMessage);
router.post('/open', [authMiddleware], ticketOwnerAndStatus);
router.post('/delete', [authMiddleware], deleteTicket);

module.exports = router;