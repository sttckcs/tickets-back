const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User.model');
const Bill = require('../models/Bill.model');
const nodemailer = require('nodemailer');
const axios = require('axios');
const FormData = require('form-data');
const { validationEmail, validationPassword } = require('../../validators/validation')

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

const register = async (req, res) => {
  try {
    const { nick, steam, phone, email, password } = req.body;

    // Check if the email and password have valid formats or already exist
    if (await User.findOne({ nick: nick })) {
      console.log({ code: 403, message: "El nick ya existe" })
      res.status(403).send({ code: 403, message: "Ese nick ya existe" });
      return;
    }
    if (await User.findOne({ email: email })) {
      console.log({ code: 403, message: "El correo ya existe" })
      res.status(403).send({ code: 403, message: "El correo ya existe" });
      return;
    }
    if (!validationEmail(email)) {
      console.log({ code: 403, message: "El correo no es válido" })
      res.status(403).send({ code: 403, message: "El correo no es válido" });
      return;
    }
    const passVal = validationPassword(password);
    if (passVal !== 'Valid') {
        console.log({ code: 403, message: passVal })
        res.status(403).send({ code: 403, message: passVal });
        return;
    }

    // Hash the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create a new user
    const newUser = new User({
      nick,
      steam,
      phone,
      email,
      password: hashedPassword,
    });

    // Save the user to the database
    const createUser = await newUser.save();
    createUser.password = null;
    const token = hashedPassword.replace(/[/.]/g,'')
    sendVerifyEmail(email, nick, token);
    return res.status(201).json(createUser);
  } catch (error) {
    return res.status(500).json(error);
  }
}

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check if the user exists
    const user = await User.findOne({ email }).populate('tickets').populate('chats').populate('facturas');
    if (!user) {
      return res.status(401).json({ message: 'Correo o contraseña incorrectas' });
    }

    // Compare passwords
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Correo o contraseña incorrectas' });
    }

    if (!user.verified) {
      return res.status(401).json({ message: 'La cuenta no está verificada' });
    }

    // Create and sign a JWT token
    const token = jwt.sign({ userId: user._id }, process.env.JWT_KEY);

    // Set the token as a cookie
    res.cookie('token', token, {
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000 // 1 day
    });

    return res.json({ user });
  } catch (error) {
    return res.status(500).json(error);
  }
}
const getCurrentUser = async (req, res) => {
  try {
    const userId = req.user.userId;
    const user = await User.findById(userId).select('-password').populate('tickets').populate('chats').populate('facturas');
    res.status(200).json(user);
  } catch (error) {
    res.status(500).json(error);
  }
};

const editUser = async (req, res) => {
  try {
    const { newUser, _id } = req.body;
    const user = await User.findById(_id);
    let userDb = await User.findByIdAndUpdate(_id, newUser);
    userDb = await User.findByIdAndUpdate(_id, { password: user.password })
    userDb.password = null;
    res.status(200).json(userDb);
  } catch (error) {
    res.status(500).json(error);
  }
};

const editUserBilling = async (req, res) => {
  try {
    const { newUser, _id } = req.body;
    const user = await User.findById(_id);
    const url = process.env.BASE_SERVER_USERS_URL + (user.idNeverlate === 0 ? 'addBasic' : 'updateUser');
    const data = new FormData();
    let errorCode = 0;

    data.append("clientId", process.env.TOKEN);
    data.append("email", newUser.email);
    data.append("nombre", newUser.name);
    data.append("apellidos", newUser.apellidos);
    data.append("dni", newUser.nif);
    data.append("direccion", newUser.direccionFacturacion);
    data.append("codigoPostal", newUser.codigoPostalFacturacion);
    // data.append("poblacion", newUser.poblacionFacturacion);
    // data.append("provincia", newUser.provinciaFacturacion);
    data.append("pais", newUser.paisFacturacion);

    try {
      const res = await axios.post(url, data, { headers: { ...data.getHeaders() } });
      errorCode = res.data.errorCode;
      newUser.idNeverlate = res.data.return.id;
    } catch (error) {
      console.error('Error:', error);
      res.status(error.errorCode).json(error);
    }

    let userDb = await User.findByIdAndUpdate(_id, newUser);
    userDb = await User.findByIdAndUpdate(_id, { password: user.password })
    userDb.password = null;
    if (errorCode !== 200) return res.status(500).json(error);
    else return res.status(200).json(userDb);
  } catch (error) {
    console.log('error', error);
    res.status(500).json(error);
  }
};

