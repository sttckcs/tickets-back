const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const UserSchema = new Schema({
  nick: { type: String, required: true, unique: true },
  idNeverlate: { type: String, required: true, unique: true },
  razonSocial: { type: String, required: true, unique: true },
  nif: { type: String, required: true, unique: true },
  empresa: { type: Boolean, required: true, default: false },
  direccionFacturacion: { type: String, required: true, unique: true },
  poblacionFacturacion: { type: String, required: true, unique: true },
  codigoPostalFacturacion: { type: String, required: true, unique: true },
  provinciaFacturacion: { type: String, required: true, unique: true },
  paisFacturacion: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  steam: { type: String, required: true },
  verified: { type: Boolean, required: true, default: false },
  phone: { type: String, required: true },
  picture: { type: String, required: true, default: 'https://happytravel.viajes/wp-content/uploads/2020/04/146-1468479_my-profile-icon-blank-profile-picture-circle-hd.png' },  
  admin: { type: Boolean, required: true, default: false },
  description: { type: String, required: false },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  chats: [{type: Schema.Types.ObjectId, ref: "Ticket"}],
  tickets: [{type: Schema.Types.ObjectId, ref: "Ticket"}],
  facturas: [{type: Schema.Types.ObjectId, ref: "Bill"}],
},{
  timestamps: true
});

const User = mongoose.model('User', UserSchema);

module.exports = User;
