import React from "react";

const DevInput = () => {
  return (
    <div className="flex h-full w-full items-center justify-center p-32">
      <textarea
        id="message"
        rows={4}
        className="block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm text-gray-900 focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:focus:border-blue-500 dark:focus:ring-blue-500"
        placeholder="Your message..."
      ></textarea>
    </div>
  );
};

export default DevInput;
