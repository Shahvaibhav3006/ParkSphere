/**
 * Seeds demo data: properties, floors, slots, and one user per role.
 * Run with: node seed.js
 */
const bcrypt = require('bcryptjs');
const { save, DATA_FILE } = require('./db');

const properties = [
  { id: 1, name: 'Emerald Heights Society', type: 'Residential', city: 'Ahmedabad', floors: 2, slotsPerFloor: 10 },
  { id: 2, name: 'Skyline Mall', type: 'Shopping Mall', city: 'Ahmedabad', floors: 3, slotsPerFloor: 14 },
  { id: 3, name: 'CityCare Hospital', type: 'Hospital', city: 'Ahmedabad', floors: 1, slotsPerFloor: 12 }
];

const users = [
  { id: 1, name: 'Aarav Shah', email: 'superadmin@parksphere.in', password: 'admin123', role: 'super_admin', propertyId: null, vehicleNumber: null },
  { id: 2, name: 'Priya Mehta', email: 'manager@parksphere.in', password: 'manager123', role: 'property_manager', propertyId: 1, vehicleNumber: null },
  { id: 3, name: 'Rohan Patel', email: 'guard@parksphere.in', password: 'guard123', role: 'security_guard', propertyId: 1, vehicleNumber: null },
  { id: 4, name: 'Neha Verma', email: 'user@parksphere.in', password: 'user123', role: 'customer', propertyId: null, vehicleNumber: 'GJ01AB1234' }
];

let slotId = 1;
const slots = [];
const statusCycle = ['available', 'available', 'occupied', 'reserved', 'available', 'maintenance'];
properties.forEach(p => {
  for (let f = 1; f <= p.floors; f++) {
    for (let s = 1; s <= p.slotsPerFloor; s++) {
      slots.push({
        id: slotId,
        propertyId: p.id,
        floor: f,
        code: `F${f}-${String(s).padStart(2, '0')}`,
        status: statusCycle[(slotId + s) % statusCycle.length],
        type: s % 6 === 0 ? 'ev' : (s % 5 === 0 ? 'accessible' : 'standard'),
        pricePerHour: p.type === 'Shopping Mall' ? 30 : (p.type === 'Hospital' ? 20 : 15)
      });
      slotId++;
    }
  }
});

const data = {
  users: users.map(u => ({ ...u, password: bcrypt.hashSync(u.password, 8) })),
  properties,
  slots,
  bookings: [],
  payments: [],
  notifications: [
    { id: 1, userId: 4, title: 'Welcome to ParkSphere India', message: 'Your account has been created successfully.', read: false, createdAt: new Date().toISOString() }
  ],
  activityLogs: [
    { id: 1, userId: 1, action: 'SYSTEM_SEEDED', details: 'Demo data initialized', createdAt: new Date().toISOString() }
  ]
};

save(data);
console.log('Seed complete ->', DATA_FILE);
console.log('\nDemo logins:');
users.forEach(u => console.log(`  ${u.role.padEnd(18)} ${u.email.padEnd(28)} password: ${u.password}`));
