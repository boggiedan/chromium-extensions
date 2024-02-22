import React, { useState, type FC, useEffect, useRef } from "react";
import ModalButton from "@app/components/ModalButton";
import Modal from "@app/components/Modal";
import { isInDevelopmentMode } from "./utils/envUtils";
import DevInput from "./components/DevInput";
import { fetchSearchResult } from "./services/apigw";

const isDev = isInDevelopmentMode();

const App: FC = () => {
  const [isEnabled, setIsEnabled] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [finalValue, setFinalValue] = useState("");
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [searchResult, setSearchResult] = useState(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!isDev) {
      chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        console.log("MESSAGE RECEIVED: ", request);

        if (request.action === "GPT-SEARCH-ENABLED") {
          setIsEnabled(true);
          sendResponse({ result: "success" });
        }

        if (request.action === "GPT-SEARCH-DISABLED") {
          setIsEnabled(false);
          sendResponse({ result: "success" });
        }
      });
    }
  }, []);

  useEffect(() => {
    if (!isEnabled) {
      return;
    }

    const handleInputChange = (event: InputEvent) => {
      if (event?.data) {
        setSearchValue((prev) => prev + event.data);
      }
    };

    const areas = Array.from(document.querySelectorAll("textarea"));
    const active = areas.find((textarea) => {
      const styles = window.getComputedStyle(textarea);
      return styles.display !== "none";
    });

    if (active) {
      // @ts-ignore
      active.addEventListener("input", handleInputChange);
    }

    return () => {
      if (active) {
        // @ts-ignore
        active.removeEventListener("input", handleInputChange);
      }

      if (timer.current) {
        clearTimeout(timer.current);
      }
    };
  }, [isEnabled]);

  useEffect(() => {
    if (searchValue) {
      timer.current && clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        setFinalValue(searchValue);
      }, 2000);
    }
  }, [searchValue]);

  useEffect(() => {
    const abortController = new AbortController();
    const signal = abortController.signal;

    if (finalValue) {
      (async () => {
        try {
          const response = await fetchSearchResult(finalValue, signal);
          console.log(response);
          setSearchResult(response);
        } catch (e) {
          console.error(e);
        }
      })();
    }

    return () => {
      abortController.abort();
    };
  }, [finalValue]);

  return (
    <>
      {isModalVisible && (
        <Modal
          // @ts-ignore
          content={searchResult?.completion?.choices?.[0]?.message?.content}
          onClose={() => {
            setIsModalVisible(false);
          }}
        />
      )}
      <ModalButton
        animate={!!searchResult}
        onClick={() => {
          setIsModalVisible(!isModalVisible);
        }}
      />
      {isDev && <DevInput />}
    </>
  );
};

export default App;
