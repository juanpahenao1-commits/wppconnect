const express = require('express');
const wppconnect = require('@wppconnect-team/wppconnect');
const path = require('path');

const app = express();
app.use(express.json());

let qrCodeBase64 = '';
let currentStatus = 'inicializando';
let clientInstance = null;
let receivedMessages = [];

app.get('/', (req, res) => {
  res.send(`
    <html>
      <body style="text-align:center; font-family:sans-serif;">
        <h2>Escanea el QR para vincular WhatsApp</h2>
        ${qrCodeBase64 ? `<img src="${qrCodeBase64}" style="width:300px"/>` : '<p>Esperando QR...</p>'}
        <p>Estado actual: ${currentStatus}</p>
      </body>
    </html>
  `);
});

app.get('/status', (req, res) => {
  res.json({ status: currentStatus });
});

app.get('/messages', (req, res) => {
  res.json(receivedMessages);
});

app.post('/send', async (req, res) => {
  const { to, message } = req.body;
  try {
    const result = await clientInstance.sendText(to, message);
    res.json({ success: true, result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/send-image', async (req, res) => {
  const { to, imagePath, caption } = req.body;
  try {
    const result = await clientInstance.sendImage(to, imagePath, caption);
    res.json({ success: true, result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/contacts', async (req, res) => {
  try {
    const contacts = await clientInstance.getAllContacts();
    res.json(contacts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/chats', async (req, res) => {
  try {
    const chats = await clientInstance.getAllChats();
    res.json(chats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/create-group', async (req, res) => {
  const { name, participants } = req.body;
  try {
    const result = await clientInstance.createGroup(name, participants);
    res.json({ success: true, result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/profile-pic/:id', async (req, res) => {
  try {
    const url = await clientInstance.getProfilePicFromServer(req.params.id);
    res.json({ profilePicUrl: url });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/send-file', async (req, res) => {
  const { to, filePath } = req.body;
  try {
    const result = await clientInstance.sendFile(to, filePath);
    res.json({ success: true, result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/send-link', async (req, res) => {
  const { to, url, text } = req.body;
  try {
    const result = await clientInstance.sendLinkPreview(to, url, text);
    res.json({ success: true, result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/send-location', async (req, res) => {
  const { to, lat, long } = req.body;
  try {
    const result = await clientInstance.sendLocation(to, lat, long);
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
