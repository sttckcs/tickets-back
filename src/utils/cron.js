const cron = require('node-cron');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
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
      const camposFactura = ['numeroString', 'fecha', 'usuario', 'totalImporte', 'documentos'];

      const currentDate = new Date();
      const year = currentDate.getFullYear();
      const month = String(currentDate.getMonth() + 1).padStart(2, '0'); 
      const day = String(currentDate.getDate()).padStart(2, '0'); 
      const formattedDate = `${year}-${month}-${28}`;
  
      data.append("clientId", process.env.TOKEN);
      data.append("columnas", JSON.stringify({"dateCreated_min":formattedDate}));
  
      const res = await axios.post(url, data, { headers: { ...data.getHeaders() } });
      facturas = res.data.map(factura =>{
        const facturaLimpia = {};

        camposFactura.forEach(campo => {
          if (campo === 'documentos' && factura[campo] !== undefined && factura[campo].length > 0) {
            facturaLimpia[campo] = process.env.BASE_SERVER_URL + factura[campo][0].url;
          } else if (campo === 'usuario' && factura[campo] !== undefined) {
            facturaLimpia[campo] = factura[campo].id;
          } else if (factura[campo] !== undefined) {
            facturaLimpia[campo] = factura[campo];
          }
        });
        return facturaLimpia;
      });
      
      const asignarFacturas = async (facturas) => {
      for (const factura of facturas) {
        const { usuario, documentos, numeroString, fecha, totalImporte } = factura;
        try {
          let user = await User.findOne({ idNeverlate: usuario });
          if (user) {
            const writeFileAsync = promisify(fs.writeFile);
            const url = documentos || '';
            const rutaLocal = path.join(__dirname, 'facturas', String(user.idNeverlate));
            const rutaLocalPdf = `${rutaLocal}/${numeroString}.pdf`;
            if (!fs.existsSync(rutaLocal)) {
              fs.mkdirSync(rutaLocal, { recursive: true });
            }
            const res = await axios.get(url, { responseType: 'arraybuffer' });
            
            await writeFileAsync(rutaLocalPdf, Buffer.from(res.data));

            const nuevaFactura = new Bill({
              usuario: user._id,
              numero: numeroString,
              fecha: fecha,
              totalImporte: totalImporte,
              pdf: rutaLocalPdf,
            });
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