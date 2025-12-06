// --- State Management ---
let STORAGE_KEY = 'attendance_app_data';

let appData = {
    sections: [],
    currentSectionId: null,
    viewingDate: null,
    isEditingHistory: false
};

// --- DOM Elements ---
const els = {
    // App Elements 
    dashboardView: document.getElementById('dashboard-view'),
    sectionView: document.getElementById('section-view'),
    sectionsGrid: document.getElementById('sections-grid'),
    dashboardEmpty: document.getElementById('dashboard-empty'),
    dashAddSectionBtn: document.getElementById('dash-add-section-btn'),
    backBtn: document.getElementById('back-to-dash-btn'),
    currentSectionTitle: document.getElementById('current-section-title'),
    currentSectionSubject: document.getElementById('current-section-subject'),
    currentDate: document.getElementById('current-date'),
    sectionMenuBtn: document.getElementById('section-menu-btn'),
    dataDropdown: document.getElementById('data-dropdown'),
    historyBanner: document.getElementById('history-banner'),
    historyDateDisplay: document.getElementById('history-date-display'),
    exitHistoryBtn: document.getElementById('exit-history-btn'),
    sectionsList: document.getElementById('sections-list'),
    lockBtn: document.getElementById('lock-btn'),
    lockText: document.getElementById('lock-text'),
    lockIcon: document.querySelector('#lock-btn i'),
    openAddStudentBtn: document.getElementById('open-add-student-btn'),
    totalCount: document.getElementById('total-count'),
    presentCount: document.getElementById('present-count'),
    absentCount: document.getElementById('absent-count'),
    studentList: document.getElementById('student-list'),
    emptyState: document.getElementById('empty-state'),
    overlay: document.getElementById('modal-overlay'),
    addStudentModal: document.getElementById('add-student-modal'),
    addSectionModal: document.getElementById('add-section-modal'),
    historyLog: document.getElementById('history-log'),
    exportExcelBtn: document.getElementById('export-excel-btn'),
    deleteSectionFullBtn: document.getElementById('delete-section-full-btn'),
    newStudentInput: document.getElementById('new-student-name'),
    newSectionInput: document.getElementById('new-section-name'),
    newSectionSubject: document.getElementById('new-section-subject'),
    confirmAddStudent: document.getElementById('confirm-add-student'),
    confirmAddSection: document.getElementById('confirm-add-section'),
    // Mobile Navigation
    mobileMenuToggle: document.getElementById('mobile-menu-toggle'),
    mobileOverlay: document.getElementById('mobile-overlay'),
    sidebar: document.querySelector('.sidebar')
};

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    loadData();
    updateDateDisplay();
    render();

    // Mobile Menu Functionality
    initMobileMenu();

    // Dropdown Click Outside
    document.addEventListener('click', (e) => {
        if (!els.dataDropdown.classList.contains('hidden')) {
            if (!els.dataDropdown.contains(e.target) && !els.sectionMenuBtn.contains(e.target)) {
                els.dataDropdown.classList.add('hidden');
            }
        }
    });
});

// --- Mobile Menu Functions ---
function initMobileMenu() {
    // Toggle sidebar on mobile menu button click
    els.mobileMenuToggle.addEventListener('click', () => {
        toggleMobileSidebar();
    });

    // Close sidebar when clicking overlay
    els.mobileOverlay.addEventListener('click', () => {
        closeMobileSidebar();
    });

    // Close sidebar on window resize if screen becomes large
    window.addEventListener('resize', () => {
        if (window.innerWidth >= 1024) {
            closeMobileSidebar();
        }
    });
}

function toggleMobileSidebar() {
    els.sidebar.classList.toggle('active');
    els.mobileOverlay.classList.toggle('active');
}

function closeMobileSidebar() {
    els.sidebar.classList.remove('active');
    els.mobileOverlay.classList.remove('active');
}


function updateDateDisplay() {
    const dateOpts = { weekday: 'long', month: 'short', day: 'numeric' };
    els.currentDate.textContent = new Date().toLocaleDateString('en-US', dateOpts);
}

function getNowString() {
    const now = new Date();
    return now.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
    });
}

function getTodayString() { return getNowString(); }

