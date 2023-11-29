const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const BillSchema = new Schema({
  usuario: { type: Schema.Types.ObjectId, ref: "User" },
  numero: { type: String, required: true },
  fecha: { type: String, required: true },
  totalImporte: { type: String, required: true },
  pdf: { type: String, required: true},
},{
  timestamps: true
});

const Bill = mongoose.model('Bill', BillSchema);

module.exports = Bill;
