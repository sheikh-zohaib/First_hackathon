const DEFAULT_COMPANY = { name: "Luxe Talent", startTime: "09:00", graceMinutes: 15, leaveQuota: 18 };
const DEFAULT_ADMIN = { id: "ADMIN-101", name: "Alexandra Reid", email: "admin@company.com", password: "admin", role: "admin", department: "Management", salary: 150000 };

function getStorage(key, fallback) { return JSON.parse(localStorage.getItem(key)) || fallback; }
function setStorage(key, data) { localStorage.setItem(key, JSON.stringify(data)); }

let company = getStorage("hcm_company", DEFAULT_COMPANY);
let users = getStorage("hcm_users", [DEFAULT_ADMIN]);
let attendance = getStorage("hcm_attendance", []);
let leaves = getStorage("hcm_leaves", []);
let currentSession = getStorage("hcm_session", null);

// Role Guard Enforcement
const currentPage = window.location.pathname.split("/").pop();
if (currentSession) {
  if (currentSession.role === "admin" && (currentPage === "employee.html" || currentPage === "payslip.html")) {
    window.location.href = "admin.html";
  } else if (currentSession.role === "employee" && (currentPage === "admin.html" || currentPage === "employees.html" || currentPage === "leaves.html" || currentPage === "settings.html")) {
    window.location.href = "employee.html";
  }
} else if (currentPage !== "index.html" && currentPage !== "") {
  window.location.href = "index.html";
}

document.addEventListener("DOMContentLoaded", () => {
  setStorage("hcm_company", company);
  setStorage("hcm_users", users);

  if (currentSession) loadAppView();

  updateClock();
  setInterval(updateClock, 1000);
  initAiAssistant();

  const tabAdmin = document.getElementById("tab-admin-login");
  const tabEmp = document.getElementById("tab-emp-login");
  const loginForm = document.getElementById("login-form");
  const empLoginForm = document.getElementById("emp-login-form");
  const setupForm = document.getElementById("setup-form");

  if (tabAdmin && tabEmp) {
    tabAdmin.addEventListener("click", () => {
      tabAdmin.classList.add("active");
      tabEmp.classList.remove("active");
      if(loginForm) loginForm.classList.remove("hidden");
      if(empLoginForm) empLoginForm.classList.add("hidden");
      if(setupForm) setupForm.classList.add("hidden");
    });
    tabEmp.addEventListener("click", () => {
      tabEmp.classList.add("active");
      tabAdmin.classList.remove("active");
      if(empLoginForm) empLoginForm.classList.remove("hidden");
      if(loginForm) loginForm.classList.add("hidden");
      if(setupForm) setupForm.classList.add("hidden");
    });
  }

  const showSetupLink = document.getElementById("show-setup-link");
  if (showSetupLink) {
    showSetupLink.addEventListener("click", (e) => {
      e.preventDefault();
      if(loginForm) loginForm.classList.add("hidden");
      if(empLoginForm) empLoginForm.classList.add("hidden");
      if(setupForm) setupForm.classList.remove("hidden");
    });
  }

  const showLoginLink = document.getElementById("show-login-link");
  if (showLoginLink) {
    showLoginLink.addEventListener("click", (e) => {
      e.preventDefault();
      if(setupForm) setupForm.classList.add("hidden");
      if(loginForm) loginForm.classList.remove("hidden");
    });
  }
});

// Logins & Setup
const loginForm = document.getElementById("login-form");
if (loginForm) {
  loginForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const email = document.getElementById("login-email").value.trim();
    const pass = document.getElementById("login-password").value.trim();
    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase() && u.password === pass && u.role === "admin");
    if (user) {
      currentSession = user;
      setStorage("hcm_session", user);
      window.location.href = "admin.html";
    } else {
      document.getElementById("login-error").classList.remove("hidden");
    }
  });
}

