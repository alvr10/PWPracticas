-- Crear la base de datos
CREATE DATABASE IF NOT EXISTS red_social_deportiva;
USE red_social_deportiva;

-- Tabla de países
CREATE TABLE IF NOT EXISTS paises (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Tabla de provincias
CREATE TABLE IF NOT EXISTS provincias (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    pais_id INT NOT NULL,
    FOREIGN KEY (pais_id) REFERENCES paises(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Tabla de localidades
CREATE TABLE IF NOT EXISTS localidades (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    provincia_id INT NOT NULL,
    FOREIGN KEY (provincia_id) REFERENCES provincias(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Tabla de roles
CREATE TABLE IF NOT EXISTS roles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Tabla de tipos de actividad
CREATE TABLE IF NOT EXISTS tipos_actividad (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Tabla de usuarios
CREATE TABLE IF NOT EXISTS usuarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    apellidos VARCHAR(100) NOT NULL,
    fecha_nacimiento DATE NOT NULL,
    actividad_preferida_id INT,
    localidad_id INT,
    rol_id INT DEFAULT 2, -- 2 = usuario normal
    fecha_alta TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_baja DATETIME NULL,
    codigo_validacion VARCHAR(255) NULL,
    validado BOOLEAN DEFAULT FALSE,
    imagen_perfil_id INT NULL,
    FOREIGN KEY (actividad_preferida_id) REFERENCES tipos_actividad(id),
    FOREIGN KEY (localidad_id) REFERENCES localidades(id),
    FOREIGN KEY (rol_id) REFERENCES roles(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Tabla de relaciones de amistad
CREATE TABLE IF NOT EXISTS amigos (
    usuario_id INT NOT NULL,
    amigo_id INT NOT NULL,
    fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (usuario_id, amigo_id),
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    FOREIGN KEY (amigo_id) REFERENCES usuarios(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Tabla de imágenes
CREATE TABLE IF NOT EXISTS imagenes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT NOT NULL,
    nombre VARCHAR(255) NOT NULL,
    tamaño INT NOT NULL, -- en bytes
    alto INT NOT NULL, -- en píxeles
    ancho INT NOT NULL, -- en píxeles
    ruta VARCHAR(255) NOT NULL,
    fecha_subida TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Tabla de actividades
CREATE TABLE IF NOT EXISTS actividades (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT NOT NULL,
    titulo VARCHAR(255) NOT NULL,
    tipo_actividad_id INT NOT NULL,
    ruta_gpx TEXT NOT NULL,
    fecha_actividad DATETIME NOT NULL,
    fecha_publicacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    FOREIGN KEY (tipo_actividad_id) REFERENCES tipos_actividad(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Tabla de compañeros de actividad
CREATE TABLE IF NOT EXISTS actividad_companeros (
    actividad_id INT NOT NULL,
    usuario_id INT NOT NULL,
    PRIMARY KEY (actividad_id, usuario_id),
    FOREIGN KEY (actividad_id) REFERENCES actividades(id) ON DELETE CASCADE,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Tabla de aplausos a actividades
CREATE TABLE IF NOT EXISTS actividad_aplausos (
    actividad_id INT NOT NULL,
    usuario_id INT NOT NULL,
    fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (actividad_id, usuario_id),
    FOREIGN KEY (actividad_id) REFERENCES actividades(id) ON DELETE CASCADE,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Tabla de imágenes en actividades
CREATE TABLE IF NOT EXISTS actividad_imagenes (
    actividad_id INT NOT NULL,
    imagen_id INT NOT NULL,
    PRIMARY KEY (actividad_id, imagen_id),
    FOREIGN KEY (actividad_id) REFERENCES actividades(id) ON DELETE CASCADE,
    FOREIGN KEY (imagen_id) REFERENCES imagenes(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Tabla para tokens de recuperación
CREATE TABLE IF NOT EXISTS recovery_tokens (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT NOT NULL,
    token VARCHAR(255) NOT NULL,
    expiracion DATETIME NOT NULL,
    usado TINYINT(1) DEFAULT 0,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Tabla para intentos de login
CREATE TABLE IF NOT EXISTS login_attempts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(100) NOT NULL,
    ip VARCHAR(45) NOT NULL,
    intento_tiempo TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Datos iniciales
INSERT INTO paises (nombre) VALUES 
('España'), ('Portugal'), ('Francia');

INSERT INTO provincias (nombre, pais_id) VALUES 
('Madrid', 1), ('Barcelona', 1), ('Lisboa', 2), ('París', 3);

INSERT INTO localidades (nombre, provincia_id) VALUES 
('Madrid', 1), ('Alcalá de Henares', 1), ('Barcelona', 2), ('Hospitalet', 2), ('Lisboa', 3), ('París', 4);

INSERT INTO roles (nombre) VALUES 
('admin'), ('usuario');

INSERT INTO tipos_actividad (nombre) VALUES 
('Ciclismo en ruta'), ('Ciclismo MTB'), ('Senderismo'), ('Carrera');

-- Usuario admin por defecto
INSERT INTO usuarios (username, email, password, nombre, apellidos, fecha_nacimiento, actividad_preferida_id, localidad_id, rol_id, validado) 
VALUES ('admin', 'admin@runtrackpro.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Admin', 'Admin', '1990-01-01', 1, 1, 1, TRUE);

-- Usuario demo
INSERT INTO usuarios (username, email, password, nombre, apellidos, fecha_nacimiento, actividad_preferida_id, localidad_id, rol_id, validado) 
VALUES ('usuario', 'usuario@runtrackpro.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Usuario', 'Demo', '1995-05-15', 4, 3, 2, TRUE);

-- Actualizar la tabla usuarios para que imagen_perfil_id haga referencia a imagenes
ALTER TABLE usuarios ADD CONSTRAINT fk_imagen_perfil 
FOREIGN KEY (imagen_perfil_id) REFERENCES imagenes(id) ON DELETE SET NULL;