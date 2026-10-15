-- Cloudflare D1 (SQLite) Schema for Nepal Weather & River Flood Watch

-- Key-value metadata table (sync timestamps, active hash, cooldowns)
CREATE TABLE IF NOT EXISTS sync_metadata (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);

-- Snapshot archives (written ONLY when data changes)
CREATE TABLE IF NOT EXISTS weather_snapshots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  hash TEXT UNIQUE NOT NULL,
  fetched_at INTEGER NOT NULL,
  total_river_stations INTEGER NOT NULL,
  danger_count INTEGER NOT NULL,
  warning_count INTEGER NOT NULL,
  payload_json TEXT NOT NULL
);

-- Historical river station time-series logs
CREATE TABLE IF NOT EXISTS river_observations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  snapshot_hash TEXT NOT NULL,
  station_id INTEGER NOT NULL,
  station_name TEXT NOT NULL,
  basin TEXT NOT NULL,
  water_level REAL,
  warning_level REAL,
  danger_level REAL,
  status TEXT NOT NULL,
  steady TEXT,
  recorded_at TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_snapshots_fetched_at ON weather_snapshots(fetched_at DESC);
CREATE INDEX IF NOT EXISTS idx_river_obs_station ON river_observations(station_id, created_at DESC);
