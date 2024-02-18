import React from "react";
import { isInDevelopmentMode } from "@app/utils/envUtils";
import logo from "@/public/images/logo.png";

type ModalButtonProps = {
  onClick: () => void;
};

const getImageSrc = () => {
  return isInDevelopmentMode() ? logo : chrome.runtime.getURL("app/logo.png");
};

const ModalButton = ({ onClick }: ModalButtonProps) => {
  return (
    <div className="fixed right-5 top-14 z-[1000]">
      <button
        className="opacity-70 transition-all hover:opacity-100"
        onClick={onClick}
      >
        <img
          className="h-14 w-14 rounded-full"
          src={getImageSrc()}
          alt="logo"
        />
      </button>
    </div>
  );
};

export default ModalButton;
