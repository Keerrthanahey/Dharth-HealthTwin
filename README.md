# Dharth HealthTwin

A local-first personal health record dashboard for organizing medical records, tracking vitals, and viewing a health timeline.

## Requirements
- Node.js 18+

## Run on port 5000
```bash
npm install
npm start
```
Open http://localhost:5000

The app stores its data in `data/health-data.json` on the server. This starter is for development and demonstration only; do not use real patient data or treat generated insights as medical advice. Add authentication, encryption, backups, and a security review before deployment or handling sensitive health information.

## Features
- Overview dashboard with vitals and record counts
- Add and remove health records
- Log blood pressure, heart rate, temperature, weight, and SpO2
- Health timeline and basic trend visualizations
- Export and import a JSON backup
- Responsive layout; no external API keys required
