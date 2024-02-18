import React, { useState, type FC } from "react";
import ModalButton from "@app/components/ModalButton";
import Modal from "@app/components/Modal";

const App: FC = () => {
  const [isModalVisible, setIsModalVisible] = useState(false);

  return (
    <>
      {isModalVisible && (
        <Modal
          onClose={() => {
            setIsModalVisible(false);
          }}
        />
      )}
      <ModalButton
        onClick={() => {
          setIsModalVisible(!isModalVisible);
        }}
      />
    </>
  );
};

export default App;
