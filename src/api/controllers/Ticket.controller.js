const Ticket = require('../models/Ticket.model');
const User = require('../models/User.model');
const nodemailer = require('nodemailer');
const cloudinary = require('cloudinary').v2;
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');
const he = require('he');

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
      const token = req.cookies.token;
      const decodedToken = jwt.verify(token, process.env.JWT_KEY);
      const userAdmin = await User.findById(decodedToken.userId);
      if (!userAdmin || !userAdmin.admin ) return res.status(401).json({ code: 401, message: 'No estás autorizado' });
      const allTickets = (await Ticket.find().populate('user', '-password')).reverse();
      return res.status(200).json(allTickets);
  } catch (error) {
      console.log('error', error);
      return res.status(500).json(error);
  }
}

const getUserTickets = async (req, res) => {
  try {
      const { id } = req.body;
      const userTickets = await Ticket.findById(id);
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
      console.log('imageUrl', imageUrl);
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
      const { user, category, notify } = req.body;
      const validCategories = ['buff', 'buy', 'sell'];
      let owner = await User.findById(user).populate('tickets');
      const ticketMessages = {
        'buff' : `Buenas ${owner.nick}, soy Aregodas. En este apartado tendrás acceso a poder comprar o vender saldo en buff.163. 
        IMPORTANTE RECORDAR QUE EN LAS TRANSACCIONES DE SALDO, HASTA QUE NO LLEGAN LOS PAGOS NO SE PUEDE ENTREGAR EL BALANCE 
        Venta mínima de al menos 100 euros.
        Para COMPRAR saldo se puede hacer de dos formas. 
        1- Tendrás que listar un arma a la cantidad que te gustaría recibir, una vez lo hagas vas dentro de buff.163 a “sell” y arriba a la derecha te sale el icono de una tienda y te pone “my store”, entras ahí dentro y eso es lo que tienes a la venta, necesito que me pases ese link, y te digo cuanto te cobro por venderte esa cantidad de balance, una vez realizada la transacción , a los 8 días contáctame y enviame tradeback de la skin que usamos para proceder a la transacción del saldo, ya que esa skin solo es un intermediario. 
        2- Los cupones. Puedo enviarte las cantidades de 1000RMB (por 140 EUR) o 2000RMB ( por 280EUR) directamente a tu cuenta, recuerda que vienen predefinidas, no son customizables que te llegan íntegras con las comisiones ya incluidas.
        Para este proceso, lo único que necesito es que me pases tu nombre de usuario en buff.163, el cupón puedes introducirlo dentro del apartado de ''benefit'' y se te agregaría el saldo al instante.
        Los métodos de pago que aceptamos son TRANSFERENCIA BANCARIA Y CRYPTO.`,
        'sell' : `¡Hola! Estoy aquí para ayudarte con tus skins de Counter-Strike de manera segura.
        Comparte los detalles de tu venta aquí mismo y te responderé pronto, PARA REVISAR LOS PRECIOS Y ESTADOS DE LAS SKINS QUE VAYAS A QUERER VENDER, NECESITO QUE ME ENVIES EL LINK A TU PERFIL DE STEAM PARA PODER OFRECERTE UNA TASACIÓN, ¡recuerda que compraremos tus skins siempre que superen en su total los 100 EUR de valor! 
        Podemos pagarte por: Transferencia bancaria instantánea , PayPal y crypto. Recordar que pueden haber comisiones en los envíos al extranjero.
        Encuéntrame en Steam: https://steamcommunity.com/id/Aregodas. Recuerda: no tengo segundas cuentas ni asistentes; si alguien más contacta, avísanos para evitar estafas. Además, asegúrate de revisar el FAQ de la pagina. ¡Gracias!`,
        'buy' : `¡Hola! Soy Aregodas, la persona que se encarga de hacer los trades,  este es mi Steam: https://steamcommunity.com/id/Aregodas 
        Esto es un ticket de compra, y necesito que me indiques lo siguiente;
        -El link a tu perfil de Steam para la entrega del pedido
        -El nombre de la skin que quieres y su estado.
        Los métodos de pago que aceptamos en las compras son TRANSFERENCIA BANCARIA Y CRYPTO, también aceptamos skins como forma de pago.
        ¡¡¡ IMPORTANTE RECORDAR PEDIDO MINIMO DE 100 EUROS !!!`
      }
      if (!validCategories.includes(category)) return res.status(403).send({ code: 403, message: "La categoría del ticket es errónea" });
      if (owner.banned) return res.status(403).send({ code: 403, message: "No estás autorizado" });
      const message = {
        name: 'Aregodas',
        msg: category === 'buff' ? ticketMessages.buff : category === 'buy' ? ticketMessages.buy : ticketMessages.sell,
        time: new Date()
      }
      const newTicket = new Ticket({ user: user, category: category, notifyUser: notify, messages: message });
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
      const createdTicket = await newTicket.save();
      return res.status(200).json(createdTicket);
  } catch (error) {
      return res.status(500).json(error)
  }
}

