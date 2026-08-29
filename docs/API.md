# Aazhiyam-AI Backend API

## Base URL

http://localhost:5000

## Health Check

GET /

Response:

Aazhiyam AI backend running

## Copilot Chat

POST /api/chat

Request:

{
  "question": "Suggest a quiet path for ships here.",
  "scenarioId": "scenario-A"
}

Response:

{
  "answer": "Reduce speed by 3 knots in this corridor to cut noise by approximately 40%.",
  "scenarioUsed": "Gulf of Kutch - High Traffic",
  "responseSource": "fallback"
}

## Compliance Report

POST /api/report

Request:

{
  "scenarioId": "scenario-A",
  "copilotAnswer": "Reduce speed by 3 knots to reduce underwater acoustic impact."
}

Response:

{
  "title": "Compliance Report - Gulf of Kutch - High Traffic",
  "project": "Aazhiyam AI",
  "zone": "Gulf of Kutch",
  "noiseLevel": "high",
  "avgSpeed": 18,
  "vesselCount": 12,
  "sensitiveSpecies": [
    "Humpback Dolphin",
    "Finless Porpoise"
  ],
  "affectedFrequencyBand": "20-1000 Hz",
  "recommendation": "Reduce speed by 3 knots to reduce underwater acoustic impact.",
  "estimatedNoiseReduction": "25-40%",
  "generatedAt": "2026-08-29T14:52:28"
}

## Supported Scenarios

scenario-A
scenario-B
scenario-C

## Backend Status

Flask backend: Active
Report API: Active
Fallback system: Active
Gemini: Temporarily parked