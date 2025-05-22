<?php
// search_activities.php - Search activities and users
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

require_once '../config/database.php';
require_once '../auth/auth_functions.php';

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    exit;
}

try {
    // Get JSON input
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input) {
        throw new Exception('Invalid JSON input');
    }
    
    // Validate required fields
    if (!isset($input['token']) || !isset($input['query'])) {
        throw new Exception('Token and query are required');
    }
    
    // Verify authentication
    $user = verify_token($input['token']);
    if (!$user) {
        throw new Exception('Invalid or expired token');
    }
    
    $user_id = $user['id'];
    $query = trim($input['query']);
    $limit = isset($input['limit']) ? min((int)$input['limit'], 50) : 20;
    
    if (strlen($query) < 2) {
        throw new Exception('Search query must be at least 2 characters long');
    }
    
    // Create database connection
    $pdo = get_db_connection();
    
    // Prepare search term for LIKE queries
    $search_term = '%' . $query . '%';
    
    // Search activities by title, activity type, or user name
    $sql = "
        SELECT DISTINCT
            a.id,
            a.titulo,
            a.tipo_actividad_id,
            a.ruta_gpx,
            a.fecha_actividad,
            a.fecha_publicacion,
            u.id as usuario_id,
            u.nombre as usuario_nombre,
            u.apellidos as usuario_apellidos,
            u.username as usuario_username,
            ta.nombre as tipo_actividad_nombre,
            (SELECT COUNT(*) FROM actividad_aplausos aa WHERE aa.actividad_id = a.id) as aplausos_count,
            (SELECT COUNT(*) > 0 FROM actividad_aplausos aa WHERE aa.actividad_id = a.id AND aa.usuario_id = :user_id) as user_applauded,
            (SELECT i.nombre FROM imagenes i WHERE i.id = u.imagen_perfil_id) as usuario_imagen,
            l.nombre as localidad_nombre,
            p.nombre as provincia_nombre,
            pa.nombre as pais_nombre
        FROM actividades a
        INNER JOIN usuarios u ON a.usuario_id = u.id
        INNER JOIN tipos_actividad ta ON a.tipo_actividad_id = ta.id
        LEFT JOIN localidades l ON u.localidad_id = l.id
        LEFT JOIN provincias p ON l.provincia_id = p.id
        LEFT JOIN paises pa ON p.pais_id = pa.id
        LEFT JOIN amigos am ON (am.usuario_id = :user_id2 AND am.amigo_id = a.usuario_id)
        WHERE (
            -- Only show activities from friends or own activities, or public profiles
            a.usuario_id = :user_id3 OR 
            am.usuario_id IS NOT NULL OR
            EXISTS (
                SELECT 1 FROM usuarios u2 
                WHERE u2.id = a.usuario_id 
                AND u2.id != :user_id4
                -- Add privacy check here when implemented
            )
        )
        AND u.fecha_baja IS NULL
        AND (
            a.titulo LIKE :search_term1 OR
            ta.nombre LIKE :search_term2 OR
            CONCAT(u.nombre, ' ', u.apellidos) LIKE :search_term3 OR
            u.username LIKE :search_term4 OR
            l.nombre LIKE :search_term5 OR
            p.nombre LIKE :search_term6
        )
        ORDER BY 
            -- Prioritize recent activities
            a.fecha_publicacion DESC,
            -- Then by relevance (exact matches first)
            CASE 
                WHEN a.titulo LIKE CONCAT(:exact_term1, '%') THEN 1
                WHEN CONCAT(u.nombre, ' ', u.apellidos) LIKE CONCAT(:exact_term2, '%') THEN 2
                WHEN u.username LIKE CONCAT(:exact_term3, '%') THEN 3
                ELSE 4
            END
        LIMIT :limit
    ";
    
    $stmt = $pdo->prepare($sql);
    $stmt->bindParam(':user_id', $user_id, PDO::PARAM_INT);
    $stmt->bindParam(':user_id2', $user_id, PDO::PARAM_INT);
    $stmt->bindParam(':user_id3', $user_id, PDO::PARAM_INT);
    $stmt->bindParam(':user_id4', $user_id, PDO::PARAM_INT);
    $stmt->bindParam(':search_term1', $search_term, PDO::PARAM_STR);
    $stmt->bindParam(':search_term2', $search_term, PDO::PARAM_STR);
    $stmt->bindParam(':search_term3', $search_term, PDO::PARAM_STR);
    $stmt->bindParam(':search_term4', $search_term, PDO::PARAM_STR);
    $stmt->bindParam(':search_term5', $search_term, PDO::PARAM_STR);
    $stmt->bindParam(':search_term6', $search_term, PDO::PARAM_STR);
    $stmt->bindParam(':exact_term1', $query, PDO::PARAM_STR);
    $stmt->bindParam(':exact_term2', $query, PDO::PARAM_STR);
    $stmt->bindParam(':exact_term3', $query, PDO::PARAM_STR);
    $stmt->bindParam(':limit', $limit, PDO::PARAM_INT);
    $stmt->execute();
    
    $activities = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // For each activity, get additional data
    foreach ($activities as &$activity) {
        $activity_id = $activity['id'];
        
        // Get activity images
        $img_sql = "
            SELECT i.id, i.nombre, i.ruta 
            FROM actividad_imagenes ai 
            INNER JOIN imagenes i ON ai.imagen_id = i.id 
            WHERE ai.actividad_id = :activity_id
            ORDER BY i.fecha_subida ASC
        ";
        $img_stmt = $pdo->prepare($img_sql);
        $img_stmt->bindParam(':activity_id', $activity_id, PDO::PARAM_INT);
        $img_stmt->execute();
        $activity['imagenes'] = $img_stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Get activity companions
        $comp_sql = "
            SELECT u.id, u.nombre, u.apellidos, u.username
            FROM actividad_companeros ac
            INNER JOIN usuarios u ON ac.usuario_id = u.id
            WHERE ac.actividad_id = :activity_id
            AND u.fecha_baja IS NULL
        ";
        $comp_stmt = $pdo->prepare($comp_sql);
        $comp_stmt->bindParam(':activity_id', $activity_id, PDO::PARAM_INT);
        $comp_stmt->execute();
        $activity['companeros'] = $comp_stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Convert boolean values
        $activity['user_applauded'] = (bool)$activity['user_applauded'];
        $activity['aplausos_count'] = (int)$activity['aplausos_count'];
        
        // Set user image path
        if ($activity['usuario_imagen']) {
            $activity['usuario_imagen'] = '../../assets/img/profiles/' . $activity['usuario_imagen'];
        }
        
        // Add location info
        $location_parts = array_filter([
            $activity['localidad_nombre'],
            $activity['provincia_nombre'],
            $activity['pais_nombre']
        ]);
        $activity['ubicacion'] = implode(', ', $location_parts);
    }
    
    // Also search for users if query looks like a username or name
    $users = [];
    if (strlen($query) >= 2) {
        $user_sql = "
            SELECT 
                u.id,
                u.username,
                u.nombre,
                u.apellidos,
                u.fecha_alta,
                (SELECT i.nombre FROM imagenes i WHERE i.id = u.imagen_perfil_id) as imagen_perfil,
                l.nombre as localidad_nombre,
                p.nombre as provincia_nombre,
                pa.nombre as pais_nombre,
                (SELECT COUNT(*) FROM amigos a WHERE a.usuario_id = :user_id5 AND a.amigo_id = u.id) as es_amigo,
                (SELECT COUNT(*) FROM actividades a WHERE a.usuario_id = u.id) as total_actividades
            FROM usuarios u
            LEFT JOIN localidades l ON u.localidad_id = l.id
            LEFT JOIN provincias p ON l.provincia_id = p.id
            LEFT JOIN paises pa ON p.pais_id = pa.id
            WHERE u.fecha_baja IS NULL
            AND u.id != :user_id6
            AND (
                CONCAT(u.nombre, ' ', u.apellidos) LIKE :search_term7 OR
                u.username LIKE :search_term8
            )
            ORDER BY 
                CASE 
                    WHEN u.username LIKE CONCAT(:exact_term4, '%') THEN 1
                    WHEN CONCAT(u.nombre, ' ', u.apellidos) LIKE CONCAT(:exact_term5, '%') THEN 2
                    ELSE 3
                END,
                u.fecha_alta DESC
            LIMIT 10
        ";
        
        $user_stmt = $pdo->prepare($user_sql);
        $user_stmt->bindParam(':user_id5', $user_id, PDO::PARAM_INT);
        $user_stmt->bindParam(':user_id6', $user_id, PDO::PARAM_INT);
        $user_stmt->bindParam(':search_term7', $search_term, PDO::PARAM_STR);
        $user_stmt->bindParam(':search_term8', $search_term, PDO::PARAM_STR);
        $user_stmt->bindParam(':exact_term4', $query, PDO::PARAM_STR);
        $user_stmt->bindParam(':exact_term5', $query, PDO::PARAM_STR);
        $user_stmt->execute();
        
        $users = $user_stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Process user data
        foreach ($users as &$user_data) {
            $user_data['es_amigo'] = (bool)$user_data['es_amigo'];
            $user_data['total_actividades'] = (int)$user_data['total_actividades'];
            
            if ($user_data['imagen_perfil']) {
                $user_data['imagen_perfil'] = '../../assets/img/profiles/' . $user_data['imagen_perfil'];
            }
            
            // Add location info
            $location_parts = array_filter([
                $user_data['localidad_nombre'],
                $user_data['provincia_nombre'],
                $user_data['pais_nombre']
            ]);
            $user_data['ubicacion'] = implode(', ', $location_parts);
        }
    }
    
    echo json_encode([
        'success' => true,
        'query' => $query,
        'activities' => $activities,
        'users' => $users,
        'total_activities' => count($activities),
        'total_users' => count($users)
    ]);
    
} catch (Exception $e) {
    error_log("Search activities error: " . $e->getMessage());
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}
?>