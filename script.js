// Initialize map
const map = L.map('map').setView([28.6139, 77.2090], 12); // Delhi default
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
}).addTo(map);

// Store issues in memory (for demo)
let issues = [];

// Add marker on map click
let tempMarker = null;
map.on('click', function(e) {
    if (tempMarker) map.removeLayer(tempMarker);
    tempMarker = L.marker(e.latlng).addTo(map);
    document.getElementById('issueLocation').value = `Lat: ${e.latlng.lat.toFixed(4)}, Lon: ${e.latlng.lng.toFixed(4)}`;
});

function saveIssues() {
    localStorage.setItem('issues', JSON.stringify(issues));
}

// Handle form submit
document.getElementById('reportForm').onsubmit = function(e) {
    e.preventDefault();
    const type = document.getElementById('issueType').value;
    const location = document.getElementById('issueLocation').value;
    const desc = document.getElementById('issueDesc').value;
    const status = "Open";
    const date = new Date().toLocaleString();
    const reporterType = document.querySelector('input[name="reporterType"]:checked').value;

    // Get coordinates from marker if present
    let lat = null, lng = null;
    if (tempMarker) {
        const pos = tempMarker.getLatLng();
        lat = pos.lat;
        lng = pos.lng;
    }

    // Handle image
    const imageInput = document.getElementById('issueImage');
    let imageURL = "";
    if (imageInput.files[0]) {
        imageURL = URL.createObjectURL(imageInput.files[0]);
    }

    // Handle video
    const videoInput = document.getElementById('issueVideo');
    let videoURL = "";
    if (videoInput.files[0]) {
        videoURL = URL.createObjectURL(videoInput.files[0]);
    }

    // When reporting a new issue
    const issue = {
        type, location, desc, status, date, imageURL, videoURL, lat, lng, reporterType,
        statusLog: [{ status: "Open", timestamp: date }]
    };
    issues.unshift(issue);
    saveIssues(); // <--- Save to localStorage
    renderIssues();
    this.reset();
    if (tempMarker) map.removeLayer(tempMarker);
    tempMarker = null;
};

function getDistanceKm(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2-lat1) * Math.PI/180;
    const dLon = (lon2-lon1) * Math.PI/180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(lat1 * Math.PI/180) * Math.cos(lat2 * Math.PI/180) *
        Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

function checkIssueInteraction(issue) {
    if (userLocation && issue.lat && issue.lng) {
        const dist = getDistanceKm(userLocation.lat, userLocation.lng, issue.lat, issue.lng);
        if (dist > 5) {
            alert("You can only interact with issues in your neighborhood zone (within 5 km).");
            return false;
        }
    }
    return true;
}

function getFilteredIssues() {
    const status = document.getElementById('filterStatus').value;
    const category = document.getElementById('filterCategory').value;
    const distance = parseInt(document.getElementById('filterDistance').value, 10);
    return issues.filter(issue => {
        if (issue.hidden) return false;
        if (status && issue.status !== status) return false;
        if (category && issue.type !== category) return false;
        if (userLocation && issue.lat && issue.lng) {
            const dist = getDistanceKm(userLocation.lat, userLocation.lng, issue.lat, issue.lng);
            if (dist > distance) return false;
        }
        return true;
    });
}

// Render issues list
function renderIssues() {
    const list = document.getElementById('issuesList');
    list.innerHTML = '';
    getFilteredIssues().forEach((issue, idx) => {
        // Only show issues within 5km of user
        if (userLocation && issue.lat && issue.lng) {
            const dist = getDistanceKm(userLocation.lat, userLocation.lng, issue.lat, issue.lng);
            if (dist > 5) return; // Hide issues outside zone
        }
        const card = document.createElement('div');
        card.className = 'issue-card';
        let mediaHTML = '';
        if (issue.imageURL) {
            mediaHTML += `<img src="${issue.imageURL}" alt="Issue Image" style="max-width:120px;max-height:90px;border-radius:8px;margin-right:12px;">`;
        }
        if (issue.videoURL) {
            mediaHTML += `<video src="${issue.videoURL}" controls style="max-width:120px;max-height:90px;border-radius:8px;"></video>`;
        }
        card.innerHTML = `
            <div style="display:flex;align-items:flex-start;gap:12px;">
                ${mediaHTML}
                <div>
                    <div class="issue-type">${issue.type}</div>
                    <div class="issue-desc">${issue.desc}</div>
                    <div class="issue-meta">${issue.location} &bull; ${issue.date}</div>
                    <div class="issue-meta" style="font-weight:600;color:${issue.reporterType === 'Anonymous' ? '#e67e22' : '#2980b9'};">
                        ${issue.reporterType === 'Anonymous' ? 'Anonymous Reporter' : 'Verified Reporter'}
                    </div>
                </div>
            </div>
            <div class="issue-status status-${issue.status.toLowerCase().replace(' ', '')}">${issue.status}</div>
        `;
        // Status dropdown
        const statusSelect = document.createElement('select');
        statusSelect.innerHTML = `
            <option value="Open" ${issue.status === "Open" ? "selected" : ""}>Open</option>
            <option value="In Progress" ${issue.status === "In Progress" ? "selected" : ""}>In Progress</option>
            <option value="Resolved" ${issue.status === "Resolved" ? "selected" : ""}>Resolved</option>
        `;
        statusSelect.style.marginLeft = "18px";
        statusSelect.onchange = function() {
            if (!checkIssueInteraction(issue)) return;
            issues[idx].status = this.value;
            issues[idx].statusLog.push({
                status: this.value,
                timestamp: new Date().toLocaleString()
            });
            saveIssues(); // <--- Save to localStorage
            renderIssues();
            showStatusNotification(issue);
        };
        card.appendChild(statusSelect);

        const detailsBtn = document.createElement('button');
        detailsBtn.textContent = "Details";
        detailsBtn.style = "margin-left:18px;padding:6px 14px;border-radius:8px;background:#2980b9;color:#fff;border:none;cursor:pointer;";
        detailsBtn.onclick = function() {
            showStatusSlidebar(issue);
        };
        card.appendChild(detailsBtn);

        const flagBtn = document.createElement('button');
        flagBtn.textContent = "Flag";
        flagBtn.style = "margin-left:12px;padding:6px 14px;border-radius:8px;background:#e74c3c;color:#fff;border:none;cursor:pointer;";
        flagBtn.onclick = function() {
            issue.flags = (issue.flags || 0) + 1;
            if (issue.flags >= 3) {
                issue.hidden = true;
                alert("This report has been hidden pending review.");
            } else {
                alert("Report flagged. If flagged by more users, it will be hidden.");
            }
            saveIssues(); // <--- Save to localStorage
            renderIssues();
        };
        card.appendChild(flagBtn);

        list.appendChild(card);
    });
    renderMapPins();
}

