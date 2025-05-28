<?php
// includes/config/database.php
// Configuración de la base de datos
class Database {
    private $host = 'localhost';
    private $port = '3306';
    private $db_name = 'red_social_deportiva';
    private $username = 'root';
    private $password = 'alvaro10';
    private $charset = 'utf8mb4';
    private $pdo;

    // Conexión a la base de datos
    public function connect() {
        if ($this->pdo) {
            return $this->pdo;
        }
        
        try {
            $dsn = "mysql:host={$this->host};dbname={$this->db_name};charset={$this->charset}";
            $options = [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false,
            ];
            $this->pdo = new PDO($dsn, $this->username, $this->password, $options);
            return $this->pdo;
        } catch(PDOException $e) {
            // En un entorno de producción, registrar el error en lugar de mostrarlo
            error_log("Database connection error: " . $e->getMessage());
            throw new Exception("Database connection failed: " . $e->getMessage());
        }
    }
}

// Global function to get database connection (REQUIRED by auth_functions.php and other files)
function get_db_connection() {
    static $connection = null;
    
    if ($connection === null) {
        $db = new Database();
        $connection = $db->connect();
    }
    
    return $connection;
}
?>