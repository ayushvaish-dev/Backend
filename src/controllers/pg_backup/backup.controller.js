const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const { URL } = require('url'); // Added for URL parsing
require('dotenv').config();

const BACKUP_DIR = path.join(__dirname, '../../../backups');

if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

module.exports.backup = async (req, res) => {
    try {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupFile = path.join(BACKUP_DIR, `backup-${timestamp}.sql`);

        // Get and sanitize database configuration
        const dbUrl = process.env.DATABASE_URL;
        if (!dbUrl) {
            throw new Error('DATABASE_URL not found in environment variables');
        }

        // Sanitize URL to remove unsupported parameters
        const parsedUrl = new URL(dbUrl);
        parsedUrl.searchParams.delete('connection_limit'); // Remove invalid parameter
        const sanitizedDbUrl = parsedUrl.toString();

        // Construct pg_dump command
        const pgDumpCommand = `"${process.env.PG_DUMP_PATH}" "${sanitizedDbUrl}" > "${backupFile}"`;
        console.log('Executing pg_dump command:', pgDumpCommand); // Debug log

        // Execute backup
        await new Promise((resolve, reject) => {
            exec(pgDumpCommand, (error, stdout, stderr) => {
                if (error) {
                    console.error('Backup failed:', stderr);
                    reject(new Error(`Backup failed: ${stderr}`));
                    return;
                }
                resolve();
            });
        });

        // Verify backup file exists and is not empty
        if (!fs.existsSync(backupFile)) {
            throw new Error('Backup file was not created');
        }
        const stats = fs.statSync(backupFile);
        if (stats.size === 0) {
            fs.unlinkSync(backupFile); // Delete empty file
            throw new Error('Backup file is empty');
        }

        res.status(200).json({
            message: 'Database backup created successfully',
            backupFile: backupFile
        });
    } catch (error) {
        console.error('Backup error:', error);
        res.status(500).json({
            error: 'Failed to create backup',
            details: error.message
        });
    }
};

module.exports.cleanupBackup = async (req, res) => {
    try {
        const files = fs.readdirSync(BACKUP_DIR);
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

        for (const file of files) {
            const filePath = path.join(BACKUP_DIR, file);
            const stats = fs.statSync(filePath);
            
            if (stats.isFile() && stats.mtime < sevenDaysAgo) {
                fs.unlinkSync(filePath);
                console.log(`Deleted old backup: ${file}`);
            }
        }

        res.status(200).json({
            message: 'Old backups cleaned up successfully'
        });
    } catch (error) {
        console.error('Cleanup error:', error);
        res.status(500).json({
            error: 'Failed to cleanup backups',
            details: error.message
        });
    }
};