const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const DB_CONFIG = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'contractor_registration',
    port: parseInt(process.env.DB_PORT || '3306')
};

/**
 * Utility: Checks if a column exists in a given table
 */
async function columnExists(connection, dbName, tableName, columnName) {
    const [rows] = await connection.query(`
        SELECT COLUMN_NAME 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?
    `, [dbName, tableName, columnName]);
    return rows.length > 0;
}

/**
 * Utility: Safely adds a column if it doesn't already exist
 */
async function addColumnIfNotExists(connection, dbName, tableName, columnName, columnDefinition, afterColumn = null) {
    const exists = await columnExists(connection, dbName, tableName, columnName);
    if (!exists) {
        const afterClause = afterColumn ? ` AFTER \`${afterColumn}\`` : '';
        await connection.query(`ALTER TABLE \`${tableName}\` ADD COLUMN \`${columnName}\` ${columnDefinition}${afterClause}`);
        console.log(`  ✓ Added column '${columnName}' to '${tableName}'`);
    } else {
        console.log(`  - Column '${columnName}' already exists in '${tableName}' (skipped)`);
    }
}

/**
 * Utility: Checks if an index exists
 */
async function indexExists(connection, dbName, tableName, indexName) {
    const [rows] = await connection.query(`
        SELECT INDEX_NAME 
        FROM INFORMATION_SCHEMA.STATISTICS 
        WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND INDEX_NAME = ?
    `, [dbName, tableName, indexName]);
    return rows.length > 0;
}

/**
 * Utility: Safely adds a unique index if it doesn't exist
 */
async function addUniqueIndexIfNotExists(connection, dbName, tableName, indexName, columns) {
    const exists = await indexExists(connection, dbName, tableName, indexName);
    if (!exists) {
        try {
            await connection.query(`ALTER TABLE \`${tableName}\` ADD UNIQUE KEY \`${indexName}\` (${columns})`);
            console.log(`  ✓ Added unique index '${indexName}' to '${tableName}'`);
        } catch (err) {
            console.log(`  ! Notice: Could not add unique index '${indexName}' to '${tableName}': ${err.message}`);
        }
    }
}

