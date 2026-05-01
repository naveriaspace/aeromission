// Google Drive & Calendar integration layer
// Uses Google Identity Services (GIS) + Google APIs

const SCOPES = [
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/calendar.readonly',
  'https://www.googleapis.com/auth/calendar.events',
].join(' ');

const DISCOVERY_DOCS = [
  'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest',
  'https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest',
];

// These are set at runtime via the Settings panel
let _config = {
  clientId: '',
  apiKey: '',
  masterFileId: null,
};

let _tokenClient = null;
let _gapiReady = false;
let _gisReady = false;
let _onAuthChange = null;

export function setConfig(config) {
  _config = { ..._config, ...config };
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('gantt_gapi_config', JSON.stringify({
      clientId: _config.clientId,
      apiKey: _config.apiKey,
      masterFileId: _config.masterFileId,
    }));
  }
}

export function loadConfig() {
  try {
    const stored = localStorage.getItem('gantt_gapi_config');
    if (stored) _config = { ..._config, ...JSON.parse(stored) };
  } catch (e) {}
  return _config;
}

export function onAuthChange(cb) { _onAuthChange = cb; }

// ── GAPI load ──────────────────────────────────────────────────────────────
export function initGapi(apiKey) {
  return new Promise((resolve) => {
    window.gapi.load('client', async () => {
      await window.gapi.client.init({
        apiKey,
        discoveryDocs: DISCOVERY_DOCS,
      });
      _gapiReady = true;
      resolve();
    });
  });
}

// ── GIS token client ───────────────────────────────────────────────────────
export function initGis(clientId) {
  return new Promise((resolve) => {
    _tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: SCOPES,
      callback: (resp) => {
        if (resp.error) { console.error(resp); return; }
        _onAuthChange && _onAuthChange(true);
      },
    });
    _gisReady = true;
    resolve();
  });
}

export function requestToken() {
  if (!_tokenClient) return;
  _tokenClient.requestAccessToken({ prompt: '' });
}

export function revokeToken() {
  const token = window.gapi.client.getToken();
  if (token) {
    window.google.accounts.oauth2.revoke(token.access_token);
    window.gapi.client.setToken('');
    _onAuthChange && _onAuthChange(false);
  }
}

export function isSignedIn() {
  const token = window.gapi?.client?.getToken();
  return !!(token && token.access_token);
}

// ── Drive helpers ──────────────────────────────────────────────────────────
export async function loadMasterFile(fileId) {
  if (!fileId) return null;
  try {
    const res = await window.gapi.client.drive.files.get({
      fileId,
      alt: 'media',
    });
    return typeof res.body === 'string' ? JSON.parse(res.body) : res.result;
  } catch (e) {
    if (e.status === 403 || e.status === 404) return null;
    throw e;
  }
}

export async function saveMasterFile(fileId, data) {
  const body = JSON.stringify(data, null, 2);
  const boundary = '-------314159265358979323846';
  const delimiter = `\r\n--${boundary}\r\n`;
  const close_delim = `\r\n--${boundary}--`;

  const metadata = { mimeType: 'application/json' };
  const multipartBody =
    delimiter +
    'Content-Type: application/json\r\n\r\n' +
    JSON.stringify(metadata) +
    delimiter +
    'Content-Type: application/json\r\n\r\n' +
    body +
    close_delim;

  return window.gapi.client.request({
    path: `/upload/drive/v3/files/${fileId}`,
    method: 'PATCH',
    params: { uploadType: 'multipart' },
    headers: { 'Content-Type': `multipart/related; boundary="${boundary}"` },
    body: multipartBody,
  });
}

export async function createMasterFile(name = 'AeroMission_Data.json') {
  const metadata = { name, mimeType: 'application/json' };
  const res = await window.gapi.client.drive.files.create({
    resource: metadata,
    fields: 'id,name,webViewLink',
  });
  return res.result;
}

// ── Calendar helpers ───────────────────────────────────────────────────────
export async function fetchCalendarEvents(calendarId = 'primary', days = 90) {
  const timeMin = new Date().toISOString();
  const timeMax = new Date(Date.now() + days * 86400000).toISOString();
  try {
    const res = await window.gapi.client.calendar.events.list({
      calendarId,
      timeMin,
      timeMax,
      maxResults: 250,
      singleEvents: true,
      orderBy: 'startTime',
    });
    return res.result.items || [];
  } catch (e) {
    console.error('Calendar fetch error', e);
    return [];
  }
}

export async function createCalendarEvent(calendarId = 'primary', event) {
  try {
    const res = await window.gapi.client.calendar.events.insert({
      calendarId,
      resource: event,
    });
    return res.result;
  } catch (e) {
    console.error('Calendar create error', e);
    return null;
  }
}

export async function updateCalendarEvent(calendarId = 'primary', eventId, event) {
  try {
    const res = await window.gapi.client.calendar.events.update({
      calendarId,
      eventId,
      resource: event,
    });
    return res.result;
  } catch (e) {
    console.error('Calendar update error', e);
    return null;
  }
}
