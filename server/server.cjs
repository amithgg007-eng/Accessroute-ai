const express = require("express");
const cors = require("cors");
const Database = require("better-sqlite3");

const app = express();
const PORT = 3001;
const db = new Database("barriers.db");

app.use(cors());

// Base64 images are sent inside JSON. 15 MB gives enough room for a
// 5 MB original image plus Base64/JSON overhead.
app.use(express.json({ limit: "15mb" }));

// ======================================================
// DATABASE
// ======================================================

db.prepare(`
  CREATE TABLE IF NOT EXISTS barriers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL,
    description TEXT,
    latitude REAL NOT NULL,
    longitude REAL NOT NULL,
    image TEXT,
    severity TEXT DEFAULT 'Medium',
    status TEXT DEFAULT 'active',
    confirm_count INTEGER DEFAULT 0,
    fixed_count INTEGER DEFAULT 0,
    last_verified DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`).run();

db.prepare(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`).run();

db.prepare(`
  CREATE TABLE IF NOT EXISTS communities (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    description TEXT DEFAULT '',
    creator_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (creator_id) REFERENCES users(id)
  )
`).run();

db.prepare(`
  CREATE TABLE IF NOT EXISTS community_members (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    community_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(community_id, user_id),
    FOREIGN KEY (community_id) REFERENCES communities(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
  )
`).run();

// ======================================================
// SAFE MIGRATIONS FOR EXISTING barriers.db
// ======================================================

function addColumnIfMissing(sql, label) {
    try {
        db.prepare(sql).run();
        console.log(`${label} column added`);
    } catch {
        // Column already exists.
    }
}

addColumnIfMissing(
    "ALTER TABLE barriers ADD COLUMN image TEXT",
    "image"
);
addColumnIfMissing(
    "ALTER TABLE barriers ADD COLUMN severity TEXT DEFAULT 'Medium'",
    "severity"
);
addColumnIfMissing(
    "ALTER TABLE barriers ADD COLUMN status TEXT DEFAULT 'active'",
    "status"
);
addColumnIfMissing(
    "ALTER TABLE barriers ADD COLUMN confirm_count INTEGER DEFAULT 0",
    "confirm_count"
);
addColumnIfMissing(
    "ALTER TABLE barriers ADD COLUMN fixed_count INTEGER DEFAULT 0",
    "fixed_count"
);
addColumnIfMissing(
    "ALTER TABLE barriers ADD COLUMN last_verified DATETIME",
    "last_verified"
);

db.prepare(`
  UPDATE barriers
  SET severity = 'Medium'
  WHERE severity IS NULL OR severity = ''
`).run();

db.prepare(`
  UPDATE barriers
  SET status = 'active'
  WHERE status IS NULL OR status = ''
`).run();

db.prepare(`
  UPDATE barriers
  SET confirm_count = 0
  WHERE confirm_count IS NULL
`).run();

db.prepare(`
  UPDATE barriers
  SET fixed_count = 0
  WHERE fixed_count IS NULL
`).run();

console.log("Database ready");


// ======================================================
// BUILDINGS - COMMUNITY ACCESSIBILITY
// ======================================================

db.prepare(`
  CREATE TABLE IF NOT EXISTS buildings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    type TEXT DEFAULT 'Other',
    description TEXT DEFAULT '',
    latitude REAL NOT NULL,
    longitude REAL NOT NULL,
    image TEXT,
    lift TEXT DEFAULT 'Unknown',
    ramp TEXT DEFAULT 'Unknown',
    accessible_entrance TEXT DEFAULT 'Unknown',
    accessible_toilet TEXT DEFAULT 'Unknown',
    accessible_parking TEXT DEFAULT 'Unknown',
    stairs TEXT DEFAULT 'Unknown',
    floor_info TEXT DEFAULT '',
    status TEXT DEFAULT 'active',
    confirm_count INTEGER DEFAULT 0,
    changed_count INTEGER DEFAULT 0,
    last_verified DATETIME,
    created_by INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id)
  )
