/**
 * ParkSphere India — Data Layer
 * ------------------------------------------------------------------
 * For this demo build we use a lightweight JSON-file store instead of
 * MySQL (no external DB server available in this environment). The
 * access pattern (get/insert/update/find) mirrors what a real SQL
 * layer would do, so swapping in MySQL/Sequelize later only means
 * rewriting this file — nothing in routes/ needs to change.
 * ------------------------------------------------------------------
 */
const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, 'data', 'db.json');

function defaultData() {
  return {
    users: [],
    properties: [],
    slots: [],
    bookings: [],
    payments: [],
    notifications: [],
    activityLogs: []
  };
}

function load() {
  if (!fs.existsSync(DATA_FILE)) {
    save(defaultData());
  }
  return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
}

function save(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

// Simple in-process mutex so concurrent requests don't clobber writes
let queue = Promise.resolve();
function transaction(fn) {
  queue = queue.then(async () => {
    const data = load();
    const result = await fn(data);
    save(data);
    return result;
  });
  return queue;
}

function nextId(arr) {
  return arr.length ? Math.max(...arr.map(x => x.id)) + 1 : 1;
}

module.exports = { load, save, transaction, nextId, DATA_FILE };
