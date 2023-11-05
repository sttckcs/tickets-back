const cron = require('node-cron');
const axios = require('axios');
const FormData = require('form-data');
const User = require('../api/models/User.model');
const Bill = require('../api/models/Bill.model');

const CronFunction = async () => {
  cron.schedule('0 23 * * *', async () => {
    try {
      console.log('ejecutando cron');
      const url = process.env.BASE_SERVER_BILLS_URL + 'getListPaginas';
      const data = new FormData();    
      let facturas = [];
      const camposFactura = ['numeroString', 'fecha', 'receptorCif', 'totalImporte', 'documentoPdf'];

      const currentDate = new Date();
      const year = currentDate.getFullYear();
      const month = String(currentDate.getMonth() + 1).padStart(2, '0'); 
      const day = String(currentDate.getDate()).padStart(2, '0'); 
      const formattedDate = `${year}-${month}-${day}`;
  
      data.append("clientId", process.env.TOKEN);
      data.append("columnas", JSON.stringify({"dateCreated_min":formattedDate}));
  
      const res = await axios.post(url, data, { headers: { ...data.getHeaders() } });
      facturas = res.data.map(factura =>{
        const facturaLimpia = {};

        camposFactura.forEach(campo => {
          if (campo === 'documentoPdf' && factura[campo] !== undefined) {
            facturaLimpia[campo] = 'https://center.neverlate.es/' + factura[campo].url;
          } else if (factura[campo] !== undefined) {
            facturaLimpia[campo] = factura[campo];
          }
        });

        return facturaLimpia;
      });

      console.log('facturas', facturas);
      
      const asignarFacturas = async (facturas) => {
      for (const factura of facturas) {
          try {
            let user = await User.findOne({ nif: factura.receptorCif });
            if (user) {
              const nuevaFactura = new Bill({
                usuario: user._id,
                numero: factura.numeroString,
                fecha: factura.fecha,
                totalImporte: factura.totalImporte,
                ruta: factura.documentoPdf
              })
              user = await User.updateOne({ _id: user.id }, { $push: {facturas: nuevaFactura._id } });
              await nuevaFactura.save();
            } else {
              console.log('no se ha encontado el usuario de la factura');
              return;
            }
          } catch (error) {
            console.log('error asignando facturas', error);
            return;
          }
        }
      }

      asignarFacturas(facturas);

    } catch (error) {
      console.log('error en el cron', error);
      return;
    }
  }); 
}

module.exports = CronFunction;