`).run();

for (const [sql, label] of [
    ["ALTER TABLE buildings ADD COLUMN image TEXT", "building image"],
    ["ALTER TABLE buildings ADD COLUMN lift TEXT DEFAULT 'Unknown'", "lift"],
    ["ALTER TABLE buildings ADD COLUMN ramp TEXT DEFAULT 'Unknown'", "ramp"],
    ["ALTER TABLE buildings ADD COLUMN accessible_entrance TEXT DEFAULT 'Unknown'", "accessible entrance"],
    ["ALTER TABLE buildings ADD COLUMN accessible_toilet TEXT DEFAULT 'Unknown'", "accessible toilet"],
    ["ALTER TABLE buildings ADD COLUMN accessible_parking TEXT DEFAULT 'Unknown'", "accessible parking"],
    ["ALTER TABLE buildings ADD COLUMN stairs TEXT DEFAULT 'Unknown'", "stairs"],
    ["ALTER TABLE buildings ADD COLUMN floor_info TEXT DEFAULT ''", "floor info"],
    ["ALTER TABLE buildings ADD COLUMN status TEXT DEFAULT 'active'", "building status"],
    ["ALTER TABLE buildings ADD COLUMN confirm_count INTEGER DEFAULT 0", "building confirmations"],
    ["ALTER TABLE buildings ADD COLUMN changed_count INTEGER DEFAULT 0", "building changes"],
    ["ALTER TABLE buildings ADD COLUMN last_verified DATETIME", "building last verified"],
    ["ALTER TABLE buildings ADD COLUMN created_by INTEGER", "building creator"],
]) {
    try { db.prepare(sql).run(); console.log(`${label} column added`); } catch { }
}

function buildingRow(row) {
    if (!row) return null;
    return {
        id: row.id,
        name: row.name,
        type: row.type || 'Other',
        description: row.description || '',
        latitude: row.latitude,
        longitude: row.longitude,
        location: [row.latitude, row.longitude],
        image: row.image || null,
        lift: row.lift || 'Unknown',
        ramp: row.ramp || 'Unknown',
        accessibleEntrance: row.accessible_entrance || 'Unknown',
        accessibleToilet: row.accessible_toilet || 'Unknown',
        accessibleParking: row.accessible_parking || 'Unknown',
        stairs: row.stairs || 'Unknown',
        floorInfo: row.floor_info || '',
        status: row.status || 'active',
        confirmCount: row.confirm_count || 0,
        changedCount: row.changed_count || 0,
        lastVerified: row.last_verified,
        createdBy: row.created_by,
        createdAt: row.created_at,
    };
}

app.get('/api/buildings', (req, res) => {
    try {
        const rows = db.prepare(`
      SELECT * FROM buildings
      WHERE status = 'active'
      ORDER BY created_at DESC
    `).all();
        res.json(rows.map(buildingRow));
    } catch (error) {
        console.error('Get buildings error:', error);
        res.status(500).json({ error: 'Failed to load building reports' });
    }
});

app.post('/api/buildings', (req, res) => {
    try {
        const {
            name, type, description, latitude, longitude, image,
            lift, ramp, accessibleEntrance, accessibleToilet,
            accessibleParking, stairs, floorInfo, createdBy,
        } = req.body || {};

        if (!name || !String(name).trim()) {
            return res.status(400).json({ error: 'Building name is required' });
        }
        if (!Number.isFinite(Number(latitude)) || !Number.isFinite(Number(longitude))) {
            return res.status(400).json({ error: 'Valid latitude and longitude are required' });
        }
        if (image && String(image).length > 15_000_000) {
            return res.status(413).json({ error: 'Image is too large. Please use an image smaller than 5 MB.' });
        }

        const allowed = ['Yes', 'No', 'Unknown'];
        const safe = (value) => allowed.includes(value) ? value : 'Unknown';

        const result = db.prepare(`
      INSERT INTO buildings (
        name, type, description, latitude, longitude, image,
        lift, ramp, accessible_entrance, accessible_toilet,
        accessible_parking, stairs, floor_info, status,
        confirm_count, changed_count, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', 0, 0, ?)
    `).run(
            String(name).trim(), String(type || 'Other'), String(description || ''),
            Number(latitude), Number(longitude), image ? String(image) : null,
            safe(lift), safe(ramp), safe(accessibleEntrance), safe(accessibleToilet),
            safe(accessibleParking), safe(stairs), String(floorInfo || ''),
            Number.isFinite(Number(createdBy)) ? Number(createdBy) : null,
        );

        const row = db.prepare('SELECT * FROM buildings WHERE id = ?').get(result.lastInsertRowid);
        res.status(201).json(buildingRow(row));
    } catch (error) {
        console.error('Create building error:', error);
        res.status(500).json({ error: 'Failed to save building report' });
    }
});

app.patch('/api/buildings/:id/confirm', (req, res) => {
    try {
        const id = Number(req.params.id);
        if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid building ID' });
        const result = db.prepare(`
      UPDATE buildings
      SET confirm_count = COALESCE(confirm_count, 0) + 1,
          last_verified = CURRENT_TIMESTAMP
      WHERE id = ? AND status = 'active'
    `).run(id);
        if (!result.changes) return res.status(404).json({ error: 'Building not found' });
        res.json({ message: 'Building information confirmed', building: buildingRow(db.prepare('SELECT * FROM buildings WHERE id = ?').get(id)) });
    } catch (error) {
        console.error('Confirm building error:', error);
        res.status(500).json({ error: 'Failed to confirm building information' });
    }
});

app.patch('/api/buildings/:id/changed', (req, res) => {
    try {
        const id = Number(req.params.id);
        if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid building ID' });
        const result = db.prepare(`
      UPDATE buildings
      SET changed_count = COALESCE(changed_count, 0) + 1,
          last_verified = CURRENT_TIMESTAMP
      WHERE id = ? AND status = 'active'
    `).run(id);
        if (!result.changes) return res.status(404).json({ error: 'Building not found' });
        res.json({ message: 'Community reported that information may have changed', building: buildingRow(db.prepare('SELECT * FROM buildings WHERE id = ?').get(id)) });
    } catch (error) {
        console.error('Changed building error:', error);
        res.status(500).json({ error: 'Failed to report changed information' });
    }
});

app.patch('/api/buildings/:id/resolved', (req, res) => {
    try {
        const id = Number(req.params.id);
        if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid building ID' });
        const result = db.prepare(`UPDATE buildings SET status = 'resolved', last_verified = CURRENT_TIMESTAMP WHERE id = ?`).run(id);
        if (!result.changes) return res.status(404).json({ error: 'Building not found' });
        res.json({ message: 'Building report marked as resolved', id, status: 'resolved' });
    } catch (error) {
        console.error('Resolve building error:', error);
        res.status(500).json({ error: 'Failed to resolve building report' });
    }
});

// ======================================================
// AUTH
// Prototype note: passwords are stored directly here.
// For real deployment, use password hashing + sessions/JWT.
// ======================================================

app.post("/api/auth/register", (req, res) => {
    try {
        const { name, email, password } = req.body || {};

        if (!name || !email || !password) {
            return res.status(400).json({
                error: "Name, email and password are required",
            });
        }

        const cleanName = String(name).trim();
        const cleanEmail = String(email).trim().toLowerCase();
        const cleanPassword = String(password);

        if (cleanName.length < 2) {
            return res.status(400).json({
                error: "Name must contain at least 2 characters",
            });
        }

        if (cleanPassword.length < 4) {
            return res.status(400).json({
                error: "Password must contain at least 4 characters",
            });
        }

        const existing = db.prepare(`
      SELECT id FROM users WHERE email = ?
    `).get(cleanEmail);

        if (existing) {
            return res.status(409).json({
                error: "An account with this email already exists",
            });
        }

        const result = db.prepare(`
      INSERT INTO users (name, email, password)
      VALUES (?, ?, ?)
    `).run(cleanName, cleanEmail, cleanPassword);

        const user = db.prepare(`
      SELECT id, name, email, created_at
      FROM users
      WHERE id = ?
    `).get(result.lastInsertRowid);

        res.status(201).json({
            message: "Account created successfully",
            user,
        });
    } catch (error) {
        console.error("Register error:", error);
        res.status(500).json({ error: "Failed to create account" });
    }
});

app.post("/api/auth/login", (req, res) => {
    try {
        const { email, password } = req.body || {};

        if (!email || !password) {
            return res.status(400).json({
                error: "Email and password are required",
            });
        }

        const user = db.prepare(`
      SELECT id, name, email, password, created_at
      FROM users
      WHERE email = ?
    `).get(String(email).trim().toLowerCase());

        if (!user || user.password !== String(password)) {
            return res.status(401).json({
                error: "Invalid email or password",
            });
        }

        res.json({
            message: "Login successful",
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                created_at: user.created_at,
            },
        });
    } catch (error) {
        console.error("Login error:", error);
        res.status(500).json({ error: "Failed to login" });
    }
});

// ======================================================
// BARRIERS - GET ACTIVE
// ======================================================

app.get("/api/barriers", (req, res) => {
    try {
        const rows = db.prepare(`
      SELECT
        id,
        type,
        description,
        latitude,
        longitude,
        image,
        severity,
        status,
        confirm_count,
        fixed_count,
        last_verified,
        created_at
      FROM barriers
      WHERE status = 'active'
      ORDER BY created_at DESC
    `).all();

        res.json(
            rows.map((barrier) => ({
                id: barrier.id,
                type: barrier.type,
                description: barrier.description || "",
                location: [barrier.latitude, barrier.longitude],
                latitude: barrier.latitude,
                longitude: barrier.longitude,
                image: barrier.image || null,
                severity: barrier.severity || "Medium",
                status: barrier.status,
                confirmCount: barrier.confirm_count || 0,
                fixedCount: barrier.fixed_count || 0,
                lastVerified: barrier.last_verified,
                createdAt: barrier.created_at,
            }))
        );
    } catch (error) {
        console.error("Error loading barriers:", error);
        res.status(500).json({ error: "Failed to load barriers" });
    }
});

// ======================================================
// BARRIERS - CREATE
// ======================================================

app.post("/api/barriers", (req, res) => {
    try {
        const {
            type,
            description,
            latitude,
            longitude,
            image,
            severity,
        } = req.body || {};

        if (!type) {
            return res.status(400).json({
                error: "Barrier type is required",
            });
        }

        if (
            latitude === undefined ||
            longitude === undefined ||
            !Number.isFinite(Number(latitude)) ||
            !Number.isFinite(Number(longitude))
        ) {
            return res.status(400).json({
                error: "Valid latitude and longitude are required",
            });
        }

        if (image && String(image).length > 15_000_000) {
            return res.status(413).json({
                error: "Image is too large. Please use an image smaller than 5 MB.",
            });
        }

        const allowedSeverities = [
            "Critical",
            "High",
            "Medium",
            "Low",
        ];

        const safeSeverity = allowedSeverities.includes(severity)
            ? severity
            : "Medium";

        const result = db.prepare(`
      INSERT INTO barriers (
        type,
        description,
        latitude,
        longitude,
        image,
        severity,
        status,
        confirm_count,
        fixed_count
      )
      VALUES (?, ?, ?, ?, ?, ?, 'active', 0, 0)
    `).run(
            String(type),
            String(description || ""),
            Number(latitude),
            Number(longitude),
            image ? String(image) : null,
            safeSeverity
        );

        const barrier = db.prepare(`
      SELECT
        id,
        type,
        description,
        latitude,
        longitude,
        image,
        severity,
        status,
        confirm_count,
        fixed_count,
        last_verified,
        created_at
      FROM barriers
      WHERE id = ?
    `).get(result.lastInsertRowid);

        res.status(201).json({
            id: barrier.id,
            type: barrier.type,
            description: barrier.description || "",
            location: [barrier.latitude, barrier.longitude],
            latitude: barrier.latitude,
            longitude: barrier.longitude,
            image: barrier.image || null,
            severity: barrier.severity || "Medium",
            status: barrier.status,
            confirmCount: barrier.confirm_count || 0,
            fixedCount: barrier.fixed_count || 0,
            lastVerified: barrier.last_verified,
            createdAt: barrier.created_at,
        });
    } catch (error) {
        console.error("Error creating barrier:", error);
        res.status(500).json({
            error: "Failed to save barrier",
        });
    }
});

// ======================================================
// COMMUNITY - CONFIRM BARRIER
// ======================================================

app.patch("/api/barriers/:id/confirm", (req, res) => {
    try {
        const id = Number(req.params.id);

        if (Number.isNaN(id)) {
            return res.status(400).json({ error: "Invalid barrier ID" });
        }

        const barrier = db.prepare(`
      SELECT id, status
      FROM barriers
      WHERE id = ?
    `).get(id);

        if (!barrier) {
            return res.status(404).json({ error: "Barrier not found" });
        }

        if (barrier.status !== "active") {
            return res.status(400).json({
                error: "This barrier is already resolved",
            });
        }

        db.prepare(`
      UPDATE barriers
      SET
        confirm_count = COALESCE(confirm_count, 0) + 1,
        last_verified = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(id);

        const updated = db.prepare(`
      SELECT
        id,
        confirm_count,
        fixed_count,
        last_verified,
        status
      FROM barriers
      WHERE id = ?
    `).get(id);

        res.json({
            message: "Barrier confirmed by community",
            id: updated.id,
            confirmCount: updated.confirm_count,
            fixedCount: updated.fixed_count,
            lastVerified: updated.last_verified,
            status: updated.status,
        });
    } catch (error) {
        console.error("Confirm barrier error:", error);
        res.status(500).json({
            error: "Failed to confirm barrier",
        });
    }
});

