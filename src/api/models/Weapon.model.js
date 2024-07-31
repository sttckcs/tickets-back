const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const WeaponSchema = new Schema({
  assetId: { type: Number, unique: true, required: true },
  marketName: { type: String, required: true },
  wearName: { type: String, required: true },
  actionLink: { type: String, required: true },
  float: { type: Number, required: true },
  price: { type: Number, required: false },
  pricePlusPercentege: { type: Number, required: true },
  fade: {type: Number, required: false },
  previewUrl: { type: String, required: true },
  imageUrl: { type: String, required: false },
  paintSeed: { type: String, required: true },
  paintIndex: { type: Number, required: true },
},{
  timestamps: true
});

const Weapon = mongoose.model('Weapon', WeaponSchema);

module.exports = Weapon;
