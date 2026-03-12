CREATE TABLE IF NOT EXISTS fingerprints (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    antecedents TEXT NOT NULL,
    consequents TEXT NOT NULL,
    support REAL NOT NULL,
    confidence REAL NOT NULL,
    lift REAL NOT NULL,
    repo_path TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);