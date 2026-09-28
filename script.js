const authScreen = document.getElementById('auth-screen');
const appShell = document.getElementById('app-shell');
const loginForm = document.getElementById('login-form');
const scannerForm = document.getElementById('scanner-form');
const authStatus = document.getElementById('auth-status');
const fileInput = document.getElementById('file-input');
const filePreview = document.getElementById('file-preview');
const sourceInput = document.getElementById('source-input');
const transcriptionOutput = document.getElementById('transcription-output');
const scanButton = document.getElementById('scan-button');
const saveButton = document.getElementById('save-button');
const clearButton = document.getElementById('clear-button');
const recordsTableBody = document.getElementById('records-table-body');
const searchInput = document.getElementById('search-input');
const statusFilter = document.getElementById('status-filter');
const recordModal = document.getElementById('record-modal');
const closeRecordModal = document.getElementById('close-record-modal');
const recordModalTitle = document.getElementById('record-modal-title');
const recordModalImage = document.getElementById('record-modal-image');
const recordModalText = document.getElementById('record-modal-text');
const welcomeTitle = document.getElementById('welcome-title');
const welcomeCopy = document.getElementById('welcome-copy');
const statNotes = document.getElementById('stat-notes');
const statPending = document.getElementById('stat-pending');
const statReviewed = document.getElementById('stat-reviewed');
const toast = document.getElementById('toast');
const logoutBtn = document.getElementById('logout-btn');
const navButtons = Array.from(document.querySelectorAll('.nav-btn'));
const views = Array.from(document.querySelectorAll('.view'));

const VALID_USERS = {
  staff: 'guada2026',
  admin: 'health2026',
};
const RECORDS_KEY = 'guadahealth-records';
const AUTH_KEY = 'guadahealth-auth';

let currentUser = '';
let records = [];
let activeView = 'dashboard';
let previewUrl = '';

function loadRecords() {
  const saved = localStorage.getItem(RECORDS_KEY);
  if (saved) {
    return JSON.parse(saved);
  }

  return [
    {
      id: 'seed-1',
      source: 'Cardiology consult',
      transcription: 'Patient reported persistent fatigue. Medication reviewed and updated for follow-up.',
      status: 'Pending review',
      savedAt: '2026-08-10 09:15',
      owner: 'staff',
    },
    {
      id: 'seed-2',
      source: 'Neurology referral',
      transcription: 'Referral completed. Patient scheduled for outpatient review next week.',
      status: 'Reviewed',
      savedAt: '2026-08-10 11:05',
      owner: 'admin',
    },
  ];
}

function saveRecords() {
  localStorage.setItem(RECORDS_KEY, JSON.stringify(records));
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('show');
  window.clearTimeout(showToast.timeoutId);
  showToast.timeoutId = window.setTimeout(() => {
    toast.classList.remove('show');
  }, 2200);
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function setFormEnabled(enabled) {
  const elements = [fileInput, sourceInput, transcriptionOutput, scanButton, saveButton, clearButton];
  elements.forEach((element) => {
    element.disabled = !enabled;
  });
}

function showAuthView() {
  authScreen.classList.remove('hidden');
  appShell.classList.add('hidden');
}

function showAppView() {
  authScreen.classList.add('hidden');
  appShell.classList.remove('hidden');
}

function setAuthenticated(username) {
  currentUser = username;
  localStorage.setItem(AUTH_KEY, username);
  authStatus.textContent = `Signed in as ${username}`;
  welcomeTitle.textContent = `Welcome back, ${username}`;
  welcomeCopy.textContent = 'Your transcriptions are ready to review, save, and route into the institution records archive.';
  setFormEnabled(true);
  showAppView();
  showToast(`Signed in as ${username}`);
}

function setLoggedOut() {
  currentUser = '';
  localStorage.removeItem(AUTH_KEY);
  authStatus.textContent = 'Not signed in';
  welcomeTitle.textContent = 'Welcome to the transcription workspace';
  welcomeCopy.textContent = 'Sign in to upload doctor notes, review plain-text transcriptions, and save them into the institutional archive.';
  setFormEnabled(false);
  showAuthView();
}

function renderDashboardStats() {
  statNotes.textContent = String(records.length);
  statPending.textContent = String(records.filter((record) => record.status === 'Pending review').length);
  statReviewed.textContent = String(records.filter((record) => record.status === 'Reviewed').length);
}

function renderRecords() {
  const query = searchInput.value.trim().toLowerCase();
  const visibleRecords = records.filter((record) => {
    return [record.source, record.transcription].join(' ').toLowerCase().includes(query);
  });

  if (!visibleRecords.length) {
    recordsTableBody.innerHTML = `
      <tr>
        <td colspan="4">No matching notes found.</td>
      </tr>
    `;
    return;
  }

  recordsTableBody.innerHTML = visibleRecords
    .map((record) => {
      return `
        <tr>
          <td>${escapeHtml(record.source || 'Untitled note')}</td>
          <td><span class="badge reviewed">Reviewed by clinician</span></td>
          <td>${escapeHtml(record.savedAt)}</td>
          <td>
            <button class="ghost-btn view-record-btn" data-id="${record.id}" type="button">View note</button>
          </td>
        </tr>
      `;
    })
    .join('');
}

function switchView(viewName) {
  if (!currentUser) {
    showAuthView();
    return;
  }

  activeView = viewName;
  navButtons.forEach((button) => {
    button.classList.toggle('active', button.dataset.view === viewName);
  });
  views.forEach((view) => {
    view.classList.toggle('active', view.id === `${viewName}-view`);
  });
}

function clearForm() {
  scannerForm.reset();
  transcriptionOutput.value = '';
  if (previewUrl) {
    URL.revokeObjectURL(previewUrl);
    previewUrl = '';
  }
  filePreview.className = 'file-preview empty';
  filePreview.innerHTML = '<div class="preview-placeholder">Your selected document will appear here.</div>';
}

function openRecordModal(record) {
  recordModalTitle.textContent = record.source || 'Untitled note';
  recordModalText.textContent = record.transcription || 'No transcription saved.';

  if (record.imageData) {
    recordModalImage.innerHTML = `<img src="${record.imageData}" alt="Original document for ${escapeHtml(record.source || 'saved note')}" />`;
  } else {
    recordModalImage.innerHTML = '<div class="modal-empty-state">No image was saved with this older record.</div>';
  }

  recordModal.classList.remove('hidden');
}

function closeModal() {
  recordModal.classList.add('hidden');
}

function renderFilePreview() {
  const selectedFile = fileInput.files[0];
  if (!selectedFile) {
    filePreview.className = 'file-preview empty';
    filePreview.innerHTML = '<div class="preview-placeholder">Your selected document will appear here.</div>';
    return;
  }

  if (previewUrl) {
    URL.revokeObjectURL(previewUrl);
  }

  previewUrl = URL.createObjectURL(selectedFile);
  filePreview.className = 'file-preview';

  if (selectedFile.type.startsWith('image/')) {
    filePreview.innerHTML = `<img src="${previewUrl}" alt="Preview of ${escapeHtml(selectedFile.name)}" />`;
    return;
  }

  filePreview.innerHTML = `
    <div class="document-placeholder">
      <span class="document-icon">PDF</span>
      <strong>${escapeHtml(selectedFile.name)}</strong>
      <span>PDF selected. A visual preview is unavailable in this workspace.</span>
    </div>
  `;
}

loginForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const username = document.getElementById('username').value.trim().toLowerCase();
  const password = document.getElementById('password').value.trim();

  if (!username || !password) {
    showToast('Please enter both fields');
    return;
  }

  if (VALID_USERS[username] && VALID_USERS[username] === password) {
    setAuthenticated(username);
    loginForm.reset();
    switchView('transcribe');
  } else {
    showToast('Invalid credentials. Try staff / guada2026');
  }
});

