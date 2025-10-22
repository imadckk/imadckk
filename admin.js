// Supabase configuration
import { createClient } from 'https://esm.sh/@supabase/supabase-js'

const supabaseUrl = 'https://dorkygsgobhcagtqydjb.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRvcmt5Z3Nnb2JoY2FndHF5ZGpiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEwOTc0MzcsImV4cCI6MjA3NjY3MzQzN30.bNCo8Ijj2DIr-c34P7U-lb6QK69D8OzO2sCd6SOwaW0'
const supabase = createClient(supabaseUrl, supabaseKey);

// ✅ State
let currentDate = new Date();
let selectedLocation = null;
let selectedCalendarDate = null;
const cache = {}; // For month caching

// ✅ DOM Elements
const els = {
  calendar: document.getElementById('calendar'),
  currentMonth: document.getElementById('currentMonth'),
  locationSelect: document.getElementById('locationSelect'),
  datePicker: document.getElementById('datePicker'),
  statusSelect: document.getElementById('statusSelect'),
  reasonText: document.getElementById('reasonText'),
  dateDetails: document.getElementById('dateDetails'),
  selectedDate: document.getElementById('selectedDate'),
  saveDate: document.getElementById('saveDate'),
  cancelEdit: document.getElementById('cancelEdit'),
  prevMonth: document.getElementById('prevMonth'),
  nextMonth: document.getElementById('nextMonth'),
};

// ✅ Init
window.addEventListener('DOMContentLoaded', async () => {
  initDatePicker();
  await loadLocations();
  setupListeners();
  renderCalendar();
});

function formatLocalDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function initDatePicker() {
  flatpickr('#datePicker', {
    dateFormat: 'Y-m-d',
    onChange: ([date]) => {
      if (date && selectedLocation) showDateDetails(date);
    },
  });
}

async function loadLocations() {
  showLoading(true);
  const { data, error } = await supabase.from('locations').select('*').order('name');
  showLoading(false);

  if (error) return showToast('Error loading locations', 'error');

  els.locationSelect.innerHTML = '<option value="">Select a location</option>';
  data.forEach((loc) => {
    const opt = document.createElement('option');
    opt.value = loc.id;
    opt.textContent = loc.name;
    els.locationSelect.appendChild(opt);
  });
}

function setupListeners() {
  els.locationSelect.addEventListener('change', () => {
    selectedLocation = els.locationSelect.value;
    renderCalendar();
  });

  els.prevMonth.addEventListener('click', () => {
    currentDate.setMonth(currentDate.getMonth() - 1);
    renderCalendar();
  });

  els.nextMonth.addEventListener('click', () => {
    currentDate.setMonth(currentDate.getMonth() + 1);
    renderCalendar();
  });

  els.statusSelect.addEventListener('change', (e) => {
    els.reasonText.closest('.mb-3').style.display = e.target.value === 'false' ? 'block' : 'none';
  });

  els.saveDate.addEventListener('click', saveDateSettings);
  els.cancelEdit.addEventListener('click', hideDateDetails);
}

function renderCalendar() {
  if (!selectedLocation) return;
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  els.currentMonth.textContent = currentDate.toLocaleString('default', {
    month: 'long',
    year: 'numeric',
  });

  els.calendar.innerHTML = '';
  els.calendar.style.display = 'grid';
  els.calendar.style.gridTemplateColumns = 'repeat(7, 1fr)';

  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  daysOfWeek.forEach((d) => {
    const el = document.createElement('div');
    el.className = 'calendar-day fw-bold text-center';
    el.textContent = d;
    els.calendar.appendChild(el);
  });

  const firstDay = new Date(year, month, 1);
  const emptySlots = firstDay.getDay();
  for (let i = 0; i < emptySlots; i++) {
    els.calendar.appendChild(document.createElement('div'));
  }

  const totalDays = new Date(year, month + 1, 0).getDate();
  for (let d = 1; d <= totalDays; d++) {
    const date = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const el = document.createElement('div');
    el.className = 'calendar-day text-center';
    el.textContent = d;
    el.dataset.date = date;

    if (date === new Date().toISOString().split('T')[0]) el.classList.add('today');

    el.addEventListener('click', () => showDateDetails(new Date(date)));
    els.calendar.appendChild(el);
  }

  loadDateSettingsForMonth();
}

async function loadDateSettingsForMonth() {
  if (!selectedLocation) return;
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const key = `${selectedLocation}-${year}-${month}`;

  if (cache[key]) return renderDateSettings(cache[key]);

  const start = `${year}-${String(month + 1).padStart(2, '0')}-01`;
  const end = `${year}-${String(month + 1).padStart(2, '0')}-${new Date(year, month + 1, 0).getDate()}`;

  const { data, error } = await supabase
    .from('date_settings')
    .select('*')
    .eq('location_id', selectedLocation)
    .gte('date', start)
    .lte('date', end);

  if (error) return showToast('Error loading date settings', 'error');
  cache[key] = data;
  renderDateSettings(data);
}

function renderDateSettings(data) {
  data.forEach((item) => {
    const el = document.querySelector(`[data-date="${item.date}"]`);
    if (el) {
      el.classList.add(item.is_active ? 'active-day' : 'inactive-day');
      el.title = item.reason || (item.is_active ? 'Active' : 'Inactive');
    }
  });
}

async function showDateDetails(date) {
  selectedCalendarDate = date;
  const iso = formatLocalDate(date);
  els.selectedDate.textContent = date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const { data, error } = await supabase
    .from('date_settings')
    .select('*')
    .eq('location_id', selectedLocation)
    .eq('date', iso)
    .maybeSingle();

  if (error) console.error(error);

  els.statusSelect.value = data?.is_active?.toString() || 'true';
  els.reasonText.value = data?.reason || '';
  els.dateDetails.style.display = 'block';
}

async function saveDateSettings() {
  if (!selectedLocation || !selectedCalendarDate) return;

  const date = formatLocalDate(date);
  const is_active = els.statusSelect.value === 'true';
  const reason = els.reasonText.value.trim();

  const { error } = await supabase.from('date_settings').upsert(
    { location_id: selectedLocation, date, is_active, reason },
    { onConflict: 'location_id,date' }
  );

  if (error) return showToast('Error saving settings', 'error');

  // ✅ Clear cache for current month to ensure fresh reload
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const key = `${selectedLocation}-${year}-${month}`;
  delete cache[key];

  showToast('Settings saved successfully', 'success');
  hideDateDetails();
  renderCalendar(); // now re-renders with fresh data
}

// ✅ Utility: Toast + Loading
function showToast(msg, type = 'info') {
  const color =
    type === 'error' ? 'danger' : type === 'success' ? 'success' : 'secondary';
  const el = document.createElement('div');
  el.className = `toast align-items-center text-white bg-${color} border-0 position-fixed bottom-0 end-0 m-3`;
  el.role = 'alert';
  el.innerHTML = `<div class="d-flex"><div class="toast-body">${msg}</div><button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button></div>`;
  document.body.appendChild(el);
  const bsToast = new bootstrap.Toast(el, { delay: 3000 });
  bsToast.show();
  el.addEventListener('hidden.bs.toast', () => el.remove());
}

function showLoading(isLoading) {
  let loader = document.getElementById('loading');
  if (!loader) {
    loader = document.createElement('div');
    loader.id = 'loading';
    loader.className = 'text-center my-3';
    loader.innerHTML = '<div class="spinner-border text-primary"></div>';
    document.querySelector('.container').prepend(loader);
  }
  loader.classList.toggle('d-none', !isLoading);
}

