const API_URL = 'http://localhost:3000/api';

// --- NAVIGASI SPA ---
document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        const targetPage = link.getAttribute('data-page');

        document.querySelectorAll('.nav-link').forEach(nl => nl.classList.remove('active'));
        link.classList.add('active');

        document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
        document.getElementById(`page-${targetPage}`).classList.add('active');

        if (targetPage === 'dashboard') updateDashboard();
        if (targetPage === 'filter') loadFilterOptions();
    });
});

// --- TOAST NOTIFICATION ---
function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    const icon = type === 'success' ? '✅' : '❌';
    toast.innerHTML = `<span>${icon}</span> <span>${message}</span>`;

    container.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100%)';
        toast.style.transition = 'all 0.3s ease-in';
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

// --- LOGIKA WAKTU SEKOLAH ---
const schoolClock = [
    { jam: 1, start: "07:00", end: "07:45" },
    { jam: 2, start: "07:45", end: "08:30" },
    { jam: 3, start: "08:30", end: "09:15" },
    { jam: 4, start: "09:15", end: "10:00" },
    { jam: 5, start: "10:15", end: "11:00" },
    { jam: 6, start: "11:00", end: "11:45" },
    { jam: 7, start: "11:45", end: "12:30" },
    { jam: 8, start: "12:30", end: "13:15" },
    { jam: 9, start: "13:15", end: "14:00" },
    { jam: 10, start: "14:00", end: "14:45" },
    { jam: 11, start: "14:45", end: "15:30" },
    { jam: 12, start: "15:30", end: "16:15" },
];

function getCurrentSchoolInfo() {
    const now = new Date();
    const currentTime = now.getHours().toString().padStart(2, '0') + ":" + now.getMinutes().toString().padStart(2, '0');
    const dayNames = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
    const currentDay = dayNames[now.getDay()];

    if (currentTime >= "10:00" && currentTime < "10:15") return { isBreak: true, day: currentDay };
    const currentSlot = schoolClock.find(slot => currentTime >= slot.start && currentTime < slot.end);
    return { isBreak: false, jamKe: currentSlot ? currentSlot.jam : null, day: currentDay };
}

// --- DASHBOARD LOGIC ---
async function updateDashboard() {
    try {
        const roomsRes = await fetch(`${API_URL}/rooms`);
        const rooms = await roomsRes.json();
        const scRes = await fetch(`${API_URL}/schedules`);
        const allSchedules = await scRes.json();

        const schoolInfo = getCurrentSchoolInfo();
        const activeSchedules = allSchedules.filter(s => {
            return s.day === schoolInfo.day &&
                schoolInfo.jamKe >= parseInt(s.start_time) &&
                schoolInfo.jamKe <= parseInt(s.end_time);
        });

        renderRooms(rooms, activeSchedules, schoolInfo);
        renderActiveSchedules(activeSchedules, schoolInfo);
        renderOverallSchedules(allSchedules);
    } catch (error) {
        console.error("Gagal memuat data:", error);
    }
}

function renderRooms(rooms, activeSchedules, schoolInfo) {
    const grid = document.getElementById('room-grid');
    grid.innerHTML = '';
    rooms.forEach(room => {
        const isActive = activeSchedules.some(s => s.room_id === room.id);
        let statusClass = isActive ? 'status-in-use' : 'status-available';
        let statusText = isActive ? 'Terpakai' : 'Tersedia';

        if (schoolInfo.isBreak) {
            statusClass = 'status-available';
            statusText = 'ISTIRAHAT';
        }

        const card = document.createElement('div');
        card.className = 'room-card';
        card.innerHTML = `<h3>${room.name}</h3><span class="status-badge ${statusClass}">${statusText}</span>`;
        grid.appendChild(card);
    });
}