// Render map pins
function renderMapPins() {
    // Remove old pins except tempMarker and user marker
    map.eachLayer(function(layer) {
        if (layer instanceof L.Marker && layer !== tempMarker && !layer._popup || (layer._popup && layer._popup.getContent() !== "Your Location")) {
            map.removeLayer(layer);
        }
    });
    issues.forEach(issue => {
        if (issue.lat && issue.lng && !issue.hidden) {
            const pin = L.marker([issue.lat, issue.lng]).addTo(map);
            pin.bindPopup(`
                <b>${issue.type}</b><br>
                ${issue.desc}<br>
                <span style="color:#888;">${issue.status}</span>
            `);
        }
    });
}

// Initial render
renderIssues();

let userLocation = null;

// Custom icon for user's location
const userIcon = L.icon({
    iconUrl: 'https://cdn-icons-png.flaticon.com/512/64/64113.png', // Example: blue marker icon
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32]
});

// Try GPS first
if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(function(pos) {
        userLocation = {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude
        };
        map.setView([userLocation.lat, userLocation.lng], 13);
        L.marker([userLocation.lat, userLocation.lng], { icon: userIcon })
            .addTo(map)
            .bindPopup("Your Location")
            .openPopup();
        renderIssues();
    }, function() {
        // If denied, prompt user to click on map to set location
        map.once('click', function(e) {
            userLocation = { lat: e.latlng.lat, lng: e.latlng.lng };
            map.setView([userLocation.lat, userLocation.lng], 13);
            L.marker([userLocation.lat, userLocation.lng], { icon: userIcon })
                .addTo(map)
                .bindPopup("Your Location")
                .openPopup();
            renderIssues();
        });
        alert("Please click on the map to set your neighborhood location.");
    });
} else {
    // Manual location only
    map.once('click', function(e) {
        userLocation = { lat: e.latlng.lat, lng: e.latlng.lng };
        map.setView([userLocation.lat, userLocation.lng], 13);
        L.marker([userLocation.lat, userLocation.lng], { icon: userIcon })
            .addTo(map)
            .bindPopup("Your Location")
            .openPopup();
        renderIssues();
    });
    alert("Please click on the map to set your neighborhood location.");
}

function showStatusSlidebar(issue) {
    document.getElementById('statusSlidebar').style.transform = 'translateX(0%)';
    const details = document.getElementById('slidebarDetails');
    details.innerHTML = `
        <div style="font-weight:600;color:#2a3f54;margin-bottom:8px;">${issue.type}</div>
        <div style="color:#444;margin-bottom:8px;">${issue.desc}</div>
        <div style="color:#888;margin-bottom:8px;">${issue.location}</div>
        <div style="margin-bottom:18px;">
            <strong>Status Logs:</strong>
            <ul style="padding-left:18px;">
                ${issue.statusLog.map(log => `<li>${log.status} <span style="color:#888;">(${log.timestamp})</span></li>`).join('')}
            </ul>
        </div>
    `;
}
document.getElementById('closeSlidebar').onclick = function() {
    document.getElementById('statusSlidebar').style.transform = 'translateX(100%)';
};

function showStatusNotification(issue) {
    const notif = document.createElement('div');
    notif.textContent = `Status of your issue "${issue.type}" updated to "${issue.status}".`;
    notif.style = "position:fixed;bottom:32px;right:32px;background:#27ae60;color:#fff;padding:14px 28px;border-radius:12px;box-shadow:0 2px 8px rgba(0,0,0,0.12);font-size:1.1em;z-index:3000;";
    document.body.appendChild(notif);
    setTimeout(() => notif.remove(), 3500);
}

// Add event listeners for filters
['filterStatus', 'filterCategory', 'filterDistance'].forEach(id => {
    document.getElementById(id).onchange = renderIssues;
});

// Export to Excel functionality
document.getElementById('exportExcelBtn').onclick = function() {
    // Prepare data for Excel
    const data = issues.map(issue => ({
        Type: issue.type,
        Location: issue.location,
        Description: issue.desc,
        Status: issue.status,
        Date: issue.date,
        Reporter: issue.reporterType,
        Latitude: issue.lat,
        Longitude: issue.lng,
        Flags: issue.flags || 0
    }));
    // Create worksheet and workbook
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Reports");
    // Export to file
    XLSX.writeFile(wb, "reports.xlsx");
};