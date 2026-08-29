import os
from dotenv import load_dotenv
import google.generativeai as genai

load_dotenv()

api_key = os.getenv("GEMINI_API_KEY")
print("API Key loaded:", api_key[:10] + "..." if api_key else "NOT FOUND")

genai.configure(api_key=api_key)

try:
    model = genai.GenerativeModel("gemini-3.6-flash")
    result = model.generate_content("Say hello in 5 words")
    print("SUCCESS!")
    print(result.text)
except Exception as e:
    print("FAILED!")
    print("Error type:", type(e).__name__)
    print("Error message:", str(e))