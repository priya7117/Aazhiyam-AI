import os
import json
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
import google.generativeai as genai

load_dotenv()

app = Flask(__name__)
CORS(app)

genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
model = genai.GenerativeModel("gemini-1.5-flash")

SYSTEM_PROMPT = """You are a maritime acoustic advisor for Azhiyam AI.
Give short, specific, numeric recommendations for reducing underwater noise in sensitive ocean zones.
Always mention: suggested speed change (in knots), approximate % noise reduction, and any sensitive species/zone if relevant.
Keep answers under 80 words."""


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


@app.route("/")
def home():
    return "Azhiyam AI backend running ✅"


if __name__ == "__main__":
    port = int(os.getenv("PORT", 5000))
    app.run(debug=True, port=port)