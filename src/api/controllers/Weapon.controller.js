const Weapon = require('../models/Weapon.model');
const User = require('../models/User.model');

const getInventory = async (req, res) => {
    try {
        const inventory = await Weapon.find().populate();
        res.status(200).json(inventory);
    } catch (error) {
        res.status(500).json(error);
    }
}

const editPrice = async (req, res) => {
    try {
        const { assetId, newPrice } = req.body;
        if (!assetId || !newPrice) return res.status(400).json({ message: 'Faltan datos' });

        const userAdmin = await User.findById(req.user.userId);

        if (!userAdmin || !userAdmin.admin ) return res.status(401).json({ code: 401, message: 'No estás autorizado' });
        
        const weapon = await Weapon.findOneAndUpdate({ assetId }, { pricePlusPercentege: newPrice }, { new: true });

        if (!weapon) {
            return res.status(404).json({ message: "No se encontró el arma con el assetId proporcionado." });
        }

        res.status(200).json(weapon);
    } catch (error) {
        res.status(500).json(error);
    }
}

const getItem = async (req, res) => {
    try {
        const { assetId } = req.params;
        const weapon = await Weapon.findOne({ assetId });
        
        if (!weapon) {
            return res.status(404).json({ message: "No se encontró el arma con el assetId proporcionado." });
        }

        res.status(200).json(weapon);
    } catch (error) {
        res.status(500).json(error);
    }
}

module.exports = { getInventory, editPrice, getItem }
