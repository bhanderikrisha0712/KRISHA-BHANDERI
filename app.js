const API = "../backend/api";
let students = [];
let attendanceStatus = [];
let attendanceHistory = [];

async function api(url, options = {}) {
    const response = await fetch(`${API}/${url}`, {
        credentials: "same-origin",
        ...options
    });
    let data;
    try { data = await response.json(); }
    catch { throw new Error("Invalid server response"); }
    if (!response.ok) throw new Error(data.message || "Server request failed");
    return data;
}

async function loadData() {
    const auth = await api("auth_check.php");
    if (!auth.loggedIn) {
        window.location.href = "index.html";
        return false;
    }
    const studentData = await api("students.php");
    students = Array.isArray(studentData) ? studentData : [];
    const attendanceData = await api("attendance.php");
    attendanceHistory = Array.isArray(attendanceData) ? attendanceData : [];
    return true;
}

function getToday() {
    return new Date().toLocaleDateString("en-IN");
}

function showDate() {
    const a = document.getElementById("todayDate");
    if (a) a.innerText = "Today: " + getToday();
    const b = document.getElementById("attendanceDate");
    if (b) b.innerText = "Date: " + getToday();
}

function getAttendanceRecords() {
    return attendanceHistory;
}

function getTodayAttendance() {
    return attendanceHistory.filter(x => x.date === getToday());
}

function updateDashboard() {
    const total = students.length;
    const today = getTodayAttendance();
    const present = today.filter(x => x.status === "Present").length;
    const absent = today.filter(x => x.status === "Absent").length;
    const marked = present + absent;
    const percentage = marked ? Math.round(present / marked * 100) : 0;

    const set = (id, value) => {
        const el = document.getElementById(id);
        if (el) el.innerText = value;
    };
    set("totalStudents", total);
    set("presentStudents", present);
    set("absentStudents", absent);
    set("attendancePercentage", percentage + "%");
    showDashboardStudents();
}

function showDashboardStudents() {
    const list = document.getElementById("dashboardStudents");
    if (!list) return;
    list.innerHTML = "";
    students.forEach(s => {
        list.innerHTML += `
        <tr>
            <td>${escapeHtml(s.roll)}</td>
            <td>${escapeHtml(s.name)}</td>
            <td>${escapeHtml(s.course)}</td>
            <td>${s.attendancePercentage || 0}%</td>
            <td><a class="gold-button" href="#" onclick="openProfile('${s.id}'); return false;">View</a></td>
        </tr>`;
    });
}

function showStudents() {
    const list = document.getElementById("studentList");
    if (!list) return;
    list.innerHTML = "";
    students.forEach((s, i) => {
        list.innerHTML += `
        <tr>
            <td>${escapeHtml(s.id)}</td>
            <td>${escapeHtml(s.name)}</td>
            <td>${escapeHtml(s.roll)}</td>
            <td>${escapeHtml(s.course)}</td>
            <td><span class="${s.status === "Active" ? "badge-active" : "badge-inactive"}">${escapeHtml(s.status)}</span></td>
            <td>${s.attendancePercentage || 0}%</td>
            <td>
                <a class="gold-button" href="#" onclick="openProfile('${s.id}'); return false;">View</a>
                <button class="edit-btn" onclick="editStudent(${i})">Edit</button>
                <button class="delete-btn" onclick="deleteStudent(${i})">Delete</button>
            </td>
        </tr>`;
    });
}

function searchStudents() {
    const q = document.getElementById("studentSearch").value.toLowerCase();
    document.querySelectorAll("#studentList tr").forEach(row => {
        row.style.display = row.innerText.toLowerCase().includes(q) ? "" : "none";
    });
}

async function addNewStudent() {
    const get = id => document.getElementById(id).value.trim();
    const name = get("name"), roll = get("roll");

    if (!name || !roll) {
        alert("Please enter Name and Roll Number.");
        return;
    }
    if (students.some(s => s.roll === roll)) {
        alert("This Roll Number already exists.");
        return;
    }

    const file = document.getElementById("photo").files[0];
    const create = async photo => {
        const newStudent = {
            id: "STU" + String(students.length + 1).padStart(3, "0"),
            name, roll, dob: get("dob"), gender: get("gender"),
            mobile: get("mobile"), email: get("email"), address: get("address"),
            course: get("course"), semester: get("semester"), division: get("division"),
            admissionDate: get("admissionDate"), parentName: get("parentName"),
            parentContact: get("parentContact"), status: get("status"),
            photo: photo || "",
            marks: {Python:0,"Web Technology":0,DBMS:0,Java:0,"Computer Networks":0},
            total: 0, percentage: 0, grade: "N/A", present: 0, absent: 0, attendancePercentage: 0
        };
        try {
            await api("students.php", {method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({action:"add", student:newStudent})});
            students.push(newStudent);
            alert("Student added successfully!");
            window.location.href = "students.html";
        } catch(e) { alert(e.message); }
    };

    if (file) {
        const reader = new FileReader();
        reader.onload = e => create(e.target.result);
        reader.readAsDataURL(file);
    } else create("");
}

