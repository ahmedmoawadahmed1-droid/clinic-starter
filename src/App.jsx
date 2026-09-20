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

function toDateKey(date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function isSameDay(dateA, dateB) {
  if (!dateA || !dateB) {
    return false;
  }

  return toDateKey(dateA) === toDateKey(dateB);
}

function getMonthMatrix(referenceDate) {
  const year = referenceDate.getFullYear();
  const month = referenceDate.getMonth();

  const firstOfMonth = new Date(year, month, 1);
  const startWeekday = firstOfMonth.getDay();

  const daysInMonth = new Date(
    year,
    month + 1,
    0
  ).getDate();

  const cells = [];

  for (let i = 0; i < startWeekday; i++) {
    cells.push(
      new Date(year, month, i - startWeekday + 1)
    );
  }

  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(new Date(year, month, d));
  }

  while (cells.length % 7 !== 0) {
    const last = cells[cells.length - 1];

    cells.push(
      new Date(
        last.getFullYear(),
        last.getMonth(),
        last.getDate() + 1
      )
    );
  }

  const weeks = [];

  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7));
  }

  return weeks;
}

function getWeekDays(referenceDate) {
  const weekday = referenceDate.getDay();

  const start = new Date(referenceDate);
  start.setDate(referenceDate.getDate() - weekday);

  const days = [];

  for (let i = 0; i < 7; i++) {
    const day = new Date(start);
    day.setDate(start.getDate() + i);
    days.push(day);
  }

  return days;
}

const WEEKDAY_LABELS = [
  "الأحد",
  "الإثنين",
  "الثلاثاء",
  "الأربعاء",
  "الخميس",
  "الجمعة",
  "السبت",
];

