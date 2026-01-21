const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'si_japri.db');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
    // 1. Ruangan
    db.run(`CREATE TABLE IF NOT EXISTS rooms (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        status TEXT DEFAULT 'Available'
    )`);

    // 2. Guru
    db.run(`CREATE TABLE IF NOT EXISTS teachers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL
    )`);

    // 3. Kelas
    db.run(`CREATE TABLE IF NOT EXISTS classes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL
    )`);

    // 4. Jadwal
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

    // Seed Data
    const rooms = [
        'RPS Konsorsium Coding', 'RPS Konsorsium Jaringan', 'RPS Konsorsium IoT', 'Lab Sija 1', 'Lab Sija 2'
    ];
    rooms.forEach(name => {
        db.run(`INSERT OR IGNORE INTO rooms (name) SELECT ? WHERE NOT EXISTS (SELECT 1 FROM rooms WHERE name = ?)`, [name, name]);
    });

    const teachers = [
        'Sri Herawan Kusuma S.Kom', 'Gunawan Wibisono S.Kom', 'Idiarso S.Kom', 'Hermanto S.Pd', 
        'Syaefudin Aji Negara S.Pd GR', 'Kuntoro Triatmoko S.Kom', 'Sidik Nurcahyo S.Pd', 
        'Kiat Uji Purwani S.Kom', 'Endah Yuliani S.Pd', 'Eko Santoso S.Pd'
    ];
    teachers.forEach(name => {
        db.run(`INSERT OR IGNORE INTO teachers (name) SELECT ? WHERE NOT EXISTS (SELECT 1 FROM teachers WHERE name = ?)`, [name, name]);
    });

    const classes = [
        '10 PPLG 1', '10 PPLG 2', '10 PPLG 3', '11 SIJA 1', '11 SIJA 2', '11 SIJA 3', '12 SIJA 1', '12 SIJA 2', '12 SIJA 3'
    ];
    classes.forEach(name => {
        db.run(`INSERT OR IGNORE INTO classes (name) SELECT ? WHERE NOT EXISTS (SELECT 1 FROM classes WHERE name = ?)`, [name, name]);
    });

    console.log("Database initialized and seeded.");
});

db.close();
