-- Crear base de datos
CREATE DATABASE johana_makeup_db;

-- Conectarse a la base de datos
\c johana_makeup_db;

-- Tabla de servicios
CREATE TABLE services (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    icon VARCHAR(10),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de sub-servicios
CREATE TABLE sub_services (
    id SERIAL PRIMARY KEY,
    service_id INTEGER REFERENCES services(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    duration_minutes INTEGER DEFAULT 60,
    price DECIMAL(10,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de clientes
CREATE TABLE clients (
    id SERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    phone VARCHAR(20) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de citas
CREATE TABLE appointments (
    id SERIAL PRIMARY KEY,
    client_id INTEGER REFERENCES clients(id) ON DELETE CASCADE,
    service_id INTEGER REFERENCES services(id),
    sub_service_id INTEGER REFERENCES sub_services(id),
    appointment_date DATE NOT NULL,
    appointment_time VARCHAR(20) NOT NULL,
    status VARCHAR(20) DEFAULT 'confirmed',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(appointment_date, appointment_time)
);

-- Insertar servicios iniciales
INSERT INTO services (name, icon) VALUES 
('Maquillaje', '💄'),
('BeautyLash', '👁️');

-- Insertar sub-servicios de Maquillaje
INSERT INTO sub_services (service_id, name, duration_minutes, price) VALUES 
(1, 'Maquillaje Social', 60, 35.00),
(1, 'Maquillaje de Novia', 90, 80.00),
(1, 'Maquillaje para Fotografías', 75, 50.00);

-- Insertar sub-servicios de BeautyLash
INSERT INTO sub_services (service_id, name, duration_minutes, price) VALUES 
(2, 'Colocación de Pestañas', 120, 45.00),
(2, 'Lifting de Cejas', 60, 30.00),
(2, 'Lifting de Pestañas', 90, 40.00),
(2, 'Pestañas Pelo a Pelo', 150, 70.00);