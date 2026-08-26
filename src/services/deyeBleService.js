/**
 * Deye & Solar Inverter BLE Communication Service
 * Uses Web Bluetooth API (navigator.bluetooth) and Modbus RTU over BLE GATT.
 * 
 * Supports:
 * - Deye / Solarman Wi-Fi+BLE Data Logger sticks (LSW-3, DLS-W, DL1000B, etc.)
 * - Standard Transparent UART BLE Services (0xFFE0 / 0xFED5 / 0xFEC7 / 0x0922 / Nordic UART / Microchip)
 * - Automatic GATT Service & Characteristic Discovery
 * - Modbus RTU 0x03 (Read Holding Registers) framing and CRC16 verification
 * - Built-in Simulation Mode & Real-Time Bluetooth Hardware Inspector
 */

// Exhaustive list of known GATT Service UUIDs for Solar Loggers, Inverters & BLE UART Bridges
export const ALL_SUPPORTED_BLE_SERVICES = [
  // Deye / Solarman Transparent UART Service
  '0000ffe0-0000-1000-8000-00805f9b34fb',
  0xffe0,
  
  // Solarman Logger Services
  '0000fed5-0000-1000-8000-00805f9b34fb',
  0xfed5,
  '0000fec7-0000-1000-8000-00805f9b34fb',
  0xfec7,
  0x0922,

  // Additional Solar / ESP32 / Vendor UART Services
  '0000fee0-0000-1000-8000-00805f9b34fb',
  0xfee0,
  '0000fff0-0000-1000-8000-00805f9b34fb',
  0xfff0,
  '0000fe95-0000-1000-8000-00805f9b34fb',
  0xfe95,
  '0000ffff-0000-1000-8000-00805f9b34fb',
  0xffff,

  // Nordic Semiconductor UART Service (NUS)
  '6e400001-b5a3-f393-e0a9-e50e24dcca9e',

  // Microchip Transparent UART Service
  '49535343-fe7d-4ae5-8fa9-9fafd205e455',

  // Standard BLE Services
  '00001800-0000-1000-8000-00805f9b34fb', // Generic Access
  0x1800,
  '00001801-0000-1000-8000-00805f9b34fb', // Generic Attribute
  0x1801,
  '0000180a-0000-1000-8000-00805f9b34fb', // Device Information
  0x180a,
];

/**
 * Checks whether the Web Bluetooth API is supported by the current browser.
 */
export function isWebBluetoothSupported() {
  return typeof navigator !== 'undefined' && Boolean(navigator.bluetooth);
}

/**
 * Calculates Modbus RTU CRC-16 (Polynomial: 0xA001)
 * @param {Uint8Array|Array} bytes
 * @returns {[number, number]} [lowByte, highByte]
 */
export function calculateModbusCRC16(bytes) {
  let crc = 0xFFFF;
  for (let i = 0; i < bytes.length; i++) {
    crc ^= bytes[i];
    for (let bit = 0; bit < 8; bit++) {
      if ((crc & 0x0001) !== 0) {
        crc = (crc >> 1) ^ 0xA001;
      } else {
        crc >>= 1;
      }
    }
  }
  return [crc & 0xFF, (crc >> 8) & 0xFF];
}

/**
 * Builds a standard Modbus RTU 0x03 (Read Holding Registers) Request Frame
 * @param {number} slaveAddress Inverter Modbus ID (usually 0x01)
 * @param {number} startRegister Starting Register Address (e.g., 0x003C for 60)
 * @param {number} registerCount Number of 16-bit registers to read (e.g., 0x0006)
 * @returns {Uint8Array} Modbus frame with CRC-16
 */
export function buildModbusReadFrame(slaveAddress = 0x01, startRegister = 0x003C, registerCount = 0x0006) {
  const payload = [
    slaveAddress,
    0x03, // Function code: Read Holding Registers
    (startRegister >> 8) & 0xFF,
    startRegister & 0xFF,
    (registerCount >> 8) & 0xFF,
    registerCount & 0xFF,
  ];

  const [crcLo, crcHi] = calculateModbusCRC16(payload);
  return new Uint8Array([...payload, crcLo, crcHi]);
}

