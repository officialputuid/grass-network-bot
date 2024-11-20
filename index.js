const promptUser = require('inquirer').default;
const fileSystem = require('fs');
const WebSocketClient = require('ws');
const request = require('axios');
const { v4: generateUUID } = require('uuid');
const { SocksProxyAgent } = require('socks-proxy-agent');
const { HttpsProxyAgent } = require('https-proxy-agent');
require('colors');

console.error = function () {};

(async function initiate() {
  showHeader();  
  await wait(1000);
  const configuration = new Configuration();
  const botInstance = new BotInstance(configuration);

/*
  const { proxyChoice } = await promptUser.prompt([
    {
      type: 'list',
      name: 'proxyChoice',
      message: 'Do you want to use or run with proxy?',
      choices: ['Use Proxy', 'Without Proxy/Local network'],
    },
  ]);
  let proxyList = [];
  if (proxyChoice === 'Use Proxy') {
    proxyList = await loadLines('proxy.txt');
    if (proxyList.length === 0) {
      console.error('Proxies not found...'.red);
      return;
    }
    console.log(`Processing with ${proxyList.length} proxies, trying to filter the proxy and only connect with active proxy...`.cyan);
  } else {
    console.log('Connecting directly Without Proxy/Local network.'.cyan);
  }
*/

  const proxyChoice = 'Use Proxy';
  let proxyList = [];
  if (proxyChoice === 'Use Proxy') {
    proxyList = await loadLines('proxy.txt');
    if (proxyList.length === 0) {
      console.error('Proxies not found...'.red);
      return;
    }
    console.log(`Processing with ${proxyList.length} proxies, trying to filter the proxy and only connect with active proxy...`.cyan);
  }
  const userIDList = await loadLines('userid.txt');
  if (userIDList.length === 0) {
    console.error('Account is not available in userid.txt'.red);
    return;
  }
  console.log(`Detected total ${userIDList.length.toString().green} accounts, trying to connect...\n`.white);

  const connectionTasks = userIDList.flatMap((userID) =>
    proxyChoice === 'Use Proxy'
      ? proxyList.map((proxy) => botInstance.proxyConnect(proxy, userID))
      : [botInstance.directConnect(userID)]
  );
  await Promise.all(connectionTasks);
})().catch(console.error);

function center(text) {
  const width = process.stdout.columns || 80;
  return text.padStart((width + text.length) / 2);
}

function showIntro() {
  console.log('\n');
  console.log(center("🌱 Grass Network 🌱").green.bold);
  console.log(center("GitHub: recitativonika").cyan);
  console.log(center("Link: github.com/recitativonika").cyan);
}

function showHeader() {
  showIntro();
  console.log('\n');
  console.log(center("Processing, please wait a moment...").cyan.bold);
  console.log('\n');
}
class BotInstance {
  constructor(configuration) {
    this.configuration = configuration;
    this.totalDataUsage = {};
  }

  async proxyConnect(proxy, userID) {
    try {
      const formattedProxy = proxy.startsWith('socks5://')
        ? proxy
        : proxy.startsWith('http')
        ? proxy
        : `socks5://${proxy}`;
      const proxyDetails = await this.fetchProxyIP(formattedProxy);
      if (!proxyDetails) return;
      const agent = formattedProxy.startsWith('http')
        ? new HttpsProxyAgent(formattedProxy)
        : new SocksProxyAgent(formattedProxy);
      const wsURL = `wss://${this.configuration.websocketHost}`;
      const wsClient = new WebSocketClient(wsURL, {
        agent,
        headers: this.defaultHeaders(),
      });
      wsClient.on('open', () => {
        console.log(`Connected to ${proxy}`.blue);
        if (proxyDetails && proxyDetails.ip && proxyDetails.region && proxyDetails.country) {
          console.log(`Proxy IP: ${proxyDetails.ip.yellow}, Region: ${proxyDetails.region} ${proxyDetails.country}`.white);
        } else {
          console.log('Proxy details are missing or incomplete.'.red);
        }
        this.sendPing(wsClient, proxyDetails ? proxyDetails.ip : 'Unknown IP');
      });
      wsClient.on('message', (msg) => {
        const message = JSON.parse(msg);
        const dataUsage = msg.length;
        if (!this.totalDataUsage[userID]) {
          this.totalDataUsage[userID] = 0;
        }
        this.totalDataUsage[userID] += dataUsage;
        
        if (message.action === 'AUTH') {
          const authResponse = {
            id: message.id,
            origin_action: 'AUTH',
            result: {
              browser_id: generateUUID(),
              user_id: userID,
              user_agent: 'Mozilla/5.0',
              timestamp: Math.floor(Date.now() / 1000),
              device_type: 'desktop',
              version: '4.29.0',
            },
          };
          wsClient.send(JSON.stringify(authResponse));
          console.log(`Trying to send authentication for userID: ${authResponse.result.user_id.substring(0, 4).yellow}*`.white);
        } else if (message.action === 'PONG') {
          const totalDataUsageKB = (this.totalDataUsage[userID] / 1024).toFixed(2);
		  console.log(`Received PONG for UserID: ${userID.substring(0, 4).green}*, Used ${totalDataUsageKB.yellow} KB total packet data`.cyan);
        }
      });
      wsClient.on('close', (code, reason) => {
        console.log(`WebSocket closed, error ${code} ${reason}`.red);
        setTimeout(() => this.proxyConnect(proxy, userID), this.configuration.retryInterval);
      });

      wsClient.on('error', (error) => {
        console.error(`Proxy: ${error.message}`.red);
        wsClient.terminate();
      });
    } catch (error) {
      console.error(`Proxy: ${error.message}`.red);
    }
  }