function renderActiveSchedules(schedules, schoolInfo) {
    const tableBody = document.getElementById('active-schedules');
    if (schoolInfo.isBreak) {
        tableBody.innerHTML = '<tr><td colspan="4" class="empty">☕ SEDANG JAM ISTIRAHAT (10:00 - 10:15)</td></tr>';
        return;
    }
    if (schedules.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="4" class="empty">Belum ada jadwal aktif saat ini.</td></tr>';
        return;
    }
    tableBody.innerHTML = schedules.map(s => `
        <tr><td>${s.room_name}</td><td>${s.teacher_name}</td><td>${s.class_name}</td><td>Jam ${s.start_time} - ${s.end_time}</td></tr>
    `).join('');
}

function renderOverallSchedules(schedules) {
    const tableBody = document.getElementById('all-dashboard-schedules');
    if (schedules.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="6" class="empty">Belum ada data jadwal.</td></tr>';
        return;
    }

    const schoolInfo = getCurrentSchoolInfo();
    const dayOrder = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat"];

    // Sort schedules by Day and then by Start Time
    const sortedSchedules = [...schedules].sort((a, b) => {
        const dayA = dayOrder.indexOf(a.day);
        const dayB = dayOrder.indexOf(b.day);
        if (dayA !== dayB) return dayA - dayB;
        return parseInt(a.start_time) - parseInt(b.start_time);
    });

    tableBody.innerHTML = sortedSchedules.map(s => {
        let statusText = "Akan Datang";
        let statusClass = "badge-upcoming";

        const now = new Date();
        const currentDayIndex = dayOrder.indexOf(schoolInfo.day);
        const scheduleDayIndex = dayOrder.indexOf(s.day);

        if (scheduleDayIndex < currentDayIndex) {
            statusText = "Selesai";
            statusClass = "badge-finished";
        } else if (scheduleDayIndex === currentDayIndex) {
            if (schoolInfo.jamKe > parseInt(s.end_time)) {
                statusText = "Selesai";
                statusClass = "badge-finished";
            } else if (schoolInfo.jamKe >= parseInt(s.start_time) && schoolInfo.jamKe <= parseInt(s.end_time)) {
                statusText = "Berlangsung";
                statusClass = "badge-ongoing";
            }
        }

        return `
            <tr>
                <td>${s.day}</td>
                <td>Jam ${s.start_time} - ${s.end_time}</td>
                <td>${s.room_name}</td>
                <td>${s.teacher_name}</td>
                <td>${s.class_name}</td>
                <td><span class="badge ${statusClass}">${statusText}</span></td>
            </tr>
        `;
    }).join('');
}

// --- FILTER LOGIC ---
async function loadFilterOptions() {
    const roomsRes = await fetch(`${API_URL}/rooms`);
    const teachersRes = await fetch(`${API_URL}/teachers`);
    const rooms = await roomsRes.json();
    const teachers = await teachersRes.json();

    const roomSelect = document.getElementById('filter-room');
    const teacherSelect = document.getElementById('filter-teacher');

    roomSelect.innerHTML = '<option value="">Pilih Ruangan...</option>' + rooms.map(r => `<option value="${r.id}">${r.name}</option>`).join('');
    teacherSelect.innerHTML = '<option value="">Pilih Guru...</option>' + teachers.map(t => `<option value="${t.id}">${t.name}</option>`).join('');

    window.allTeachers = teachers;
}

document.getElementById('filter-room').addEventListener('change', runFilter);
document.getElementById('filter-teacher').addEventListener('change', runFilter);

async function runFilter() {
    const roomId = document.getElementById('filter-room').value;
    const teacherId = document.getElementById('filter-teacher').value;

    let url = `${API_URL}/schedules?`;
    if (roomId) url += `room_id=${roomId}&`;
    if (teacherId) url += `teacher_id=${teacherId}&`;

    const res = await fetch(url);
    const results = await res.json();
    renderFilterResults(results);
}

function renderFilterResults(data) {
    const body = document.getElementById('filter-results-body');
    if (data.length === 0) {
        body.innerHTML = '<tr><td colspan="4" class="empty">Tidak ada jadwal ditemukan.</td></tr>';
        return;
    }
    body.innerHTML = data.map(s => `
        <tr><td>${s.day}</td><td>Jam ${s.start_time} - ${s.end_time}</td><td>${s.room_name} / ${s.teacher_name}</td><td>${s.class_name}</td></tr>
    `).join('');
}