function formatDateArabic(date) {
  if (!date) {
    return "—";
  }

  return new Date(date + "T12:00:00").toLocaleDateString(
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

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getStatusLabel(status) {
  switch (status) {
    case "Confirmed":
      return "مؤكد";

    case "Completed":
      return "مكتمل";

    case "Attended":
      return "حضر";

    case "NoShow":
      return "لم يحضر";

    case "Cancelled":
      return "ملغي";

    case "Pending":
    default:
      return "قيد الانتظار";
  }
}

async function getCurrentUserId() {
  const { data } = await supabase.auth.getUser();

  return data?.user?.id || null;
}

function getRoleLabel(role) {
  switch (role) {
    case "admin":
      return "مدير";

    case "receptionist":
      return "استقبال";

    case "doctor":
      return "طبيبة";

    default:
      return "";
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

function getMonthRange(monthsAgo) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() - monthsAgo;

  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 0);

  return {
    start: toDateKey(start),
    end: toDateKey(end),
  };
}

function SimpleBarChart({ data }) {
  const maxValue = Math.max(
    1,
    ...data.map((item) => item.value)
  );

  return (
    <div className="simple-bar-chart">
      {data.length === 0 ? (
        <div className="empty">لا توجد بيانات كافية</div>
      ) : (
        data.map((item) => (
          <div
            className="simple-bar-row"
            key={item.label}
          >
            <span className="simple-bar-label">
              {item.label}
            </span>

            <div className="simple-bar-track">
              <div
                className="simple-bar-fill"
                style={{
                  width: `${
                    (item.value / maxValue) * 100
                  }%`,
                  background: item.color || "#6d5dfc",
                }}
              />
            </div>

            <span className="simple-bar-value">
              {item.value}
            </span>
          </div>
        ))
      )}
    </div>
  );
}

function SimpleTrendChart({ data }) {
  const width = 600;
  const height = 120;
  const padding = 10;

  const maxValue = Math.max(
    1,
    ...data.map((item) => item.value)
  );

  const stepX =
    data.length > 1
      ? (width - padding * 2) / (data.length - 1)
      : 0;

  const points = data.map((item, index) => {
    const x = padding + index * stepX;
    const y =
      height -
      padding -
      (item.value / maxValue) * (height - padding * 2);
    return `${x},${y}`;
  });

  const linePoints = points.join(" ");

  const areaPoints =
    data.length > 0
      ? `${padding},${height - padding} ${linePoints} ${
          padding + (data.length - 1) * stepX
        },${height - padding}`
      : "";

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="simple-trend-chart"
      preserveAspectRatio="none"
    >
      {data.length > 0 && (
        <>
          <polygon
            points={areaPoints}
            fill="rgba(109, 93, 252, 0.12)"
          />

          <polyline
            points={linePoints}
            fill="none"
            stroke="#6d5dfc"
            strokeWidth="2"
          />
        </>
      )}
    </svg>
  );
}

function NotificationsBell({ profile, onOpenPatient }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState([]);
  const [loaded, setLoaded] = useState(false);

  async function loadNotifications() {
    setLoading(true);

    const today = getLocalDate();

    try {
      const [
        pendingAppointmentsResult,
        missingLabsResult,
      ] = await Promise.all([
        supabase
          .from("Appointments")
          .select("id, appointment_time, patient_id, Patients(name)")
          .eq("appointment_date", today)
          .eq("status", "Pending")
          .eq("is_deleted", false)
          .order("appointment_time", {
            ascending: true,
          }),

        supabase
          .from("Labs_Ultrasound")
          .select("id, test_name, test_date, patient_id, Patients(name)")
          .or("result.is.null,result.eq.")
          .eq("is_deleted", false)
          .order("test_date", { ascending: false })
          .limit(15),
      ]);

      const notificationItems = [];

      (pendingAppointmentsResult.data || []).forEach(
        (appointment) => {
          notificationItems.push({
            id: `appt-${appointment.id}`,
            type: "appointment",
            icon: "📅",
            text: `موعد اليوم لسه غير مؤكد — ${
              appointment.Patients?.name || "مريضة"
            } (${formatTime(
              appointment.appointment_time
            )})`,
            patientId: appointment.patient_id,
          });
        }
      );

      (missingLabsResult.data || []).forEach((lab) => {
        notificationItems.push({
          id: `lab-${lab.id}`,
          type: "lab",
          icon: "🧪",
          text: `نتيجة تحليل ناقصة — ${
            lab.Patients?.name || "مريضة"
          }: ${lab.test_name}`,
          patientId: lab.patient_id,
        });
      });

      setItems(notificationItems);
      setLoaded(true);
    } catch (err) {
      console.error("NOTIFICATIONS ERROR:", err);
    }

    setLoading(false);
  }

  function toggleOpen() {
    const next = !open;
    setOpen(next);

    if (next && !loaded) {
      loadNotifications();
    }
  }

  return (
    <div className="notifications-wrapper">
      <button
        className="logout notifications-bell"
        onClick={toggleOpen}
        aria-label="الإشعارات"
        title="الإشعارات"
      >
        🔔
        {items.length > 0 && (
          <span className="notifications-badge">
            {items.length}
          </span>
        )}
      </button>

      {open && (
        <div className="notifications-dropdown">
          <div className="notifications-dropdown-title">
            التنبيهات
          </div>

          {loading ? (
            <div className="empty">جاري التحميل...</div>
          ) : items.length === 0 ? (
            <div className="empty">
              لا توجد تنبيهات حاليًا
            </div>
          ) : (
            items.map((item) => (
              <button
                key={item.id}
                className="notification-item"
                onClick={() => {
                  setOpen(false);
                  onOpenPatient(item.patientId);
                }}
              >
                <span className="notification-icon">
                  {item.icon}
                </span>
                <span>{item.text}</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function Dashboard() {
  const [patients, setPatients] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [visits, setVisits] = useState([]);
  const [doctors, setDoctors] = useState([]);

  const [monthVisits, setMonthVisits] = useState([]);
  const [lastMonthVisits, setLastMonthVisits] =
    useState([]);

  const [monthAppointments, setMonthAppointments] =
    useState([]);
  const [
    lastMonthAppointments,
    setLastMonthAppointments,
  ] = useState([]);

  const [monthNewPatients, setMonthNewPatients] =
    useState(0);
  const [
    lastMonthNewPatients,
    setLastMonthNewPatients,
  ] = useState(0);

  const [last14DaysVisits, setLast14DaysVisits] =
    useState([]);

  const [topComplaints, setTopComplaints] = useState([]);
  const [topDiagnoses, setTopDiagnoses] = useState([]);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const today = getLocalDate();

    try {
      const thisMonth = getMonthRange(0);
      const lastMonth = getMonthRange(1);

      const fourteenDaysAgo = new Date();
      fourteenDaysAgo.setDate(
        fourteenDaysAgo.getDate() - 13
      );

      const [
        patientsResult,
        appointmentsResult,
        visitsResult,
        doctorsResult,
        monthVisitsResult,
        lastMonthVisitsResult,
        monthAppointmentsResult,
        lastMonthAppointmentsResult,
        trendVisitsResult,
      ] = await Promise.all([
        supabase
          .from("Patients")
          .select("*")
          .order("created_at", { ascending: false }),

        supabase
          .from("Appointments")
          .select("*")
          .eq("appointment_date", today)
          .eq("is_deleted", false),

        supabase
          .from("Visits")
          .select("*")
          .eq("is_deleted", false),

        supabase.from("Doctors").select("*"),

        supabase
          .from("Visits")
          .select("*")
          .eq("is_deleted", false)
          .gte(
            "visit_date",
            `${thisMonth.start}T00:00:00`
          )
          .lte(
            "visit_date",
            `${thisMonth.end}T23:59:59`
          ),

        supabase
          .from("Visits")
          .select("id")
          .eq("is_deleted", false)
          .gte(
            "visit_date",
            `${lastMonth.start}T00:00:00`
          )
          .lte(
            "visit_date",
            `${lastMonth.end}T23:59:59`
          ),

        supabase
          .from("Appointments")
          .select("id, status")
          .eq("is_deleted", false)
          .gte(
            "appointment_date",
            thisMonth.start
          )
          .lte("appointment_date", thisMonth.end),

        supabase
          .from("Appointments")
          .select("id")
          .eq("is_deleted", false)
          .gte(
            "appointment_date",
            lastMonth.start
          )
          .lte("appointment_date", lastMonth.end),

        supabase
          .from("Visits")
          .select("visit_date")
          .eq("is_deleted", false)
          .gte(
            "visit_date",
            `${toDateKey(
              fourteenDaysAgo
            )}T00:00:00`
          ),
      ]);

      setPatients(patientsResult.data || []);
      setAppointments(appointmentsResult.data || []);
      setVisits(visitsResult.data || []);
      setDoctors(doctorsResult.data || []);

      setMonthVisits(monthVisitsResult.data || []);
      setLastMonthVisits(
        lastMonthVisitsResult.data || []
      );

      setMonthAppointments(
        monthAppointmentsResult.data || []
      );
      setLastMonthAppointments(
        lastMonthAppointmentsResult.data || []
      );

      const newPatientsThisMonth = (
        patientsResult.data || []
      ).filter(
        (p) =>
          p.created_at &&
          p.created_at.substring(0, 10) >=
            thisMonth.start &&
          p.created_at.substring(0, 10) <=
            thisMonth.end
      ).length;

      const newPatientsLastMonth = (
        patientsResult.data || []
      ).filter(
        (p) =>
          p.created_at &&
          p.created_at.substring(0, 10) >=
            lastMonth.start &&
          p.created_at.substring(0, 10) <=
            lastMonth.end
      ).length;

      setMonthNewPatients(newPatientsThisMonth);
      setLastMonthNewPatients(newPatientsLastMonth);

      // اتجاه آخر 14 يوم
      const trendMap = {};
      for (let i = 13; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        trendMap[toDateKey(d)] = 0;
      }

      (trendVisitsResult.data || []).forEach((v) => {
        const key = (v.visit_date || "").substring(
          0,
          10
        );
        if (trendMap[key] !== undefined) {
          trendMap[key] += 1;
        }
      });

      setLast14DaysVisits(
        Object.entries(trendMap).map(
          ([date, value]) => ({ date, value })
        )
      );

      // أكثر الشكاوى والتشخيصات هذا الشهر
      const monthVisitIds = (
        monthVisitsResult.data || []
      ).map((v) => v.id);

      if (monthVisitIds.length > 0) {
        const [
          complaintsJoinResult,
          diagnosesJoinResult,
        ] = await Promise.all([
          supabase
            .from("VisitComplaints")
            .select(
              `visit_id, ChiefComplaints ( complaint_ar )`
            )
            .in("visit_id", monthVisitIds),

          supabase
            .from("VisitDiagnoses")
            .select(
              `visit_id, Diagnoses ( diagnosis_ar )`
            )
            .in("visit_id", monthVisitIds),
        ]);

        const complaintCounts = {};
        (complaintsJoinResult.data || []).forEach(
          (item) => {
            const name =
              item.ChiefComplaints?.complaint_ar;
            if (!name) return;
            complaintCounts[name] =
              (complaintCounts[name] || 0) + 1;
          }
        );

        const diagnosisCounts = {};
        (diagnosesJoinResult.data || []).forEach(
          (item) => {
            const name =
              item.Diagnoses?.diagnosis_ar;
            if (!name) return;
            diagnosisCounts[name] =
              (diagnosisCounts[name] || 0) + 1;
          }
        );

        setTopComplaints(
          Object.entries(complaintCounts)
            .map(([label, value]) => ({
              label,
              value,
            }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 5)
        );

        setTopDiagnoses(
          Object.entries(diagnosisCounts)
            .map(([label, value]) => ({
              label,
              value,
            }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 5)
        );
      } else {
        setTopComplaints([]);
        setTopDiagnoses([]);
      }
    } catch (err) {
      console.error("DASHBOARD ERROR:", err);
    }
  }

  function getDoctorName(doctorId) {
    return (
      doctors.find((d) => d.id === doctorId)?.name ||
      "غير محدد"
    );
  }

  function getChangeLabel(current, previous) {
    if (previous === 0) {
      return current > 0 ? "جديد" : "—";
    }

    const diff = Math.round(
      ((current - previous) / previous) * 100
    );

    if (diff === 0) {
      return "بدون تغيير";
    }

    return diff > 0
      ? `▲ ${diff}% عن الشهر السابق`
      : `▼ ${Math.abs(diff)}% عن الشهر السابق`;
  }

  const visitsByDoctorData = Object.values(
    monthVisits.reduce((acc, visit) => {
      const name = getDoctorName(visit.doctor_id);

      if (!acc[name]) {
        acc[name] = { label: name, value: 0 };
      }

      acc[name].value += 1;
      return acc;
    }, {})
  ).sort((a, b) => b.value - a.value);

  const STATUS_COLORS = {
    Pending: "#f5a623",
    Confirmed: "#5143d6",
    Attended: "#00897b",
    NoShow: "#d81b60",
    Completed: "#1565c0",
    Cancelled: "#c62828",
  };

  const appointmentsByStatusData = Object.values(
    monthAppointments.reduce((acc, appointment) => {
      const status = appointment.status || "Pending";
      const label = getStatusLabel(status);

      if (!acc[status]) {
        acc[status] = {
          label,
          value: 0,
          color: STATUS_COLORS[status],
        };
      }

      acc[status].value += 1;
      return acc;
    }, {})
  );

  const recentPatients = patients.slice(0, 5);

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
            <small>الزيارات هذا الشهر</small>
            <strong>{monthVisits.length}</strong>
          </div>
        </div>
      </div>

      <div className="stats">
        <div className="stat-card">
          <span>🆕</span>

          <div>
            <small>مرضى جدد هذا الشهر</small>
            <strong>{monthNewPatients}</strong>
            <div className="stat-trend">
              {getChangeLabel(
                monthNewPatients,
                lastMonthNewPatients
              )}
            </div>
          </div>
        </div>

        <div className="stat-card">
          <span>📆</span>

          <div>
            <small>مواعيد هذا الشهر</small>
            <strong>
              {monthAppointments.length}
            </strong>
            <div className="stat-trend">
              {getChangeLabel(
                monthAppointments.length,
                lastMonthAppointments.length
              )}
            </div>
          </div>
        </div>

        <div className="stat-card">
          <span>📈</span>

          <div>
            <small>زيارات مقارنة بالشهر السابق</small>
            <strong>{monthVisits.length}</strong>
            <div className="stat-trend">
              {getChangeLabel(
                monthVisits.length,
                lastMonthVisits.length
              )}
            </div>
          </div>
        </div>
      </div>

      <section className="panel">
        <div className="panel-title">
          <div>
            <h2>📈 اتجاه الزيارات (آخر 14 يوم)</h2>
            <p>عدد الزيارات المسجلة يوميًا</p>
          </div>
        </div>

        <SimpleTrendChart data={last14DaysVisits} />
      </section>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "18px",
        }}
        className="dashboard-charts-grid"
      >
        <section className="panel">
          <div className="panel-title">
            <div>
              <h2>👩‍⚕️ الزيارات حسب الطبيبة</h2>
              <p>هذا الشهر</p>
            </div>
          </div>

          <SimpleBarChart data={visitsByDoctorData} />
        </section>

        <section className="panel">
          <div className="panel-title">
            <div>
              <h2>📊 المواعيد حسب الحالة</h2>
              <p>هذا الشهر</p>
            </div>
          </div>

          <SimpleBarChart
            data={appointmentsByStatusData}
          />
        </section>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "18px",
        }}
        className="dashboard-charts-grid"
      >
        <section className="panel">
          <div className="panel-title">
            <div>
              <h2>🩺 أكثر الشكاوى</h2>
              <p>هذا الشهر</p>
            </div>
          </div>

          <SimpleBarChart
            data={topComplaints}
          />
        </section>

        <section className="panel">
          <div className="panel-title">
            <div>
              <h2>📋 أكثر التشخيصات</h2>
              <p>هذا الشهر</p>
            </div>
          </div>

          <SimpleBarChart data={topDiagnoses} />
        </section>
      </div>

      <section className="panel">
        <div className="panel-title">
          <div>
            <h2>أحدث المرضى</h2>
            <p>آخر المرضى المسجلين في العيادة</p>
          </div>
        </div>

        <div className="patients">
          {recentPatients.length === 0 ? (
            <div className="empty">لا توجد بيانات مرضى</div>
          ) : (
            recentPatients.map((patient) => (
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

const PATIENTS_PAGE_SIZE = 20;

function Patients({ onOpenPatient, profile }) {
  const [patients, setPatients] = useState([]);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] =
    useState("");
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [age, setAge] = useState("");
  const [address, setAddress] = useState("");
  const [pregnancyStatus, setPregnancyStatus] = useState("");
  const [notes, setNotes] = useState("");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // تأخير بسيط قبل تنفيذ البحث حتى لا نرسل طلب مع كل حرف يُكتب
  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(0);
    }, 350);

    return () => clearTimeout(timeout);
  }, [search]);

  useEffect(() => {
    loadPatients();
  }, [page, debouncedSearch]);

  async function loadPatients() {
    setLoading(true);
    setError("");

    const from = page * PATIENTS_PAGE_SIZE;
    const to = from + PATIENTS_PAGE_SIZE - 1;

    let query = supabase
      .from("Patients")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(from, to);

    if (debouncedSearch) {
      const term = debouncedSearch.replace(
        /[%,]/g,
        ""
      );

      query = query.or(
        `name.ilike.%${term}%,phone.ilike.%${term}%,file_number.ilike.%${term}%`
      );
    }

    const { data, error, count } = await query;

    if (error) {
      console.error(error);
      setError("حدث خطأ أثناء تحميل المرضى");
    } else {
      setPatients(data || []);
      setTotalCount(count || 0);
    }

    setLoading(false);
  }

  async function addPatient(e) {
    e.preventDefault();

    setError("");

    const trimmedName = name.trim();
    const trimmedPhone = phone.trim();

    if (!trimmedName) {
      setError("من فضلك أدخل اسم المريضة");
      return;
    }

    if (trimmedPhone) {
      const phonePattern = /^(01[0125]\d{8}|\+201[0125]\d{8})$/;

      if (!phonePattern.test(trimmedPhone)) {
        setError(
          "رقم الجوال غير صحيح. يجب أن يبدأ بـ 010 أو 011 أو 012 أو 015 ويتكون من 11 رقم (مثال: 01012345678)"
        );
        return;
      }
    }

    if (age) {
      const ageNumber = Number(age);

      if (
        Number.isNaN(ageNumber) ||
        ageNumber < 0 ||
        ageNumber > 120
      ) {
        setError("العمر يجب أن يكون رقمًا بين 0 و 120");
        return;
      }
    }

    setSaving(true);

    if (trimmedPhone) {
      const {
        data: existingPatients,
        error: checkError,
      } = await supabase
        .from("Patients")
        .select("id, name")
        .eq("phone", trimmedPhone)
        .limit(1);

      if (checkError) {
        console.error(checkError);

        setError(
          "حدث خطأ أثناء التحقق من رقم الجوال"
        );

        setSaving(false);
        return;
      }

      if (
        existingPatients &&
        existingPatients.length > 0
      ) {
        setError(
          `رقم الجوال مسجل بالفعل لمريضة أخرى: ${existingPatients[0].name}`
        );

        setSaving(false);
        return;
      }
    }

    const { error } = await supabase
      .from("Patients")
      .insert([
        {
          name: trimmedName,
          phone: trimmedPhone,
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

  const totalPages = Math.max(
    1,
    Math.ceil(totalCount / PATIENTS_PAGE_SIZE)
  );

  const canManagePatients = profile?.role !== "doctor";

  return (
    <main className="content">
      <div className="page-header">
        <div>
          <h1>المرضى</h1>
          <p>إدارة بيانات المرضى وملفاتهم الطبية</p>
        </div>

        {canManagePatients && (
          <button
            className="primary"
            onClick={() => {
              setShowForm(!showForm);
              setError("");
            }}
          >
            {showForm ? "إلغاء" : "+ إضافة مريض"}
          </button>
        )}
      </div>

      {showForm && canManagePatients && (
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
                  placeholder="01xxxxxxxxx"
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
            placeholder="ابحث باسم المريض أو رقم الجوال أو رقم الملف..."
          />
        </div>

        <div className="patients-count">
          {loading
            ? "جاري التحميل..."
            : `${totalCount} مريض`}
        </div>

        {loading ? (
          <div className="empty">
            جاري تحميل المرضى...
          </div>
        ) : patients.length === 0 ? (
          <div className="empty">
            {debouncedSearch
              ? "لا توجد نتائج للبحث"
              : "لا توجد بيانات مرضى"}
          </div>
        ) : (
          <>
            <div className="patients">
              {patients.map((patient) => (
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

                    {patient.file_number && (
                      <span className="patient-file-number">
                        {patient.file_number}
                      </span>
                    )}
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

            <div className="pagination-controls">
              <button
                className="secondary"
                onClick={() =>
                  setPage((p) => Math.max(0, p - 1))
                }
                disabled={page === 0}
              >
                ‹ السابق
              </button>

              <span className="pagination-info">
                صفحة {page + 1} من {totalPages}
              </span>

              <button
                className="secondary"
                onClick={() =>
                  setPage((p) =>
                    Math.min(totalPages - 1, p + 1)
                  )
                }
                disabled={page + 1 >= totalPages}
              >
                التالي ›
              </button>
            </div>
          </>
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

    const { data: conflictingAppointments, error: conflictError } =
      await supabase
        .from("Appointments")
        .select("id, status")
        .eq("doctor_id", doctorId)
        .eq("appointment_date", appointmentDate)
        .eq("appointment_time", appointmentTime)
        .eq("is_deleted", false)
        .neq("status", "Cancelled");

    if (conflictError) {
      console.error(
        "APPOINTMENT CONFLICT CHECK ERROR:",
        conflictError
      );

      setError(
        "حدث خطأ أثناء التحقق من تعارض المواعيد"
      );

      setSaving(false);
      return;
    }

    const hasConflict = (
      conflictingAppointments || []
    ).some(
      (item) =>
        !isEditing || item.id !== appointment.id
    );

    if (hasConflict) {
      setError(
        "هذا الطبيب لديه موعد آخر بنفس التاريخ والوقت. من فضلك اختر وقتًا مختلفًا."
      );

      setSaving(false);
      return;
    }

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

              <option value="Attended">
                حضر
              </option>

              <option value="NoShow">
                لم يحضر
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

function AppointmentsPage({
  onOpenPatient,
  onConvertToVisit,
  profile,
}) {
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

  const [viewMode, setViewMode] = useState("list");
  const [calendarDate, setCalendarDate] = useState(
    new Date()
  );
  const [selectedDay, setSelectedDay] = useState(
    new Date()
  );

  const [reminderDate, setReminderDate] = useState(
    () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      return toDateKey(tomorrow);
    }
  );

  const [clinicName, setClinicName] = useState(
    "عيادة النساء والولادة"
  );

  useEffect(() => {
    supabase
      .from("ClinicSettings")
      .select("clinic_name")
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.clinic_name) {
          setClinicName(data.clinic_name);
        }
      });
  }, []);

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
          .eq("is_deleted", false)
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
      "هل أنت متأكد من حذف هذا الموعد؟\n\nيمكن للمدير استعادته لاحقًا من سجل المحذوفات."
    );

    if (!confirmed) {
      return;
    }

    const userId = await getCurrentUserId();

    const { error } = await supabase
      .from("Appointments")
      .update({
        is_deleted: true,
        deleted_at: new Date().toISOString(),
        deleted_by: userId,
      })
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

  const canManageAppointments =
    profile?.role !== "doctor";

  const canConvertToVisit =
    profile?.role !== "receptionist";

  function toWhatsAppNumber(phone) {
    if (!phone) {
      return null;
    }

    const digits = phone.replace(/\D/g, "");

    if (digits.startsWith("0")) {
      return "20" + digits.substring(1);
    }

    if (digits.startsWith("20")) {
      return digits;
    }

    return digits;
  }

  function buildReminderMessage(
    patientName,
    dateLabel,
    timeLabel
  ) {
    return (
      `مرحبًا ${patientName} 🌸\n` +
      `نذكرك بموعدك في ${clinicName} يوم ${dateLabel} الساعة ${timeLabel}.\n` +
      `لو محتاجة تأجيل الموعد أو عندك أي استفسار، تقدري تتواصلي معانا.`
    );
  }

  function sendWhatsAppReminder(appointment) {
    const phone = getPatientPhone(
      appointment.patient_id
    );

    const waNumber = toWhatsAppNumber(phone);

    if (!waNumber) {
      alert(
        "لا يوجد رقم جوال مسجّل لهذه المريضة"
      );
      return;
    }

    const patientName = getPatientName(
      appointment.patient_id
    );

    const dateLabel = formatDateArabic(
      appointment.appointment_date
    );

    const timeLabel = formatTime(
      appointment.appointment_time
    );

    const message = buildReminderMessage(
      patientName,
      dateLabel,
      timeLabel
    );

    const link = `https://wa.me/${waNumber}?text=${encodeURIComponent(
      message
    )}`;

    window.open(link, "_blank");
  }

  const reminderAppointments = appointments
    .filter(
      (appointment) =>
        appointment.appointment_date ===
          reminderDate &&
        appointment.status !== "Cancelled"
    )
    .sort((a, b) =>
      (a.appointment_time || "").localeCompare(
        b.appointment_time || ""
      )
    );

  function changeMonth(delta) {
    setCalendarDate((current) => {
      const next = new Date(current);
      next.setDate(1);
      next.setMonth(next.getMonth() + delta);
      return next;
    });
  }

  function changeWeek(delta) {
    setCalendarDate((current) => {
      const next = new Date(current);
      next.setDate(next.getDate() + delta * 7);
      return next;
    });
  }

  function goToToday() {
    const today = new Date();
    setCalendarDate(today);
    setSelectedDay(today);
  }

  const searchText = search.trim().toLowerCase();

  const calendarAppointments = appointments.filter(
    (appointment) => {
      if (!searchText) {
        return true;
      }

      const patientName = getPatientName(
        appointment.patient_id
      ).toLowerCase();

      const patientPhone = getPatientPhone(
        appointment.patient_id
      ).toLowerCase();

      const doctorName = getDoctorName(
        appointment.doctor_id
      ).toLowerCase();

      return (
        patientName.includes(searchText) ||
        patientPhone.includes(searchText) ||
        doctorName.includes(searchText)
      );
    }
  );

  const appointmentsByDate = {};

  calendarAppointments.forEach((appointment) => {
    const key = appointment.appointment_date;

    if (!appointmentsByDate[key]) {
      appointmentsByDate[key] = [];
    }

    appointmentsByDate[key].push(appointment);
  });

  Object.keys(appointmentsByDate).forEach((key) => {
    appointmentsByDate[key].sort((a, b) =>
      (a.appointment_time || "").localeCompare(
        b.appointment_time || ""
      )
    );
  });

  const monthMatrix = getMonthMatrix(calendarDate);
  const weekDays = getWeekDays(calendarDate);

  const monthLabel = calendarDate.toLocaleDateString(
    "ar-SA",
    { year: "numeric", month: "long" }
  );

  return (
    <main className="content appointments-page">
      <div className="page-header">
        <div>
          <h1>📅 المواعيد</h1>

          <p>
            إدارة مواعيد العيادة وتنظيم زيارات المريضات
          </p>
        </div>

        {!showForm && canManageAppointments && (
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

      {showForm && canManageAppointments && (
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

        <div className="appointments-tabs">
          <button
            className={
              viewMode === "list"
                ? "appointment-tab active"
                : "appointment-tab"
            }
            onClick={() => setViewMode("list")}
          >
            <span>📋 قائمة</span>
          </button>

          <button
            className={
              viewMode === "month"
                ? "appointment-tab active"
                : "appointment-tab"
            }
            onClick={() => {
              setViewMode("month");
              setCalendarDate(new Date());
            }}
          >
            <span>📅 شهري</span>
          </button>

          <button
            className={
              viewMode === "week"
                ? "appointment-tab active"
                : "appointment-tab"
            }
            onClick={() => {
              setViewMode("week");
              setCalendarDate(new Date());
            }}
          >
            <span>📆 أسبوعي</span>
          </button>

          {canManageAppointments && (
            <button
              className={
                viewMode === "reminders"
                  ? "appointment-tab active"
                  : "appointment-tab"
              }
              onClick={() =>
                setViewMode("reminders")
              }
            >
              <span>📱 تذكير واتساب</span>
            </button>
          )}
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

      {viewMode === "list" && (
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

                    {canConvertToVisit &&
                      appointment.status !==
                        "Cancelled" && (
                        <button
                          className="print-button"
                          onClick={() =>
                            onConvertToVisit(
                              appointment
                            )
                          }
                        >
                          🩺 تحويل لزيارة
                        </button>
                      )}

                    {canManageAppointments && (
                      <button
                        className="edit-button"
                        onClick={() =>
                          startEdit(appointment)
                        }
                      >
                        ✏️ تعديل
                      </button>
                    )}

                    {canManageAppointments && (
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
                    )}
                  </div>
                </div>
              )
            )}
          </div>
        )}
      </section>
      )}

      {viewMode === "month" && (
        <section className="panel calendar-panel">
          <div className="calendar-nav">
            <button
              className="secondary"
              onClick={() => changeMonth(-1)}
            >
              ‹ السابق
            </button>

            <strong>{monthLabel}</strong>

            <button
              className="secondary"
              onClick={() => changeMonth(1)}
            >
              التالي ›
            </button>

            <button
              className="secondary"
              onClick={goToToday}
            >
              اليوم
            </button>
          </div>

          <div className="calendar-grid-header">
            {WEEKDAY_LABELS.map((label) => (
              <div key={label}>{label}</div>
            ))}
          </div>

          <div className="calendar-grid">
            {monthMatrix.flat().map((day) => {
              const key = toDateKey(day);
              const dayAppointments =
                appointmentsByDate[key] || [];

              const isCurrentMonth =
                day.getMonth() ===
                calendarDate.getMonth();

              return (
                <div
                  key={key}
                  className={
                    "calendar-cell" +
                    (isCurrentMonth
                      ? ""
                      : " calendar-cell-muted") +
                    (isSameDay(day, selectedDay)
                      ? " calendar-cell-selected"
                      : "") +
                    (isSameDay(day, new Date())
                      ? " calendar-cell-today"
                      : "")
                  }
                  onClick={() => setSelectedDay(day)}
                >
                  <span className="calendar-cell-date">
                    {day.getDate()}
                  </span>

                  <div className="calendar-cell-chips">
                    {dayAppointments
                      .slice(0, 3)
                      .map((appointment) => (
                        <div
                          key={appointment.id}
                          className={`calendar-chip status-${(
                            appointment.status ||
                            "Pending"
                          ).toLowerCase()}`}
                        >
                          {formatTime(
                            appointment.appointment_time
                          )}{" "}
                          {getPatientName(
                            appointment.patient_id
                          )}
                        </div>
                      ))}

                    {dayAppointments.length > 3 && (
                      <div className="calendar-chip-more">
                        +{dayAppointments.length - 3}{" "}
                        أكثر
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="calendar-day-details">
            <h3>
              مواعيد يوم{" "}
              {selectedDay.toLocaleDateString(
                "ar-SA",
                {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                }
              )}
            </h3>

            {(
              appointmentsByDate[
                toDateKey(selectedDay)
              ] || []
            ).length === 0 ? (
              <div className="empty">
                لا توجد مواعيد في هذا اليوم
              </div>
            ) : (
              <div className="appointments-page-list">
                {(
                  appointmentsByDate[
                    toDateKey(selectedDay)
                  ] || []
                ).map((appointment) => (
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

                      {canConvertToVisit &&
                        appointment.status !==
                          "Cancelled" && (
                          <button
                            className="print-button"
                            onClick={() =>
                              onConvertToVisit(
                                appointment
                              )
                            }
                          >
                            🩺 تحويل لزيارة
                          </button>
                        )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {viewMode === "week" && (
        <section className="panel calendar-panel">
          <div className="calendar-nav">
            <button
              className="secondary"
              onClick={() => changeWeek(-1)}
            >
              ‹ الأسبوع السابق
            </button>

            <strong>
              {weekDays[0].toLocaleDateString(
                "ar-SA",
                { day: "numeric", month: "long" }
              )}{" "}
              —{" "}
              {weekDays[6].toLocaleDateString(
                "ar-SA",
                { day: "numeric", month: "long" }
              )}
            </strong>

            <button
              className="secondary"
              onClick={() => changeWeek(1)}
            >
              الأسبوع التالي ›
            </button>

            <button
              className="secondary"
              onClick={goToToday}
            >
              اليوم
            </button>
          </div>

          <div className="calendar-week-grid">
            {weekDays.map((day) => {
              const key = toDateKey(day);
              const dayAppointments =
                appointmentsByDate[key] || [];

              return (
                <div
                  className={
                    "calendar-week-day" +
                    (isSameDay(day, new Date())
                      ? " calendar-week-day-today"
                      : "")
                  }
                  key={key}
                >
                  <div className="calendar-week-day-header">
                    <span>
                      {WEEKDAY_LABELS[day.getDay()]}
                    </span>
                    <strong>{day.getDate()}</strong>
                  </div>

                  <div className="calendar-week-day-list">
                    {dayAppointments.length === 0 ? (
                      <p className="calendar-week-empty">
                        لا مواعيد
                      </p>
                    ) : (
                      dayAppointments.map(
                        (appointment) => (
                          <div
                            key={appointment.id}
                            className={`calendar-chip calendar-chip-block status-${(
                              appointment.status ||
                              "Pending"
                            ).toLowerCase()}`}
                            onClick={() =>
                              onOpenPatient(
                                appointment.patient_id
                              )
                            }
                          >
                            <strong>
                              {formatTime(
                                appointment.appointment_time
                              )}
                            </strong>

                            <span>
                              {getPatientName(
                                appointment.patient_id
                              )}
                            </span>
                          </div>
                        )
                      )
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {viewMode === "reminders" && (
        <section className="panel">
          <div className="panel-title">
            <div>
              <h2>📱 تذكير المواعيد عبر واتساب</h2>

              <p>
                رسالة تذكير جاهزة لكل مريضة — تُفتح في
                واتساب وترسلها بنفسك بضغطة واحدة (مجانًا
                تمامًا، بدون أي اشتراك)
              </p>
            </div>
          </div>

          <div className="form-field">
            <label>اختر اليوم</label>

            <input
              type="date"
              value={reminderDate}
              onChange={(e) =>
                setReminderDate(e.target.value)
              }
            />
          </div>

          <div
            className="patients-count"
            style={{ marginTop: "10px" }}
          >
            {reminderAppointments.length} موعد في هذا
            اليوم
          </div>

          {reminderAppointments.length === 0 ? (
            <div className="empty">
              لا توجد مواعيد في هذا اليوم
            </div>
          ) : (
            <div className="appointments-page-list">
              {reminderAppointments.map(
                (appointment) => {
                  const phone = getPatientPhone(
                    appointment.patient_id
                  );

                  return (
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

                          <span>
                            {phone ||
                              "لا يوجد رقم جوال"}
                          </span>
                        </div>
                      </div>

                      <div className="appointment-page-doctor">
                        <small>الطبيبة</small>

                        <strong>
                          {getDoctorName(
                            appointment.doctor_id
                          )}
                        </strong>
                      </div>

                      <div className="appointment-page-actions">
                        <button
                          className="print-button"
                          disabled={!phone}
                          onClick={() =>
                            sendWhatsAppReminder(
                              appointment
                            )
                          }
                        >
                          📱 إرسال تذكير واتساب
                        </button>
                      </div>
                    </div>
                  );
                }
              )}
            </div>
          )}
        </section>
      )}
    </main>
  );
}

/* =========================
   VISITS PAGE (ALL PATIENTS)
========================= */

function VisitsPage({ onOpenPatient, profile }) {
  const [visits, setVisits] = useState([]);
  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors] = useState([]);

  const [visitComplaintsMap, setVisitComplaintsMap] =
    useState({});

  const [visitDiagnosesMap, setVisitDiagnosesMap] =
    useState({});

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    loadVisitsData();
  }, []);

  async function loadVisitsData() {
    setLoading(true);
    setError("");

    try {
      const [
        visitsResult,
        patientsResult,
        doctorsResult,
      ] = await Promise.all([
        supabase
          .from("Visits")
          .select("*")
          .eq("is_deleted", false)
          .order("visit_date", {
            ascending: false,
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

      if (visitsResult.error) {
        throw visitsResult.error;
      }

      if (patientsResult.error) {
        throw patientsResult.error;
      }

      if (doctorsResult.error) {
        throw doctorsResult.error;
      }

      const visitsData = visitsResult.data || [];
      const patientsData = patientsResult.data || [];
      const doctorsData = doctorsResult.data || [];

      const visitIds = visitsData.map(
        (visit) => visit.id
      );

      let complaintsMap = {};
      let diagnosesMap = {};

      if (visitIds.length > 0) {
        const [
          visitComplaintsResult,
          visitDiagnosesResult,
        ] = await Promise.all([
          supabase
            .from("VisitComplaints")
            .select(`
              visit_id,
              complaint_id,
              ChiefComplaints (
                id,
                complaint_ar,
                complaint_en
              )
            `)
            .in("visit_id", visitIds),

          supabase
            .from("VisitDiagnoses")
            .select(`
              visit_id,
              diagnosis_id,
              Diagnoses (
                id,
                diagnosis_ar,
                diagnosis_en
              )
            `)
            .in("visit_id", visitIds),
        ]);

        if (visitComplaintsResult.error) {
          console.error(
            "VISITS PAGE COMPLAINTS ERROR:",
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

        if (visitDiagnosesResult.error) {
          console.error(
            "VISITS PAGE DIAGNOSES ERROR:",
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

      setVisits(visitsData);
      setPatients(patientsData);
      setDoctors(doctorsData);
      setVisitComplaintsMap(complaintsMap);
      setVisitDiagnosesMap(diagnosesMap);
    } catch (err) {
      console.error("VISITS PAGE ERROR:", err);

      setError(
        err?.message ||
          "حدث خطأ أثناء تحميل الزيارات"
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

  function getPatientFileNumber(patientId) {
    const patient = patients.find(
      (item) => item.id === patientId
    );

    return patient?.file_number || "";
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

  async function deleteVisit(visitId) {
    const confirmed = window.confirm(
      "هل أنت متأكد من حذف هذه الزيارة؟\n\nيمكن للمدير استعادتها لاحقًا من سجل المحذوفات."
    );

    if (!confirmed) {
      return;
    }

    const userId = await getCurrentUserId();

    const { error } = await supabase
      .from("Visits")
      .update({
        is_deleted: true,
        deleted_at: new Date().toISOString(),
        deleted_by: userId,
      })
      .eq("id", visitId);

    if (error) {
      console.error(error);

      alert(
        "حدث خطأ أثناء حذف الزيارة:\n" +
          error.message
      );

      return;
    }

    await loadVisitsData();
  }

  const filteredVisits = visits.filter((visit) => {
    const text = search.trim().toLowerCase();

    if (!text) {
      return true;
    }

    const patientName = getPatientName(
      visit.patient_id
    ).toLowerCase();

    const patientPhone = getPatientPhone(
      visit.patient_id
    ).toLowerCase();

    const patientFileNumber = getPatientFileNumber(
      visit.patient_id
    ).toLowerCase();

    const doctorName = getDoctorName(
      visit.doctor_id
    ).toLowerCase();

    const complaint = (
      visit.chief_complaint || ""
    ).toLowerCase();

    const diagnosis = (
      visit.diagnosis || ""
    ).toLowerCase();

    return (
      patientName.includes(text) ||
      patientPhone.includes(text) ||
      patientFileNumber.includes(text) ||
      doctorName.includes(text) ||
      complaint.includes(text) ||
      diagnosis.includes(text)
    );
  });

  return (
    <main className="content">
      <div className="page-header">
        <div>
          <h1>🩺 الزيارات</h1>

          <p>
            كل الزيارات الطبية المسجلة لجميع المريضات
          </p>
        </div>
      </div>

      {error && (
        <section className="panel">
          <div className="error">{error}</div>
        </section>
      )}

      <section className="panel">
        <div className="search-box">
          <span>🔎</span>

          <input
            value={search}
            onChange={(e) =>
              setSearch(e.target.value)
            }
            placeholder="ابحث باسم المريضة أو رقم الجوال أو رقم الملف أو الطبيب أو الشكوى أو التشخيص..."
          />
        </div>

        <div className="patients-count">
          {loading
            ? "جاري التحميل..."
            : `${filteredVisits.length} زيارة`}
        </div>

        {loading ? (
          <div className="empty">
            جاري تحميل الزيارات...
          </div>
        ) : filteredVisits.length === 0 ? (
          <div className="empty">
            {search
              ? "لا توجد نتائج للبحث"
              : "لا توجد زيارات مسجلة"}
          </div>
        ) : (
          <div className="medical-list">
            {filteredVisits.map((visit) => {
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
                        {getPatientName(
                          visit.patient_id
                        )}
                      </strong>

                      {getPatientFileNumber(
                        visit.patient_id
                      ) && (
                        <span className="patient-file-number">
                          {getPatientFileNumber(
                            visit.patient_id
                          )}
                        </span>
                      )}

                      <span>
                        {formatDate(
                          visit.visit_date
                        )}{" "}
                        — الطبيب:{" "}
                        {getDoctorName(
                          visit.doctor_id
                        )}
                      </span>
                    </div>

                    <div className="visit-actions">
                      <button
                        className="view-button"
                        onClick={() =>
                          onOpenPatient(
                            visit.patient_id
                          )
                        }
                      >
                        فتح الملف
                      </button>

                      {(profile?.role === "admin" ||
                        (profile?.role === "doctor" &&
                          visit.doctor_id ===
                            profile?.doctor_id)) && (
                        <button
                          className="delete-button"
                          onClick={() =>
                            deleteVisit(visit.id)
                          }
                        >
                          🗑️ حذف
                        </button>
                      )}
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
                          <strong>أخرى:</strong>{" "}
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

                      <p>{visit.notes || "—"}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}

/* =========================
   AUDIT LOG PAGE (سجل النشاط)
========================= */

const AUDIT_TABLE_LABELS = {
  Patients: "المرضى",
  Visits: "الزيارات",
  Prescriptions: "الوصفات الطبية",
  Appointments: "المواعيد",
};

const AUDIT_ACTION_LABELS = {
  INSERT: "إضافة",
  UPDATE: "تعديل",
  DELETE: "حذف",
};

function getAuditRecordLabel(log) {
  const record = log.new_data || log.old_data;

  if (!record) {
    return "";
  }

  if (log.table_name === "Patients") {
    return record.name || "";
  }

  if (log.table_name === "Visits") {
    return record.chief_complaint || record.diagnosis || "";
  }

  if (log.table_name === "Prescriptions") {
    return "وصفة طبية";
  }

  if (log.table_name === "Appointments") {
    return record.notes || "";
  }

  return "";
}

function AuditLogPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [tableFilter, setTableFilter] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    loadAuditLogs();
  }, []);

  async function loadAuditLogs() {
    setLoading(true);
    setError("");

    const { data, error } = await supabase
      .from("AuditLogs")
      .select("*")
      .order("performed_at", {
        ascending: false,
      })
      .limit(300);

    if (error) {
      console.error("AUDIT LOG ERROR:", error);

      setError(
        error.message ||
          "حدث خطأ أثناء تحميل سجل النشاط"
      );
    } else {
      setLogs(data || []);
    }

    setLoading(false);
  }

  function formatDateTime(value) {
    if (!value) {
      return "—";
    }

    return new Date(value).toLocaleString("ar-SA", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  const filteredLogs = logs.filter((log) => {
    if (tableFilter && log.table_name !== tableFilter) {
      return false;
    }

    if (actionFilter && log.action !== actionFilter) {
      return false;
    }

    const text = search.trim().toLowerCase();

    if (!text) {
      return true;
    }

    const recordLabel = getAuditRecordLabel(
      log
    ).toLowerCase();

    return (
      recordLabel.includes(text) ||
      (log.record_id || "")
        .toLowerCase()
        .includes(text)
    );
  });

  return (
    <main className="content">
      <div className="page-header">
        <div>
          <h1>📜 سجل النشاط</h1>

          <p>
            تسجيل تلقائي لكل عملية إضافة أو تعديل أو حذف في النظام
          </p>
        </div>
      </div>

      {error && (
        <section className="panel">
          <div className="error">{error}</div>
        </section>
      )}

      <section className="panel">
        <div className="appointments-toolbar">
          <div className="appointments-tabs">
            <button
              className={
                tableFilter === ""
                  ? "appointment-tab active"
                  : "appointment-tab"
              }
              onClick={() => setTableFilter("")}
            >
              <span>الكل</span>
            </button>

            {Object.entries(AUDIT_TABLE_LABELS).map(
              ([key, label]) => (
                <button
                  key={key}
                  className={
                    tableFilter === key
                      ? "appointment-tab active"
                      : "appointment-tab"
                  }
                  onClick={() => setTableFilter(key)}
                >
                  <span>{label}</span>
                </button>
              )
            )}
          </div>

          <div className="search-box">
            <span>🔎</span>

            <input
              value={search}
              onChange={(e) =>
                setSearch(e.target.value)
              }
              placeholder="ابحث بالاسم أو رقم السجل..."
            />
          </div>
        </div>

        <div className="form-field" style={{ marginTop: "14px" }}>
          <label>نوع العملية</label>

          <select
            value={actionFilter}
            onChange={(e) =>
              setActionFilter(e.target.value)
            }
          >
            <option value="">كل العمليات</option>
            <option value="INSERT">إضافة</option>
            <option value="UPDATE">تعديل</option>
            <option value="DELETE">حذف</option>
          </select>
        </div>

        <div className="patients-count">
          {loading
            ? "جاري التحميل..."
            : `${filteredLogs.length} عملية`}
        </div>

        {loading ? (
          <div className="empty">
            جاري تحميل سجل النشاط...
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="empty">
            لا توجد عمليات مسجلة
          </div>
        ) : (
          <div className="appointments-page-list">
            {filteredLogs.map((log) => (
              <div
                className="appointment-page-card"
                key={log.id}
              >
                <div className="appointment-page-time">
                  <strong>
                    {formatDateTime(log.performed_at)}
                  </strong>
                </div>

                <div className="appointment-page-patient">
                  <div>
                    <strong>
                      {AUDIT_TABLE_LABELS[
                        log.table_name
                      ] || log.table_name}
                    </strong>

                    <span>
                      {getAuditRecordLabel(log) ||
                        "—"}
                    </span>
                  </div>
                </div>

                <div className="appointment-page-doctor">
                  <small>نوع العملية</small>

                  <span
                    className={`appointment-status status-${
                      log.action === "INSERT"
                        ? "confirmed"
                        : log.action === "DELETE"
                        ? "cancelled"
                        : "pending"
                    }`}
                  >
                    {AUDIT_ACTION_LABELS[
                      log.action
                    ] || log.action}
                  </span>
                </div>

                <div className="appointment-page-notes">
                  <small>بواسطة</small>

                  <span>
                    {log.performed_by
                      ? log.performed_by.substring(
                          0,
                          8
                        )
                      : "—"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

/* =========================
   CLINIC SETTINGS PAGE (إعدادات العيادة)
========================= */

function ClinicSettingsPage() {
  const [settingsId, setSettingsId] = useState(null);

  const [clinicName, setClinicName] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [workingHours, setWorkingHours] = useState("");
  const [closedDays, setClosedDays] = useState("");
  const [footerText, setFooterText] = useState("");

  const [uploadingLogo, setUploadingLogo] =
    useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [savedMessage, setSavedMessage] = useState("");

  const [doctors, setDoctors] = useState([]);
  const [doctorsLoading, setDoctorsLoading] =
    useState(true);

  const [showDoctorForm, setShowDoctorForm] =
    useState(false);

  const [editingDoctor, setEditingDoctor] =
    useState(null);

  const [doctorName, setDoctorName] = useState("");
  const [doctorPhone, setDoctorPhone] = useState("");
  const [doctorSaving, setDoctorSaving] =
    useState(false);
  const [doctorError, setDoctorError] = useState("");

  useEffect(() => {
    loadSettings();
    loadDoctors();
  }, []);

  async function loadSettings() {
    setLoading(true);
    setError("");

    const { data, error } = await supabase
      .from("ClinicSettings")
      .select("*")
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("CLINIC SETTINGS LOAD ERROR:", error);
      setError(error.message);
    } else if (data) {
      setSettingsId(data.id);
      setClinicName(data.clinic_name || "");
      setLogoUrl(data.logo_url || "");
      setAddress(data.address || "");
      setPhone(data.phone || "");
      setWorkingHours(data.working_hours || "");
      setClosedDays(data.closed_days || "");
      setFooterText(data.footer_text || "");
    }

    setLoading(false);
  }

  async function loadDoctors() {
    setDoctorsLoading(true);

    const { data, error } = await supabase
      .from("Doctors")
      .select("*")
      .order("name", { ascending: true });

    if (error) {
      console.error("DOCTORS LOAD ERROR:", error);
    } else {
      setDoctors(data || []);
    }

    setDoctorsLoading(false);
  }

  async function uploadLogo(e) {
    const file = e.target.files?.[0];

    if (!file) {
      return;
    }

    setUploadingLogo(true);
    setError("");

    const filePath = `logo_${Date.now()}_${file.name}`;

    const { error: uploadError } =
      await supabase.storage
        .from("clinic-assets")
        .upload(filePath, file, { upsert: true });

    if (uploadError) {
      console.error(uploadError);

      setError(
        "حدث خطأ أثناء رفع الشعار: " +
          uploadError.message
      );

      setUploadingLogo(false);
      e.target.value = "";
      return;
    }

    const { data: publicUrlData } = supabase.storage
      .from("clinic-assets")
      .getPublicUrl(filePath);

    setLogoUrl(publicUrlData.publicUrl);
    setUploadingLogo(false);
    e.target.value = "";
  }

  async function saveSettings(e) {
    e.preventDefault();

    setSaving(true);
    setError("");
    setSavedMessage("");

    const settingsData = {
      clinic_name: clinicName.trim(),
      logo_url: logoUrl.trim(),
      address: address.trim(),
      phone: phone.trim(),
      working_hours: workingHours.trim(),
      closed_days: closedDays.trim(),
      footer_text: footerText.trim(),
    };

    let result;

    if (settingsId) {
      result = await supabase
        .from("ClinicSettings")
        .update(settingsData)
        .eq("id", settingsId)
        .select()
        .single();
    } else {
      result = await supabase
        .from("ClinicSettings")
        .insert([settingsData])
        .select()
        .single();
    }

    if (result.error) {
      console.error(result.error);
      setError(result.error.message);
      setSaving(false);
      return;
    }

    setSettingsId(result.data.id);
    setSaving(false);
    setSavedMessage("تم حفظ الإعدادات بنجاح");

    setTimeout(() => setSavedMessage(""), 3000);
  }

  function resetDoctorForm() {
    setEditingDoctor(null);
    setDoctorName("");
    setDoctorPhone("");
    setDoctorError("");
  }

  function startAddDoctor() {
    resetDoctorForm();
    setShowDoctorForm(true);
  }

  function startEditDoctor(doctor) {
    setEditingDoctor(doctor);
    setDoctorName(doctor.name || "");
    setDoctorPhone(doctor.phone || "");
    setDoctorError("");
    setShowDoctorForm(true);
  }

  async function saveDoctor(e) {
    e.preventDefault();

    if (!doctorName.trim()) {
      setDoctorError("من فضلك أدخل اسم الطبيبة");
      return;
    }

    setDoctorSaving(true);
    setDoctorError("");

    const doctorData = {
      name: doctorName.trim(),
      phone: doctorPhone.trim(),
    };

    let result;

    if (editingDoctor) {
      result = await supabase
        .from("Doctors")
        .update(doctorData)
        .eq("id", editingDoctor.id);
    } else {
      result = await supabase
        .from("Doctors")
        .insert([{ ...doctorData, is_active: true }]);
    }

    if (result.error) {
      console.error(result.error);
      setDoctorError(result.error.message);
      setDoctorSaving(false);
      return;
    }

    setDoctorSaving(false);
    setShowDoctorForm(false);
    resetDoctorForm();
    await loadDoctors();
  }

  async function toggleDoctorActive(doctor) {
    const { error } = await supabase
      .from("Doctors")
      .update({ is_active: !doctor.is_active })
      .eq("id", doctor.id);

    if (error) {
      console.error(error);

      alert(
        "حدث خطأ أثناء تحديث حالة الطبيبة:\n" +
          error.message
      );

      return;
    }

    await loadDoctors();
  }

  if (loading) {
    return (
      <main className="content">
        <div className="panel">
          <div className="empty">
            جاري تحميل إعدادات العيادة...
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="content">
      <div className="page-header">
        <div>
          <h1>⚙️ إعدادات العيادة</h1>

          <p>
            تحكّم في بيانات العيادة والأطباء بدون الحاجة لتعديل الكود
          </p>
        </div>
      </div>

      <section className="panel">
        <div className="panel-title">
          <div>
            <h2>البيانات الأساسية</h2>
            <p>تظهر هذه البيانات في الواجهة وورقة الطباعة</p>
          </div>
        </div>

        <form
          className="patient-form"
          onSubmit={saveSettings}
        >
          <div className="form-grid">
            <div className="form-field full">
              <label>شعار العيادة</label>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "14px",
                  flexWrap: "wrap",
                }}
              >
                {logoUrl && (
                  <img
                    src={logoUrl}
                    alt="شعار العيادة"
                    style={{
                      width: "64px",
                      height: "64px",
                      objectFit: "contain",
                      border: "1px solid #eceef3",
                      borderRadius: "12px",
                      padding: "6px",
                    }}
                  />
                )}

                <label
                  className="secondary"
                  style={{ cursor: "pointer" }}
                >
                  {uploadingLogo
                    ? "جاري الرفع..."
                    : "رفع شعار جديد"}

                  <input
                    type="file"
                    accept="image/*"
                    onChange={uploadLogo}
                    disabled={uploadingLogo}
                    style={{ display: "none" }}
                  />
                </label>
              </div>
            </div>

            <div className="form-field">
              <label>اسم العيادة</label>

              <input
                value={clinicName}
                onChange={(e) =>
                  setClinicName(e.target.value)
                }
                placeholder="عيادة النساء والولادة"
              />
            </div>

            <div className="form-field">
              <label>رقم هاتف العيادة</label>

              <input
                value={phone}
                onChange={(e) =>
                  setPhone(e.target.value)
                }
                placeholder="01xxxxxxxxx"
              />
            </div>

            <div className="form-field full">
              <label>العنوان</label>

              <input
                value={address}
                onChange={(e) =>
                  setAddress(e.target.value)
                }
                placeholder="عنوان العيادة"
              />
            </div>

            <div className="form-field">
              <label>أوقات العمل</label>

              <input
                value={workingHours}
                onChange={(e) =>
                  setWorkingHours(e.target.value)
                }
                placeholder="مثال: يوميًا 10ص - 9م"
              />
            </div>

            <div className="form-field">
              <label>أيام الإجازة</label>

              <input
                value={closedDays}
                onChange={(e) =>
                  setClosedDays(e.target.value)
                }
                placeholder="مثال: الجمعة"
              />
            </div>

            <div className="form-field full">
              <label>نص تذييل ورقة الطباعة</label>

              <textarea
                value={footerText}
                onChange={(e) =>
                  setFooterText(e.target.value)
                }
                placeholder="مثال: هذا المستند طبي وسري ويخص المريضة المذكورة فقط."
                rows="2"
              />
            </div>
          </div>

          {error && (
            <div className="error form-error">
              {error}
            </div>
          )}

          {savedMessage && (
            <div
              style={{
                marginTop: "10px",
                padding: "10px 14px",
                borderRadius: "10px",
                background: "#e8f5e9",
                color: "#2e7d32",
                fontSize: "13px",
              }}
            >
              {savedMessage}
            </div>
          )}

          <div className="form-actions">
            <button
              type="submit"
              className="primary"
              disabled={saving}
            >
              {saving
                ? "جاري الحفظ..."
                : "حفظ الإعدادات"}
            </button>
          </div>
        </form>
      </section>

      <section className="panel">
        <div className="panel-title">
          <div>
            <h2>👩‍⚕️ إدارة الأطباء</h2>
            <p>إضافة أو تعديل بيانات الطبيبات في العيادة</p>
          </div>

          {!showDoctorForm && (
            <button
              className="primary"
              onClick={startAddDoctor}
            >
              + إضافة طبيبة
            </button>
          )}
        </div>

        {showDoctorForm && (
          <form
            className="patient-form"
            onSubmit={saveDoctor}
            style={{ marginBottom: "18px" }}
          >
            <div className="form-grid">
              <div className="form-field">
                <label>اسم الطبيبة *</label>

                <input
                  value={doctorName}
                  onChange={(e) =>
                    setDoctorName(e.target.value)
                  }
                  required
                />
              </div>

              <div className="form-field">
                <label>رقم الهاتف</label>

                <input
                  value={doctorPhone}
                  onChange={(e) =>
                    setDoctorPhone(e.target.value)
                  }
                  placeholder="01xxxxxxxxx"
                />
              </div>
            </div>

            {doctorError && (
              <div className="error form-error">
                {doctorError}
              </div>
            )}

            <div className="form-actions">
              <button
                type="button"
                className="secondary"
                onClick={() => {
                  setShowDoctorForm(false);
                  resetDoctorForm();
                }}
                disabled={doctorSaving}
              >
                إلغاء
              </button>

              <button
                type="submit"
                className="primary"
                disabled={doctorSaving}
              >
                {doctorSaving
                  ? "جاري الحفظ..."
                  : editingDoctor
                  ? "حفظ التعديلات"
                  : "إضافة الطبيبة"}
              </button>
            </div>
          </form>
        )}

        {doctorsLoading ? (
          <div className="empty">
            جاري تحميل الأطباء...
          </div>
        ) : doctors.length === 0 ? (
          <div className="empty">
            لا يوجد أطباء مسجلون
          </div>
        ) : (
          <div className="patients">
            {doctors.map((doctor) => (
              <div
                className="patient-row"
                key={doctor.id}
              >
                <div className="patient-avatar">
                  {doctor.name?.charAt(0) || "د"}
                </div>

                <div className="patient-info">
                  <strong>{doctor.name}</strong>

                  <span>
                    {doctor.phone || "لا يوجد هاتف"}
                    {doctor.is_active === false
                      ? " — غير نشطة"
                      : ""}
                  </span>
                </div>

                <div className="visit-actions">
                  <button
                    className="edit-button"
                    onClick={() =>
                      startEditDoctor(doctor)
                    }
                  >
                    ✏️ تعديل
                  </button>

                  <button
                    className="secondary"
                    onClick={() =>
                      toggleDoctorActive(doctor)
                    }
                  >
                    {doctor.is_active === false
                      ? "تفعيل"
                      : "تعطيل"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

/* =========================
   REPORTS PAGE (التقارير)
========================= */

const REPORT_TYPES = [
  { id: "visits", label: "الزيارات خلال فترة" },
  {
    id: "appointments_by_doctor",
    label: "المواعيد حسب الطبيب",
  },
  { id: "new_patients", label: "المرضى الجدد" },
  {
    id: "cancelled_appointments",
    label: "المواعيد الملغاة",
  },
  { id: "top_diagnoses", label: "أكثر التشخيصات" },
];

const BACKUP_TABLES = [
  "Patients",
  "Visits",
  "Appointments",
  "Prescriptions",
  "PrescriptionItems",
  "Doctors",
  "Pregnancies",
  "Labs_Ultrasound",
];

function csvEscape(value) {
  const text = String(value ?? "");

  if (
    text.includes(",") ||
    text.includes('"') ||
    text.includes("\n")
  ) {
    return `"${text.replaceAll('"', '""')}"`;
  }

  return text;
}

function downloadCSV(filename, columns, rows) {
  const header = columns
    .map((col) => csvEscape(col.label))
    .join(",");

  const body = rows
    .map((row) =>
      columns
        .map((col) => csvEscape(row[col.key]))
        .join(",")
    )
    .join("\n");

  const csvContent = "\uFEFF" + header + "\n" + body;

  const blob = new Blob([csvContent], {
    type: "text/csv;charset=utf-8;",
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function downloadJSON(filename, data) {
  const blob = new Blob(
    [JSON.stringify(data, null, 2)],
    { type: "application/json" }
  );

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function printReport(title, columns, rows) {
  const safe = escapeHtml;

  const printWindow = window.open(
    "",
    "clinic-report-print",
    "width=1000,height=1000"
  );

  if (!printWindow) {
    alert(
      "تعذر فتح نافذة الطباعة. يرجى السماح بالنوافذ المنبثقة لهذا الموقع."
    );
    return;
  }

  const headerHtml = columns
    .map((col) => `<th>${safe(col.label)}</th>`)
    .join("");

  const rowsHtml = rows
    .map(
      (row) =>
        `<tr>${columns
          .map(
            (col) =>
              `<td>${safe(row[col.key] ?? "—")}</td>`
          )
          .join("")}</tr>`
    )
    .join("");

  printWindow.document.write(`
    <!DOCTYPE html>
    <html lang="ar" dir="rtl">
    <head>
      <meta charset="UTF-8" />
      <title>${safe(title)}</title>

      <style>
        * { box-sizing: border-box; }

        body {
          margin: 0;
          padding: 24px;
          background: #fff;
          color: #1f2937;
          font-family: "Segoe UI", Tahoma, Arial, sans-serif;
          direction: rtl;
        }

        h1 {
          font-size: 19px;
          color: #1f766e;
          border-bottom: 2px solid #1f766e;
          padding-bottom: 10px;
          margin-bottom: 4px;
        }

        .meta {
          color: #64748b;
          font-size: 11px;
          margin-bottom: 18px;
        }

        table {
          width: 100%;
          border-collapse: collapse;
          font-size: 12px;
        }

        th, td {
          border: 1px solid #dce5e8;
          padding: 7px 9px;
          text-align: right;
        }

        th {
          background: #f5f8fa;
          font-weight: 700;
        }

        tr:nth-child(even) {
          background: #fafbfc;
        }

        @media print {
          @page { size: A4 landscape; margin: 12mm; }
        }
      </style>
    </head>

    <body>
      <h1>${safe(title)}</h1>

      <div class="meta">
        تاريخ الطباعة: ${safe(
          new Date().toLocaleString("ar-SA")
        )} — عدد السجلات: ${rows.length}
      </div>

      <table>
        <thead><tr>${headerHtml}</tr></thead>
        <tbody>${rowsHtml}</tbody>
      </table>

      <script>
        window.addEventListener("load", function () {
          window.focus();
          setTimeout(function () { window.print(); }, 150);
        });

        window.addEventListener("afterprint", function () {
          window.close();
        });
      </script>
    </body>
    </html>
  `);

  printWindow.document.close();
}

function ReportsPage({ profile }) {
  const [reportType, setReportType] = useState(
    "visits"
  );

  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return toDateKey(d);
  });

  const [dateTo, setDateTo] = useState(
    getLocalDate()
  );

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [reportTitle, setReportTitle] = useState("");
  const [columns, setColumns] = useState([]);
  const [rows, setRows] = useState([]);
  const [hasGenerated, setHasGenerated] =
    useState(false);

  const [backingUp, setBackingUp] = useState(false);

  async function getLookupMaps() {
    const [patientsResult, doctorsResult] =
      await Promise.all([
        supabase.from("Patients").select("id, name"),
        supabase.from("Doctors").select("id, name"),
      ]);

    const patientMap = {};
    (patientsResult.data || []).forEach((p) => {
      patientMap[p.id] = p.name;
    });

    const doctorMap = {};
    (doctorsResult.data || []).forEach((d) => {
      doctorMap[d.id] = d.name;
    });

    return { patientMap, doctorMap };
  }

  async function generateReport() {
    setLoading(true);
    setError("");
    setHasGenerated(false);

    try {
      const { patientMap, doctorMap } =
        await getLookupMaps();

      if (reportType === "visits") {
        const { data, error: qError } = await supabase
          .from("Visits")
          .select("*")
          .gte(
            "visit_date",
            `${dateFrom}T00:00:00`
          )
          .lte("visit_date", `${dateTo}T23:59:59`)
          .eq("is_deleted", false)
          .order("visit_date", {
            ascending: false,
          });

        if (qError) throw qError;

        const reportRows = (data || []).map(
          (visit) => ({
            date: formatDateArabic(
              visit.visit_date?.substring(0, 10)
            ),
            patient:
              patientMap[visit.patient_id] || "—",
            doctor:
              doctorMap[visit.doctor_id] || "—",
            diagnosis: visit.diagnosis || "—",
            treatment: visit.treatment || "—",
          })
        );

        setColumns([
          { key: "date", label: "التاريخ" },
          { key: "patient", label: "المريضة" },
          { key: "doctor", label: "الطبيبة" },
          { key: "diagnosis", label: "التشخيص" },
          { key: "treatment", label: "العلاج" },
        ]);

        setRows(reportRows);
        setReportTitle("تقرير الزيارات خلال الفترة");
      } else if (
        reportType === "appointments_by_doctor"
      ) {
        const { data, error: qError } = await supabase
          .from("Appointments")
          .select("*")
          .gte("appointment_date", dateFrom)
          .lte("appointment_date", dateTo)
          .eq("is_deleted", false);

        if (qError) throw qError;

        const counts = {};

        (data || []).forEach((appointment) => {
          const doctorName =
            doctorMap[appointment.doctor_id] ||
            "غير محدد";

          if (!counts[doctorName]) {
            counts[doctorName] = {
              doctor: doctorName,
              total: 0,
              confirmed: 0,
              attended: 0,
              noshow: 0,
              cancelled: 0,
              completed: 0,
              pending: 0,
            };
          }

          counts[doctorName].total += 1;

          const statusKey = (
            appointment.status || "Pending"
          ).toLowerCase();

          if (counts[doctorName][statusKey] !== undefined) {
            counts[doctorName][statusKey] += 1;
          }
        });

        setColumns([
          { key: "doctor", label: "الطبيبة" },
          { key: "total", label: "الإجمالي" },
          { key: "confirmed", label: "مؤكد" },
          { key: "attended", label: "حضر" },
          { key: "noshow", label: "لم يحضر" },
          { key: "completed", label: "مكتمل" },
          { key: "cancelled", label: "ملغي" },
        ]);

        setRows(Object.values(counts));
        setReportTitle("تقرير المواعيد حسب الطبيبة");
      } else if (reportType === "new_patients") {
        const { data, error: qError } = await supabase
          .from("Patients")
          .select("*")
          .gte(
            "created_at",
            `${dateFrom}T00:00:00`
          )
          .lte("created_at", `${dateTo}T23:59:59`)
          .order("created_at", {
            ascending: false,
          });

        if (qError) throw qError;

        const reportRows = (data || []).map(
          (patient) => ({
            date: formatDateArabic(
              patient.created_at?.substring(0, 10)
            ),
            name: patient.name || "—",
            phone: patient.phone || "—",
            file_number: patient.file_number || "—",
          })
        );

        setColumns([
          { key: "date", label: "تاريخ التسجيل" },
          { key: "name", label: "الاسم" },
          { key: "phone", label: "رقم الجوال" },
          { key: "file_number", label: "رقم الملف" },
        ]);

        setRows(reportRows);
        setReportTitle("تقرير المرضى الجدد");
      } else if (
        reportType === "cancelled_appointments"
      ) {
        const { data, error: qError } = await supabase
          .from("Appointments")
          .select("*")
          .eq("status", "Cancelled")
          .gte("appointment_date", dateFrom)
          .lte("appointment_date", dateTo)
          .eq("is_deleted", false)
          .order("appointment_date", {
            ascending: false,
          });

        if (qError) throw qError;

        const reportRows = (data || []).map(
          (appointment) => ({
            date: formatDateArabic(
              appointment.appointment_date
            ),
            time: formatTime(
              appointment.appointment_time
            ),
            patient:
              patientMap[appointment.patient_id] ||
              "—",
            doctor:
              doctorMap[appointment.doctor_id] ||
              "—",
            notes: appointment.notes || "—",
          })
        );

        setColumns([
          { key: "date", label: "التاريخ" },
          { key: "time", label: "الوقت" },
          { key: "patient", label: "المريضة" },
          { key: "doctor", label: "الطبيبة" },
          { key: "notes", label: "ملاحظات" },
        ]);

        setRows(reportRows);
        setReportTitle("تقرير المواعيد الملغاة");
      } else if (reportType === "top_diagnoses") {
        const { data: visitsData, error: visitsError } =
          await supabase
            .from("Visits")
            .select("id")
            .gte(
              "visit_date",
              `${dateFrom}T00:00:00`
            )
            .lte(
              "visit_date",
              `${dateTo}T23:59:59`
            )
            .eq("is_deleted", false);

        if (visitsError) throw visitsError;

        const visitIds = (visitsData || []).map(
          (v) => v.id
        );

        if (visitIds.length === 0) {
          setColumns([
            { key: "diagnosis", label: "التشخيص" },
            { key: "count", label: "عدد مرات التكرار" },
          ]);
          setRows([]);
          setReportTitle("تقرير أكثر التشخيصات");
          setHasGenerated(true);
          setLoading(false);
          return;
        }

        const { data, error: qError } = await supabase
          .from("VisitDiagnoses")
          .select(
            `visit_id, Diagnoses ( diagnosis_ar )`
          )
          .in("visit_id", visitIds);

        if (qError) throw qError;

        const counts = {};

        (data || []).forEach((item) => {
          const name =
            item.Diagnoses?.diagnosis_ar;

          if (!name) return;

          counts[name] = (counts[name] || 0) + 1;
        });

        const reportRows = Object.entries(counts)
          .map(([diagnosis, count]) => ({
            diagnosis,
            count,
          }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 20);

        setColumns([
          { key: "diagnosis", label: "التشخيص" },
          { key: "count", label: "عدد مرات التكرار" },
        ]);

        setRows(reportRows);
        setReportTitle("تقرير أكثر التشخيصات شيوعًا");
      }

      setHasGenerated(true);
    } catch (err) {
      console.error("REPORT ERROR:", err);
      setError(
        err?.message || "حدث خطأ أثناء توليد التقرير"
      );
    } finally {
      setLoading(false);
    }
  }

  function exportCurrentCSV() {
    downloadCSV(
      `${reportTitle}.csv`,
      columns,
      rows
    );
  }

  function printCurrentReport() {
    printReport(reportTitle, columns, rows);
  }

  async function runFullBackup() {
    setBackingUp(true);

    for (let i = 0; i < BACKUP_TABLES.length; i++) {
      const table = BACKUP_TABLES[i];

      const { data, error } = await supabase
        .from(table)
        .select("*");

      if (error) {
        console.error(
          `BACKUP ERROR (${table}):`,
          error
        );
        continue;
      }

      downloadJSON(
        `backup_${table}_${getLocalDate()}.json`,
        data || []
      );

      // فاصل بسيط بين كل تنزيل والتالي حتى لا يحجبهم المتصفح
      await new Promise((resolve) =>
        setTimeout(resolve, 400)
      );
    }

    setBackingUp(false);
  }

  return (
    <main className="content">
      <div className="page-header">
        <div>
          <h1>📊 التقارير</h1>

          <p>تقارير قابلة للتصدير على فترة زمنية محددة</p>
        </div>
      </div>

      <section className="panel">
        <div className="form-grid">
          <div className="form-field full">
            <label>نوع التقرير</label>

            <select
              value={reportType}
              onChange={(e) =>
                setReportType(e.target.value)
              }
            >
              {REPORT_TYPES.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          <div className="form-field">
            <label>من تاريخ</label>

            <input
              type="date"
              value={dateFrom}
              onChange={(e) =>
                setDateFrom(e.target.value)
              }
            />
          </div>

          <div className="form-field">
            <label>إلى تاريخ</label>

            <input
              type="date"
              value={dateTo}
              onChange={(e) =>
                setDateTo(e.target.value)
              }
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
            className="primary"
            onClick={generateReport}
            disabled={loading}
          >
            {loading
              ? "جاري التوليد..."
              : "📊 توليد التقرير"}
          </button>
        </div>
      </section>

      {hasGenerated && (
        <section className="panel">
          <div className="panel-title">
            <div>
              <h2>{reportTitle}</h2>
              <p>{rows.length} سجل</p>
            </div>

            {rows.length > 0 && (
              <div
                style={{
                  display: "flex",
                  gap: "8px",
                }}
              >
                <button
                  className="secondary"
                  onClick={exportCurrentCSV}
                >
                  ⬇️ تصدير CSV / Excel
                </button>

                <button
                  className="secondary"
                  onClick={printCurrentReport}
                >
                  🖨️ طباعة / PDF
                </button>
              </div>
            )}
          </div>

          {rows.length === 0 ? (
            <div className="empty">
              لا توجد بيانات في هذه الفترة
            </div>
          ) : (
            <div
              style={{
                overflowX: "auto",
              }}
            >
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontSize: "13px",
                }}
              >
                <thead>
                  <tr>
                    {columns.map((col) => (
                      <th
                        key={col.key}
                        style={{
                          textAlign: "right",
                          padding: "9px 10px",
                          borderBottom:
                            "2px solid #eceef3",
                          color: "#656a78",
                          fontSize: "12px",
                        }}
                      >
                        {col.label}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {rows.map((row, index) => (
                    <tr key={index}>
                      {columns.map((col) => (
                        <td
                          key={col.key}
                          style={{
                            padding: "9px 10px",
                            borderBottom:
                              "1px solid #f1f2f5",
                          }}
                        >
                          {row[col.key] ?? "—"}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {profile?.role === "admin" && (
        <section className="panel">
          <div className="panel-title">
            <div>
              <h2>💾 نسخة احتياطية شاملة</h2>

              <p>
                تنزيل كل البيانات الأساسية كملفات JSON منفصلة
                على جهازك — احفظها بمكان بعيد عن Supabase
                (Google Drive مثلًا)
              </p>
            </div>
          </div>

          <div className="form-actions">
            <button
              className="primary"
              onClick={runFullBackup}
              disabled={backingUp}
            >
              {backingUp
                ? "جاري التنزيل..."
                : "💾 تنزيل نسخة احتياطية كاملة"}
            </button>
          </div>
        </section>
      )}
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
  profile,
  prefill,
}) {
  const isEditing = Boolean(visit);
  const isLockedToDoctor =
    profile?.role === "doctor" && !!profile?.doctor_id;

  const [doctorId, setDoctorId] = useState(
    visit?.doctor_id ||
      (isLockedToDoctor
        ? profile.doctor_id
        : prefill?.doctorId || "")
  );

  const [visitDate, setVisitDate] = useState(
    visit?.visit_date
      ? visit.visit_date.substring(0, 10)
      : prefill?.visitDate || ""
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

    const oneWeekAhead = new Date();
    oneWeekAhead.setDate(oneWeekAhead.getDate() + 7);

    const selectedVisitDate = new Date(
      `${visitDate}T12:00:00`
    );

    if (selectedVisitDate > oneWeekAhead) {
      setError(
        "تاريخ الزيارة غير منطقي (بعيد جدًا في المستقبل)"
      );
      return;
    }

    setSaving(true);
    setError("");

    const visitData = {
      patient_id: patientId,
      doctor_id: doctorId,
      appointment_id:
        visit?.appointment_id ||
        prefill?.appointmentId ||
        null,
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

  /*
    Mobile visibility styles.
    هذه الأنماط داخل React نفسه حتى لا نعتمد
    على CSS الخارجي فقط في Android/PWA.
  */

  const mobileFieldStyle = {
    width: "100%",
    boxSizing: "border-box",
    color: "#111827",
    WebkitTextFillColor: "#111827",
    backgroundColor: "#ffffff",
    opacity: 1,
    visibility: "visible",
    fontSize: "16px",
    fontWeight: 500,
    caretColor: "#111827",
    textShadow: "none",
  };

  const mobileSelectStyle = {
    ...mobileFieldStyle,
    minHeight: "48px",
    padding: "12px 14px",
    appearance: "auto",
    WebkitAppearance: "auto",
  };

  const mobileDateStyle = {
    ...mobileFieldStyle,
    minHeight: "48px",
    padding: "11px 12px",
    colorScheme: "light",
    appearance: "auto",
    WebkitAppearance: "auto",
  };

  const mobileTextareaStyle = {
    ...mobileFieldStyle,
    minHeight: "105px",
    padding: "12px 14px",
    lineHeight: 1.7,
    resize: "vertical",
  };

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
              : prefill
              ? "تم تعبئة الطبيب والتاريخ تلقائيًا من الموعد"
              : "أدخل تفاصيل الزيارة الطبية"}
          </p>
        </div>
      </div>

      <form
        className="visit-form"
        onSubmit={saveVisit}
      >
        <div className="form-grid">

          {/* الطبيب */}
          <div className="form-field">
            <label>الطبيب *</label>

            <select
              value={doctorId}
              onChange={(e) =>
                setDoctorId(e.target.value)
              }
              required
              disabled={isLockedToDoctor}
              style={mobileSelectStyle}
            >
              <option value="">
                اختر الطبيب
              </option>

              {doctors.map((doctor) => (
                <option
                  key={doctor.id}
                  value={doctor.id}
                >
                  {doctor.name}
                </option>
              ))}
            </select>

            {isLockedToDoctor && (
              <small className="field-warning">
                هذه الزيارة تُسجَّل باسمك تلقائيًا
              </small>
            )}

            {doctors.length === 0 && (
              <small className="field-warning">
                لا يوجد أطباء في جدول Doctors
              </small>
            )}
          </div>

          {/* تاريخ الزيارة */}
          <div className="form-field">
            <label>تاريخ الزيارة *</label>

            <input
              type="date"
              value={visitDate}
              onChange={(e) =>
                setVisitDate(e.target.value)
              }
              required
              style={mobileDateStyle}
            />
          </div>

          {/* الشكاوى */}
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
                                    {selected
                                      ? "✓"
                                      : ""}
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

            {/* شكوى أخرى */}
            <div className="other-complaint">
              <label>
                أخرى | Other
              </label>

              <textarea
                value={otherComplaint}
                onChange={(e) =>
                  setOtherComplaint(
                    e.target.value
                  )
                }
                placeholder="اكتب أي شكوى أو عرض غير موجود في القائمة..."
                rows="3"
                style={mobileTextareaStyle}
              />
            </div>
          </div>

          {/* التشخيص */}
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
                                  key={
                                    diagnosisItem.id
                                  }
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
                                    {selected
                                      ? "✓"
                                      : ""}
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

            {/* تشخيص آخر */}
            <div className="other-complaint">
              <label>
                تشخيص آخر | Other Diagnosis
              </label>

              <textarea
                value={otherDiagnosis}
                onChange={(e) =>
                  setOtherDiagnosis(
                    e.target.value
                  )
                }
                placeholder="اكتب أي تشخيص غير موجود في القائمة..."
                rows="3"
                style={mobileTextareaStyle}
              />
            </div>
          </div>

          {/* العلاج */}
          <div className="form-field full">
            <label>العلاج</label>

            <textarea
              value={treatment}
              onChange={(e) =>
                setTreatment(e.target.value)
              }
              placeholder="اكتب العلاج..."
              rows="3"
              style={mobileTextareaStyle}
            />
          </div>

          {/* الملاحظات */}
          <div className="form-field full">
            <label>ملاحظات</label>

            <textarea
              value={notes}
              onChange={(e) =>
                setNotes(e.target.value)
              }
              placeholder="ملاحظات إضافية..."
              rows="3"
              style={mobileTextareaStyle}
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
              doctors.length === 0
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
  profile,
}) {
  const isEditing = Boolean(prescription);
  const isLockedToDoctor =
    profile?.role === "doctor" && !!profile?.doctor_id;

  const [doctorId, setDoctorId] = useState(
    prescription?.doctor_id ||
      (isLockedToDoctor ? profile.doctor_id : "")
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

  const prescriptionFieldStyle = {
    width: "100%",
    boxSizing: "border-box",
    color: "#111827",
    WebkitTextFillColor: "#111827",
    backgroundColor: "#ffffff",
    opacity: 1,
    visibility: "visible",
    fontSize: "16px",
    fontWeight: 500,
    caretColor: "#111827",
  };

  const prescriptionSelectStyle = {
    ...prescriptionFieldStyle,
    minHeight: "48px",
    padding: "12px 14px",
    colorScheme: "light",
  };

  const prescriptionDateStyle = {
    ...prescriptionFieldStyle,
    minHeight: "48px",
    padding: "11px 12px",
    colorScheme: "light",
  };

  const prescriptionTextareaStyle = {
    ...prescriptionFieldStyle,
    minHeight: "90px",
    padding: "12px 14px",
    lineHeight: 1.7,
  };

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

          {/* الطبيب */}
          <div className="form-field">
            <label>الطبيب *</label>

            <select
              value={doctorId}
              onChange={(e) =>
                setDoctorId(e.target.value)
              }
              required
              disabled={isLockedToDoctor}
              style={prescriptionSelectStyle}
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

            {isLockedToDoctor && (
              <small className="field-warning">
                هذه الوصفة تُسجَّل باسمك تلقائيًا
              </small>
            )}
          </div>

          {/* تاريخ الوصفة */}
          <div className="form-field">
            <label>تاريخ الوصفة *</label>

            <input
              type="date"
              value={prescriptionDate}
              onChange={(e) =>
                setPrescriptionDate(e.target.value)
              }
              required
              style={prescriptionDateStyle}
            />
          </div>

          {/* ربط الوصفة بزيارة */}
          <div className="form-field full">
            <label>ربط الوصفة بزيارة</label>

            <select
              value={visitId}
              onChange={(e) =>
                setVisitId(e.target.value)
              }
              style={prescriptionSelectStyle}
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

          {/* الأدوية */}
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

                    {/* اسم الدواء */}
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
                        style={prescriptionFieldStyle}
                      />
                    </div>

                    {/* الجرعة */}
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
                        style={prescriptionFieldStyle}
                      />
                    </div>

                    {/* عدد مرات الاستخدام */}
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
                        style={prescriptionFieldStyle}
                      />
                    </div>

                    {/* مدة العلاج */}
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
                        style={prescriptionFieldStyle}
                      />
                    </div>

                    {/* ملاحظات الدواء */}
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
                        style={prescriptionTextareaStyle}
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

          {/* ملاحظات الوصفة */}
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
              style={prescriptionTextareaStyle}
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
   PREGNANCY FORM
   ADD + EDIT
========================= */

function PregnancyForm({
  patientId,
  doctors,
  pregnancy,
  onSaved,
  onCancel,
  profile,
}) {
  const isEditing = Boolean(pregnancy);
  const isLockedToDoctor =
    profile?.role === "doctor" && !!profile?.doctor_id;

  const [doctorId, setDoctorId] = useState(
    pregnancy?.doctor_id ||
      (isLockedToDoctor ? profile.doctor_id : "")
  );

  const [lmpDate, setLmpDate] = useState(
    pregnancy?.lmp_date || ""
  );

  const [gravida, setGravida] = useState(
    pregnancy?.gravida ?? ""
  );

  const [para, setPara] = useState(
    pregnancy?.para ?? ""
  );

  const [status, setStatus] = useState(
    pregnancy?.status || "ongoing"
  );

  const [notes, setNotes] = useState(
    pregnancy?.notes || ""
  );

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function savePregnancy(e) {
    e.preventDefault();

    if (!doctorId) {
      setError("من فضلك اختر الطبيبة");
      return;
    }

    if (!lmpDate) {
      setError("من فضلك أدخل تاريخ آخر دورة شهرية");
      return;
    }

    setSaving(true);
    setError("");

    const pregnancyData = {
      patient_id: patientId,
      doctor_id: doctorId,
      lmp_date: lmpDate,
      gravida: gravida ? Number(gravida) : null,
      para: para ? Number(para) : null,
      status,
      notes: notes.trim(),
    };

    let result;

    if (isEditing) {
      result = await supabase
        .from("Pregnancies")
        .update(pregnancyData)
        .eq("id", pregnancy.id)
        .select()
        .single();
    } else {
      result = await supabase
        .from("Pregnancies")
        .insert([pregnancyData])
        .select()
        .single();
    }

    if (result.error) {
      console.error(result.error);
      setError(result.error.message);
      setSaving(false);
      return;
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
              ? "✏️ تعديل متابعة الحمل"
              : "🤰 إضافة متابعة حمل جديدة"}
          </h2>

          <p>
            بيانات الحمل الأساسية — يُحسب موعد الولادة المتوقع تلقائيًا
          </p>
        </div>
      </div>

      <form
        className="visit-form"
        onSubmit={savePregnancy}
      >
        <div className="form-grid">
          <div className="form-field">
            <label>الطبيبة *</label>

            <select
              value={doctorId}
              onChange={(e) =>
                setDoctorId(e.target.value)
              }
              required
              disabled={isLockedToDoctor}
            >
              <option value="">اختر الطبيبة</option>

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
            <label>تاريخ آخر دورة شهرية *</label>

            <input
              type="date"
              value={lmpDate}
              onChange={(e) =>
                setLmpDate(e.target.value)
              }
              required
            />
          </div>

          <div className="form-field">
            <label>عدد مرات الحمل (Gravida)</label>

            <input
              type="number"
              min="0"
              value={gravida}
              onChange={(e) =>
                setGravida(e.target.value)
              }
              placeholder="مثال: 2"
            />
          </div>

          <div className="form-field">
            <label>عدد الولادات (Para)</label>

            <input
              type="number"
              min="0"
              value={para}
              onChange={(e) =>
                setPara(e.target.value)
              }
              placeholder="مثال: 1"
            />
          </div>

          <div className="form-field">
            <label>حالة الحمل</label>

            <select
              value={status}
              onChange={(e) =>
                setStatus(e.target.value)
              }
            >
              <option value="ongoing">
                جارية
              </option>

              <option value="completed">
                انتهت بالولادة
              </option>

              <option value="miscarriage">
                إجهاض
              </option>
            </select>
          </div>

          <div className="form-field full">
            <label>ملاحظات</label>

            <textarea
              value={notes}
              onChange={(e) =>
                setNotes(e.target.value)
              }
              placeholder="ملاحظات إضافية عن الحمل..."
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
            disabled={saving}
          >
            {saving
              ? "جاري الحفظ..."
              : isEditing
              ? "حفظ التعديلات"
              : "حفظ متابعة الحمل"}
          </button>
        </div>
      </form>
    </section>
  );
}

/* =========================
   LAB / ULTRASOUND FORM
   ADD + EDIT
========================= */

function LabTestForm({
  patientId,
  doctors,
  visits,
  lab,
  onSaved,
  onCancel,
  profile,
}) {
  const isEditing = Boolean(lab);
  const isLockedToDoctor =
    profile?.role === "doctor" && !!profile?.doctor_id;

  const [doctorId, setDoctorId] = useState(
    lab?.doctor_id ||
      (isLockedToDoctor ? profile.doctor_id : "")
  );

  const [visitId, setVisitId] = useState(
    lab?.visit_id || ""
  );

  const [testType, setTestType] = useState(
    lab?.test_type || "lab"
  );

  const [testName, setTestName] = useState(
    lab?.test_name || ""
  );

  const [result, setResult] = useState(
    lab?.result || ""
  );

  const [testDate, setTestDate] = useState(
    lab?.test_date || getLocalDate()
  );

  const [notes, setNotes] = useState(
    lab?.notes || ""
  );

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function saveLab(e) {
    e.preventDefault();

    if (!doctorId) {
      setError("من فضلك اختر الطبيبة");
      return;
    }

    if (!testName.trim()) {
      setError("من فضلك أدخل اسم التحليل أو الفحص");
      return;
    }

    if (!testDate) {
      setError("من فضلك اختر تاريخ التحليل");
      return;
    }

    setSaving(true);
    setError("");

    const labData = {
      patient_id: patientId,
      doctor_id: doctorId,
      visit_id: visitId || null,
      test_type: testType,
      test_name: testName.trim(),
      result: result.trim(),
      test_date: testDate,
      notes: notes.trim(),
    };

    let saveResult;

    if (isEditing) {
      saveResult = await supabase
        .from("Labs_Ultrasound")
        .update(labData)
        .eq("id", lab.id)
        .select()
        .single();
    } else {
      saveResult = await supabase
        .from("Labs_Ultrasound")
        .insert([labData])
        .select()
        .single();
    }

    if (saveResult.error) {
      console.error(saveResult.error);
      setError(saveResult.error.message);
      setSaving(false);
      return;
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
              ? "✏️ تعديل تحليل/فحص"
              : "🧪 إضافة تحليل أو سونار"}
          </h2>

          <p>نتائج التحاليل المخبرية والموجات الصوتية</p>
        </div>
      </div>

      <form className="visit-form" onSubmit={saveLab}>
        <div className="form-grid">
          <div className="form-field">
            <label>النوع *</label>

            <select
              value={testType}
              onChange={(e) =>
                setTestType(e.target.value)
              }
            >
              <option value="lab">تحليل مخبري</option>
              <option value="ultrasound">سونار</option>
            </select>
          </div>

          <div className="form-field">
            <label>الطبيبة *</label>

            <select
              value={doctorId}
              onChange={(e) =>
                setDoctorId(e.target.value)
              }
              required
              disabled={isLockedToDoctor}
            >
              <option value="">اختر الطبيبة</option>

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

          <div className="form-field full">
            <label>اسم التحليل / الفحص *</label>

            <input
              value={testName}
              onChange={(e) =>
                setTestName(e.target.value)
              }
              placeholder="مثال: صورة دم كاملة، سونار الحمل الأسبوعي..."
              required
            />
          </div>

          <div className="form-field">
            <label>تاريخ التحليل *</label>

            <input
              type="date"
              value={testDate}
              onChange={(e) =>
                setTestDate(e.target.value)
              }
              required
            />
          </div>

          <div className="form-field">
            <label>ربط بزيارة (اختياري)</label>

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
                </option>
              ))}
            </select>
          </div>

          <div className="form-field full">
            <label>النتيجة</label>

            <textarea
              value={result}
              onChange={(e) =>
                setResult(e.target.value)
              }
              placeholder="اكتب نتيجة التحليل أو ملخص السونار..."
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
              rows="2"
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
            disabled={saving}
          >
            {saving
              ? "جاري الحفظ..."
              : isEditing
              ? "حفظ التعديلات"
              : "حفظ التحليل"}
          </button>
        </div>
      </form>
    </section>
  );
}

/* =========================
   PATIENT FILE
========================= */

function PatientFile({
  patientId,
  onBack,
  profile,
  pendingAppointment,
  onConsumePendingAppointment,
}) {
  const [patient, setPatient] = useState(null);
  const [visits, setVisits] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [prescriptions, setPrescriptions] =
    useState([]);
  const [doctors, setDoctors] = useState([]);
  const [pregnancies, setPregnancies] = useState([]);

  const [showPregnancyForm, setShowPregnancyForm] =
    useState(false);

  const [editingPregnancy, setEditingPregnancy] =
    useState(null);

  const [labs, setLabs] = useState([]);

  const [showLabForm, setShowLabForm] =
    useState(false);

  const [editingLab, setEditingLab] = useState(null);

  const [files, setFiles] = useState([]);
  const [uploadingFile, setUploadingFile] =
    useState(false);
  const [fileUploadError, setFileUploadError] =
    useState("");

  const [clinicSettings, setClinicSettings] =
    useState({
      clinic_name: "عيادة النساء والولادة",
      logo_url: "",
      address: "",
      phone: "",
      working_hours: "",
      closed_days: "",
      footer_text: "",
    });

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

  useEffect(() => {
    if (
      pendingAppointment &&
      pendingAppointment.patient_id === patientId
    ) {
      setEditingVisit(null);
      setShowVisitForm(true);
    }
  }, [pendingAppointment, patientId]);

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
        clinicSettingsResult,
        pregnanciesResult,
        labsResult,
        filesResult,
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
          .eq("is_deleted", false)
          .order("visit_date", {
            ascending: false,
          }),

        supabase
          .from("Appointments")
          .select("*")
          .eq("patient_id", patientId)
          .eq("is_deleted", false)
          .order("appointment_date", {
            ascending: false,
          }),

        supabase
          .from("Prescriptions")
          .select("*")
          .eq("patient_id", patientId)
          .eq("is_deleted", false)
          .order("prescription_date", {
            ascending: false,
          }),

        supabase
          .from("Doctors")
          .select("*")
          .order("name", {
            ascending: true,
          }),

        supabase
          .from("ClinicSettings")
          .select(
            "clinic_name, logo_url, address, phone, working_hours, closed_days, footer_text"
          )
          .limit(1)
          .maybeSingle(),

        supabase
          .from("Pregnancies")
          .select("*")
          .eq("patient_id", patientId)
          .eq("is_deleted", false)
          .order("created_at", {
            ascending: false,
          }),

        supabase
          .from("Labs_Ultrasound")
          .select("*")
          .eq("patient_id", patientId)
          .eq("is_deleted", false)
          .order("test_date", {
            ascending: false,
          }),

        supabase
          .from("Files")
          .select("*")
          .eq("patient_id", patientId)
          .order("uploaded_at", {
            ascending: false,
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

      if (clinicSettingsResult.error) {
        console.error(
          "CLINIC SETTINGS ERROR:",
          clinicSettingsResult.error
        );
      }

      if (pregnanciesResult.error) {
        console.error(
          "PREGNANCIES ERROR:",
          pregnanciesResult.error
        );
      }

      if (labsResult.error) {
        console.error(
          "LABS ERROR:",
          labsResult.error
        );
      }

      if (filesResult.error) {
        console.error(
          "FILES ERROR:",
          filesResult.error
        );
      }

      const patientData = patientResult.data;
      const visitsData = visitsResult.data || [];
      const appointmentsData =
        appointmentsResult.data || [];
      const prescriptionsData =
        prescriptionsResult.data || [];
      const doctorsData =
        doctorsResult.data || [];
      const clinicSettingsData =
        clinicSettingsResult.data || null;
      const pregnanciesData =
        pregnanciesResult.data || [];
      const labsData = labsResult.data || [];
      const filesData = filesResult.data || [];

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
      setPregnancies(pregnanciesData);
      setLabs(labsData);
      setFiles(filesData);
      if (clinicSettingsData) {
        setClinicSettings((current) => ({
          ...current,
          ...clinicSettingsData,
        }));
      }
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

  /* =========================================================
     PRINT VISIT SUMMARY
     نسخة مُحسّنة: صفحة واحدة + اللوجو + إخفاء الحقول الفاضية
  ========================================================= */

  function printVisitSummary(visit) {
    const selectedComplaints =
      visitComplaintsMap[visit.id] || [];

    const selectedDiagnoses =
      visitDiagnosesMap[visit.id] || [];

    const doctorName = getDoctorName(visit.doctor_id);
    const doctorRecord = doctors.find(
      (d) => d.id === visit.doctor_id
    );
    const doctorPhone = doctorRecord?.phone || "";
    const safe = escapeHtml;
    const clinicName =
      clinicSettings.clinic_name ||
      "عيادة النساء والولادة";
    const clinicLogoUrl = clinicSettings.logo_url || "";
    const clinicAddress = clinicSettings.address || "";

    const footerText =
      clinicSettings.footer_text ||
      "هذا المستند طبي وسري ويخص المريضة المذكورة فقط.";

    const clinicLogoHtml = clinicLogoUrl
      ? `
          <img
            class="clinic-logo"
            src="${safe(clinicLogoUrl)}"
            alt="شعار العيادة"
          />
        `
      : "";

    const clinicContactHtml =
      clinicAddress || doctorPhone
        ? `
            <div class="clinic-contact">
              ${clinicAddress ? safe(clinicAddress) : ""}
              ${
                clinicAddress && doctorPhone
                  ? " | "
                  : ""
              }
              ${
                doctorPhone
                  ? `هاتف الطبيب: ${safe(doctorPhone)}`
                  : ""
              }
            </div>
          `
        : "";

    const complaintsHtml =
      selectedComplaints.length > 0
        ? selectedComplaints
            .map(
              (complaint) => `
                <div class="item">
                  <strong>${safe(complaint.complaint_ar)}</strong>
                  ${
                    complaint.complaint_en
                      ? `<span>${safe(complaint.complaint_en)}</span>`
                      : ""
                  }
                </div>
              `
            )
            .join("")
        : "";

    const diagnosesHtml =
      selectedDiagnoses.length > 0
        ? selectedDiagnoses
            .map(
              (diagnosis) => `
                <div class="item">
                  <strong>${safe(diagnosis.diagnosis_ar)}</strong>
                  ${
                    diagnosis.diagnosis_en
                      ? `<span>${safe(diagnosis.diagnosis_en)}</span>`
                      : ""
                  }
                </div>
              `
            )
            .join("")
        : "";

    const otherComplaintHtml = visit.chief_complaint
      ? `
        <div class="other-text">
          <strong>أخرى:</strong>
          ${safe(visit.chief_complaint)}
        </div>
      `
      : "";

    const otherDiagnosisHtml = visit.diagnosis
      ? `
        <div class="other-text">
          <strong>تشخيص آخر:</strong>
          ${safe(visit.diagnosis)}
        </div>
      `
      : "";

    // العلاج والملاحظات يطبعون فقط لو فيهم محتوى فعلي (بدون صناديق فاضية)
    const treatmentSectionHtml = visit.treatment
      ? `
          <div class="section">
            <div class="section-title">العلاج | Treatment</div>
            <div class="text-box">${safe(visit.treatment)}</div>
          </div>
        `
      : "";

    const notesSectionHtml = visit.notes
      ? `
          <div class="section">
            <div class="section-title">الملاحظات | Notes</div>
            <div class="text-box">${safe(visit.notes)}</div>
          </div>
        `
      : "";

    const printWindow = window.open(
      "",
      "clinic-visit-print",
      "width=900,height=1000"
    );

    if (!printWindow) {
      alert(
        "تعذر فتح نافذة الطباعة. يرجى السماح بالنوافذ المنبثقة لهذا الموقع."
      );
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="ar" dir="rtl">
      <head>
        <meta charset="UTF-8" />

        <title>
          ملخص زيارة - ${safe(patient.name || "مريضة")}
        </title>

        <style>
          * {
            box-sizing: border-box;
          }

          body {
            margin: 0;
            padding: 0;
            background: #ffffff;
            color: #1f2937;
            font-family:
              "Segoe UI",
              Tahoma,
              Arial,
              sans-serif;
            direction: rtl;
            font-size: 12.5px;
            line-height: 1.5;
          }

          .page {
            width: 100%;
            max-width: 850px;
            margin: 0 auto;
            padding: 16px 22px;
          }

          .header {
            text-align: center;
            border-bottom: 2px solid #1f766e;
            padding-bottom: 10px;
            margin-bottom: 14px;
          }

          .clinic-name {
            font-size: 19px;
            font-weight: 700;
            color: #1f766e;
            margin-bottom: 3px;
          }

          .print-header {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 12px;
            direction: rtl;
          }

          .clinic-logo {
            width: 56px;
            height: 56px;
            object-fit: contain;
            flex: 0 0 auto;
          }

          .clinic-heading {
            flex: 1;
          }

          .clinic-contact {
            margin-top: 4px;
            color: #64748b;
            font-size: 10px;
          }

          .document-title {
            font-size: 15px;
            font-weight: 700;
            color: #263238;
          }

          .patient-box {
            background: #f5f8fa;
            border: 1px solid #dce5e8;
            border-radius: 10px;
            padding: 12px 14px;
            margin-bottom: 14px;
          }

          .patient-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 10px;
          }

          .info-label {
            display: block;
            font-size: 10px;
            color: #718096;
            margin-bottom: 3px;
          }

          .info-value {
            font-size: 13px;
            font-weight: 600;
            color: #1f2937;
          }

          .section {
            margin-top: 12px;
            page-break-inside: avoid;
          }

          .section-title {
            font-size: 13.5px;
            font-weight: 700;
            color: #1f766e;
            border-bottom: 1px solid #dce5e8;
            padding-bottom: 5px;
            margin-bottom: 8px;
          }

          .item {
            padding: 6px 10px;
            margin-bottom: 5px;
            background: #f8fafb;
            border-radius: 7px;
            border-right: 3px solid #1f766e;
          }

          .items-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 6px 12px;
          }

          .items-grid .item {
            margin-bottom: 0;
            position: relative;
          }

          .items-grid .item:nth-child(odd)::after {
            content: "";
            position: absolute;
            inset-inline-end: -7px;
            top: 4px;
            bottom: 4px;
            width: 1px;
            background: #dce5e8;
          }

          .item strong {
            display: block;
            font-size: 12.5px;
          }

          .item span {
            display: block;
            direction: ltr;
            text-align: right;
            color: #718096;
            font-size: 10.5px;
            margin-top: 2px;
          }

          .other-text {
            margin-top: 6px;
            padding: 8px 10px;
            background: #fffaf0;
            border-radius: 7px;
            line-height: 1.6;
            font-size: 12px;
          }

          .text-box {
            border: 1px solid #dce5e8;
            border-radius: 8px;
            padding: 10px 12px;
            line-height: 1.6;
            white-space: pre-wrap;
            font-size: 12px;
          }

          .footer {
            margin-top: 20px;
            padding-top: 8px;
            border-top: 1px solid #dce5e8;
            text-align: center;
            color: #94a3b8;
            font-size: 9.5px;
          }

          @media print {
            @page {
              size: A4;
              margin: 10mm;
            }

            body {
              background: white;
            }

            .page {
              max-width: none;
              padding: 0;
            }

            .print-header {
              break-inside: avoid;
              page-break-inside: avoid;
            }
          }
        </style>
      </head>

      <body>

        <div class="page">

          <div class="header">
            <div class="print-header">
              ${clinicLogoHtml}

              <div class="clinic-heading">
                <div class="clinic-name">
                  ${safe(clinicName)}
                </div>

                <div class="document-title">
                  ملخص الزيارة الطبية
                </div>

                ${clinicContactHtml}
              </div>
            </div>
          </div>

          <div class="patient-box">

            <div class="patient-grid">

              ${
                patient.file_number
                  ? `
                    <div>
                      <span class="info-label">
                        رقم الملف
                      </span>

                      <span class="info-value">
                        ${safe(patient.file_number)}
                      </span>
                    </div>
                  `
                  : ""
              }

              <div>
                <span class="info-label">
                  اسم المريضة
                </span>

                <span class="info-value">
                  ${safe(patient.name || "—")}
                </span>
              </div>

              <div>
                <span class="info-label">
                  رقم الجوال
                </span>

                <span class="info-value">
                  ${safe(patient.phone || "—")}
                </span>
              </div>

              <div>
                <span class="info-label">
                  العمر
                </span>

                <span class="info-value">
                  ${safe(patient.age ?? "—")}
                </span>
              </div>

              <div>
                <span class="info-label">
                  حالة الحمل
                </span>

                <span class="info-value">
                  ${safe(patient.pregnancy_status || "غير محدد")}
                </span>
              </div>

              <div>
                <span class="info-label">
                  تاريخ الزيارة
                </span>

                <span class="info-value">
                  ${safe(formatDate(visit.visit_date))}
                </span>
              </div>

              <div>
                <span class="info-label">
                  الطبيب
                </span>

                <span class="info-value">
                  ${safe(doctorName)}
                </span>
              </div>

            </div>

          </div>

          ${
            selectedComplaints.length > 0 ||
            visit.chief_complaint
              ? `
                <div class="section">

                  <div class="section-title">
                    الشكاوى | Chief Complaints
                  </div>

                  <div class="items-grid">
                    ${complaintsHtml}
                  </div>

                  ${otherComplaintHtml}

                </div>
              `
              : ""
          }

          ${
            selectedDiagnoses.length > 0 ||
            visit.diagnosis
              ? `
                <div class="section">

                  <div class="section-title">
                    التشخيص | Diagnosis
                  </div>

                  <div class="items-grid">
                    ${diagnosesHtml}
                  </div>

                  ${otherDiagnosisHtml}

                </div>
              `
              : ""
          }

          ${treatmentSectionHtml}

          ${notesSectionHtml}

          <div class="footer">
            ${safe(footerText)}
          </div>

        </div>

        <script>
          (function () {
            function waitForImages() {
              var images = Array.from(document.images);

              return Promise.all(
                images.map(function (image) {
                  if (image.complete) {
                    return Promise.resolve();
                  }

                  return new Promise(function (resolve) {
                    image.addEventListener("load", resolve, {
                      once: true,
                    });

                    image.addEventListener("error", resolve, {
                      once: true,
                    });
                  });
                })
              );
            }

            function startPrint() {
              waitForImages().then(function () {
                window.focus();

                setTimeout(function () {
                  window.print();
                }, 150);
              });
            }

            window.addEventListener("afterprint", function () {
              window.close();
            });

            if (document.readyState === "complete") {
              startPrint();
            } else {
              window.addEventListener("load", startPrint, {
                once: true,
              });
            }
          })();
        </script>

      </body>
      </html>
    `);

    printWindow.document.close();
  }

  function printPrescription(prescription) {
    const safe = escapeHtml;

    const doctorName = getDoctorName(
      prescription.doctor_id
    );

    const items =
      prescriptionItemsMap[prescription.id] || [];

    const clinicName =
      clinicSettings.clinic_name ||
      "عيادة النساء والولادة";
    const clinicLogoUrl = clinicSettings.logo_url || "";
    const clinicAddress = clinicSettings.address || "";

    const clinicLogoHtml = clinicLogoUrl
      ? `
          <img
            class="clinic-logo"
            src="${safe(clinicLogoUrl)}"
            alt="شعار العيادة"
          />
        `
      : "";

    const doctorRecord = doctors.find(
      (d) => d.id === prescription.doctor_id
    );
    const doctorPhone = doctorRecord?.phone || "";

    const clinicContactHtml =
      clinicAddress || doctorPhone
        ? `
            <div class="clinic-contact">
              ${clinicAddress ? safe(clinicAddress) : ""}
              ${
                clinicAddress && doctorPhone
                  ? " | "
                  : ""
              }
              ${
                doctorPhone
                  ? `هاتف الطبيب: ${safe(doctorPhone)}`
                  : ""
              }
            </div>
          `
        : "";

    const itemsHtml = items
      .map(
        (item, index) => `
          <div class="rx-item">
            <div class="rx-item-number">${
              index + 1
            }</div>

            <div class="rx-item-body">
              <div class="rx-item-name">
                ${safe(item.medication_name)}
              </div>

              <div class="rx-item-details">
                ${
                  item.dose
                    ? `<span><strong>الجرعة:</strong> ${safe(
                        item.dose
                      )}</span>`
                    : ""
                }
                ${
                  item.frequency
                    ? `<span><strong>عدد المرات:</strong> ${safe(
                        item.frequency
                      )}</span>`
                    : ""
                }
                ${
                  item.duration
                    ? `<span><strong>المدة:</strong> ${safe(
                        item.duration
                      )}</span>`
                    : ""
                }
              </div>

              ${
                item.notes
                  ? `<div class="rx-item-notes">${safe(
                      item.notes
                    )}</div>`
                  : ""
              }
            </div>
          </div>
        `
      )
      .join("");

    const footerText =
      clinicSettings.footer_text ||
      "هذا المستند طبي وسري ويخص المريضة المذكورة فقط.";

    const printWindow = window.open(
      "",
      "clinic-prescription-print",
      "width=900,height=1000"
    );

    if (!printWindow) {
      alert(
        "تعذر فتح نافذة الطباعة. يرجى السماح بالنوافذ المنبثقة لهذا الموقع."
      );
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="ar" dir="rtl">
      <head>
        <meta charset="UTF-8" />
        <title>وصفة طبية - ${safe(patient.name || "مريضة")}</title>

        <style>
          * { box-sizing: border-box; }

          body {
            margin: 0;
            padding: 0;
            background: #ffffff;
            color: #1f2937;
            font-family: "Segoe UI", Tahoma, Arial, sans-serif;
            direction: rtl;
          }

          .page {
            width: 100%;
            max-width: 850px;
            margin: 0 auto;
            padding: 22px 30px;
          }

          .header {
            text-align: center;
            border-bottom: 3px solid #1f766e;
            padding-bottom: 14px;
            margin-bottom: 20px;
          }

          .print-header {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 14px;
          }

          .clinic-logo {
            width: 66px;
            height: 66px;
            object-fit: contain;
          }

          .clinic-name {
            font-size: 20px;
            font-weight: 700;
            color: #1f766e;
          }

          .document-title {
            font-size: 15px;
            font-weight: 700;
            color: #263238;
            margin-top: 3px;
          }

          .rx-symbol {
            font-size: 15px;
            font-weight: 700;
            color: #1f766e;
          }

          .clinic-contact {
            margin-top: 5px;
            color: #64748b;
            font-size: 11px;
          }

          .patient-box {
            background: #f5f8fa;
            border: 1px solid #dce5e8;
            border-radius: 12px;
            padding: 14px 16px;
            margin-bottom: 22px;
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 12px;
          }

          .info-label {
            display: block;
            font-size: 11px;
            color: #718096;
            margin-bottom: 4px;
          }

          .info-value {
            font-size: 14px;
            font-weight: 600;
          }

          .rx-heading {
            font-size: 26px;
            font-weight: 800;
            color: #1f766e;
            margin-bottom: 14px;
          }

          .rx-item {
            display: flex;
            gap: 12px;
            padding: 13px 14px;
            border: 1px solid #dce5e8;
            border-radius: 10px;
            margin-bottom: 10px;
          }

          .rx-item-number {
            width: 26px;
            height: 26px;
            flex: 0 0 auto;
            border-radius: 8px;
            background: #1f766e;
            color: white;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 12px;
            font-weight: 700;
          }

          .rx-item-name {
            font-size: 15px;
            font-weight: 700;
            margin-bottom: 6px;
          }

          .rx-item-details {
            display: flex;
            gap: 16px;
            flex-wrap: wrap;
            font-size: 12px;
            color: #4a5568;
          }

          .rx-item-notes {
            margin-top: 6px;
            font-size: 12px;
            color: #718096;
            font-style: italic;
          }

          .prescription-notes {
            margin-top: 18px;
            padding: 12px 14px;
            background: #fffaf0;
            border-radius: 10px;
            font-size: 13px;
          }

          .signature-row {
            margin-top: 50px;
            display: flex;
            justify-content: space-between;
          }

          .signature-box {
            text-align: center;
            width: 200px;
          }

          .signature-line {
            border-top: 1px solid #94a3b8;
            margin-top: 40px;
            padding-top: 6px;
            font-size: 11px;
            color: #718096;
          }

          .footer {
            margin-top: 30px;
            padding-top: 14px;
            border-top: 1px solid #dce5e8;
            text-align: center;
            color: #94a3b8;
            font-size: 10px;
          }

          @media print {
            @page { size: A4; margin: 14mm; }
            .page { max-width: none; padding: 0; }
          }
        </style>
      </head>

      <body>
        <div class="page">
          <div class="header">
            <div class="print-header">
              ${clinicLogoHtml}

              <div>
                <div class="clinic-name">${safe(clinicName)}</div>
                <div class="document-title">وصفة طبية</div>
                ${clinicContactHtml}
              </div>
            </div>
          </div>

          <div class="patient-box">
            <div>
              <span class="info-label">اسم المريضة</span>
              <span class="info-value">${safe(patient.name || "—")}</span>
            </div>

            <div>
              <span class="info-label">العمر</span>
              <span class="info-value">${safe(patient.age ?? "—")}</span>
            </div>

            <div>
              <span class="info-label">التاريخ</span>
              <span class="info-value">${safe(
                formatDate(prescription.prescription_date)
              )}</span>
            </div>

            <div>
              <span class="info-label">الطبيبة</span>
              <span class="info-value">${safe(doctorName)}</span>
            </div>
          </div>

          <div class="rx-heading">℞</div>

          ${
            items.length > 0
              ? itemsHtml
              : `<div style="color:#94a3b8; font-size: 13px;">لا توجد أدوية مسجلة</div>`
          }

          ${
            prescription.notes
              ? `<div class="prescription-notes"><strong>ملاحظات:</strong> ${safe(
                  prescription.notes
                )}</div>`
              : ""
          }

          <div class="signature-row">
            <div class="signature-box">
              <div class="signature-line">توقيع الطبيبة</div>
            </div>

            <div class="signature-box">
              <div class="signature-line">ختم العيادة</div>
            </div>
          </div>

          <div class="footer">${safe(footerText)}</div>
        </div>

        <script>
          (function () {
            function waitForImages() {
              var images = Array.from(document.images);

              return Promise.all(
                images.map(function (image) {
                  if (image.complete) return Promise.resolve();

                  return new Promise(function (resolve) {
                    image.addEventListener("load", resolve, { once: true });
                    image.addEventListener("error", resolve, { once: true });
                  });
                })
              );
            }

            function startPrint() {
              waitForImages().then(function () {
                window.focus();
                setTimeout(function () { window.print(); }, 150);
              });
            }

            window.addEventListener("afterprint", function () {
              window.close();
            });

            if (document.readyState === "complete") {
              startPrint();
            } else {
              window.addEventListener("load", startPrint, { once: true });
            }
          })();
        </script>
      </body>
      </html>
    `);

    printWindow.document.close();
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
      "هل أنت متأكد من حذف هذه الزيارة؟\n\nيمكن للمدير استعادتها لاحقًا من سجل المحذوفات."
    );

    if (!confirmed) {
      return;
    }

    const userId = await getCurrentUserId();

    const { error } = await supabase
      .from("Visits")
      .update({
        is_deleted: true,
        deleted_at: new Date().toISOString(),
        deleted_by: userId,
      })
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

  function handlePregnancySaved() {
    setShowPregnancyForm(false);
    setEditingPregnancy(null);
    loadPatientFile();
  }

  function startEditPregnancy(pregnancy) {
    setEditingPregnancy(pregnancy);
    setShowPregnancyForm(true);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  function cancelPregnancyForm() {
    setShowPregnancyForm(false);
    setEditingPregnancy(null);
  }

  async function deletePregnancy(pregnancyId) {
    const confirmed = window.confirm(
      "هل أنت متأكد من حذف سجل متابعة الحمل هذا؟\n\nيمكن للمدير استعادته لاحقًا من سجل المحذوفات."
    );

    if (!confirmed) {
      return;
    }

    const userId = await getCurrentUserId();

    const { error } = await supabase
      .from("Pregnancies")
      .update({
        is_deleted: true,
        deleted_at: new Date().toISOString(),
        deleted_by: userId,
      })
      .eq("id", pregnancyId);

    if (error) {
      console.error(error);

      alert(
        "حدث خطأ أثناء حذف سجل الحمل:\n" +
          error.message
      );

      return;
    }

    if (editingPregnancy?.id === pregnancyId) {
      cancelPregnancyForm();
    }

    await loadPatientFile();
  }

  function calculateGestationalAge(lmpDate) {
    if (!lmpDate) {
      return null;
    }

    const start = new Date(`${lmpDate}T00:00:00`);
    const today = new Date();

    const diffDays = Math.floor(
      (today - start) / (1000 * 60 * 60 * 24)
    );

    if (diffDays < 0) {
      return null;
    }

    const weeks = Math.floor(diffDays / 7);
    const days = diffDays % 7;

    return `${weeks} أسبوع و ${days} يوم`;
  }

  function handleLabSaved() {
    setShowLabForm(false);
    setEditingLab(null);
    loadPatientFile();
  }

  function startEditLab(lab) {
    setEditingLab(lab);
    setShowLabForm(true);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  function cancelLabForm() {
    setShowLabForm(false);
    setEditingLab(null);
  }

  async function deleteLab(labId) {
    const confirmed = window.confirm(
      "هل أنت متأكد من حذف هذا التحليل؟\n\nيمكن للمدير استعادته لاحقًا من سجل المحذوفات."
    );

    if (!confirmed) {
      return;
    }

    const userId = await getCurrentUserId();

    const { error } = await supabase
      .from("Labs_Ultrasound")
      .update({
        is_deleted: true,
        deleted_at: new Date().toISOString(),
        deleted_by: userId,
      })
      .eq("id", labId);

    if (error) {
      console.error(error);

      alert(
        "حدث خطأ أثناء حذف التحليل:\n" +
          error.message
      );

      return;
    }

    if (editingLab?.id === labId) {
      cancelLabForm();
    }

    await loadPatientFile();
  }

  async function uploadPatientFile(e) {
    const file = e.target.files?.[0];

    if (!file) {
      return;
    }

    setUploadingFile(true);
    setFileUploadError("");

    const filePath = `${patientId}/${Date.now()}_${file.name}`;

    const { error: uploadError } =
      await supabase.storage
        .from("patient-files")
        .upload(filePath, file);

    if (uploadError) {
      console.error(uploadError);

      setFileUploadError(
        "حدث خطأ أثناء رفع الملف: " +
          uploadError.message
      );

      setUploadingFile(false);
      e.target.value = "";
      return;
    }

    const userId = await getCurrentUserId();

    const { error: insertError } = await supabase
      .from("Files")
      .insert([
        {
          patient_id: patientId,
          visit_id: null,
          file_name: file.name,
          file_url: filePath,
          file_type: file.type || "",
          uploaded_by: userId,
        },
      ]);

    if (insertError) {
      console.error(insertError);

      setFileUploadError(
        "تم رفع الملف لكن حدث خطأ أثناء حفظ بياناته: " +
          insertError.message
      );

      setUploadingFile(false);
      e.target.value = "";
      return;
    }

    e.target.value = "";
    setUploadingFile(false);

    await loadPatientFile();
  }

  async function downloadPatientFile(file) {
    const { data, error } = await supabase.storage
      .from("patient-files")
      .createSignedUrl(file.file_url, 60);

    if (error || !data?.signedUrl) {
      console.error(error);

      alert(
        "تعذر فتح الملف. حاول مرة أخرى."
      );

      return;
    }

    window.open(data.signedUrl, "_blank");
  }

  async function deletePatientFile(file) {
    const confirmed = window.confirm(
      "هل أنت متأكد من حذف هذا الملف نهائيًا؟\n\nلا يمكن التراجع عن هذا الإجراء."
    );

    if (!confirmed) {
      return;
    }

    const { error: storageError } =
      await supabase.storage
        .from("patient-files")
        .remove([file.file_url]);

    if (storageError) {
      console.error(storageError);
    }

    const { error } = await supabase
      .from("Files")
      .delete()
      .eq("id", file.id);

    if (error) {
      console.error(error);

      alert(
        "حدث خطأ أثناء حذف الملف:\n" +
          error.message
      );

      return;
    }

    await loadPatientFile();
  }

  function formatFileDate(value) {
    if (!value) {
      return "—";
    }

    return new Date(value).toLocaleString("ar-SA", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
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
      "هل أنت متأكد من حذف هذه الوصفة؟\n\nيمكن للمدير استعادتها لاحقًا من سجل المحذوفات."
    );

    if (!confirmed) {
      return;
    }

    const userId = await getCurrentUserId();

    const { error } = await supabase
      .from("Prescriptions")
      .update({
        is_deleted: true,
        deleted_at: new Date().toISOString(),
        deleted_by: userId,
      })
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

  const canManageVisits = profile?.role !== "receptionist";
  const canManagePrescriptions =
    profile?.role !== "receptionist";
  const canManagePregnancy =
    profile?.role !== "receptionist";

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

          {patient.file_number && (
            <p className="patient-file-number-line">
              🗂️ رقم الملف: {patient.file_number}
            </p>
          )}
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
            <small>رقم الملف</small>

            <strong>
              {patient.file_number || "—"}
            </strong>
          </div>

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

      {/* =========================
          PREGNANCY TRACKING
      ========================= */}

      <section className="panel">
        <div className="panel-title">
          <div>
            <h2>🤰 متابعة الحمل</h2>

            <p>سجلات الحمل وموعد الولادة المتوقع</p>
          </div>

          {!showPregnancyForm && canManagePregnancy && (
            <button
              className="primary"
              onClick={() => {
                setEditingPregnancy(null);
                setShowPregnancyForm(true);
              }}
            >
              + إضافة متابعة حمل
            </button>
          )}
        </div>

        {showPregnancyForm && canManagePregnancy && (
          <PregnancyForm
            patientId={patientId}
            doctors={doctors}
            pregnancy={editingPregnancy}
            onSaved={handlePregnancySaved}
            onCancel={cancelPregnancyForm}
            profile={profile}
          />
        )}

        {pregnancies.length === 0 ? (
          <div className="empty">
            لا توجد سجلات متابعة حمل لهذه المريضة
          </div>
        ) : (
          <div className="medical-list">
            {pregnancies.map((pregnancy) => (
              <div
                className="medical-card"
                key={pregnancy.id}
              >
                <div className="medical-card-header">
                  <div>
                    <strong>
                      {pregnancy.status === "ongoing"
                        ? "حمل جارٍ"
                        : pregnancy.status ===
                          "completed"
                        ? "انتهى بالولادة"
                        : "إجهاض"}
                    </strong>

                    <span>
                      آخر دورة:{" "}
                      {formatDate(pregnancy.lmp_date)}
                    </span>
                  </div>

                  {canManagePregnancy && (
                    <div className="visit-actions">
                      <button
                        className="edit-button"
                        onClick={() =>
                          startEditPregnancy(
                            pregnancy
                          )
                        }
                      >
                        ✏️ تعديل
                      </button>

                      <button
                        className="delete-button"
                        onClick={() =>
                          deletePregnancy(
                            pregnancy.id
                          )
                        }
                      >
                        🗑️ حذف
                      </button>
                    </div>
                  )}
                </div>

                <div className="medical-card-grid">
                  <div>
                    <small>عمر الحمل الحالي</small>

                    <p>
                      {pregnancy.status === "ongoing"
                        ? calculateGestationalAge(
                            pregnancy.lmp_date
                          ) || "—"
                        : "—"}
                    </p>
                  </div>

                  <div>
                    <small>
                      موعد الولادة المتوقع
                    </small>

                    <p>
                      {formatDate(
                        pregnancy.edd_date
                      )}
                    </p>
                  </div>

                  <div>
                    <small>عدد مرات الحمل</small>

                    <p>{pregnancy.gravida ?? "—"}</p>
                  </div>

                  <div>
                    <small>عدد الولادات</small>

                    <p>{pregnancy.para ?? "—"}</p>
                  </div>

                  <div>
                    <small>الطبيبة</small>

                    <p>
                      {getDoctorName(
                        pregnancy.doctor_id
                      )}
                    </p>
                  </div>

                  <div>
                    <small>ملاحظات</small>

                    <p>{pregnancy.notes || "—"}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* =========================
          VISITS
      ========================= */}

      <section className="panel">
        <div className="panel-title">
          <div>
            <h2>🩺 الزيارات</h2>

            <p>السجل الطبي للزيارات</p>
          </div>

          {!showVisitForm && canManageVisits && (
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

        {showVisitForm && canManageVisits && (
          <VisitForm
            patientId={patientId}
            doctors={doctors}
            visit={editingVisit}
            onSaved={() => {
              handleVisitSaved();

              if (pendingAppointment) {
                onConsumePendingAppointment();
              }
            }}
            onCancel={() => {
              cancelVisitForm();

              if (pendingAppointment) {
                onConsumePendingAppointment();
              }
            }}
            profile={profile}
            prefill={
              !editingVisit &&
              pendingAppointment &&
              pendingAppointment.patient_id ===
                patientId
                ? {
                    doctorId:
                      pendingAppointment.doctor_id,
                    visitDate:
                      pendingAppointment.appointment_date,
                    appointmentId:
                      pendingAppointment.id,
                  }
                : null
            }
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

  {canManageVisits && (
  <button
    type="button"
    className="print-button"
    onClick={() => printVisitSummary(visit)}
    aria-label="طباعة ملخص الزيارة"
  >
    <span aria-hidden="true">🖨️</span>
    طباعة الملخص
  </button>
  )}

  {canManageVisits && (
    <button
      className="edit-button"
      onClick={() =>
        startEditVisit(visit)
      }
    >
      ✏️ تعديل
    </button>
  )}

  {canManageVisits && (
    <button
      className="delete-button"
      onClick={() =>
        deleteVisit(visit.id)
      }
    >
      🗑️ حذف
    </button>
  )}

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

      {/* =========================
          PRESCRIPTIONS
      ========================= */}

      <section className="panel">
        <div className="panel-title">
          <div>
            <h2>💊 الوصفات الطبية</h2>

            <p>
              الأدوية والوصفات المسجلة للمريض
            </p>
          </div>

          {!showPrescriptionForm && canManagePrescriptions && (
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

        {showPrescriptionForm && canManagePrescriptions && (
          <PrescriptionForm
            patientId={patientId}
            doctors={doctors}
            visits={visits}
            prescription={editingPrescription}
            onSaved={handlePrescriptionSaved}
            onCancel={cancelPrescriptionForm}
            profile={profile}
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
                        type="button"
                        className="print-button"
                        onClick={() =>
                          printPrescription(
                            prescription
                          )
                        }
                        aria-label="طباعة الوصفة الطبية"
                      >
                        <span aria-hidden="true">🖨️</span>
                        طباعة
                      </button>

                      {canManagePrescriptions && (
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
                      )}

                      {canManagePrescriptions && (
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
                      )}
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

      {/* =========================
          LABS & ULTRASOUND
      ========================= */}

      <section className="panel">
        <div className="panel-title">
          <div>
            <h2>🧪 التحاليل والسونار</h2>

            <p>نتائج التحاليل المخبرية والموجات الصوتية</p>
          </div>

          {!showLabForm && canManageVisits && (
            <button
              className="primary"
              onClick={() => {
                setEditingLab(null);
                setShowLabForm(true);
              }}
            >
              + إضافة تحليل
            </button>
          )}
        </div>

        {showLabForm && canManageVisits && (
          <LabTestForm
            patientId={patientId}
            doctors={doctors}
            visits={visits}
            lab={editingLab}
            onSaved={handleLabSaved}
            onCancel={cancelLabForm}
            profile={profile}
          />
        )}

        {labs.length === 0 ? (
          <div className="empty">
            لا توجد تحاليل أو فحوصات مسجلة لهذه المريضة
          </div>
        ) : (
          <div className="medical-list">
            {labs.map((lab) => (
              <div
                className="medical-card"
                key={lab.id}
              >
                <div className="medical-card-header">
                  <div>
                    <strong>
                      {lab.test_type === "ultrasound"
                        ? "🩻 سونار"
                        : "🧪 تحليل مخبري"}{" "}
                      — {lab.test_name}
                    </strong>

                    <span>
                      {formatDate(lab.test_date)}{" "}
                      — الطبيبة:{" "}
                      {getDoctorName(lab.doctor_id)}
                    </span>
                  </div>

                  {canManageVisits && (
                    <div className="visit-actions">
                      <button
                        className="edit-button"
                        onClick={() =>
                          startEditLab(lab)
                        }
                      >
                        ✏️ تعديل
                      </button>

                      <button
                        className="delete-button"
                        onClick={() =>
                          deleteLab(lab.id)
                        }
                      >
                        🗑️ حذف
                      </button>
                    </div>
                  )}
                </div>

                <div className="medical-card-grid">
                  <div>
                    <small>النتيجة</small>
                    <p>{lab.result || "—"}</p>
                  </div>

                  <div>
                    <small>ملاحظات</small>
                    <p>{lab.notes || "—"}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* =========================
          FILES & ATTACHMENTS
      ========================= */}

      <section className="panel">
        <div className="panel-title">
          <div>
            <h2>📎 الملفات والمرفقات</h2>

            <p>التقارير الطبية والمستندات المرفوعة</p>
          </div>

          {profile?.role !== "receptionist" && (
            <label className="primary" style={{ cursor: "pointer" }}>
              {uploadingFile
                ? "جاري الرفع..."
                : "+ رفع ملف"}

              <input
                type="file"
                onChange={uploadPatientFile}
                disabled={uploadingFile}
                style={{ display: "none" }}
              />
            </label>
          )}
        </div>

        {fileUploadError && (
          <div className="error">
            {fileUploadError}
          </div>
        )}

        {files.length === 0 ? (
          <div className="empty">
            لا توجد ملفات مرفوعة لهذه المريضة
          </div>
        ) : (
          <div className="medical-list">
            {files.map((file) => (
              <div
                className="medical-card"
                key={file.id}
              >
                <div className="medical-card-header">
                  <div>
                    <strong>
                      📄 {file.file_name}
                    </strong>

                    <span>
                      {formatFileDate(
                        file.uploaded_at
                      )}
                    </span>
                  </div>

                  <div className="visit-actions">
                    <button
                      className="view-button"
                      onClick={() =>
                        downloadPatientFile(file)
                      }
                    >
                      📥 فتح
                    </button>

                    {profile?.role === "admin" && (
                      <button
                        className="delete-button"
                        onClick={() =>
                          deletePatientFile(file)
                        }
                      >
                        🗑️ حذف
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* =========================
          APPOINTMENTS
      ========================= */}

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

      {/* =========================
          SHORTCUTS
      ========================= */}

      <section className="patient-file-shortcuts">
        <div className="shortcut-card active-shortcut">
          💊
          <span>الوصفات الطبية</span>
          <small>
            {prescriptions.length} وصفة
          </small>
        </div>

        <div className="shortcut-card active-shortcut">
          🧪
          <span>التحاليل والسونار</span>
          <small>{labs.length} تحليل</small>
        </div>

        <div className="shortcut-card active-shortcut">
          📎
          <span>الملفات والمرفقات</span>
          <small>{files.length} ملف</small>
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

  const [profile, setProfile] = useState(null);
  const [profileLoading, setProfileLoading] =
    useState(true);

  const [page, setPage] = useState("dashboard");

  const [selectedPatientId, setSelectedPatientId] =
    useState(null);

  const [pendingAppointment, setPendingAppointment] =
    useState(null);

  const [darkMode, setDarkMode] = useState(() => {
    try {
      return (
        localStorage.getItem("clinic-dark-mode") ===
        "true"
      );
    } catch (err) {
      return false;
    }
  });

  useEffect(() => {
    if (darkMode) {
      document.body.classList.add("dark-theme");
    } else {
      document.body.classList.remove("dark-theme");
    }

    try {
      localStorage.setItem(
        "clinic-dark-mode",
        darkMode ? "true" : "false"
      );
    } catch (err) {
      // تجاهل لو التخزين المحلي غير متاح
    }
  }, [darkMode]);

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

  useEffect(() => {
    if (session?.user?.id) {
      loadProfile(session.user.id);
    } else {
      setProfile(null);
      setProfileLoading(false);
    }
  }, [session?.user?.id]);

  async function loadProfile(userId) {
    setProfileLoading(true);

    const { data, error } = await supabase
      .from("Profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (error) {
      console.error("PROFILE LOAD ERROR:", error);
      setProfile(null);
    } else {
      setProfile(data);
    }

    setProfileLoading(false);
  }

  async function logout() {
    await supabase.auth.signOut();

    setSession(null);
    setProfile(null);
  }

  function openPatient(patientId) {
    setSelectedPatientId(patientId);
    setPage("patient-file");
  }

  function backToPatients() {
    setSelectedPatientId(null);
    setPage("patients");
  }

  function convertAppointmentToVisit(appointment) {
    setSelectedPatientId(appointment.patient_id);
    setPendingAppointment(appointment);
    setPage("patient-file");
  }

  function clearPendingAppointment() {
    setPendingAppointment(null);
  }

  if (loading || (session && profileLoading)) {
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
          <NotificationsBell
            profile={profile}
            onOpenPatient={openPatient}
          />

          <button
            className="logout"
            onClick={() =>
              setDarkMode((current) => !current)
            }
            aria-label="تبديل الوضع الداكن"
            title="تبديل الوضع الداكن"
          >
            {darkMode ? "☀️" : "🌙"}
          </button>

          <span>
            {profile?.name || session?.user?.email}
            {profile?.role && (
              <>
                {" "}
                (
                {getRoleLabel(profile.role)}
                )
              </>
            )}
          </span>

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
          className={
            page === "visits" ? "active" : ""
          }
          onClick={() => {
            setPage("visits");
            setSelectedPatientId(null);
          }}
        >
          الزيارات
        </button>

        {profile?.role !== "receptionist" && (
          <button
            className={
              page === "reports" ? "active" : ""
            }
            onClick={() => {
              setPage("reports");
              setSelectedPatientId(null);
            }}
          >
            📊 التقارير
          </button>
        )}

        {profile?.role === "admin" && (
          <button
            className={
              page === "audit-log" ? "active" : ""
            }
            onClick={() => {
              setPage("audit-log");
              setSelectedPatientId(null);
            }}
          >
            📜 سجل النشاط
          </button>
        )}

        {profile?.role === "admin" && (
          <button
            className={
              page === "clinic-settings"
                ? "active"
                : ""
            }
            onClick={() => {
              setPage("clinic-settings");
              setSelectedPatientId(null);
            }}
          >
            ⚙️ إعدادات العيادة
          </button>
        )}
      </nav>

      {page === "dashboard" && <Dashboard />}

      {page === "patients" && (
        <Patients
          onOpenPatient={openPatient}
          profile={profile}
        />
      )}

      {page === "patient-file" && (
        <PatientFile
          patientId={selectedPatientId}
          onBack={backToPatients}
          profile={profile}
          pendingAppointment={pendingAppointment}
          onConsumePendingAppointment={
            clearPendingAppointment
          }
        />
      )}

      {page === "appointments" && (
        <AppointmentsPage
          onOpenPatient={openPatient}
          onConvertToVisit={convertAppointmentToVisit}
          profile={profile}
        />
      )}

      {page === "visits" && (
        <VisitsPage
          onOpenPatient={openPatient}
          profile={profile}
        />
      )}

      {page === "reports" &&
        profile?.role !== "receptionist" && (
          <ReportsPage profile={profile} />
        )}

      {page === "audit-log" &&
        profile?.role === "admin" && (
          <AuditLogPage />
        )}

      {page === "clinic-settings" &&
        profile?.role === "admin" && (
          <ClinicSettingsPage />
        )}
    </div>
  );
}
