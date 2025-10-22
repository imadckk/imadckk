// Supabase configuration
const supabaseUrl = 'https://dorkygsgobhcagtqydjb.supabase.co'
const supabaseKey = process.env.SUPABASE_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

let currentDate = new Date();
let currentView = 'all'; // 'all', 'location-a', 'location-b'
let locations = [];

document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

async function initializeApp() {
    await loadLocations();
    setupEventListeners();
    renderCalendar();
}

async function loadLocations() {
    const { data, error } = await supabase
        .from('locations')
        .select('*')
        .order('name');

    if (error) {
        console.error('Error loading locations:', error);
        return;
    }

    locations = data;
}

function setupEventListeners() {
    // Location toggle
    document.querySelectorAll('.location-toggle').forEach(button => {
        button.addEventListener('click', function() {
            document.querySelectorAll('.location-toggle').forEach(btn => {
                btn.classList.remove('active');
            });
            this.classList.add('active');
            currentView = this.dataset.location;
            renderCalendar();
        });
    });

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

    // Load date settings for the current month
    const dateSettings = await loadDateSettingsForMonth(year, month + 1);

    // Create days of the month
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    for (let day = 1; day <= daysInMonth; day++) {
        const dateString = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const dayElement = document.createElement('div');
        dayElement.className = 'calendar-day';
        dayElement.textContent = day;
        dayElement.title = dateString;

        // Determine day status based on current view
        const dayStatus = getDayStatus(dateString, dateSettings);
        if (dayStatus === 'all-active' || dayStatus === 'active') {
            dayElement.classList.add('active-day');
        } else if (dayStatus === 'all-inactive' || dayStatus === 'inactive') {
            dayElement.classList.add('inactive-day');
        } else if (dayStatus === 'mixed') {
            dayElement.classList.add('inactive-day');
            dayElement.title += ' (Mixed availability - check specific locations)';
        }

        calendar.appendChild(dayElement);
    }
}

async function loadDateSettingsForMonth(year, month) {
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const endDate = `${year}-${String(month).padStart(2, '0')}-${new Date(year, month, 0).getDate()}`;

    const { data, error } = await supabase
        .from('date_settings')
        .select('*')
        .in('location_id', locations.map(loc => loc.id))
        .gte('date', startDate)
        .lte('date', endDate);

    if (error) {
        console.error('Error loading date settings:', error);
        return [];
    }

    return data;
}

function getDayStatus(dateString, dateSettings) {
    const daySettings = dateSettings.filter(setting => setting.date === dateString);
    
    if (currentView === 'all') {
        if (daySettings.length === 0) return 'all-active'; // No settings = all active
        const activeCount = daySettings.filter(setting => setting.is_active).length;
        if (activeCount === locations.length) return 'all-active';
        if (activeCount === 0) return 'all-inactive';
        return 'mixed';
    } else {
        const locationId = currentView === 'location-a' ? locations[0]?.id : locations[1]?.id;
        const setting = daySettings.find(s => s.location_id === locationId);
        return setting ? (setting.is_active ? 'active' : 'inactive') : 'active';
    }
}
