<?php
// src/includes/profile/get_friend_profile.php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

require_once '../config/database.php';
require_once '../auth/auth_functions.php';

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
    
    if (!isset($input['token']) || !isset($input['user_id'])) {
        throw new Exception('Token and user_id are required');
    }
    
    $token = $input['token'];
    $target_user_id = (int)$input['user_id'];
    
    // Verify authentication
    $current_user = verify_token($token);
    if (!$current_user) {
        http_response_code(401);
        echo json_encode([
            'success' => false,
            'error' => 'Invalid or expired token'
        ]);
        exit;
    }
    
    $current_user_id = $current_user['id'];
    $pdo = get_db_connection();

    if (!$pdo) {
        throw new Exception('Database connection failed');
    }

    // Get target user data with location information
    $stmt = $pdo->prepare("
        SELECT 
            u.id, u.username, u.nombre, u.apellidos, 
            DATE_FORMAT(u.fecha_nacimiento, '%Y-%m-%d') as fecha_nacimiento,
            u.actividad_preferida_id, u.localidad_id,
            l.nombre as localidad_nombre, 
            p.nombre as provincia_nombre, 
            pa.nombre as pais_nombre, 
            ta.nombre as actividad_nombre,
            DATE_FORMAT(u.fecha_alta, '%M %Y') as fecha_alta_formatted,
            i.nombre as imagen_perfil,
            (
                SELECT MAX(a.fecha_actividad)
                FROM actividades a
                WHERE a.usuario_id = u.id
            ) as ultima_actividad_fecha
        FROM usuarios u
        LEFT JOIN localidades l ON u.localidad_id = l.id
        LEFT JOIN provincias p ON l.provincia_id = p.id
        LEFT JOIN paises pa ON p.pais_id = pa.id
        LEFT JOIN tipos_actividad ta ON u.actividad_preferida_id = ta.id
        LEFT JOIN imagenes i ON u.imagen_perfil_id = i.id
        WHERE u.id = ? AND u.fecha_baja IS NULL
    ");
    $stmt->execute([$target_user_id]);
    $userData = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$userData) {
        http_response_code(404);
        echo json_encode([
            'success' => false,
            'error' => 'Usuario no encontrado'
        ]);
        exit;
    }

    // Check if current user can view this profile
    $can_view = true;
    $is_following = false;
    
    // Check if users are friends
    $friend_check = $pdo->prepare("
        SELECT COUNT(*) as count 
        FROM amigos 
        WHERE usuario_id = ? AND amigo_id = ?
    ");
    $friend_check->execute([$current_user_id, $target_user_id]);
    $is_following = $friend_check->fetch(PDO::FETCH_ASSOC)['count'] > 0;
    

    if (!$can_view) {
        http_response_code(403);
        echo json_encode([
            'success' => false,
            'error' => 'No tienes permisos para ver este perfil'
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
             WHERE amigo_id = ?
            ) as followers_count,
            (SELECT COUNT(*) 
             FROM amigos 
             WHERE usuario_id = ?
            ) as following_count
        FROM actividades a
        WHERE a.usuario_id = ?
    ");
    $statsStmt->execute([$target_user_id, $target_user_id, $target_user_id]);
    $stats = $statsStmt->fetch(PDO::FETCH_ASSOC);

    // Format location
    $location_parts = array_filter([
        $userData['localidad_nombre'],
        $userData['provincia_nombre'],
        $userData['pais_nombre']
    ]);
    $location = implode(', ', $location_parts);

    // Format last activity
    $last_activity = 'Sin actividad reciente';
    if ($userData['ultima_actividad_fecha']) {
        $last_date = new DateTime($userData['ultima_actividad_fecha']);
        $now = new DateTime();
        $diff = $now->diff($last_date);
        
        if ($diff->days == 0) {
            $last_activity = 'Hoy';
        } elseif ($diff->days == 1) {
            $last_activity = 'Ayer';
        } elseif ($diff->days < 7) {
            $last_activity = "Hace {$diff->days} días";
        } elseif ($diff->days < 30) {
            $weeks = floor($diff->days / 7);
            $last_activity = "Hace {$weeks} semana" . ($weeks > 1 ? 's' : '');
        } else {
            $last_activity = "Hace más de un mes";
        }
    }

    // Format response
    $response = [
        'success' => true,
        'user' => [
            'id' => (int)$userData['id'],
            'username' => $userData['username'],
            'name' => $userData['nombre'],
            'lastname' => $userData['apellidos'],
            'location' => $location ?: 'No especificada',
            'activity' => $userData['actividad_nombre'] ?: 'No especificada',
            'join_date' => $userData['fecha_alta_formatted'],
            'last_activity' => $last_activity,
            'avatar_url' => $userData['imagen_perfil'] ? 
                '../../../public/profiles/' . $userData['imagen_perfil'] : 
                '../../../public/profiles/default-avatar.jpg'
        ],
        'stats' => [
            'total_activities' => (int)$stats['total_actividades'],
            'total_distance' => number_format((float)$stats['total_distancia'], 1),
            'followers_count' => (int)$stats['followers_count'],
            'following_count' => (int)$stats['following_count']
        ],
        'is_following' => $is_following,
        'can_view_activities' => $can_view
    ];

    echo json_encode($response);

} catch (Exception $e) {
    error_log("Get friend profile error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
?>