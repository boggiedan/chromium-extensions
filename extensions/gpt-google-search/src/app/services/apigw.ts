export const fetchSearchResult = async (
  searchValue: string,
  signal?: AbortSignal,
) => {
  const response = await fetch(
    `${process.env.API_URL}/api/openai/assistants/search`,
    {
      signal,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.API_KEY as string,
      },
      body: JSON.stringify({ searchValue }),
    },
  );
  return response.json();
};
