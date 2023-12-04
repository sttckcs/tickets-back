const Ticket = require('../models/Ticket.model');
const User = require('../models/User.model');
const nodemailer = require('nodemailer');
const cloudinary = require('cloudinary').v2;
const multer = require('multer');
const fs = require('fs');
const path = require('path');

cloudinary.config({ 
  cloud_name: process.env.CLOUDINARY_NAME,
  api_key: process.env.CLOUDINARY_KEY, 
  api_secret: process.env.CLOUDINARY_SECRET
});

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, './uploads'); 
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname);
  }
});

const upload = multer({ storage: storage });

const getAllTickets = async (req, res) => {
  try {
      const allTickets = (await Ticket.find().populate('user')).reverse();
      const openTickets = allTickets.filter(ticket => ticket.open)
      return res.status(200).json(openTickets);
  } catch (error) {
      return res.status(500).json(error);
  }
}

const getUserTickets = async (req, res) => {
  try {
      const userTickets = await Ticket.findById(req.body.id);
      return res.status(200).json(userTickets);
  } catch (error) {
      return res.status(500).json(error);
  }
}

  const uploadImage = async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ code: 400, message: 'No se ha seleccionado imagen' });
      }
      const result = await cloudinary.uploader.upload(req.file.path, {
        folder: 'chat_images'
      });
  
      const imageUrl = result.secure_url;

      clearUploadsFolder();

      res.status(200).json({ imageUrl });
    } catch (error) {
      console.error(error);
      res.status(500).json({ code: 500, message: 'Error de servidor' });
    }
  };

  const clearUploadsFolder = () => {
    const directory = './uploads';
  
    fs.readdir(directory, (err, files) => {
      if (err) throw err;
  
      for (const file of files) {
        fs.unlink(path.join(directory, file), err => {
          if (err) throw err;
        });
      }
    });
  };

const addTicket = async (req, res, next) => {
  try {
      const { user, description, category, notify } = req.body;
      let owner = await User.findById(user).populate('tickets');
      const message = {
        name: 'Aregodas',
        msg: description,
        time: new Date()
      }
      const newTicket = new Ticket({ user: user, description: description, category: category, notifyUser: notify, messages: message });
      const sameTicket = owner.tickets.filter(
        ticket => {
          if (ticket.category === category && ticket.open) return true
          return false
        }
      )
      if (sameTicket[0]) {
        res.status(403).send({ code: 403, message: "Ya existe un ticket abierto de la misma categoría" });
        return next();
      }
      owner = await User.updateOne({ _id: owner.id }, { $push: { tickets: newTicket._id } });
      await User.updateMany({ admin: { $eq: true }, chats: { $ne: newTicket._id } }, { $push: { chats: newTicket._id }})
      const createdTicket = await newTicket.save();
      return res.status(200).json(createdTicket);
  } catch (error) {
      return res.status(500).json(error)
  }
}

const closeTicket = async (req, res) => {
  try {
      const { _id, open } = req.body;
      let ticket = await Ticket.findById(_id);
      if (open) {
        ticket = await Ticket.findByIdAndUpdate(_id, {open: false});
      }
      else {
        ticket = await Ticket.findByIdAndUpdate(_id, {open: true});
      }
      return res.status(200).json(ticket);
  } catch (error) {
      return res.status(500).json(error);
  }
}

const toggleNotis = async (req, res) => {
  try {
      const { id, admin, notify } = req.body;
      let ticket = await Ticket.findById(id)
      if (admin) ticket = await Ticket.updateOne({ _id: ticket._id }, { $set: { notifyAdmin: notify } })
      else ticket = await Ticket.updateOne({ _id: ticket._id }, { $set: { notifyUser: notify } })
      return res.status(200).json('Notificaciones actualizadas')
  } catch (error) {
      return res.status(500).json(error);
  }
}

const addTicketMessage = async (req, res) => {
  try {
    const { name, msg, room, byAdmin } = req.body.newMessage
    const message = {
      name: name,
      msg: msg,
      time: new Date()
    }
    await User.updateMany({ admin: { $eq: true }, chats: { $ne: room } }, {$push: { chats: room }})
    const ticket = await Ticket.findById(room);
    const userOwner = await User.findById({ _id: ticket.user })
    if (byAdmin) {
      await Ticket.updateOne({ _id: ticket._id }, { $push: { messages: message } , $set: { adminLast: true } })
    }
    else {
      await Ticket.updateOne({ _id: ticket._id }, { $push: { messages: message } , $set: { adminLast: false } })
    }
    if(!byAdmin && ticket.notifyAdmin || byAdmin && ticket.notifyUser) sendMessageEmail(byAdmin, message, room, userOwner.email)
    return res.status(200).json(ticket)
  } catch (error) {
    return res.status(500).json(error);
  }
}

const getTicketMessages = async (req, res) => {
  try {
      const { id } = req.body;
      const messages = await Ticket.find({ _id: id} , { _id: 0, messages: 1 })
      return res.status(200).json(messages[0])
  } catch (error) {
      return res.status(500).json(error);
  }
}

const ticketOwnerAndStatus = async (req, res) => {
  try {
      const { id } = req.body;
      const ticket = await Ticket.findById(id).populate('user', 'nick')
      return res.status(200).json(ticket)
  } catch (error) {
      return res.status(500).json(error);
  }
}

const deleteTicket = async (req, res) => {
  try {
      const { _id } = req.body;
      const TicketDb = await Ticket.findByIdAndDelete(_id);
      if (!TicketDb) {
          return res.status(404).json({"message": "Ticket no encontrado"});
      }
      const newUser = await User.updateOne({tickets: TicketDb._id}, {$pull: {tickets: TicketDb._id}})
      return res.status(200).json(newUser);
  } catch (error) {
      return res.status(500).json(error)
  }
};

const sendMessageEmail = async (byAdmin, message, ticketid, owneremail) => {
  let emails = {}
  if (!byAdmin) {
    emails = (await User.find({ admin: { $eq: true } }, { email: 1, _id: false })).map(function(u) { return u.email })
  }
  
  else emails = owneremail;

  try {
    let transporter = nodemailer.createTransport({
      pool: true,
      host: process.env.MAIL_HOST,
      port: parseInt(process.env.MAIL_PORT),
      secure: true, // true for 465, false for other ports
      auth: {
        user: process.env.MAIL_USER, // generated ethereal user
        pass: process.env.MAIL_PASS, // generated ethereal password
      },
    });

    const mailOptions = {
      from: 'Todoskins <skinsdream@todoskins.com>',
      bcc: emails,
      subject: `Nuevo mensaje en el ticket ${ticketid.substring(0,8)} de ${message.name}`,
      text: message.msg,
      html: `<div><h3>${message.name} te ha enviado un nuevo mensaje en el ticket ${ticketid.substring(0,8)}</h3><h4>${message.msg}</h4></div>`,
    }
    {}
    transporter.sendMail(mailOptions, (error, info) => {
      if (error){
        console.log(error);
      } else {
        console.log('Correo enviado: ' + info.response);
     };
   });
  } catch (error) {
      console.error('Error enviando el correo:', error);
  }
};

module.exports = { getAllTickets, getUserTickets, addTicket, uploadImage, upload, toggleNotis, closeTicket, addTicketMessage, getTicketMessages, ticketOwnerAndStatus, deleteTicket }
