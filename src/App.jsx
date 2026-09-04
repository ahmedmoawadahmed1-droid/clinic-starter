import { useEffect, useState } from "react";
import { supabase } from "./supabase";
import "./App.css";

/* =========================
   HELPER
========================= */

function getLocalDate() {
  const today = new Date();

  return [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, "0"),
    String(today.getDate()).padStart(2, "0"),
  ].join("-");
}

function formatDateArabic(date) {
  if (!date) {
    return "—";
  }

  return new Date(`${date}T12:00:00`).toLocaleDateString(
    "ar-SA",
    {
      year: "numeric",
      month: "long",
      day: "numeric",
    }
  );
}

function formatTime(time) {
  if (!time) {
    return "—";
  }

  const [hours, minutes] = time.split(":");

  const date = new Date();
  date.setHours(Number(hours), Number(minutes), 0, 0);

  return date.toLocaleTimeString("ar-SA", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getStatusLabel(status) {
  switch (status) {
    case "Confirmed":
      return "مؤكد";

    case "Completed":
      return "مكتمل";

    case "Cancelled":
      return "ملغي";

    case "Pending":
    default:
      return "قيد الانتظار";
  }
}

/* =========================
   LOGIN
========================= */

function Login({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e) {
    e.preventDefault();

    setLoading(true);
    setError("");

    const { data, error } =
      await supabase.auth.signInWithPassword({
        email,
        password,
      });

    if (error) {
      setError("البريد الإلكتروني أو كلمة المرور غير صحيحة");
    } else {
      onLogin(data.session);
    }

    setLoading(false);
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="logo">+</div>

        <h1>Clinic Starter</h1>

        <p>نظام إدارة عيادة النساء والولادة</p>

        <form onSubmit={handleLogin}>
          <label>البريد الإلكتروني</label>

          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <label>كلمة المرور</label>

          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          {error && <div className="error">{error}</div>}

          <button type="submit" disabled={loading}>
            {loading ? "جاري الدخول..." : "تسجيل الدخول"}
          </button>
        </form>
      </div>
    </div>
  );
}

/* =========================
   DASHBOARD
========================= */

function Dashboard() {
  const [patients, setPatients] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [visits, setVisits] = useState([]);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const today = getLocalDate();

    try {
      const [
        patientsResult,
        appointmentsResult,
        visitsResult,
      ] = await Promise.all([
        supabase
          .from("Patients")
          .select("*")
          .order("created_at", { ascending: false }),

        supabase
          .from("Appointments")
          .select("*")
          .eq("appointment_date", today),

        supabase
          .from("Visits")
          .select("*"),
      ]);

      if (patientsResult.error) {
        console.error(
          "DASHBOARD PATIENTS ERROR:",
          patientsResult.error
        );
      }

      if (appointmentsResult.error) {
        console.error(
          "DASHBOARD APPOINTMENTS ERROR:",
          appointmentsResult.error
        );
      }

      if (visitsResult.error) {
        console.error(
          "DASHBOARD VISITS ERROR:",
          visitsResult.error
        );
      }

      setPatients(patientsResult.data || []);
      setAppointments(appointmentsResult.data || []);
      setVisits(visitsResult.data || []);
    } catch (err) {
      console.error("DASHBOARD ERROR:", err);
    }
  }

  return (
    <main className="content">
      <div className="welcome">
        <div>
          <h1>مرحبًا بك 👋</h1>
          <p>إدارة العيادة من مكان واحد</p>
        </div>

        <div className="date">
          {new Date().toLocaleDateString("ar-SA", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </div>
      </div>

      <div className="stats">
        <div className="stat-card">
          <span>👩‍🍼</span>

          <div>
            <small>إجمالي المرضى</small>
            <strong>{patients.length}</strong>
          </div>
        </div>

        <div className="stat-card">
          <span>📅</span>

          <div>
            <small>مواعيد اليوم</small>
            <strong>{appointments.length}</strong>
          </div>
        </div>

        <div className="stat-card">
          <span>🩺</span>

          <div>
            <small>الزيارات</small>
            <strong>{visits.length}</strong>
          </div>
        </div>
      </div>

      <section className="panel">
        <div className="panel-title">
          <div>
            <h2>أحدث المرضى</h2>
            <p>آخر المرضى المسجلين في العيادة</p>
          </div>
        </div>

        <div className="patients">
          {patients.length === 0 ? (
            <div className="empty">لا توجد بيانات مرضى</div>
          ) : (
            patients.map((patient) => (
              <div className="patient-row" key={patient.id}>
                <div className="patient-avatar">
                  {patient.name?.charAt(0) || "م"}
                </div>

                <div className="patient-info">
                  <strong>{patient.name}</strong>

                  <span>
                    {patient.phone || "لا يوجد هاتف"}
                  </span>
                </div>

                <div className="patient-detail">
                  <small>العمر</small>
                  <span>{patient.age ?? "—"}</span>
                </div>

                <div className="patient-detail">
                  <small>الحمل</small>

                  <span>
                    {patient.pregnancy_status || "—"}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </main>
  );
}

/* =========================
   PATIENTS PAGE
========================= */

function Patients({ onOpenPatient }) {
  const [patients, setPatients] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [age, setAge] = useState("");
  const [address, setAddress] = useState("");
  const [pregnancyStatus, setPregnancyStatus] = useState("");
  const [notes, setNotes] = useState("");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    loadPatients();
  }, []);

  async function loadPatients() {
    setLoading(true);

    const { data, error } = await supabase
      .from("Patients")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      setError("حدث خطأ أثناء تحميل المرضى");
    } else {
      setPatients(data || []);
    }

    setLoading(false);
  }

  async function addPatient(e) {
    e.preventDefault();

    setSaving(true);
    setError("");

    const { error } = await supabase
      .from("Patients")
      .insert([
        {
          name: name.trim(),
          phone: phone.trim(),
          age: age ? Number(age) : null,
          address: address.trim(),
          pregnancy_status: pregnancyStatus,
          notes: notes.trim(),
        },
      ]);

    if (error) {
      console.error(error);
      setError(error.message);
      setSaving(false);
      return;
    }

    setName("");
    setPhone("");
    setAge("");
    setAddress("");
    setPregnancyStatus("");
    setNotes("");

    setShowForm(false);

    await loadPatients();

    setSaving(false);
  }

  const filteredPatients = patients.filter((patient) => {
    const text = search.toLowerCase();

    return (
      patient.name?.toLowerCase().includes(text) ||
      patient.phone?.toLowerCase().includes(text)
    );
  });

  return (
    <main className="content">
      <div className="page-header">
        <div>
          <h1>المرضى</h1>
          <p>إدارة بيانات المرضى وملفاتهم الطبية</p>
        </div>

        <button
          className="primary"
          onClick={() => {
            setShowForm(!showForm);
            setError("");
          }}
        >
          {showForm ? "إلغاء" : "+ إضافة مريض"}
        </button>
      </div>

      {showForm && (
        <section className="panel patient-form-panel">
          <div className="panel-title">
            <div>
              <h2>إضافة مريض جديد</h2>
              <p>أدخل بيانات المريض الأساسية</p>
            </div>
          </div>

          <form className="patient-form" onSubmit={addPatient}>
            <div className="form-grid">
              <div className="form-field">
                <label>اسم المريض *</label>

                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  placeholder="اسم المريض"
                />
              </div>

              <div className="form-field">
                <label>رقم الجوال</label>

                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="05xxxxxxxx"
                />
              </div>

              <div className="form-field">
                <label>العمر</label>

                <input
                  type="number"
                  min="0"
                  max="120"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  placeholder="العمر"
                />
              </div>

              <div className="form-field">
                <label>حالة الحمل</label>

                <select
                  value={pregnancyStatus}
                  onChange={(e) =>
                    setPregnancyStatus(e.target.value)
                  }
                >
                  <option value="">اختر الحالة</option>
                  <option value="Pregnant">حامل</option>
                  <option value="Not Pregnant">
                    غير حامل
                  </option>
                  <option value="Unknown">
                    غير محدد
                  </option>
                </select>
              </div>

              <div className="form-field full">
                <label>العنوان</label>

                <input
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="العنوان"
                />
              </div>

              <div className="form-field full">
                <label>ملاحظات</label>

                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="ملاحظات إضافية"
                  rows="3"
                />
              </div>
            </div>

            {error && (
              <div className="error form-error">
                {error}
              </div>
            )}

            <div className="form-actions">
              <button
                type="button"
                className="secondary"
                onClick={() => setShowForm(false)}
              >
                إلغاء
              </button>

              <button
                type="submit"
                className="primary"
                disabled={saving}
              >
                {saving ? "جاري الحفظ..." : "حفظ المريض"}
              </button>
            </div>
          </form>
        </section>
      )}

      <section className="panel">
        <div className="search-box">
          <span>🔎</span>

          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ابحث باسم المريض أو رقم الجوال..."
          />
        </div>

        <div className="patients-count">
          {loading
            ? "جاري التحميل..."
            : `${filteredPatients.length} مريض`}
        </div>

        {loading ? (
          <div className="empty">
            جاري تحميل المرضى...
          </div>
        ) : filteredPatients.length === 0 ? (
          <div className="empty">
            {search
              ? "لا توجد نتائج للبحث"
              : "لا توجد بيانات مرضى"}
          </div>
        ) : (
          <div className="patients">
            {filteredPatients.map((patient) => (
              <div
                className="patient-card"
                key={patient.id}
              >
                <div className="patient-avatar large">
                  {patient.name?.charAt(0) || "م"}
                </div>

                <div className="patient-card-info">
                  <h3>{patient.name}</h3>

                  <p>
                    📱 {patient.phone || "لا يوجد رقم"}
                  </p>
                </div>

                <div className="patient-card-detail">
                  <small>العمر</small>
                  <strong>{patient.age ?? "—"}</strong>
                </div>

                <div className="patient-card-detail">
                  <small>الحمل</small>

                  <strong>
                    {patient.pregnancy_status || "—"}
                  </strong>
                </div>

                <button
                  className="view-button"
                  onClick={() => onOpenPatient(patient.id)}
                >
                  فتح الملف
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

/* =========================
   APPOINTMENTS FORM
   ADD + EDIT
========================= */

function AppointmentForm({
  patients,
  doctors,
  appointment,
  onSaved,
  onCancel,
}) {
  const isEditing = Boolean(appointment);

  const [patientId, setPatientId] = useState(
    appointment?.patient_id || ""
  );

  const [doctorId, setDoctorId] = useState(
    appointment?.doctor_id || ""
  );

  const [appointmentDate, setAppointmentDate] =
    useState(
      appointment?.appointment_date || getLocalDate()
    );

  const [appointmentTime, setAppointmentTime] =
    useState(
      appointment?.appointment_time
        ? appointment.appointment_time.substring(0, 5)
        : ""
    );

  const [status, setStatus] = useState(
    appointment?.status || "Pending"
  );

  const [notes, setNotes] = useState(
    appointment?.notes || ""
  );

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function saveAppointment(e) {
    e.preventDefault();

    setError("");

    if (!patientId) {
      setError("من فضلك اختر المريضة");
      return;
    }

    if (!doctorId) {
      setError("من فضلك اختر الطبيب");
      return;
    }

    if (!appointmentDate) {
      setError("من فضلك اختر تاريخ الموعد");
      return;
    }

    if (!appointmentTime) {
      setError("من فضلك اختر وقت الموعد");
      return;
    }

    setSaving(true);

    const appointmentData = {
      patient_id: patientId,
      doctor_id: doctorId,
      appointment_date: appointmentDate,
      appointment_time: appointmentTime,
      status,
      notes: notes.trim(),
    };

    let result;

    if (isEditing) {
      result = await supabase
        .from("Appointments")
        .update(appointmentData)
        .eq("id", appointment.id)
        .select()
        .single();
    } else {
      result = await supabase
        .from("Appointments")
        .insert([appointmentData])
        .select()
        .single();
    }

    if (result.error) {
      console.error(
        "APPOINTMENT SAVE ERROR:",
        result.error
      );

      setError(result.error.message);
      setSaving(false);
      return;
    }

    setSaving(false);
    onSaved();
  }

  return (
    <section className="panel appointment-form-panel">
      <div className="panel-title">
        <div>
          <h2>
            {isEditing
              ? "✏️ تعديل الموعد"
              : "📅 إضافة موعد جديد"}
          </h2>

          <p>
            {isEditing
              ? "تعديل بيانات الموعد"
              : "إضافة موعد جديد للمريضة"}
          </p>
        </div>
      </div>

      <form
        className="appointment-form"
        onSubmit={saveAppointment}
      >
        <div className="form-grid">
          <div className="form-field full">
            <label>المريضة *</label>

            <select
              value={patientId}
              onChange={(e) =>
                setPatientId(e.target.value)
              }
              required
            >
              <option value="">اختر المريضة</option>

              {patients.map((patient) => (
                <option
                  key={patient.id}
                  value={patient.id}
                >
                  {patient.name}
                  {patient.phone
                    ? ` — ${patient.phone}`
                    : ""}
                </option>
              ))}
            </select>

            {patients.length === 0 && (
              <small className="field-warning">
                لا توجد مريضات مسجلات في النظام
              </small>
            )}
          </div>

          <div className="form-field">
            <label>الطبيب *</label>

            <select
              value={doctorId}
              onChange={(e) =>
                setDoctorId(e.target.value)
              }
              required
            >
              <option value="">اختر الطبيب</option>

              {doctors.map((doctor) => (
                <option
                  key={doctor.id}
                  value={doctor.id}
                >
                  {doctor.name}
                </option>
              ))}
            </select>

            {doctors.length === 0 && (
              <small className="field-warning">
                لا يوجد أطباء في جدول Doctors
              </small>
            )}
          </div>

          <div className="form-field">
            <label>التاريخ *</label>

            <input
              type="date"
              value={appointmentDate}
              onChange={(e) =>
                setAppointmentDate(e.target.value)
              }
              required
            />
          </div>

          <div className="form-field">
            <label>الوقت *</label>

            <input
              type="time"
              value={appointmentTime}
              onChange={(e) =>
                setAppointmentTime(e.target.value)
              }
              required
            />
          </div>

          <div className="form-field">
            <label>حالة الموعد</label>

            <select
              value={status}
              onChange={(e) =>
                setStatus(e.target.value)
              }
            >
              <option value="Pending">
                قيد الانتظار
              </option>

              <option value="Confirmed">
                مؤكد
              </option>

              <option value="Completed">
                مكتمل
              </option>

              <option value="Cancelled">
                ملغي
              </option>
            </select>
          </div>

          <div className="form-field full">
            <label>ملاحظات الموعد</label>

            <textarea
              value={notes}
              onChange={(e) =>
                setNotes(e.target.value)
              }
              placeholder="اكتب أي ملاحظات خاصة بالموعد..."
              rows="3"
            />
          </div>
        </div>

        {error && (
          <div className="error form-error">
            {error}
          </div>
        )}

        <div className="form-actions">
          <button
            type="button"
            className="secondary"
            onClick={onCancel}
            disabled={saving}
          >
            إلغاء
          </button>

          <button
            type="submit"
            className="primary"
            disabled={
              saving ||
              patients.length === 0 ||
              doctors.length === 0
            }
          >
            {saving
              ? "جاري الحفظ..."
              : isEditing
              ? "حفظ التعديلات"
              : "حفظ الموعد"}
          </button>
        </div>
      </form>
    </section>
  );
}

/* =========================
   APPOINTMENTS PAGE
========================= */

function AppointmentsPage({ onOpenPatient }) {
  const [appointments, setAppointments] = useState([]);
  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [activeTab, setActiveTab] = useState("today");
  const [search, setSearch] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [editingAppointment, setEditingAppointment] =
    useState(null);

  useEffect(() => {
    loadAppointmentsData();
  }, []);

  async function loadAppointmentsData() {
    setLoading(true);
    setError("");

    try {
      const [
        appointmentsResult,
        patientsResult,
        doctorsResult,
      ] = await Promise.all([
        supabase
          .from("Appointments")
          .select("*")
          .order("appointment_date", {
            ascending: true,
          })
          .order("appointment_time", {
            ascending: true,
          }),

        supabase
          .from("Patients")
          .select("*")
          .order("name", {
            ascending: true,
          }),

        supabase
          .from("Doctors")
          .select("*")
          .order("name", {
            ascending: true,
          }),
      ]);

      if (appointmentsResult.error) {
        throw appointmentsResult.error;
      }

      if (patientsResult.error) {
        throw patientsResult.error;
      }

      if (doctorsResult.error) {
        throw doctorsResult.error;
      }

      setAppointments(
        appointmentsResult.data || []
      );

      setPatients(patientsResult.data || []);
      setDoctors(doctorsResult.data || []);
    } catch (err) {
      console.error(
        "APPOINTMENTS PAGE ERROR:",
        err
      );

      setError(
        err?.message ||
          "حدث خطأ أثناء تحميل المواعيد"
      );
    } finally {
      setLoading(false);
    }
  }

  function getPatientName(patientId) {
    const patient = patients.find(
      (item) => item.id === patientId
    );

    return patient?.name || "مريضة غير محددة";
  }

  function getPatientPhone(patientId) {
    const patient = patients.find(
      (item) => item.id === patientId
    );

    return patient?.phone || "";
  }

  function getDoctorName(doctorId) {
    const doctor = doctors.find(
      (item) => item.id === doctorId
    );

    return doctor?.name || "غير محدد";
  }

  function handleSaved() {
    setShowForm(false);
    setEditingAppointment(null);
    loadAppointmentsData();
  }

  function startEdit(appointment) {
    setEditingAppointment(appointment);
    setShowForm(true);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  function cancelForm() {
    setShowForm(false);
    setEditingAppointment(null);
  }

  async function deleteAppointment(appointmentId) {
    const confirmed = window.confirm(
      "هل أنت متأكد من حذف هذا الموعد؟\n\nلا يمكن التراجع عن هذا الإجراء."
    );

    if (!confirmed) {
      return;
    }

    const { error } = await supabase
      .from("Appointments")
      .delete()
      .eq("id", appointmentId);

    if (error) {
      console.error(
        "DELETE APPOINTMENT ERROR:",
        error
      );

      alert(
        "حدث خطأ أثناء حذف الموعد:\n" +
          error.message
      );

      return;
    }

    if (
      editingAppointment?.id ===
      appointmentId
    ) {
      cancelForm();
    }

    await loadAppointmentsData();
  }

  function getFilteredAppointments() {
    const today = getLocalDate();

    let filtered = [...appointments];

    if (activeTab === "today") {
      filtered = filtered.filter(
        (appointment) =>
          appointment.appointment_date === today
      );
    }

    if (activeTab === "upcoming") {
      filtered = filtered.filter(
        (appointment) =>
          appointment.appointment_date >= today &&
          appointment.status !== "Cancelled"
      );
    }

    const searchText = search.trim().toLowerCase();

    if (searchText) {
      filtered = filtered.filter(
        (appointment) => {
          const patientName =
            getPatientName(
              appointment.patient_id
            ).toLowerCase();

          const patientPhone =
            getPatientPhone(
              appointment.patient_id
            ).toLowerCase();

          const doctorName =
            getDoctorName(
              appointment.doctor_id
            ).toLowerCase();

          return (
            patientName.includes(searchText) ||
            patientPhone.includes(searchText) ||
            doctorName.includes(searchText)
          );
        }
      );
    }

    return filtered.sort((a, b) => {
      const dateA =
        `${a.appointment_date || ""} ${
          a.appointment_time || ""
        }`;

      const dateB =
        `${b.appointment_date || ""} ${
          b.appointment_time || ""
        }`;

      return dateA.localeCompare(dateB);
    });
  }

  const filteredAppointments =
    getFilteredAppointments();

  const todayCount = appointments.filter(
    (appointment) =>
      appointment.appointment_date ===
      getLocalDate()
  ).length;

  const upcomingCount = appointments.filter(
    (appointment) =>
      appointment.appointment_date >=
        getLocalDate() &&
      appointment.status !== "Cancelled"
  ).length;

  return (
    <main className="content appointments-page">
      <div className="page-header">
        <div>
          <h1>📅 المواعيد</h1>

          <p>
            إدارة مواعيد العيادة وتنظيم زيارات المريضات
          </p>
        </div>

        {!showForm && (
          <button
            className="primary"
            onClick={() => {
              setEditingAppointment(null);
              setShowForm(true);
              setError("");
            }}
          >
            + إضافة موعد
          </button>
        )}
      </div>

      {showForm && (
        <AppointmentForm
          patients={patients}
          doctors={doctors}
          appointment={editingAppointment}
          onSaved={handleSaved}
          onCancel={cancelForm}
        />
      )}

      {error && (
        <section className="panel">
          <div className="error">
            {error}
          </div>
        </section>
      )}

      <section className="panel appointments-toolbar">
        <div className="appointments-tabs">
          <button
            className={
              activeTab === "today"
                ? "appointment-tab active"
                : "appointment-tab"
            }
            onClick={() =>
              setActiveTab("today")
            }
          >
            <span>اليوم</span>
            <strong>{todayCount}</strong>
          </button>

          <button
            className={
              activeTab === "upcoming"
                ? "appointment-tab active"
                : "appointment-tab"
            }
            onClick={() =>
              setActiveTab("upcoming")
            }
          >
            <span>القادمة</span>
            <strong>{upcomingCount}</strong>
          </button>

          <button
            className={
              activeTab === "all"
                ? "appointment-tab active"
                : "appointment-tab"
            }
            onClick={() =>
              setActiveTab("all")
            }
          >
            <span>كل المواعيد</span>
            <strong>{appointments.length}</strong>
          </button>
        </div>

        <div className="search-box">
          <span>🔎</span>

          <input
            value={search}
            onChange={(e) =>
              setSearch(e.target.value)
            }
            placeholder="ابحث باسم المريضة أو الطبيب أو الجوال..."
          />
        </div>
      </section>

      <section className="panel">
        <div className="panel-title">
          <div>
            <h2>
              {activeTab === "today"
                ? "مواعيد اليوم"
                : activeTab === "upcoming"
                ? "المواعيد القادمة"
                : "كل المواعيد"}
            </h2>

            <p>
              {loading
                ? "جاري تحميل المواعيد..."
                : `${filteredAppointments.length} موعد`}
            </p>
          </div>
        </div>

        {loading ? (
          <div className="empty">
            جاري تحميل المواعيد...
          </div>
        ) : filteredAppointments.length === 0 ? (
          <div className="empty">
            {search
              ? "لا توجد نتائج للبحث"
              : activeTab === "today"
              ? "لا توجد مواعيد اليوم"
              : activeTab === "upcoming"
              ? "لا توجد مواعيد قادمة"
              : "لا توجد مواعيد مسجلة"}
          </div>
        ) : (
          <div className="appointments-page-list">
            {filteredAppointments.map(
              (appointment) => (
                <div
                  className="appointment-page-card"
                  key={appointment.id}
                >
                  <div className="appointment-page-time">
                    <strong>
                      {formatTime(
                        appointment.appointment_time
                      )}
                    </strong>

                    <span>
                      {formatDateArabic(
                        appointment.appointment_date
                      )}
                    </span>
                  </div>

                  <div className="appointment-page-patient">
                    <div className="patient-avatar">
                      {getPatientName(
                        appointment.patient_id
                      )?.charAt(0) || "م"}
                    </div>

                    <div>
                      <strong>
                        {getPatientName(
                          appointment.patient_id
                        )}
                      </strong>

                      {getPatientPhone(
                        appointment.patient_id
                      ) && (
                        <span>
                          📱{" "}
                          {getPatientPhone(
                            appointment.patient_id
                          )}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="appointment-page-doctor">
                    <small>الطبيب</small>

                    <strong>
                      {getDoctorName(
                        appointment.doctor_id
                      )}
                    </strong>
                  </div>

                  <div className="appointment-page-status">
                    <small>الحالة</small>

                    <span
                      className={`appointment-status status-${(
                        appointment.status ||
                        "Pending"
                      ).toLowerCase()}`}
                    >
                      {getStatusLabel(
                        appointment.status
                      )}
                    </span>
                  </div>

                  {appointment.notes && (
                    <div className="appointment-page-notes">
                      <small>ملاحظات</small>

                      <span>
                        {appointment.notes}
                      </span>
                    </div>
                  )}

                  <div className="appointment-page-actions">
                    <button
                      className="view-button"
                      onClick={() =>
                        onOpenPatient(
                          appointment.patient_id
                        )
                      }
                    >
                      فتح الملف
                    </button>

                    <button
                      className="edit-button"
                      onClick={() =>
                        startEdit(appointment)
                      }
                    >
                      ✏️ تعديل
                    </button>

                    <button
                      className="delete-button"
                      onClick={() =>
                        deleteAppointment(
                          appointment.id
                        )
                      }
                    >
                      🗑️ حذف
                    </button>
                  </div>
                </div>
              )
            )}
          </div>
        )}
      </section>
    </main>
  );
}

/* =========================
   VISIT FORM
   ADD + EDIT
========================= */

function VisitForm({
  patientId,
  doctors,
  visit,
  onSaved,
  onCancel,
}) {
  const isEditing = Boolean(visit);

  const [doctorId, setDoctorId] = useState(
    visit?.doctor_id || ""
  );

  const [visitDate, setVisitDate] = useState(
    visit?.visit_date
      ? visit.visit_date.substring(0, 10)
      : ""
  );

  const [complaints, setComplaints] = useState([]);
  const [selectedComplaintIds, setSelectedComplaintIds] =
    useState([]);

  const [otherComplaint, setOtherComplaint] = useState(
    visit?.chief_complaint || ""
  );

  const [diagnoses, setDiagnoses] = useState([]);
  const [selectedDiagnosisIds, setSelectedDiagnosisIds] =
    useState([]);

  const [otherDiagnosis, setOtherDiagnosis] = useState(
    visit?.diagnosis || ""
  );

  const [treatment, setTreatment] = useState(
    visit?.treatment || ""
  );

  const [notes, setNotes] = useState(
    visit?.notes || ""
  );

  const [loadingComplaints, setLoadingComplaints] =
    useState(true);

  const [loadingDiagnoses, setLoadingDiagnoses] =
    useState(true);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    loadComplaints();
    loadDiagnoses();
  }, []);

  useEffect(() => {
    if (!visit && !visitDate) {
      setVisitDate(getLocalDate());
    }
  }, [visit, visitDate]);

  async function loadComplaints() {
    setLoadingComplaints(true);

    const { data, error } = await supabase
      .from("ChiefComplaints")
      .select("*")
      .eq("is_active", true)
      .order("sort_order", { ascending: true });

    if (error) {
      console.error(error);
      setError("حدث خطأ أثناء تحميل قائمة الشكاوى");
      setLoadingComplaints(false);
      return;
    }

    setComplaints(data || []);

    if (visit?.id) {
      const {
        data: visitComplaints,
        error: visitComplaintsError,
      } = await supabase
        .from("VisitComplaints")
        .select("complaint_id")
        .eq("visit_id", visit.id);

      if (visitComplaintsError) {
        console.error(visitComplaintsError);

        setError(
          "تم تحميل الزيارة لكن حدث خطأ أثناء تحميل الشكاوى"
        );
      } else {
        setSelectedComplaintIds(
          (visitComplaints || []).map(
            (item) => item.complaint_id
          )
        );
      }
    }

    setLoadingComplaints(false);
  }

  async function loadDiagnoses() {
    setLoadingDiagnoses(true);

    const { data, error } = await supabase
      .from("Diagnoses")
      .select("*")
      .eq("is_active", true)
      .order("sort_order", { ascending: true });

    if (error) {
      console.error(error);

      setError(
        "حدث خطأ أثناء تحميل قائمة التشخيصات"
      );

      setLoadingDiagnoses(false);
      return;
    }

    setDiagnoses(data || []);

    if (visit?.id) {
      const {
        data: visitDiagnoses,
        error: visitDiagnosesError,
      } = await supabase
        .from("VisitDiagnoses")
        .select("diagnosis_id")
        .eq("visit_id", visit.id);

      if (visitDiagnosesError) {
        console.error(visitDiagnosesError);

        setError(
          "تم تحميل الزيارة لكن حدث خطأ أثناء تحميل التشخيصات"
        );
      } else {
        setSelectedDiagnosisIds(
          (visitDiagnoses || []).map(
            (item) => item.diagnosis_id
          )
        );
      }
    }

    setLoadingDiagnoses(false);
  }

  function toggleComplaint(complaintId) {
    setSelectedComplaintIds((current) => {
      if (current.includes(complaintId)) {
        return current.filter(
          (id) => id !== complaintId
        );
      }

      return [...current, complaintId];
    });
  }

  function toggleDiagnosis(diagnosisId) {
    setSelectedDiagnosisIds((current) => {
      if (current.includes(diagnosisId)) {
        return current.filter(
          (id) => id !== diagnosisId
        );
      }

      return [...current, diagnosisId];
    });
  }

  function getComplaintCategories() {
    const categories = [];

    complaints.forEach((complaint) => {
      const exists = categories.find(
        (category) =>
          category.ar === complaint.category_ar &&
          category.en === complaint.category_en
      );

      if (!exists) {
        categories.push({
          ar: complaint.category_ar,
          en: complaint.category_en,
        });
      }
    });

    return categories;
  }

  function getDiagnosisCategories() {
    const categories = [];

    diagnoses.forEach((diagnosis) => {
      const exists = categories.find(
        (category) =>
          category.ar === diagnosis.category_ar &&
          category.en === diagnosis.category_en
      );

      if (!exists) {
        categories.push({
          ar: diagnosis.category_ar,
          en: diagnosis.category_en,
        });
      }
    });

    return categories;
  }

  async function saveVisit(e) {
    e.preventDefault();

    if (!doctorId) {
      setError("من فضلك اختر الطبيب");
      return;
    }

    if (!visitDate) {
      setError("من فضلك اختر تاريخ الزيارة");
      return;
    }

    setSaving(true);
    setError("");

    const visitData = {
      patient_id: patientId,
      doctor_id: doctorId,
      appointment_id: visit?.appointment_id || null,
      visit_date: `${visitDate}T12:00:00`,
      chief_complaint: otherComplaint.trim(),
      diagnosis: otherDiagnosis.trim(),
      treatment: treatment.trim(),
      notes: notes.trim(),
    };

    let visitResult;
    let savedVisitId;

    if (isEditing) {
      visitResult = await supabase
        .from("Visits")
        .update(visitData)
        .eq("id", visit.id)
        .select()
        .single();

      savedVisitId = visit.id;
    } else {
      visitResult = await supabase
        .from("Visits")
        .insert([visitData])
        .select()
        .single();

      savedVisitId = visitResult.data?.id;
    }

    if (visitResult.error) {
      console.error(visitResult.error);

      setError(visitResult.error.message);
      setSaving(false);
      return;
    }

    if (!savedVisitId) {
      setError("تعذر الحصول على رقم الزيارة");
      setSaving(false);
      return;
    }

    if (isEditing) {
      const { error: deleteComplaintsError } =
        await supabase
          .from("VisitComplaints")
          .delete()
          .eq("visit_id", savedVisitId);

      if (deleteComplaintsError) {
        console.error(deleteComplaintsError);

        setError(
          "تم تعديل الزيارة لكن حدث خطأ أثناء تحديث الشكاوى"
        );

        setSaving(false);
        return;
      }
    }

    if (selectedComplaintIds.length > 0) {
      const complaintRows =
        selectedComplaintIds.map((complaintId) => ({
          visit_id: savedVisitId,
          complaint_id: complaintId,
        }));

      const { error: complaintsError } =
        await supabase
          .from("VisitComplaints")
          .insert(complaintRows);

      if (complaintsError) {
        console.error(complaintsError);

        setError(
          "تم حفظ الزيارة لكن حدث خطأ أثناء حفظ الشكاوى"
        );

        setSaving(false);
        return;
      }
    }

    if (isEditing) {
      const { error: deleteDiagnosesError } =
        await supabase
          .from("VisitDiagnoses")
          .delete()
          .eq("visit_id", savedVisitId);

      if (deleteDiagnosesError) {
        console.error(deleteDiagnosesError);

        setError(
          "تم تعديل الزيارة لكن حدث خطأ أثناء تحديث التشخيصات"
        );

        setSaving(false);
        return;
      }
    }

    if (selectedDiagnosisIds.length > 0) {
      const diagnosisRows =
        selectedDiagnosisIds.map((diagnosisId) => ({
          visit_id: savedVisitId,
          diagnosis_id: diagnosisId,
        }));

      const { error: diagnosesError } =
        await supabase
          .from("VisitDiagnoses")
          .insert(diagnosisRows);

      if (diagnosesError) {
        console.error(diagnosesError);

        setError(
          "تم حفظ الزيارة لكن حدث خطأ أثناء حفظ التشخيصات"
        );

        setSaving(false);
        return;
      }
    }

    setSaving(false);

    onSaved();
  }

  return (
    <section className="panel visit-form-panel">
      <div className="panel-title">
        <div>
          <h2>
            {isEditing
              ? "✏️ تعديل الزيارة"
              : "🩺 إضافة زيارة جديدة"}
          </h2>

          <p>
            {isEditing
              ? "تعديل بيانات الزيارة الطبية"
              : "أدخل تفاصيل الزيارة الطبية"}
          </p>
        </div>
      </div>

      <form className="visit-form" onSubmit={saveVisit}>
        <div className="form-grid">
          <div className="form-field">
            <label>الطبيب *</label>

            <select
              value={doctorId}
              onChange={(e) => setDoctorId(e.target.value)}
              required
            >
              <option value="">اختر الطبيب</option>

              {doctors.map((doctor) => (
                <option
                  key={doctor.id}
                  value={doctor.id}
                >
                  {doctor.name}
                </option>
              ))}
            </select>

            {doctors.length === 0 && (
              <small className="field-warning">
                لا يوجد أطباء في جدول Doctors
              </small>
            )}
          </div>

          <div className="form-field">
            <label>تاريخ الزيارة *</label>

            <input
              type="date"
              value={visitDate}
              onChange={(e) =>
                setVisitDate(e.target.value)
              }
              required
            />
          </div>

          <div className="form-field full">
            <div className="complaints-title">
              <div>
                <label>
                  الشكاوى | Chief Complaints
                </label>

                <small>
                  يمكنك اختيار أكثر من شكوى
                </small>
              </div>

              {selectedComplaintIds.length > 0 && (
                <span className="complaints-count">
                  تم اختيار{" "}
                  {selectedComplaintIds.length}
                </span>
              )}
            </div>

            {loadingComplaints ? (
              <div className="complaints-loading">
                جاري تحميل الشكاوى...
              </div>
            ) : complaints.length === 0 ? (
              <div className="empty">
                لا توجد شكاوى في القائمة
              </div>
            ) : (
              <div className="complaints-container">
                {getComplaintCategories().map(
                  (category) => {
                    const categoryComplaints =
                      complaints.filter(
                        (complaint) =>
                          complaint.category_ar ===
                            category.ar &&
                          complaint.category_en ===
                            category.en
                      );

                    return (
                      <div
                        className="complaints-category"
                        key={`${category.ar}-${category.en}`}
                      >
                        <div className="complaints-category-title">
                          <strong>
                            {category.ar}
                          </strong>

                          <span>
                            {category.en}
                          </span>
                        </div>

                        <div className="complaints-grid">
                          {categoryComplaints.map(
                            (complaint) => {
                              const selected =
                                selectedComplaintIds.includes(
                                  complaint.id
                                );

                              return (
                                <button
                                  type="button"
                                  key={complaint.id}
                                  className={
                                    selected
                                      ? "complaint-option selected"
                                      : "complaint-option"
                                  }
                                  onClick={() =>
                                    toggleComplaint(
                                      complaint.id
                                    )
                                  }
                                >
                                  <span className="complaint-check">
                                    {selected ? "✓" : ""}
                                  </span>

                                  <span className="complaint-text">
                                    <strong>
                                      {
                                        complaint.complaint_ar
                                      }
                                    </strong>

                                    <small>
                                      {
                                        complaint.complaint_en
                                      }
                                    </small>
                                  </span>
                                </button>
                              );
                            }
                          )}
                        </div>
                      </div>
                    );
                  }
                )}
              </div>
            )}

            <div className="other-complaint">
              <label>
                أخرى | Other
              </label>

              <textarea
                value={otherComplaint}
                onChange={(e) =>
                  setOtherComplaint(e.target.value)
                }
                placeholder="اكتب أي شكوى أو عرض غير موجود في القائمة..."
                rows="3"
              />
            </div>
          </div>

          <div className="form-field full">
            <div className="complaints-title">
              <div>
                <label>
                  التشخيص | Diagnosis
                </label>

                <small>
                  يمكنك اختيار أكثر من تشخيص
                </small>
              </div>

              {selectedDiagnosisIds.length > 0 && (
                <span className="complaints-count">
                  تم اختيار{" "}
                  {selectedDiagnosisIds.length}
                </span>
              )}
            </div>

            {loadingDiagnoses ? (
              <div className="complaints-loading">
                جاري تحميل التشخيصات...
              </div>
            ) : diagnoses.length === 0 ? (
              <div className="empty">
                لا توجد تشخيصات في القائمة
              </div>
            ) : (
              <div className="complaints-container">
                {getDiagnosisCategories().map(
                  (category) => {
                    const categoryDiagnoses =
                      diagnoses.filter(
                        (diagnosis) =>
                          diagnosis.category_ar ===
                            category.ar &&
                          diagnosis.category_en ===
                            category.en
                      );

                    return (
                      <div
                        className="complaints-category"
                        key={`${category.ar}-${category.en}`}
                      >
                        <div className="complaints-category-title">
                          <strong>
                            {category.ar}
                          </strong>

                          <span>
                            {category.en}
                          </span>
                        </div>

                        <div className="complaints-grid">
                          {categoryDiagnoses.map(
                            (diagnosisItem) => {
                              const selected =
                                selectedDiagnosisIds.includes(
                                  diagnosisItem.id
                                );

                              return (
                                <button
                                  type="button"
                                  key={diagnosisItem.id}
                                  className={
                                    selected
                                      ? "complaint-option selected"
                                      : "complaint-option"
                                  }
                                  onClick={() =>
                                    toggleDiagnosis(
                                      diagnosisItem.id
                                    )
                                  }
                                >
                                  <span className="complaint-check">
                                    {selected ? "✓" : ""}
                                  </span>

                                  <span className="complaint-text">
                                    <strong>
                                      {
                                        diagnosisItem.diagnosis_ar
                                      }
                                    </strong>

                                    <small>
                                      {
                                        diagnosisItem.diagnosis_en
                                      }
                                    </small>
                                  </span>
                                </button>
                              );
                            }
                          )}
                        </div>
                      </div>
                    );
                  }
                )}
              </div>
            )}

            <div className="other-complaint">
              <label>
                تشخيص آخر | Other Diagnosis
              </label>

              <textarea
                value={otherDiagnosis}
                onChange={(e) =>
                  setOtherDiagnosis(e.target.value)
                }
                placeholder="اكتب أي تشخيص غير موجود في القائمة..."
                rows="3"
              />
            </div>
          </div>

          <div className="form-field full">
            <label>العلاج</label>

            <textarea
              value={treatment}
              onChange={(e) =>
                setTreatment(e.target.value)
              }
              placeholder="اكتب العلاج..."
              rows="3"
            />
          </div>

          <div className="form-field full">
            <label>ملاحظات</label>

            <textarea
              value={notes}
              onChange={(e) =>
                setNotes(e.target.value)
              }
              placeholder="ملاحظات إضافية..."
              rows="3"
            />
          </div>
        </div>

        {error && (
          <div className="error form-error">
            {error}
          </div>
        )}

        <div className="form-actions">
          <button
            type="button"
            className="secondary"
            onClick={onCancel}
            disabled={saving}
          >
            إلغاء
          </button>

          <button
            type="submit"
            className="primary"
            disabled={
              saving || doctors.length === 0
            }
          >
            {saving
              ? "جاري الحفظ..."
              : isEditing
              ? "حفظ التعديلات"
              : "حفظ الزيارة"}
          </button>
        </div>
      </form>
    </section>
  );
}

/* =========================
   PRESCRIPTION FORM
   ONE PRESCRIPTION
   + MULTIPLE MEDICATIONS
========================= */

function PrescriptionForm({
  patientId,
  doctors,
  prescription,
  visits,
  onSaved,
  onCancel,
}) {
  const isEditing = Boolean(prescription);

  const [doctorId, setDoctorId] = useState(
    prescription?.doctor_id || ""
  );

  const [visitId, setVisitId] = useState(
    prescription?.visit_id || ""
  );

  const [prescriptionDate, setPrescriptionDate] =
    useState(
      prescription?.prescription_date
        ? prescription.prescription_date.substring(0, 10)
        : ""
    );

  const [prescriptionNotes, setPrescriptionNotes] =
    useState(prescription?.notes || "");

  const [items, setItems] = useState(
    prescription?.items?.length
      ? prescription.items.map((item) => ({
          id: item.id,
          medication_name: item.medication_name || "",
          dose: item.dose || "",
          frequency: item.frequency || "",
          duration: item.duration || "",
          notes: item.notes || "",
        }))
      : [
          {
            medication_name: "",
            dose: "",
            frequency: "",
            duration: "",
            notes: "",
          },
        ]
  );

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!prescription && !prescriptionDate) {
      setPrescriptionDate(getLocalDate());
    }
  }, [prescription, prescriptionDate]);

  function updateItem(index, field, value) {
    setItems((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index
          ? {
              ...item,
              [field]: value,
            }
          : item
      )
    );
  }

  function addMedication() {
    setItems((current) => [
      ...current,
      {
        medication_name: "",
        dose: "",
        frequency: "",
        duration: "",
        notes: "",
      },
    ]);
  }

  function removeMedication(index) {
    if (items.length === 1) {
      return;
    }

    setItems((current) =>
      current.filter(
        (_, itemIndex) => itemIndex !== index
      )
    );
  }

  async function savePrescription(e) {
    e.preventDefault();

    if (!doctorId) {
      setError("من فضلك اختر الطبيب");
      return;
    }

    if (!prescriptionDate) {
      setError("من فضلك اختر تاريخ الوصفة");
      return;
    }

    const validItems = items.filter(
      (item) => item.medication_name.trim()
    );

    if (validItems.length === 0) {
      setError("من فضلك أضف دواء واحدًا على الأقل");
      return;
    }

    setSaving(true);
    setError("");

    const prescriptionData = {
      patient_id: patientId,
      visit_id: visitId || null,
      doctor_id: doctorId,
      prescription_date:
        `${prescriptionDate}T12:00:00`,
      notes: prescriptionNotes.trim(),
    };

    let prescriptionResult;
    let prescriptionId;

    if (isEditing) {
      prescriptionResult = await supabase
        .from("Prescriptions")
        .update(prescriptionData)
        .eq("id", prescription.id)
        .select()
        .single();

      prescriptionId = prescription.id;
    } else {
      prescriptionResult = await supabase
        .from("Prescriptions")
        .insert([prescriptionData])
        .select()
        .single();

      prescriptionId =
        prescriptionResult.data?.id;
    }

    if (prescriptionResult.error) {
      console.error(prescriptionResult.error);

      setError(prescriptionResult.error.message);
      setSaving(false);
      return;
    }

    if (!prescriptionId) {
      setError("تعذر الحصول على رقم الوصفة");
      setSaving(false);
      return;
    }

    if (isEditing) {
      const { error: deleteItemsError } =
        await supabase
          .from("PrescriptionItems")
          .delete()
          .eq(
            "prescription_id",
            prescriptionId
          );

      if (deleteItemsError) {
        console.error(deleteItemsError);

        setError(
          "تم تعديل الوصفة لكن حدث خطأ أثناء تحديث الأدوية"
        );

        setSaving(false);
        return;
      }
    }

    const itemRows = validItems.map((item) => ({
      prescription_id: prescriptionId,
      medication_name: item.medication_name.trim(),
      dose: item.dose.trim(),
      frequency: item.frequency.trim(),
      duration: item.duration.trim(),
      notes: item.notes.trim(),
    }));

    const { error: itemsError } =
      await supabase
        .from("PrescriptionItems")
        .insert(itemRows);

    if (itemsError) {
      console.error(itemsError);

      setError(
        "تم حفظ الوصفة لكن حدث خطأ أثناء حفظ الأدوية: " +
          itemsError.message
      );

      setSaving(false);
      return;
    }

    setSaving(false);

    onSaved();
  }

  return (
    <section className="panel prescription-form-panel">
      <div className="panel-title">
        <div>
          <h2>
            {isEditing
              ? "✏️ تعديل الوصفة الطبية"
              : "💊 إضافة وصفة طبية"}
          </h2>

          <p>
            {isEditing
              ? "تعديل بيانات الوصفة والأدوية"
              : "يمكنك إضافة أكثر من دواء في نفس الوصفة"}
          </p>
        </div>
      </div>

      <form
        className="prescription-form"
        onSubmit={savePrescription}
      >
        <div className="form-grid">
          <div className="form-field">
            <label>الطبيب *</label>

            <select
              value={doctorId}
              onChange={(e) =>
                setDoctorId(e.target.value)
              }
              required
            >
              <option value="">اختر الطبيب</option>

              {doctors.map((doctor) => (
                <option
                  key={doctor.id}
                  value={doctor.id}
                >
                  {doctor.name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-field">
            <label>تاريخ الوصفة *</label>

            <input
              type="date"
              value={prescriptionDate}
              onChange={(e) =>
                setPrescriptionDate(
                  e.target.value
                )
              }
              required
            />
          </div>

          <div className="form-field full">
            <label>ربط الوصفة بزيارة</label>

            <select
              value={visitId}
              onChange={(e) =>
                setVisitId(e.target.value)
              }
            >
              <option value="">
                بدون ربط بزيارة محددة
              </option>

              {visits.map((visit) => (
                <option
                  key={visit.id}
                  value={visit.id}
                >
                  {new Date(
                    visit.visit_date
                  ).toLocaleDateString("ar-SA")}
                  {" — "}
                  {visit.diagnosis ||
                    visit.chief_complaint ||
                    "زيارة"}
                </option>
              ))}
            </select>
          </div>

          <div className="form-field full">
            <div className="prescription-items-header">
              <div>
                <label>
                  💊 الأدوية
                </label>

                <small>
                  أضف دواءً أو أكثر داخل نفس الوصفة
                </small>
              </div>

              <span className="complaints-count">
                {items.length} دواء
              </span>
            </div>

            <div className="prescription-items">
              {items.map((item, index) => (
                <div
                  className="prescription-item-form"
                  key={item.id || index}
                >
                  <div className="prescription-item-header">
                    <strong>
                      الدواء رقم {index + 1}
                    </strong>

                    {items.length > 1 && (
                      <button
                        type="button"
                        className="delete-button"
                        onClick={() =>
                          removeMedication(index)
                        }
                      >
                        🗑️ حذف
                      </button>
                    )}
                  </div>

                  <div className="form-grid">
                    <div className="form-field full">
                      <label>
                        اسم الدواء *
                      </label>

                      <input
                        value={
                          item.medication_name
                        }
                        onChange={(e) =>
                          updateItem(
                            index,
                            "medication_name",
                            e.target.value
                          )
                        }
                        placeholder="مثال: Paracetamol 500 mg"
                      />
                    </div>

                    <div className="form-field">
                      <label>الجرعة</label>

                      <input
                        value={item.dose}
                        onChange={(e) =>
                          updateItem(
                            index,
                            "dose",
                            e.target.value
                          )
                        }
                        placeholder="مثال: 500 mg"
                      />
                    </div>

                    <div className="form-field">
                      <label>
                        عدد مرات الاستخدام
                      </label>

                      <input
                        value={item.frequency}
                        onChange={(e) =>
                          updateItem(
                            index,
                            "frequency",
                            e.target.value
                          )
                        }
                        placeholder="مثال: 3 مرات يوميًا"
                      />
                    </div>

                    <div className="form-field">
                      <label>
                        مدة العلاج
                      </label>

                      <input
                        value={item.duration}
                        onChange={(e) =>
                          updateItem(
                            index,
                            "duration",
                            e.target.value
                          )
                        }
                        placeholder="مثال: 5 أيام"
                      />
                    </div>

                    <div className="form-field full">
                      <label>
                        ملاحظات الدواء
                      </label>

                      <textarea
                        value={item.notes}
                        onChange={(e) =>
                          updateItem(
                            index,
                            "notes",
                            e.target.value
                          )
                        }
                        placeholder="مثال: بعد الأكل / قبل النوم..."
                        rows="2"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <button
              type="button"
              className="secondary add-medication-button"
              onClick={addMedication}
            >
              + إضافة دواء آخر
            </button>
          </div>

          <div className="form-field full">
            <label>
              ملاحظات الوصفة
            </label>

            <textarea
              value={prescriptionNotes}
              onChange={(e) =>
                setPrescriptionNotes(
                  e.target.value
                )
              }
              placeholder="ملاحظات عامة على الوصفة..."
              rows="3"
            />
          </div>
        </div>

        {error && (
          <div className="error form-error">
            {error}
          </div>
        )}

        <div className="form-actions">
          <button
            type="button"
            className="secondary"
            onClick={onCancel}
            disabled={saving}
          >
            إلغاء
          </button>

          <button
            type="submit"
            className="primary"
            disabled={
              saving || doctors.length === 0
            }
          >
            {saving
              ? "جاري الحفظ..."
              : isEditing
              ? "حفظ تعديلات الوصفة"
              : "حفظ الوصفة"}
          </button>
        </div>
      </form>
    </section>
  );
}

/* =========================
   PATIENT FILE
========================= */

function PatientFile({ patientId, onBack }) {
  const [patient, setPatient] = useState(null);
  const [visits, setVisits] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [prescriptions, setPrescriptions] =
    useState([]);
  const [doctors, setDoctors] = useState([]);

  const [visitComplaintsMap, setVisitComplaintsMap] =
    useState({});

  const [visitDiagnosesMap, setVisitDiagnosesMap] =
    useState({});

  const [prescriptionItemsMap, setPrescriptionItemsMap] =
    useState({});

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showVisitForm, setShowVisitForm] =
    useState(false);

  const [editingVisit, setEditingVisit] =
    useState(null);

  const [showPrescriptionForm, setShowPrescriptionForm] =
    useState(false);

  const [editingPrescription, setEditingPrescription] =
    useState(null);

  useEffect(() => {
    if (patientId) {
      loadPatientFile();
    }
  }, [patientId]);

  /* =========================
     OPTIMIZED PATIENT LOADING
  ========================= */

  async function loadPatientFile() {
    setLoading(true);
    setError("");

    try {
      const [
        patientResult,
        visitsResult,
        appointmentsResult,
        prescriptionsResult,
        doctorsResult,
      ] = await Promise.all([
        supabase
          .from("Patients")
          .select("*")
          .eq("id", patientId)
          .single(),

        supabase
          .from("Visits")
          .select("*")
          .eq("patient_id", patientId)
          .order("visit_date", {
            ascending: false,
          }),

        supabase
          .from("Appointments")
          .select("*")
          .eq("patient_id", patientId)
          .order("appointment_date", {
            ascending: false,
          }),

        supabase
          .from("Prescriptions")
          .select("*")
          .eq("patient_id", patientId)
          .order("prescription_date", {
            ascending: false,
          }),

        supabase
          .from("Doctors")
          .select("*")
          .order("name", {
            ascending: true,
          }),
      ]);

      if (patientResult.error) {
        throw patientResult.error;
      }

      if (visitsResult.error) {
        throw visitsResult.error;
      }

      if (appointmentsResult.error) {
        throw appointmentsResult.error;
      }

      if (prescriptionsResult.error) {
        throw prescriptionsResult.error;
      }

      if (doctorsResult.error) {
        throw doctorsResult.error;
      }

      const patientData = patientResult.data;
      const visitsData = visitsResult.data || [];
      const appointmentsData =
        appointmentsResult.data || [];
      const prescriptionsData =
        prescriptionsResult.data || [];
      const doctorsData =
        doctorsResult.data || [];

      const visitIds = visitsData.map(
        (visit) => visit.id
      );

      const prescriptionIds =
        prescriptionsData.map(
          (prescription) => prescription.id
        );

      let complaintsMap = {};
      let diagnosesMap = {};
      let prescriptionItemsMapData = {};

      const relatedRequests = [];

      if (visitIds.length > 0) {
        relatedRequests.push(
          supabase
            .from("VisitComplaints")
            .select(`
              visit_id,
              complaint_id,
              ChiefComplaints (
                id,
                complaint_ar,
                complaint_en,
                category_ar,
                category_en
              )
            `)
            .in("visit_id", visitIds)
        );

        relatedRequests.push(
          supabase
            .from("VisitDiagnoses")
            .select(`
              visit_id,
              diagnosis_id,
              Diagnoses (
                id,
                diagnosis_ar,
                diagnosis_en,
                category_ar,
                category_en
              )
            `)
            .in("visit_id", visitIds)
        );
      }

      if (prescriptionIds.length > 0) {
        relatedRequests.push(
          supabase
            .from("PrescriptionItems")
            .select("*")
            .in(
              "prescription_id",
              prescriptionIds
            )
            .order("created_at", {
              ascending: true,
            })
        );
      }

      const relatedResults =
        relatedRequests.length > 0
          ? await Promise.all(relatedRequests)
          : [];

      let relatedIndex = 0;

      if (visitIds.length > 0) {
        const visitComplaintsResult =
          relatedResults[relatedIndex];

        relatedIndex++;

        if (visitComplaintsResult.error) {
          console.error(
            "VISIT COMPLAINTS ERROR:",
            visitComplaintsResult.error
          );
        } else {
          (
            visitComplaintsResult.data || []
          ).forEach((item) => {
            if (!complaintsMap[item.visit_id]) {
              complaintsMap[item.visit_id] = [];
            }

            if (item.ChiefComplaints) {
              complaintsMap[item.visit_id].push(
                item.ChiefComplaints
              );
            }
          });
        }
      }

      if (visitIds.length > 0) {
        const visitDiagnosesResult =
          relatedResults[relatedIndex];

        relatedIndex++;

        if (visitDiagnosesResult.error) {
          console.error(
            "VISIT DIAGNOSES ERROR:",
            visitDiagnosesResult.error
          );
        } else {
          (
            visitDiagnosesResult.data || []
          ).forEach((item) => {
            if (!diagnosesMap[item.visit_id]) {
              diagnosesMap[item.visit_id] = [];
            }

            if (item.Diagnoses) {
              diagnosesMap[item.visit_id].push(
                item.Diagnoses
              );
            }
          });
        }
      }

      if (prescriptionIds.length > 0) {
        const prescriptionItemsResult =
          relatedResults[relatedIndex];

        if (prescriptionItemsResult.error) {
          console.error(
            "PRESCRIPTION ITEMS ERROR:",
            prescriptionItemsResult.error
          );

          throw prescriptionItemsResult.error;
        }

        (
          prescriptionItemsResult.data || []
        ).forEach((item) => {
          if (
            !prescriptionItemsMapData[
              item.prescription_id
            ]
          ) {
            prescriptionItemsMapData[
              item.prescription_id
            ] = [];
          }

          prescriptionItemsMapData[
            item.prescription_id
          ].push(item);
        });
      }

      setPatient(patientData);
      setVisits(visitsData);
      setAppointments(appointmentsData);
      setPrescriptions(prescriptionsData);
      setDoctors(doctorsData);
      setVisitComplaintsMap(complaintsMap);
      setVisitDiagnosesMap(diagnosesMap);
      setPrescriptionItemsMap(
        prescriptionItemsMapData
      );
    } catch (err) {
      console.error(
        "PATIENT FILE ERROR:",
        err
      );

      setError(
        err?.message ||
          err?.details ||
          err?.hint ||
          "حدث خطأ أثناء تحميل ملف المريض"
      );
    } finally {
      setLoading(false);
    }
  }

  function getDoctorName(doctorId) {
    const doctor = doctors.find(
      (item) => item.id === doctorId
    );

    return doctor?.name || "غير محدد";
  }

  function formatDate(date) {
    if (!date) {
      return "—";
    }

    return new Date(date).toLocaleDateString(
      "ar-SA",
      {
        year: "numeric",
        month: "long",
        day: "numeric",
      }
    );
  }

  function handleVisitSaved() {
    setShowVisitForm(false);
    setEditingVisit(null);
    loadPatientFile();
  }

  function startEditVisit(visit) {
    setEditingVisit(visit);
    setShowVisitForm(true);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  function cancelVisitForm() {
    setShowVisitForm(false);
    setEditingVisit(null);
  }

  async function deleteVisit(visitId) {
    const confirmed = window.confirm(
      "هل أنت متأكد من حذف هذه الزيارة؟\n\nلا يمكن التراجع عن هذا الإجراء."
    );

    if (!confirmed) {
      return;
    }

    const { error } = await supabase
      .from("Visits")
      .delete()
      .eq("id", visitId);

    if (error) {
      console.error(error);

      alert(
        "حدث خطأ أثناء حذف الزيارة:\n" +
          error.message
      );

      return;
    }

    if (editingVisit?.id === visitId) {
      cancelVisitForm();
    }

    await loadPatientFile();
  }

  function handlePrescriptionSaved() {
    setShowPrescriptionForm(false);
    setEditingPrescription(null);
    loadPatientFile();
  }

  function startEditPrescription(prescription) {
    const prescriptionWithItems = {
      ...prescription,
      items:
        prescriptionItemsMap[
          prescription.id
        ] || [],
    };

    setEditingPrescription(
      prescriptionWithItems
    );

    setShowPrescriptionForm(true);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  function cancelPrescriptionForm() {
    setShowPrescriptionForm(false);
    setEditingPrescription(null);
  }

  async function deletePrescription(
    prescriptionId
  ) {
    const confirmed = window.confirm(
      "هل أنت متأكد من حذف هذه الوصفة؟\n\nسيتم حذف جميع الأدوية داخل الوصفة أيضًا.\n\nلا يمكن التراجع عن هذا الإجراء."
    );

    if (!confirmed) {
      return;
    }

    const { error } = await supabase
      .from("Prescriptions")
      .delete()
      .eq("id", prescriptionId);

    if (error) {
      console.error(error);

      alert(
        "حدث خطأ أثناء حذف الوصفة:\n" +
          error.message
      );

      return;
    }

    if (
      editingPrescription?.id ===
      prescriptionId
    ) {
      cancelPrescriptionForm();
    }

    await loadPatientFile();
  }

  if (loading) {
    return (
      <main className="content">
        <div className="panel">
          <div className="empty">
            جاري تحميل ملف المريض...
          </div>
        </div>
      </main>
    );
  }

  if (error || !patient) {
    return (
      <main className="content">
        <div className="panel">
          <div className="error">
            {error || "لم يتم العثور على المريض"}
          </div>

          <button
            className="secondary"
            onClick={onBack}
          >
            ← العودة إلى المرضى
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="content patient-file-page">
      <button
        className="back-button"
        onClick={onBack}
      >
        ← العودة إلى المرضى
      </button>

      <section className="patient-profile-header">
        <div className="patient-profile-avatar">
          {patient.name?.charAt(0) || "م"}
        </div>

        <div className="patient-profile-main">
          <h1>{patient.name}</h1>

          <p>
            📱 {patient.phone || "لا يوجد رقم جوال"}
          </p>
        </div>

        <div className="patient-profile-status">
          <span>حالة الحمل</span>

          <strong>
            {patient.pregnancy_status || "غير محدد"}
          </strong>
        </div>
      </section>

      <section className="panel">
        <div className="panel-title">
          <div>
            <h2>👤 بيانات المريض</h2>

            <p>المعلومات الأساسية للمريض</p>
          </div>
        </div>

        <div className="patient-info-grid">
          <div className="info-box">
            <small>الاسم</small>
            <strong>
              {patient.name || "—"}
            </strong>
          </div>

          <div className="info-box">
            <small>رقم الجوال</small>
            <strong>
              {patient.phone || "—"}
            </strong>
          </div>

          <div className="info-box">
            <small>العمر</small>
            <strong>
              {patient.age ?? "—"}
            </strong>
          </div>

          <div className="info-box">
            <small>حالة الحمل</small>

            <strong>
              {patient.pregnancy_status || "—"}
            </strong>
          </div>

          <div className="info-box">
            <small>العنوان</small>
            <strong>
              {patient.address || "—"}
            </strong>
          </div>

          <div className="info-box">
            <small>ملاحظات</small>
            <strong>
              {patient.notes || "—"}
            </strong>
          </div>
        </div>
      </section>

      <section className="panel">
        <div className="panel-title">
          <div>
            <h2>🩺 الزيارات</h2>

            <p>السجل الطبي للزيارات</p>
          </div>

          {!showVisitForm && (
            <button
              className="primary"
              onClick={() => {
                setEditingVisit(null);
                setShowVisitForm(true);
              }}
            >
              + إضافة زيارة
            </button>
          )}
        </div>

        {showVisitForm && (
          <VisitForm
            patientId={patientId}
            doctors={doctors}
            visit={editingVisit}
            onSaved={handleVisitSaved}
            onCancel={cancelVisitForm}
          />
        )}

        {visits.length === 0 ? (
          <div className="empty">
            لا توجد زيارات مسجلة لهذا المريض
          </div>
        ) : (
          <div className="medical-list">
            {visits.map((visit) => {
              const selectedComplaints =
                visitComplaintsMap[visit.id] || [];

              const selectedDiagnoses =
                visitDiagnosesMap[visit.id] || [];

              return (
                <div
                  className="medical-card"
                  key={visit.id}
                >
                  <div className="medical-card-header">
                    <div>
                      <strong>
                        {formatDate(
                          visit.visit_date
                        )}
                      </strong>

                      <span>
                        الطبيب:{" "}
                        {getDoctorName(
                          visit.doctor_id
                        )}
                      </span>
                    </div>

                    <div className="visit-actions">
                      <button
                        className="edit-button"
                        onClick={() =>
                          startEditVisit(visit)
                        }
                      >
                        ✏️ تعديل
                      </button>

                      <button
                        className="delete-button"
                        onClick={() =>
                          deleteVisit(visit.id)
                        }
                      >
                        🗑️ حذف
                      </button>
                    </div>
                  </div>

                  <div className="medical-card-grid">
                    <div className="visit-complaints-display">
                      <small>
                        الشكاوى | Chief Complaints
                      </small>

                      {selectedComplaints.length >
                      0 ? (
                        <div className="selected-complaints-list">
                          {selectedComplaints.map(
                            (complaint) => (
                              <div
                                className="selected-complaint"
                                key={complaint.id}
                              >
                                <strong>
                                  {
                                    complaint.complaint_ar
                                  }
                                </strong>

                                <span>
                                  {
                                    complaint.complaint_en
                                  }
                                </span>
                              </div>
                            )
                          )}
                        </div>
                      ) : null}

                      {visit.chief_complaint && (
                        <div className="other-complaint-display">
                          <strong>
                            أخرى:
                          </strong>{" "}
                          {visit.chief_complaint}
                        </div>
                      )}

                      {selectedComplaints.length ===
                        0 &&
                        !visit.chief_complaint && (
                          <p>—</p>
                        )}
                    </div>

                    <div className="visit-complaints-display">
                      <small>
                        التشخيص | Diagnosis
                      </small>

                      {selectedDiagnoses.length >
                      0 ? (
                        <div className="selected-complaints-list">
                          {selectedDiagnoses.map(
                            (diagnosisItem) => (
                              <div
                                className="selected-complaint"
                                key={diagnosisItem.id}
                              >
                                <strong>
                                  {
                                    diagnosisItem.diagnosis_ar
                                  }
                                </strong>

                                <span>
                                  {
                                    diagnosisItem.diagnosis_en
                                  }
                                </span>
                              </div>
                            )
                          )}
                        </div>
                      ) : null}

                      {visit.diagnosis && (
                        <div className="other-complaint-display">
                          <strong>
                            تشخيص آخر:
                          </strong>{" "}
                          {visit.diagnosis}
                        </div>
                      )}

                      {selectedDiagnoses.length ===
                        0 &&
                        !visit.diagnosis && (
                          <p>—</p>
                        )}
                    </div>

                    <div>
                      <small>العلاج</small>

                      <p>
                        {visit.treatment || "—"}
                      </p>
                    </div>

                    <div>
                      <small>ملاحظات</small>

                      <p>
                        {visit.notes || "—"}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="panel">
        <div className="panel-title">
          <div>
            <h2>💊 الوصفات الطبية</h2>

            <p>
              الأدوية والوصفات المسجلة للمريض
            </p>
          </div>

          {!showPrescriptionForm && (
            <button
              className="primary"
              onClick={() => {
                setEditingPrescription(null);
                setShowPrescriptionForm(true);
              }}
            >
              + إضافة وصفة
            </button>
          )}
        </div>

        {showPrescriptionForm && (
          <PrescriptionForm
            patientId={patientId}
            doctors={doctors}
            visits={visits}
            prescription={editingPrescription}
            onSaved={handlePrescriptionSaved}
            onCancel={cancelPrescriptionForm}
          />
        )}

        {prescriptions.length === 0 ? (
          <div className="empty">
            لا توجد وصفات طبية مسجلة لهذا المريض
          </div>
        ) : (
          <div className="prescriptions-list">
            {prescriptions.map((prescription) => {
              const items =
                prescriptionItemsMap[
                  prescription.id
                ] || [];

              return (
                <div
                  className="prescription-card"
                  key={prescription.id}
                >
                  <div className="prescription-card-header">
                    <div className="prescription-title">
                      <div className="prescription-icon">
                        💊
                      </div>

                      <div>
                        <strong>
                          وصفة طبية
                        </strong>

                        <span>
                          {formatDate(
                            prescription.prescription_date
                          )}
                        </span>
                      </div>
                    </div>

                    <div className="prescription-actions">
                      <button
                        className="edit-button"
                        onClick={() =>
                          startEditPrescription(
                            prescription
                          )
                        }
                      >
                        ✏️ تعديل
                      </button>

                      <button
                        className="delete-button"
                        onClick={() =>
                          deletePrescription(
                            prescription.id
                          )
                        }
                      >
                        🗑️ حذف
                      </button>
                    </div>
                  </div>

                  <div className="prescription-doctor-row">
                    <span>
                      👨‍⚕️ الطبيب:
                    </span>

                    <strong>
                      {getDoctorName(
                        prescription.doctor_id
                      )}
                    </strong>
                  </div>

                  {prescription.visit_id && (
                    <div className="prescription-visit-row">
                      <span>
                        🩺 مرتبطة بزيارة:
                      </span>

                      <strong>
                        {formatDate(
                          visits.find(
                            (visit) =>
                              visit.id ===
                              prescription.visit_id
                          )?.visit_date
                        )}
                      </strong>
                    </div>
                  )}

                  <div className="prescription-medications">
                    <div className="prescription-medications-title">
                      <strong>
                        💊 الأدوية
                      </strong>

                      <span>
                        {items.length} دواء
                      </span>
                    </div>

                    {items.length === 0 ? (
                      <div className="empty">
                        لا توجد أدوية مسجلة داخل هذه الوصفة
                      </div>
                    ) : (
                      <div className="prescription-items-display">
                        {items.map(
                          (item, index) => (
                            <div
                              className="prescription-medication-card"
                              key={item.id}
                            >
                              <div className="medication-number">
                                {index + 1}
                              </div>

                              <div className="medication-main">
                                <strong>
                                  {
                                    item.medication_name
                                  }
                                </strong>

                                <div className="medication-details">
                                  <div>
                                    <small>
                                      الجرعة
                                    </small>

                                    <span>
                                      {item.dose ||
                                        "—"}
                                    </span>
                                  </div>

                                  <div>
                                    <small>
                                      الاستخدام
                                    </small>

                                    <span>
                                      {item.frequency ||
                                        "—"}
                                    </span>
                                  </div>

                                  <div>
                                    <small>
                                      المدة
                                    </small>

                                    <span>
                                      {item.duration ||
                                        "—"}
                                    </span>
                                  </div>
                                </div>

                                {item.notes && (
                                  <div className="medication-notes">
                                    <small>
                                      ملاحظات
                                    </small>

                                    <p>
                                      {item.notes}
                                    </p>
                                  </div>
                                )}
                              </div>
                            </div>
                          )
                        )}
                      </div>
                    )}
                  </div>

                  {prescription.notes && (
                    <div className="prescription-general-notes">
                      <small>
                        ملاحظات الوصفة
                      </small>

                      <p>
                        {prescription.notes}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="panel">
        <div className="panel-title">
          <div>
            <h2>📅 المواعيد</h2>

            <p>مواعيد المريض</p>
          </div>

          <span className="section-count">
            {appointments.length} موعد
          </span>
        </div>

        {appointments.length === 0 ? (
          <div className="empty">
            لا توجد مواعيد لهذا المريض
          </div>
        ) : (
          <div className="appointments-list">
            {appointments.map((appointment) => (
              <div
                className="appointment-card"
                key={appointment.id}
              >
                <div>
                  <strong>
                    {formatDateArabic(
                      appointment.appointment_date
                    )}
                  </strong>

                  <span>
                    ⏰{" "}
                    {formatTime(
                      appointment.appointment_time
                    )}
                  </span>
                </div>

                <div>
                  <small>الطبيب</small>

                  <strong>
                    {getDoctorName(
                      appointment.doctor_id
                    )}
                  </strong>
                </div>

                <div>
                  <small>الحالة</small>

                  <span className="appointment-status">
                    {getStatusLabel(
                      appointment.status
                    )}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="patient-file-shortcuts">
        <div className="shortcut-card active-shortcut">
          💊
          <span>الوصفات الطبية</span>
          <small>
            {prescriptions.length} وصفة
          </small>
        </div>

        <div className="shortcut-card">
          🧪
          <span>التحاليل والسونار</span>
          <small>قريبًا</small>
        </div>

        <div className="shortcut-card">
          📎
          <span>الملفات والمرفقات</span>
          <small>قريبًا</small>
        </div>
      </section>
    </main>
  );
}

/* =========================
   MAIN APP
========================= */

export default function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  const [page, setPage] = useState("dashboard");

  const [selectedPatientId, setSelectedPatientId] =
    useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (_event, currentSession) => {
        setSession(currentSession);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  async function logout() {
    await supabase.auth.signOut();

    setSession(null);
  }

  function openPatient(patientId) {
    setSelectedPatientId(patientId);
    setPage("patient-file");
  }

  function backToPatients() {
    setSelectedPatientId(null);
    setPage("patients");
  }

  if (loading) {
    return (
      <div className="loading">
        جاري التحميل...
      </div>
    );
  }

  if (!session) {
    return <Login onLogin={setSession} />;
  }

  return (
    <div className="app">
      <header className="header">
        <div>
          <h2>Clinic Starter</h2>

          <span>عيادة النساء والولادة</span>
        </div>

        <div className="user-area">
          <span>{session?.user?.email}</span>

          <button
            className="logout"
            onClick={logout}
          >
            تسجيل الخروج
          </button>
        </div>
      </header>

      <nav className="navigation">
        <button
          className={
            page === "dashboard" ? "active" : ""
          }
          onClick={() => {
            setPage("dashboard");
            setSelectedPatientId(null);
          }}
        >
          الرئيسية
        </button>

        <button
          className={
            page === "patients" ||
            page === "patient-file"
              ? "active"
              : ""
          }
          onClick={() => {
            setPage("patients");
            setSelectedPatientId(null);
          }}
        >
          المرضى
        </button>

        <button
          className={
            page === "appointments" ? "active" : ""
          }
          onClick={() => {
            setPage("appointments");
            setSelectedPatientId(null);
          }}
        >
          المواعيد
        </button>

        <button
          onClick={() => {
            alert(
              "الزيارات يتم إدارتها من ملف المريض حاليًا"
            );
          }}
        >
          الزيارات
        </button>
      </nav>

      {page === "dashboard" && <Dashboard />}

      {page === "patients" && (
        <Patients onOpenPatient={openPatient} />
      )}

      {page === "patient-file" && (
        <PatientFile
          patientId={selectedPatientId}
          onBack={backToPatients}
        />
      )}

      {page === "appointments" && (
        <AppointmentsPage
          onOpenPatient={openPatient}
        />
      )}
    </div>
  );
}