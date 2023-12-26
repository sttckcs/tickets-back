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
        'buff' : `Buenas ${owner.nick}, soy Aregodas. En este apartado tendrás acceso a poder comprar o vender saldo en buff.163
        Para COMPRAR saldo se puede hacer de dos formas.
        1- Tendrás que listar un arma a la cantidad que te gustaria recibir, una vez lo hagas vas dentro de buff.163 a “sell” y arriba a la derecha te sale el icono de una tienda y te pone “my store”, entras ahí dentro y eso es lo que tu tienes a la venta, necesito que me pases ese link. Así yo veo que es lo que quieres vender, y te digo cuanto te cobro por venderte esa cantidad de balance, una vez realizada la transacción , a los 8 dias contactame y enviame tradeback de la skin que usamos para proceder a la transacción del saldo, ya que esa skin solo es un intermediario y te la voy a regresar.
        2- Los cupones.
        Puedo enviarte las cantidades de 1000 o 2000 yuanes (vienen predefinidas no son customizables) que te llegan integras con las comisiones ya incluidas.
        Para este proceso, lo único que necesito es que me pases tu nombre de usuario, y con tu nombre te emitiré un cupón que puedes introducirlo dentro del apartado de ''benefit'' y se te agregaria el saldo al instante.
        los cupones són limitados, así que solo se emitirán en cantidades concretas
        En caso de que el cliente no tenga ningún artículo para listar y proceder a la transacción, puedo solicitar por soporte el abono manual de la cuantía, este proceso suele tardar 2 días desde la emisión de la solicitud, y buff.163 se reserva el derecho a rechazar la solicitud ( no ha ocurrido todavia, pero lo dejan abierto a que pueda suceder)
        -En caso de que quieras VENDER saldo, tienes que indicarme la cantidad que quieres vender, y te informaré de cuanto te podría pagar por ese balance, el proceso és el mismo que en las compras, por lo que tengo que listar a vender una skin para que me la compres, y a los 8 días me la tienes que regresar.`,
        'sell' : `Buenas ${owner.nick}, soy Aregodas, la persona que se encarga de hacer los trades, este ticket es un espacio seguro donde solo tenemos acceso nosotros dos, y los admins que entran a ayudar en cualquier tipo de duda que pueda haber hasta que atienda el ticket, así que a la hora de compartir cualquier dato para proceder a los pagos, puedes estar tranquilo que tu información no se verá comprometida. Atenderé tu petición lo antes posible.
        Este es mi steam: https://steamcommunity.com/id/Aregodas (no tengo segundas cuentas , ni hay gente que me ayude con los trades, si alguien te contacta va a querer scamearte, si esto ocurre porfavor haznos llegar la información de esa persona a mi o a los moderadores para banearla y asi evitar scams)
        En este ticket podrás vender tus skins, para ello voy a necesitar que hagas lo siguiente:
        1- En este mismo ticket dime que vas a querer vender, el nombre de la skin junto a su estado y en caso de que sea StaTrack debes indicarmelo. O si quieres vender todo el inventario también puedes pedirmelo y te doy precio por todo.
        2- En caso de que tu alias o nombre en la plataforma sea distinto a tu nombre de steam, tendrás que indicarme en el ticket tu nombre en steam para poder relacionarte y  acceder a tu inventario
        3- Es muy importante que a la hora de cerrar un comercio, te asegures en la confirmación del móvil que me estas enviando a mi las skins y no a otra persona, los datos que deben coincidir en la confirmación son: mi nivel de steam (348) y la fecha en la que mi cuenta se registró en steam ( 8/08/2016 )
        Recuerda haber leído el FAQ de tradeo o tu ticket puede ser eliminado`,
        'buy' : `Buenas ${owner.nick}, soy Aregodas, la persona que se encarga de hacer los trades, este ticket es un espacio seguro donde solo tenemos acceso nosotros dos y los Admins que entran a ayudar en cualquier tipo de duda que pueda haber hasta que atienda el ticket.
        Así que a la hora de compartir cualquier dato para proceder a los pagos, puedes estar tranquilo que tu información no se verá comprometida. Atenderé tu petición lo antes posible.
        Este es mi steam: https://steamcommunity.com/id/Aregodas
        (No tengo segundas cuentas ni hay gente que me ayude con los trades, si alguien te contacta va a querer scamearte, si esto ocurre porfavor haznos llegar la información de esa persona a mi o a los moderadores para banearla y asi evitar scams)
        
        • En este ticket tendrás acceso a comprar skins.
        Para comprar skins tienes que hacer lo siguiente:
        
        ➣ Indicar el nombre de la skin que quieres; Su estado y con o sin StatTrack. (en caso de querer una fase especifica como en los doppler, o un % de fade. Deberás indicarlo)
        
        Puedes pagarme la skin por transferencia bancaria. Acepto skins como forma de pago. Una vez me hayas hecho el pago de tu pedido (o enviado la skin que has usado como método de pago)
        En caso de no tenerla en mi inventario, procederia a comprarla de buff.163, por lo que desde el momento en que la compro y me la envian, no podré enviartela hasta dentro de los siguientes 8 dias ya que tiene una restricción de steam (tradeban),
        por lo que en este caso, el ticket se quedaria abierto en espera de que se cumplan esos 8 dias de restricción hasta que pueda enviarte la skin. Una vez el item esté libre y se pueda tradear, taggeame @Aregodas en el ticket y enviame la oferta de intercambio.`
      }
      if (!validCategories.includes(category)) return res.status(403).send({ code: 403, message: "La categoría del ticket es errónea" });
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
      const ticket = await Ticket.findById(id).populate('user', 'nick')
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