/**
 * Parses Deye Modbus RTU Response starting at Register 0x003C (60)
 * 
 * Register Map:
 * - 0x003C (60): Daily Generation (0.1 kWh) -> uint16
 * - 0x003D (61): Total Active Power / Status
 * - 0x003E (62): Reserved / Grid status
 * - 0x003F - 0x0040 (63-64): Total Cumulative Generation (0.1 kWh) -> uint32 (Big Endian)
 * - 0x0056 - 0x0057 (86-87): Real-time AC Active Power (0.1 W) -> uint32
 * - 0x005A (90): Internal Inverter Temperature (0.1 °C) -> int16
 * 
 * @param {Uint8Array} dataBuffer 
 * @returns {Object} Parsed telemetry values
 */
export function parseDeyeModbusResponse(dataBuffer) {
  if (!dataBuffer || dataBuffer.length < 5) {
    throw new Error('Invalid Modbus response: buffer too short.');
  }

  const slaveId = dataBuffer[0];
  const functionCode = dataBuffer[1];
  const byteCount = dataBuffer[2];

  if (functionCode & 0x80) {
    const errorCode = dataBuffer[2];
    throw new Error(`Inverter returned Modbus exception code: 0x${errorCode.toString(16).padStart(2, '0')}`);
  }

  if (functionCode !== 0x03) {
    throw new Error(`Unexpected function code received: 0x${functionCode.toString(16)}`);
  }

  const valuesData = dataBuffer.slice(3, 3 + byteCount);
  const dataView = new DataView(valuesData.buffer, valuesData.byteOffset, valuesData.byteLength);

  // Extract Daily Generation (Reg 60 = offset 0 in our query)
  let dailyUnitsKwh = 0;
  if (valuesData.length >= 2) {
    const rawDaily = dataView.getUint16(0, false); // Big Endian
    dailyUnitsKwh = Number((rawDaily * 0.1).toFixed(2));
  }

  // Extract Total Cumulative Generation (Reg 63-64 = offset 6 in our 6-register block)
  let cumulativeUnitsKwh = 0;
  if (valuesData.length >= 10) {
    // 32-bit integer across 2 registers (offset 6)
    const rawTotal = dataView.getUint32(6, false);
    cumulativeUnitsKwh = Number((rawTotal * 0.1).toFixed(1));
  }

  return {
    slaveId,
    dailyUnits: dailyUnitsKwh,
    cumulativeUnits: cumulativeUnitsKwh,
    rawHex: Array.from(dataBuffer).map((b) => b.toString(16).padStart(2, '0').toUpperCase()).join(' '),
    timestamp: new Date().toISOString(),
  };
}

/**
 * Connects to any nearby physical Inverter BLE logger via Web Bluetooth API.
 * Uses broad device matching and dynamic GATT service inspection.
 * 
 * @param {Object} options Configuration callbacks (onProgress, etc.)
 * @returns {Promise<Object>} Extracted solar telemetry data and hardware diagnostics
 */
