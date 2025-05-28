<?php
// src/includes/auth/auth_functions.php
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/auth.php';

// Initialize Auth instance
$auth_instance = null;

function getAuthInstance() {
    global $auth_instance;
    if ($auth_instance === null) {
        $auth_instance = new Auth();
    }
    return $auth_instance;
}

/**
 * Verify and decode a token using existing Auth class
 * Returns user data if valid, false if invalid
 */
function verify_token($token) {
    if (!$token) {
        return false;
    }
    
    try {
        $auth = getAuthInstance();
        $result = $auth->checkSession($token);
        
        // Your checkSession returns ['valid' => true/false, 'user_id' => id]
        if ($result && isset($result['valid']) && $result['valid'] === true) {
            
            // Get user ID from session check result
            $user_id = isset($result['user_id']) ? $result['user_id'] : null;
            
            if ($user_id) {
                // Get complete user data from database
                return get_user_by_id($user_id);
            }
        }
        
        return false;
    } catch (Exception $e) {
        error_log("Token verification error: " . $e->getMessage());
        return false;
    }
}

/**
 * Get user data by ID from database
 */
function get_user_by_id($user_id) {
    try {
        $pdo = get_db_connection();
        
        if (!$pdo) {
            throw new Exception("Database connection failed");
        }
        
        $sql = "
            SELECT 
                u.id,
                u.username,
                u.email,
                u.nombre,
                u.apellidos,
                u.fecha_nacimiento,
                u.actividad_preferida_id,
                u.localidad_id,
                u.imagen_perfil_id,
                u.fecha_alta,
                u.validado,
                u.rol_id,
                l.nombre as localidad_nombre,
                p.nombre as provincia_nombre,
                pa.nombre as pais_nombre,
                ta.nombre as actividad_preferida_nombre
            FROM usuarios u
            LEFT JOIN localidades l ON u.localidad_id = l.id
            LEFT JOIN provincias p ON l.provincia_id = p.id
            LEFT JOIN paises pa ON p.pais_id = pa.id
            LEFT JOIN tipos_actividad ta ON u.actividad_preferida_id = ta.id
            WHERE u.id = :user_id 
            AND u.fecha_baja IS NULL
        ";
        
        $stmt = $pdo->prepare($sql);
        $stmt->bindParam(':user_id', $user_id, PDO::PARAM_INT);
        $stmt->execute();
        
        $user = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if ($user) {
            // Convert boolean and numeric fields
            $user['validado'] = (bool)$user['validado'];
            $user['id'] = (int)$user['id'];
            $user['actividad_preferida_id'] = $user['actividad_preferida_id'] ? (int)$user['actividad_preferida_id'] : null;
            $user['localidad_id'] = $user['localidad_id'] ? (int)$user['localidad_id'] : null;
            $user['imagen_perfil_id'] = $user['imagen_perfil_id'] ? (int)$user['imagen_perfil_id'] : null;
            $user['rol_id'] = $user['rol_id'] ? (int)$user['rol_id'] : null;
        }
        
        return $user;
        
    } catch (Exception $e) {
        error_log("Get user by ID error: " . $e->getMessage());
        return false;
    }
}

/**
 * Main authentication function that should be used in profile files
 */
function authenticate_user($token) {
    if (!$token) {
        return false;
    }
    
    // Verify the token using your existing Auth class
    $auth = getAuthInstance();
    $session_check = $auth->checkSession($token);
    
    if (!$session_check || !$session_check['valid']) {
        return false;
    }
    
    // Get the user ID from session check
    $user_id = isset($session_check['user_id']) ? $session_check['user_id'] : null;
    
    if (!$user_id) {
        return false;
    }
    
    // Get complete user data
    return get_user_by_id($user_id);
}

/**
 * Check if user has permission for a specific action
 */
function check_permission($user, $action, $resource_id = null) {
    if (!$user || !isset($user['id'])) {
        return false;
    }
    
    // Check if user account is validated
    if (isset($user['validado']) && !$user['validado']) {
        // For some actions, require validated account
        if (in_array($action, ['create_activity', 'follow_user'])) {
            return false;
        }
    }
    
    switch ($action) {
        case 'create_activity':
            return $user['validado']; // Only validated users can create activities
            
        case 'edit_activity':
        case 'delete_activity':
            // Users can only edit/delete their own activities
            if ($resource_id) {
                try {
                    $pdo = get_db_connection();
                    $sql = "SELECT usuario_id FROM actividades WHERE id = :activity_id";
                    $stmt = $pdo->prepare($sql);
                    $stmt->bindParam(':activity_id', $resource_id, PDO::PARAM_INT);
                    $stmt->execute();
                    $activity = $stmt->fetch(PDO::FETCH_ASSOC);
                    
                    return $activity && $activity['usuario_id'] == $user['id'];
                } catch (Exception $e) {
                    return false;
                }
            }
            return false;
            
        case 'edit_profile':
            return true; // Users can edit their own profile
            
        case 'view_profile':
        case 'search_users':
        case 'view_feed':
            return true; // All authenticated users can view profiles and feed
            
        case 'follow_user':
            return $user['validado']; // Only validated users can follow others
            
        case 'applaud_activity':
            return true; // All authenticated users can applaud
            
        default:
            return false;
    }
}

/**
 * Get current user from token (shorthand function)
 */
function get_authenticated_user($token) {
    return authenticate_user($token);
}

/**
 * Check if current user can access resource
 */
function can_access_resource($token, $action, $resource_id = null) {
    $user = authenticate_user($token);
    if (!$user) {
        return false;
    }
    
    return check_permission($user, $action, $resource_id);
}
?>