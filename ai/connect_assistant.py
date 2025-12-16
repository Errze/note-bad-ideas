from llama_cpp import Llama
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

app = FastAPI(
    title="Llama Text API",
    description="API для анализа текста и генерации наводящих вопросов через GGUF-модель",
    version="1.0.0"
)

# --- Кэш модели ---
class ModelCache:
    _llm = None

    @classmethod
    def get_llm(cls):
        if cls._llm is None:
            cls._llm = Llama(
                model_path="model/MTSAIR.Cotype-Nano.Q6_K.gguf",
                n_threads=4,
                n_ctx=4096,
                verbose=False
            )
            print("Модель загружена.")
        return cls._llm


# --- Pydantic-модель для входных данных ---
class TextInput(BaseModel):
    text: str


# --- Функция анализа ---
def quick_analysis(text: str) -> str:
    llm = ModelCache.get_llm()

    prompt = f"""
    Проанализируй этот текст и дай краткий ответ: {text}

    Анализ должен содержать:
    - Основную мысль [Опиши основную мысль в 50-70 словах]
    - Стиль написания [Опиши стиль написания, его преимущества и недостатки]
    - Предложения по улучшению [Опиши что можно улучшить в структуре текста, как можно развить идею дальше]

    Ответ:
    """

    output = llm(
        prompt,
        max_tokens=400,
        temperature=0.9,
        stop=["Ответ:"]
    )

    return output["choices"][0]["text"].strip()

def guiding_questions(text: str) -> str:
    llm = ModelCache.get_llm()

    prompt = f"""
            Прочитай следующий текст и придумай наводящие вопросы, которые помогут автору глубже раскрыть идею, персонажей, эмоции или тему. 
            Вопросы должны стимулировать размышления и не повторяться.
            Текст:
            {text}
            Ответ должен содержать 5 таких вопросов в виде списка:
            """

    output = llm(
        prompt,
        max_tokens=300,
        temperature=0.9
    )
    return output["choices"][0]["text"].strip()


# --- Эндпоинты ---
@app.post("/analyze")
async def analyze_text(input_data: TextInput):
    try:
        response = quick_analysis(input_data.text)
        return {"analysis": response}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/questions")
async def generate_questions(input_data: TextInput):
    try:
        response = guiding_questions(input_data.text)
        return {"questions": response}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/")
async def root():
    return {
        "message": "API работает.",
        "endpoints": {
            "/analyze": "Анализ текста",
            "/questions": "Наводящие вопросы"
        }
    }