function loadData() {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
        appData = JSON.parse(stored);
        appData.viewingDate = null;
        appData.isEditingHistory = false;
        appData.sections.forEach(s => {
            if (!s.history) s.history = {};
            if (!s.subject) s.subject = '';
        });
    } else {
        // New User / Fresh Start
        appData = {
            sections: [],
            currentSectionId: null,
            viewingDate: null,
            isEditingHistory: false
        };
    }
}

function saveData() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(appData));
}

function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
}

function createSectionObject(name, subject) {
    return {
        id: generateId(),
        name: name,
        subject: subject || '',
        students: [],
        history: {},
        isLocked: false,
        lastSavedDate: null,
        createdAt: Date.now()
    };
}

function getCurrentSection() {
    return appData.sections.find(s => s.id === appData.currentSectionId);
}

function getHistoryNode(section, sessionKey) {
    if (!section.history[sessionKey]) return null;
    const node = section.history[sessionKey];
    if (node.data && typeof node.modCount !== 'undefined') {
        return node;
    } else {
        return { data: node, modCount: 999, timestamp: 0 };
    }
}

function render() {
    renderSidebar();

    if (appData.currentSectionId) {
        els.dashboardView.classList.add('hidden');
        els.sectionView.classList.remove('hidden');
        renderSectionView();
    } else {
        els.sectionView.classList.add('hidden');
        els.dashboardView.classList.remove('hidden');
        renderDashboardView();
    }
}

function renderSidebar() {
    els.sectionsList.innerHTML = appData.sections.map(sec => `
        <li class="section-item ${sec.id === appData.currentSectionId ? 'active' : ''}" 
            onclick="switchSection('${sec.id}')">
            <span>${sec.name}</span>
            <button class="section-delete-btn" onclick="event.stopPropagation(); deleteSection('${sec.id}')">
                <i class="fa-solid fa-trash"></i>
            </button>
        </li>
    `).join('');
}

