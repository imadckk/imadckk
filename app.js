// Supabase configuration
import { createClient } from 'https://esm.sh/@supabase/supabase-js'

const supabaseUrl = 'https://dorkygsgobhcagtqydjb.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRvcmt5Z3Nnb2JoY2FndHF5ZGpiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEwOTc0MzcsImV4cCI6MjA3NjY3MzQzN30.bNCo8Ijj2DIr-c34P7U-lb6QK69D8OzO2sCd6SOwaW0'
const supabase = createClient(supabaseUrl, supabaseKey);

let currentDate = new Date();
let currentLocationId = null; // Store selected location ID
let locations = [];

document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

async function initializeApp() {
    await loadLocations();
    setupEventListeners();
    
    // Auto-select first location if available
    if (locations.length > 0) {
        selectLocation(locations[0].id);
    }
    
    renderCalendar();
}

async function loadLocations() {
    try {
        const { data, error } = await supabase
            .from('locations')
            .select('*')
            .order('name');

        if (error) {
            console.error('Error loading locations:', error);
            return;
        }

        locations = data || [];
        console.log('Locations loaded:', locations);
        
        // Update location toggle buttons
        updateLocationButtons();
        
    } catch (error) {
        console.error('Error in loadLocations:', error);
    }
}

function updateLocationButtons() {
    const toggleContainer = document.querySelector('.btn-group');
    
    // Clear existing buttons (except the first one if it exists)
    const existingButtons = toggleContainer.querySelectorAll('.location-toggle');
    existingButtons.forEach(btn => {
        if (btn.dataset.location !== 'all') {
            btn.remove();
        }
    });

    // Create buttons for each location
    locations.forEach(location => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'btn btn-outline-primary location-toggle';
        button.dataset.location = location.id;
        button.textContent = location.name;
        
        button.addEventListener('click', () => {
            selectLocation(location.id);
        });
        
        toggleContainer.appendChild(button);
    });
}

function selectLocation(locationId) {
    currentLocationId = locationId;
    
    // Update button states
    document.querySelectorAll('.location-toggle').forEach(btn => {
        if (btn.dataset.location === locationId) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
    
    renderCalendar();
}

function setupEventListeners() {
    // Month navigation
    document.getElementById('prevMonth').addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() - 1);
        renderCalendar();
    });

    document.getElementById('nextMonth').addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() + 1);
        renderCalendar();
    });
}

async function renderCalendar() {
    const calendar = document.getElementById('calendar');
    const monthYear = document.getElementById('currentMonth');
    
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    monthYear.textContent = currentDate.toLocaleString('default', { 
        month: 'long', 
        year: 'numeric' 
    });

    calendar.innerHTML = '';

    // Create day headers
    const dayNames = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
    dayNames.forEach(day => {
        const dayHeader = document.createElement('div');
        dayHeader.className = 'calendar-day fw-bold text-center';
        dayHeader.textContent = day;
        calendar.appendChild(dayHeader);
    });

    // Get first day of month
    const firstDay = new Date(year, month, 1);
    
    // Add empty cells for days before the first day of month
    for (let i = 0; i < firstDay.getDay(); i++) {
        const emptyDay = document.createElement('div');
        emptyDay.className = 'calendar-day other-month';
        calendar.appendChild(emptyDay);
    }

    // Load date settings for the current month and selected location
    const dateSettings = await loadDateSettingsForMonth(year, month + 1);

    // Create days of the month
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    for (let day = 1; day <= daysInMonth; day++) {
        const dateString = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const dayElement = document.createElement('div');
        dayElement.className = 'calendar-day';
        dayElement.textContent = day;
        dayElement.title = dateString;

        // Add click handler for toggling availability
        dayElement.addEventListener('click', () => toggleDateAvailability(dateString));

        // Determine day status
        const isActive = getDayStatus(dateString, dateSettings);
        updateDayElementAppearance(dayElement, isActive, dateString);

        calendar.appendChild(dayElement);
    }
}

function updateDayElementAppearance(dayElement, isActive, dateString) {
    // Remove existing status classes
    dayElement.classList.remove('active-day', 'inactive-day');
    
    const currentLocation = locations.find(loc => loc.id === currentLocationId);
    const locationName = currentLocation ? currentLocation.name : 'Selected Location';
    
    if (isActive) {
        dayElement.classList.add('active-day');
        dayElement.title = `${dateString} - ${locationName} is available`;
    } else {
        dayElement.classList.add('inactive-day');
        dayElement.title = `${dateString} - ${locationName} is unavailable`;
    }
}

async function loadDateSettingsForMonth(year, month) {
    if (!currentLocationId) return [];

    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const endDate = `${year}-${String(month).padStart(2, '0')}-${new Date(year, month, 0).getDate()}`;

    try {
        const { data, error } = await supabase
            .from('date_settings')
            .select('*')
            .eq('location_id', currentLocationId)
            .gte('date', startDate)
            .lte('date', endDate);

        if (error) {
            console.error('Error loading date settings:', error);
            return [];
        }

        return data || [];
    } catch (error) {
        console.error('Error in loadDateSettingsForMonth:', error);
        return [];
    }
}

function getDayStatus(dateString, dateSettings) {
    if (!currentLocationId) return true; // Default to active if no location selected
    
    const setting = dateSettings.find(s => s.date === dateString);
    return setting ? setting.is_active : true; // Default to active if no setting exists
}

async function toggleDateAvailability(dateString) {
    if (!currentLocationId) {
        alert('Please select a location first.');
        return;
    }

    try {
        // Check current status
        const { data: existingSetting } = await supabase
            .from('date_settings')
            .select('*')
            .eq('date', dateString)
            .eq('location_id', currentLocationId)
            .single();

        const newStatus = !(existingSetting?.is_active ?? true);

        if (existingSetting) {
            // Update existing setting
            const { error } = await supabase
                .from('date_settings')
                .update({ 
                    is_active: newStatus,
                    reason: newStatus ? 'Available' : 'Unavailable'
                })
                .eq('id', existingSetting.id);

            if (error) throw error;
        } else {
            // Create new setting
            const { error } = await supabase
                .from('date_settings')
                .insert([{
                    date: dateString,
                    location_id: currentLocationId,
                    is_active: newStatus,
                    reason: newStatus ? 'Available' : 'Unavailable'
                }]);

            if (error) throw error;
        }

        // Refresh the calendar
        renderCalendar();

    } catch (error) {
        console.error('Error toggling availability:', error);
        alert('Error updating availability. Please try again.');
    }
}

// Utility function to add sample data (optional)
async function addSampleLocations() {
    const sampleLocations = [
        { name: 'Downtown Office', description: 'Main office location' },
        { name: 'Uptown Branch', description: 'Secondary branch location' }
    ];

    for (const loc of sampleLocations) {
        const { data, error } = await supabase
            .from('locations')
            .insert([loc])
            .select();

        if (error) {
            console.error('Error creating location:', error);
        } else {
            console.log('Created location:', data[0]);
        }
    }
}


// addSampleLocations();
