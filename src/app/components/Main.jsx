import { useState, useEffect } from "react";

import Pass from "./Pass";
import Generate from "./Generate";


const MainComponent = () => {
  const [currentComponent, setCurrentComponent] = useState(null);

  const handleButtonClick = (componentName) => {
    setCurrentComponent(componentName);
  };

  const handleBackButtonClick = () => {
    setCurrentComponent(null);
  };

  const renderCurrentComponent = () => {
    switch (currentComponent) {
      case "pass":
        return <Pass onBackButtonClick={handleBackButtonClick} />;
      case "generate":
        return <Generate onBackButtonClick={handleBackButtonClick} />;


      // render other components as needed
      default:
        return (
          <div className="flex text-white justify-center h-screen">
          <div className="mt-4 max-w-screen-lg mx-auto">
            <div className="greeting-container">{/* <Greeting /> */}</div>

            <div className="grid grid-cols-3 gap-4 mt-3">
              <button
                className="bg-violet-400 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-300 font-bold text-xl py-10 rounded-lg shadow-lg"
                onClick={() => handleButtonClick("pass")}
              >
                Scan
              </button>
              <button
                className="bg-violet-400 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-300 font-bold text-xl py-10 rounded-lg shadow-lg"
                onClick={() => handleButtonClick("generate")}
              >
                QR Code
              </button>

            </div>
          </div>
        </div>

        );

    }
  };

  return <div className="fade-in">{renderCurrentComponent()}</div>;
};

export default MainComponent;


