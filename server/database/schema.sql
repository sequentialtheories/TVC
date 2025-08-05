
CREATE TABLE IF NOT EXISTS users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    wallet_address VARCHAR(42),
    st_user_id VARCHAR(255),
    rigor_level INT DEFAULT 0,
    penalties INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_email (email),
    INDEX idx_wallet_address (wallet_address),
    INDEX idx_st_user_id (st_user_id)
);

CREATE TABLE IF NOT EXISTS user_wallets (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    address VARCHAR(42) NOT NULL,
    network VARCHAR(50) DEFAULT 'polygon',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_wallet (user_id, address),
    INDEX idx_address (address),
    INDEX idx_user_id (user_id)
);

CREATE TABLE IF NOT EXISTS user_sessions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    session_token VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_session_token (session_token),
    INDEX idx_user_id (user_id),
    INDEX idx_expires_at (expires_at)
);

/*
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    wallet_address VARCHAR(42),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_wallet_address ON users(wallet_address);

CREATE TABLE IF NOT EXISTS user_wallets (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    address VARCHAR(42) NOT NULL,
    network VARCHAR(50) DEFAULT 'polygon',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, address)
);

CREATE INDEX IF NOT EXISTS idx_user_wallets_address ON user_wallets(address);
CREATE INDEX IF NOT EXISTS idx_user_wallets_user_id ON user_wallets(user_id);

CREATE TABLE IF NOT EXISTS user_sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_token VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires ON user_sessions(expires_at);
*/

CREATE TABLE IF NOT EXISTS subclubs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    address VARCHAR(42) UNIQUE NOT NULL,
    creator_id INT NOT NULL,
    rigor_level INT NOT NULL,
    lock_period INT NOT NULL,
    is_charged BOOLEAN DEFAULT FALSE,
    current_phase INT DEFAULT 1,
    total_deposits DECIMAL(20, 6) DEFAULT 0,
    is_completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (creator_id) REFERENCES users(id),
    INDEX idx_address (address),
    INDEX idx_creator_id (creator_id)
);

CREATE TABLE IF NOT EXISTS subclub_members (
    id INT PRIMARY KEY AUTO_INCREMENT,
    subclub_id INT NOT NULL,
    user_id INT NOT NULL,
    wallet_address VARCHAR(42) NOT NULL,
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (subclub_id) REFERENCES subclubs(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_member_subclub (subclub_id, user_id),
    INDEX idx_subclub_id (subclub_id),
    INDEX idx_user_id (user_id)
);

CREATE TABLE IF NOT EXISTS deposits (
    id INT PRIMARY KEY AUTO_INCREMENT,
    subclub_id INT NOT NULL,
    user_id INT NOT NULL,
    amount DECIMAL(20, 6) NOT NULL,
    transaction_hash VARCHAR(66) NOT NULL,
    block_number INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (subclub_id) REFERENCES subclubs(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_subclub_id (subclub_id),
    INDEX idx_user_id (user_id),
    INDEX idx_transaction_hash (transaction_hash)
);

CREATE TABLE IF NOT EXISTS emergency_events (
    id INT PRIMARY KEY AUTO_INCREMENT,
    subclub_id INT NOT NULL,
    user_id INT NOT NULL,
    event_type ENUM('withdraw', 'pause', 'resume') NOT NULL,
    reason TEXT,
    transaction_hash VARCHAR(66),
    block_number INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (subclub_id) REFERENCES subclubs(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_subclub_id (subclub_id),
    INDEX idx_user_id (user_id)
);
