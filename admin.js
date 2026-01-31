// Collect issues from localStorage set by script.js (frontend reporting)
let issues = [];
if (localStorage.getItem('issues')) {
    issues = JSON.parse(localStorage.getItem('issues'));
}

// Listen for changes in localStorage (real-time updates)
window.addEventListener('storage', function(e) {
    if (e.key === 'issues') {
        issues = JSON.parse(localStorage.getItem('issues'));
        renderAnalytics();
        renderFlaggedIssues();
        renderIssuesTable();
        renderAdminMapPins();
    }
});

// Demo: User list for banning (in real app, fetch from backend)
let bannedUsers = JSON.parse(localStorage.getItem('bannedUsers') || '[]');

// --- Analytics ---
function renderAnalytics() {
    document.getElementById('totalIssues').textContent = issues.length;
    // Most reported category
    const catCount = {};
    let verified = 0, anonymous = 0;
    issues.forEach(i => {
        catCount[i.type] = (catCount[i.type] || 0) + 1;
        if (i.reporterType === "Verified") verified++;
        if (i.reporterType === "Anonymous") anonymous++;
    });
    let topCat = '-';
    let max = 0;
    for (const cat in catCount) {
        if (catCount[cat] > max) {
            max = catCount[cat];
            topCat = cat;
        }
    }
    document.getElementById('topCategory').textContent = topCat;
    document.getElementById('totalVerified').textContent = verified;
    document.getElementById('totalAnonymous').textContent = anonymous;
}

// --- Flagged Issues ---
function renderFlaggedIssues() {
    const flaggedList = document.getElementById('flaggedList');
    flaggedList.innerHTML = '';
    const flagged = issues.filter(i => i.flags >= 3 && !i.hidden);
    if (flagged.length === 0) {
        flaggedList.innerHTML = `<div class="no-flagged"><i class='bx bx-info-circle'></i> No flagged issues pending review.</div>`;
        // Default map view
        initAdminMap();
        return;
    }
    // Focus map on the first flagged issue
    initAdminMap(flagged[0]);
    flagged.forEach((issue, idx) => {
        const card = document.createElement('div');
        card.className = 'flagged-card';
        card.innerHTML = `
            <div style="flex:1;cursor:pointer;">
                <div style="font-weight:600;color:#e74c3c;">${issue.type}</div>
                <div style="color:#444;margin-bottom:6px;">${issue.desc}</div>
                <div class="user-info">Reported by: ${issue.reporterType === 'Anonymous' ? 'Anonymous' : (issue.username || 'Verified')}</div>
                <div class="user-info">Flags: ${issue.flags}</div>
                <div class="status-log">
                    <strong>Status Log:</strong>
                    <ul style="padding-left:18px;margin:0;">
                        ${(issue.statusLog || []).map(log => `<li>${log.status} <span>(${log.timestamp})</span></li>`).join('')}
                    </ul>
                </div>
            </div>
            <div class="flagged-actions" style="margin-left:auto;display:flex;flex-direction:column;gap:10px;">
                <button class="btn-approve"><i class='bx bx-check'></i> Approve</button>
                <button class="btn-delete"><i class='bx bx-trash'></i> Delete</button>
                <button class="btn-ban"><i class='bx bx-block'></i> Ban User</button>
            </div>
        `;
        // Click to focus map on this issue
        card.querySelector('div[style*="flex:1"]').onclick = function() {
            initAdminMap(issue);
        };
        // Approve button
        card.querySelector('.btn-approve').onclick = function() {
            issue.flags = 0;
            issue.hidden = false;
            saveIssues();
            renderFlaggedIssues();
            renderAnalytics();
            showToast("Issue approved and restored.", "#27ae60");
        };
        // Delete button
        card.querySelector('.btn-delete').onclick = function() {
            issue.hidden = true;
            saveIssues();
            renderFlaggedIssues();
            renderAnalytics();
            showToast("Issue deleted.", "#e74c3c");
        };
        // Ban User button
        card.querySelector('.btn-ban').onclick = function() {
            if (issue.username && !bannedUsers.includes(issue.username)) {
                bannedUsers.push(issue.username);
                localStorage.setItem('bannedUsers', JSON.stringify(bannedUsers));
                showToast("User banned.", "#2980b9");
            } else {
                showToast("Cannot ban anonymous or already banned user.", "#e67e22");
            }
        };
        flaggedList.appendChild(card);
    });
}

