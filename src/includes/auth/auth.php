<?php
// src/includes/auth/auth.php

// Better path resolution that works from any directory
$config_dir = dirname(__DIR__) . '/config/';

// Try different possible paths for config files
$config_files = [
    $config_dir . 'config.php',
    __DIR__ . '/../config/config.php',
    dirname(dirname(dirname(__FILE__))) . '/includes/config/config.php'
];

$database_files = [
    $config_dir . 'database.php',
    __DIR__ . '/../config/database.php', 
    dirname(dirname(dirname(__FILE__))) . '/includes/config/database.php'
];

// Include config file
$config_loaded = false;
foreach ($config_files as $config_file) {
    if (file_exists($config_file)) {
        require_once $config_file;
        $config_loaded = true;
        break;
    }
}

// Include database file
$database_loaded = false;
foreach ($database_files as $database_file) {
    if (file_exists($database_file)) {
        require_once $database_file;
        $database_loaded = true;
        break;
    }
}

// If files weren't found, log the error but continue (config might not be strictly necessary)
if (!$config_loaded) {
    error_log("Warning: config.php not found in expected locations");
}

if (!$database_loaded) {
    error_log("Error: database.php not found in expected locations");
    throw new Exception("Database configuration not available");
}

class Auth {
    private $db;
    private $conn;
    
    public function __construct() {
        $this->db = new Database();
        $this->conn = $this->db->connect();
    }
    
    // Registrar un nuevo usuario
    public function register($userData) {
        try {
            // Comprobar si el email ya existe
            $stmt = $this->conn->prepare("SELECT * FROM usuarios WHERE email = :email");
            $stmt->bindParam(':email', $userData['email']);
            $stmt->execute();
            
            if ($stmt->rowCount() > 0) {
                return [
                    'success' => false,
                    'message' => 'El correo electrónico ya está registrado'
                ];
            }
            
            // Comprobar si el nombre de usuario ya existe
            $stmt = $this->conn->prepare("SELECT * FROM usuarios WHERE username = :username");
            $stmt->bindParam(':username', $userData['username']);
            $stmt->execute();
            
            if ($stmt->rowCount() > 0) {
                return [
                    'success' => false,
                    'message' => 'El nombre de usuario ya está en uso'
                ];
            }
            
            // Hashear la contraseña
            $hashedPassword = password_hash($userData['password'], PASSWORD_DEFAULT);
            
            $stmt = $this->conn->prepare("
                INSERT INTO usuarios (
                    username, email, password, nombre, apellidos, 
                    fecha_nacimiento, actividad_preferida_id, localidad_id,
                    validado
                ) VALUES (
                    :username, :email, :password, :nombre, :apellidos,
                    :fecha_nacimiento, :actividad_preferida_id, :localidad_id,
                    1
                )
            ");
            
            // Vincular parámetros
            $stmt->bindParam(':username', $userData['username']);
            $stmt->bindParam(':email', $userData['email']);
            $stmt->bindParam(':password', $hashedPassword);
            $stmt->bindParam(':nombre', $userData['nombre']);
            $stmt->bindParam(':apellidos', $userData['apellidos']);
            $stmt->bindParam(':fecha_nacimiento', $userData['fecha_nacimiento']);
            $stmt->bindParam(':actividad_preferida_id', $userData['actividad_preferida_id'], PDO::PARAM_INT);
            $stmt->bindParam(':localidad_id', $userData['localidad_id'], PDO::PARAM_INT);
            
            // Ejecutar la consulta
            $stmt->execute();
            
            return [
                'success' => true,
                'message' => 'Usuario registrado correctamente.'
            ];
            
        } catch (PDOException $e) {
            return [
                'success' => false,
                'message' => 'Error al registrar el usuario: ' . $e->getMessage()
            ];
        }
    }

    // Iniciar sesión (versión simplificada sin conteo de intentos)
    public function login($email, $password, $remember) {
        try {
            // Buscar el usuario por email
            $stmt = $this->conn->prepare("SELECT * FROM usuarios WHERE email = :email AND fecha_baja IS NULL");
            $stmt->bindParam(':email', $email);
            $stmt->execute();
            
            $user = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$user) {
                return [
                    'success' => false,
                    'message' => 'Credenciales incorrectas'
                ];
            }
            
            // Verificar la contraseña
            if (!password_verify($password, $user['password'])) {
                return [
                    'success' => false,
                    'message' => 'Credenciales incorrectas'
                ];
            }
            
            // Generar token para el localStorage
            $token = bin2hex(random_bytes(32));
            
            // Iniciar sesión PHP
            session_start();
            $_SESSION['auth'] = true;
            $_SESSION['auth_token'] = $token;
            $_SESSION['user_id'] = $user['id'];
            
            // Filtrar la información del usuario para enviar al cliente
            $userData = [
                'id' => $user['id'],
                'username' => $user['username'],
                'nombre' => $user['nombre'],
                'apellidos' => $user['apellidos'],
                'email' => $user['email'],
                'actividad_preferida_id' => $user['actividad_preferida_id'],
                'localidad_id' => $user['localidad_id'],
                'imagen_perfil_id' => $user['imagen_perfil_id'],
                'rol_id' => $user['rol_id']
            ];
            
            return [
                'success' => true,
                'message' => 'Inicio de sesión exitoso',
                'token' => $token,
                'user' => $userData
            ];
            
        } catch (PDOException $e) {
            return [
                'success' => false,
                'message' => 'Error al iniciar sesión: ' . $e->getMessage()
            ];
        }
    }
    
