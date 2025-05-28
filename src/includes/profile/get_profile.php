<?php
// src/includes/profile/get_profile.php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

// Debug mode - remove in production
error_reporting(E_ALL);
ini_set('display_errors', 1);

require_once '../config/database.php';
require_once '../auth/auth_functions.php';

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

try {
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input) {
        throw new Exception('Invalid JSON input');
    }
    
    if (!isset($input['token'])) {
        throw new Exception('Token is required');
    }
    
    $token = $input['token'];
    
    // Verify authentication using auth_functions
    $user = verify_token($token);
    if (!$user) {
        http_response_code(401);
        echo json_encode([
            'success' => false,
            'error' => 'Invalid or expired token'
        ]);
        exit;
    }
    
    $userId = $user['id'];
    $pdo = get_db_connection();

    if (!$pdo) {
        throw new Exception('Database connection failed');
    }

    // Get basic user data with location information
    $stmt = $pdo->prepare("
        SELECT 
            u.id, u.username, u.email, u.nombre, u.apellidos, 
            DATE_FORMAT(u.fecha_nacimiento, '%Y-%m-%d') as fecha_nacimiento,
            u.actividad_preferida_id, u.localidad_id,
            l.nombre as localidad_nombre, 
            p.nombre as provincia_nombre, 
            pa.nombre as pais_nombre, 
            ta.nombre as actividad_nombre,
            DATE_FORMAT(u.fecha_alta, '%M %Y') as fecha_alta_formatted,
            i.nombre as imagen_perfil,
            l.provincia_id,
            p.pais_id
        FROM usuarios u
        LEFT JOIN localidades l ON u.localidad_id = l.id
        LEFT JOIN provincias p ON l.provincia_id = p.id
        LEFT JOIN paises pa ON p.pais_id = pa.id
        LEFT JOIN tipos_actividad ta ON u.actividad_preferida_id = ta.id
        LEFT JOIN imagenes i ON u.imagen_perfil_id = i.id
        WHERE u.id = ? AND u.fecha_baja IS NULL
    ");
    $stmt->execute([$userId]);
    $userData = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$userData) {
        http_response_code(404);
        echo json_encode([
            'success' => false,
            'error' => 'Usuario no encontrado'
        ]);
        exit;
    }

    // Get user statistics
    $statsStmt = $pdo->prepare("
        SELECT 
            COUNT(DISTINCT a.id) as total_actividades,
            COALESCE(SUM(
                CASE 
                    WHEN a.ruta_gpx IS NOT NULL AND a.ruta_gpx != '' 
                    THEN 5.0  -- Estimated 5km per activity for demo
                    ELSE 0 
                END
            ), 0) as total_distancia,
            (SELECT COUNT(*) 
             FROM amigos 
             WHERE (usuario_id = ? OR amigo_id = ?)
            ) as total_amigos,
            (SELECT COUNT(*) 
             FROM actividad_aplausos aa 
             JOIN actividades act ON aa.actividad_id = act.id 
             WHERE act.usuario_id = ?
            ) as total_aplausos
        FROM actividades a
        WHERE a.usuario_id = ?
    ");
    $statsStmt->execute([$userId, $userId, $userId, $userId]);
    $stats = $statsStmt->fetch(PDO::FETCH_ASSOC);

    // Get recent activities (last 3)
    $activitiesStmt = $pdo->prepare("
        SELECT 
            a.id, a.titulo, ta.nombre as tipo_actividad, 
            DATE_FORMAT(a.fecha_actividad, '%e de %M') as fecha_formatted,
            (SELECT COUNT(*) FROM actividad_aplausos WHERE actividad_id = a.id) as aplausos
        FROM actividades a
        JOIN tipos_actividad ta ON a.tipo_actividad_id = ta.id
        WHERE a.usuario_id = ?
        ORDER BY a.fecha_actividad DESC
        LIMIT 3
    ");
    $activitiesStmt->execute([$userId]);
    $activities = $activitiesStmt->fetchAll(PDO::FETCH_ASSOC);

    // Format location
    $location_parts = array_filter([
        $userData['localidad_nombre'],
        $userData['provincia_nombre'],
        $userData['pais_nombre']
    ]);
    $location = implode(', ', $location_parts);

    // Format response
    $response = [
        'success' => true,
        'user' => [
            'id' => (int)$userData['id'],
            'username' => $userData['username'],
            'email' => $userData['email'],
            'name' => $userData['nombre'],
            'lastname' => $userData['apellidos'],
            'birthdate' => $userData['fecha_nacimiento'],
            'location' => $location ?: 'No especificada',
            'activity' => $userData['actividad_nombre'] ?: 'No especificada',
            'activity_id' => $userData['actividad_preferida_id'],
            'join_date' => $userData['fecha_alta_formatted'],
            'avatar_url' => $userData['imagen_perfil'] ? 
                '../../../public/profiles/' . $userData['imagen_perfil'] : 
                '../../../public/profiles/gigachad_cat.jpg',
            'country' => $userData['pais_id'],
            'province' => $userData['provincia_id'],
            'city' => $userData['localidad_id']
        ],
        'stats' => [
            'total_actividades' => (int)$stats['total_actividades'],
            'total_distancia' => number_format((float)$stats['total_distancia'], 1),
            'total_amigos' => (int)$stats['total_amigos'],
            'total_aplausos' => (int)$stats['total_aplausos']
        ],
        'activities' => $activities ?: []
    ];

    echo json_encode($response);

} catch (Exception $e) {
    error_log("Get profile error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
?>