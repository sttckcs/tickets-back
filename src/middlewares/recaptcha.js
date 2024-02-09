// middleware/recaptcha.js

const axios = require('axios');

const verifyRecaptcha = async (req, res, next) => {
  const { captchaToken } = req.body;

  if (!captchaToken) {
    return res.status(401).json({ error: 'Acceso no verificado.' });
  }
  const secretKey = process.env.RECAPTCHA_SECRET;
  const verificationURL = `https://www.google.com/recaptcha/api/siteverify?secret=${secretKey}&response=${captchaToken}`;

  try {
    const response = await axios.post(verificationURL);
    const { success } = response.data;

    if (!success) {
      return res.status(401).json({ error: 'Verificación fallida.' });
    }

    next();
  } catch (error) {
    console.error('Error de verificación:', error);
    return res.status(500).json({ error: 'Error de servidor' });
  }
};

module.exports = verifyRecaptcha;