const empLoginForm = document.getElementById("emp-login-form");
if (empLoginForm) {
  empLoginForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const email = document.getElementById("emp-login-email").value.trim();
    const pass = document.getElementById("emp-login-password").value.trim();
    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase() && u.password === pass && u.role === "employee");
    if (user) {
      currentSession = user;
      setStorage("hcm_session", user);
      window.location.href = "employee.html";
    } else {
      document.getElementById("emp-login-error").classList.remove("hidden");
    }
  });
}

const setupForm = document.getElementById("setup-form");
if (setupForm) {
  setupForm.addEventListener("submit", (e) => {
    e.preventDefault();
    company.name = document.getElementById("setup-company-name").value;
    const adminUser = {
      id: "ADMIN-" + Date.now(),
      name: document.getElementById("setup-admin-name").value,
      email: document.getElementById("setup-admin-email").value,
      password: document.getElementById("setup-admin-password").value,
      role: "admin",
      department: "Management",
      salary: 150000
    };
    users = [adminUser];
    setStorage("hcm_company", company);
    setStorage("hcm_users", users);
    currentSession = adminUser;
    setStorage("hcm_session", adminUser);
    window.location.href = "admin.html";
  });
}

const logoutBtn = document.getElementById("logout-btn");
if (logoutBtn) {
  logoutBtn.addEventListener("click", () => {
    localStorage.removeItem("hcm_session");
    window.location.href = "index.html";
  });
}

function loadAppView() {
  if (!currentSession) return;
  document.querySelectorAll(".company-name-el").forEach(el => el.innerText = company.name);
  document.querySelectorAll("#user-display-name").forEach(el => el.innerText = currentSession.name);
  document.querySelectorAll("#user-display-role").forEach(el => el.innerText = currentSession.role.toUpperCase());
  document.querySelectorAll("#user-avatar-initials").forEach(el => el.innerText = currentSession.name.substring(0, 2).toUpperCase());
  renderData();
}

function renderData() {
  const empList = users.filter(u => u.role === "employee");
  const totalEmpEl = document.getElementById("kpi-total-emp");
  if(totalEmpEl) totalEmpEl.innerText = empList.length;

  const todayStr = new Date().toISOString().split("T")[0];
  const todayAtt = attendance.filter(a => a.date === todayStr);

  const presentEl = document.getElementById("kpi-present-today");
  if(presentEl) presentEl.innerText = todayAtt.length;

  const lateEl = document.getElementById("kpi-late-today");
  if(lateEl) lateEl.innerText = todayAtt.filter(a => a.status === "Late").length;

  const leaveEl = document.getElementById("kpi-leave-today");
  if(leaveEl) leaveEl.innerText = leaves.filter(l => l.status === "Approved" && l.from <= todayStr && l.to >= todayStr).length;

  renderTodayAttendance(todayAtt);
  renderEmployees();
  renderAttendanceLog();
  renderLeavesLog();
  renderAdminLeaves();
  renderPayslip();
}

function renderTodayAttendance(todayAtt) {
  const tbody = document.getElementById("today-attendance-table");
  if (!tbody) return;
  tbody.innerHTML = "";
  if (todayAtt.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:#737373;">No attendance recorded today.</td></tr>`;
    return;
  }
  todayAtt.forEach(att => {
    const emp = users.find(u => u.id === att.empId);
    tbody.innerHTML += `
      <tr>
        <td><strong>${emp ? emp.name : 'Staff'}</strong></td>
        <td>${emp ? emp.department : '-'}</td>
        <td>${att.checkIn}</td>
        <td>${att.checkOut}</td>
        <td><span class="badge ${att.status === 'Late' ? 'badge-warning' : 'badge-success'}">${att.status}</span></td>
      </tr>
    `;
  });
}

