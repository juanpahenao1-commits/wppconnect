const express = require('express');
const wppconnect = require('@wppconnect-team/wppconnect');

const app = express();
app.use(express.json());

let qrCodeBase64 = '';
let currentStatus = 'inicializando';
let clientInstance = null;
let receivedMessages = [];

app.get('/', (req, res) => {
  if (qrCodeBase64) {
    res.send(`
      <html>
        <body style="text-align:center; font-family:sans-serif;">
          <h2>Escanea el QR para vincular WhatsApp</h2>
          <img src="${qrCodeBase64}" style="width:300px"/>
          <p>Estado actual: ${currentStatus}</p>
        </body>
      </html>
    `);
  } else {
    res.send(`<h2>Esperando QR...</h2><p>Estado actual: ${currentStatus}</p>`);
  }
});

app.get('/status', (req, res) => {
  res.json({ status: currentStatus });
});

app.get('/messages', (req, res) => {
  res.json(receivedMessages);
});

app.post('/send', async (req, res) => {
  const { to, message } = req.body;
  if (!clientInstance) return res.status(503).json({ error: 'Cliente no inicializado' });

  try {
    const result = await clientInstance.sendText(to, message);
    res.json({ success: true, result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/restart', async (req, res) => {
  try {
    if (clientInstance) await clientInstance.close();
    await iniciarBot();
    res.json({ success: true, message: 'Sesión reiniciada' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

function iniciarBot() {
  return wppconnect
    .create({
      session: 'default',
      headless: true,
      useChrome: false,
      browserArgs: ['--no-sandbox', '--disable-setuid-sandbox'],
      autoClose: 0,
      catchQR: (base64Qr) => {
        qrCodeBase64 = base64Qr;
        console.log('QR capturado');
      },
      statusFind: (statusSession) => {
        currentStatus = statusSession;
        console.log('Estado de sesión:', statusSession);
      }
    })
    .then((client) => {
      clientInstance = client;
      console.log('Bot iniciado');

      client.onMessage((message) => {
        receivedMessages.push({
          from: message.from,
          body: message.body,
          timestamp: new Date().toISOString()
        });

        if (message.body === 'hi' && !message.isGroupMsg) {
          client.sendText(message.from, '¡Hola! Bienvenido a WPPConnect.');
        }
      });
    })
    .catch((error) => {
      console.error('Error al iniciar el bot:', error);
    });
}

iniciarBot();

app.listen(process.env.PORT || 3000, () => {
  console.log('Servidor web activo');
});
