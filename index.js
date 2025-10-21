
const express = require('express');
const wppconnect = require('@wppconnect-team/wppconnect');
const path = require('path');

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');


const swaggerSpec = swaggerJsdoc({
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'API WPPConnect',
      version: '1.0.0',
      description: 'Documentación interactiva de la API de WhatsApp',
    },
  },
  apis: ['./index.js'], // o donde tengas tus rutas
});

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

let qrCodeBase64 = '';
let currentStatus = 'inicializando';
let clientInstance = null;
let receivedMessages = [];

app.get('/', (req, res) => {
  res.send(`
    <html>
      <head><title>Panel WPPConnect</title></head>
      <body style="font-family:sans-serif; text-align:center;">
        <h2>Escanea el QR para vincular WhatsApp</h2>
        ${qrCodeBase64 ? `<img src="${qrCodeBase64}" style="width:300px"/>` : '<p>Esperando QR...</p>'}
        <p><strong>Estado actual:</strong> ${currentStatus}</p>

        <hr/>
        <h3>Enviar mensaje</h3>
        <form method="POST" action="/send-form">
          <input name="to" placeholder="Número destino (ej: 573001234567)" required/><br/>
          <input name="message" placeholder="Mensaje" required/><br/>
          <button type="submit">Enviar</button>
        </form>

        <hr/>
        <h3>Consultar datos</h3>
        <a href="/contacts" target="_blank">📇 Ver contactos</a><br/>
        <a href="/chats" target="_blank">💬 Ver chats</a><br/>
        <a href="/messages" target="_blank">📥 Ver mensajes recibidos</a><br/>
        <a href="/status" target="_blank">🔍 Ver estado</a><br/>

        <hr/>
        <form method="POST" action="/restart">
          <button type="submit">🔄 Reiniciar sesión</button>
        </form>
      </body>
    </html>
  `);
});

// Envío desde formulario web
app.post('/send-form', async (req, res) => {
  const { to, message } = req.body;
  try {
    await clientInstance.sendText(to, message);
    res.redirect('/');
  } catch (err) {
    res.send(`<p>Error: ${err.message}</p><a href="/">Volver</a>`);
  }
});

// API REST para envío de texto
app.post('/send', async (req, res) => {
  const { to, message } = req.body;
  try {
    const result = await clientInstance.sendText(to, message);
    res.json({ success: true, result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// API REST para imagen, archivo, link, ubicación
app.post('/send-image', async (req, res) => {
  const { to, imagePath, caption } = req.body;
  const result = await clientInstance.sendImage(to, imagePath, caption);
  res.json({ success: true, result });
});

app.post('/send-file', async (req, res) => {
  const { to, filePath } = req.body;
  const result = await clientInstance.sendFile(to, filePath);
  res.json({ success: true, result });
});

app.post('/send-link', async (req, res) => {
  const { to, url, text } = req.body;
  const result = await clientInstance.sendLinkPreview(to, url, text);
  res.json({ success: true, result });
});

app.post('/send-location', async (req, res) => {
  const { to, lat, long } = req.body;
  const result = await clientInstance.sendLocation(to, lat, long);
  res.json({ success: true, result });
});

app.get('/status', (req, res) => {
  res.json({ status: currentStatus });
});

app.get('/messages', (req, res) => {
  res.json(receivedMessages);
});

app.get('/contacts', async (req, res) => {
  const contacts = await clientInstance.getAllContacts();
  res.json(contacts);
});

app.get('/chats', async (req, res) => {
  const chats = await clientInstance.getAllChats();
  res.json(chats);
});

app.post('/restart', async (req, res) => {
  if (clientInstance) await clientInstance.close();
  await iniciarBot();
  res.redirect('/');
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


