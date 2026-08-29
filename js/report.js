// report.js — Member 1
const Report = (function () {

  const generateBtn = document.getElementById('generate-report-btn');
  const statusEl = document.getElementById('report-status');

  function setStatus(msg, cls) {
    statusEl.textContent = msg || '';
    statusEl.className = 'report-status' + (cls ? ' ' + cls : '');
  }

  function setLoading(isLoading) {
    generateBtn.disabled = isLoading;
    generateBtn.innerHTML = isLoading ? '<span class="spinner"></span>Generating Report…' : 'Generate Report';
  }

  function enableIfReady() {
    if (window.AppState && window.AppState.classification) {
      generateBtn.disabled = false;
      generateBtn.title = '';
    }
  }
  document.addEventListener('azhiyam:classificationResult', enableIfReady);
  enableIfReady();

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str == null ? '' : String(str);
    return div.innerHTML;
  }

  function buildVesselRows(vessels) {
    if (!vessels || vessels.length === 0) return '<tr><td colspan="4">No vessel data available.</td></tr>';
    return vessels.map((v) => `
      <tr>
        <td>${escapeHtml(v.vesselType)}${v.monitored ? ' (analyzed)' : ''}</td>
        <td>${v.frequency != null ? escapeHtml(v.frequency) + ' Hz' : '—'}</td>
        <td>${escapeHtml(v.status)}</td>
        <td class="status-${escapeHtml(v.noiseClass)}">${escapeHtml(v.noiseClass)}</td>
      </tr>`).join('');
  }

  const FALLBACK_TEMPLATE = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8">
    <title>Aazhiyam AI — Compliance Snapshot</title><style>
    body{font-family:Arial,sans-serif;background:#fff;color:#10262e;padding:40px;max-width:800px;margin:0 auto;}
    h1{color:#0d9488;border-bottom:2px solid #0d9488;padding-bottom:10px;}
    h2{color:#0f4c5c;margin-top:30px;}
    .summary-box{background:#f0fdfa;border:1px solid #14b8a6;border-radius:8px;padding:15px;margin:15px 0;}
    img{max-width:100%;border-radius:8px;border:1px solid #ccc;margin-top:10px;}
    table{width:100%;border-collapse:collapse;margin-top:10px;}
    th,td{text-align:left;padding:8px 10px;border-bottom:1px solid #ddd;font-size:0.9rem;}
    th{background:#f0fdfa;}
    .status-low{color:#16a34a;font-weight:bold;} .status-medium{color:#b45309;font-weight:bold;} .status-high{color:#dc2626;font-weight:bold;}
    .warning{color:#b45309;font-style:italic;}
    .footer-note{margin-top:40px;font-size:0.85rem;color:#557;}
    @media print{body{padding:0;}}
    </style></head><body>
    <h1>Aazhiyam AI — Compliance Snapshot</h1>
    <p>Generated: {{TIMESTAMP}}</p>
    <h2>Primary Analysis Result</h2>
    <div class="summary-box"><strong>{{SOURCE_LABEL}}</strong><br>
      Frequency: {{FREQUENCY}} Hz<br>
      Status: <span class="status-{{NOISE_CLASS}}">{{STATUS}}</span><br>
      Vessel type: {{VESSEL_TYPE}}</div>
    <h2>Digital Twin Snapshot</h2>{{SNAPSHOT_BLOCK}}
    <h2>Vessels in Corridor</h2>
    <table><thead><tr><th>Vessel</th><th>Frequency</th><th>Status</th><th>Severity</th></tr></thead>
    <tbody>{{VESSEL_ROWS}}</tbody></table>
    <h2>Copilot Recommendation</h2><div class="summary-box">{{COPILOT_TEXT}}</div>
    <h2>Environmental Note</h2>
    <p>Reducing vessel speed and adjusting routes in sensitive zones can meaningfully lower underwater noise exposure for marine life.</p>
    <div class="footer-note">Aazhiyam AI — Marine Acoustic Intelligence Platform</div>
    <script>window.addEventListener('load', function(){ window.print(); });</script>
    </body></html>`;

  async function loadTemplate() {
    try {
      const res = await fetch('report-template.html');
      if (!res.ok) throw new Error('Template fetch failed');
      return await res.text();
    } catch (err) {
      console.warn('[Report] Could not fetch report-template.html. Using built-in fallback template.', err);
      return FALLBACK_TEMPLATE;
    }
  }

  function populateTemplate(template, data) {
    const c = data.classification;
    const snapshotBlock = data.sceneSnapshot
      ? `<img src="${data.sceneSnapshot}" alt="Digital twin scene snapshot">`
      : `<p class="warning">Scene snapshot could not be captured. The rest of this report reflects real analysis data.</p>`;

    return template
      .replace(/{{TIMESTAMP}}/g, escapeHtml(new Date().toLocaleString()))
      .replace(/{{SOURCE_LABEL}}/g, escapeHtml(c.sourceLabel))
      .replace(/{{FREQUENCY}}/g, escapeHtml(c.frequency))
      .replace(/{{STATUS}}/g, escapeHtml(c.status))
      .replace(/{{NOISE_CLASS}}/g, escapeHtml(c.noiseClass))
      .replace(/{{VESSEL_TYPE}}/g, escapeHtml(c.vesselType))
      .replace(/{{SNAPSHOT_BLOCK}}/g, snapshotBlock)
      .replace(/{{VESSEL_ROWS}}/g, buildVesselRows(data.vessels))
      .replace(/{{COPILOT_TEXT}}/g, escapeHtml(data.copilotRecommendation));
  }

  async function generateReport() {
    if (!window.AppState || !window.AppState.classification) {
      setStatus('Run an analysis first.', 'error');
      return;
    }

    setLoading(true);
    setStatus('Preparing report…');

    try {
      const classification = window.AppState.classification;

      const vessels = (window.Scene3D && typeof window.Scene3D.getSceneSummary === 'function')
        ? window.Scene3D.getSceneSummary() : [];

      const sceneSnapshot = (window.Scene3D && typeof window.Scene3D.captureSnapshot === 'function')
        ? window.Scene3D.captureSnapshot() : null;

      const copilotRecommendation = window.AppState.lastCopilotReply || 'No copilot recommendations requested yet.';

      const template = await loadTemplate();
      const finalHTML = populateTemplate(template, { classification, vessels, sceneSnapshot, copilotRecommendation });

      const reportWindow = window.open('', '_blank');
      if (!reportWindow) throw new Error('Pop-up blocked. Please allow pop-ups for this site and try again.');

      reportWindow.document.open();
      reportWindow.document.write(finalHTML);
      reportWindow.document.close();

      setStatus('Report generated successfully — opened in a new tab.', 'ok');
      Toast.show('Report generated successfully.', 'success');
    } catch (err) {
      console.error('Report generation failed:', err);
      setStatus(err.message || 'Unable to generate report. Please try again.', 'error');
      Toast.show(err.message || 'Unable to generate report.', 'error');
    } finally {
      setLoading(false);
    }
  }

  generateBtn.addEventListener('click', generateReport);

  return { generateReport };

})();