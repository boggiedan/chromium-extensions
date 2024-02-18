export const isInDevelopmentMode = () => {
  let isAppInDevMode = false;

  try {
    isAppInDevMode = process.env.ENV === "development";
  } catch (e) {
    isAppInDevMode = false;
  } finally {
    return isAppInDevMode;
  }
};
