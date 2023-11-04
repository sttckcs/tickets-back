const cron = require('node-cron');

function CronFunction() {

  cron.schedule('*/10 * * * * *', () => {
    console.log("funcion cron");
  }); 
}

module.exports = CronFunction;