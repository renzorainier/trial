// QrScanner.jsx
import React, { useState, useRef, useEffect } from "react";
import { QrReader } from "react-qr-reader";
import successSound from './success.wav'; // Import the success sound
import errorSound from './error.wav'; // Import the error sound

function QrScanner({ onResult, onScanError, backgroundColor, setBackgroundColor }) {
  const scannedCodesRef = useRef(new Set());

  const handleResult = (result) => {
    if (!!result) {
      const code = result.text;
      onResult(code, scannedCodesRef);
    }
  };

  const playSound = (sound) => {
    const audio = new Audio(sound);
    audio.play();
  };

  const triggerVisualFeedback = (color, sound) => {
    setBackgroundColor(color);
    playSound(sound);
    setTimeout(() => setBackgroundColor("bg-gray-100"), 1000);
  };

  return (
    <div className={`${backgroundColor} bg-white rounded-lg shadow-xl p-8 w-full lg:w-1/2 h-full mb-6 lg:mb-0 lg:mr-6`}>
      <QrReader
        onResult={handleResult}
        onError={(error) => {
          onScanError(error);
          triggerVisualFeedback("bg-[#FF0000]", errorSound);
        }}
        constraints={{ facingMode: "environment" }}
        style={{ width: "100%", height: "100%" }}
      />
    </div>
  );
}

export default QrScanner;
