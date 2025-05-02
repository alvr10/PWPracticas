<?php
// Incluir configuraciones necesarias
require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../utils/validation.php';

class Auth {
    private $db;
    
    public function __construct() {
        $database = new Database();
        $this->db = $database->connect();
    }
    
    /**
     * Registrar un nuevo usuario
     * 
     * @param string $username Nombre de usuario
     * @param string $email Correo electrónico
     * @param string $password Contraseña
     * @return array Resultado de la operación
     */
    public function register($username, $email, $password, $confirm_password) {
        // Validar datos
        $validation = new Validation();
        $errors = [];
        
        // Validar nombre de usuario
        if (!$validation->validateUsername($username)) {
            $errors[] = "El nombre de usuario debe tener entre 3 y 50 caracteres alfanuméricos.";
        }
        
        // Validar email
        if (!$validation->validateEmail($email)) {
            $errors[] = "El correo electrónico no es válido.";
        }
        
        // Validar contraseña
        if (!$validation->validatePassword($password)) {
            $errors[] = "La contraseña debe tener al menos 6 caracteres.";
        }
        
        // Validar confirmación de contraseña
        if ($password !== $confirm_password) {
            $errors[] = "Las contraseñas no coinciden.";
        }
        
        // Si hay errores, devolver el array de errores
        if (!empty($errors)) {
            return [
                'success' => false,
                'errors' => $errors
            ];
        }
        
        // Verificar si el usuario o email ya existen
        try {
            $sql = "SELECT COUNT(*) FROM usuarios WHERE username = ? OR email = ?";
            $stmt = $this->db->prepare($sql);
            $stmt->execute([$username, $email]);
            
            if ($stmt->fetchColumn() > 0) {
                return [
                    'success' => false,
                    'errors' => ["El nombre de usuario o correo electrónico ya están en uso."]
                ];
            }
            
            // Crear nuevo usuario
            $sql = "INSERT INTO usuarios (username, email, password) VALUES (?, ?, ?)";
            $stmt = $this->db->prepare($sql);
            
            // Encriptar contraseña
            $password_hash = password_hash($password, PASSWORD_DEFAULT);
            
            if ($stmt->execute([$username, $email, $password_hash])) {
                return [
                    'success' => true,
                    'message' => "Registro exitoso. Ahora puedes iniciar sesión."
                ];
            } else {
                return [
                    'success' => false,
                    'errors' => ["Error al registrar el usuario. Inténtalo de nuevo."]
                ];
            }
        } catch (PDOException $e) {
            return [
                'success' => false,
                'errors' => ["Error de base de datos: " . $e->getMessage()]
            ];
        }
    }
    
    /**
     * Iniciar sesión
     * 
     * @param string $email Correo electrónico
     * @param string $password Contraseña
     * @return array Resultado de la operación
     */
    public function login($email, $password) {
        // Validar datos
        $validation = new Validation();
        $errors = [];
        
        // Validar email
        if (!$validation->validateEmail($email)) {
            $errors[] = "El correo electrónico no es válido.";
        }
        
        // Validar contraseña
        if (empty($password)) {
            $errors[] = "La contraseña es obligatoria.";
        }
        
        // Si hay errores, devolver el array de errores
        if (!empty($errors)) {
            return [
                'success' => false,
                'errors' => $errors
            ];
        }
        
        try {
            // Registrar intento de login
            $this->logLoginAttempt($email);
            
            // Verificar intentos de login
            if ($this->tooManyLoginAttempts($email)) {
                return [
                    'success' => false,
                    'errors' => ["Demasiados intentos de inicio de sesión. Inténtalo de nuevo más tarde."]
                ];
            }
            
            // Buscar usuario por email
            $sql = "SELECT id, username, email, password, rol, estado FROM usuarios WHERE email = ?";
            $stmt = $this->db->prepare($sql);
            $stmt->execute([$email]);
            
            if ($stmt->rowCount() != 1) {
                return [
                    'success' => false,
                    'errors' => ["No se encontró una cuenta con ese correo electrónico."]
                ];
            }
            
            $usuario = $stmt->fetch();
            
            // Verificar si la cuenta está activa
            if ($usuario['estado'] != 1) {
                return [
                    'success' => false,
                    'errors' => ["Esta cuenta está desactivada. Contacta al administrador."]
                ];
            }
            
            // Verificar contraseña
            if (password_verify($password, $usuario['password'])) {
                // Iniciar sesión
                session_start();
                $_SESSION['usuario_id'] = $usuario['id'];
                $_SESSION['username'] = $usuario['username'];
                $_SESSION['email'] = $usuario['email'];
                $_SESSION['rol'] = $usuario['rol'];
                $_SESSION['auth'] = true;
                
                // Actualizar última sesión
                $sql = "UPDATE usuarios SET ultima_sesion = NOW() WHERE id = ?";
                $stmt = $this->db->prepare($sql);
                $stmt->execute([$usuario['id']]);
                
                return [
                    'success' => true,
                    'message' => "Inicio de sesión exitoso.",
                    'user' => [
                        'id' => $usuario['id'],
                        'username' => $usuario['username'],
                        'email' => $usuario['email'],
                        'rol' => $usuario['rol']
                    ]
                ];
            } else {
                return [
                    'success' => false,
                    'errors' => ["La contraseña es incorrecta."]
                ];
            }
        } catch (PDOException $e) {
            return [
                'success' => false,
                'errors' => ["Error de base de datos: " . $e->getMessage()]
            ];
        }
    }
    
    /**
     * Cerrar sesión
     */
    public function logout() {
        session_start();
        $_SESSION = array();
        session_destroy();
        
        return [
            'success' => true,
            'message' => "Sesión cerrada correctamente."
        ];
    }
    
    /**
     * Verificar si el usuario está autenticado
     * 
     * @return bool
     */
    public function isAuthenticated() {
        session_start();
        return isset($_SESSION['auth']) && $_SESSION['auth'] === true;
    }
    
    /**
     * Verificar rol del usuario
     * 
     * @param string $role Rol a verificar
     * @return bool
     */
    public function hasRole($role) {
        session_start();
        return isset($_SESSION['rol']) && $_SESSION['rol'] === $role;
    }
    
    /**
     * Registrar intento de login
     * 
     * @param string $email Correo electrónico
     */
    private function logLoginAttempt($email) {
        $ip = $_SERVER['REMOTE_ADDR'];
        $sql = "INSERT INTO login_attempts (email, ip) VALUES (?, ?)";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$email, $ip]);
    }
    
    /**
     * Verificar si hay demasiados intentos de login
     * 
     * @param string $email Correo electrónico
     * @return bool
     */
    private function tooManyLoginAttempts($email) {
        $ip = $_SERVER['REMOTE_ADDR'];
        $timeLimit = date('Y-m-d H:i:s', strtotime('-15 minutes'));
        
        $sql = "SELECT COUNT(*) FROM login_attempts 
                WHERE (email = ? OR ip = ?) 
                AND intento_tiempo > ?";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$email, $ip, $timeLimit]);
        
        return $stmt->fetchColumn() >= 5; // Límite de 5 intentos en 15 minutos
    }
}
?>