const API_URL = process.env.API_URL;

const options = {
  method: "GET",
  headers: {
    "Content-Type": "application/json",
    "x-api-key": process.env.API_KEY,
  },
};

export const getCompletion = async () => {
  const response = await fetch(`${process.env.API_URL}/api/test`, options);
  return response.json();
};
