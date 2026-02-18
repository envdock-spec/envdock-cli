const fs = require('fs');
const path = require('path');
const os = require('os');

// Define the path: ~/.envdock/config.json
const CONFIG_DIR = path.join(os.homedir(), '.envdock');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

// Ensure directory exists immediately
if (!fs.existsSync(CONFIG_DIR)) {
  fs.mkdirSync(CONFIG_DIR, { recursive: true });
}

// Helper: Read the file safely
const readConfig = () => {
  if (!fs.existsSync(CONFIG_FILE)) return {};
  try {
    return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
  } catch (error) {
    return {}; // Return empty if file is corrupted
  }
};

// Helper: Write to file
const writeConfig = (data) => {
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(data, null, 2));
};

// Helper: Handle "user.name" dot notation for nested keys
const setNestedValue = (obj, path, value) => {
  const keys = path.split('.');
  let current = obj;
  for (let i = 0; i < keys.length - 1; i++) {
    current[keys[i]] = current[keys[i]] || {};
    current = current[keys[i]];
  }
  current[keys[keys.length - 1]] = value;
};

const getNestedValue = (obj, path) => {
    return path.split('.').reduce((o, i) => (o ? o[i] : undefined), obj);
};

const deleteNestedValue = (obj, path) => {
    const keys = path.split('.');
    const lastKey = keys.pop();
    const target = keys.reduce((o, i) => (o ? o[i] : undefined), obj);
    if (target) {
        delete target[lastKey];
    }
};


module.exports = {
  // 1. GET: config.get('user') or config.get('user.name')
  get: (key) => {
    const data = readConfig();
    if (!key) return data; // No key? Return everything.
    return getNestedValue(data, key);
  },

  // 2. SET: config.set('token', 'abc') OR config.set({ token: 'abc' })
  set: (keyOrObject, value) => {
    const data = readConfig();

    if (typeof keyOrObject === 'object') {
      // Handle: config.set({ token: '123', user: {...} })
      Object.assign(data, keyOrObject);
    } else {
      // Handle: config.set('defaults.env', 'production')
      setNestedValue(data, keyOrObject, value);
    }

    writeConfig(data);
  },

  // 3. DELETE: config.delete('token')
  delete: (key) => {
    const data = readConfig();
    if (key.includes('.')) {
        deleteNestedValue(data, key);
    } else {
        delete data[key];
    }
    writeConfig(data);
  },

  // 4. CLEAR: Wipes the file
  clear: () => {
   // 1. Delete the main config file
    if (fs.existsSync(CONFIG_FILE)) {
      try {
        fs.unlinkSync(CONFIG_FILE);
      } catch (err) {
        // Ignore if file is busy/missing
      }
    }

    // 2. Delete .envdock.json
    if (fs.existsSync('.envdock.json')) {
      try {
        fs.unlinkSync('.envdock.json');
      } catch (err) {
        // Ignore if file is busy/missing
      }
    }
  },

  // 5. PATH: Helper property to see where file is stored
  path: CONFIG_FILE,
  
  // 6. ALL: Helper to get raw object (for config list command)
  get all() {
      return readConfig();
  }
};