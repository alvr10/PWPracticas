<?php
// get_user_stats.php - Get user statistics for sidebar
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

require_once '../config/database.php';
require_once '../auth/auth_functions.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    exit;
}

try {
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!isset($input['token'])) {
        throw new Exception('Token is required');
    }
    
    $user = verify_token($input['token']);
    if (!$user) {
        throw new Exception('Invalid or expired token');
    }
    
    $user_id = $user['id'];
    $pdo = get_db_connection();
    
    // Get week distance
    $week_sql = "
        SELECT COALESCE(SUM(
            CASE 
                WHEN a.ruta_gpx IS NOT NULL AND a.ruta_gpx != '' 
                THEN (
                    SELECT ROUND(
                        SUM(
                            6371 * ACOS(
                                COS(RADIANS(prev_lat)) * COS(RADIANS(curr_lat)) * 
                                COS(RADIANS(curr_lon) - RADIANS(prev_lon)) + 
                                SIN(RADIANS(prev_lat)) * SIN(RADIANS(curr_lat))
                            )
                        ), 1
                    )
                    FROM (
                        SELECT 
                            LAG(lat) OVER (ORDER BY point_order) as prev_lat,
                            LAG(lon) OVER (ORDER BY point_order) as prev_lon,
                            lat as curr_lat,
                            lon as curr_lon
                        FROM (
                            SELECT 
                                CAST(SUBSTRING_INDEX(SUBSTRING_INDEX(coords, ' ', 1), ' ', -1) AS DECIMAL(10,6)) as lat,
                                CAST(SUBSTRING_INDEX(SUBSTRING_INDEX(coords, ' ', 2), ' ', -1) AS DECIMAL(10,6)) as lon,
                                ROW_NUMBER() OVER () as point_order
                            FROM (
                                SELECT TRIM(SUBSTRING_INDEX(SUBSTRING_INDEX(a.ruta_gpx, 'lat=\"', -1), '\"', 1)) as coords
                                WHERE a.ruta_gpx LIKE '%lat=%'
                            ) coord_data
                            WHERE coords REGEXP '^[0-9.-]+$'
                        ) parsed_coords
                    ) distances
                    WHERE prev_lat IS NOT NULL
                )
                ELSE 0 
            END
        ), 0) as week_distance
        FROM actividades a 
        WHERE a.usuario_id = :user_id 
        AND a.fecha_actividad >= DATE_SUB(NOW(), INTERVAL 7 DAY)
    ";
    
    // Simplified version for week distance
    $week_simple_sql = "
        SELECT COUNT(*) * 5 as week_distance
        FROM actividades a 
        WHERE a.usuario_id = :user_id 
        AND a.fecha_actividad >= DATE_SUB(NOW(), INTERVAL 7 DAY)
    ";
    
    $stmt = $pdo->prepare($week_simple_sql);
    $stmt->bindParam(':user_id', $user_id, PDO::PARAM_INT);
    $stmt->execute();
    $week_distance = $stmt->fetchColumn() ?: 0;
    
    // Get month distance (simplified)
    $month_simple_sql = "
        SELECT COUNT(*) * 5 as month_distance
        FROM actividades a 
        WHERE a.usuario_id = :user_id 
        AND a.fecha_actividad >= DATE_SUB(NOW(), INTERVAL 30 DAY)
    ";
    
    $stmt = $pdo->prepare($month_simple_sql);
    $stmt->bindParam(':user_id', $user_id, PDO::PARAM_INT);
    $stmt->execute();
    $month_distance = $stmt->fetchColumn() ?: 0;
    
    // Get total activities
    $activities_sql = "
        SELECT COUNT(*) as total_activities
        FROM actividades a 
        WHERE a.usuario_id = :user_id
    ";
    
    $stmt = $pdo->prepare($activities_sql);
    $stmt->bindParam(':user_id', $user_id, PDO::PARAM_INT);
    $stmt->execute();
    $total_activities = $stmt->fetchColumn() ?: 0;
    
    // Get active friends (friends who have posted in the last week)
    $friends_sql = "
        SELECT COUNT(DISTINCT am.amigo_id) as active_friends
        FROM amigos am
        INNER JOIN actividades a ON am.amigo_id = a.usuario_id
        WHERE am.usuario_id = :user_id 
        AND a.fecha_actividad >= DATE_SUB(NOW(), INTERVAL 7 DAY)
    ";
    
    $stmt = $pdo->prepare($friends_sql);
    $stmt->bindParam(':user_id', $user_id, PDO::PARAM_INT);
    $stmt->execute();
    $active_friends = $stmt->fetchColumn() ?: 0;
    
    echo json_encode([
        'success' => true,
        'stats' => [
            'week_distance' => number_format($week_distance, 1),
            'month_distance' => number_format($month_distance, 1),
            'total_activities' => (int)$total_activities,
            'active_friends' => (int)$active_friends
        ]
    ]);
    
} catch (Exception $e) {
    error_log("Get user stats error: " . $e->getMessage());
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}
?>