// --- ADMIN LOGIC ---
const btnLogin = document.getElementById('btn-login');
if (btnLogin) {
    btnLogin.addEventListener('click', () => {
        const pass = document.getElementById('admin-pass').value;
        if (pass === 'admin123') {
            document.getElementById('admin-login-section').style.display = 'none';
            document.getElementById('admin-dashboard-section').style.display = 'block';
            loadAdminData();
            showToast("Login Berhasil!");
        } else {
            showToast("Password salah!", "error");
        }
    });
}

async function loadAdminData() {
    const [rooms, classes, resTeachers, resSchedules] = await Promise.all([
        fetch(`${API_URL}/rooms`).then(r => r.json()),
        fetch(`${API_URL}/classes`).then(r => r.json()),
        fetch(`${API_URL}/teachers`).then(r => r.json()),
        fetch(`${API_URL}/schedules`).then(r => r.json())
    ]);

    window.allTeachers = resTeachers;

    document.getElementById('form-room').innerHTML = rooms.map(r => `<option value="${r.id}">${r.name}</option>`).join('');
    document.getElementById('form-class').innerHTML = classes.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
    document.getElementById('teacher-list').innerHTML = resTeachers.map(t => `<option value="${t.name}">`).join('');

    renderAdminSchedules(resSchedules);
}

function renderAdminSchedules(schedules) {
    const body = document.getElementById('admin-schedules-body');
    body.innerHTML = schedules.map(s => `
        <tr>
            <td>${s.day}</td>
            <td>Jam ${s.start_time}-${s.end_time}</td>
            <td>${s.room_name}</td>
            <td>${s.teacher_name}</td>
            <td>${s.class_name}</td>
            <td><button class="btn-delete" onclick="deleteSchedule(${s.id})">Hapus</button></td>
        </tr>
    `).join('');
}

window.deleteSchedule = async function (id) {
    if (confirm("Hapus jadwal ini?")) {
        const res = await fetch(`${API_URL}/schedules/${id}`, { method: 'DELETE' });
        if (res.ok) {
            showToast("Jadwal dihapus!");
            loadAdminData();
        }
    }
}

document.getElementById('schedule-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const teacherName = document.getElementById('form-teacher-input').value;
    const selectedTeacher = window.allTeachers.find(t => t.name === teacherName);

    const payload = {
        day: document.getElementById('form-day').value,
        room_id: document.getElementById('form-room').value,
        class_id: document.getElementById('form-class').value,
        teacher_id: selectedTeacher ? selectedTeacher.id : null,
        start_time: document.getElementById('form-start').value,
        end_time: document.getElementById('form-end').value
    };

    const res = await fetch(`${API_URL}/schedules`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

    const result = await res.json();
    if (res.ok) {
        showToast(result.message);
        document.getElementById('add-schedule-modal').style.display = 'none';
        loadAdminData();
    } else {
        showToast(result.error, "error");
    }
});

document.getElementById('btn-show-add').addEventListener('click', () => {
    document.getElementById('add-schedule-modal').style.display = 'flex';
});

document.getElementById('btn-close-modal').addEventListener('click', () => {
    document.getElementById('add-schedule-modal').style.display = 'none';
});

document.getElementById('btn-logout').addEventListener('click', () => {
    location.reload();
});

// --- PRINT LOGIC ---
const printFunc = () => window.print();
document.getElementById('btn-print-filter').addEventListener('click', printFunc);
document.getElementById('btn-print-admin').addEventListener('click', printFunc);

// Update Waktu
function updateTime() {
    const now = new Date();
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' };
    const timeEl = document.getElementById('current-time');
    if (timeEl) timeEl.innerText = now.toLocaleDateString('id-ID', options);
}

setInterval(updateTime, 1000);
updateTime();
updateDashboard();
setInterval(updateDashboard, 30000); // Auto-refresh dashboard tiap 30 detik