fileInput.addEventListener('change', renderFilePreview);

scanButton.addEventListener('click', () => {
  if (!currentUser) {
    showToast('Please log in first');
    return;
  }

  const selectedFile = fileInput.files[0];
  if (!selectedFile) {
    transcriptionOutput.value = 'Choose a document first to generate a preview.';
    return;
  }

  const source = sourceInput.value.trim() || selectedFile.name;

  transcriptionOutput.value = `Transcription preview for ${source}\n\nReadable note:\nThe clinical summary has been standardized into plain language. Symptoms, medications, and follow-up instructions are now easier for staff to read and act on.`;
  showToast('Preview generated');
});

scannerForm.addEventListener('submit', (event) => {
  event.preventDefault();

  if (!currentUser) {
    showToast('Please log in first');
    return;
  }

  if (!fileInput.files[0]) {
    transcriptionOutput.value = 'No document selected. Upload one before saving.';
    return;
  }

  const source = sourceInput.value.trim() || fileInput.files[0].name;
  const record = {
    id: `note-${Date.now()}`,
    source,
    transcription: transcriptionOutput.value || 'No transcription generated yet.',
    status: 'Reviewed',
    savedAt: new Date().toLocaleString(),
    owner: currentUser,
  };

  if (fileInput.files[0].type.startsWith('image/')) {
    const reader = new FileReader();
    reader.addEventListener('load', () => {
      record.imageData = reader.result;
      records.unshift(record);
      saveRecords();
      renderDashboardStats();
      renderRecords();
      showToast(`Saved note for ${source}`);
      clearForm();
      switchView('records');
    });
    reader.readAsDataURL(fileInput.files[0]);
    return;
  }

  records.unshift(record);
  saveRecords();
  renderDashboardStats();
  renderRecords();
  showToast(`Saved note for ${source}`);
  clearForm();
  switchView('records');
});

clearButton.addEventListener('click', () => {
  clearForm();
  showToast('Form cleared');
});

navButtons.forEach((button) => {
  button.addEventListener('click', () => switchView(button.dataset.view));
});

logoutBtn.addEventListener('click', () => {
  setLoggedOut();
  switchView('dashboard');
  showToast('Signed out');
});

recordsTableBody.addEventListener('click', (event) => {
  const button = event.target.closest('.view-record-btn');
  if (!button) {
    return;
  }

  const noteId = button.dataset.id;
  const note = records.find((entry) => entry.id === noteId);
  if (!note) {
    return;
  }

  openRecordModal(note);
});

searchInput.addEventListener('input', renderRecords);
closeRecordModal.addEventListener('click', closeModal);
recordModal.addEventListener('click', (event) => {
  if (event.target === recordModal) {
    closeModal();
  }
});
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    closeModal();
  }
});

window.addEventListener('DOMContentLoaded', () => {
  records = loadRecords();
  renderDashboardStats();
  renderRecords();
  setLoggedOut();
});
