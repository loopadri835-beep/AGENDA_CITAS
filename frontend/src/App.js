import React, { useState, useEffect } from 'react';
import axios from 'axios';

import { useMemo } from "react";


// Antes:


// Después:
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const JohanaMakeupSalon = () => {
  const [currentView, setCurrentView] = useState('home');
  const [selectedService, setSelectedService] = useState('');
  const [selectedSubService, setSelectedSubService] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [customTime, setCustomTime] = useState('');
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [appointments, setAppointments] = useState([]);
  const [currentWeekStart, setCurrentWeekStart] = useState(getMonday(new Date()));

  useEffect(() => {
    loadAppointments();
  }, []);

  const loadAppointments = async () => {
    try {
      const response = await axios.get(`${API_URL}/appointments`);
      const formattedAppointments = response.data.map(apt => ({
        id: apt.id,
        service: apt.service_name,
        subService: apt.sub_service_name,
        // Normalizar la fecha a YYYY-MM-DD para que coincida con formatDate(date)
        date: new Date(apt.appointment_date).toISOString().split('T')[0],
        time: apt.appointment_time,
        clientName: apt.client_name,
        clientEmail: apt.email,
        clientPhone: apt.phone
      }));
      setAppointments(formattedAppointments);
    } catch (error) {
      console.error('Error cargando citas:', error);
    }
  };

  function getMonday(date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
  }

  function formatDate(date) {
    return date.toISOString().split('T')[0];
  }

  function formatTime(hour) {
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
    return `${displayHour.toString().padStart(2, '0')}:00 ${period}`;
  }

  const servicesData = {
    maquillaje: {
      name: 'Maquillaje',
      icon: '💄',
      subServices: [
        'Maquillaje Social',
        'Maquillaje de Novia',
        'Maquillaje para Fotografías'
      ]
    },
    beautylash: {
      name: 'BeautyLash',
      icon: '👁️',
      subServices: [
        'Colocación de Pestañas',
        'Lifting de Cejas',
        'Lifting de Pestañas',
        'Pestañas Pelo a Pelo'
      ]
    }
  };

  const timeSlots = [
    '06:00 AM', '07:00 AM', '08:00 AM', '09:00 AM', '10:00 AM', '11:00 AM',
    '12:00 PM', '01:00 PM', '02:00 PM', '03:00 PM', '04:00 PM', '05:00 PM',
    '06:00 PM', '07:00 PM', '08:00 PM', 'Otro horario'
  ];

  const workingHours = Array.from({ length: 15 }, (_, i) => i + 6);
  const daysOfWeek = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

  const getWeekDates = () => {
    const dates = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(currentWeekStart);
      date.setDate(currentWeekStart.getDate() + i);
      dates.push(date);
    }
    return dates;
  };

  const isTimeSlotOccupied = (date, hour) => {
    const dateStr = formatDate(date);
    const timeStr = formatTime(hour);
    return appointments.some(apt => 
      apt.date === dateStr && apt.time === timeStr
    );
  };

  const getAppointmentForSlot = (date, hour) => {
    const dateStr = formatDate(date);
    const timeStr = formatTime(hour);
    return appointments.find(apt => 
      apt.date === dateStr && apt.time === timeStr
    );
  };

  const isTimeSlotAvailable = (date, time) => {
    const timeToCheck = time === 'Otro horario' ? customTime : time;
    return !appointments.some(apt => 
      apt.date === date && apt.time === timeToCheck
    );
  };

  const handleBooking = async () => {
        if (
      !selectedService ||
      !selectedSubService ||
      !selectedDate ||
      !selectedTime ||
      !clientName.trim()
    ) {

      alert('Por favor completa los campos requeridos (Nombre y selección de servicio/fecha/hora)');
      return;
    }

    const finalTime = selectedTime === 'Otro horario' ? customTime : selectedTime;

    if (!isTimeSlotAvailable(selectedDate, finalTime)) {
      alert('Este horario ya está ocupado. Por favor selecciona otro.');
      return;
    }

    try {
      const serviceId = selectedService === 'maquillaje' ? 1 : 2;
      const subServiceIndex = servicesData[selectedService].subServices.indexOf(selectedSubService);
      const subServiceId = selectedService === 'maquillaje' ? subServiceIndex + 1 : subServiceIndex + 4;

      await axios.post(`${API_URL}/appointments`, {
        clientName,
        clientEmail,
        clientPhone,
        serviceId,
        subServiceId,
        date: selectedDate,
        time: finalTime
      });

      alert('¡Cita agendada exitosamente! Te enviaremos una confirmación por correo.');
      
      await loadAppointments();

      setSelectedService('');
      setSelectedSubService('');
      setSelectedDate('');
      setSelectedTime('');
      setCustomTime('');
      setClientName('');
      setClientEmail('');
      setClientPhone('');
      setCurrentView('home');
    } catch (error) {
      alert(error.response?.data?.error || 'Error al agendar la cita');
      console.error('Error:', error);
    }
  };

  const navigateWeek = (direction) => {
    const newDate = new Date(currentWeekStart);
    newDate.setDate(newDate.getDate() + (direction * 7));
    setCurrentWeekStart(newDate);
  };

  const HomePage = () => (
    <div>
      <header className="header">
        <div className="header-container">
          <div className="logo">
            <h1>Johna Barahona</h1>
            <p>Make Up Studio</p>
          </div>
          <div className="header-buttons">
            <button onClick={() => setCurrentView('schedule')} className="btn btn-secondary">
              Ver Agenda
            </button>
            <button onClick={() => setCurrentView('booking')} className="btn btn-primary">
              Agendar Cita
            </button>
          </div>
        </div>
      </header>

      <div className="container">
        <div className="hero">
          <h2>Realza tu Belleza Natural</h2>
          <p>Expertos en maquillaje profesional y tratamientos de pestañas. Tu belleza es nuestra pasión.</p>
        </div>

        <div className="services-grid">
          <div className="service-card">
            <div className="service-icon">{servicesData.maquillaje.icon}</div>
            <h3>Maquillaje</h3>
            <ul className="service-list">
              {servicesData.maquillaje.subServices.map((sub, idx) => (
                <li key={idx}>{sub}</li>
              ))}
            </ul>
            <button 
              onClick={() => {
                setSelectedService('maquillaje');
                setCurrentView('booking');
              }}
              className="btn-service"
            >
              Reservar Servicio
            </button>
          </div>

          <div className="service-card purple">
            <div className="service-icon">{servicesData.beautylash.icon}</div>
            <h3>BeautyLash</h3>
            <ul className="service-list">
              {servicesData.beautylash.subServices.map((sub, idx) => (
                <li key={idx}>{sub}</li>
              ))}
            </ul>
            <button 
              onClick={() => {
                setSelectedService('beautylash');
                setCurrentView('booking');
              }}
              className="btn-service purple"
            >
              Reservar Servicio
            </button>
          </div>
        </div>

        <div className="info-card">
          <h3>Horario de Atención</h3>
          <div className="info-content">
            <span>🕐</span>
            <span>Lunes a Domingo: 6:00 AM - 8:00 PM</span>
          </div>
        </div>
      </div>
    </div>
  );

  const SchedulePage = () => {
    const weekDates = getWeekDates();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return (
      <div className="schedule-container">
        <div className="schedule-card">
          <div className="schedule-header">
            <h2 className="schedule-title">
              <span>📅</span>
              Agenda Semanal
            </h2>
            <button onClick={() => setCurrentView('home')} className="btn-back">
              ← Volver
            </button>
          </div>

          <div className="week-navigation">
            <button onClick={() => navigateWeek(-1)} className="btn-week">
              ← Semana Anterior
            </button>
            <div className="week-range">
              {weekDates[0].toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })} - {weekDates[6].toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
            </div>
            <button onClick={() => navigateWeek(1)} className="btn-week">
              Semana Siguiente →
            </button>
          </div>

          <div className="schedule-scroll">
            <div className="schedule-grid">
              <div className="schedule-row">
                <div className="schedule-cell schedule-header-cell">Hora</div>
                {weekDates.map((date, idx) => {
                  const isToday = date.toDateString() === today.toDateString();
                  return (
                    <div key={idx} className={`schedule-cell schedule-header-cell ${isToday ? 'today' : ''}`}>
                      <div>{daysOfWeek[idx]}</div>
                      <div style={{fontSize: '0.875rem', fontWeight: 'normal'}}>
                        {date.getDate()}/{date.getMonth() + 1}
                      </div>
                    </div>
                  );
                })}
              </div>

              {workingHours.map((hour) => (
                <div key={hour} className="schedule-row">
                  <div className="schedule-cell schedule-time-cell">
                    {formatTime(hour)}
                  </div>
                  {weekDates.map((date, idx) => {
                    const isOccupied = isTimeSlotOccupied(date, hour);
                    const appointment = getAppointmentForSlot(date, hour);
                    const isPast = date < today || (date.toDateString() === today.toDateString() && hour < new Date().getHours());

                    return (
                      <div
                        key={idx}
                        className={`schedule-cell schedule-slot ${isPast ? 'past' : isOccupied ? 'occupied' : 'available'}`}
                      >
                        {isOccupied && appointment ? (
<div className="appointment-info">
<div className="appointment-name">{appointment.clientName}</div>
<div className="appointment-service">{appointment.subService}</div>
</div>
) : isPast ? (
<span>-</span>
) : (
<span>Libre</span>
)}
</div>
);
})}
</div>
))}
</div>
</div>
      <div className="schedule-legend">
        <div className="legend-item">
          <div className="legend-color occupied"></div>
          <span className="legend-text">Ocupado</span>
        </div>
        <div className="legend-item">
          <div className="legend-color available"></div>
          <span className="legend-text">Disponible</span>
        </div>
        <div className="legend-item">
          <div className="legend-color past"></div>
          <span className="legend-text">Pasado</span>
        </div>
        <div className="legend-item">
          <div className="legend-color today"></div>
          <span className="legend-text">Hoy</span>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card pink">
          <div className="stat-number">
            {appointments.filter(apt => {
              const aptDate = new Date(apt.date);
              return aptDate >= weekDates[0] && aptDate <= weekDates[6];
            }).length}
          </div>
          <div className="stat-label">Citas esta semana</div>
        </div>
        <div className="stat-card purple">
          <div className="stat-number">
            {appointments.filter(apt => apt.date === formatDate(new Date())).length}
          </div>
          <div className="stat-label">Citas hoy</div>
        </div>
        <div className="stat-card rose">
          <div className="stat-number">
            {workingHours.length * 7 - appointments.filter(apt => {
              const aptDate = new Date(apt.date);
              return aptDate >= weekDates[0] && aptDate <= weekDates[6];
            }).length}
          </div>
          <div className="stat-label">Espacios disponibles</div>
        </div>
      </div>
    </div>
  </div>
);
};
return (
  <>
    {currentView === 'home' && <HomePage />}
    {currentView === 'schedule' && <SchedulePage />}
    {currentView === 'booking' && (
      <BookingPage
        servicesData={servicesData}
        selectedService={selectedService}
        setSelectedService={setSelectedService}
        selectedSubService={selectedSubService}
        setSelectedSubService={setSelectedSubService}
        selectedDate={selectedDate}
        setSelectedDate={setSelectedDate}
        selectedTime={selectedTime}
        setSelectedTime={setSelectedTime}
        customTime={customTime}
        setCustomTime={setCustomTime}
        clientName={clientName}
        setClientName={setClientName}
        clientEmail={clientEmail}
        setClientEmail={setClientEmail}
        clientPhone={clientPhone}
        setClientPhone={setClientPhone}
        timeSlots={timeSlots}
        isTimeSlotAvailable={isTimeSlotAvailable}
        handleBooking={handleBooking}
        setCurrentView={setCurrentView}
      />
    )}
  </>
);

};

