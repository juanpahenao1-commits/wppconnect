import './examples/basic/basic';
const express = require('express');
const wppconnect = require('@wppconnect-team/wppconnect');

const app = express();
let qrCodeBase64 = '';

app.get('/', (req, res) => {
  if (qrCodeBase64) {
    res.send(`<img src="${qrCodeBase64}" style="width:300px"/>`);
  } else {
    res.send('Esperando QR...');
  }
});

wppconnect
  .create({
    session: 'default',
    headless: true,
    useChrome: false,
    browserArgs: ['--no-sandbox', '--disable-setuid-sandbox'],
    catchQR: (base64Qr) => {
      qrCodeBase64 = base64Qr;
      console.log('QR capturado');
    },
    statusFind: (statusSession) => {
      console.log('Estado de sesión:', statusSession);
    }
  })
  .then((client) => {
    console.log('Bot iniciado');
  });

app.listen(process.env.PORT || 3000, () => {
  console.log('Servidor web activo');
});