// --- Ban User ---
document.getElementById('banUserBtn').onclick = function() {
    const username = document.getElementById('banUserInput').value.trim();
    const msg = document.getElementById('banUserMsg');
    if (!username) {
        msg.textContent = "Please enter a username.";
        msg.style.color = "#e74c3c";
        return;
    }
    if (bannedUsers.includes(username)) {
        msg.textContent = "User is already banned.";
        msg.style.color = "#e67e22";
        return;
    }
    bannedUsers.push(username);
    localStorage.setItem('bannedUsers', JSON.stringify(bannedUsers));
    msg.textContent = "User banned successfully.";
    msg.style.color = "#27ae60";
    setTimeout(() => msg.textContent = "", 3000);
};

// --- Save Issues ---
function saveIssues() {
    localStorage.setItem('issues', JSON.stringify(issues));
}

// --- Toast Notification ---
function showToast(msg, color="#2980b9") {
    const toast = document.createElement('div');
    toast.textContent = msg;
    toast.style = `position:fixed;bottom:32px;right:32px;background:${color};color:#fff;padding:14px 28px;border-radius:12px;box-shadow:0 2px 8px rgba(0,0,0,0.12);font-size:1.1em;z-index:3000;opacity:0;transition:opacity 0.3s;`;
    document.body.appendChild(toast);
    setTimeout(() => toast.style.opacity = "1", 50);
    setTimeout(() => { toast.style.opacity = "0"; setTimeout(() => toast.remove(), 400); }, 2600);
}

// --- Leaflet Map ---
// Add Leaflet map to admin dashboard
function initAdminMap(issueToFocus) {
    if (document.getElementById('adminMap')) {
        if (issueToFocus && issueToFocus.lat && issueToFocus.lng) {
            window.adminMap.setView([issueToFocus.lat, issueToFocus.lng], 15);
            const marker = L.marker([issueToFocus.lat, issueToFocus.lng]).addTo(window.adminMap);
            marker.bindPopup(`<b>${issueToFocus.type}</b><br>${issueToFocus.desc}`).openPopup();
            setTimeout(() => marker.remove(), 2500);
        }
        return;
    }
    const mapDiv = document.createElement('div');
    mapDiv.id = 'adminMap';
    mapDiv.style = 'width:100%;height:350px;border-radius:14px;margin-bottom:32px;';
    document.querySelector('.admin-card').insertBefore(mapDiv, document.querySelector('.analytics'));
    window.adminMap = L.map('adminMap').setView(
        issueToFocus && issueToFocus.lat && issueToFocus.lng
            ? [issueToFocus.lat, issueToFocus.lng]
            : [28.6139, 77.2090], // Delhi default
        issueToFocus && issueToFocus.lat && issueToFocus.lng ? 15 : 12
    );
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(window.adminMap);

    // If focusing on an issue, add marker
    if (issueToFocus && issueToFocus.lat && issueToFocus.lng) {
        const marker = L.marker([issueToFocus.lat, issueToFocus.lng]).addTo(window.adminMap);
        marker.bindPopup(`<b>${issueToFocus.type}</b><br>${issueToFocus.desc}`).openPopup();
        setTimeout(() => marker.remove(), 2500);
    }
}

// Show all issue locations as pins on the admin map
function renderAdminMapPins() {
    if (!window.adminMap) return;
    window.adminMap.eachLayer(function(layer) {
        if (layer instanceof L.Marker) window.adminMap.removeLayer(layer);
    });
    issues.forEach(issue => {
        if (issue.lat && issue.lng && !issue.hidden) {
            const marker = L.marker([issue.lat, issue.lng]).addTo(window.adminMap);
            marker.bindPopup(`
                <b>${issue.type}</b><br>
                ${issue.desc}<br>
                <span style="color:#888;">${issue.status}</span>
            `);
        }
    });
}

// Scroll to map and focus on issue location when admin clicks an issue card
function focusIssueOnMap(issue) {
    if (issue.lat && issue.lng && window.adminMap) {
        window.adminMap.setView([issue.lat, issue.lng], 15);
        const marker = L.marker([issue.lat, issue.lng]).addTo(window.adminMap);
        marker.bindPopup(`<b>${issue.type}</b><br>${issue.desc}`).openPopup();
        setTimeout(() => marker.remove(), 2500); // Remove temp marker after 2.5s
        document.getElementById('adminMap').scrollIntoView({ behavior: 'smooth' });
    }
}