const getTicketById = async (req, res) => {
  try {
      const { id } = req.body;
      const token = req.cookies.token;
      const decodedToken = jwt.verify(token, process.env.JWT_KEY);
      const userAdmin = await User.findById(decodedToken.userId);

      if (!userAdmin || !userAdmin.admin) return res.status(403).json({ code: 403, message: 'No estás autorizado' });

      const ticket = await Ticket.findById(id).populate('user', '-password');
      return res.status(200).json(ticket);
  } catch (error) {
      return res.status(500).json(error);
  }
}

const closeTicket = async (req, res) => {
  try {
      const { _id, open } = req.body;
      const token = req.cookies.token;
      const decodedToken = jwt.verify(token, process.env.JWT_KEY);
      const userAdmin = await User.findById(decodedToken.userId);

      if (!userAdmin || !userAdmin.admin) return res.status(403).json({ code: 403, message: 'No estás autorizado' });
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

const markTicket = async (req, res) => {
  try {
      const { _id } = req.body;
      const token = req.cookies.token;
      const decodedToken = jwt.verify(token, process.env.JWT_KEY);
      const userAdmin = await User.findById(decodedToken.userId);

      if (!userAdmin || !userAdmin.admin) return res.status(403).json({ code: 403, message: 'No estás autorizado' });
      let ticket = await Ticket.findById(_id);
      if (ticket.marked) {
        ticket = await Ticket.findByIdAndUpdate(_id, { marked: false });
      }
      else {
        ticket = await Ticket.findByIdAndUpdate(_id, { marked: true });
      }
      return res.status(200).json(ticket);
  } catch (error) {
      return res.status(500).json(error);
  }
}

const toggleNotis = async (req, res) => {
  try {
      const { notify, id } = req.body;
      const token = req.cookies.token;
      const decodedToken = jwt.verify(token, process.env.JWT_KEY);
      const user = await User.findById(decodedToken.userId);

      let ticket = await Ticket.findById(id)
      if (user.admin) ticket = await Ticket.updateOne({ _id: ticket._id }, { $set: { notifyAdmin: notify } })
      else ticket = await Ticket.updateOne({ _id: ticket._id }, { $set: { notifyUser: notify } })
      return res.status(200).json('Notificaciones actualizadas')
  } catch (error) {
      return res.status(500).json(error);
  }
}

const addTicketMessage = async (req, res) => {
  try {
    const { id, newMessage } = req.body;
    const { name, msg, room } = newMessage;
    const message = {
      name: name,
      msg: he.escape(msg),
      time: new Date()
    }
    const user = await User.findOne({ nick: name });
    const byAdmin = user.admin;
    if (!user || !user._id.toString() === id) return res.status(403).json({ code: 403, message: 'No estás autorizado' })
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
      const messages = await Ticket.find({ _id: id } , { _id: 0, messages: 1 })
      return res.status(200).json(messages[0])
  } catch (error) {
      return res.status(500).json(error);
  }
}

const deleteTicketMessage = async (req, res) => {
  try {
    const { message, _id } = req.body;
    const token = req.cookies.token;
    const decodedToken = jwt.verify(token, process.env.JWT_KEY);
    const userAdmin = await User.findById(decodedToken.userId);

    if (!userAdmin || !userAdmin.admin) return res.status(403).json({ code: 403, message: 'No estás autorizado' });
    const ticket = await Ticket.findById(_id);
    const clearedMessages = ticket.messages.filter(msg => msg.time !== message[0].time);
    console.log('cleared', clearedMessages);
    const updatedTicket = await Ticket.updateOne({ _id: ticket._id }, { messages: clearedMessages });
    return res.status(200).json(updatedTicket);
    } catch (error) {
        return res.status(500).json({ code: 500, error: error });
    }
}

const editTicketMessage = async (req, res) => {
  try {
    const { message, _id, edit } = req.body;
    const token = req.cookies.token;
    const decodedToken = jwt.verify(token, process.env.JWT_KEY);
    const userAdmin = await User.findById(decodedToken.userId);

    if (!userAdmin || !userAdmin.admin) return res.status(403).json({ code: 403, message: 'No estás autorizado' });
    const ticket = await Ticket.findById(_id);
    const editedMessages = ticket.messages.map(msg => {
      if (msg.time === message[0].time) msg.msg = edit;
      return msg;
    });
    const updatedTicket = await Ticket.updateOne({ _id: ticket._id }, { messages: editedMessages });
    return res.status(200).json(updatedTicket);
    } catch (error) {
      return res.status(500).json({ code: 500, error: error });
    }
}


const ticketOwnerAndStatus = async (req, res) => {
  try {
      const { id } = req.body;
      const ticket = await Ticket.findById(id).populate('user', 'nick');
      return res.status(200).json(ticket)
  } catch (error) {
      return res.status(500).json(error);
  }
}

const deleteTicket = async (req, res) => {
  try {
      const { _id } = req.body;
      const token = req.cookies.token;
      const decodedToken = jwt.verify(token, process.env.JWT_KEY);
      const userAdmin = await User.findById(decodedToken.userId);

      if (!userAdmin || !userAdmin.admin) return res.status(403).json({ code: 403, message: 'No estás autorizado' });
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

module.exports = { getAllTickets, getUserTickets, markTicket, addTicket, getTicketById, uploadImage, upload, toggleNotis, deleteTicketMessage, closeTicket, addTicketMessage, getTicketMessages, ticketOwnerAndStatus, deleteTicket, editTicketMessage }