function renderEmployees() {
  const tbody = document.getElementById("employees-table");
  if (!tbody) return;
  tbody.innerHTML = "";
  const empList = users.filter(u => u.role === "employee");
  if (empList.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:#737373;">No employees added yet[cite: 1, 2].</td></tr>`;
    return;
  }
  empList.forEach(emp => {
    tbody.innerHTML += `
      <tr>
        <td>${emp.id}</td>
        <td><strong>${emp.name}</strong></td>
        <td>${emp.email}</td>
        <td>${emp.department}</td>
        <td>$${emp.salary}</td>
        <td><button class="btn btn-danger" style="padding: 2px 6px; font-size:10px;" onclick="deleteEmp('${emp.id}')">Delete</button></td>
      </tr>
    `;
  });
}

const openAddModal = document.getElementById("open-add-modal");
if (openAddModal) {
  openAddModal.addEventListener("click", () => {
    document.getElementById("add-emp-modal").classList.remove("hidden");
  });
}
const closeAddModal = document.getElementById("close-emp-modal");
if (closeAddModal) {
  closeAddModal.addEventListener("click", () => {
    document.getElementById("add-emp-modal").classList.add("hidden");
  });
}
const addEmpForm = document.getElementById("add-emp-form");
if (addEmpForm) {
  addEmpForm.addEventListener("submit", (e) => {
    e.preventDefault();
    users.push({
      id: "EMP-" + Math.floor(1000 + Math.random() * 9000),
      name: document.getElementById("new-emp-name").value,
      email: document.getElementById("new-emp-email").value,
      password: document.getElementById("new-emp-pass").value,
      role: "employee",
      department: document.getElementById("new-emp-dept").value,
      salary: parseFloat(document.getElementById("new-emp-salary").value)
    });
    setStorage("hcm_users", users);
    document.getElementById("add-emp-modal").classList.add("hidden");
    addEmpForm.reset();
    renderData();
    alert("Employee account created successfully!");
  });
}

function deleteEmp(id) {
  if (confirm("Delete this employee?")) {
    users = users.filter(u => u.id !== id);
    setStorage("hcm_users", users);
    renderData();
  }
}

// Attendance Clock
const checkInBtn = document.getElementById("btn-check-in");
if (checkInBtn) {
  checkInBtn.addEventListener("click", () => {
    const todayStr = new Date().toISOString().split("T")[0];
    const now = new Date();
    const timeStr = now.toTimeString().split(" ")[0].substring(0, 5);
    let record = attendance.find(a => a.empId === currentSession.id && a.date === todayStr);
    if (record) {
      alert("Already checked in today!");
      return;
    }
    const [startH, startM] = company.startTime.split(":").map(Number);
    const graceCutoff = startH * 60 + startM + parseInt(company.graceMinutes);
    const checkInMins = now.getHours() * 60 + now.getMinutes();
    attendance.push({
      empId: currentSession.id, date: todayStr, checkIn: timeStr, checkOut: "-", status: checkInMins > graceCutoff ? "Late" : "Present"
    });
    setStorage("hcm_attendance", attendance);
    alert("Checked in successfully!");
    renderData();
  });
}

const checkOutBtn = document.getElementById("btn-check-out");
if (checkOutBtn) {
  checkOutBtn.addEventListener("click", () => {
    const todayStr = new Date().toISOString().split("T")[0];
    const now = new Date();
    const timeStr = now.toTimeString().split(" ")[0].substring(0, 5);
    let record = attendance.find(a => a.empId === currentSession.id && a.date === todayStr);
    if (!record) {
      alert("Please check in first!");
      return;
    }
    record.checkOut = timeStr;
    setStorage("hcm_attendance", attendance);
    alert("Checked out successfully!");
    renderData();
  });
}

function renderAttendanceLog() {
  const tbody = document.getElementById("my-attendance-log");
  if (!tbody || !currentSession) return;
  tbody.innerHTML = "";
  attendance.filter(a => a.empId === currentSession.id).forEach(a => {
    tbody.innerHTML += `
      <tr>
        <td>${a.date}</td>
        <td>${a.checkIn}</td>
        <td>${a.checkOut}</td>
        <td><span class="badge ${a.status === 'Late' ? 'badge-warning' : 'badge-success'}">${a.status}</span></td>
      </tr>
    `;
  });
}

