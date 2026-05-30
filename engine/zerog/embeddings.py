import os
import numpy as np
from openai import AsyncOpenAI

client = AsyncOpenAI(api_key=os.environ.get("OPENAI_API_KEY"))


async def get_embedding(text: str) -> np.ndarray:
    response = await client.embeddings.create(
        model="text-embedding-3-small", input=text
    )
    return np.array(response.data[0].embedding, dtype=np.float32)