async function masterDatabaseSetup() {
    console.log('===========================================================');
    console.log('   CONTRACTOR REGISTRATION SYSTEM - MASTER DB SETUP       ');
    console.log('===========================================================');
    console.log(`Target: ${DB_CONFIG.user}@${DB_CONFIG.host}:${DB_CONFIG.port}/${DB_CONFIG.database}\n`);

    let rootConnection;
    let connection;

    try {
        // Step 1: Connect to server without DB to ensure database exists
        console.log('1. Checking MySQL server connection and database existence...');
        rootConnection = await mysql.createConnection({
            host: DB_CONFIG.host,
            user: DB_CONFIG.user,
            password: DB_CONFIG.password,
            port: DB_CONFIG.port
        });

        await rootConnection.query(
            `CREATE DATABASE IF NOT EXISTS \`${DB_CONFIG.database}\` 
             CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`
        );
        console.log(`  ✓ Database '${DB_CONFIG.database}' is ready.\n`);
        await rootConnection.end();

        // Step 2: Connect directly to the application database
        console.log('2. Connecting to application database...');
        connection = await mysql.createConnection({
            host: DB_CONFIG.host,
            user: DB_CONFIG.user,
            password: DB_CONFIG.password,
            port: DB_CONFIG.port,
            database: DB_CONFIG.database
        });
        console.log(`  ✓ Connected to '${DB_CONFIG.database}'.\n`);

        // Step 3: Create Core Tables (Idempotent: CREATE TABLE IF NOT EXISTS)
        console.log('3. Creating core tables (if not already existing)...');

        // Table: payments
        await connection.query(`
            CREATE TABLE IF NOT EXISTS \`payments\` (
                \`id\` INT AUTO_INCREMENT PRIMARY KEY,
                \`transaction_id\` VARCHAR(100) UNIQUE NOT NULL,
                \`payment_type\` VARCHAR(50) NOT NULL,
                \`company_name\` VARCHAR(255) NOT NULL,
                \`email\` VARCHAR(255) NOT NULL,
                \`phone\` VARCHAR(50) NOT NULL,
                \`rrr\` VARCHAR(100) UNIQUE NULL,
                \`amount\` DECIMAL(10,2) NOT NULL,
                \`status\` ENUM('pending', 'successful', 'failed') DEFAULT 'pending',
                \`dispute_status\` ENUM('none', 'open', 'resolved') DEFAULT 'none',
                \`dispute_reason\` TEXT NULL,
                \`dispute_resolution\` TEXT NULL,
                \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);
        console.log("  ✓ Table 'payments' verified");

        // Table: contractors
        await connection.query(`
            CREATE TABLE IF NOT EXISTS \`contractors\` (
                \`id\` INT AUTO_INCREMENT PRIMARY KEY,
                \`payment_id\` INT NOT NULL,
                \`category_payment_id\` INT NULL,
                \`verification_status\` ENUM('incomplete', 'pending', 'approved', 'rejected') DEFAULT 'incomplete',
                \`company_name\` VARCHAR(255) NOT NULL,
                \`location_address\` TEXT NOT NULL,
                \`postal_address\` TEXT NOT NULL,
                \`telephone\` VARCHAR(50) NOT NULL,
                \`email\` VARCHAR(255) NOT NULL,
                \`category\` VARCHAR(100) NOT NULL,
                \`password_hash\` VARCHAR(255) NOT NULL,
                \`cac_number\` VARCHAR(100) NULL,
                \`tin\` VARCHAR(100) NULL,
                \`cac_document_path\` VARCHAR(255) NULL,
                \`profile_pic\` VARCHAR(255) NULL,
                \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (\`payment_id\`) REFERENCES \`payments\`(\`id\`) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);
        console.log("  ✓ Table 'contractors' verified");

        // Table: admins
        await connection.query(`
            CREATE TABLE IF NOT EXISTS \`admins\` (
                \`id\` INT AUTO_INCREMENT PRIMARY KEY,
                \`username\` VARCHAR(255) UNIQUE NOT NULL,
                \`email\` VARCHAR(255) NULL,
                \`password_hash\` VARCHAR(255) NOT NULL,
                \`role\` ENUM('admin', 'super_admin') DEFAULT 'admin',
                \`profile_pic\` VARCHAR(255) NULL,
                \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);
        console.log("  ✓ Table 'admins' verified");

        // Table: contractor_corporate_details
        await connection.query(`
            CREATE TABLE IF NOT EXISTS \`contractor_corporate_details\` (
                \`id\` INT AUTO_INCREMENT PRIMARY KEY,
                \`contractor_id\` INT UNIQUE NOT NULL,
                \`reg_no\` VARCHAR(100) NULL,
                \`reg_date\` VARCHAR(50) NULL,
                \`reg_place\` VARCHAR(150) NULL,
                \`paid_up_capital\` VARCHAR(100) NULL,
                \`total_assets\` VARCHAR(100) NULL,
                \`date_of_incorporation\` VARCHAR(50) NULL,
                \`chairman_name\` VARCHAR(255) NULL,
                \`chairman_address\` TEXT NULL,
                \`chairman_phone\` VARCHAR(50) NULL,
                \`secretary_name\` VARCHAR(255) NULL,
                \`secretary_address\` TEXT NULL,
                \`secretary_phone\` VARCHAR(100) NULL,
                \`ceo_name\` VARCHAR(255) NULL,
                \`directors\` JSON NULL,
                \`principal_officers\` JSON NULL,
                \`past_contracts\` JSON NULL,
                \`abandoned_projects\` JSON NULL,
                \`other_business_lines\` JSON NULL,
                \`equipment\` JSON NULL,
                \`declaration_accepted\` BOOLEAN DEFAULT FALSE,
                \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (\`contractor_id\`) REFERENCES \`contractors\`(\`id\`) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);
        console.log("  ✓ Table 'contractor_corporate_details' verified");

        // Table: contractor_documents
        await connection.query(`
            CREATE TABLE IF NOT EXISTS \`contractor_documents\` (
                \`id\` INT AUTO_INCREMENT PRIMARY KEY,
                \`contractor_id\` INT NOT NULL,
                \`document_type\` VARCHAR(100) NOT NULL,
                \`file_path\` VARCHAR(255) NOT NULL,
                \`uploaded_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (\`contractor_id\`) REFERENCES \`contractors\`(\`id\`) ON DELETE CASCADE,
                UNIQUE KEY \`unique_contractor_doc\` (\`contractor_id\`, \`document_type\`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);
        console.log("  ✓ Table 'contractor_documents' verified");

        // Table: messages
        await connection.query(`
            CREATE TABLE IF NOT EXISTS \`messages\` (
                \`id\` INT AUTO_INCREMENT PRIMARY KEY,
                \`sender_type\` ENUM('admin', 'contractor') NOT NULL,
                \`sender_id\` INT NOT NULL,
                \`receiver_type\` ENUM('admin', 'contractor') NOT NULL,
                \`receiver_id\` INT NOT NULL,
                \`subject\` VARCHAR(255) NOT NULL,
                \`body\` TEXT NOT NULL,
                \`is_read\` TINYINT(1) DEFAULT 0,
                \`parent_id\` INT DEFAULT NULL,
                \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (\`parent_id\`) REFERENCES \`messages\`(\`id\`) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);
        console.log("  ✓ Table 'messages' verified");

        // Table: system_settings (Previously missing!)
        await connection.query(`
            CREATE TABLE IF NOT EXISTS \`system_settings\` (
                \`id\` INT AUTO_INCREMENT PRIMARY KEY,
                \`setting_key\` VARCHAR(100) UNIQUE NOT NULL,
                \`setting_value\` TEXT NOT NULL
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);
        console.log("  ✓ Table 'system_settings' verified");

        // Table: contractor_categories (Previously missing!)
        await connection.query(`
            CREATE TABLE IF NOT EXISTS \`contractor_categories\` (
                \`id\` INT AUTO_INCREMENT PRIMARY KEY,
                \`code\` VARCHAR(50) UNIQUE NOT NULL,
                \`name\` VARCHAR(255) NOT NULL,
                \`contract_value\` VARCHAR(100) NULL,
                \`registration_fee\` DECIMAL(10,2) DEFAULT 0.00,
                \`is_active\` TINYINT(1) DEFAULT 1,
                \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);
        console.log("  ✓ Table 'contractor_categories' verified");

        // Table: system_notices (Previously missing!)
        await connection.query(`
            CREATE TABLE IF NOT EXISTS \`system_notices\` (
                \`id\` INT AUTO_INCREMENT PRIMARY KEY,
                \`title\` VARCHAR(255) NOT NULL,
                \`content\` TEXT NOT NULL,
                \`priority\` VARCHAR(50) DEFAULT 'normal',
                \`is_active\` TINYINT(1) DEFAULT 1,
                \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);
        console.log("  ✓ Table 'system_notices' verified\n");

        // Step 4: Ensure all outlier columns exist for previously created databases
        console.log('4. Checking and patching columns on existing tables...');

        // Payments columns
        await addColumnIfNotExists(connection, DB_CONFIG.database, 'payments', 'dispute_status', "ENUM('none', 'open', 'resolved') DEFAULT 'none'");
        await addColumnIfNotExists(connection, DB_CONFIG.database, 'payments', 'dispute_reason', 'TEXT NULL');
        await addColumnIfNotExists(connection, DB_CONFIG.database, 'payments', 'dispute_resolution', 'TEXT NULL');

        // Contractors columns
        await addColumnIfNotExists(connection, DB_CONFIG.database, 'contractors', 'category_payment_id', 'INT NULL', 'payment_id');
        await addColumnIfNotExists(connection, DB_CONFIG.database, 'contractors', 'verification_status', "ENUM('incomplete', 'pending', 'approved', 'rejected') DEFAULT 'incomplete'", 'category_payment_id');
        await addColumnIfNotExists(connection, DB_CONFIG.database, 'contractors', 'profile_pic', 'VARCHAR(255) NULL');
        await addColumnIfNotExists(connection, DB_CONFIG.database, 'contractors', 'cac_document_path', 'VARCHAR(255) NULL');

        // Admins columns
        await addColumnIfNotExists(connection, DB_CONFIG.database, 'admins', 'email', 'VARCHAR(255) NULL', 'username');
        await addColumnIfNotExists(connection, DB_CONFIG.database, 'admins', 'role', "ENUM('admin', 'super_admin') DEFAULT 'admin'", 'password_hash');
        await addColumnIfNotExists(connection, DB_CONFIG.database, 'admins', 'profile_pic', 'VARCHAR(255) NULL');

        // Contractor corporate details columns
        await addColumnIfNotExists(connection, DB_CONFIG.database, 'contractor_corporate_details', 'id', 'INT AUTO_INCREMENT UNIQUE');
        await addColumnIfNotExists(connection, DB_CONFIG.database, 'contractor_corporate_details', 'secretary_name', 'VARCHAR(255) NULL');
        await addColumnIfNotExists(connection, DB_CONFIG.database, 'contractor_corporate_details', 'secretary_address', 'TEXT NULL');
        await addColumnIfNotExists(connection, DB_CONFIG.database, 'contractor_corporate_details', 'secretary_phone', 'VARCHAR(100) NULL');
        await addColumnIfNotExists(connection, DB_CONFIG.database, 'contractor_corporate_details', 'ceo_name', 'VARCHAR(255) NULL');
        await addColumnIfNotExists(connection, DB_CONFIG.database, 'contractor_corporate_details', 'directors', 'JSON NULL');
        await addColumnIfNotExists(connection, DB_CONFIG.database, 'contractor_corporate_details', 'principal_officers', 'JSON NULL');
        await addColumnIfNotExists(connection, DB_CONFIG.database, 'contractor_corporate_details', 'past_contracts', 'JSON NULL');
        await addColumnIfNotExists(connection, DB_CONFIG.database, 'contractor_corporate_details', 'abandoned_projects', 'JSON NULL');
        await addColumnIfNotExists(connection, DB_CONFIG.database, 'contractor_corporate_details', 'other_business_lines', 'JSON NULL');
        await addColumnIfNotExists(connection, DB_CONFIG.database, 'contractor_corporate_details', 'equipment', 'JSON NULL');
        await addColumnIfNotExists(connection, DB_CONFIG.database, 'contractor_corporate_details', 'declaration_accepted', 'BOOLEAN DEFAULT FALSE');

        // Contractor categories columns
        await addColumnIfNotExists(connection, DB_CONFIG.database, 'contractor_categories', 'contract_value', 'VARCHAR(100) NULL', 'name');

        console.log('  ✓ Column patches complete.\n');

        // Step 5: Enforce Unique Constraints Safely
        console.log('5. Verifying and adding unique indexes...');
        await addUniqueIndexIfNotExists(connection, DB_CONFIG.database, 'contractors', 'unique_contractor_email', '`email`');
        await addUniqueIndexIfNotExists(connection, DB_CONFIG.database, 'contractors', 'unique_contractor_telephone', '`telephone`');
        await addUniqueIndexIfNotExists(connection, DB_CONFIG.database, 'contractors', 'unique_contractor_cac', '`cac_number`');
        await addUniqueIndexIfNotExists(connection, DB_CONFIG.database, 'contractors', 'unique_contractor_tin', '`tin`');
        await addUniqueIndexIfNotExists(connection, DB_CONFIG.database, 'contractor_corporate_details', 'unique_corporate_reg_no', '`reg_no`');
        console.log('  ✓ Indexes verified.\n');

        // Step 6: Seed Default Data (Idempotent)
        console.log('6. Seeding essential default system records...');

        // 6a. Admin User
        const [adminCount] = await connection.query('SELECT COUNT(*) as count FROM `admins`');
        if (adminCount[0].count === 0) {
            console.log('  Creating initial Super Admin account...');
            const defaultUser = process.env.ADMIN_DEFAULT_USER || 'admin';
            const defaultPass = process.env.ADMIN_DEFAULT_PASSWORD || 'admin123';
            const defaultEmail = process.env.ADMIN_DEFAULT_EMAIL || 'admin@edsu.edu.ng';

            const salt = await bcrypt.genSalt(10);
            const hash = await bcrypt.hash(defaultPass, salt);
            await connection.query(
                'INSERT INTO `admins` (`username`, `email`, `password_hash`, `role`) VALUES (?, ?, ?, ?)',
                [defaultUser, defaultEmail, hash, 'super_admin']
            );
            console.log(`  ✓ Super Admin created: Username: '${defaultUser}', Password: '${defaultPass}'`);
        } else {
            // Ensure at least one admin has super_admin role
            await connection.query("UPDATE `admins` SET `role` = 'super_admin' WHERE `role` IS NULL OR `role` = '' ORDER BY `id` ASC LIMIT 1");
            console.log('  - Admins already exist. Verified super_admin assignment.');
        }

        // 6b. System Settings (Registration Fee)
        await connection.query(`
            INSERT INTO \`system_settings\` (\`setting_key\`, \`setting_value\`)
            VALUES ('registration_fee', '10000.00')
            ON DUPLICATE KEY UPDATE \`setting_key\` = \`setting_key\`;
        `);
        console.log("  ✓ System setting 'registration_fee' = 10000.00 ready");

        // 6c. Contractor Categories
        const [catCount] = await connection.query('SELECT COUNT(*) as count FROM `contractor_categories`');
        if (catCount[0].count === 0) {
            console.log('  Seeding standard contractor registration categories...');
            const defaultCategories = [
                ['CAT-A', 'Category A - Minor Works & Supplies', 'Below ₦5,000,000', 25000.00, 1],
                ['CAT-B', 'Category B - General Contracting', '₦5,000,000 - ₦20,000,000', 50000.00, 1],
                ['CAT-C', 'Category C - Major Construction', '₦20,000,000 - ₦100,000,000', 100000.00, 1],
                ['CAT-D', 'Category D - Special Projects & Engineering', 'Above ₦100,000,000', 250000.00, 1]
            ];

            for (const cat of defaultCategories) {
                await connection.query(
                    'INSERT INTO `contractor_categories` (`code`, `name`, `contract_value`, `registration_fee`, `is_active`) VALUES (?, ?, ?, ?, ?)',
                    cat
                );
            }
            console.log(`  ✓ Seeded ${defaultCategories.length} default categories.`);
        } else {
            console.log('  - Contractor categories already present (skipped).');
        }

        // 6d. System Notice
        const [noticeCount] = await connection.query('SELECT COUNT(*) as count FROM `system_notices`');
        if (noticeCount[0].count === 0) {
            await connection.query(`
                INSERT INTO \`system_notices\` (\`title\` , \`content\`, \`priority\`, \`is_active\`)
                VALUES (
                    'Welcome here',
                    'All prospective contractors must complete their profile and corporate documentation for verification.',
                    'high',
                    1
                )
            `);
            console.log('  ✓ Seeded welcome notice.');
        } else {
            console.log('  - System notices already present (skipped).');
        }

        console.log('\n===========================================================');
        console.log('       DATABASE SETUP COMPLETED SUCCESSFULLY!             ');
        console.log('===========================================================');
        process.exit(0);

    } catch (err) {
        console.error('\n❌ MASTER DATABASE SETUP FAILED:');
        console.error(err);
        process.exit(1);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

masterDatabaseSetup();
