import React, { useEffect, useState } from "react";
import { twMerge } from "tailwind-merge";

const isDev = process.env.NODE_ENV === "development";

const App = () => {
  const [isEnabled, setIsEnabled] = useState(false);

  useEffect(() => {
    // Retrieve the stored state when the component mounts
    chrome.storage.local.get(["isEnabled"], function (result) {
      if (result.isEnabled !== undefined) {
        setIsEnabled(result.isEnabled);
      }
    });
  }, []);

  useEffect(() => {
    if (!isDev) {
      chrome.storage.local.set({ isEnabled: isEnabled });
      chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        const activeTab = tabs[0];

        if (activeTab?.id) {
          chrome.tabs.sendMessage(
            activeTab.id,
            {
              action: isEnabled ? "GPT-SEARCH-ENABLED" : "GPT-SEARCH-DISABLED",
            },
            (response) => {
              console.log(response.result);
            },
          );
        }
      });
    }
  }, [isEnabled]);

  return (
    <div className="flex h-full w-full flex-col justify-between bg-slate-400 p-5">
      <h1 className="mb-4 text-center text-2xl font-bold text-white">
        Chat GPT search results
      </h1>
      <section className="rounded border bg-slate-300 p-2">
        <div className="flex p-2">
          <label htmlFor="toggle" className="flex cursor-pointer items-center">
            <div className="relative">
              <input
                type="checkbox"
                id="toggle"
                className="sr-only"
                checked={isEnabled}
                onChange={() => setIsEnabled(!isEnabled)}
              />
              <div className="block h-8 w-14 rounded-full bg-slate-400"></div>
              <div
                className={twMerge(
                  "dot absolute left-1 top-1 h-6 w-6 rounded-full bg-white transition",
                  isEnabled && "translate-x-full transform bg-blue-600",
                )}
              ></div>
            </div>
            <div className="ml-3 text-sm font-medium text-white">
              Enable extension
            </div>
          </label>
        </div>
      </section>
    </div>
  );
};

export default App;
