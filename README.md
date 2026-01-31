# Citizern_Issues_Reporter

Citizen Issue Reporter is a frontend web application that allows users to
report local civic issues such as road damage, garbage, water leaks, and
street light problems. It also includes an admin dashboard to monitor,
moderate, and manage reported issues.

## Features

### User Side
- Report issues with category, description, and location
- Map-based location selection using Leaflet
- Upload images and videos
- Report as Verified or Anonymous
- Track issue status (Open, In Progress, Resolved)
- Filter issues by status, category, and distance
- Flag spam or invalid reports

### Admin Side
- View analytics (total issues, categories, reporters)
- Review and manage flagged issues
- Approve or delete reports
- Ban users
- View all reported issues in a table
- Map visualization of issue locations

## Tech Stack
- HTML5
- CSS3
- JavaScript (Vanilla)
- Leaflet.js (Maps)
- LocalStorage (temporary data storage)

## How to Run the Project
1. Download or clone the repository
2. Open `index.html` in any modern browser
3. Open `admin.html` for the admin dashboard

No backend or server setup is required.

## Note
This project uses browser LocalStorage, so data will reset if storage is cleared
or a different browser/device is used.

## Author
Developed as an academic project.
