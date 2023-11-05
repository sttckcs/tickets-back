const express = require('express');
const app = express();
const server = require('http').createServer(app)
const { Server } = require('socket.io')
const cookieParser = require('cookie-parser');
const cors = require('cors');
const { connectDB } = require('./src/utils/db');
const userRouter = require('./src/api/routes/User.routes');
const ticketRouter = require('./src/api/routes/Ticket.routes');
const cron = require('./src/utils/cron.js');
require('dotenv').config();

const io = new Server(server, {
  cors: { origin: 'http://localhost:5173' }
});
const port = process.env.PORT || 3030;

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Method', 'POST, GET, DELETE, PUT, PATCH');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Origin, Accept');
  res.header('Access-Control-Allow-Origin', 'http://localhost:5173');
  next();
})

app.use(express.json({limit: '5mb'}));
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(cors({ credentials: true, origin: 'http://localhost:5173' }));

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
app.get("/", (req, res) => { res.send("Tickets CSGO Backend") });

app.use('*', (req, res) => res.status(404).json('Error 404, route not found'));

app.use((error, res) => {
  return res.status( error.status || 500 ).json("Error: " + error.message || "Unexpected error");
})

server.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});

cron();