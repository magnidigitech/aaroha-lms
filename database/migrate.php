<?php
// Aaroha LMS - Database Migration Runner
// Safely applies versioned SQL migrations across local and production MySQL databases.

require_once __DIR__ . '/../backend/config/database.php';

echo "=== Aaroha LMS Database Migration Runner ===\n";

try {
    $pdo = Database::getConnection();
    $driver = $pdo->getAttribute(PDO::ATTR_DRIVER_NAME);
    echo "Database connected ($driver)\n";

    // 1. Create migrations tracking table if not exists
    if ($driver === 'mysql') {
        $pdo->exec("
            CREATE TABLE IF NOT EXISTS schema_migrations (
                id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
                version VARCHAR(191) NOT NULL UNIQUE,
                applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        ");
    } else {
        $pdo->exec("
            CREATE TABLE IF NOT EXISTS schema_migrations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                version TEXT NOT NULL UNIQUE,
                applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
        ");
    }

    // 2. Fetch already applied migration versions
    $stmt = $pdo->query("SELECT version FROM schema_migrations");
    $applied = $stmt->fetchAll(PDO::FETCH_COLUMN);
    $appliedSet = array_flip($applied);

    // 3. Scan migrations directory
    $migrationsDir = __DIR__ . '/migrations';
    if (!is_dir($migrationsDir)) {
        mkdir($migrationsDir, 0755, true);
    }

    $files = glob($migrationsDir . '/*.sql');
    sort($files);

    if (empty($files)) {
        echo "No migration files found in $migrationsDir\n";
        exit(0);
    }

    $newCount = 0;
    foreach ($files as $file) {
        $version = basename($file, '.sql');
        if (isset($appliedSet[$version])) {
            echo "  [SKIPPED] $version (already applied)\n";
            continue;
        }

        echo "  [APPLYING] $version ... ";
        $sql = file_get_contents($file);

        if ($driver === 'mysql') {
            // Split into individual SQL statements
            $statements = array_filter(array_map('trim', explode(';', $sql)));
            foreach ($statements as $stmtSql) {
                // Remove comment lines
                $cleanedLines = [];
                foreach (explode("\n", $stmtSql) as $line) {
                    $trimmedLine = trim($line);
                    if ($trimmedLine !== '' && !str_starts_with($trimmedLine, '--')) {
                        $cleanedLines[] = $line;
                    }
                }
                $query = trim(implode("\n", $cleanedLines));
                if (empty($query)) continue;

                // Check for ALTER TABLE <table> ADD COLUMN <col>
                if (preg_match('/^ALTER\s+TABLE\s+[`]?([a-zA-Z0-9_]+)[`]?\s+ADD\s+COLUMN\s+[`]?([a-zA-Z0-9_]+)[`]?\s+(.*)$/i', $query, $matches)) {
                    $table = $matches[1];
                    $col = $matches[2];
                    $rest = $matches[3];

                    $chkStmt = $pdo->prepare("
                        SELECT COUNT(*) FROM information_schema.COLUMNS 
                        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?
                    ");
                    $chkStmt->execute([$table, $col]);
                    $colExists = (int)$chkStmt->fetchColumn() > 0;

                    if (!$colExists) {
                        $pdo->exec("ALTER TABLE `$table` ADD COLUMN `$col` $rest");
                    }
                } else {
                    $pdo->exec($query);
                }
            }
        } else {
            // SQLite driver
            $pdo->exec($sql);
        }

        // Record applied migration
        $ins = $pdo->prepare("INSERT INTO schema_migrations (version) VALUES (?)");
        $ins->execute([$version]);

        echo "DONE\n";
        $newCount++;
    }

    echo "\nMigrations complete. Applied $newCount new migration(s).\n";
} catch (Exception $e) {
    echo "\n[ERROR] Migration failed: " . $e->getMessage() . "\n";
    exit(1);
}
