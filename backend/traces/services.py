import logging
import os
import time

from google import genai

from traces.constants import MODEL_NAME, CLASSIFICATION_PROMPT, VALID_CATEGORIES, SYSTEM_PROMPT

logger = logging.getLogger(__name__)

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

if not GEMINI_API_KEY:
    raise ValueError("GEMINI_API_KEY not set in environment variables.")

client = genai.Client(api_key=GEMINI_API_KEY)


def _call_gemini(prompt, retries=2):
    for attempt in range(retries + 1):
        try:
            response = client.models.generate_content(
                model=MODEL_NAME,
                contents=prompt,
            )
            return response.text
        except Exception as e:
            logger.warning(f"Gemini attempt {attempt + 1} failed: {e}")
            time.sleep(1)

    raise Exception("LLM call failed after retries.")


def generate_chat_response(user_message):
    start = time.time()

    prompt = f"""
            {SYSTEM_PROMPT}
            User:
            {user_message}
            """

    text = _call_gemini(prompt).strip()

    end = time.time()
    response_time = int((end - start) * 1000)

    return text, response_time


def classify_trace(user_message, bot_response):
    prompt = f"""
            {CLASSIFICATION_PROMPT}
            User message:
            {user_message}
            Bot response:
            {bot_response}
        """

    raw_text = _call_gemini(prompt)

    category = (
        raw_text.strip()
        .replace(".", "")
        .split("\n")[0]
        .strip()
    )

    if category not in VALID_CATEGORIES:
        logger.warning(f"Invalid category returned: {category}")
        return "General Inquiry"

    return category
