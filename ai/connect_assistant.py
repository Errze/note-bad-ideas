from pathlib import Path
from typing import List, Literal

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from llama_cpp import Llama

app = FastAPI(
    title="Llama Text API",
    description="API для анализа текста, вопросов и диалога через GGUF-модель",
    version="1.1.0"
)

# Если будешь дергать напрямую с фронта, CORS нужен.
# Если дергаешь только через backend-прокси, можно убрать.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # в проде ограничь
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_DIR = Path(__file__).resolve().parent
MODEL_PATH = BASE_DIR / "model" / "MTSAIR.Cotype-Nano.Q6_K.gguf"

class ModelCache:
    _llm = None

    @classmethod
    def get_llm(cls):
        if cls._llm is None:
            if not MODEL_PATH.exists():
                raise RuntimeError(f"Модель не найдена: {MODEL_PATH}")
            cls._llm = Llama(
                model_path=str(MODEL_PATH),
                n_threads=4,
                n_ctx=4096,
                verbose=False
            )
            print("Модель загружена:", MODEL_PATH)
        return cls._llm


# ---------- модели входа ----------
class TextInput(BaseModel):
    text: str = Field(..., min_length=1)

class ChatMessage(BaseModel):
    role: Literal["user", "assistant", "system"]
    content: str = Field(..., min_length=1)

class ChatInput(BaseModel):
    messages: List[ChatMessage]
    temperature: float = 0.5
    max_tokens: int = 1024


# ---------- генерация ----------
def _generate(prompt: str, max_tokens: max_tokens, temperature: float = 0.5) -> str:
    llm = ModelCache.get_llm()
    out = llm(
        prompt,
        max_tokens=1024,
        temperature=temperature,
    )
    return out["choices"][0]["text"].strip()


def quick_analysis(text: str) -> str:
    prompt = f"""
Проанализируй этот текст и дай краткий ответ.

Текст:
{text}

Анализ должен содержать только:
- Основную мысль (50-70 слов)
- Стиль написания (плюсы и минусы)
- Предложения по улучшению (структура, развитие идеи)

Ответ:
"""
    return _generate(prompt, max_tokens=500, temperature=0.9)


def guiding_questions(text: str) -> str:
    prompt = f"""
Прочитай следующий текст и придумай наводящие вопросы, которые помогут автору глубже раскрыть идею, персонажей, эмоции или тему.
Вопросы должны стимулировать размышления и не повторяться.

Текст:
{text}

Ты должен дать 5 вопросов списком.
Ответ:
"""
    return _generate(prompt, max_tokens=500, temperature=0.8)


def chat_reply(messages: List[ChatMessage], max_tokens: int, temperature: float) -> str:
    # Простой chat-шаблон (универсальный). Если у твоей модели есть специальный формат, можно адаптировать.
    system_default = "Ты - ассистент писателя, который помогает с анализом текста, предложениями по улучшению и может задавать наводящие вопросы для продолжения текста и развития идей."

    parts = []
    # гарантируем system
    has_system = any(m.role == "system" for m in messages)
    if not has_system:
        parts.append(f"system: {system_default}")

    for m in messages:
        role = m.role
        content = m.content.strip()
        parts.append(f"{role}: {content}")

    parts.append("assistant:")

    prompt = "\n".join(parts)
    return _generate(prompt, max_tokens=max_tokens, temperature=temperature)


# ---------- эндпоинты ----------
@app.get("/")
async def root():
    return {
        "message": "API работает.",
        "endpoints": {
            "POST /analyze": "Анализ текста",
            "POST /questions": "Наводящие вопросы",
            "POST /chat": "Диалог с историей"
        }
    }

@app.post("/analyze")
async def analyze_text(input_data: TextInput):
    try:
        return {"analysis": quick_analysis(input_data.text)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/questions")
async def generate_questions(input_data: TextInput):
    try:
        return {"questions": guiding_questions(input_data.text)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/chat")
async def chat_endpoint(input_data: ChatInput):
    try:
        if not input_data.messages:
            raise HTTPException(status_code=400, detail="messages is required")
        reply = chat_reply(input_data.messages, input_data.max_tokens, input_data.temperature)
        return {"reply": reply}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