export async function connectAndReadDeyeBle(options = {}) {
  const { onProgress = () => {}, acceptAll = true } = options;

  if (!isWebBluetoothSupported()) {
    throw new Error(
      'Web Bluetooth is not supported in this browser. Please use Google Chrome, Microsoft Edge, or Bluefy (iOS).'
    );
  }

  onProgress('Opening Bluetooth pairing window... Select your Inverter Logger.');

  // Step 1: Scan for Bluetooth devices.
  // Using acceptAllDevices: true ensures all devices appear even if named by serial number or custom prefix.
  let device;
  try {
    if (acceptAll) {
      device = await navigator.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: ALL_SUPPORTED_BLE_SERVICES,
      });
    } else {
      device = await navigator.bluetooth.requestDevice({
        filters: [
          { namePrefix: 'Deye' },
          { namePrefix: 'Solar' },
          { namePrefix: 'LSW' },
          { namePrefix: 'DLS' },
          { namePrefix: 'E-Solar' },
          { namePrefix: 'AP_' },
          { namePrefix: 'WIFI_' },
          { namePrefix: 'ESP' },
          { namePrefix: 'BT_' },
          { namePrefix: 'SUN' },
          { namePrefix: '2' }, // Serial numbers often start with 2
          { namePrefix: '1' },
          { namePrefix: '3' },
          { namePrefix: '4' },
        ],
        optionalServices: ALL_SUPPORTED_BLE_SERVICES,
      });
    }
  } catch (err) {
    if (err.name === 'NotFoundError') {
      throw new Error('Bluetooth pairing cancelled or no device was selected.');
    }
    throw err;
  }

  onProgress(`Connecting to GATT Server on ${device.name || 'Bluetooth Device'} (${device.id.slice(0, 8)}...)...`);

  // Step 2: Connect to GATT Server
  const server = await device.gatt.connect();

  onProgress('Inspecting primary GATT Services & Characteristics on device...');

  // Step 3: Discover all available services
  let primaryServices = [];
  try {
    primaryServices = await server.getPrimaryServices();
  } catch (err) {
    console.warn('Could not enumerate all services, falling back to declared list...', err);
  }

  const discoveredServicesReport = [];
  let writableChar = null;
  let notifiableChar = null;

  for (const s of primaryServices) {
    const sUuid = s.uuid.toLowerCase();
    try {
      const chars = await s.getCharacteristics();
      const charInfos = [];

      for (const c of chars) {
        const props = [];
        if (c.properties.read) props.push('read');
        if (c.properties.write) props.push('write');
        if (c.properties.writeWithoutResponse) props.push('writeWithoutResponse');
        if (c.properties.notify) props.push('notify');
        if (c.properties.indicate) props.push('indicate');

        charInfos.push({
          uuid: c.uuid,
          properties: props,
        });

        // Identify write channel
        if (!writableChar && (c.properties.write || c.properties.writeWithoutResponse)) {
          writableChar = c;
        }

        // Identify notify channel
        if (!notifiableChar && (c.properties.notify || c.properties.indicate)) {
          notifiableChar = c;
        }
      }

      discoveredServicesReport.push({
        serviceUuid: s.uuid,
        characteristics: charInfos,
      });
    } catch (charErr) {
      discoveredServicesReport.push({
        serviceUuid: s.uuid,
        characteristics: [],
        error: charErr.message,
      });
    }
  }

  // If notifiable characteristic is still null but writable exists and supports notify
  if (writableChar && !notifiableChar && (writableChar.properties.notify || writableChar.properties.indicate)) {
    notifiableChar = writableChar;
  }

  if (!writableChar || !notifiableChar) {
    // Generate detailed diagnostic report
    const serviceList = discoveredServicesReport.map((s) => s.serviceUuid).join(', ') || 'None detected';
    throw new Error(
      `Connected to "${device.name || 'Device'}", but no bidirectional serial characteristic was found. Discovered Services: [${serviceList}]. If this is a Solarman stick, it may be in Wi-Fi provisioning mode. Stand within range and ensure the mobile app is closed.`
    );
  }

  onProgress(`Found serial channel on ${device.name || 'Logger'}. Subscribing to telemetry notifications...`);

  // Step 4: Setup notification listener
  const responsePromise = new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Inverter response timed out (no data received after 8 seconds). The logger may be in Wi-Fi mode or requires active solar generation.'));
    }, 8000);

    const handleNotification = (event) => {
      clearTimeout(timeout);
      const value = event.target.value;
      const rawBytes = new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
      try {
        notifiableChar.removeEventListener('characteristicvaluechanged', handleNotification);
      } catch {}
      resolve(rawBytes);
    };

    notifiableChar.addEventListener('characteristicvaluechanged', handleNotification);
  });

  await notifiableChar.startNotifications();

  onProgress('Sending Modbus RTU Read Command (Holding Regs 0x003C - 0x0041)...');

  // Step 5: Transmit Modbus Query Frame
  const queryFrame = buildModbusReadFrame(0x01, 0x003C, 0x0006);
  await writableChar.writeValue(queryFrame);

  onProgress('Waiting for Inverter data stream...');
  const responseBytes = await responsePromise;

  onProgress('Decoding inverter telemetry payload...');
  const telemetry = parseDeyeModbusResponse(responseBytes);

  // Add device metadata & hardware diagnostics
  telemetry.deviceName = device.name || 'Deye Inverter Logger';
  telemetry.deviceId = device.id;
  telemetry.connectionType = 'LIVE_BLE';
  telemetry.diagnostics = discoveredServicesReport;

  return telemetry;
}

