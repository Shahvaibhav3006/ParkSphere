// ParkSphere India — Dashboard application logic
(function () {
  if (!getToken()) { window.location.href = 'index.html'; return; }
  const user = getUser();

  // ---------- toast ----------
  function toast(msg, type = '') {
    const stack = document.getElementById('toastStack');
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.textContent = msg;
    stack.appendChild(el);
    setTimeout(() => el.remove(), 4200);
  }

  // ---------- nav config per role ----------
  const NAV = {
    customer: [
      { id: 'dashboard', label: 'Dashboard', icon: '◈' },
      { id: 'map', label: 'Parking Map', icon: '▦' },
      { id: 'book', label: 'Book Parking', icon: '＋' },
      { id: 'bookings', label: 'My Bookings', icon: '☰' },
      { id: 'findcar', label: 'Find My Car', icon: '⌕' },
      { id: 'payments', label: 'Payments', icon: '₹' },
      { id: 'notifications', label: 'Notifications', icon: '◔' }
    ],
    property_manager: [
      { id: 'dashboard', label: 'Dashboard', icon: '◈' },
      { id: 'map', label: 'Parking Map', icon: '▦' },
      { id: 'bookings', label: 'Bookings', icon: '☰' },
      { id: 'findcar', label: 'Find My Car', icon: '⌕' },
      { id: 'analytics', label: 'Reports & Analytics', icon: '▤' },
      { id: 'logs', label: 'Activity Logs', icon: '≡' },
      { id: 'notifications', label: 'Notifications', icon: '◔' }
    ],
    security_guard: [
      { id: 'scan', label: 'Scan / Verify', icon: '▣' },
      { id: 'map', label: 'Parking Map', icon: '▦' },
      { id: 'findcar', label: 'Find My Car', icon: '⌕' },
      { id: 'notifications', label: 'Notifications', icon: '◔' }
    ],
    super_admin: [
      { id: 'dashboard', label: 'Dashboard', icon: '◈' },
      { id: 'properties', label: 'Org Setup', icon: '⌂' },
      { id: 'map', label: 'Parking Map', icon: '▦' },
      { id: 'bookings', label: 'Bookings', icon: '☰' },
      { id: 'findcar', label: 'Find My Car', icon: '⌕' },
      { id: 'users', label: 'Staff & Users', icon: '☺' },
      { id: 'analytics', label: 'Reports & Analytics', icon: '▤' },
      { id: 'logs', label: 'Activity Logs', icon: '≡' },
      { id: 'notifications', label: 'Notifications', icon: '◔' }
    ]
  };

  // ---------- sidebar / user chip ----------
  document.getElementById('userName').textContent = user.name;
  document.getElementById('userRole').textContent = user.role.replace('_', ' ');
  document.getElementById('userInitials').textContent = user.name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
  document.getElementById('logoutBtn').onclick = doLogout;
  document.getElementById('mobileLogout').onclick = doLogout;
  function doLogout() { clearToken(); window.location.href = 'index.html'; }

  const navList = document.getElementById('navList');
  const items = NAV[user.role] || NAV.customer;
  items.forEach((item, idx) => {
    const el = document.createElement('div');
    el.className = 'nav-item' + (idx === 0 ? ' active' : '');
    el.dataset.page = item.id;
    el.innerHTML = `<span class="dot"></span><span>${item.icon}</span><span>${item.label}</span>`;
    el.onclick = () => navigateTo(item.id);
    navList.appendChild(el);
  });

  function navigateTo(pageId) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    const page = document.getElementById('page-' + pageId);
    if (page) page.classList.add('active');
    const nav = document.querySelector(`.nav-item[data-page="${pageId}"]`);
    if (nav) nav.classList.add('active');
    loadPage(pageId);
    closeMobileSidebar(); // auto-close the drawer after picking a page on mobile
  }

  // ---------- mobile sidebar drawer ----------
  const sidebarEl = document.querySelector('.sidebar');
  const overlayEl = document.getElementById('sidebarOverlay');
  function openMobileSidebar() { sidebarEl.classList.add('open'); overlayEl.classList.add('show'); }
  function closeMobileSidebar() { sidebarEl.classList.remove('open'); overlayEl.classList.remove('show'); }
  document.getElementById('hamburgerBtn').onclick = openMobileSidebar;
  overlayEl.onclick = closeMobileSidebar;

  function loadPage(pageId) {
    const loaders = {
      dashboard: loadDashboard, map: loadMap, book: loadBookPage, bookings: loadBookings,
      findcar: () => {}, payments: loadPayments, notifications: loadNotifications,
      scan: () => {}, properties: loadProperties, users: loadUsers,
      analytics: loadAnalytics, logs: loadLogs
    };
    if (loaders[pageId]) loaders[pageId]().catch(err => toast(err.message, 'error'));
  }

  // ==================== DASHBOARD ====================
  async function loadDashboard() {
    const cardsEl = document.getElementById('statCards');
    if (user.role === 'customer') {
      const { bookings } = await api('/bookings');
      const active = bookings.filter(b => ['confirmed', 'checked_in'].includes(b.status)).length;
      const total = bookings.length;
      const spent = bookings.reduce((s, b) => s + (['confirmed','checked_in','checked_out'].includes(b.status) ? b.amount : 0), 0);
      cardsEl.innerHTML = statCard('Active Sessions', active, 'green') + statCard('Total Bookings', total) + statCard('Total Spent', fmtCurrency(spent)) + statCard('Account', user.role.replace('_',' '));
      renderActivityRows(bookings.slice(-8).reverse().map(b => ({ action: `Booking ${b.status}`, details: b.bookingRef, createdAt: b.createdAt })));
    } else {
      const { properties } = await api('/properties');
      const propertyId = user.role === 'property_manager' ? user.propertyId : (properties[0] && properties[0].id);
      const summary = await api(`/analytics/summary${propertyId ? '?propertyId=' + propertyId : ''}`);
      cardsEl.innerHTML =
        statCard('Available Slots', summary.occupancy.available, 'green') +
        statCard('Occupied', summary.occupancy.occupied, 'red') +
        statCard('Total Bookings', summary.totalBookings) +
        statCard('Revenue', fmtCurrency(summary.revenue), 'amber');
      const { logs } = await api('/users/activity-logs');
      renderActivityRows(logs.slice(0, 8));
    }
  }
  function statCard(label, value, tone = '') {
    return `<div class="card stat-card"><div class="label">${label}</div><div class="value ${tone}">${value}</div></div>`;
  }
  function renderActivityRows(rows) {
    const tbody = document.querySelector('#recentActivityTable tbody');
    tbody.innerHTML = rows.length ? rows.map(r => `<tr><td>${r.action}</td><td class="mono">${r.details}</td><td>${timeAgo(r.createdAt)}</td></tr>`).join('') :
      `<tr><td colspan="3"><div class="empty-state">No activity yet</div></td></tr>`;
  }

  // ==================== PARKING MAP ====================
  async function loadMap() {
    const { properties } = await api('/properties');
    const propSel = document.getElementById('mapPropertySelect');
    if (!propSel.dataset.loaded) {
      propSel.innerHTML = properties.map(p => `<option value="${p.id}">${p.name}</option>`).join('');
      propSel.dataset.loaded = '1';
      propSel.onchange = () => { populateFloorSelect(properties); renderMap(); };
    }
    populateFloorSelect(properties);
    document.getElementById('mapFloorSelect').onchange = renderMap;
    renderMap();
  }
  function populateFloorSelect(properties) {
    const propSel = document.getElementById('mapPropertySelect');
    const floorSel = document.getElementById('mapFloorSelect');
    const prop = properties.find(p => p.id === Number(propSel.value));
    if (!prop) return;
    const opts = [];
    for (let f = 1; f <= prop.floors; f++) opts.push(`<option value="${f}">Floor ${f}</option>`);
    floorSel.innerHTML = opts.join('');
  }
  async function renderMap() {
    const propertyId = document.getElementById('mapPropertySelect').value;
    const floor = document.getElementById('mapFloorSelect').value;
    const { slots } = await api(`/slots?propertyId=${propertyId}&floor=${floor}`);
    const grid = document.getElementById('slotGrid');
    grid.innerHTML = slots.map(s => `
      <div class="slot-tile ${s.status}" title="₹${s.pricePerHour}/hr">
        ${s.type === 'ev' ? '<span class="ev-tag">⚡EV</span>' : ''}
        <div class="slot-code">${s.code}</div>
      </div>`).join('') || `<div class="empty-state">No slots on this floor</div>`;
  }

  // ==================== BOOK PARKING ====================
  let selectedSlot = null;
  async function loadBookPage() {
    selectedSlot = null;
    document.getElementById('confirmBookingBtn').disabled = true;
    document.getElementById('confirmBookingBtn').textContent = 'Select a slot to continue';
    const { properties } = await api('/properties');
    const propSel = document.getElementById('bookPropertySelect');
    propSel.innerHTML = properties.map(p => `<option value="${p.id}">${p.name} — ${p.type}</option>`).join('');
    propSel.onchange = () => { populateBookFloor(properties); renderBookSlotGrid(); };
    document.getElementById('bookFloorSelect').onchange = renderBookSlotGrid;
    populateBookFloor(properties);

    const now = new Date();
    const start = new Date(now.getTime() + 30 * 60000);
    const end = new Date(now.getTime() + 150 * 60000);
    document.getElementById('bookStart').value = toLocalInput(start);
    document.getElementById('bookEnd').value = toLocalInput(end);
    document.getElementById('bookVehicle').value = user.vehicleNumber || '';
    document.getElementById('bookStart').onchange = updateBookSummary;
    document.getElementById('bookEnd').onchange = updateBookSummary;

    renderBookSlotGrid();
  }
  function toLocalInput(d) {
    const pad = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }
  function populateBookFloor(properties) {
    const propSel = document.getElementById('bookPropertySelect');
    const floorSel = document.getElementById('bookFloorSelect');
    const prop = properties.find(p => p.id === Number(propSel.value));
    if (!prop) return;
    const opts = [];
    for (let f = 1; f <= prop.floors; f++) opts.push(`<option value="${f}">Floor ${f}</option>`);
    floorSel.innerHTML = opts.join('');
  }
  async function renderBookSlotGrid() {
    selectedSlot = null;
    document.getElementById('confirmBookingBtn').disabled = true;
    const propertyId = document.getElementById('bookPropertySelect').value;
    const floor = document.getElementById('bookFloorSelect').value;
    const { slots } = await api(`/slots?propertyId=${propertyId}&floor=${floor}`);
    const grid = document.getElementById('bookSlotGrid');
    grid.innerHTML = slots.map(s => `
      <div class="slot-tile ${s.status}" data-id="${s.id}" data-code="${s.code}" data-price="${s.pricePerHour}" title="₹${s.pricePerHour}/hr">
        ${s.type === 'ev' ? '<span class="ev-tag">⚡</span>' : ''}
        <div class="slot-code">${s.code}</div>
      </div>`).join('') || `<div class="empty-state">No slots on this floor</div>`;
    grid.querySelectorAll('.slot-tile.available').forEach(tile => {
      tile.onclick = () => {
        grid.querySelectorAll('.slot-tile').forEach(t => t.style.outline = 'none');
        tile.style.outline = '2px solid var(--lane-paint)';
        selectedSlot = { id: tile.dataset.id, code: tile.dataset.code, price: Number(tile.dataset.price), propertyId };
        document.getElementById('confirmBookingBtn').disabled = false;
        document.getElementById('confirmBookingBtn').textContent = `Book Slot ${tile.dataset.code}`;
        updateBookSummary();
      };
    });
  }
  function updateBookSummary() {
    const card = document.getElementById('bookSummaryCard');
    if (!selectedSlot) {
      card.innerHTML = `<div class="empty-state"><div class="glyph">🅿️</div>Pick a property, floor, and slot to see your booking summary and price here.</div>`;
      return;
    }
    const start = new Date(document.getElementById('bookStart').value);
    const end = new Date(document.getElementById('bookEnd').value);
    const hours = Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60)));
    const amount = hours * selectedSlot.price;
    card.innerHTML = `
      <div class="section-title" style="margin-top:0">Booking Summary</div>
      <table>
        <tr><td>Slot</td><td class="slot-code">${selectedSlot.code}</td></tr>
        <tr><td>Rate</td><td>${fmtCurrency(selectedSlot.price)}/hr</td></tr>
        <tr><td>Duration</td><td>${hours} hour(s)</td></tr>
        <tr><td><b>Total</b></td><td><b>${fmtCurrency(amount)}</b></td></tr>
      </table>`;
  }

  document.getElementById('confirmBookingBtn').addEventListener('click', async () => {
    if (!selectedSlot) return;
    const vehicleNumber = document.getElementById('bookVehicle').value.trim();
    if (!vehicleNumber) return toast('Please enter a vehicle number', 'error');
    const startTime = document.getElementById('bookStart').value;
    const endTime = document.getElementById('bookEnd').value;
    try {
      const { booking } = await api('/bookings', { method: 'POST', body: { propertyId: Number(selectedSlot.propertyId), slotId: Number(selectedSlot.id), vehicleNumber, startTime, endTime } });
      const { order } = await api('/payments/create-order', { method: 'POST', body: { bookingId: booking.id } });
      // Simulated Razorpay checkout — instantly "succeeds" for demo purposes
      const { booking: paidBooking } = await api('/payments/verify', { method: 'POST', body: { bookingId: booking.id, orderId: order.orderId } });
      showQrModal(paidBooking);
      toast('Payment successful — booking confirmed', 'success');
      renderBookSlotGrid();
    } catch (err) {
      toast(err.message, 'error');
    }
  });

  function showQrModal(booking) {
    document.getElementById('qrModalImage').src = booking.qrCode;
    document.getElementById('qrModalRef').textContent = booking.bookingRef;
    document.getElementById('qrModalBackdrop').classList.add('show');
  }
  document.getElementById('qrModalClose').onclick = () => document.getElementById('qrModalBackdrop').classList.remove('show');
  document.getElementById('qrModalDoneBtn').onclick = () => document.getElementById('qrModalBackdrop').classList.remove('show');

  // ==================== MY BOOKINGS ====================
  async function loadBookings() {
    const { bookings } = await api('/bookings');
    const { properties } = await api('/properties');
    const { slots } = await api('/slots');
    const tbody = document.getElementById('bookingsTableBody');
    tbody.innerHTML = bookings.length ? bookings.slice().reverse().map(b => {
      const prop = properties.find(p => p.id === b.propertyId);
      const slot = slots.find(s => s.id === b.slotId);
      const canView = b.qrCode ? `<button class="btn btn-ghost btn-sm view-qr" data-id="${b.id}">View QR</button>` : '';
      return `<tr>
        <td class="mono">${b.bookingRef}</td>
        <td>${prop ? prop.name : '—'}</td>
        <td class="slot-code">${slot ? slot.code : '—'}</td>
        <td>${fmtDateTime(b.startTime)} → ${fmtDateTime(b.endTime)}</td>
        <td>${fmtCurrency(b.amount)}</td>
        <td><span class="badge ${b.status}">${b.status.replace('_',' ')}</span></td>
        <td>${canView}</td>
      </tr>`;
    }).join('') : `<tr><td colspan="7"><div class="empty-state"><div class="glyph">📋</div>No bookings yet</div></td></tr>`;
    tbody.querySelectorAll('.view-qr').forEach(btn => {
      btn.onclick = () => {
        const b = bookings.find(x => x.id === Number(btn.dataset.id));
        showQrModal(b);
      };
    });
  }

  // ==================== FIND MY CAR ====================
  document.getElementById('findCarBtn').onclick = async () => {
    const vn = document.getElementById('findCarInput').value.trim();
    const resultEl = document.getElementById('findCarResult');
    if (!vn) return;
    try {
      const data = await api(`/bookings/find-car/${encodeURIComponent(vn)}`);
      resultEl.innerHTML = `
        <div class="card" style="background:var(--asphalt-800)">
          <table>
            <tr><td>Vehicle</td><td class="mono">${data.vehicleNumber}</td></tr>
            <tr><td>Property</td><td>${data.property}</td></tr>
            <tr><td>Floor</td><td>Floor ${data.floor}</td></tr>
            <tr><td>Slot</td><td class="slot-code">${data.slotCode}</td></tr>
            <tr><td>Status</td><td><span class="badge ${data.status}">${data.status.replace('_',' ')}</span></td></tr>
            <tr><td>Checked in</td><td>${fmtDateTime(data.checkedInAt)}</td></tr>
          </table>
        </div>`;
    } catch (err) {
      resultEl.innerHTML = `<div class="empty-state"><div class="glyph">🚫</div>${err.message}</div>`;
    }
  };

  // ==================== PAYMENTS ====================
  async function loadPayments() {
    const { payments } = await api('/payments/history');
    const { bookings } = await api('/bookings');
    const tbody = document.getElementById('paymentsTableBody');
    tbody.innerHTML = payments.length ? payments.slice().reverse().map(p => {
      const b = bookings.find(x => x.id === p.bookingId);
      return `<tr><td class="mono">${p.paymentId}</td><td class="mono">${b ? b.bookingRef : '—'}</td><td>${fmtCurrency(p.amount)}</td><td><span class="badge ${p.status}">${p.status}</span></td><td>${fmtDateTime(p.createdAt)}</td></tr>`;
    }).join('') : `<tr><td colspan="5"><div class="empty-state">No payments yet</div></td></tr>`;
  }

  // ==================== NOTIFICATIONS ====================
  async function loadNotifications() {
    const { notifications } = await api('/notifications');
    const list = document.getElementById('notifList');
    list.innerHTML = notifications.length ? notifications.map(n => `
      <div class="notif-item ${n.read ? '' : 'unread'}">
        <div class="icon">${n.title.toLowerCase().includes('payment') ? '₹' : '◔'}</div>
        <div style="flex:1">
          <div class="title">${n.title}</div>
          <div class="msg">${n.message}</div>
          <div class="time">${timeAgo(n.createdAt)}</div>
        </div>
      </div>`).join('') : `<div class="empty-state"><div class="glyph">🔔</div>You're all caught up</div>`;
    await api('/notifications/read-all', { method: 'PUT' });
  }
  document.getElementById('markAllReadBtn').onclick = async () => { await api('/notifications/read-all', { method: 'PUT' }); loadNotifications(); };

  // ==================== SECURITY SCAN ====================
  document.getElementById('scanBtn').onclick = async () => {
    const ref = document.getElementById('scanRefInput').value.trim().toUpperCase();
    const resultEl = document.getElementById('scanResult');
    if (!ref) return;
    try {
      const { booking } = await api(`/bookings/${ref}/scan`, { method: 'POST' });
      resultEl.innerHTML = `<div class="card" style="background:var(--sign-green-soft);border-color:var(--sign-green)">
        <b>${booking.status === 'checked_in' ? '✅ Vehicle checked in' : '✅ Vehicle checked out'}</b>
        <table style="margin-top:10px">
          <tr><td>Reference</td><td class="mono">${booking.bookingRef}</td></tr>
          <tr><td>Vehicle</td><td class="mono">${booking.vehicleNumber}</td></tr>
          <tr><td>Status</td><td><span class="badge ${booking.status}">${booking.status.replace('_',' ')}</span></td></tr>
        </table></div>`;
      toast('Booking verified', 'success');
    } catch (err) {
      resultEl.innerHTML = `<div class="empty-state"><div class="glyph">⚠️</div>${err.message}</div>`;
    }
  };

  // ==================== PROPERTIES (super admin) ====================
  async function loadProperties() {
    const { properties } = await api('/properties');
    const tbody = document.getElementById('propertiesTableBody');
    tbody.innerHTML = properties.map(p => `<tr><td>${p.name}</td><td>${p.type}</td><td>${p.city}</td><td>${p.floors}</td><td>${p.slotsPerFloor}</td></tr>`).join('');
  }
  document.getElementById('addPropertyBtn').onclick = () => document.getElementById('propModalBackdrop').classList.add('show');
  document.getElementById('propModalClose').onclick = () => document.getElementById('propModalBackdrop').classList.remove('show');
  document.getElementById('propSaveBtn').onclick = async () => {
    try {
      await api('/properties', { method: 'POST', body: {
        name: document.getElementById('propName').value.trim(),
        type: document.getElementById('propType').value,
        city: document.getElementById('propCity').value.trim(),
        floors: document.getElementById('propFloors').value,
        slotsPerFloor: document.getElementById('propSlots').value
      }});
      document.getElementById('propModalBackdrop').classList.remove('show');
      toast('Property created', 'success');
      loadProperties();
    } catch (err) { toast(err.message, 'error'); }
  };

  // ==================== USERS (super admin) ====================
  async function loadUsers() {
    const [{ users }, { properties }] = await Promise.all([api('/users'), api('/properties')]);
    const tbody = document.getElementById('usersTableBody');
    tbody.innerHTML = users.map(u => {
      const prop = properties.find(p => p.id === u.propertyId);
      return `<tr><td>${u.name}</td><td>${u.email}</td><td style="text-transform:capitalize">${u.role.replace('_',' ')}</td><td>${prop ? prop.name : '—'}</td></tr>`;
    }).join('');
    const propSel = document.getElementById('newUserProperty');
    propSel.innerHTML = `<option value="">None</option>` + properties.map(p => `<option value="${p.id}">${p.name}</option>`).join('');
  }
  document.getElementById('addUserBtn').onclick = () => document.getElementById('userModalBackdrop').classList.add('show');
  document.getElementById('userModalClose').onclick = () => document.getElementById('userModalBackdrop').classList.remove('show');
  document.getElementById('userSaveBtn').onclick = async () => {
    try {
      await api('/users', { method: 'POST', body: {
        name: document.getElementById('newUserName').value.trim(),
        email: document.getElementById('newUserEmail').value.trim(),
        password: document.getElementById('newUserPassword').value,
        role: document.getElementById('newUserRole').value,
        propertyId: document.getElementById('newUserProperty').value || null
      }});
      document.getElementById('userModalBackdrop').classList.remove('show');
      toast('Staff user created', 'success');
      loadUsers();
    } catch (err) { toast(err.message, 'error'); }
  };

  // ==================== ANALYTICS ====================
  async function loadAnalytics() {
    const { properties } = await api('/properties');
    const sel = document.getElementById('analyticsPropertySelect');
    if (!sel.dataset.loaded) {
      sel.innerHTML = properties.map(p => `<option value="${p.id}">${p.name}</option>`).join('');
      sel.dataset.loaded = '1';
      sel.onchange = renderAnalytics;
      if (user.role === 'property_manager' && user.propertyId) sel.value = user.propertyId;
    }
    renderAnalytics();
  }
  async function renderAnalytics() {
    const propertyId = document.getElementById('analyticsPropertySelect').value;
    const summary = await api(`/analytics/summary?propertyId=${propertyId}`);
    document.getElementById('analyticsStatCards').innerHTML =
      statCard('Occupancy Rate', Math.round((summary.occupancy.occupied + summary.occupancy.reserved) / (summary.occupancy.total || 1) * 100) + '%', 'amber') +
      statCard('Total Revenue', fmtCurrency(summary.revenue), 'green') +
      statCard('Total Bookings', summary.totalBookings) +
      statCard('Available Now', summary.occupancy.available, 'green');
    document.getElementById('mostUsedTableBody').innerHTML = summary.mostUsedSlots.length ?
      summary.mostUsedSlots.map(s => `<tr><td class="slot-code">${s.slotCode}</td><td>${s.count}</td></tr>`).join('') :
      `<tr><td colspan="2"><div class="empty-state">No booking data yet</div></td></tr>`;
    document.getElementById('peakHourDisplay').textContent = summary.totalBookings ? `${String(summary.peakHour).padStart(2,'0')}:00` : '—';
  }

  // ==================== ACTIVITY LOGS ====================
  async function loadLogs() {
    const { logs } = await api('/users/activity-logs');
    document.getElementById('logsTableBody').innerHTML = logs.length ? logs.map(l => `<tr><td>${l.action}</td><td class="mono">${l.details}</td><td>${timeAgo(l.createdAt)}</td></tr>`).join('') :
      `<tr><td colspan="3"><div class="empty-state">No activity yet</div></td></tr>`;
  }

  // ---------- init ----------
  navigateTo(items[0].id);
})();
