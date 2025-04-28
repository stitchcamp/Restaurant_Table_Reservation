document.addEventListener("DOMContentLoaded", function () {
  // DOM Elements
  const viewTablesBtn = document.getElementById('view-tables-btn');
  const viewReservationsBtn = document.getElementById('view-reservations-btn');
  const tablesSection = document.getElementById('tables-section');
  const reservationsSection = document.getElementById('reservations-section');
  const tablesList = document.getElementById('tables-list');
  const reservationsList = document.getElementById('reservations-list');
  const tableSelect = document.getElementById('table-select');
  const reservationForm = document.getElementById('reservation-form');
  const editModal = document.getElementById('edit-modal');
  const closeModal = document.querySelector('.close-modal');
  const editForm = document.getElementById('edit-form');
  const editTableSelect = document.getElementById('edit-table');
  const notification = document.getElementById('notification');
  const dateInput = document.getElementById('date');

  const API_BASE_URL = '/api';
  const today = new Date();
  const formattedDate = today.toISOString().split('T')[0];
  dateInput.value = formattedDate;
  dateInput.min = formattedDate;

  // Event Listeners
  viewTablesBtn.addEventListener('click', () => {
    viewTablesBtn.classList.add('active');
    viewReservationsBtn.classList.remove('active');
    tablesSection.classList.add('active-section');
    reservationsSection.classList.remove('active-section');
    loadTables();
  });

  viewReservationsBtn.addEventListener('click', () => {
    viewReservationsBtn.classList.add('active');
    viewTablesBtn.classList.remove('active');
    reservationsSection.classList.add('active-section');
    tablesSection.classList.remove('active-section');
    loadReservations();
  });

  closeModal.addEventListener('click', () => {
    editModal.style.display = 'none';
  });

  window.addEventListener('click', (e) => {
    if (e.target === editModal) {
      editModal.style.display = 'none';
    }
  });

  // Functions
  async function loadTables() {
    try {
      tablesList.innerHTML = '<div class="loading">Loading available tables...</div>';
      const response = await fetch(`${API_BASE_URL}/tables?_=${Date.now()}`);
      if (!response.ok) throw new Error('Failed to fetch tables');

      const tables = await response.json();
      renderTables(tables);
    } catch (error) {
      console.error('Error loading tables:', error);
      tablesList.innerHTML = '<p>Error loading tables. Please try again later.</p>';
      showNotification('Error loading tables', 'error');
    }
  }

  function renderTables(tables) {
    tablesList.innerHTML = '';
    tableSelect.innerHTML = '<option value="">Select a table</option>';
    editTableSelect.innerHTML = '<option value="">Select a table</option>';

    tables.forEach(table => {
      const tableCard = document.createElement('div');
      tableCard.className = `table-card ${table.isAvailable ? '' : 'unavailable'}`;
      tableCard.innerHTML = `
        <span class="table-status ${table.isAvailable ? 'status-available' : 'status-unavailable'}">
          ${table.isAvailable ? 'Available' : 'Reserved'}
        </span>
        <div class="table-number">Table ${table.number}</div>
        <div class="table-capacity">
          <i class="fas fa-user"></i> ${table.capacity} ${table.capacity === 1 ? 'person' : 'people'}
        </div>
      `;
      tablesList.appendChild(tableCard);

      // Add to reservation form dropdown
      if (table.isAvailable) {
        const option = document.createElement('option');
        option.value = table.id;
        option.textContent = `Table ${table.number} (${table.capacity} ${table.capacity === 1 ? 'person' : 'people'})`;
        tableSelect.appendChild(option);
      }

      // Add to edit form dropdown (mark unavailable)
      const editOption = document.createElement('option');
      editOption.value = table.id;
      editOption.textContent = `Table ${table.number} (${table.capacity} ${table.capacity === 1 ? 'person' : 'people'})`;
      if (!table.isAvailable) {
        editOption.disabled = true;
        editOption.textContent += ' - Reserved';
      }
      editTableSelect.appendChild(editOption);
    });
  }

  async function loadReservations() {
    try {
      reservationsList.innerHTML = '<div class="loading">Loading reservations...</div>';
      const response = await fetch(`${API_BASE_URL}/reservations?_=${Date.now()}`);
      if (!response.ok) throw new Error('Failed to fetch reservations');

      const reservations = await response.json();
      renderReservations(reservations);
    } catch (error) {
      console.error('Error loading reservations:', error);
      reservationsList.innerHTML = '<p>Error loading reservations. Please try again later.</p>';
      showNotification('Error loading reservations', 'error');
    }
  }

  function renderReservations(reservations) {
    reservationsList.innerHTML = '';
    
    if (reservations.length === 0) {
      reservationsList.innerHTML = '<p>No reservations found.</p>';
      return;
    }

    reservations.forEach(reservation => {
      const reservationCard = document.createElement('div');
      reservationCard.className = 'reservation-card';
      
      const reservationDate = new Date(`${reservation.date}T${reservation.time}`);
      const formattedDate = reservationDate.toLocaleDateString('en-US', {
        weekday: 'short', year: 'numeric', month: 'short', day: 'numeric'
      });
      const formattedTime = reservationDate.toLocaleTimeString('en-US', {
        hour: '2-digit', minute: '2-digit'
      });

      reservationCard.innerHTML = `
        <div class="reservation-info">
          <h4>${reservation.name}</h4>
          <div class="reservation-date">${formattedDate} at ${formattedTime}</div>
        </div>
        <div class="reservation-details">
          <div class="detail-item"><i class="fas fa-table"></i> Table ${reservation.tableNumber}</div>
          <div class="detail-item"><i class="fas fa-users"></i> ${reservation.guests} guests</div>
          <div class="detail-item"><i class="fas fa-phone"></i> ${reservation.phone}</div>
        </div>
        <div class="reservation-actions">
          <button class="btn-edit" data-id="${reservation.id}">Edit</button>
          <button class="btn-cancel" data-id="${reservation.id}">Cancel</button>
        </div>
      `;

      reservationCard.querySelector('.btn-edit').addEventListener('click', () => {
        openEditModal(reservation);
      });

      reservationCard.querySelector('.btn-cancel').addEventListener('click', async () => {
        if (confirm('Are you sure you want to cancel this reservation?')) {
          await cancelReservation(reservation.id);
        }
      });

      reservationsList.appendChild(reservationCard);
    });
  }

  function openEditModal(reservation) {
    document.getElementById('edit-id').value = reservation.id;
    document.getElementById('edit-name').value = reservation.name;
    document.getElementById('edit-phone').value = reservation.phone;
    document.getElementById('edit-guests').value = reservation.guests;
    document.getElementById('edit-table').value = reservation.tableId;
    document.getElementById('edit-date').value = reservation.date;
    document.getElementById('edit-time').value = reservation.time;
    editModal.style.display = 'block';
  }

  async function cancelReservation(id) {
    try {
      const response = await fetch(`${API_BASE_URL}/reservations/${id}`, { 
        method: 'DELETE' 
      });
      const result = await response.json();

      if (!response.ok) throw new Error(result.error || 'Failed to cancel reservation');
      
      showNotification(result.message || 'Reservation canceled');
      await Promise.all([loadTables(), loadReservations()]);
    } catch (error) {
      console.error('Cancel error:', error);
      showNotification(error.message || 'Failed to cancel reservation', 'error');
    }
  }

  // Form Handlers
  reservationForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(reservationForm);
    const reservationData = {
      name: formData.get('name'),
      phone: formData.get('phone'),
      date: formData.get('date'),
      time: formData.get('time'),
      tableId: formData.get('tableId'),
      guests: parseInt(formData.get('guests'))
    };

    try {
      showNotification('Processing reservation...', 'info');
      const response = await fetch(`${API_BASE_URL}/reservations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reservationData)
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to reserve');

      showNotification(result.message || 'Reservation created!');
      reservationForm.reset();
      dateInput.value = formattedDate;
      await Promise.all([loadTables(), loadReservations()]);
      viewReservationsBtn.click();
    } catch (error) {
      console.error('Reservation error:', error);
      showNotification(error.message || 'Failed to create reservation', 'error');
    }
  });

  editForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    try {
      const id = document.getElementById('edit-id').value;
      const updatedData = {
        name: document.getElementById('edit-name').value.trim(),
        phone: document.getElementById('edit-phone').value.trim(),
        guests: parseInt(document.getElementById('edit-guests').value),
        tableId: parseInt(document.getElementById('edit-table').value),
        date: document.getElementById('edit-date').value,
        time: document.getElementById('edit-time').value
      };

      // Basic client-side validation
      if (!updatedData.name || isNaN(updatedData.guests) || !updatedData.tableId) {
        throw new Error('Please fill all required fields');
      }

      showNotification('Updating reservation...', 'info');
      
      const response = await fetch(`${API_BASE_URL}/reservations/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedData)
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to update reservation');

      showNotification(result.message || 'Reservation updated successfully!');
      editModal.style.display = 'none';
      
      // Force refresh both views
      await Promise.all([loadTables(), loadReservations()]);
      
      // Switch to reservations view if needed
      if (tablesSection.classList.contains('active-section')) {
        viewReservationsBtn.click();
      }
    } catch (error) {
      console.error('Update error:', error);
      showNotification(error.message || 'Failed to update reservation', 'error');
    }
  });

  function showNotification(message, type = 'success') {
    notification.textContent = message;
    notification.className = `notification ${type}`;
    notification.style.display = 'block';
    setTimeout(() => {
      notification.style.display = 'none';
    }, 3000);
  }

  // Initialize
  viewTablesBtn.click();
});