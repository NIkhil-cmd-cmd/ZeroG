import os
import numpy as np
from openai import AsyncOpenAI

_client: AsyncOpenAI | None = None


def _get_client() -> AsyncOpenAI:
    global _client
    key = os.environ.get("OPENAI_API_KEY")
    if not key:
        raise RuntimeError("OPENAI_API_KEY is required for ZeroG embeddings")
    if _client is None:
        _client = AsyncOpenAI(api_key=key)
    return _client


async def get_embedding(text: str) -> np.ndarray:
    client = _get_client()
    response = await client.embeddings.create(model="text-embedding-3-small", input=text)
    return np.array(response.data[0].embedding, dtype=np.float32)
