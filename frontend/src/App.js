import React, { useState, useEffect } from "react";
import axios from "axios";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000/api";

/* ======================
   COMPONENTE PRINCIPAL
====================== */
export default function JohanaMakeupSalon() {
  const [currentView, setCurrentView] = useState("home");

  const [selectedService, setSelectedService] = useState("");
  const [selectedSubService, setSelectedSubService] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [customTime, setCustomTime] = useState("");

  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientPhone, setClientPhone] = useState("");

  const [appointments, setAppointments] = useState([]);
  const [currentWeekStart, setCurrentWeekStart] = useState(getMonday(new Date()));

  useEffect(() => {
    loadAppointments();
  }, []);

  async function loadAppointments() {
    try {
      const res = await axios.get(`${API_URL}/appointments`);
      setAppointments(res.data);
    } catch (err) {
      console.error("Error cargando citas", err);
    }
  }

  async function handleBooking() {
    if (
      !selectedService ||
      !selectedSubService ||
      !selectedDate ||
      !selectedTime ||
      !clientName.trim() ||
      !clientEmail.trim() ||
      !clientPhone.trim()
    ) {
      alert("Completa todos los campos");
      return;
    }

    const finalTime = selectedTime === "Otro horario" ? customTime : selectedTime;

    try {
      await axios.post(`${API_URL}/appointments`, {
        service: selectedService,
        subService: selectedSubService,
        date: selectedDate,
        time: finalTime,
        name: clientName,
        email: clientEmail,
        phone: clientPhone
      });

      alert("Cita agendada correctamente");

      setSelectedService("");
      setSelectedSubService("");
      setSelectedDate("");
      setSelectedTime("");
      setCustomTime("");
      setClientName("");
      setClientEmail("");
      setClientPhone("");
      setCurrentView("home");

      loadAppointments();
    } catch (err) {
      alert("Error al agendar");
      console.error(err);
    }
  }

  return (
    <>
      {currentView === "home" && (
        <HomePage setCurrentView={setCurrentView} />
      )}

      {currentView === "schedule" && (
        <SchedulePage
          appointments={appointments}
          currentWeekStart={currentWeekStart}
          setCurrentWeekStart={setCurrentWeekStart}
          setCurrentView={setCurrentView}
        />
      )}

      {currentView === "booking" && (
        <BookingPage
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
          handleBooking={handleBooking}
          setCurrentView={setCurrentView}
        />
      )}
    </>
  );
}

/* ======================
   COMPONENTES
====================== */

function HomePage({ setCurrentView }) {
  return (
    <div>
      <h1>Johana Barahona - Make Up Studio</h1>
      <button onClick={() => setCurrentView("schedule")}>Ver Agenda</button>
      <button onClick={() => setCurrentView("booking")}>Agendar Cita</button>
    </div>
  );
}

function SchedulePage({ appointments, currentWeekStart, setCurrentWeekStart, setCurrentView }) {
  return (
    <div>
      <h2>Agenda</h2>
      <button onClick={() => setCurrentView("home")}>Volver</button>
      <pre>{JSON.stringify(appointments, null, 2)}</pre>
    </div>
  );
}

function BookingPage(props) {
  return (
    <div>
      <h2>Agendar Cita</h2>

      <input
        type="text"
        placeholder="Nombre"
        value={props.clientName}
        onChange={e => props.setClientName(e.target.value)}
      />

      <input
        type="email"
        placeholder="Correo"
        value={props.clientEmail}
        onChange={e => props.setClientEmail(e.target.value)}
      />

      <input
        type="tel"
        placeholder="Teléfono"
        value={props.clientPhone}
        onChange={e => props.setClientPhone(e.target.value)}
      />

      <button onClick={props.handleBooking}>Confirmar</button>
      <button onClick={() => props.setCurrentView("home")}>Cancelar</button>
    </div>
  );
}

/* ======================
   HELPERS
====================== */
function getMonday(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff));
}
