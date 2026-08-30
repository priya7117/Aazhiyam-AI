import os
import json
from datetime import datetime

from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
from dotenv import load_dotenv
from openai import OpenAI

load_dotenv()

OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
PORT = int(os.getenv("PORT", 5000))

app = Flask(__name__)
CORS(app)

client = OpenAI(
    base_url="https://openrouter.ai/api/v1",
    api_key=OPENROUTER_API_KEY,
)

OPENROUTER_MODEL = "mistralai/mistral-7b-instruct:free"

SYSTEM_PROMPT = """You are a maritime acoustic advisor for Aazhiyam-AI.
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


@app.route("/")
def home():
    return render_template("index.html")


@app.route("/api/chat", methods=["POST"])
def chat():
    debug_error = None
    try:
        data = request.get_json()

        question = data.get("question")
        scenario_id = data.get("scenarioId", "scenario-A")

        scenario = load_scenario(scenario_id)

        user_prompt = f"""Current scenario data:
{json.dumps(scenario)}

User question:
{question}
"""

        try:
            result = client.chat.completions.create(
                model=OPENROUTER_MODEL,
                messages=[
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": user_prompt}
                ],
                max_tokens=200
            )
            answer = result.choices[0].message.content
            source = "openrouter"

        except Exception as or_error:
            print("OpenRouter error:", or_error)

            answer = FALLBACK_RESPONSES.get(
                scenario_id,
                "Consider reducing speed in sensitive zones."
            )

            source = "fallback"
            debug_error = str(or_error)

        return jsonify({
            "answer": answer,
            "scenarioUsed": scenario["name"],
            "responseSource": source,
            "debugError": debug_error
        })

    except Exception as e:
        print("Chat server error:", e)

        return jsonify({
            "error": "Something went wrong with the copilot.",
            "debugError": str(e)
        }), 500


@app.route("/api/report", methods=["POST"])
def report():
    try:
        data = request.get_json()

        scenario_id = data.get("scenarioId", "scenario-A")

        copilot_answer = data.get(
            "copilotAnswer",
            "No specific recommendation available."
        )

        scenario = load_scenario(scenario_id)

        report_data = {
            "title": f"Compliance Report - {scenario['name']}",
            "project": "Aazhiyam-AI",
            "zone": scenario["zone"],
            "noiseLevel": scenario["noiseLevel"],
            "avgSpeed": scenario["avgSpeed"],
            "vesselCount": scenario["vesselCount"],
            "sensitiveSpecies": scenario["sensitiveSpecies"],
            "affectedFrequencyBand": scenario["affectedFrequencyBand"],
            "recommendation": copilot_answer,
            "estimatedNoiseReduction": "25-40%",
            "generatedAt": datetime.now().isoformat()
        }

        return jsonify(report_data)

    except Exception as e:
        print("Report error:", e)

        return jsonify({
            "error": "Could not generate report."
        }), 500


if __name__ == "__main__":
    print("Starting Aazhiyam-AI backend...")

    app.run(
        debug=False,
        host="0.0.0.0",
        port=PORT
    )