function renderDashboardView() {
    if (appData.sections.length === 0) {
        els.sectionsGrid.innerHTML = '';
        els.dashboardEmpty.classList.remove('hidden');
        return;
    }

    els.dashboardEmpty.classList.add('hidden');

    els.sectionsGrid.innerHTML = appData.sections.map(sec => {
        const total = sec.students.length;
        const savedCount = Object.keys(sec.history).length;

        return `
            <div class="section-card" onclick="switchSection('${sec.id}')">
                <div class="card-header">
                    <div>
                        <div class="card-title">${sec.name}</div>
                        <div class="card-subject">${sec.subject}</div>
                    </div>
                </div>
                <div class="card-stats">
                    <div class="c-stat">
                        <span class="val">${total}</span>
                        <span class="lbl">Students</span>
                    </div>
                     <div class="c-stat">
                        <span class="val" style="font-size:1rem; margin-top:4px;">
                            ${savedCount}
                        </span>
                        <span class="lbl">Records</span>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function renderSectionView() {
    const currentSection = getCurrentSection();
    if (!currentSection) return;

    els.currentSectionTitle.textContent = currentSection.name;
    els.currentSectionSubject.textContent = currentSection.subject;

    if (appData.viewingDate) {
        els.historyBanner.classList.remove('hidden');

        const historyNode = getHistoryNode(currentSection, appData.viewingDate);
        const modCount = historyNode ? historyNode.modCount : 0;

        if (appData.isEditingHistory) {
            els.historyDateDisplay.innerHTML = `${appData.viewingDate} <span style="font-size:0.8em; opacity:0.8;">(Editing...)</span>`;
            els.exitHistoryBtn.textContent = "Save Changes";
            els.exitHistoryBtn.onclick = saveHistoryChanges;
            els.exitHistoryBtn.classList.add('primary-btn');
        } else {
            els.historyDateDisplay.textContent = appData.viewingDate;
            els.exitHistoryBtn.textContent = "Return to Today";
            els.exitHistoryBtn.onclick = exitHistoryMode;
            els.exitHistoryBtn.classList.remove('primary-btn');

            const MAX_MODS = 2;
            const ONE_DAY_MS = 24 * 60 * 60 * 1000;
            const timeSince = Date.now() - (historyNode ? historyNode.timestamp : 0);

            let editBtn = document.getElementById('history-edit-btn');
            if (editBtn) editBtn.remove();

            if (historyNode && historyNode.timestamp > 0 && modCount < MAX_MODS && timeSince < ONE_DAY_MS) {
                const editsLeft = MAX_MODS - modCount;
                const newEditBtn = document.createElement('button');
                newEditBtn.id = 'history-edit-btn';
                newEditBtn.className = 'sm-btn';
                newEditBtn.style.marginRight = '10px';
                newEditBtn.innerHTML = `<i class="fa-solid fa-pen"></i> Edit (${editsLeft} left)`;
                newEditBtn.onclick = enableHistoryEdit;
                els.exitHistoryBtn.before(newEditBtn);
            }
        }

        els.lockBtn.style.display = 'none';
        els.openAddStudentBtn.style.display = 'none';

        renderStudentList(currentSection, appData.viewingDate);
        updateStats(currentSection, appData.viewingDate);

    } else {
        els.historyBanner.classList.add('hidden');
        els.lockBtn.style.display = 'flex';
        els.openAddStudentBtn.style.display = 'flex';
        updateLockUI(currentSection.isLocked);
        renderStudentList(currentSection, null);
        updateStats(currentSection, null);
    }
}

function renderStudentList(section, historyDate) {
    const sortedStudents = [...section.students].sort((a, b) => a.name.localeCompare(b.name));

    if (sortedStudents.length === 0) {
        els.studentList.innerHTML = '';
        els.emptyState.classList.remove('hidden');
        return;
    }

    els.emptyState.classList.add('hidden');

    let historicalData = null;
    if (historyDate) {
        const node = getHistoryNode(section, historyDate);
        historicalData = node ? node.data : {};
    }

    els.studentList.innerHTML = sortedStudents.map(student => {
        const initials = student.name.substring(0, 2).toUpperCase();
        let status = null;
        if (historyDate) {
            status = historicalData ? historicalData[student.id] : null;
        } else {
            status = student.status;
        }

        let rowClass = 'student-row';
        if (status === 'present') rowClass += ' present';
        if (status === 'absent') rowClass += ' absent';

        let interactionsDisabled = false;
        if (historyDate && !appData.isEditingHistory) interactionsDisabled = true;

        const btnDisabled = interactionsDisabled ? 'style="pointer-events:none; opacity:0.5;"' : '';
        const deleteStyle = historyDate ? 'style="display:none;"' : '';

        return `
            <li class="${rowClass}">
                <div class="student-info">
                    <div class="initial-avatar">${initials}</div>
                    <span class="student-name">${student.name}</span>
                </div>
                
                <div class="status-toggle" ${btnDisabled}>
                    <button class="status-btn check" onclick="setStatus('${student.id}', 'present')">
                        <i class="fa-solid fa-check"></i>
                    </button>
                    <button class="status-btn xmark" onclick="setStatus('${student.id}', 'absent')">
                        <i class="fa-solid fa-xmark"></i>
                    </button>
                </div>
                
                <div class="actions-cell" ${deleteStyle}>
                    <button class="delete-btn" onclick="removeStudent('${student.id}')">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </div>
            </li>
        `;
    }).join('');
}

function updateStats(section, historyDate) {
    let total = section.students.length;
    let present = 0;
    let absent = 0;

    if (historyDate) {
        const node = getHistoryNode(section, historyDate);
        const record = node ? node.data : {};
        section.students.forEach(s => {
            const stat = record[s.id];
            if (stat === 'present') present++;
            if (stat === 'absent') absent++;
        });
    } else {
        present = section.students.filter(s => s.status === 'present').length;
        absent = section.students.filter(s => s.status === 'absent').length;
    }

    els.totalCount.textContent = total;
    els.presentCount.textContent = present;
    els.absentCount.textContent = absent;
}

function updateLockUI(isLocked) {
    const body = document.body;
    if (isLocked) {
        body.classList.add('locked-mode');
        els.lockText.textContent = 'Session Saved';
        els.lockIcon.className = 'fa-solid fa-lock';
        els.lockBtn.title = 'Saved! Unlock to edit or Start New';
    } else {
        if (!appData.viewingDate) body.classList.remove('locked-mode');
        els.lockText.textContent = 'Save Session';
        els.lockIcon.className = 'fa-solid fa-floppy-disk';
        els.lockBtn.title = 'Save this Attendance Session';
    }
}

window.switchSection = (id) => {
    appData.currentSectionId = id;
    appData.viewingDate = null;
    appData.isEditingHistory = false;
    els.dataDropdown.classList.add('hidden');
    saveData();
    render();

    // Auto close sidebar on mobile/tablet
    if (window.innerWidth < 1024) {
        closeMobileSidebar();
    }
};

window.closeSection = () => {
    appData.currentSectionId = null;
    appData.viewingDate = null;
    appData.isEditingHistory = false;
    saveData();
    render();
};

window.setStatus = (studentId, status) => {
    const section = getCurrentSection();

    if (appData.viewingDate) {
        if (!appData.isEditingHistory) return;
        const node = getHistoryNode(section, appData.viewingDate);
        if (node && node.data) {
            node.data[studentId] = (node.data[studentId] === status) ? null : status;
            saveData();
            render();
        }
    } else {
        if (isLocked()) return;
        const student = section.students.find(s => s.id === studentId);
        if (student) {
            student.status = (student.status === status) ? null : status;
            saveData();
            render();
        }
    }
};

window.removeStudent = (studentId) => {
    if (appData.viewingDate || isLocked()) return;
    if (!confirm('Remove this student?')) return;
    const section = getCurrentSection();
    section.students = section.students.filter(s => s.id !== studentId);
    saveData();
    render();
};

window.deleteSection = (sectionId) => {
    if (confirm("Delete this section permanently?")) {
        appData.sections = appData.sections.filter(s => s.id !== sectionId);
        if (appData.currentSectionId === sectionId) {
            appData.currentSectionId = null;
        }
        saveData();
        render();
    }
}


function isLocked() {
    const section = getCurrentSection();
    return section && section.isLocked;
}

els.lockBtn.addEventListener('click', () => {
    const section = getCurrentSection();
    if (!section) return;

    if (section.isLocked) {
        if (confirm("Unlock to edit this live session?")) {
            section.isLocked = false;
            saveData();
            render();
        }
    } else {
        const sessionName = getNowString();

        const sessionRecord = {};
        section.students.forEach(s => {
            if (s.status) sessionRecord[s.id] = s.status;
        });
        section.history[sessionName] = {
            data: sessionRecord,
            modCount: 0,
            timestamp: Date.now()
        };
        section.lastSavedDate = sessionName;
        section.students.forEach(s => s.status = null);
        section.isLocked = false;
        saveData();
        render();
        alert(`Session saved as "${sessionName}"!\n\nBoard has been reset for the next session.`);
    }
});

window.enableHistoryEdit = () => {
    if (!appData.viewingDate) return;
    appData.isEditingHistory = true;
    render();
};

window.saveHistoryChanges = () => {
    const section = getCurrentSection();
    const node = getHistoryNode(section, appData.viewingDate);
    if (node) {
        node.modCount = (node.modCount || 0) + 1;
        if (node.modCount >= 2) {
            alert("Changes saved. \n\nYou have reached the limit of 2 edits for this session. It is now permanently locked.");
        } else {
            alert(`Changes saved. \n\nYou have ${2 - node.modCount} edits remaining.`);
        }
    }
    appData.isEditingHistory = false;
    saveData();
    render();
};

window.exitHistoryMode = () => {
    appData.viewingDate = null;
    appData.isEditingHistory = false;
    render();
};

els.sectionMenuBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const section = getCurrentSection();
    renderHistoryLog(section);
    els.dataDropdown.classList.toggle('hidden');
});

window.viewHistory = (date) => {
    appData.viewingDate = date;
    appData.isEditingHistory = false;
    render();
    els.dataDropdown.classList.add('hidden');
};

function renderHistoryLog(section) {
    const sessions = Object.keys(section.history).reverse();
    if (sessions.length === 0) {
        els.historyLog.innerHTML = '<p class="no-history">No saved records yet.</p>';
        return;
    }
    els.historyLog.innerHTML = sessions.map(sessionKey => {
        const node = section.history[sessionKey];
        return `
            <div class="history-item" onclick="viewHistory('${sessionKey}')">
                <span><i class="fa-regular fa-clock"></i> ${sessionKey}</span>
                <i class="fa-solid fa-eye view-icon"></i>
            </div>
        `;
    }).join('');
}

function exportToExcel() {
    const section = getCurrentSection();
    if (!section) return;

    const wb = XLSX.utils.book_new();
    const exportData = [];

    exportData.push(["EDUTRACK REPORT"]);
    exportData.push(["Section:", section.name, "", "Subject:", section.subject]);
    exportData.push([]);

    const columns = Object.keys(section.history);
    const headers = ['Student Name', ...columns];
    exportData.push(headers);

    const sortedStudents = [...section.students].sort((a, b) => a.name.localeCompare(b.name));

    sortedStudents.forEach(student => {
        const row = [student.name];
        columns.forEach(sessionKey => {
            const node = getHistoryNode(section, sessionKey);
            const sessionData = node ? node.data : {};
            let statusChar = '';
            if (sessionData) {
                const status = sessionData[student.id];
                if (status === 'present') statusChar = 'P';
                else if (status === 'absent') statusChar = 'A';
            }
            row.push(statusChar);
        });
        exportData.push(row);
    });

    const ws = XLSX.utils.aoa_to_sheet(exportData);
    if (!ws['!merges']) ws['!merges'] = [];
    ws['!merges'].push({ s: { r: 0, c: 0 }, e: { r: 0, c: 5 } });
    ws['!cols'] = [{ wch: 25 }];

    XLSX.utils.book_append_sheet(wb, ws, "Report");
    XLSX.writeFile(wb, `EduTrack_${section.name}.xlsx`);

    els.dataDropdown.classList.add('hidden');
}

els.exportExcelBtn.addEventListener('click', () => {
    if (typeof XLSX === 'undefined') {
        alert("Excel library not loaded.");
        return;
    }
    exportToExcel();
});

els.deleteSectionFullBtn.addEventListener('click', () => {
    const section = getCurrentSection();
    if (confirm(`DELETE section "${section.name}" forever?`)) {
        appData.sections = appData.sections.filter(s => s.id !== section.id);
        appData.currentSectionId = null;
        saveData();
        render();
        els.dataDropdown.classList.add('hidden');
    }
});

function openModal(modal) {
    els.overlay.classList.remove('hidden');
    modal.classList.remove('hidden');
}

function closeModals() {
    els.overlay.classList.add('hidden');
    document.querySelectorAll('.modal').forEach(m => m.classList.add('hidden'));
}

els.overlay.addEventListener('click', (e) => { if (e.target === els.overlay) closeModals(); });
document.querySelectorAll('.close-modal').forEach(btn => btn.addEventListener('click', closeModals));

els.dashAddSectionBtn.addEventListener('click', () => { openModal(els.addSectionModal); els.newSectionInput.focus(); });
els.openAddStudentBtn.addEventListener('click', () => { openModal(els.addStudentModal); els.newStudentInput.focus(); });

els.confirmAddSection.addEventListener('click', () => {
    const name = els.newSectionInput.value.trim();
    const subject = els.newSectionSubject.value.trim();
    if (!name) return;
    const newSec = createSectionObject(name, subject);
    appData.sections.push(newSec);
    appData.currentSectionId = newSec.id;
    saveData(); render(); closeModals();
    els.newSectionInput.value = ''; els.newSectionSubject.value = '';
});

els.confirmAddStudent.addEventListener('click', () => {
    const name = els.newStudentInput.value.trim();
    if (!name) return;
    const section = getCurrentSection();
    section.students.push({ id: generateId(), name: name, status: null });
    saveData(); render(); closeModals();
    els.newStudentInput.value = '';
});

els.newStudentInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') els.confirmAddStudent.click(); });
els.newSectionInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') els.confirmAddSection.click(); });
els.newSectionSubject.addEventListener('keypress', (e) => { if (e.key === 'Enter') els.confirmAddSection.click(); });
els.backBtn.addEventListener('click', window.closeSection);
