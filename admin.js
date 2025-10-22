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
