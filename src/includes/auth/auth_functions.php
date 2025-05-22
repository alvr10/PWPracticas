<?php
// auth_functions.php - Bridge to existing Auth class
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
        
        // Your checkSession returns ['valid' => true/false, 'message' => '...']
        if ($result && isset($result['valid']) && $result['valid'] === true) {
            
            // If the result contains user data, return it
            if (isset($result['user_data'])) {
                return $result['user_data'];
            }
            
            // If the result contains user info directly
            if (isset($result['user'])) {
                return $result['user'];
            }
            
            // If no user data in result, decode the token manually
            $user_data = decodeTokenAndGetUser($token);
            return $user_data;
        }
        
        return false;
    } catch (Exception $e) {
        error_log("Token verification error: " . $e->getMessage());
        return false;
    }
}

/**
 * Decode JWT token and get user data from database
 */
function decodeTokenAndGetUser($token) {
    try {
        $parts = explode('.', $token);
        if (count($parts) !== 3) {
            return false;
        }
        
        // Decode payload (second part)
        $payload_encoded = $parts[1];
        // Add padding if needed for base64 decoding
        $payload_encoded .= str_repeat('=', (4 - strlen($payload_encoded) % 4) % 4);
        $payload = json_decode(base64_decode(str_replace(['-', '_'], ['+', '/'], $payload_encoded)), true);
        
        if (!$payload) {
            return false;
        }
        
        // Check if token is expired
        if (isset($payload['exp']) && $payload['exp'] < time()) {
            return false;
        }
        
        // Get user ID from token payload
        $user_id = null;
        if (isset($payload['user_id'])) {
            $user_id = $payload['user_id'];
        } elseif (isset($payload['id'])) {
            $user_id = $payload['id'];
        } elseif (isset($payload['sub'])) {
            $user_id = $payload['sub'];
        }
        
        if (!$user_id) {
            return false;
        }
        
        // Get complete user data from database
        return get_user_by_id($user_id);
        
    } catch (Exception $e) {
        error_log("Token decode error: " . $e->getMessage());
        return false;
    }
}

/**
 * Get user data by ID from database
 */
function get_user_by_id($user_id) {
    try {
        $pdo = get_db_connection();
        
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
            // Convert boolean fields
            $user['validado'] = (bool)$user['validado'];
            // Convert numeric fields
            $user['id'] = (int)$user['id'];
            $user['actividad_preferida_id'] = (int)$user['actividad_preferida_id'];
            $user['localidad_id'] = (int)$user['localidad_id'];
            if ($user['imagen_perfil_id']) {
                $user['imagen_perfil_id'] = (int)$user['imagen_perfil_id'];
            }
        }
        
        return $user;
        
    } catch (Exception $e) {
        error_log("Get user by ID error: " . $e->getMessage());
        return false;
    }
}

/**
 * Main authentication function that should be used in feed files
 * This combines token verification with database user lookup
 */
function authenticate_user($token) {
    if (!$token) {
        return false;
    }
    
    // First verify the token using your existing Auth class
    $auth = getAuthInstance();
    $session_check = $auth->checkSession($token);
    
    if (!$session_check || !$session_check['valid']) {
        return false;
    }
    
    // Now get the complete user data
    $user_data = decodeTokenAndGetUser($token);
    
    if (!$user_data) {
        return false;
    }
    
    return $user_data;
}

/**
 * Generate a JWT token for a user using existing Auth class
 */
function generate_token($user_data) {
    try {
        $auth = getAuthInstance();
        
        // Check if your Auth class has a generateToken method
        if (method_exists($auth, 'generateToken')) {
            return $auth->generateToken($user_data);
        }
        
        // Check for other common method names
        if (method_exists($auth, 'createToken')) {
            return $auth->createToken($user_data);
        }
        
        if (method_exists($auth, 'createAuthToken')) {
            return $auth->createAuthToken($user_data);
        }
        
        // If no specific method exists, return false
        // Your existing auth system should handle token creation
        return false;
        
    } catch (Exception $e) {
        error_log("Token generation error: " . $e->getMessage());
        return false;
    }
}

/**
 * Register a new user using existing Auth class
 */
function register_user($user_data) {
    try {
        $auth = getAuthInstance();
        return $auth->register($user_data);
    } catch (Exception $e) {
        error_log("User registration error: " . $e->getMessage());
        return [
            'success' => false,
            'message' => 'Registration failed: ' . $e->getMessage()
        ];
    }
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
 * Validate token format (basic check)
 */
function is_valid_token_format($token) {
    if (!$token || !is_string($token)) {
        return false;
    }
    
    // Check if it looks like a JWT (3 parts separated by dots)
    $parts = explode('.', $token);
    return count($parts) === 3;
}

/**
 * Get current user from token (shorthand function)
 * Note: renamed to avoid conflict with PHP's built-in get_current_user()
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
?>