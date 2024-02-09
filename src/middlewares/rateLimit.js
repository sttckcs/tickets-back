const rateLimit = require("express-rate-limit");

const limiter = rateLimit({
  windowMs: 60 * 1000 * 5,
  max: 10,
  message: "Has hecho demasiadas peticiones",
  validate: {
    trustProxy: false
  }
});

module.exports = limiter;
