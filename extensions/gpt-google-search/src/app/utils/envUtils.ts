export const isInDevelopmentMode = () => {
  try {
    return process.env.ENV === "development";
  } catch (e) {
    return false;
  }
};
