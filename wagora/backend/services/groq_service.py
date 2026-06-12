from fastapi import HTTPException
from groq import AsyncGroq
from config import settings

async def call_groq(
    messages: list,
    system_prompt: str,
    model: str = "llama3-8b-8192",
    temperature: float = 0.7,
    max_tokens: int = 1000
) -> str:
    """
    Makes a real call to the Groq API.
    Returns the response text.
    Raises HTTPException on failure.
    """
    if not settings.GROQ_API_KEY:
        raise HTTPException(status_code=500, detail="Groq API key not configured")
        
    try:
        # Use AsyncGroq to perform asynchronous, non-blocking requests
        client = AsyncGroq(api_key=settings.GROQ_API_KEY)
        formatted_messages = [{"role": "system", "content": system_prompt}] + messages
        response = await client.chat.completions.create(
            model=model,
            messages=formatted_messages,
            temperature=temperature,
            max_tokens=max_tokens
        )
        return response.choices[0].message.content
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Groq API error: {str(e)}")
