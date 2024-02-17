import React, { type FC } from "react";
import "./index.css";

const App: FC = () => {
  return (
    <div className="flex h-screen w-full flex-col items-center justify-center bg-slate-400 p-5">
      <h1 className="mb-4 text-3xl font-bold text-white">
        My Chrome Extension
      </h1>
    </div>
  );
};

export default App;
