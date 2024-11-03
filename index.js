const https = require('https');
const fs = require('fs');
const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');
require('colors');

function fetchPublicIP(callback) {
  https.get('https://api.ipify.org?format=json', (res) => {
    let data = '';

    res.on('data', (chunk) => {
      data += chunk;
    });

    res.on('end', () => {
      const ipObject = JSON.parse(data);
      callback(ipObject.ip);
    });
  }).on('error', (err) => {
    console.error(`Error fetching public IP: ${err.message}`.red);
  });
}

function centerText(text) {
  const width = process.stdout.columns || 80;
  const paddedText = text.padStart((width + text.length) / 2);
  return paddedText;
}

function displayIntro() {
  console.log('\n');
  console.log(centerText("🌱 Grass Network 🌱").green.bold);
  console.log(centerText("GitHub: recitativonika").cyan);
  console.log(centerText("Link: github.com/recitativonika").cyan);
  console.log('\n');
}

async function initiateWebSocketConnection(userID) {
  fetchPublicIP((publicIP) => {
    console.log(centerText(`Your Public IP Address: ${publicIP}`).green);

    try {
      const websocketURL = `wss://proxy.wynd.network:4444`;
      const websocket = new WebSocket(websocketURL, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4896.127 Safari/537.36',
          pragma: 'no-cache',
          Origin: 'chrome-extension://lkbnfiajjmbhnfledhphioinpickokdi',
          'Accept-Language': 'uk-UA,uk;q=0.9,en-US;q=0.8,en;q=0.7',
          'Cache-Control': 'no-cache',
        },
      });

      websocket.on('open', () => {
        console.log(centerText(`Connected to the server`).green);
        startPing(websocket, publicIP);
      });

      websocket.on('message', (incomingMessage) => {
        const parsedMessage = JSON.parse(incomingMessage);
        
        if (parsedMessage.action === 'AUTH') {
          console.log(centerText(`AuthID: ${parsedMessage.id}`).cyan);
		  console.log('\n');
          sendAuthResponse(websocket, parsedMessage.id, userID);
        } else if (parsedMessage.action === 'PONG') {
          console.log(`Received PONG: ${JSON.stringify(parsedMessage)}`.blue);
        }
      });

      websocket.on('close', (code, reason) => {
        console.log(`WebSocket closed with code: ${code}, reason: ${reason}`.yellow);
        if (reason === "nggyu") {
          console.error(centerText(`Might be because too many auth attempts. Try again later.`).red);
        }
      });

      websocket.on('error', (error) => {
        console.error(`WebSocket error: ${error.message}`.red);
      });
    } catch (error) {
      console.error(`Error connecting to WebSocket: ${error.message}`.red);
    }
  });
}

function sendAuthResponse(websocket, messageId, userID) {
  const authResponse = {
    id: messageId,
    origin_action: 'AUTH',
    result: {
      browser_id: uuidv4(),
      user_id: userID,
      user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4896.127 Safari/537.36',
      timestamp: Math.floor(Date.now() / 1000),
      device_type: 'extension',
      extension_id: 'lkbnfiajjmbhnfledhphioinpickokdi',
      version: '4.26.2',
    },
  };
  
  websocket.send(JSON.stringify(authResponse));
  console.log(`Trying to authenticating and send PING to server, it might take a sec`.cyan);
}

function startPing(websocket, ip) {
  setInterval(() => {
    const timestamp = Math.floor(Date.now() / 1000);
    const pingData = {
      action: 'PING',
      ip: ip,
      timestamp: timestamp,
    };
    
    websocket.send(JSON.stringify(pingData));
    
    console.log(`Sending PING from IP: ${ip.yellow}, Timestamp: ${timestamp.toString().green}`);
  }, 30000);
}

fs.readFile('userid.txt', 'utf8', (error, data) => {
  if (error) {
    console.error(`Error reading userID from file: ${error.message}`.red);
    return;
  }

  const userID = data.trim();
  displayIntro();
  initiateWebSocketConnection(userID);
});
