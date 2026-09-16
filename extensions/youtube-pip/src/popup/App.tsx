import React, { type FC } from "react";

const triggerPIP = () => {
  const playerContainer = document.querySelector("#movie_player");
  const video = playerContainer?.getElementsByTagName("video")?.[0];

  try {
    if (!video) {
      throw new Error("No video found");
    }

    video.requestPictureInPicture();
  } catch (error) {
    console.error("Error trying to enter PIP mode! ERROR: ", error);
    alert("An error occurred while trying to trigger PIP");
  }
};

const handleButtonClick = () => {
  try {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tabId = tabs[0]?.id;

      if (tabId) {
        chrome.scripting.executeScript({
          target: { tabId },
          // @ts-ignore
          function: triggerPIP,
        });
      }
    });
  } catch (error) {
    console.error(error);
    alert("An error occurred while trying to trigger PIP");
  }
};

const App: FC = () => {
  return (
    <div className="flex h-screen w-full flex-col items-center justify-center bg-slate-400 p-5">
      <h1 className="mb-4 text-3xl font-bold text-white">
        YouTube Picture in Picture
      </h1>
      <button
        className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition duration-150 ease-in-out hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-300"
        onClick={handleButtonClick}
      >
        Trigger PIP
      </button>
    </div>
  );
};

export default App;
