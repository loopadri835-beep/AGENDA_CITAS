const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: 'postgres', // Conectar primero a postgres
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function migrate() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Iniciando migración...');

    // Verificar si la base de datos existe
    const dbCheck = await client.query(
      `SELECT 1 FROM pg_database WHERE datname = $1`,
      [process.env.DB_NAME]
    );

    if (dbCheck.rows.length === 0) {
      console.log('📦 Creando base de datos...');
      await client.query(`CREATE DATABASE ${process.env.DB_NAME}`);
      console.log('✅ Base de datos creada');
    } else {
      console.log('✅ Base de datos ya existe');
    }

    // Reconectar a la base de datos específica
    await client.release();
    const appPool = new Pool({
      user: process.env.DB_USER,
      host: process.env.DB_HOST,
      database: process.env.DB_NAME,
      password: process.env.DB_PASSWORD,
      port: process.env.DB_PORT,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });

    const appClient = await appPool.connect();

    console.log('📋 Creando tablas...');

    // Tabla de servicios
    await appClient.query(`
      CREATE TABLE IF NOT EXISTS services (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        icon VARCHAR(10),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Tabla de sub-servicios
    await appClient.query(`
      CREATE TABLE IF NOT EXISTS sub_services (
        id SERIAL PRIMARY KEY,
        service_id INTEGER REFERENCES services(id) ON DELETE CASCADE,
        name VARCHAR(150) NOT NULL,
        duration_minutes INTEGER DEFAULT 60,
        price DECIMAL(10,2),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Tabla de clientes (permitir email opcional, NULLs permitidos)
    await appClient.query(`
      CREATE TABLE IF NOT EXISTS clients (
        id SERIAL PRIMARY KEY,
        name VARCHAR(150) NOT NULL,
        email VARCHAR(150) UNIQUE,
        phone VARCHAR(20),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    // Acomodar filas antiguas y permitir NULLs
    await appClient.query(`
      UPDATE clients SET email = NULL WHERE TRIM(email) = '';
    `);
    await appClient.query(`
      ALTER TABLE clients ALTER COLUMN email DROP NOT NULL;
    `);

    // Tabla de citas
    await appClient.query(`
      CREATE TABLE IF NOT EXISTS appointments (
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
      )
    `);

    console.log('✅ Tablas creadas');

    // Verificar si ya hay datos
    const servicesCheck = await appClient.query('SELECT COUNT(*) FROM services');
    
    if (servicesCheck.rows[0].count === '0') {
      console.log('📥 Insertando datos iniciales...');

      // Insertar servicios
      await appClient.query(`
        INSERT INTO services (name, icon) VALUES 
        ('Maquillaje', '💄'),
        ('BeautyLash', '👁️')
      `);

      // Insertar sub-servicios de Maquillaje
      await appClient.query(`
        INSERT INTO sub_services (service_id, name, duration_minutes, price) VALUES 
        (1, 'Maquillaje Social', 60, 35.00),
        (1, 'Maquillaje de Novia', 90, 80.00),
        (1, 'Maquillaje para Fotografías', 75, 50.00)
      `);

      // Insertar sub-servicios de BeautyLash
      await appClient.query(`
        INSERT INTO sub_services (service_id, name, duration_minutes, price) VALUES 
        (2, 'Colocación de Pestañas', 120, 45.00),
        (2, 'Lifting de Cejas', 60, 30.00),
        (2, 'Lifting de Pestañas', 90, 40.00),
        (2, 'Pestañas Pelo a Pelo', 150, 70.00)
      `);

      console.log('✅ Datos iniciales insertados');
    } else {
      console.log('✅ Los datos ya existen');
    }

    await appClient.release();
    await appPool.end();
    console.log('🎉 Migración completada exitosamente');
    process.exit(0);

  } catch (error) {
    console.error('❌ Error en la migración:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

migrate();