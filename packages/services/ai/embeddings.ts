export async function embedCode(text: string): Promise<number[]> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY is not defined");
  }

  const response = await fetch("https://openrouter.ai/api/v1/embeddings", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "openai/text-embedding-3-small", // 1536 dimensions
      input: text,
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to generate embeddings: ${error}`);
  }

  const data = await response.json();
  if (!data.data || data.data.length === 0) {
    throw new Error("No embedding returned");
  }

  return data.data[0].embedding;
}
