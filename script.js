// === Firebase Configuration ===
const firebaseConfig = {
    apiKey: "AIzaSyC_0SHbfCbTj6RnTxF-x0XidtUGdd0KEUc",
    authDomain: "smart-solar-panel-5fcad.firebaseapp.com",
    databaseURL: "https://smart-solar-panel-5fcad-default-rtdb.firebaseio.com",
    projectId: "smart-solar-panel-5fcad",
    storageBucket: "smart-solar-panel-5fcad.firebasestorage.app",
    messagingSenderId: "838897086464",
    appId: "1:838897086464:web:1725c3c535c9f976d8e8e5"
};

// Initialize Firebase
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

const database = firebase.database();
const solarRef = database.ref('solar_system');

// === Configuration & State ===
const MAX_DATA_POINTS = 15;

// Chart configuration data
const chartThemes = {
    power: { color: '#facc15', bg: 'rgba(250, 204, 21, 0.1)' },
    panelV: { color: '#38bdf8', bg: 'rgba(56, 189, 248, 0.1)' },
    batteryV: { color: '#34d399', bg: 'rgba(52, 211, 153, 0.1)' }
};

const powerData = { labels: [], datasets: [{ label: 'Solar Power (W)', data: [], borderColor: chartThemes.power.color, backgroundColor: chartThemes.power.bg, fill: true, tension: 0.4, borderWidth: 2, pointRadius: 0, pointHitRadius: 10 }] };
const panelVoltageData = { labels: [], datasets: [{ label: 'Panel Voltage (V)', data: [], borderColor: chartThemes.panelV.color, backgroundColor: chartThemes.panelV.bg, fill: true, tension: 0.4, borderWidth: 2, pointRadius: 0, pointHitRadius: 10 }] };
const batteryVoltageData = { labels: [], datasets: [{ label: 'Battery Voltage (V)', data: [], borderColor: chartThemes.batteryV.color, backgroundColor: chartThemes.batteryV.bg, fill: true, tension: 0.4, borderWidth: 2, pointRadius: 0, pointHitRadius: 10 }] };

let chartPower, chartPanelVoltage, chartBatteryVoltage;

// === Initialization ===
document.addEventListener('DOMContentLoaded', () => {
    initCharts();
    setupFirebaseListener();
});

function initCharts() {
    const commonOptions = {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 600, easing: 'easeOutQuart' },
        scales: {
            x: {
                display: true,
                grid: { display: false },
                ticks: { color: '#64748b', maxTicksLimit: 6, maxRotation: 0 }
            },
            y: {
                display: true,
                grid: { color: 'rgba(255,255,255,0.03)', drawBorder: false },
                ticks: { color: '#64748b', font: {family: 'Outfit'} }
            }
        },
        plugins: {
            legend: { display: false },
            tooltip: {
                mode: 'index',
                intersect: false,
                backgroundColor: 'rgba(15, 17, 21, 0.9)',
                titleColor: '#f8fafc',
                bodyColor: '#e2e8f0',
                borderColor: 'rgba(255,255,255,0.1)',
                borderWidth: 1,
                padding: 10,
                displayColors: false,
                titleFont: { family: 'Outfit', size: 13 },
                bodyFont: { family: 'Outfit', size: 14, weight: 'bold' }
            }
        },
        interaction: { mode: 'nearest', axis: 'x', intersect: false }
    };

    const enhanceOptions = (opts, minVal) => {
        let newOpts = JSON.parse(JSON.stringify(opts));
        if (minVal !== undefined) newOpts.scales.y.min = minVal;
        return newOpts;
    };

    const ctxPower = document.getElementById('chartPower').getContext('2d');
    chartPower = new Chart(ctxPower, { type: 'line', data: powerData, options: enhanceOptions(commonOptions, 0) });

    const ctxPanelVoltage = document.getElementById('chartPanelVoltage').getContext('2d');
    chartPanelVoltage = new Chart(ctxPanelVoltage, { type: 'line', data: panelVoltageData, options: enhanceOptions(commonOptions, 0) });

    const ctxBatteryVoltage = document.getElementById('chartBatteryVoltage').getContext('2d');
    chartBatteryVoltage = new Chart(ctxBatteryVoltage, { type: 'line', data: batteryVoltageData, options: enhanceOptions(commonOptions, 9) }); // Zoom in on battery range
}

function setupFirebaseListener() {
    solarRef.on('value', (snapshot) => {
        const data = snapshot.val();
        if(data) {
            updateDashboard(data);
            setConnectionStatus(true);
        } else {
            console.warn("No data found at 'solar_system' node.");
        }
    }, (error) => {
        console.error("Firebase error:", error);
        setConnectionStatus(false, error.message);
    });
}

function setConnectionStatus(isLive, errorMsg = '') {
    const dot = document.getElementById('connection_dot');
    const text = document.getElementById('connection_status');
    
    if (isLive) {
        dot.className = 'dot pulsing live';
        text.innerText = 'System Live';
    } else {
        dot.className = 'dot';
        dot.style.backgroundColor = '#fb7185';
        text.innerText = 'Disconnected';
    }
}

