<?php
// test_connection.php
require_once 'includes/config/config.php';
require_once 'includes/config/database.php';

// Display a header
echo "<h1>Database Connection Test</h1>";

// Try to connect to the database
try {
    $db = new Database();
    $conn = $db->connect();
    
    echo "<p style='color: green; font-weight: bold;'>✅ Connection successful!</p>";
    echo "<p>Successfully connected to database: <strong>red_social_deportiva</strong></p>";
    
    // Optional: Display some database information
    $serverInfo = $conn->getAttribute(PDO::ATTR_SERVER_INFO);
    $serverVersion = $conn->getAttribute(PDO::ATTR_SERVER_VERSION);
    
    echo "<h2>Server Information:</h2>";
    echo "<ul>";
    echo "<li>Server Version: " . $serverVersion . "</li>";
    if ($serverInfo) {
        echo "<li>Server Info: " . $serverInfo . "</li>";
    }
    echo "</ul>";
    
    // Optional: Test a simple query
    echo "<h2>Testing Query:</h2>";
    $stmt = $conn->query("SHOW TABLES");
    $tables = $stmt->fetchAll(PDO::FETCH_COLUMN);
    
    if (count($tables) > 0) {
        echo "<p>Tables in database:</p>";
        echo "<ul>";
        foreach ($tables as $table) {
            echo "<li>" . $table . "</li>";
        }
        echo "</ul>";
    } else {
        echo "<p>No tables found in the database.</p>";
    }
    
} catch (PDOException $e) {
    echo "<p style='color: red; font-weight: bold;'>❌ Connection failed!</p>";
    echo "<p>Error message: " . $e->getMessage() . "</p>";
    
    // Check common issues
    echo "<h2>Troubleshooting:</h2>";
    echo "<ul>";
    echo "<li>Check if MySQL server is running</li>";
    echo "<li>Verify database name 'red_social_deportiva' exists</li>";
    echo "<li>Confirm username and password are correct</li>";
    echo "<li>Ensure hostname is correct (usually 'localhost')</li>";
    echo "</ul>";
}
?>