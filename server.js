const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Enhanced CORS configuration
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Database simulation
const db = {
  tables: [
    { id: 1, number: 1, capacity: 2, isAvailable: true },
    { id: 2, number: 2, capacity: 2, isAvailable: true },
    { id: 3, number: 3, capacity: 4, isAvailable: true },
    { id: 4, number: 4, capacity: 4, isAvailable: true },
    { id: 5, number: 5, capacity: 6, isAvailable: true },
    { id: 6, number: 6, capacity: 8, isAvailable: true }
  ],
  reservations: []
};

// Helper functions
const findTableById = (id) => {
  const table = db.tables.find(t => t.id === parseInt(id));
  if (!table) throw new Error('Table not found');
  return table;
};

const findReservationById = (id) => {
  const reservation = db.reservations.find(r => r.id === id);
  if (!reservation) throw new Error('Reservation not found');
  return reservation;
};

// Validation middleware
const validateReservation = (req, res, next) => {
  try {
    const { name, guests, tableId, time, date } = req.body;
    
    if (!name?.trim()) throw new Error('Name is required');
    if (!guests) throw new Error('Guest count is required');
    if (!tableId) throw new Error('Table ID is required');
    if (!time) throw new Error('Time is required');
    if (!date) throw new Error('Date is required');

    if (isNaN(guests)) throw new Error('Guest count must be a number');
    if (parseInt(guests) <= 0) throw new Error('Guest count must be positive');

    const table = findTableById(tableId);
    if (!table.isAvailable && req.method !== 'PUT') {
      throw new Error('Table is already reserved');
    }
    if (parseInt(guests) > table.capacity) {
      throw new Error(`Table capacity exceeded (max ${table.capacity} guests)`);
    }

    next();
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// API Endpoints
app.get('/api/tables', (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.json(db.tables);
});

app.post('/api/reservations', validateReservation, (req, res) => {
  try {
    const { name, guests, tableId, time, date, phone } = req.body;
    const table = findTableById(tableId);
    
    const newReservation = {
      id: Date.now().toString(),
      name: name.trim(),
      guests: parseInt(guests),
      tableId: parseInt(tableId),
      tableNumber: table.number,
      time,
      date,
      phone: phone?.trim() || '',
      createdAt: new Date()
    };

    table.isAvailable = false;
    db.reservations.push(newReservation);

    res.status(201).json({
      success: true,
      message: `Table ${table.number} reserved for ${newReservation.name}`,
      reservation: newReservation,
      tables: db.tables
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      error: error.message || 'Failed to create reservation'
    });
  }
});

app.get('/api/reservations', (req, res) => {
  const sortedReservations = [...db.reservations].sort((a, b) => 
    new Date(b.createdAt) - new Date(a.createdAt)
  );
  res.json(sortedReservations);
});

app.put('/api/reservations/:id', validateReservation, (req, res) => {
  try {
    const { id } = req.params;
    const { name, guests, tableId, time, date, phone } = req.body;
    
    const reservation = findReservationById(id);
    const oldTable = findTableById(reservation.tableId);
    const newTable = findTableById(tableId);

    // If changing tables
    if (parseInt(tableId) !== reservation.tableId) {
      oldTable.isAvailable = true;
      newTable.isAvailable = false;
    }

    // Update reservation details
    reservation.name = name?.trim() || reservation.name;
    reservation.guests = parseInt(guests) || reservation.guests;
    reservation.tableId = parseInt(tableId);
    reservation.tableNumber = newTable.number;
    reservation.time = time || reservation.time;
    reservation.date = date || reservation.date;
    reservation.phone = phone?.trim() || reservation.phone;
    reservation.updatedAt = new Date();

    res.json({
      success: true,
      message: `Reservation updated for ${reservation.name}`,
      updatedReservation: reservation,
      updatedTables: db.tables  // Include the current table states
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to update reservation'
    });
  }
});

app.delete('/api/reservations/:id', (req, res) => {
  try {
    const { id } = req.params;
    const reservation = findReservationById(id);
    const table = findTableById(reservation.tableId);

    table.isAvailable = true;
    db.reservations = db.reservations.filter(r => r.id !== id);

    res.json({
      success: true,
      message: `Reservation canceled for ${reservation.name}`,
      reservation,
      tables: db.tables
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to cancel reservation'
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});