// === Dashboard Update Logic ===
function updateDashboard(data) {
    const now = new Date();
    const timeStr = now.getHours().toString().padStart(2, '0') + ':' + 
                    now.getMinutes().toString().padStart(2, '0') + ':' + 
                    now.getSeconds().toString().padStart(2, '0');

    // Extract values handling potential spaces in Firebase keys
    const powerVal = data['solar power'] !== undefined ? data['solar power'] : data.solar_power;
    const battVolVal = data['battery voltage'] !== undefined ? data['battery voltage'] : data.battery_voltage;
    const panelVolVal = data['panel voltage'] !== undefined ? data['panel voltage'] : data.panel_voltage;

    // Update Simple Values
    animateValue('val_solar_power', powerVal);
    animateValue('val_battery_voltage', battVolVal);
    animateValue('val_panel_angle', data.panel_angle, 0); // No decimals for angle
    
    animateValue('val_light_intensity', data.light_intensity, 0);
    animateValue('val_panel_current', data.panel_current);
    animateValue('val_panel_voltage', panelVolVal);

    // Update Status Badge
    updateStatusBadge(data.charging_status);

    // Update Gauges
    const maxPower = 150; // Watts
    const maxAngle = 180; // Degrees

    updateGauge('gauge_power', powerVal, maxPower);
    // Use battery_level directly as a percentage (0-100)
    updateGauge('gauge_battery', data.battery_level, 100); 
    updateGauge('gauge_angle', data.panel_angle, maxAngle);

    // Update Charts
    updateChartData(chartPower, timeStr, powerVal);
    updateChartData(chartPanelVoltage, timeStr, panelVolVal);
    updateChartData(chartBatteryVoltage, timeStr, battVolVal);

    // Evaluate Alerts
    evaluateAlerts(data);
}

function animateValue(id, newValue, decimals = 1) {
    const el = document.getElementById(id);
    if (!el || newValue === undefined) return;
    
    // Smooth transition effect purely via value assignment 
    // Additional counter animation could go here, but strict assignment is safer for high-frequency RTDB events
    el.innerText = typeof newValue === 'number' ? newValue.toFixed(decimals) : newValue;
}

function updateStatusBadge(status) {
    const el = document.getElementById('val_charging_status');
    if (!el) return;
    
    el.innerText = status || "UNKNOWN";
    if (status === 'ON') {
        el.className = 'status-badge status-on';
    } else if (status === 'OFF') {
        el.className = 'status-badge status-off';
    } else {
        el.className = 'status-badge';
    }
}

function updateGauge(id, value, maxVal) {
    const el = document.getElementById(id);
    if (!el || value === undefined) return;
    
    let percentage = (value / maxVal) * 100;
    percentage = Math.max(0, Math.min(100, percentage));
    
    el.style.width = percentage + '%';
}

function updateChartData(chart, label, dataPoint) {
    if(!chart || dataPoint === undefined) return;
    
    const data = chart.data;
    if (data.labels.length >= MAX_DATA_POINTS) {
        data.labels.shift();
        data.datasets[0].data.shift();
    }
    
    data.labels.push(label);
    data.datasets[0].data.push(dataPoint);
    chart.update();
}

// === Alerts Evaluation System ===
function evaluateAlerts(data) {
    const container = document.getElementById('alerts_container');
    if(!container) return;

    let alerts = [];

    // Condition 1: Battery Voltage < 11.5
    if (data.battery_voltage !== undefined && data.battery_voltage < 11.5) {
        alerts.push({ type: 'danger', icon: 'fa-battery-quarter', msg: 'CRITICAL: Battery voltage has fallen below 11.5V! System may shut down.' });
    }

    // Condition 2: Solar Power = 0 during daytime (assuming light > 200 lux is daytime)
    if (data.solar_power !== undefined && data.light_intensity !== undefined) {
        if (data.solar_power === 0 && data.light_intensity > 200) {
            alerts.push({ type: 'warning', icon: 'fa-sun-dust', msg: 'WARNING: Solar power generation is 0W despite daylight conditions. Check panel.' });
        }
    }

    // Condition 3: Charging status is OFF
    if (data.charging_status === 'OFF') {
        alerts.push({ type: 'warning', icon: 'fa-plug-circle-xmark', msg: 'CAUTION: Charging status is currently OFF. Battery is not receiving power.' });
    }

    // Condition 4: Excessive panel angle (just an extra safety example)
    if (data.panel_angle !== undefined && (data.panel_angle < 0 || data.panel_angle > 180)) {
        alerts.push({ type: 'warning', icon: 'fa-up-down-left-right', msg: 'WARNING: Panel angle is out of standard tracking bounds (0-180°).' });
    }

    // Render Alerts
    container.innerHTML = '';
    
    if (alerts.length === 0) {
        renderAlert(container, { type: 'info', icon: 'fa-circle-check', msg: 'System operating optimally. All metrics nominal.' });
    } else {
        alerts.forEach(alert => renderAlert(container, alert));
    }
}

function renderAlert(container, alert) {
    const div = document.createElement('div');
    div.className = `alert item ${alert.type}`;
    div.innerHTML = `<i class="fa-solid ${alert.icon}"></i> <span>${alert.msg}</span>`;
    container.appendChild(div);
}
