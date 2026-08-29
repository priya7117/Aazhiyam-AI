# Aazhiyam AI Backend API

Base URL (local): http://localhost:5000

## POST /api/chat
Request:
{
  "question": "string",
  "scenarioId": "scenario-A" | "scenario-B" | "scenario-C"
}

Response:
{
  "answer": "string",
  "scenarioUsed": "string",
  "responseSource": "gemini" | "fallback",
  "debugError": "string or null"
}

## POST /api/report
Request:
{
  "scenarioId": "scenario-A",
  "copilotAnswer": "string"
}

Response:
{
  "title": "string",
  "project": "Azhiyam AI",
  "zone": "string",
  "noiseLevel": "string",
  "avgSpeed": number,
  "vesselCount": number,
  "sensitiveSpecies": ["string"],
  "affectedFrequencyBand": "string",
  "recommendation": "string",
  "estimatedNoiseReduction": "string",
  "generatedAt": "ISO timestamp"
}

## Available Scenario IDs
- scenario-A (Gulf of Kutch - High Traffic)
- scenario-B
- scenario-C