// Show only the location of the current problem on the map
function showProblemLocationOnMap(issue) {
    // Remove existing map if present
    if (window.adminMap) {
        window.adminMap.remove();
        window.adminMap = null;
    }
    // Create map container if not present
    let mapDiv = document.getElementById('adminMap');
    if (!mapDiv) {
        mapDiv = document.createElement('div');
        mapDiv.id = 'adminMap';
        mapDiv.style = 'width:100%;height:350px;border-radius:14px;margin-bottom:32px;';
        document.querySelector('.admin-card').insertBefore(mapDiv, document.querySelector('.analytics'));
    }
    // Only show map if issue has location
    if (issue && issue.lat && issue.lng) {
        window.adminMap = L.map('adminMap').setView([issue.lat, issue.lng], 15);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
        }).addTo(window.adminMap);
        const marker = L.marker([issue.lat, issue.lng]).addTo(window.adminMap);
        marker.bindPopup(`<b>${issue.type}</b><br>${issue.desc}`).openPopup();
    } else {
        document.getElementById('adminMap').innerHTML = "<div style='text-align:center;padding:40px;color:#888;'>No location data for this issue.</div>";
    }
}

// --- Table of All Issues ---
function renderIssuesTable() {
    let tableDiv = document.getElementById('issuesTableDiv');
    if (!tableDiv) {
        tableDiv = document.createElement('div');
        tableDiv.id = 'issuesTableDiv';
        tableDiv.style = 'margin-bottom:38px;';
        document.querySelector('.admin-card').insertBefore(tableDiv, document.querySelector('.flagged-list'));
    }
    let tableHTML = `
        <div class="section-title"><i class='bx bx-table'></i> All Reported Issues</div>
        <table style="width:100%;border-collapse:collapse;background:#f9fafc;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.04);">
            <thead>
                <tr style="background:#e0eafc;color:#2a3f54;">
                    <th style="padding:10px;">Type</th>
                    <th style="padding:10px;">Description</th>
                    <th style="padding:10px;">Location</th>
                    <th style="padding:10px;">Status</th>
                    <th style="padding:10px;">Change Status</th>
                    <th style="padding:10px;">Flags</th>
                </tr>
            </thead>
            <tbody>
    `;
    issues.forEach((issue, idx) => {
        if (issue.hidden) return;
        tableHTML += `
            <tr style="border-bottom:1px solid #eee;">
                <td style="padding:10px;">${issue.type}</td>
                <td style="padding:10px;">${issue.desc}</td>
                <td style="padding:10px;">
                    ${issue.location ? issue.location : 'N/A'}
                    ${issue.lat && issue.lng ? `<button style="margin-left:8px;padding:4px 10px;border-radius:6px;background:#2980b9;color:#fff;border:none;cursor:pointer;font-size:0.95em;" onclick="window.focusIssueOnMapFromTable(${idx})">View</button>` : ''}
                </td>
                <td style="padding:10px;">${issue.status}</td>
                <td style="padding:10px;">
                    <select style="padding:4px 8px;border-radius:6px;" onchange="window.changeIssueStatus(${idx}, this.value)">
                        <option value="Open" ${issue.status === "Open" ? "selected" : ""}>Open</option>
                        <option value="In Progress" ${issue.status === "In Progress" ? "selected" : ""}>In Progress</option>
                        <option value="Resolved" ${issue.status === "Resolved" ? "selected" : ""}>Resolved</option>
                    </select>
                </td>
                <td style="padding:10px;">${issue.flags || 0}</td>
            </tr>
        `;
    });
    tableHTML += `</tbody></table>`;
    tableDiv.innerHTML = tableHTML;
}

// Helper for status change from table
window.changeIssueStatus = function(idx, newStatus) {
    issues[idx].status = newStatus;
    if (!issues[idx].statusLog) issues[idx].statusLog = [];
    issues[idx].statusLog.push({
        status: newStatus,
        timestamp: new Date().toLocaleString()
    });
    saveIssues();
    renderIssuesTable();
    renderFlaggedIssues();
    renderAnalytics();
    showToast("Status updated.", "#27ae60");
};

// Helper for focusing map from table
window.focusIssueOnMapFromTable = function(idx) {
    showProblemLocationOnMap(issues[idx]);
    document.getElementById('adminMap').scrollIntoView({ behavior: 'smooth' });
};

// --- Initial Render ---
renderAnalytics();
renderFlaggedIssues();
renderIssuesTable();