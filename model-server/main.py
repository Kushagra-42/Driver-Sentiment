from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List
from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer
import uvicorn

app = FastAPI(title="Driver Sentiment Model Server", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

analyzer = SentimentIntensityAnalyzer()


class PredictRequest(BaseModel):
    texts: List[str]


class PredictResponse(BaseModel):
    scores: List[float]


def predict_score(text: str) -> float:
    if not text or not text.strip():
        return 3.0
    
    scores = analyzer.polarity_scores(text)
    compound = scores['compound']
    
    normalized = ((compound + 1) / 2) * 4 + 1
    
    return round(normalized, 2)


@app.get("/")
def root():
    return {
        "service": "Driver Sentiment Model Server",
        "status": "running",
        "version": "1.0.0"
    }


@app.get("/health")
def health_check():
    return {"status": "healthy"}


@app.post("/predict_batch", response_model=PredictResponse)
def predict_batch(request: PredictRequest):
    try:
        if not request.texts:
            raise HTTPException(status_code=400, detail="texts array cannot be empty")
        
        scores = [predict_score(text) for text in request.texts]
        
        return PredictResponse(scores=scores)
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction failed: {str(e)}")


if __name__ == "__main__":
    print("Starting Model Server on http://localhost:8000")
    print("API Documentation: http://localhost:8000/docs")
    uvicorn.run(app, host="0.0.0.0", port=8000)
