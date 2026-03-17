const mqtt = require('mqtt');
const CryptoJS = require('crypto-js');

const productKey = 'k1wxakcs6OI';
const deviceName = 'DHT11';
const deviceSecret = 'bc073a07f86537380f76ddd44307b28d';
const host = 'iot-06z00b1eo2alugk.mqtt.iothub.aliyuncs.com';
const port = 443;

const timestamp = Date.now().toString();
const clientId = `${productKey}.${deviceName}|securemode=2,signmethod=hmacsha256,timestamp=${timestamp}|`;
const signContent = `clientId${productKey}.${deviceName}deviceName${deviceName}productKey${productKey}timestamp${timestamp}`;
const password = CryptoJS.HmacSHA256(signContent, deviceSecret).toString(CryptoJS.enc.Hex);
const username = `${deviceName}&${productKey}`;

const url = `wss://${host}:${port}/mqtt`;

console.log('--- Connecting ---');
console.log('URL:', url);
console.log('ClientID:', clientId);
console.log('Username:', username);
console.log('Password:', password);

const client = mqtt.connect(url, {
  clientId,
  username,
  password,
  keepalive: 60,
  clean: true,
  protocolVersion: 4,
});

client.on('connect', () => {
  console.log('SUCCESS: Connected to Alibaba Cloud IoT');
  client.end();
});

client.on('error', (err) => {
  console.error('ERROR:', err.message);
});

client.on('disconnect', (packet) => {
  console.log('DISCONNECT:', packet);
});

client.on('close', () => {
  console.log('CLOSE: Connection closed');
});

client.on('offline', () => {
  console.log('OFFLINE');
});
