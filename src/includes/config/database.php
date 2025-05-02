<?php
// Configuración de la base de datos
class Database {
    private $host = 'localhost';
    private $db_name = 'proyecto_escalable';
    private $username = 'root';
    private $password = '';
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
            die("Error de conexión: " . $e->getMessage());
        }
    }
}
?>