// ======================================================
// COMMUNITY - REPORT BARRIER AS FIXED
// ======================================================

app.patch("/api/barriers/:id/community-fixed", (req, res) => {
    try {
        const id = Number(req.params.id);

        if (Number.isNaN(id)) {
            return res.status(400).json({ error: "Invalid barrier ID" });
        }

        const barrier = db.prepare(`
      SELECT id, status
      FROM barriers
      WHERE id = ?
    `).get(id);

        if (!barrier) {
            return res.status(404).json({ error: "Barrier not found" });
        }

        if (barrier.status !== "active") {
            return res.status(400).json({
                error: "Barrier is already resolved",
            });
        }

        db.prepare(`
      UPDATE barriers
      SET
        fixed_count = COALESCE(fixed_count, 0) + 1,
        last_verified = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(id);

        const updated = db.prepare(`
      SELECT
        id,
        confirm_count,
        fixed_count,
        last_verified,
        status
      FROM barriers
      WHERE id = ?
    `).get(id);

        res.json({
            message: "Community marked this barrier as fixed",
            id: updated.id,
            confirmCount: updated.confirm_count,
            fixedCount: updated.fixed_count,
            lastVerified: updated.last_verified,
            status: updated.status,
        });
    } catch (error) {
        console.error("Community fixed error:", error);
        res.status(500).json({
            error: "Failed to report barrier as fixed",
        });
    }
});

// ======================================================
// MARK BARRIER FIXED - ADMIN/OWNER STYLE ACTION
// ======================================================

app.patch("/api/barriers/:id/fixed", (req, res) => {
    try {
        const id = Number(req.params.id);

        if (Number.isNaN(id)) {
            return res.status(400).json({ error: "Invalid barrier ID" });
        }

        const result = db.prepare(`
      UPDATE barriers
      SET
        status = 'resolved',
        fixed_count = COALESCE(fixed_count, 0) + 1,
        last_verified = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(id);

        if (result.changes === 0) {
            return res.status(404).json({ error: "Barrier not found" });
        }

        res.json({
            message: "Barrier marked as fixed",
            id,
            status: "resolved",
        });
    } catch (error) {
        console.error("Mark fixed error:", error);
        res.status(500).json({
            error: "Failed to update barrier",
        });
    }
});

// ======================================================
// GET ALL BARRIERS
// ======================================================

app.get("/api/barriers/all", (req, res) => {
    try {
        const rows = db.prepare(`
      SELECT
        id,
        type,
        description,
        latitude,
        longitude,
        image,
        severity,
        status,
        confirm_count,
        fixed_count,
        last_verified,
        created_at
      FROM barriers
      ORDER BY created_at DESC
    `).all();

        res.json(
            rows.map((barrier) => ({
                id: barrier.id,
                type: barrier.type,
                description: barrier.description || "",
                location: [barrier.latitude, barrier.longitude],
                latitude: barrier.latitude,
                longitude: barrier.longitude,
                image: barrier.image || null,
                severity: barrier.severity || "Medium",
                status: barrier.status,
                confirmCount: barrier.confirm_count || 0,
                fixedCount: barrier.fixed_count || 0,
                lastVerified: barrier.last_verified,
                createdAt: barrier.created_at,
            }))
        );
    } catch (error) {
        console.error("Get all barriers error:", error);
        res.status(500).json({
            error: "Failed to load all barriers",
        });
    }
});

// ======================================================
// DELETE BARRIER
// ======================================================

app.delete("/api/barriers/:id", (req, res) => {
    try {
        const id = Number(req.params.id);

        if (Number.isNaN(id)) {
            return res.status(400).json({ error: "Invalid barrier ID" });
        }

        const result = db.prepare(`
      DELETE FROM barriers
      WHERE id = ?
    `).run(id);

        if (result.changes === 0) {
            return res.status(404).json({
                error: "Barrier not found",
            });
        }

        res.json({
            message: "Barrier deleted successfully",
            id,
        });
    } catch (error) {
        console.error("Delete barrier error:", error);
        res.status(500).json({
            error: "Failed to delete barrier",
        });
    }
});

// ======================================================
// COMMUNITIES - CREATE
// ======================================================

app.post("/api/communities", (req, res) => {
    try {
        const {
            name,
            description,
            creatorId,
        } = req.body || {};

        if (!name || !String(name).trim()) {
            return res.status(400).json({
                error: "Community name is required",
            });
        }

        const cleanName = String(name).trim();
        const cleanDescription = String(description || "").trim();
        const parsedCreatorId = creatorId ? Number(creatorId) : null;

        if (parsedCreatorId) {
            const creator = db.prepare(`
        SELECT id FROM users WHERE id = ?
      `).get(parsedCreatorId);

            if (!creator) {
                return res.status(404).json({
                    error: "Creator user not found",
                });
            }
        }

        const result = db.prepare(`
      INSERT INTO communities (
        name,
        description,
        creator_id
      )
      VALUES (?, ?, ?)
    `).run(
            cleanName,
            cleanDescription,
            parsedCreatorId
        );

        if (parsedCreatorId) {
            db.prepare(`
        INSERT OR IGNORE INTO community_members (
          community_id,
          user_id
        )
        VALUES (?, ?)
      `).run(result.lastInsertRowid, parsedCreatorId);
        }

        const community = db.prepare(`
      SELECT
        c.id,
        c.name,
        c.description,
        c.creator_id,
        c.created_at,
        COUNT(cm.id) AS member_count
      FROM communities c
      LEFT JOIN community_members cm
        ON cm.community_id = c.id
      WHERE c.id = ?
      GROUP BY c.id
    `).get(result.lastInsertRowid);

        res.status(201).json({
            id: community.id,
            name: community.name,
            description: community.description,
            creatorId: community.creator_id,
            createdAt: community.created_at,
            memberCount: community.member_count || 0,
        });
    } catch (error) {
        if (String(error.message).includes("UNIQUE")) {
            return res.status(409).json({
                error: "A community with that name already exists",
            });
        }

        console.error("Create community error:", error);
        res.status(500).json({
            error: "Failed to create community",
        });
    }
});

// ======================================================
// COMMUNITIES - LIST
// ======================================================

app.get("/api/communities", (req, res) => {
    try {
        const rows = db.prepare(`
      SELECT
        c.id,
        c.name,
        c.description,
        c.creator_id,
        c.created_at,
        u.name AS creator_name,
        COUNT(cm.id) AS member_count
      FROM communities c
      LEFT JOIN users u
        ON u.id = c.creator_id
      LEFT JOIN community_members cm
        ON cm.community_id = c.id
      GROUP BY c.id
      ORDER BY c.created_at DESC
    `).all();

        res.json(
            rows.map((community) => ({
                id: community.id,
                name: community.name,
                description: community.description || "",
                creatorId: community.creator_id,
                creatorName: community.creator_name || "Unknown",
                createdAt: community.created_at,
                memberCount: community.member_count || 0,
            }))
        );
    } catch (error) {
        console.error("List communities error:", error);
        res.status(500).json({
            error: "Failed to load communities",
        });
    }
});

// ======================================================
// COMMUNITY - DETAILS
// ======================================================

app.get("/api/communities/:id", (req, res) => {
    try {
        const id = Number(req.params.id);

        if (Number.isNaN(id)) {
            return res.status(400).json({
                error: "Invalid community ID",
            });
        }

        const community = db.prepare(`
      SELECT
        c.id,
        c.name,
        c.description,
        c.creator_id,
        c.created_at,
        u.name AS creator_name,
        COUNT(cm.id) AS member_count
      FROM communities c
      LEFT JOIN users u
        ON u.id = c.creator_id
      LEFT JOIN community_members cm
        ON cm.community_id = c.id
      WHERE c.id = ?
      GROUP BY c.id
    `).get(id);

        if (!community) {
            return res.status(404).json({
                error: "Community not found",
            });
        }

        res.json({
            id: community.id,
            name: community.name,
            description: community.description || "",
            creatorId: community.creator_id,
            creatorName: community.creator_name || "Unknown",
            createdAt: community.created_at,
            memberCount: community.member_count || 0,
        });
    } catch (error) {
        console.error("Community details error:", error);
        res.status(500).json({
            error: "Failed to load community",
        });
    }
});

// ======================================================
// COMMUNITY - JOIN
// ======================================================

app.post("/api/communities/:id/join", (req, res) => {
    try {
        const communityId = Number(req.params.id);
        const userId = Number(req.body?.userId);

        if (Number.isNaN(communityId) || Number.isNaN(userId)) {
            return res.status(400).json({
                error: "Valid community ID and user ID are required",
            });
        }

        const community = db.prepare(`
      SELECT id FROM communities WHERE id = ?
    `).get(communityId);

        if (!community) {
            return res.status(404).json({
                error: "Community not found",
            });
        }

        const user = db.prepare(`
      SELECT id FROM users WHERE id = ?
    `).get(userId);

        if (!user) {
            return res.status(404).json({
                error: "User not found",
            });
        }

        db.prepare(`
      INSERT OR IGNORE INTO community_members (
        community_id,
        user_id
      )
      VALUES (?, ?)
    `).run(communityId, userId);

        const memberCount = db.prepare(`
      SELECT COUNT(*) AS count
      FROM community_members
      WHERE community_id = ?
    `).get(communityId).count;

        res.json({
            message: "Joined community",
            communityId,
            userId,
            joined: true,
            memberCount,
        });
    } catch (error) {
        console.error("Join community error:", error);
        res.status(500).json({
            error: "Failed to join community",
        });
    }
});

// ======================================================
// COMMUNITY - LEAVE
// ======================================================

app.delete("/api/communities/:id/leave", (req, res) => {
    try {
        const communityId = Number(req.params.id);
        const userId = Number(req.body?.userId);

        if (Number.isNaN(communityId) || Number.isNaN(userId)) {
            return res.status(400).json({
                error: "Valid community ID and user ID are required",
            });
        }

        const result = db.prepare(`
      DELETE FROM community_members
      WHERE community_id = ?
        AND user_id = ?
    `).run(communityId, userId);

        const memberCount = db.prepare(`
      SELECT COUNT(*) AS count
      FROM community_members
      WHERE community_id = ?
    `).get(communityId).count;

        res.json({
            message: result.changes
                ? "Left community"
                : "User was not a member",
            communityId,
            userId,
            joined: false,
            memberCount,
        });
    } catch (error) {
        console.error("Leave community error:", error);
        res.status(500).json({
            error: "Failed to leave community",
        });
    }
});

// ======================================================
// COMMUNITY - MEMBERS
// ======================================================

app.get("/api/communities/:id/members", (req, res) => {
    try {
        const communityId = Number(req.params.id);

        if (Number.isNaN(communityId)) {
            return res.status(400).json({
                error: "Invalid community ID",
            });
        }

        const members = db.prepare(`
      SELECT
        u.id,
        u.name,
        u.email,
        cm.joined_at
      FROM community_members cm
      INNER JOIN users u
        ON u.id = cm.user_id
      WHERE cm.community_id = ?
      ORDER BY cm.joined_at ASC
    `).all(communityId);

        res.json(
            members.map((member) => ({
                id: member.id,
                name: member.name,
                email: member.email,
                joinedAt: member.joined_at,
            }))
        );
    } catch (error) {
        console.error("Community members error:", error);
        res.status(500).json({
            error: "Failed to load community members",
        });
    }
});

// ======================================================
// COMMUNITY - MEMBERSHIP CHECK
// ======================================================

app.get("/api/communities/:id/membership/:userId", (req, res) => {
    try {
        const communityId = Number(req.params.id);
        const userId = Number(req.params.userId);

        if (Number.isNaN(communityId) || Number.isNaN(userId)) {
            return res.status(400).json({
                error: "Invalid community ID or user ID",
            });
        }

        const member = db.prepare(`
      SELECT id
      FROM community_members
      WHERE community_id = ?
        AND user_id = ?
    `).get(communityId, userId);

        res.json({
            communityId,
            userId,
            joined: Boolean(member),
        });
    } catch (error) {
        console.error("Membership check error:", error);
        res.status(500).json({
            error: "Failed to check membership",
        });
    }
});

// ======================================================
// HEALTH CHECK
// ======================================================

app.get("/api/health", (req, res) => {
    res.json({
        ok: true,
        service: "AccessRoute AI backend",
    });
});

// ======================================================
// ERROR HANDLER
// ======================================================

app.use((error, req, res, next) => {
    console.error("Unhandled server error:", error);

    if (error.type === "entity.too.large") {
        return res.status(413).json({
            error: "Request is too large. Please use a smaller image.",
        });
    }

    res.status(500).json({
        error: "Internal server error",
    });
});

// ======================================================
// SERVER
// ======================================================

app.listen(PORT, () => {
    console.log(
        `AccessRoute backend running at http://localhost:${PORT}`
    );
});
