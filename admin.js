// Supabase configuration
import { createClient } from '@supabase/supabase-js'
const supabaseUrl = 'https://dorkygsgobhcagtqydjb.supabase.co'
const supabaseKey = process.env.SUPABASE_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

let currentDate = new Date();
let selectedLocation = null;
let selectedCalendarDate = null;

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    initializeDatePicker();
    loadLocations();
    renderCalendar();
    setupEventListeners();
});

function initializeDatePicker() {
    flatpickr("#datePicker", {
        dateFormat: "Y-m-d",
        onChange: function(selectedDates, dateStr) {
            if (dateStr && selectedLocation) {
                showDateDetails(new Date(dateStr));
            }
        }
    });
}

async function loadLocations() {
    const { data: locations, error } = await supabase
        .from('locations')
        .select('*')
        .order('name');

    if (error) {
        console.error('Error loading locations:', error);
        return;
    }

    const select = document.getElementById('locationSelect');
    select.innerHTML = '<option value="">Select a location</option>';
    
    locations.forEach(location => {
        const option = document.createElement('option');
        option.value = location.id;
        option.textContent = location.name;
        select.appendChild(option);
    });

    select.addEventListener('change', function() {
        selectedLocation = this.value;
        renderCalendar();
    });
}

function setupEventListeners() {
    document.getElementById('prevMonth').addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() - 1);
        renderCalendar();
    });

    document.getElementById('nextMonth').addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() + 1);
        renderCalendar();
    });

    document.getElementById('saveDate').addEventListener('click', saveDateSettings);
    document.getElementById('cancelEdit').addEventListener('click', hideDateDetails);
}

function renderCalendar() {
    if (!selectedLocation) return;

    const calendar = document.getElementById('calendar');
    const monthYear = document.getElementById('currentMonth');
    
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    monthYear.textContent = currentDate.toLocaleString('default', { 
        month: 'long', 
        year: 'numeric' 
    });

    // Get first day of month and number of days
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    
    calendar.innerHTML = '';

    // Create day headers
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    dayNames.forEach(day => {
        const dayHeader = document.createElement('div');
        dayHeader.className = 'calendar-day fw-bold text-center';
        dayHeader.textContent = day;
        calendar.appendChild(dayHeader);
    });

    // Add empty cells for days before the first day of month
    for (let i = 0; i < firstDay.getDay(); i++) {
        const emptyDay = document.createElement('div');
        emptyDay.className = 'calendar-day';
        calendar.appendChild(emptyDay);
    }

    // Create days of the month
    for (let day = 1; day <= daysInMonth; day++) {
        const dayElement = document.createElement('div');
        dayElement.className = 'calendar-day';
        dayElement.textContent = day;
        dayElement.dataset.date = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        
        dayElement.addEventListener('click', () => {
            showDateDetails(new Date(year, month, day));
        });
        
        calendar.appendChild(dayElement);
    }

    loadDateSettingsForMonth();
}

async function loadDateSettingsForMonth() {
    if (!selectedLocation) return;

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const startDate = `${year}-${String(month + 1).padStart(2, '0')}-01`;
    const endDate = `${year}-${String(month + 1).padStart(2, '0')}-${new Date(year, month + 1, 0).getDate()}`;

    const { data: dateSettings, error } = await supabase
        .from('date_settings')
        .select('*')
        .eq('location_id', selectedLocation)
        .gte('date', startDate)
        .lte('date', endDate);

    if (error) {
        console.error('Error loading date settings:', error);
        return;
    }

    // Update calendar display
    dateSettings.forEach(setting => {
        const dayElement = document.querySelector(`[data-date="${setting.date}"]`);
        if (dayElement) {
            dayElement.classList.add(setting.is_active ? 'active-day' : 'inactive-day');
            dayElement.title = setting.reason || (setting.is_active ? 'Active' : 'Inactive');
        }
    });
}

function showDateDetails(date) {
    selectedCalendarDate = date;
    const dateString = date.toISOString().split('T')[0];
    
    document.getElementById('selectedDate').textContent = 
        date.toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        });
    
    loadExistingDateSettings(dateString);
    document.getElementById('dateDetails').style.display = 'block';
}

async function loadExistingDateSettings(dateString) {
    const { data: existingSetting, error } = await supabase
        .from('date_settings')
        .select('*')
        .eq('location_id', selectedLocation)
        .eq('date', dateString)
        .single();

    if (error && error.code !== 'PGRST116') {
        console.error('Error loading date setting:', error);
    }

    if (existingSetting) {
        document.getElementById('statusSelect').value = existingSetting.is_active.toString();
        document.getElementById('reasonText').value = existingSetting.reason || '';
    } else {
        document.getElementById('statusSelect').value = 'true';
        document.getElementById('reasonText').value = '';
    }
}

async function saveDateSettings() {
    if (!selectedLocation || !selectedCalendarDate) return;

    const dateString = selectedCalendarDate.toISOString().split('T')[0];
    const isActive = document.getElementById('statusSelect').value === 'true';
    const reason = document.getElementById('reasonText').value;

    const { data, error } = await supabase
        .from('date_settings')
        .upsert({
            location_id: selectedLocation,
            date: dateString,
            is_active: isActive,
            reason: reason
        }, {
            onConflict: 'location_id,date'
        });

    if (error) {
        console.error('Error saving date settings:', error);
        alert('Error saving settings');
    } else {
        alert('Settings saved successfully');
        hideDateDetails();
        renderCalendar();
    }
}

function hideDateDetails() {
    document.getElementById('dateDetails').style.display = 'none';
    selectedCalendarDate = null;
}
