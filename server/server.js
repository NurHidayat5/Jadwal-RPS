const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
const port = 3000;
const dbPath = path.join(__dirname, 'si_japri.db');
const db = new sqlite3.Database(dbPath);

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, '../public')));

// Inisialisasi Database
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS rooms (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, status TEXT DEFAULT 'Available')`);
    db.run(`CREATE TABLE IF NOT EXISTS teachers (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL)`);
    db.run(`CREATE TABLE IF NOT EXISTS classes (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL)`);
    db.run(`CREATE TABLE IF NOT EXISTS schedules (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        room_id INTEGER,
        teacher_id INTEGER,
        class_id INTEGER,
        day TEXT,
        start_time TEXT,
        end_time TEXT,
        FOREIGN KEY (room_id) REFERENCES rooms(id),
        FOREIGN KEY (teacher_id) REFERENCES teachers(id),
        FOREIGN KEY (class_id) REFERENCES classes(id)
    )`);

    // Seed Data Dasar jika kosong
    db.get("SELECT count(*) as count FROM rooms", (err, row) => {
        if (row && row.count === 0) {
            const rooms = ['RPS Konsorsium Coding', 'RPS Konsorsium Jaringan', 'RPS Konsorsium IoT', 'Lab Sija 1', 'Lab Sija 2'];
            rooms.forEach(name => db.run(`INSERT INTO rooms (name) VALUES (?)`, [name]));

            const teachers = ['Sri Herawan Kusuma S.Kom', 'Gunawan Wibisono S.Kom', 'Idiarso S.Kom', 'Hermanto S.Pd', 'Syaefudin Aji Negara S.Pd GR', 'Kuntoro Triatmoko S.Kom', 'Sidik Nurcahyo S.Pd', 'Kiat Uji Purwani S.Kom', 'Endah Yuliani S.Pd', 'Eko Santoso S.Pd'];
            teachers.forEach(name => db.run(`INSERT INTO teachers (name) VALUES (?)`, [name]));

            const classes = ['10 PPLG 1', '10 PPLG 2', '10 PPLG 3', '11 SIJA 1', '11 SIJA 2', '11 SIJA 3', '12 SIJA 1', '12 SIJA 2', '12 SIJA 3'];
            classes.forEach(name => db.run(`INSERT INTO classes (name) VALUES (?)`, [name]));
            console.log("Master data seeded.");
        }
    });

    // Fitur: Jadwal Acak Otomatis (Simulation Mode)
    db.get("SELECT count(*) as count FROM schedules", (err, row) => {
        if (row && row.count === 0) {
            const days = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat'];
            const now = new Date();
            const dayNames = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
            const today = dayNames[now.getDay()];

            for (let i = 0; i < 20; i++) {
                const roomId = Math.floor(Math.random() * 5) + 1;
                const teacherId = Math.floor(Math.random() * 10) + 1;
                const classId = Math.floor(Math.random() * 9) + 1;
                const start = Math.floor(Math.random() * 8) + 1;
                const end = start + Math.floor(Math.random() * 3) + 1;

                // Pastikan setidaknya 8 jadwal ada di hari ini agar dashboard terlihat "Busy"
                const day = (i < 8) ? (today === "Minggu" || today === "Sabtu" ? "Senin" : today) : days[Math.floor(Math.random() * days.length)];

                db.run(`INSERT INTO schedules (room_id, teacher_id, class_id, day, start_time, end_time) 
                        VALUES (?, ?, ?, ?, ?, ?)`, [roomId, teacherId, classId, day, start, end]);
            }
            console.log("Empty schedules table detected. Automatic random schedules generated!");
        }
    });
});

// API Endpoints
app.get('/api/rooms', (req, res) => {
    db.all("SELECT * FROM rooms", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.get('/api/teachers', (req, res) => {
    db.all("SELECT * FROM teachers", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.get('/api/classes', (req, res) => {
    db.all("SELECT * FROM classes", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.get('/api/schedules', (req, res) => {
    const { teacher_id, room_id } = req.query;
    let query = `
        SELECT s.*, r.name as room_name, COALESCE(t.name, 'Tamu/Manual') as teacher_name, c.name as class_name
        FROM schedules s
        JOIN rooms r ON s.room_id = r.id
        LEFT JOIN teachers t ON s.teacher_id = t.id
        JOIN classes c ON s.class_id = c.id
        WHERE 1=1
    `;
    const params = [];
    if (teacher_id) { query += ` AND s.teacher_id = ?`; params.push(teacher_id); }
    if (room_id) { query += ` AND s.room_id = ?`; params.push(room_id); }
    query += ` ORDER BY s.id DESC`;

    db.all(query, params, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.get('/api/schedules/now', (req, res) => {
    const query = `
        SELECT s.*, r.name as room_name, COALESCE(t.name, 'Tamu/Manual') as teacher_name, c.name as class_name
        FROM schedules s
        JOIN rooms r ON s.room_id = r.id
        LEFT JOIN teachers t ON s.teacher_id = t.id
        JOIN classes c ON s.class_id = c.id
    `;
    db.all(query, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.post('/api/schedules', (req, res) => {
    const { room_id, teacher_id, class_id, day, start_time, end_time } = req.body;

    // Conflict Validation
    const checkQuery = `SELECT * FROM schedules WHERE room_id = ? AND day = ? AND (
        (CAST(start_time AS INTEGER) < ? AND CAST(end_time AS INTEGER) > ?) OR
        (CAST(start_time AS INTEGER) >= ? AND CAST(start_time AS INTEGER) < ?)
    )`;
    db.get(checkQuery, [room_id, day, end_time, start_time, start_time, end_time], (err, row) => {
        if (row) return res.status(400).json({ error: "Jadwal bentrok dengan kegiatan lain!" });

        const insertQuery = `INSERT INTO schedules (room_id, teacher_id, class_id, day, start_time, end_time) VALUES (?, ?, ?, ?, ?, ?)`;
        db.run(insertQuery, [room_id, teacher_id, class_id, day, start_time, end_time], function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ id: this.lastID, message: "Jadwal berhasil ditambahkan" });
        });
    });
});

app.delete('/api/schedules/:id', (req, res) => {
    db.run("DELETE FROM schedules WHERE id = ?", req.params.id, function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: "Jadwal dihapus" });
    });
});

app.listen(port, () => {
    console.log(`Server berjalan di http://localhost:${port}`);
});