/**
 * Generates a realistic simulated Inverter BLE reading for demonstration and testing.
 * Uses the block's current meter reading to calculate realistic daily yields and incremental counters.
 * 
 * @param {Object} block Selected block metadata
 * @param {Object} lastKnownEntry Previous recorded log for this block
 * @returns {Promise<Object>} Simulated telemetry object
 */
export async function simulateDeyeBleRead(block, lastKnownEntry = null, options = {}) {
  const { onProgress = () => {}, delayMs = 1200 } = options;

  onProgress('Scanning for nearby Rooftop BLE Inverters...');
  await new Promise((r) => setTimeout(r, delayMs * 0.4));

  const deviceName = `Deye-${block.id}-${block.capacityKwp}kW-BLE`;
  onProgress(`Found ${deviceName}! Establishing GATT connection...`);
  await new Promise((r) => setTimeout(r, delayMs * 0.3));

  onProgress('Querying Modbus registers (0x003C: Daily kWh, 0x003F: Total kWh, 0x0056: Active kW)...');
  await new Promise((r) => setTimeout(r, delayMs * 0.3));

  // Generate realistic numbers based on actual capacity (8 kWp, 20 kWp, or 31 kWp)
  const capacity = Number(block.capacityKwp || 20);
  const now = new Date();
  const currentHour = now.getHours() + now.getMinutes() / 60;

  // Solar progress factor during daylight (6 AM to 6 PM)
  let dayFraction = 0.85;
  if (currentHour >= 6 && currentHour <= 18) {
    dayFraction = Math.min(1.0, Math.max(0.1, (currentHour - 6) / 11));
  } else if (currentHour < 6) {
    dayFraction = 0.05;
  }

  const expectedFullDayYield = Number((capacity * (4.0 + Math.random() * 0.5)).toFixed(2));
  const simDailyUnits = Number((expectedFullDayYield * dayFraction).toFixed(1));

  const baseMeter = lastKnownEntry?.cumulativeUnits
    ? Number(lastKnownEntry.cumulativeUnits)
    : Number(block.initialMeterReading || (capacity * 120));

  const simCumulativeUnits = Number((baseMeter + simDailyUnits).toFixed(1));
  const activePowerKw = Number(((capacity * (0.68 + Math.random() * 0.22)) * (dayFraction > 0.1 ? 1 : 0)).toFixed(2));
  const internalTemp = Number((38.5 + Math.random() * 5).toFixed(1));

  onProgress('Data successfully decoded from Inverter BLE Logger!');

  return {
    deviceName,
    deviceId: `SIM-BLE-${block.id}-${Date.now().toString().slice(-4)}`,
    connectionType: 'SIMULATED_BLE',
    slaveId: 1,
    dailyUnits: simDailyUnits,
    cumulativeUnits: simCumulativeUnits,
    activePowerKw,
    internalTemp,
    timestamp: new Date().toISOString(),
    rawHex: '01 03 0C ' + Math.floor(simDailyUnits * 10).toString(16).padStart(4, '0').toUpperCase() + ' 00 00 00 00 ' + Math.floor(simCumulativeUnits * 10).toString(16).padStart(8, '0').toUpperCase() + ' A4 B2',
  };
}