  async directConnect(userID) {
    try {
      const wsURL = `wss://${this.configuration.websocketHost}`;
      const wsClient = new WebSocketClient(wsURL, {
        headers: this.defaultHeaders(),
      });
      wsClient.on('open', () => {
        console.log(`Connect directly Without Proxy/Local network`.white);
        this.sendPing(wsClient, 'Direct IP');
      });
		wsClient.on('message', (msg) => {
		const message = JSON.parse(msg);
		const dataUsage = msg.length;
		if (!this.totalDataUsage[userID]) {
		this.totalDataUsage[userID] = 0;
		}
		this.totalDataUsage[userID] += dataUsage;
	
		if (message.action === 'AUTH') {
			const authResponse = {
			id: message.id,
			origin_action: 'AUTH',
			result: {
				browser_id: generateUUID(),
				user_id: userID,
				user_agent: 'Mozilla/5.0',
				timestamp: Math.floor(Date.now() / 1000),
				device_type: 'desktop',
				version: '4.29.0',
			},
			};
			wsClient.send(JSON.stringify(authResponse));
			console.log(`Trying to send authentication for userID: ${authResponse.result.user_id.substring(0, 4).yellow}*`.white);
		} else if (message.action === 'PONG') {
			const totalDataUsageKB = (this.totalDataUsage[userID] / 1024).toFixed(2);
			console.log(`Received PONG for UserID: ${userID.substring(0, 4).green}*, Used ${totalDataUsageKB.yellow} KB total packet data`.cyan);
		}
		});
      wsClient.on('close', (code, reason) => {
        console.log(`WebSocket closed, error ${code} ${reason}`.red);
        setTimeout(() => this.directConnect(userID), this.configuration.retryInterval);
      });
      wsClient.on('error', (error) => {
        console.error(`Error connecting to WebSocket`.red);
        wsClient.terminate();
      });
    } catch (error) {
      console.error(`Failed to connect directly: ${error.message}`.red);
    }
  }

  sendPing(wsClient, proxyIP) {
    setInterval(() => {
      const pingMsg = {
        id: generateUUID(),
        version: '1.0.0',
        action: 'PING',
        data: {},
      };
      wsClient.send(JSON.stringify(pingMsg));
      console.log(`Send PING from ${proxyIP}`.green);
    }, 26000);
  }

  defaultHeaders() {
    return {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:92.0) Gecko/20100101 Firefox/92.0',
      Pragma: 'no-cache',
      'Accept-Language': 'uk-UA,uk;q=0.9,en-US;q=0.8,en;q=0.7',
      'Cache-Control': 'no-cache',
      OS: 'Windows',
      Platform: 'Desktop',
      Browser: 'Mozilla',
    };
  }
  async fetchProxyIP(proxy) {
    const agent = proxy.startsWith('http')
      ? new HttpsProxyAgent(proxy)
      : new SocksProxyAgent(proxy);
    try {
      const response = await request.get(this.configuration.ipCheckURL, {
        httpsAgent: agent,
      });
      console.log(`\x1b[92mConnected with proxy \x1b[32m${proxy}\x1b[0m`);
      return response.data;
    } catch (error) {
      console.error(`Proxy error, skipping proxy ${proxy}`.yellow);
      return null;
    }
  }
}
class Configuration {
  constructor() {
    this.ipCheckURL = 'https://ipinfo.io/json';
    this.wssList = ['proxy2.wynd.network:4444', 'proxy2.wynd.network:4650'];
    this.websocketHost = this.wssList[Math.floor(Math.random() * this.wssList.length)];
    this.retryInterval = 20000;
  }
}
async function loadLines(filePath) {
  return new Promise((resolve, reject) => {
    fileSystem.readFile(filePath, 'utf8', (err, data) => {
      if (err) {
        return reject(err);
      }
      resolve(data.split('\n').filter(line => line.trim() !== ''));
    });
  });
}
async function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
