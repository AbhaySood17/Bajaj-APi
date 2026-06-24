const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "https://bajaj-api-n6t8.onrender.com";

export const submitEdges = async (items) => {
  const response = await fetch(`${API_BASE_URL}/bfhl`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ data: items })
  });

  if (!response.ok) {
    throw new Error(`API returned ${response.status}`);
  }

  return response.json();
};

