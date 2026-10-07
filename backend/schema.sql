-- PostgreSQL Database Schema for WorkTime ERP

CREATE TABLE staff (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    department VARCHAR(100),
    badge_number VARCHAR(50),
    days_per_week INT DEFAULT 5,
    is_manager BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE punches (
    id SERIAL PRIMARY KEY,
    staff_id INT REFERENCES staff(id),
    timestamp TIMESTAMP NOT NULL,
    punch_type VARCHAR(10) NOT NULL CHECK (punch_type IN ('in', 'out')),
    source VARCHAR(20) NOT NULL CHECK (source IN ('web', 'device'))
);

CREATE TABLE notes (
    id SERIAL PRIMARY KEY,
    staff_id INT REFERENCES staff(id),
    kind VARCHAR(50) NOT NULL, -- 'daily-plan', 'daily-report', 'weekly-plan', 'weekly-report'
    reference_key VARCHAR(50) NOT NULL, -- the date or week key
    text_content TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE evaluations (
    id SERIAL PRIMARY KEY,
    staff_id INT REFERENCES staff(id),
    week_key VARCHAR(50) NOT NULL,
    quality_score INT CHECK (quality_score BETWEEN 1 AND 5),
    productivity_score INT CHECK (productivity_score BETWEEN 1 AND 5),
    teamwork_score INT CHECK (teamwork_score BETWEEN 1 AND 5),
    comment TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
