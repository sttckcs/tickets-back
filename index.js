const express = require('express');
const app = express();
const server = require('http').createServer(app)
const { Server } = require('socket.io')
const cookieParser = require('cookie-parser');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const morgan = require('morgan');
const { connectDB } = require('./src/utils/db');
const userRouter = require('./src/api/routes/User.routes');
const ticketRouter = require('./src/api/routes/Ticket.routes');
const cron = require('./src/utils/cron.js');
const cronMensajes = require('./src/utils/cronMensajes.js');
const limiter = require('./src/middlewares/rateLimit.js');
require('dotenv').config();

const io = new Server(server, {
  cors: { origin: ['https://todoskins.com', 'http://localhost:5173'] }
});
const port = process.env.PORT || 3030;

app.set('trust proxy', true);
morgan.token('body', (req) => {
  const body = { ...req.body };
  if (body.password) body.password = '[FILTERED]';
  if (body.captchaToken) body.captchaToken = '[FILTERED]';
  return JSON.stringify(body);
});
var accessLogStream = fs.createWriteStream(path.join(__dirname, 'access.log'), { flags: 'a' })
app.use(morgan(':date[clf] :method :url :status :res[content-length] - :response-time ms - :remote-addr - Body: :body', { stream: accessLogStream }));

app.use(morgan((tokens, req, res) => {
  return [
    tokens.method(req, res),
    tokens.url(req, res),
    tokens.status(req, res),
    tokens.res(req, res, 'content-length'), '-',
    tokens['response-time'](req, res), 'ms',
    req.headers['x-forwarded-for'] || req.connection.remoteAddress
  ].join(' ');
}, {stream: accessLogStream}));

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Method', 'POST, GET, DELETE, PUT, PATCH');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Origin, Accept');
  res.header('Access-Control-Allow-Origin', ['https://todoskins.com', 'http://localhost:5173']);
  next();
})

app.use(express.json({limit: '5mb'}));
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(cors({ credentials: true, origin: ['https://todoskins.com', 'http://localhost:5173'] }));

connectDB();

app.use('/user', userRouter);
app.use('/ticket', ticketRouter);

io.on('connection', socket => {
  socket.on('userJoin', ({ username, id }) => {
    socket.join(id)
    console.log(`${username} join ${id}`)
  })

  socket.on('newMessage', newMessage => {
    io.to(newMessage.room).emit('newMessage', { name: newMessage.name, msg: newMessage.msg, byAdmin: newMessage.byAdmin, target: newMessage.target })
    console.log(newMessage)
  })

  socket.on('roomLeave', ({ username, id }) => {
    console.log(`${username} leave ${id}`)
    socket.leave(id)
  })
})

// Protected route
app.get("/", (req, res) => { res.send("Todoskins") });

app.use('*', (req, res) => res.status(404).json('Error 404, la ruta no existe'));

app.use((error, res) => {
  return res.status( error.status || 500 ).json("Error: " + error.message || "Error inesperado");
})

server.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});

cron();
cronMensajes();