// Leave Handling
const leaveForm = document.getElementById("leave-form");
if (leaveForm) {
  leaveForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const type = document.getElementById("leave-type").value;
    const reason = document.getElementById("leave-reason").value;
    const todayStr = new Date().toISOString().split("T")[0];
    leaves.push({
      id: "LV-" + Date.now(), empId: currentSession.id, type, from: todayStr, to: todayStr, days: 1, reason, status: "Pending", remark: ""
    });
    setStorage("hcm_leaves", leaves);
    leaveForm.reset();
    alert("Leave application submitted!");
    renderData();
  });
}

function renderLeavesLog() {
  const tbody = document.getElementById("my-leaves-table");
  if (!tbody || !currentSession) return;
  tbody.innerHTML = "";
  leaves.filter(l => l.empId === currentSession.id).forEach(l => {
    tbody.innerHTML += `
      <tr>
        <td>${l.type}</td>
        <td>${l.from}</td>
        <td>${l.days} Days</td>
        <td><span class="badge ${l.status === 'Approved' ? 'badge-success' : 'badge-warning'}">${l.status}</span></td>
        <td>${l.remark || '-'}</td>
      </tr>
    `;
  });
}

function renderAdminLeaves() {
  const tbody = document.getElementById("leaves-approval-table");
  if (!tbody) return;
  tbody.innerHTML = "";
  leaves.filter(l => l.status === "Pending").forEach(l => {
    const emp = users.find(u => u.id === l.empId);
    tbody.innerHTML += `
      <tr>
        <td><strong>${emp ? emp.name : 'Staff'}</strong></td>
        <td>${l.type}</td>
        <td>${l.from}</td>
        <td><em>"${l.reason}"</em></td>
        <td>
          <button class="btn btn-success" style="padding:2px 6px; font-size:10px;" onclick="processLeave('${l.id}', 'Approved')">Approve</button>
          <button class="btn btn-danger" style="padding:2px 6px; font-size:10px;" onclick="processLeave('${l.id}', 'Rejected')">Reject</button>
        </td>
      </tr>
    `;
  });
}

function processLeave(leaveId, status) {
  const l = leaves.find(x => x.id === leaveId);
  if (l) {
    l.status = status;
    l.remark = prompt("Enter comment/remark:", status);
    setStorage("hcm_leaves", leaves);
    renderData();
  }
}

// Settings
const settingsForm = document.getElementById("settings-form");
if (settingsForm) {
  document.getElementById("setting-start-time").value = company.startTime;
  document.getElementById("setting-grace-minutes").value = company.graceMinutes;
  document.getElementById("setting-leave-quota").value = company.leaveQuota;

  settingsForm.addEventListener("submit", (e) => {
    e.preventDefault();
    company.startTime = document.getElementById("setting-start-time").value;
    company.graceMinutes = document.getElementById("setting-grace-minutes").value;
    company.leaveQuota = document.getElementById("setting-leave-quota").value;
    setStorage("hcm_company", company);
    alert("Company settings saved successfully!");
  });
}

// Payslip
function renderPayslip() {
  const box = document.getElementById("payslip-box");
  if (!box || !currentSession) return;
  box.innerHTML = `
    <h3>${company.name} - Monthly Payslip</h3>
    <hr style="margin:8px 0; border:none; border-top:1px solid var(--border-color);" />
    <p><strong>Employee:</strong> ${currentSession.name}</p>
    <p><strong>Department:</strong> ${currentSession.department}</p>
    <p><strong>Basic Salary:</strong> $${currentSession.salary}</p>
    <h4 style="margin-top:8px; color:var(--accent-gold);">Net Payable: $${currentSession.salary}</h4>
  `;
}

