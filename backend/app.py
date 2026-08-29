import os
import json
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
import google.generativeai as genai
from datetime import datetime

load_dotenv()

app = Flask(__name__)
CORS(app)

genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
model = genai.GenerativeModel("gemini-1.5-flash")

SYSTEM_PROMPT = """You are a maritime acoustic advisor for Azhiyam AI.
Give short, specific, numeric recommendations for reducing underwater noise in sensitive ocean zones.
Always mention: suggested speed change (in knots), approximate % noise reduction, and any sensitive species/zone if relevant.
Keep answers under 80 words."""

FALLBACK_RESPONSES = {
    "scenario-A": "Reduce speed by 3 knots in this corridor to cut noise by approximately 40%. Avoid the marked marine mammal zone during peak hours (6-9 PM). Estimated noise reduction: 35-40%.",

    "scenario-B": "Maintain current speed but shift route 500m away from the sensitive zone. This can reduce acoustic impact by approximately 25% without major delays.",

    "scenario-C": "Current noise levels are within safe limits. Continue monitoring; no immediate action needed."
}


def load_scenario(scenario_id):
    file_path = os.path.join(
        os.path.dirname(__file__),
        "scenarios",
        f"{scenario_id}.json"
    )

    with open(file_path, "r") as f:
        return json.load(f)


@app.route("/api/chat", methods=["POST"])
def chat():
    try:
        data = request.get_json()

        question = data.get("question")
        scenario_id = data.get("scenarioId", "scenario-A")

        scenario = load_scenario(scenario_id)

        prompt = f"""{SYSTEM_PROMPT}

Current scenario data: {json.dumps(scenario)}
User question: {question}"""

        result = model.generate_content(prompt)

        return jsonify({
            "answer": result.text,
            "scenarioUsed": scenario["name"]
        })

    except Exception as e:
        print(e)

        return jsonify({
            "error": "Something went wrong with the copilot."
        }), 500


@app.route("/api/report", methods=["POST"])
def report():
    try:
        data = request.get_json()
        scenario_id = data.get("scenarioId", "scenario-A")
        copilot_answer = data.get("copilotAnswer", "No specific recommendation available.")

        scenario = load_scenario(scenario_id)

        report_data = {
            "title": f"Compliance Report - {scenario['name']}",
            "zone": scenario["zone"],
            "noiseLevel": scenario["noiseLevel"],
            "avgSpeed": scenario["avgSpeed"],
            "vesselCount": scenario["vesselCount"],
            "sensitiveSpecies": scenario["sensitiveSpecies"],
            "affectedFrequencyBand": scenario["affectedFrequencyBand"],
            "recommendation": copilot_answer,
            "estimatedNoiseReduction": "25-40%",
            "generatedAt": "auto-timestamp-here"
        }

        return jsonify(report_data)

    except Exception as e:
        print(e)
        return jsonify({"error": "Could not generate report."}), 500