    // Verificar la sesión
    public function checkSession($token) {
        session_start();
        
        // Verificar si la sesión tiene el mismo token
        if (isset($_SESSION['auth']) && $_SESSION['auth'] === true && 
            isset($_SESSION['auth_token']) && $_SESSION['auth_token'] === $token) {
            return [
                'valid' => true,
                'user_id' => $_SESSION['user_id']
            ];
        }
        
        return [
            'valid' => false
        ];
    }
    
    // Cerrar sesión
    public function logout($token) {
        session_start();
        
        // Verificar si la sesión tiene el mismo token
        if (isset($_SESSION['auth_token']) && $_SESSION['auth_token'] === $token) {
            // Eliminar todas las variables de sesión
            $_SESSION = array();
            
            // Destruir la sesión
            session_destroy();
            
            return [
                'success' => true,
                'message' => 'Sesión cerrada correctamente'
            ];
        }
        
        return [
            'success' => false,
            'message' => 'Token inválido'
        ];
    }
    
    // Registrar intento de inicio de sesión
    private function recordLoginAttempt($email) {
        try {
            $stmt = $this->conn->prepare("
                INSERT INTO login_attempts (email, ip)
                VALUES (:email, :ip)
            ");
            
            $ip = $_SERVER['REMOTE_ADDR'];
            $stmt->bindParam(':email', $email);
            $stmt->bindParam(':ip', $ip);
            $stmt->execute();
            
            return true;
        } catch (PDOException $e) {
            return false;
        }
    }
    
    // Comprobar si ha excedido el límite de intentos
    private function checkLoginAttempts($email) {
        try {
            $stmt = $this->conn->prepare("
                SELECT COUNT(*) as intentos
                FROM login_attempts
                WHERE email = :email
                AND intento_tiempo > DATE_SUB(NOW(), INTERVAL 15 MINUTE)
            ");
            
            $stmt->bindParam(':email', $email);
            $stmt->execute();
            
            $result = $stmt->fetch(PDO::FETCH_ASSOC);
            
            // Limitar a 5 intentos en 15 minutos
            return $result['intentos'] >= 5;
        } catch (PDOException $e) {
            return false;
        }
    }
}
?>