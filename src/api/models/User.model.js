const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const UserSchema = new Schema({
  nick: { type: String, required: true, unique: true },
  idNeverlate: { type: Number, unique: true, default: 0 },
  apellidos: { type: String, default: "" },
  nif: { type: String, unique: true, default: "" },
  empresa: { type: Boolean, default: false },
  direccionFacturacion: { type: String, default: "" },
  codigoPostalFacturacion: { type: String, default: "" },
  // poblacionFacturacion: { type: String, default: "" },
  // provinciaFacturacion: { type: String, default: "" },
  paisFacturacion: { type: String, default: "" },
  name: { type: String, required: false, default: "" },
  steam: { type: String, required: true },
  verified: { type: Boolean, required: true, default: false },
  banned: { type: Boolean, required: true, default: false },
  phone: { type: String, required: false },
  picture: { type: String, required: true, default: 'https://happytravel.viajes/wp-content/uploads/2020/04/146-1468479_my-profile-icon-blank-profile-picture-circle-hd.png' },  
  admin: { type: Boolean, required: true, default: false },
  description: { type: String, required: false },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  tickets: [{type: Schema.Types.ObjectId, ref: "Ticket"}],
  facturas: [{type: Schema.Types.ObjectId, ref: "Bill"}],
},{
  timestamps: true
});

const User = mongoose.model('User', UserSchema);

module.exports = User;
