// Supabase configuration
import { createClient } from 'https://esm.sh/@supabase/supabase-js'

const supabaseUrl = 'https://dorkygsgobhcagtqydjb.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRvcmt5Z3Nnb2JoY2FndHF5ZGpiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEwOTc0MzcsImV4cCI6MjA3NjY3MzQzN30.bNCo8Ijj2DIr-c34P7U-lb6QK69D8OzO2sCd6SOwaW0'
const supabase = createClient(supabaseUrl, supabaseKey);

let currentDate = new Date();
let currentLocationId = null;
let locations = [];
let isInitialLoad = true;

document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

async function initializeApp() {
    await loadLocations();
    setupEventListeners();
    
    // Show instruction message instead of auto-loading calendar
    showInstructionMessage();
    
    // Don't render calendar until a location is selected
    isInitialLoad = false;
}

async function loadLocations() {
    try {
        console.log('Loading locations from database...');
        
        const { data, error } = await supabase
            .from('locations')
            .select('id, name, description')
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
    
    // Clear existing buttons
    toggleContainer.innerHTML = '';

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

    // If no locations found, show message
    if (locations.length === 0) {
        const message = document.createElement('button');
        message.type = 'button';
        message.className = 'btn btn-outline-secondary';
        message.textContent = 'No locations found';
        message.disabled = true;
        toggleContainer.appendChild(message);
    }
}

function showInstructionMessage() {
    const calendar = document.getElementById('calendar');
    calendar.innerHTML = `
        <div class="text-center py-5">
            <div class="mb-3">
                <i class="fas fa-mouse-pointer fa-2x text-muted"></i>
            </div>
            <h5 class="text-muted">Select a location to view availability</h5>
            <p class="text-muted small">Click on any location button above to load the calendar</p>
        </div>
    `;
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
    
    // Update calendar title with location name
    const currentLocation = locations.find(loc => loc.id === locationId);
    if (currentLocation) {
        document.querySelector('h1').textContent = `${currentLocation.name} Availability Calendar`;
    }
    
    // Only render calendar when a location is actively selected
    renderCalendar();
}

function setupEventListeners() {
    // Month navigation
    document.getElementById('prevMonth').addEventListener('click', () => {
        if (!currentLocationId) {
            alert('Please select a location first.');
            return;
        }
        currentDate.setMonth(currentDate.getMonth() - 1);
        renderCalendar();
    });

    document.getElementById('nextMonth').addEventListener('click', () => {
        if (!currentLocationId) {
            alert('Please select a location first.');
            return;
        }
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

    // Show loading state
    calendar.innerHTML = `
        <div class="text-center py-4">
            <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Loading...</span>
            </div>
            <p class="mt-2 text-muted">Loading calendar...</p>
        </div>
    `;

    // Create day headers
    const dayNames = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
    
    // Load date settings for the current month and selected location
    const dateSettings = await loadDateSettingsForMonth(year, month + 1);

    // Now render the actual calendar
    calendar.innerHTML = '';

    // Create day headers
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

    // Create days of the month
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    for (let day = 1; day <= daysInMonth; day++) {
        const dateString = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const dayElement = document.createElement('div');
        dayElement.className = 'calendar-day';
        dayElement.textContent = day;

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
    const locationName = currentLocation ? currentLocation.name : 'Location';
    
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
    if (!currentLocationId) return true;
    
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
        const { data: existingSetting, error: fetchError } = await supabase
            .from('date_settings')
            .select('*')
            .eq('date', dateString)
            .eq('location_id', currentLocationId)
            .single();

        if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 = no rows returned
            console.error('Error fetching current setting:', fetchError);
            return;
        }

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
// addSampleLocations();