// BookingPage moved out of parent to avoid remounting on every parent render (fixes input losing focus)
function BookingPage({
  servicesData,
  selectedService,
  setSelectedService,
  selectedSubService,
  setSelectedSubService,
  selectedDate,
  setSelectedDate,
  selectedTime,
  setSelectedTime,
  customTime,
  setCustomTime,
  clientName,
  setClientName,
  clientEmail,
  setClientEmail,
  clientPhone,
  setClientPhone,
  timeSlots,
  isTimeSlotAvailable,
  handleBooking,
  setCurrentView
}) {
  return (
    <div className="booking-container">
      <div className="booking-card">
        <div className="booking-header">
          <h2>Agendar Cita</h2>
          <button onClick={() => setCurrentView('home')} className="btn-back">
            ← Volver
          </button>
        </div>

        <div className="form-group">
          <label className="form-label">Selecciona el Servicio</label>
          <div className="service-select-grid">
            {Object.keys(servicesData).map((key) => (
              <div
                key={key}
                onClick={() => {
                  setSelectedService(key);
                  setSelectedSubService('');
                }}
                className={`service-option ${selectedService === key ? 'selected' : ''}`}
              >
                <div className="service-option-icon">{servicesData[key].icon}</div>
                <div className="service-option-name">{servicesData[key].name}</div>
              </div>
            ))}
          </div>
        </div>

        {selectedService && (
          <div className="form-group">
            <label className="form-label">Tipo de {servicesData[selectedService].name}</label>
            <select
              value={selectedSubService}
              onChange={(e) => setSelectedSubService(e.target.value)}
              className="form-select"
            >
              <option value="">Selecciona una opción</option>
              {servicesData[selectedService].subServices.map((sub, idx) => (
                <option key={idx} value={sub}>{sub}</option>
              ))}
            </select>
          </div>
        )}

        {selectedSubService && (
          <div className="form-group">
            <label className="form-label"><span>📅</span> Fecha de la Cita</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              className="form-input"
            />
          </div>
        )}

        {selectedDate && (
          <div className="form-group">
            <label className="form-label"><span>🕐</span> Horario</label>
            <div className="time-slots-grid">
              {timeSlots.map((time, idx) => {
                const available = time === 'Otro horario' || isTimeSlotAvailable(selectedDate, time);
                return (
                  <button
                    key={idx}
                    onClick={() => setSelectedTime(time)}
                    disabled={!available}
                    className={`time-slot ${selectedTime === time ? 'selected' : ''}`}
                  >
                    {time}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {selectedTime === 'Otro horario' && (
          <div className="form-group">
            <label className="form-label">Ingresa el Horario Deseado</label>
            <input
              type="time"
              value={customTime}
              onChange={(e) => setCustomTime(e.target.value)}
              min="06:00"
              max="20:00"
              className="form-input"
            />
          </div>
        )}

        {(selectedTime && selectedTime !== 'Otro horario') || (selectedTime === 'Otro horario' && customTime) ? (
          <>
            <div className="form-group">
              <label className="form-label"><span>👤</span> Nombre Completo <span style={{color: 'red'}}>*</span></label>
              <input
                type="text"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="Ingresa tu nombre"
                className="form-input"
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label"><span>✉️</span> Correo Electrónico</label>
              <input
                type="email"
                value={clientEmail}
                onChange={(e) => setClientEmail(e.target.value)}
                placeholder="correo@ejemplo.com"
                className="form-input"
              />
            </div>
            <div className="form-group">
              <label className="form-label"><span>📱</span> Teléfono</label>
              <input
                type="tel"
                value={clientPhone}
                onChange={(e) => setClientPhone(e.target.value)}
                placeholder="+593 999 999 999"
                className="form-input"
              />
            </div>
          </>
        ) : null}

        {/* Habilitar Confirmar sólo cuando se completen los campos requeridos */}
        <button
          onClick={handleBooking}
          className="btn btn-primary"
          style={{width: '100%', padding: '1rem'}}
          disabled={!(
            selectedService &&
            selectedSubService &&
            selectedDate &&
            selectedTime &&
            clientName &&
            (selectedTime !== 'Otro horario' ? true : !!customTime)
          )}
          title={!(selectedService && selectedSubService && selectedDate && selectedTime && clientName) ? 'Completa los campos obligatorios' : 'Confirmar Reserva'}
        >
          Confirmar Reserva
        </button>
      </div>
    </div>
  );
}

export default JohanaMakeupSalon;