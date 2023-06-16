const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const TicketSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: "User" },
  category: { type: String, required: true },
  description: { type: String, required: true },
  adminLast: { type: Boolean, required: true, default: true },
  notifyUser: { type: Boolean, required: true },
  notifyAdmin: { type: Boolean, required: true, default: false },
  messages: [{name: { type: String, required: false }, msg: { type: String, required: false }, time: { type: String, required: false }}],
  open: {type: Boolean, required: true, default: true},
},{
  timestamps: true
});

const Ticket = mongoose.model('Ticket', TicketSchema);

module.exports = Ticket;