async function deleteStudent(index) {
    if (!confirm("Delete " + students[index].name + "?")) return;
    try {
        await api("students.php", {method:"POST", headers:{"Content-Type":"application/json"},
            body:JSON.stringify({action:"delete", id:students[index].id})});
        students.splice(index, 1);
        showStudents();
        updateDashboard();
    } catch(e) { alert(e.message); }
}

async function editStudent(index) {
    const old = students[index];
    const name = prompt("Full Name:", old.name); if (name === null) return;
    const roll = prompt("Roll Number:", old.roll); if (roll === null) return;
    const course = prompt("Course:", old.course); if (course === null) return;
    const semester = prompt("Semester:", old.semester); if (semester === null) return;
    const status = prompt("Status (Active/Inactive):", old.status); if (status === null) return;

    const updated = {...old,
        name:name.trim() || old.name,
        roll:roll.trim() || old.roll,
        course:course.trim() || old.course,
        semester:semester.trim() || old.semester,
        status:status.trim() || old.status
    };
    try {
        await api("students.php", {method:"POST", headers:{"Content-Type":"application/json"},
            body:JSON.stringify({action:"update", student:updated})});
        students[index] = updated;
        showStudents();
        alert("Student details updated!");
    } catch(e) { alert(e.message); }
}

function findStudent() {
    const id = new URLSearchParams(location.search).get("id");
    return students.find(s => s.id === id);
}

function info(title, value) {
    return `<div class="info-item"><strong>${title}</strong><br>${escapeHtml(value || "Not Available")}</div>`;
}

function showProfile() {
    const box = document.getElementById("profileContainer");
    if (!box) return;
    const s = findStudent();
    if (!s) { box.innerHTML = "<h2>Student not found.</h2>"; return; }

    const photo = s.photo || "";
    box.innerHTML = `
    <div class="profile-header">
        ${photo ? `<img class="profile-photo" src="${photo}">` : `<div class="profile-photo"></div>`}
        <div><h2>${escapeHtml(s.name)}</h2><p>${escapeHtml(s.id)} | Roll No: ${escapeHtml(s.roll)}</p></div>
    </div>
    <div class="profile-section"><h2>Personal Information</h2><div class="profile-grid">
        ${info("Date of Birth",s.dob)}${info("Gender",s.gender)}${info("Mobile",s.mobile)}
        ${info("Email",s.email)}${info("Address",s.address)}${info("Status",s.status)}
    </div></div>
    <div class="profile-section"><h2>Academic Information</h2><div class="profile-grid">
        ${info("Course",s.course)}${info("Semester",s.semester)}${info("Division",s.division)}${info("Admission Date",s.admissionDate)}
    </div></div>
    <div class="profile-section"><h2>Parent / Guardian</h2><div class="profile-grid">
        ${info("Parent Name",s.parentName)}${info("Parent Contact",s.parentContact)}
    </div></div>
    <div class="profile-section"><h2>Academic Performance</h2><div class="table-box"><table>
        <tr><th>Subject</th><th>Marks</th></tr>
        ${Object.entries(s.marks || {}).map(([k,v]) => `<tr><td>${escapeHtml(k)}</td><td>${v}</td></tr>`).join("")}
        <tr><th>Total</th><th>${s.total}/500</th></tr>
        <tr><th>Percentage</th><th>${s.percentage}%</th></tr>
        <tr><th>Grade</th><th>${escapeHtml(s.grade)}</th></tr>
    </table></div></div>
    <div class="profile-section"><h2>Attendance</h2>
        <p><b>Present:</b> ${s.present} &nbsp; <b>Absent:</b> ${s.absent} &nbsp; <b>Percentage:</b> ${s.attendancePercentage}%</p>
    </div>`;
}

function showAttendanceStudents() {
    const list = document.getElementById("attendanceList");
    if (!list) return;
    list.innerHTML = "";
    students.forEach((s, i) => {
        list.innerHTML += `
        <tr>
            <td>${i+1}</td><td>${escapeHtml(s.name)}</td><td>${escapeHtml(s.roll)}</td>
            <td><button class="present-btn" onclick="markPresent(${i})">Present</button></td>
            <td><button class="absent-btn" onclick="markAbsent(${i})">Absent</button></td>
            <td id="status${i}" class="status-not-marked">Not Marked</td>
        </tr>`;
    });
}

function markPresent(i) { attendanceStatus[i] = "Present"; setAttendanceButton(i, "Present"); }
function markAbsent(i) { attendanceStatus[i] = "Absent"; setAttendanceButton(i, "Absent"); }

function setAttendanceButton(i, status) {
    const el = document.getElementById("status"+i);
    if (el) { el.innerText = status; el.className = status === "Present" ? "status-present" : "status-absent"; }
}

async function saveAttendance() {
    const records = [];
    const date = getToday();
    students.forEach((s, i) => {
        if (attendanceStatus[i]) records.push({date, id:s.id, name:s.name, roll:s.roll, status:attendanceStatus[i]});
    });
    if (!records.length) { alert("Please mark Present or Absent first."); return; }

    try {
        const data = await api("attendance.php", {method:"POST", headers:{"Content-Type":"application/json"},
            body:JSON.stringify({records})});
        attendanceHistory = data.records;
        students = await api("students.php");
        alert("Attendance saved successfully!");
        attendanceStatus = [];
        showAttendanceStudents();
        updateDashboard();
    } catch(e) { alert(e.message); }
}

