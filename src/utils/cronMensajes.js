const cron = require('node-cron');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const FormData = require('form-data');
const User = require('../api/models/User.model');
const Bill = require('../api/models/Bill.model');
const Ticket = require('../api/models/Ticket.model');

const CronFunction = async () => {
  cron.schedule('*/10 * * * *', async () => {
    try {
      console.log('ejecutando cron mensajes');
     // const yday = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const period = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
     // const msg1 = "hola! necesitas algo :) ?";
     // const msg2 = "sigues por aqui? estamos esperando tu respuesta";
     // const msg3 = "debido a la inactividad pronto eliminaremos tu mensaje, si necesitas algo no dudes en contactarnos de nuevo";

      const tickets = await Ticket.find({ open: true, adminLast: true, marked: false });

      const ticketsToUpdate = tickets.reduce(
        (updates, ticket) => {
          const lastMessageTime = new Date(ticket.messages[ticket.messages.length - 1].time);
          // const lastMessage = ticket.messages[ticket.messages.length - 1].msg;
    
          // if (lastMessageTime < yday) {
            // if (lastMessage !== msg1 && lastMessage !== msg2) {
              // updates.push({ _id: ticket._id, message: msg1 });
            // } else if (lastMessage === msg1) {
              // updates.push({ _id: ticket._id, message: msg2 });
            // } else if (lastMessage === msg2) {
              // updates.push({ _id: ticket._id, message: msg3 });
            // }
          // } else if (lastMessageTime < week && lastMessage === msg3) {
            // updates.push({_id: ticket._id, removeTicket: true });
          // }
	  if (lastMessageTime < period) updates.push({ _id: ticket._id, removeTicket: true });
          return updates;
      },[]);

      const updatePromises = ticketsToUpdate.map(async ({ _id, message, removeTicket }) => {
        if (message) {
          await Ticket.updateOne({ _id }, { $push: { messages: { name: "Aregodas", msg: message, time: new Date() } } });
        } else if (removeTicket) {
          await Ticket.findByIdAndDelete(_id);
        }
      });
      
      await Promise.all(updatePromises);

      console.log('cron mensajes ejecutado con exito');
    } catch (error) {
      console.log('error en el cron mensajes', error);
      return;
    }
  }); 
}

module.exports = CronFunction;