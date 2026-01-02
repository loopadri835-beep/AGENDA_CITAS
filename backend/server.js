const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Middleware
const corsOptions = {
  origin: process.env.CORS_ORIGIN || '*', // change to a specific origin in production if needed
  methods: ['GET','POST','PATCH','DELETE','OPTIONS'],
  credentials: true,
};
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(express.json());

// Configuración PostgreSQL
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'johana_makeup_db',
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT || 5432,
});

// Verificar conexión
pool.connect((err, client, release) => {
  if (err) {
    console.error('❌ Error conectando a PostgreSQL:', err.stack);
  } else {
    console.log('✅ Conectado a PostgreSQL');
    release();
  }
});

// ====== RUTAS API ======

// Obtener todos los servicios
app.get('/api/services', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT s.*, 
             json_agg(json_build_object(
               'id', ss.id,
               'name', ss.name,
               'duration_minutes', ss.duration_minutes,
               'price', ss.price
             )) as sub_services
      FROM services s
      LEFT JOIN sub_services ss ON s.id = ss.service_id
      GROUP BY s.id
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Error obteniendo servicios:', err);
    res.status(500).json({ error: err.message });
  }
});

// Verificar disponibilidad de horario
app.get('/api/appointments/check', async (req, res) => {
  const { date, time } = req.query;
  try {
    const result = await pool.query(
      'SELECT * FROM appointments WHERE appointment_date = $1 AND appointment_time = $2',
      [date, time]
    );
    res.json({ available: result.rows.length === 0 });
  } catch (err) {
    console.error('Error verificando disponibilidad:', err);
    res.status(500).json({ error: err.message });
  }
});

// Obtener todas las citas de un día
app.get('/api/appointments/day/:date', async (req, res) => {
  const { date } = req.params;
  try {
    const result = await pool.query(
      `SELECT a.*, c.name as client_name, c.email, c.phone,
              s.name as service_name, ss.name as sub_service_name
       FROM appointments a
       JOIN clients c ON a.client_id = c.id
       JOIN services s ON a.service_id = s.id
       JOIN sub_services ss ON a.sub_service_id = ss.id
       WHERE a.appointment_date = $1
       ORDER BY a.appointment_time`,
      [date]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error obteniendo citas del día:', err);
    res.status(500).json({ error: err.message });
  }
});

// Obtener citas de una semana
app.get('/api/appointments/week/:startDate', async (req, res) => {
  const { startDate } = req.params;
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + 6);
  
  try {
    const result = await pool.query(
      `SELECT a.*, c.name as client_name, c.email, c.phone,
              s.name as service_name, ss.name as sub_service_name
       FROM appointments a
       JOIN clients c ON a.client_id = c.id
       JOIN services s ON a.service_id = s.id
       JOIN sub_services ss ON a.sub_service_id = ss.id
       WHERE a.appointment_date BETWEEN $1 AND $2
       ORDER BY a.appointment_date, a.appointment_time`,
      [startDate, endDate.toISOString().split('T')[0]]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error obteniendo citas de la semana:', err);
    res.status(500).json({ error: err.message });
  }
});

// Obtener todas las citas
app.get('/api/appointments', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT a.*, c.name as client_name, c.email, c.phone,
              s.name as service_name, ss.name as sub_service_name
       FROM appointments a
       JOIN clients c ON a.client_id = c.id
       JOIN services s ON a.service_id = s.id
       JOIN sub_services ss ON a.sub_service_id = ss.id
       ORDER BY a.appointment_date DESC, a.appointment_time DESC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error obteniendo todas las citas:', err);
    res.status(500).json({ error: err.message });
  }
});

// Crear nueva cita
app.post('/api/appointments', async (req, res) => {
  const { 
    clientName, 
    clientEmail, 
    clientPhone, 
    serviceId, 
    subServiceId, 
    date, 
    time 
  } = req.body;

  // Normalizar datos opcionales
  const safeEmail = clientEmail && clientEmail.trim() ? clientEmail.trim() : null;
  const safePhone = clientPhone && clientPhone.trim() ? clientPhone.trim() : null;

  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    // Verificar disponibilidad
    const checkAvailability = await client.query(
      'SELECT * FROM appointments WHERE appointment_date = $1 AND appointment_time = $2',
      [date, time]
    );

    if (checkAvailability.rows.length > 0) {
      throw new Error('Este horario ya está ocupado');
    }

    // Insertar o actualizar cliente
    const clientResult = await client.query(
      `INSERT INTO clients (name, email, phone) 
       VALUES ($1, $2, $3) 
       ON CONFLICT (email) 
       DO UPDATE SET name = EXCLUDED.name, phone = COALESCE(EXCLUDED.phone, clients.phone)
       RETURNING id`,
      [clientName, safeEmail, safePhone]
    );

    const clientId = clientResult.rows[0].id;

    // Crear cita
    const appointmentResult = await client.query(
      `INSERT INTO appointments 
       (client_id, service_id, sub_service_id, appointment_date, appointment_time)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [clientId, serviceId, subServiceId, date, time]
    );

    await client.query('COMMIT');

    res.status(201).json({
      message: 'Cita agendada exitosamente',
      appointment: appointmentResult.rows[0]
    });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error creando cita:', err);
    res.status(400).json({ error: err.message });
  } finally {
    client.release();
  }
});

// Cancelar cita
app.patch('/api/appointments/:id/cancel', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      `UPDATE appointments SET status = 'cancelled' WHERE id = $1 RETURNING *`,
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Cita no encontrada' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error cancelando cita:', err);
    res.status(500).json({ error: err.message });
  }
});

// Eliminar cita
app.delete('/api/appointments/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      'DELETE FROM appointments WHERE id = $1 RETURNING *',
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Cita no encontrada' });
    }
    res.json({ message: 'Cita eliminada exitosamente' });
  } catch (err) {
    console.error('Error eliminando cita:', err);
    res.status(500).json({ error: err.message });
  }
});

// Health check endpoint (useful for readiness probes)
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// Generic error handler (logs stack and returns JSON)
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err && err.stack ? err.stack : err);
  res.status(500).json({ error: 'Internal server error', message: err?.message });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
});