function resetAttendance() {
    attendanceStatus = [];
    showAttendanceStudents();
}

function showRecords() {
    const list = document.getElementById("recordList");
    if (!list) return;
    const history = getAttendanceRecords().slice().reverse();
    list.innerHTML = history.map(r => `
        <tr><td>${escapeHtml(r.date)}</td><td>${escapeHtml(r.name)}</td><td>${escapeHtml(r.roll)}</td>
        <td class="${r.status === "Present" ? "status-present" : "status-absent"}">${escapeHtml(r.status)}</td></tr>
    `).join("");
}

function searchRecords() {
    const q = document.getElementById("recordSearch").value.toLowerCase();
    document.querySelectorAll("#recordList tr").forEach(row => {
        row.style.display = row.innerText.toLowerCase().includes(q) ? "" : "none";
    });
}

function loadAcademicStudents() {
    const select = document.getElementById("academicStudent");
    if (!select) return;
    select.innerHTML = `<option value="">Select Student</option>` +
        students.map(s => `<option value="${s.id}">${escapeHtml(s.name)} - ${escapeHtml(s.roll)}</option>`).join("");
}

function showAcademicForm() {
    const id = document.getElementById("academicStudent").value;
    const form = document.getElementById("academicForm");
    if (!id) { form.innerHTML = ""; return; }
    const s = students.find(x => x.id === id);
    const m = s.marks || {};
    form.innerHTML = `
    <div class="form-box"><h2>Subject-wise Marks</h2><div class="form-grid">
    <div><label>Python</label><input id="python" type="number" min="0" max="100" value="${m.Python||0}"></div>
    <div><label>Web Technology</label><input id="web" type="number" min="0" max="100" value="${m["Web Technology"]||0}"></div>
    <div><label>DBMS</label><input id="dbms" type="number" min="0" max="100" value="${m.DBMS||0}"></div>
    <div><label>Java</label><input id="java" type="number" min="0" max="100" value="${m.Java||0}"></div>
    <div><label>Computer Networks</label><input id="cn" type="number" min="0" max="100" value="${m["Computer Networks"]||0}"></div>
    </div><br><button class="gold-button" onclick="calculateMarks('${id}')">Save & Calculate Result</button>
    <div id="result"></div></div>`;
}

async function calculateMarks(id) {
    const nums = ["python","web","dbms","java","cn"].map(x => Number(document.getElementById(x).value) || 0);
    if (nums.some(x => x < 0 || x > 100)) { alert("Marks must be between 0 and 100."); return; }
    const s = students.find(x => x.id === id);
    const updated = {...s,
        marks:{Python:nums[0],"Web Technology":nums[1],DBMS:nums[2],Java:nums[3],"Computer Networks":nums[4]},
        total:nums.reduce((a,b)=>a+b,0)
    };
    updated.percentage = Math.round((updated.total/5)*100)/100;
    updated.grade = updated.percentage>=90 ? "A+" : updated.percentage>=80 ? "A" : updated.percentage>=70 ? "B" : updated.percentage>=60 ? "C" : updated.percentage>=50 ? "D" : "F";
    try {
        await api("students.php", {method:"POST", headers:{"Content-Type":"application/json"},
            body:JSON.stringify({action:"update", student:updated})});
        Object.assign(s, updated);
        document.getElementById("result").innerHTML = `<div class="result-box"><b>Total:</b> ${s.total}/500 &nbsp; <b>Percentage:</b> ${s.percentage}% &nbsp; <b>Grade:</b> ${s.grade}</div>`;
    } catch(e) { alert(e.message); }
}

const pageFiles = {
    dashboard:"dashboard.html", students:"students.html", add:"add-student.html",
    attendance:"attendance.html", academics:"academics.html", records:"records.html",
    about:"about.html", profile:"profile.html"
};

function showPage(page, id) {
    const file = pageFiles[page] || "dashboard.html";
    window.location.href = page === "profile" && id ? file+"?id="+encodeURIComponent(id) : file;
}
function openProfile(id) { showPage("profile", id); }

async function logoutUser() {
    try { await api("logout.php", {method:"POST"}); } catch(e) {}
    window.location.href = "index.html";
}

function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[ch]));
}

async function setupMultiPage() {
    if (document.body.dataset.page === undefined) return;
    try {
        const ok = await loadData();
        if (!ok) return;
        const page = document.body.dataset.page || "dashboard";
        showDate();
        if (page === "dashboard") updateDashboard();
        if (page === "students") showStudents();
        if (page === "attendance") showAttendanceStudents();
        if (page === "records") showRecords();
        if (page === "academics") loadAcademicStudents();
        if (page === "profile") showProfile();
    } catch(e) {
        console.error(e);
        alert("Cannot connect to backend. Start Apache/PHP and open the project through localhost.");
    }
}
setupMultiPage();