const verifyUser = async (req, res) => {
  try {
    const { token, nick } = req.body;
    let user = await User.findOne({ nick: nick })
    const verifyPassword = user.password.replace(/[/.]/g,'')
    if (verifyPassword === token && !user.verified) {
      user = await User.updateOne({ _id: user._id }, { $set: { verified: true } })
      return res.status(200).json('verified');
    }
    else return res.status(500).send('Error verificando el usuario: Token inválido o usuario ya verificado');
  } catch (error) {
    return res.status(500).json(error);
  }
};

const recoverPassword = async (req, res) => {
  try {
    const { token, nick } = req.body;
    let user = await User.findOne({ nick: nick })
    const verifyPassword = user.password.replace(/[/.]/g,'')
    if (verifyPassword === token && user.verified) {
      return res.status(200).json('confirmed');
    }
    else return res.status(500).send('Error intentando recuperar la contraseña');
  } catch (error) {
    return res.status(500).json(error);
  }
};

const changePassword = async (req, res, next) => {
  try {
    const { nick, password } = req.body;
    let user = await User.findOne({ nick: nick })
    const passVal = validationPassword(password);
    if (passVal !== 'Valid') {
      console.log({ code: 403, message: passVal })
      res.status(403).send({ code: 403, message: passVal });
      return next();
  }
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    user = await User.updateOne({ _id: user._id }, { $set: { password: hashedPassword } })
    return res.status(200).send('password changed');
  } catch (error) {
    return res.status(500).json(error);
  }
};

const getUserById = async (req, res) => {
  try {
    const {id} = req.body
    const user = await User.findById(id).select('-password').populate('tickets').populate('chats').populate('facturas');
    res.status(200).json(user);
  } catch (error) {
    res.status(500).json(error);
  }
};

const getAllUserEmails = async (req, res) => {
  try {
    const emails = (await User.find({}, { email: 1, _id: false })).map(function(u) { return u.email })
    res.status(200).json(emails);
  } catch (error) {
    res.status(500).json(error);
  }
};

const sendEmail = async (req, res) => {
  try {
    const { emails, subject, message } = req.body;
    const mailOptions = {
      from: 'Todoskins <skinsdream@todoskins.com>',
      bcc: emails,
      subject: subject,
      text: message,
      html: `<div>${message}</div>`,
    }
    
    transporter.sendMail(mailOptions, (error, info) => {
      if (error){
        console.log(error);
        res.status(500).send('Error enviando los correos. Comprueba los logs');
      } else {
        console.log('Message sent: ' + info.response);
        res.status(200);
     };
     return res.end();
   });
  } catch (error) {
      console.error('Error enviando los correos:', error);
      res.status(500).send('Error enviando los correos. Comprueba los logs');
  }
};

const sendRecoveryEmail = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email: email })
    const nick = user.nick;
    const token = user.password.replace(/[/.]/g,'')

    const mailOptions = { 
      from: 'Todoskins <skinsdream@todoskins.com>',
      to: email,
      subject: 'Recupera tu cuenta',
      text: `${nick}`,
      html: `<div><h2>Hola! Recupera tu cuenta haciendo click aquí:</h2><a href='https://todoskins.com/recover/${nick}/${token}'>Recupera tu cuenta aquí</a></div>`,
    }
    
    transporter.sendMail(mailOptions, (error, info) => {
      if (error){
        console.log(error);
        res.status(500).send('Error enviando los correos. Comprueba los logs');
      } else {
        console.log('Message sent: ' + info.response);
        res.status(200);
     };
     return res.end();
   });
  } catch (error) {
      console.error('Error sending emails:', error);
      res.status(500).send('Error enviando los correos. Comprueba los logs');
  }
};

const sendVerifyEmail = async (email, nick, token, res) => {
  console.log('send email');
  try {
    const mailOptions = {
      from: 'Todoskins <skinsdream@todoskins.com>',
      to: email,
      subject: 'Verifica tu cuenta',
      text: `${nick}`,
      html: `<div><h2>Hola! Verifica tu cuenta haciendo click aquí:</h2><a href='http://todoskins.com/verify/${nick}/${token}'>Verifica tu cuenta aquí</a></div>`,
    }
    
    transporter.sendMail(mailOptions, (error, info) => {
      if (error){
        console.log('send email error');
        console.log(error);
        res.status(500).send('Error enviando los correos. Comprueba los logs');
      } else {
        console.log('send email ok');
        console.log('Message sent: ' + info.response);
        res.status(200);
     };
     return res.end();
   });
  } catch (error) {
      console.error('Error sending emails:', error);
      res.status(500).send('Error enviando los correos. Comprueba los logs');
  }
};

const logout = async (req, res) => {
  // Clear the token cookie
  res.clearCookie('token');
  res.json({ message: 'Se ha cerrado sesión' });
}

module.exports = { register, login, getCurrentUser, editUser, editUserBilling, verifyUser, recoverPassword, changePassword, getUserById, getAllUserEmails, sendEmail, sendRecoveryEmail, logout }