// Smart AI Assistant (Section 5)
function initAiAssistant() {
  const mainContent = document.querySelector(".main-content");
  if (!mainContent || !currentSession) return;
  if (document.getElementById("smart-ai-box")) return;

  const aiBox = document.createElement("div");
  aiBox.id = "smart-ai-box";
  aiBox.className = "card mt-20";

  if (currentSession.role === "admin") {
    aiBox.innerHTML = `
      <h3><i class="fa-solid fa-robot"></i> Smart HR Assistant (AI)</h3>
      <p class="subtitle mt-5">Ask: "How many employees do we have?" or "Who is on leave?"</p>
      <div style="display:flex; gap:10px; margin-top:10px;">
        <input type="text" id="ai-query" placeholder="Type query..." style="flex:1; padding:6px 10px; border:1px solid var(--border-color); border-radius:4px; font-size:11.5px;" />
        <button class="btn btn-primary" id="ai-btn">Ask</button>
      </div>
      <div id="ai-resp" class="mt-10" style="padding:8px; background:#fbf9f5; border-radius:4px; font-weight:500; display:none;"></div>
    `;
    mainContent.appendChild(aiBox);

    document.getElementById("ai-btn").addEventListener("click", () => {
      const q = document.getElementById("ai-query").value.toLowerCase();
      const resp = document.getElementById("ai-resp");
      resp.style.display = "block";
      const empCount = users.filter(u => u.role === "employee").length;
      const todayStr = new Date().toISOString().split("T")[0];
      const todayLeaves = leaves.filter(l => l.status === "Approved" && l.from <= todayStr && l.to >= todayStr).length;

      if (q.includes("employee") || q.includes("kitne")) {
        resp.innerText = `AI: Total active employees are ${empCount}[cite: 3].`;
      } else if (q.includes("leave") || q.includes("chutti")) {
        resp.innerText = `AI: Today there are ${todayLeaves} employee(s) on approved leave[cite: 3].`;
      } else {
        resp.innerText = `AI: Total employees: ${empCount}, On leave today: ${todayLeaves}[cite: 3].`;
      }
    });
  } else {
    aiBox.innerHTML = `
      <h3><i class="fa-solid fa-robot"></i> Smart HR Assistant (AI)</h3>
      <p class="subtitle mt-5">Ask: "How many leaves do I have left?" or "Was I late today?"</p>
      <div style="display:flex; gap:10px; margin-top:10px;">
        <input type="text" id="ai-query" placeholder="Type query..." style="flex:1; padding:6px 10px; border:1px solid var(--border-color); border-radius:4px; font-size:11.5px;" />
        <button class="btn btn-primary" id="ai-btn">Ask</button>
      </div>
      <div id="ai-resp" class="mt-10" style="padding:8px; background:#fbf9f5; border-radius:4px; font-weight:500; display:none;"></div>
    `;
    mainContent.appendChild(aiBox);

    document.getElementById("ai-btn").addEventListener("click", () => {
      const q = document.getElementById("ai-query").value.toLowerCase();
      const resp = document.getElementById("ai-resp");
      resp.style.display = "block";
      const myLeavesCount = leaves.filter(l => l.empId === currentSession.id && l.status === "Approved").reduce((acc, l) => acc + l.days, 0);
      const remainingLeaves = company.leaveQuota - myLeavesCount;
      const todayStr = new Date().toISOString().split("T")[0];
      const myTodayAtt = attendance.find(a => a.empId === currentSession.id && a.date === todayStr);

      if (q.includes("leave") || q.includes("baki")) {
        resp.innerText = `AI: You have ${remainingLeaves} leave days remaining out of your yearly quota[cite: 3].`;
      } else if (q.includes("late") || q.includes("status")) {
        resp.innerText = `AI: Your attendance status today is: ${myTodayAtt ? myTodayAtt.status : 'Not checked in yet'}[cite: 3].`;
      } else {
        resp.innerText = `AI: Remaining leave quota: ${remainingLeaves} days[cite: 3].`;
      }
    });
  }
}

function updateClock() {
  const el = document.getElementById("live-clock");
  if (el) el.innerText = new Date().toLocaleTimeString();
  const dateEl = document.getElementById("current-date");
  if (dateEl) dateEl.innerText = new Date().toDateString();
}
