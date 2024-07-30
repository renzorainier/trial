import React, { useState, useRef, useEffect } from "react";
import { QrReader } from "react-qr-reader";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "./firebase.js";
import { mappingTable, getPhilippineTime } from "./Constants.js";
import Email from "./Email.jsx"; // Import the Email component
import successSound from './success.wav'; // Import the success sound
import errorSound from './error.wav'; // Import the error sound

function Scan() {
  const [data, setData] = useState("");
  const [log, setLog] = useState([]);
  const [studentName, setStudentName] = useState("");
  const [currentDecodedCode, setCurrentDecodedCode] = useState("");
  const [emailData, setEmailData] = useState({ shouldSend: false, decodedCode: "", studentName: "" });
  const [isCheckInMode, setIsCheckInMode] = useState(null);
  const [backgroundColor, setBackgroundColor] = useState("bg-gray-100"); // State for background color

  const scannedCodesRef = useRef(new Set());

  const checkMode = () => {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();

    return (currentHour > 6 || (currentHour === 6 && currentMinute >= 0)) &&
      (currentHour < 13 || (currentHour === 14 && currentMinute < 50));
  };

  useEffect(() => {
    const initialCheckInMode = checkMode();
    setIsCheckInMode(initialCheckInMode);
    console.log(`Currently in ${initialCheckInMode ? 'check-in' : 'check-out'} mode`);

    const interval = setInterval(() => {
      const currentMode = checkMode();
      if (currentMode !== isCheckInMode) {
        console.log(`Switching to ${currentMode ? 'check-in' : 'check-out'} mode`);
        setIsCheckInMode(currentMode);
      }
    }, 60000);

    return () => clearInterval(interval);
  }, [isCheckInMode]);

  useEffect(() => {
    const cleanupInterval = setInterval(() => {
      const now = new Date();
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();

      if (currentHour === 14 && currentMinute === 50) {
        cleanup();
      }
    }, 60000); // Check every minute

    return () => clearInterval(cleanupInterval); // Cleanup the interval on component unmount
  }, []);

  const cleanup = () => {
    console.log("Running cleanup...");
    setData("");
    setLog([]);
    setStudentName("");
    setCurrentDecodedCode("");
    setEmailData({ shouldSend: false, decodedCode: "", studentName: "" });
    scannedCodesRef.current.clear();
  };

  const updateAttendance = async (decodedCode, isCheckIn) => {
    try {
      const userDocRef = doc(db, "users", decodedCode);
      console.log(`Reading from Firebase: ${decodedCode}`);
      const userDocSnap = await getDoc(userDocRef);
      console.log(`Firebase read complete for ${decodedCode}`);
      const nowStr = getPhilippineTime();
      const dateStr = nowStr.split("T")[0];

      if (userDocSnap.exists()) {
        const userData = userDocSnap.data();
        const attendance = userData.attendance || {};
        const currentStudentName = userData.name || "Unknown";
        setStudentName(currentStudentName);
        console.log("eto", currentStudentName);

        if (isCheckIn) {
          if (!attendance[dateStr]) {
            attendance[dateStr] = { checkIn: nowStr, checkOut: null };
            await updateDoc(userDocRef, { attendance });
            console.log("Check-in successful");
            setEmailData({ shouldSend: true, decodedCode, studentName: currentStudentName });
            triggerVisualFeedback("bg-[#06D001]", successSound);
          } else {
            console.log("Already checked in for today");
          }
        } else {
          if (attendance[dateStr]) {
            if (!attendance[dateStr].checkOut) {
              attendance[dateStr].checkOut = nowStr;
              await updateDoc(userDocRef, { attendance });
              console.log("Checkout successful");
              setEmailData({ shouldSend: true, decodedCode, studentName: currentStudentName });
              triggerVisualFeedback("bg-[#06D001]", successSound);
            } else {
              console.log("Already checked out");
            }
          } else {
            // No check-in recorded but it's check-out time, record check-out
            attendance[dateStr] = { checkIn: null, checkOut: nowStr };
            await updateDoc(userDocRef, { attendance });
            console.log("No check-in recorded but check-out successful");
            setEmailData({ shouldSend: true, decodedCode, studentName: currentStudentName });
            triggerVisualFeedback("bg-[#06D001]", successSound);
          }
        }
        // Add the log entry with the current student's name
        addLogEntry(decodedCode, currentStudentName);
      } else {
        console.log("No document found for this student ID");
        triggerVisualFeedback("bg-[#FF0000]", errorSound);
        return; // Stop the process if no document is found
      }
    } catch (error) {
      console.error("Error updating attendance: ", error);
      triggerVisualFeedback("bg-[#FF0000]", errorSound);
    }
  };

  const handleResult = (result) => {
    if (!!result) {
      const code = result.text;
      const decodedCode = code
        .split("")
        .map((char) => mappingTable[char] || "")
        .join("");

      if (!decodedCode.startsWith("mvba_")) {
        console.log("Invalid code, get better at coding boi");
        triggerVisualFeedback("bg-[#FF0000]", errorSound);
        return;
      }

      const processedCode = decodedCode.slice(5);

      const now = new Date();
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();

      if (!scannedCodesRef.current.has(processedCode)) {
        setData(processedCode);
        scannedCodesRef.current.add(processedCode);

        const isCheckIn = (currentHour > 6 || (currentHour === 6 && currentMinute >= 0)) &&
          (currentHour < 13 || (currentHour === 14 && currentMinute < 50));

        updateAttendance(processedCode, isCheckIn);

        setCurrentDecodedCode(processedCode);
      } else {
        console.log("Already scanned this code");
      }
    }
  };

  const addLogEntry = (processedCode, studentName) => {
    const newLogEntry = {
      id: processedCode,
      time: new Date().toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }),
      studentName: studentName,
    };
    console.log("New Log Entry:", newLogEntry);
    setLog((prevLog) => [newLogEntry, ...prevLog.slice(0, 9)]);
  };

  const handleScanError = (error) => {
    console.error("QR Scan Error:", error);
    triggerVisualFeedback("bg-[#FF0000]", errorSound);
  };

  const handleEmailSent = () => {
    setEmailData({ shouldSend: false, decodedCode: "", studentName: "" });
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
    <div className={`${backgroundColor} flex flex-col lg:flex-row items-center justify-center min-h-screen p-6`}>
      <div className="bg-white rounded-lg shadow-xl p-8 w-full lg:w-1/2 h-full mb-6 lg:mb-0 lg:mr-6">
        <QrReader
          onResult={handleResult}
          onError={handleScanError}
          constraints={{ facingMode: "environment" }}
          style={{ width: "100%", height: "100%" }}
        />
      </div>
      <div className="bg-white rounded-lg shadow-xl p-8 w-full lg:w-1/2 h-full flex flex-col items-center">
        <div className="flex flex-col items-center justify-center mb-6">
          <p className="text-xl font-bold text-gray-700 mb-2">Scan Result:</p>
          <div className="flex items-center justify-center bg-gray-50 rounded-lg shadow-md p-4 w-full">
            <p className="text-lg text-blue-600 font-semibold">{data} {studentName && `(${studentName})`}</p>
          </div>
        </div>
        <div className="bg-gray-50  rounded-lg shadow-lg mt-6 w-full overflow-y-scroll">
          <ul className="text-gray-700 divide-y divide-gray-300 w-full">
            {log.map((entry, index) => (
              <li key={`${entry.id}-${index}`} className="py-4 px-6">
                <span className="block text-lg font-semibold">{entry.time}</span>
                <span className="block text-sm">{entry.studentName}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Conditionally render the Email component */}
        {emailData.shouldSend && (
          <Email
            studentName={emailData.studentName}
            decodedCode={emailData.decodedCode}
            onEmailSent={handleEmailSent}
          />
        )}
      </div>
    </div>
  );
}

export default Scan;







///// just a buffer




// sending multiple emails but works
// src/Scan.js

// import React, { useState, useRef, useEffect } from "react";
// import { QrReader } from "react-qr-reader";
// import { doc, getDoc, updateDoc } from "firebase/firestore";
// import { db } from "./firebase.js";
// import { mappingTable, getPhilippineTime } from "./Constants";
// import Email from "./Email"; // Import the Email component
// import successSound from './success.wav'; // Import the success sound
// import errorSound from './error.wav'; // Import the error sound

// function Scan() {
//   const [data, setData] = useState("");
//   const [log, setLog] = useState([]);
//   const [studentName, setStudentName] = useState("");
//   const [currentDecodedCode, setCurrentDecodedCode] = useState("");
//   const [emailData, setEmailData] = useState({ shouldSend: false, decodedCode: "", studentName: "" });
//   const [isCheckInMode, setIsCheckInMode] = useState(null);
//   const [backgroundColor, setBackgroundColor] = useState("bg-gray-100"); // State for background color

//   const scannedCodesRef = useRef(new Set());

//   const checkMode = () => {
//     const now = new Date();
//     const currentHour = now.getHours();
//     const currentMinute = now.getMinutes();

//     return (currentHour > 6 || (currentHour === 6 && currentMinute >= 0)) &&
//       (currentHour < 13 || (currentHour === 14 && currentMinute < 50));
//   };

//   useEffect(() => {
//     const initialCheckInMode = checkMode();
//     setIsCheckInMode(initialCheckInMode);
//     console.log(`Currently in ${initialCheckInMode ? 'check-in' : 'check-out'} mode`);

//     const interval = setInterval(() => {
//       const currentMode = checkMode();
//       if (currentMode !== isCheckInMode) {
//         console.log(`Switching to ${currentMode ? 'check-in' : 'check-out'} mode`);
//         setIsCheckInMode(currentMode);
//       }
//     }, 60000);

//     return () => clearInterval(interval);
//   }, [isCheckInMode]);

//   useEffect(() => {
//     const cleanupInterval = setInterval(() => {
//       const now = new Date();
//       const currentHour = now.getHours();
//       const currentMinute = now.getMinutes();

//       if (currentHour === 14 && currentMinute === 50) {
//         cleanup();
//       }
//     }, 60000); // Check every minute

//     return () => clearInterval(cleanupInterval); // Cleanup the interval on component unmount
//   }, []);

//   const cleanup = () => {
//     console.log("Running cleanup...");
//     setData("");
//     setLog([]);
//     setStudentName("");
//     setCurrentDecodedCode("");
//     setEmailData({ shouldSend: false, decodedCode: "", studentName: "" });
//     scannedCodesRef.current.clear();
//   };

//   const updateAttendance = async (decodedCode, isCheckIn) => {
//     try {
//       const userDocRef = doc(db, "users", decodedCode);
//       console.log(`Reading from Firebase: ${decodedCode}`);
//       const userDocSnap = await getDoc(userDocRef);
//       console.log(`Firebase read complete for ${decodedCode}`);
//       const nowStr = getPhilippineTime();
//       const dateStr = nowStr.split("T")[0];

//       if (userDocSnap.exists()) {
//         const userData = userDocSnap.data();
//         const attendance = userData.attendance || {};
//         const currentStudentName = userData.name || "Unknown";
//         setStudentName(currentStudentName);
//         console.log("eto", currentStudentName);

//         if (isCheckIn) {
//           if (!attendance[dateStr]) {
//             attendance[dateStr] = { checkIn: nowStr, checkOut: null };
//             await updateDoc(userDocRef, { attendance });
//             console.log("Check-in successful");
//             setEmailData({ shouldSend: true, decodedCode, studentName: currentStudentName });
//             blinkBackgroundColor("bg-[#06D001]"); // Blink background color for success
//             playSound(successSound); // Play success sound
//           } else {
//             console.log("Already checked in for today");
//           }
//         } else {
//           if (attendance[dateStr]) {
//             if (!attendance[dateStr].checkOut) {
//               attendance[dateStr].checkOut = nowStr;
//               await updateDoc(userDocRef, { attendance });
//               console.log("Checkout successful");
//               setEmailData({ shouldSend: true, decodedCode, studentName: currentStudentName });
//               blinkBackgroundColor("bg-[#06D001]"); // Blink background color for success
//               playSound(successSound); // Play success sound
//             } else {
//               console.log("Already checked out");
//             }
//           } else {
//             // No check-in recorded but it's check-out time, record check-out
//             attendance[dateStr] = { checkIn: null, checkOut: nowStr };
//             await updateDoc(userDocRef, { attendance });
//             console.log("No check-in recorded but check-out successful");
//             setEmailData({ shouldSend: true, decodedCode, studentName: currentStudentName });
//             blinkBackgroundColor("bg-[#06D001]"); // Blink background color for success
//             playSound(successSound); // Play success sound
//           }
//         }
//         // Add the log entry with the current student's name
//         addLogEntry(decodedCode, currentStudentName);
//       } else {
//         console.log("No document found for this student ID");
//         blinkBackgroundColor("bg-[#FF0000]"); // Blink background color for failure
//         playSound(errorSound); // Play error sound
//         return; // Stop the process if no document is found
//       }
//     } catch (error) {
//       console.error("Error updating attendance: ", error);
//       blinkBackgroundColor("bg-[#FF0000]"); // Blink background color for failure
//       playSound(errorSound); // Play error sound
//     }
//   };

//   const handleResult = (result) => {
//     if (!!result) {
//       const code = result.text;
//       const decodedCode = code
//         .split("")
//         .map((char) => mappingTable[char] || "")
//         .join("");

//       if (!decodedCode.startsWith("mvba_")) {
//         console.log("Invalid code, get better at coding boi");
//         blinkBackgroundColor("bg-[#FF0000]"); // Blink background color for invalid code
//         playSound(errorSound); // Play error sound
//         return;
//       }

//       const processedCode = decodedCode.slice(5);

//       const now = new Date();
//       const currentHour = now.getHours();
//       const currentMinute = now.getMinutes();

//       if (!scannedCodesRef.current.has(processedCode)) {
//         setData(processedCode);
//         scannedCodesRef.current.add(processedCode);

//         const isCheckIn = (currentHour > 6 || (currentHour === 6 && currentMinute >= 0)) &&
//           (currentHour < 13 || (currentHour === 14 && currentMinute < 50));

//         updateAttendance(processedCode, isCheckIn);

//         setCurrentDecodedCode(processedCode);
//       } else {
//         console.log("Already scanned this code");
//       }
//     }
//   };

//   const addLogEntry = (processedCode, studentName) => {
//     const newLogEntry = {
//       id: processedCode,
//       time: new Date().toLocaleTimeString("en-US", {
//         hour: "2-digit",
//         minute: "2-digit",
//         second: "2-digit",
//       }),
//       studentName: studentName,
//     };
//     console.log("New Log Entry:", newLogEntry);
//     setLog((prevLog) => [newLogEntry, ...prevLog.slice(0, 9)]);
//   };

//   const handleScanError = (error) => {
//     console.error("QR Scan Error:", error);
//     blinkBackgroundColor("bg-[#FF0000]"); // Blink background color for scan error
//     playSound(errorSound); // Play error sound
//   };

//   const handleEmailSent = () => {
//     setEmailData({ shouldSend: false, decodedCode: "", studentName: "" });
//   };

//   const playSound = (sound) => {
//     const audio = new Audio(sound);
//     audio.play();
//   };

//   const blinkBackgroundColor = (color) => {
//     setBackgroundColor(color);
//     setTimeout(() => setBackgroundColor("bg-gray-100"), 1000); // Change back to original color after 1 second
//   };

//   return (
//     <div className={`${backgroundColor} flex flex-col lg:flex-row items-center justify-center min-h-screen`}>
//       <div className="bg-white rounded-lg shadow-md p-6 w-full lg:w-1/2 h-full">
//         <QrReader
//           onResult={handleResult}
//           onError={handleScanError}
//           constraints={{ facingMode: "environment" }}
//           style={{ width: "100%", height: "100%" }}
//         />
//       </div>
//       <div className="bg-white rounded-lg shadow-md p-6 w-full lg:w-1/2 h-full flex flex-col items-center">
//         <div className="flex flex-col items-center justify-center mt-6">
//           <p className="text-lg font-bold text-gray-600 mb-2">Scan Result:</p>
//           <div className="flex items-center justify-center bg-white rounded-lg shadow-md p-4">
//             <p className="text-base text-blue-600 font-semibold">{data}</p>
//           </div>
//         </div>
//         <div className="bg-white rounded-lg shadow-lg mt-6 w-full overflow-y-scroll">
//           <ul className="text-gray-500 divide-y divide-gray-300">
//             {log.map((entry, index) => (
//               <li key={`${entry.id}-${index}`} className="py-4 px-6">
//                 <span className="block font-semibold">{entry.time}</span>
//                 <span className="block">{entry.studentName}</span>
//               </li>
//             ))}
//           </ul>
//         </div>

//         {/* Conditionally render the Email component */}
//         {emailData.shouldSend && (
//           <Email
//             studentName={emailData.studentName}
//             decodedCode={emailData.decodedCode}
//             onEmailSent={handleEmailSent}
//           />
//         )}
//       </div>
//     </div>
//   );
// }

// export default Scan;












//working with notification, but iam not satisfied
// import React, { useState, useRef, useEffect } from "react";
// import { QrReader } from "react-qr-reader";
// import { doc, getDoc, updateDoc } from "firebase/firestore";
// import { db } from "./firebase.js";
// import { mappingTable, getPhilippineTime } from "./Constants";
// import Email from "./Email"; // Import the Email component
// import success from "./good.wav";
// import error from "./error.wav";

// function Scan() {
//   const [data, setData] = useState("");
//   const [log, setLog] = useState([]);
//   const [studentName, setStudentName] = useState("");
//   const [currentDecodedCode, setCurrentDecodedCode] = useState("");
//   const [emailData, setEmailData] = useState({ shouldSend: false, decodedCode: "", studentName: "" });
//   const [isCheckInMode, setIsCheckInMode] = useState(null);
//   const [bgColor, setBgColor] = useState(""); // Background color state

//   const scannedCodesRef = useRef(new Set());

//   const checkMode = () => {
//     const now = new Date();
//     const currentHour = now.getHours();
//     const currentMinute = now.getMinutes();

//     return (currentHour > 6 || (currentHour === 6 && currentMinute >= 0)) &&
//       (currentHour < 13 || (currentHour === 14 && currentMinute < 50));
//   };

//   useEffect(() => {
//     const initialCheckInMode = checkMode();
//     setIsCheckInMode(initialCheckInMode);
//     console.log(`Currently in ${initialCheckInMode ? 'check-in' : 'check-out'} mode`);

//     const interval = setInterval(() => {
//       const currentMode = checkMode();
//       if (currentMode !== isCheckInMode) {
//         console.log(`Switching to ${currentMode ? 'check-in' : 'check-out'} mode`);
//         setIsCheckInMode(currentMode);
//       }
//     }, 60000);

//     return () => clearInterval(interval);
//   }, [isCheckInMode]);

//   useEffect(() => {
//     const cleanupInterval = setInterval(() => {
//       const now = new Date();
//       const currentHour = now.getHours();
//       const currentMinute = now.getMinutes();

//       if (currentHour === 14 && currentMinute === 50) {
//         cleanup();
//       }
//     }, 60000); // Check every minute

//     return () => clearInterval(cleanupInterval); // Cleanup the interval on component unmount
//   }, []);

//   const cleanup = () => {
//     console.log("Running cleanup...");
//     setData("");
//     setLog([]);
//     setStudentName("");
//     setCurrentDecodedCode("");
//     setEmailData({ shouldSend: false, decodedCode: "", studentName: "" });
//     scannedCodesRef.current.clear();
//   };

//   const playAudio = (audioFile) => {
//     const audio = new Audio(audioFile);
//     audio.play();
//   };

//   const updateBackgroundColor = (color) => {
//     setBgColor(color);
//     setTimeout(() => {
//       setBgColor("");
//     }, 1000);
//   };

//   const updateAttendance = async (decodedCode, isCheckIn) => {
//     try {
//       const userDocRef = doc(db, "users", decodedCode);
//       console.log(`Reading from Firebase: ${decodedCode}`);
//       const userDocSnap = await getDoc(userDocRef);
//       console.log(`Firebase read complete for ${decodedCode}`);
//       const nowStr = getPhilippineTime();
//       const dateStr = nowStr.split("T")[0];

//       if (userDocSnap.exists()) {
//         const userData = userDocSnap.data();
//         const attendance = userData.attendance || {};
//         const currentStudentName = userData.name || "Unknown";
//         setStudentName(currentStudentName);
//         console.log("eto", currentStudentName);

//         if (isCheckIn) {
//           if (!attendance[dateStr]) {
//             attendance[dateStr] = { checkIn: nowStr, checkOut: null };
//             await updateDoc(userDocRef, { attendance });
//             console.log("Check-in successful");
//             setEmailData({ shouldSend: true, decodedCode, studentName: currentStudentName });
//             updateBackgroundColor("#42A5F5"); // Valid QR code, set background color to green
//             playAudio(success); // Play success audio
//           } else {
//             console.log("Already checked in for today");
//             updateBackgroundColor("#FFEB3B"); // Already checked in, set background color to yellow
//           }
//         } else {
//           if (attendance[dateStr]) {
//             if (!attendance[dateStr].checkOut) {
//               attendance[dateStr].checkOut = nowStr;
//               await updateDoc(userDocRef, { attendance });
//               console.log("Checkout successful");
//               setEmailData({ shouldSend: true, decodedCode, studentName: currentStudentName });
//               updateBackgroundColor("#42A5F5"); // Valid QR code, set background color to green
//               playAudio(success); // Play success audio
//             } else {
//               console.log("Already checked out");
//               updateBackgroundColor("#FFEB3B"); // Already checked out, set background color to yellow
//             }
//           } else {
//             // No check-in recorded but it's check-out time, record check-out
//             attendance[dateStr] = { checkIn: null, checkOut: nowStr };
//             await updateDoc(userDocRef, { attendance });
//             console.log("No check-in recorded but check-out successful");
//             setEmailData({ shouldSend: true, decodedCode, studentName: currentStudentName });
//             updateBackgroundColor("#42A5F5"); // Valid QR code, set background color to green
//             playAudio(success); // Play success audio
//           }
//         }
//         // Add the log entry with the current student's name
//         addLogEntry(decodedCode, currentStudentName);
//       } else {
//         console.log("No document found for this student ID");
//         updateBackgroundColor("#EF5350"); // Invalid QR code, set background color to red
//         playAudio(error); // Play error audio
//         return; // Stop the process if no document is found
//       }
//     } catch (error) {
//       console.error("Error updating attendance: ", error);
//       updateBackgroundColor("#EF5350"); // Error occurred, set background color to red
//       playAudio(error); // Play error audio
//     }
//   };

//   const handleResult = (result) => {
//     if (!!result) {
//       const code = result.text;
//       const decodedCode = code
//         .split("")
//         .map((char) => mappingTable[char] || "")
//         .join("");

//       if (!decodedCode.startsWith("mvba_")) {
//         console.log("Invalid code, get better at coding boi");
//         updateBackgroundColor("#EF5350"); // Invalid QR code, set background color to red
//         playAudio(error); // Play error audio
//         return;
//       }

//       const processedCode = decodedCode.slice(5);

//       const now = new Date();
//       const currentHour = now.getHours();
//       const currentMinute = now.getMinutes();

//       if (!scannedCodesRef.current.has(processedCode)) {
//         setData(processedCode);
//         scannedCodesRef.current.add(processedCode);

//         const isCheckIn = (currentHour > 6 || (currentHour === 6 && currentMinute >= 0)) &&
//           (currentHour < 13 || (currentHour === 14 && currentMinute < 50));

//         updateAttendance(processedCode, isCheckIn);

//         setCurrentDecodedCode(processedCode);
//       } else {
//         console.log("Already scanned this code");
//         updateBackgroundColor("#FFEB3B"); // Already scanned, set background color to yellow
//       }
//     }
//   };

//   const addLogEntry = (processedCode, studentName) => {
//     const newLogEntry = {
//       id: processedCode,
//       time: new Date().toLocaleTimeString("en-US", {
//         hour: "2-digit",
//         minute: "2-digit",
//         second: "2-digit",
//       }),
//       studentName: studentName,
//     };
//     console.log("New Log Entry:", newLogEntry);
//     setLog((prevLog) => [newLogEntry, ...prevLog.slice(0, 9)]);
//   };

//   const handleScanError = (error) => {
//     console.error("QR Scan Error:", error);
//     updateBackgroundColor("#EF5350"); // Error occurred, set background color to red
//     playAudio(error); // Play error audio
//   };

//   const handleEmailSent = () => {
//     setEmailData({ shouldSend: false, decodedCode: "", studentName: "" });
//   };

//   return (
//     <div className="bg-gray-100 flex flex-col lg:flex-row items-center justify-center min-h-screen">
//       <div className="bg-white rounded-lg shadow-md p-6 w-full lg:w-1/2 h-full">
//         <div className="rounded-lg" style={{ backgroundColor: bgColor }}>
//           <QrReader
//             onResult={handleResult}
//             onError={handleScanError}
//             constraints={{ facingMode: "environment" }}
//             style={{ width: "100%", height: "100%" }}
//           />
//         </div>
//         </div>
//       <div className="bg-white rounded-lg shadow-md p-6 w-full lg:w-1/2 h-full mt-6 lg:mt-0 lg:ml-6">
//         <div className="overflow-y-auto h-64 mb-4">
//           <h2 className="text-xl font-bold mb-2">Scan Results</h2>
//           <p>Decoded Code: {data}</p>
//           <p>Student Name: {studentName}</p>
//         </div>
//         <div className="overflow-y-auto h-64">
//           <h2 className="text-xl font-bold mb-2">Log</h2>
//           <ul>
//             {log.map((entry, index) => (
//               <li key={index} className="border-b py-2">
//                 <p>ID: {entry.id}</p>
//                 <p>Time: {entry.time}</p>
//                 <p>Name: {entry.studentName}</p>
//               </li>
//             ))}
//           </ul>
//         </div>
//       </div>
//       {emailData.shouldSend && (
//         <Email
//           decodedCode={emailData.decodedCode}
//           studentName={emailData.studentName}
//           onEmailSent={handleEmailSent}
//         />
//       )}
//     </div>
//   );
// }

// export default Scan;


















// working friday no notifications or whatnot
// import React, { useState, useRef, useEffect } from "react";
// import { QrReader } from "react-qr-reader";
// import { doc, getDoc, updateDoc } from "firebase/firestore";
// import { db } from "./firebase.js";
// import { mappingTable, getPhilippineTime } from "./Constants";
// import Email from "./Email"; // Import the Email component

// function Scan() {
//   const [data, setData] = useState("");
//   const [log, setLog] = useState([]);
//   const [studentName, setStudentName] = useState("");
//   const [currentDecodedCode, setCurrentDecodedCode] = useState("");
//   const [emailData, setEmailData] = useState({ shouldSend: false, decodedCode: "", studentName: "" });
//   const [isCheckInMode, setIsCheckInMode] = useState(null);

//   const scannedCodesRef = useRef(new Set());

//   const checkMode = () => {
//     const now = new Date();
//     const currentHour = now.getHours();
//     const currentMinute = now.getMinutes();

//     return (currentHour > 6 || (currentHour === 6 && currentMinute >= 0)) &&
//       (currentHour < 13 || (currentHour === 14 && currentMinute < 50));
//   };

//   useEffect(() => {
//     const initialCheckInMode = checkMode();
//     setIsCheckInMode(initialCheckInMode);
//     console.log(`Currently in ${initialCheckInMode ? 'check-in' : 'check-out'} mode`);

//     const interval = setInterval(() => {
//       const currentMode = checkMode();
//       if (currentMode !== isCheckInMode) {
//         console.log(`Switching to ${currentMode ? 'check-in' : 'check-out'} mode`);
//         setIsCheckInMode(currentMode);
//       }
//     }, 60000);

//     return () => clearInterval(interval);
//   }, [isCheckInMode]);

//   useEffect(() => {
//     const cleanupInterval = setInterval(() => {
//       const now = new Date();
//       const currentHour = now.getHours();
//       const currentMinute = now.getMinutes();

//       if (currentHour === 14 && currentMinute === 50) {
//         cleanup();
//       }
//     }, 60000); // Check every minute

//     return () => clearInterval(cleanupInterval); // Cleanup the interval on component unmount
//   }, []);

//   const cleanup = () => {
//     console.log("Running cleanup...");
//     setData("");
//     setLog([]);
//     setStudentName("");
//     setCurrentDecodedCode("");
//     setEmailData({ shouldSend: false, decodedCode: "", studentName: "" });
//     scannedCodesRef.current.clear();
//   };

//   const updateAttendance = async (decodedCode, isCheckIn) => {
//     try {
//       const userDocRef = doc(db, "users", decodedCode);
//       console.log(`Reading from Firebase: ${decodedCode}`);
//       const userDocSnap = await getDoc(userDocRef);
//       console.log(`Firebase read complete for ${decodedCode}`);
//       const nowStr = getPhilippineTime();
//       const dateStr = nowStr.split("T")[0];

//       if (userDocSnap.exists()) {
//         const userData = userDocSnap.data();
//         const attendance = userData.attendance || {};
//         const currentStudentName = userData.name || "Unknown";
//         setStudentName(currentStudentName);
//         console.log("eto", currentStudentName);

//         if (isCheckIn) {
//           if (!attendance[dateStr]) {
//             attendance[dateStr] = { checkIn: nowStr, checkOut: null };
//             await updateDoc(userDocRef, { attendance });
//             console.log("Check-in successful");
//             setEmailData({ shouldSend: true, decodedCode, studentName: currentStudentName });
//           } else {
//             console.log("Already checked in for today");
//           }
//         } else {
//           if (attendance[dateStr]) {
//             if (!attendance[dateStr].checkOut) {
//               attendance[dateStr].checkOut = nowStr;
//               await updateDoc(userDocRef, { attendance });
//               console.log("Checkout successful");
//               setEmailData({ shouldSend: true, decodedCode, studentName: currentStudentName });
//             } else {
//               console.log("Already checked out");
//             }
//           } else {
//             // No check-in recorded but it's check-out time, record check-out
//             attendance[dateStr] = { checkIn: null, checkOut: nowStr };
//             await updateDoc(userDocRef, { attendance });
//             console.log("No check-in recorded but check-out successful");
//             setEmailData({ shouldSend: true, decodedCode, studentName: currentStudentName });
//           }
//         }
//         // Add the log entry with the current student's name
//         addLogEntry(decodedCode, currentStudentName);
//       } else {
//         console.log("No document found for this student ID");
//         return; // Stop the process if no document is found
//       }
//     } catch (error) {
//       console.error("Error updating attendance: ", error);
//     }
//   };

//   const handleResult = (result) => {
//     if (!!result) {
//       const code = result.text;
//       const decodedCode = code
//         .split("")
//         .map((char) => mappingTable[char] || "")
//         .join("");

//       if (!decodedCode.startsWith("mvba_")) {
//         console.log("Invalid code, get better at coding boi");
//         return;
//       }

//       const processedCode = decodedCode.slice(5);

//       const now = new Date();
//       const currentHour = now.getHours();
//       const currentMinute = now.getMinutes();

//       if (!scannedCodesRef.current.has(processedCode)) {
//         setData(processedCode);
//         scannedCodesRef.current.add(processedCode);

//         const isCheckIn = (currentHour > 6 || (currentHour === 6 && currentMinute >= 0)) &&
//           (currentHour < 13 || (currentHour === 14 && currentMinute < 50));

//         updateAttendance(processedCode, isCheckIn);

//         setCurrentDecodedCode(processedCode);
//       } else {
//         console.log("Already scanned this code");
//       }
//     }
//   };

//   const addLogEntry = (processedCode, studentName) => {
//     const newLogEntry = {
//       id: processedCode,
//       time: new Date().toLocaleTimeString("en-US", {
//         hour: "2-digit",
//         minute: "2-digit",
//         second: "2-digit",
//       }),
//       studentName: studentName,
//     };
//     console.log("New Log Entry:", newLogEntry);
//     setLog((prevLog) => [newLogEntry, ...prevLog.slice(0, 9)]);
//   };

//   const handleScanError = (error) => {
//     console.error("QR Scan Error:", error);
//   };

//   const handleEmailSent = () => {
//     setEmailData({ shouldSend: false, decodedCode: "", studentName: "" });
//   };

//   return (
//     <div className="bg-gray-100 flex flex-col lg:flex-row items-center justify-center min-h-screen">
//       <div className="bg-white rounded-lg shadow-md p-6 w-full lg:w-1/2 h-full">
//         <QrReader
//           onResult={handleResult}
//           onError={handleScanError}
//           constraints={{ facingMode: "environment" }}
//           style={{ width: "100%", height: "100%" }}
//         />
//       </div>
//       <div className="bg-white rounded-lg shadow-md p-6 w-full lg:w-1/2 h-full flex flex-col items-center">
//         <div className="flex flex-col items-center justify-center mt-6">
//           <p className="text-lg font-bold text-gray-600 mb-2">Scan Result:</p>
//           <div className="flex items-center justify-center bg-white rounded-lg shadow-md p-4">
//             <p className="text-base text-blue-600 font-semibold">{data}</p>
//           </div>
//         </div>

//         <div className="bg-white rounded-lg shadow-lg mt-6 w-full overflow-y-scroll">
//           <ul className="text-gray-500 divide-y divide-gray-300">
//             {log.map((entry, index) => (
//               <li key={`${entry.id}-${index}`} className="py-4 px-6">
//                 <span className="block font-semibold">{entry.time}</span>
//                 <span className="block">{entry.studentName}</span>
//               </li>
//             ))}
//           </ul>
//         </div>

//         {/* Conditionally render the Email component */}
//         {emailData.shouldSend && (
//           <Email
//             studentName={emailData.studentName}
//             decodedCode={emailData.decodedCode}
//             onEmailSent={handleEmailSent}
//           />
//         )}
//       </div>
//     </div>
//   );
// }

// export default Scan;





//working thursday noon

// import React, { useState, useRef, useEffect } from "react";
// import { QrReader } from "react-qr-reader";
// import { doc, getDoc, updateDoc } from "firebase/firestore";
// import { db } from "./firebase.js";
// import { mappingTable, getPhilippineTime } from "./Constants";
// import Email from "./Email"; // Import the Email component

// function Scan() {
//   const [data, setData] = useState("");
//   const [log, setLog] = useState([]);
//   const [studentName, setStudentName] = useState("");
//   const [currentDecodedCode, setCurrentDecodedCode] = useState("");
//   const [emailData, setEmailData] = useState({ shouldSend: false, decodedCode: "", studentName: "" });

//   const scannedCodesRef = useRef(new Set());

//   const updateAttendance = async (decodedCode, isCheckIn) => {
//     try {
//       const userDocRef = doc(db, "users", decodedCode);
//       console.log(`Reading from Firebase: ${decodedCode}`);
//       const userDocSnap = await getDoc(userDocRef);
//       console.log(`Firebase read complete for ${decodedCode}`);
//       const nowStr = getPhilippineTime();
//       const dateStr = nowStr.split("T")[0];

//       if (userDocSnap.exists()) {
//         const userData = userDocSnap.data();
//         const attendance = userData.attendance || {};
//         const currentStudentName = userData.name || "Unknown";
//         setStudentName(currentStudentName);
//         console.log("eto", currentStudentName);

//         if (isCheckIn) {
//           if (!attendance[dateStr]) {
//             attendance[dateStr] = { checkIn: nowStr, checkOut: null };
//             await updateDoc(userDocRef, { attendance });
//             console.log("Check-in successful");
//             setEmailData({ shouldSend: true, decodedCode, studentName: currentStudentName });
//           } else {
//             console.log("Already checked in for today");
//           }
//         } else {
//           if (attendance[dateStr] && !attendance[dateStr].checkOut) {
//             attendance[dateStr].checkOut = nowStr;
//             await updateDoc(userDocRef, { attendance });
//             console.log("Checkout successful");
//             setEmailData({ shouldSend: true, decodedCode, studentName: currentStudentName });
//           } else {
//             console.log("Already checked out or no check-in recorded");
//           }
//         }
//         // Add the log entry with the current student's name
//         addLogEntry(decodedCode, currentStudentName);
//       } else {
//         console.log("No document found for this student ID");
//         return; // Stop the process if no document is found
//       }
//     } catch (error) {
//       console.error("Error updating attendance: ", error);
//     }
//   };

//   const handleResult = (result) => {
//     if (!!result) {
//       const code = result.text;
//       const decodedCode = code
//         .split("")
//         .map((char) => mappingTable[char] || "")
//         .join("");

//       if (!decodedCode.startsWith("mvba_")) {
//         console.log("Invalid code, get better at coding boi");
//         return;
//       }

//       const processedCode = decodedCode.slice(5);

//       const now = new Date();
//       const currentHour = now.getHours();

//       if (!scannedCodesRef.current.has(processedCode)) {
//         setData(processedCode);
//         scannedCodesRef.current.add(processedCode);

//         if (currentHour >= 6 && currentHour < 20) {
//           updateAttendance(processedCode, true);
//         } else {
//           updateAttendance(processedCode, false);
//         }

//         setCurrentDecodedCode(processedCode);
//       } else {
//         console.log("Already scanned this code");
//       }
//     }
//   };

//   const addLogEntry = (processedCode, studentName) => {
//     const newLogEntry = {
//       id: processedCode,
//       time: new Date().toLocaleTimeString("en-US", {
//         hour: "2-digit",
//         minute: "2-digit",
//         second: "2-digit",
//       }),
//       studentName: studentName,
//     };
//     console.log("New Log Entry:", newLogEntry);
//     setLog((prevLog) => [newLogEntry, ...prevLog.slice(0, 9)]);
//   };

//   const handleScanError = (error) => {
//     console.error("QR Scan Error:", error);
//   };

//   const handleEmailSent = () => {
//     setEmailData({ shouldSend: false, decodedCode: "", studentName: "" });
//   };


//   return (
//     <div className="bg-gray-100 flex flex-col lg:flex-row items-center justify-center min-h-screen">
//       <div className="bg-white rounded-lg shadow-md p-6 w-full lg:w-1/2 h-full">
//         <QrReader
//           onResult={handleResult}
//           onError={handleScanError}
//           constraints={{ facingMode: "environment" }}
//           style={{ width: "100%", height: "100%" }}
//         />
//       </div>
//       <div className="bg-white rounded-lg shadow-md p-6 w-full lg:w-1/2 h-full flex flex-col items-center">
//         <div className="flex flex-col items-center justify-center mt-6">
//           <p className="text-lg font-bold text-gray-600 mb-2">Scan Result:</p>
//           <div className="flex items-center justify-center bg-white rounded-lg shadow-md p-4">
//             <p className="text-base text-blue-600 font-semibold">{data}</p>
//           </div>
//         </div>

//         <div className="bg-white rounded-lg shadow-lg mt-6 w-full overflow-y-scroll">
//           <ul className="text-gray-500 divide-y divide-gray-300">
//             {log.map((entry, index) => (
//               <li key={`${entry.id}-${index}`} className="py-4 px-6">
//                 <span className="block font-semibold">{entry.time}</span>
//                 <span className="block">{entry.studentName}</span>
//               </li>
//             ))}
//           </ul>
//         </div>

//         {/* Conditionally render the Email component */}
//         {emailData.shouldSend && (
//           <Email
//             studentName={emailData.studentName}
//             decodedCode={emailData.decodedCode}
//             onEmailSent={handleEmailSent}
//           />
//         )}
//       </div>
//     </div>
//   );

// }

// export default Scan;


//working thursday
 // Scan.jsx
// import React, { useState, useRef, useEffect } from "react";
// import { QrReader } from "react-qr-reader";
// import { doc, getDoc, updateDoc } from "firebase/firestore";
// import { db } from "./firebase.js";
// import { mappingTable, getPhilippineTime } from "./Constants";
// import Email from "./Email"; // Import the Email component

// function Scan() {
//   const [data, setData] = useState("");
//   const [log, setLog] = useState([]);
//   const [studentName, setStudentName] = useState("");
//   const [currentDecodedCode, setCurrentDecodedCode] = useState("");
//   const [emailData, setEmailData] = useState({ shouldSend: false, decodedCode: "", studentName: "" });

//   const scannedCodesRef = useRef(new Set());

//   const updateAttendance = async (decodedCode, isCheckIn) => {
//     try {
//       const userDocRef = doc(db, "users", decodedCode);
//       console.log(`Reading from Firebase: ${decodedCode}`);
//       const userDocSnap = await getDoc(userDocRef);
//       console.log(`Firebase read complete for ${decodedCode}`);
//       const nowStr = getPhilippineTime();
//       const dateStr = nowStr.split("T")[0];

//       if (userDocSnap.exists()) {
//         const userData = userDocSnap.data();
//         const attendance = userData.attendance || {};
//         const currentStudentName = userData.name || "Unknown";
//         setStudentName(currentStudentName);
//         console.log("eto", currentStudentName);

//         if (isCheckIn) {
//           if (!attendance[dateStr]) {
//             attendance[dateStr] = { checkIn: nowStr, checkOut: null };
//             await updateDoc(userDocRef, { attendance });
//             console.log("Check-in successful");
//             setEmailData({ shouldSend: true, decodedCode, studentName: currentStudentName });
//           } else {
//             console.log("Already checked in for today");
//           }
//         } else {
//           if (attendance[dateStr] && !attendance[dateStr].checkOut) {
//             attendance[dateStr].checkOut = nowStr;
//             await updateDoc(userDocRef, { attendance });
//             console.log("Checkout successful");
//             setEmailData({ shouldSend: true, decodedCode, studentName: currentStudentName });
//           } else {
//             console.log("Already checked out or no check-in recorded");
//           }
//         }
//       } else {
//         console.log("No document found for this student ID");
//         return; // Stop the process if no document is found
//       }
//     } catch (error) {
//       console.error("Error updating attendance: ", error);
//     }
//   };

//   const handleResult = (result) => {
//     if (!!result) {
//       const code = result.text;
//       const decodedCode = code
//         .split("")
//         .map((char) => mappingTable[char] || "")
//         .join("");

//       if (!decodedCode.startsWith("mvba_")) {
//         console.log("Invalid code, get better at coding boi");
//         return;
//       }

//       const processedCode = decodedCode.slice(5);

//       const now = new Date();
//       const currentHour = now.getHours();

//       if (!scannedCodesRef.current.has(processedCode)) {
//         setData(processedCode);
//         scannedCodesRef.current.add(processedCode);

//         if (currentHour >= 6 && currentHour < 20) {
//           updateAttendance(processedCode, true);
//         } else {
//           updateAttendance(processedCode, false);
//         }

//         addLogEntry(processedCode);
//         setCurrentDecodedCode(processedCode);
//       } else {
//         console.log("Already scanned this code");
//       }
//     }
//   };

//   const addLogEntry = (processedCode) => {
//     const newLogEntry = {
//       id: processedCode,
//       time: new Date().toLocaleTimeString("en-US", {
//         hour: "2-digit",
//         minute: "2-digit",
//         second: "2-digit",
//       }),
//     };
//     console.log("New Log Entry:", newLogEntry);
//     setLog((prevLog) => [newLogEntry, ...prevLog.slice(0, 9)]);
//   };

//   const handleScanError = (error) => {
//     console.error("QR Scan Error:", error);
//   };

//   const handleEmailSent = () => {
//     setEmailData({ shouldSend: false, decodedCode: "", studentName: "" });
//   };

//   return (
//     <div className="bg-gray-100 flex flex-col items-center justify-center">
//       <div className="bg-white rounded-lg shadow-md p-6 w-full h-full">
//         <QrReader
//           onResult={handleResult}
//           onError={handleScanError}
//           constraints={{ facingMode: "environment" }}
//           style={{ width: "100%", height: "100%" }}
//         />
//         <div className="flex flex-col items-center justify-center mt-6">
//           <p className="text-lg font-bold text-gray-600 mb-2">Scan Result:</p>
//           <div className="flex items-center justify-center bg-white rounded-lg shadow-md p-4">
//             <p className="text-base text-blue-600 font-semibold">{data}</p>
//           </div>
//         </div>

//         <div className="bg-white rounded-lg shadow-lg mt-6 w-full overflow-y-scroll">
//           <ul className="text-gray-500 divide-y divide-gray-300">
//             {log.map((entry, index) => (
//               <li key={`${entry.id}-${index}`} className="py-4 px-6">
//                 <span className="block font-semibold">{entry.time}</span>
//               </li>
//             ))}
//           </ul>
//         </div>

//         {/* Conditionally render the Email component */}
//         {emailData.shouldSend && (
//           <Email
//             studentName={emailData.studentName}
//             decodedCode={emailData.decodedCode}
//             onEmailSent={handleEmailSent}
//           />
//         )}
//       </div>
//     </div>
//   );
// }

// export default Scan;































// import React, { useState, useRef, useEffect } from "react";
// import { QrReader } from "react-qr-reader";
// import { doc, getDoc, updateDoc } from "firebase/firestore";
// import { db } from "./firebase.js";
// import Email from "./Email";
// import { mappingTable, getPhilippineTime } from "./Constants";

// function Scan() {
//   const [data, setData] = useState("");
//   const [log, setLog] = useState([]);
//   const [studentName, setStudentName] = useState("");
//   const [emailSent, setEmailSent] = useState(false);
//   const [currentDecodedCode, setCurrentDecodedCode] = useState("");

//   const scannedCodesRef = useRef(new Set());
//   const emailSentCodesRef = useRef(new Set());

//   const updateAttendance = async (decodedCode, isCheckIn) => {
//     try {
//       const userDocRef = doc(db, "users", decodedCode);
//       console.log(`Reading from Firebase: ${decodedCode}`);
//       const userDocSnap = await getDoc(userDocRef);
//       console.log(`Firebase read complete for ${decodedCode}`);
//       const nowStr = getPhilippineTime();
//       const dateStr = nowStr.split("T")[0];

//       if (userDocSnap.exists()) {
//         const userData = userDocSnap.data();
//         const attendance = userData.attendance || {};
//         const currentStudentName = userData.name || "Unknown";
//         setStudentName(currentStudentName); // Update studentName state

//         if (isCheckIn) {
//           if (!attendance[dateStr]) {
//             attendance[dateStr] = { checkIn: nowStr, checkOut: null };
//             await updateDoc(userDocRef, { attendance });
//             console.log("Check-in successful");

//             if (!emailSentCodesRef.current.has(decodedCode)) {
//               setEmailSent(false);
//             }
//           } else {
//             console.log("Already checked in for today");
//           }
//         } else {
//           if (attendance[dateStr] && !attendance[dateStr].checkOut) {
//             attendance[dateStr].checkOut = nowStr;
//             await updateDoc(userDocRef, { attendance });
//             console.log("Checkout successful");
//           } else {
//             console.log("Already checked out or no check-in recorded");
//           }
//         }
//       } else {
//         console.log("No document found for this student ID");
//         return; // Stop the process if no document is found
//       }
//     } catch (error) {
//       console.error("Error updating attendance: ", error);
//     }
//   };

//   const handleResult = (result) => {
//     if (!!result) {
//       const code = result.text;
//       const decodedCode = code
//         .split("")
//         .map((char) => mappingTable[char] || "")
//         .join("");

//       if (!decodedCode.startsWith("mvba_")) {
//         console.log("Invalid code, get better at coding boi");
//         return;
//       }

//       const processedCode = decodedCode.slice(5);

//       const now = new Date();
//       const currentHour = now.getHours();

//       if (!scannedCodesRef.current.has(processedCode)) {
//         setData(processedCode);
//         scannedCodesRef.current.add(processedCode);

//         if (currentHour >= 6 && currentHour < 15) {
//           updateAttendance(processedCode, true);
//         } else {
//           updateAttendance(processedCode, false);
//         }

//         addLogEntry(processedCode);
//         setCurrentDecodedCode(processedCode); // Set the current decoded code
//         setEmailSent(false); // Reset email sent state for new scan
//       } else {
//         console.log("Already scanned this code");
//       }
//     }
//   };

//   const addLogEntry = (processedCode) => {
//     const newLogEntry = {
//       id: processedCode,
//       time: new Date().toLocaleTimeString("en-US", {
//         hour: "2-digit",
//         minute: "2-digit",
//         second: "2-digit",
//       }),
//     };
//     console.log("New Log Entry:", newLogEntry);
//     setLog((prevLog) => [newLogEntry, ...prevLog.slice(0, 9)]);
//   };

//   const handleScanError = (error) => {
//     console.error("QR Scan Error:", error);
//   };

//   const handleEmailSent = () => {
//     setEmailSent(true);
//     emailSentCodesRef.current.add(currentDecodedCode); // Add code to email sent set
//   };

//   useEffect(() => {
//     if (currentDecodedCode && !emailSent && !emailSentCodesRef.current.has(currentDecodedCode)) {
//       setEmailSent(true); // Mark email as sent to prevent re-sending
//     }
//   }, [currentDecodedCode, emailSent]);

//   return (
//     <div className="bg-gray-100 flex flex-col items-center justify-center">
//       <div className="bg-white rounded-lg shadow-md p-6 w-full h-full">
//         <QrReader
//           onResult={handleResult}
//           onError={handleScanError}
//           constraints={{ facingMode: "environment" }}
//           style={{ width: "100%", height: "100%" }}
//         />
//         <div className="flex flex-col items-center justify-center mt-6">
//           <p className="text-lg font-bold text-gray-600 mb-2">Scan Result:</p>
//           <div className="flex items-center justify-center bg-white rounded-lg shadow-md p-4">
//             <p className="text-base text-blue-600 font-semibold">{data}</p>
//           </div>
//         </div>

//         <div className="bg-white rounded-lg shadow-lg mt-6 w-full overflow-y-scroll">
//           <ul className="text-gray-500 divide-y divide-gray-300">
//             {log.map((entry, index) => (
//               <li key={`${entry.id}-${index}`} className="py-4 px-6">
//                 <span className="block font-semibold">{entry.time}</span>
//               </li>
//             ))}
//           </ul>
//         </div>

//         {!emailSent && !emailSentCodesRef.current.has(currentDecodedCode) && (
//           <Email
//             studentName={studentName}
//             decodedCode={currentDecodedCode}
//             onEmailSent={handleEmailSent}
//           />
//         )}
//       </div>
//     </div>
//   );
// }

// export default Scan;


//main problem, fix the scanning, make it work my guyyyyyyy

// import React, { useState, useEffect } from "react";
// import { QrReader } from "react-qr-reader";
// import { doc, getDoc, updateDoc } from "firebase/firestore";
// import { db } from "./firebase.js";

// function Scan() {
//   const [lastScanned, setLastScanned] = useState(null);
//   const [data, setData] = useState("");
//   const [log, setLog] = useState([]);
//   const [scannedCodes, setScannedCodes] = useState(new Set());
//   const [scannerEnabled, setScannerEnabled] = useState(false);

//   useEffect(() => {
//     const interval = setInterval(() => {
//       const now = new Date();
//       const allowedStartTime = new Date(
//         now.getFullYear(),
//         now.getMonth(),
//         now.getDate(),
//         4,
//         0,
//         0
//       ); // 9:00 AM
//       const allowedEndTime = new Date(
//         now.getFullYear(),
//         now.getMonth(),
//         now.getDate(),
//         23,
//         0,
//         0
//       ); // 5:00 PM

//       if (now >= allowedStartTime && now <= allowedEndTime) {
//         setScannerEnabled(true);
//       } else {
//         setScannerEnabled(false);
//       }
//     }, 1000);

//     return () => clearInterval(interval);
//   }, []);

//   const mappingTable = {
//     Z: "0",
//     X: "1",
//     C: "2",
//     V: "3",
//     B: "4",
//     N: "5",
//     M: "6",
//     "-": "-",
//     L: "8",
//     K: "9",
//     D: "7",
//     Q: "A",
//     R: "B",
//     E: "C",
//     F: "D",
//     G: "E",
//     H: "F",
//     I: "G",
//     J: "H",
//     P: "I",
//     S: "J",
//     U: "K",
//     Y: "L",
//     A: "M",
//     O: "N",
//     W: "O",
//     T: "P",
//     1: "Q",
//     2: "R",
//     3: "S",
//     4: "T",
//     5: "U",
//     6: "V",
//     7: "W",
//     8: "X",
//     9: "Y",
//     0: "Z",
//   };

//   const schedules = {
//     STEM: {
//       "1A": {
//         Monday: {
//           startTime: "6:00:00",
//         },
//         Tuesday: {
//           startTime: "6:00:00",
//         },
//         Wednesday: {
//           startTime: "6:00:00",
//         },
//         Thursday: {
//           startTime: "6:00:00",
//         },
//         Friday: {
//           startTime: "6:00:00",
//         },
//         Saturday: {
//           startTime: "6:00:00",
//         },
//         Sunday: {
//           startTime: "6:00:00",
//         },
//       },
//       "1B": {
//         Monday: {
//           startTime: "6:00:00",
//         },
//         Tuesday: {
//           startTime: "6:00:00",
//         },
//         Wednesday: {
//           startTime: "6:30:00",
//         },
//         Thursday: {
//           startTime: "6:00:00",
//         },
//         Friday: {
//           startTime: "6:00:00",
//         },
//         Saturday: {
//           startTime: "6:00:00",
//         },
//         Sunday: {
//           startTime: "6:00:00",
//         },
//       },
//       "1C": {
//         Monday: {
//           startTime: "6:00:00",
//         },
//         Tuesday: {
//           startTime: "6:00:00",
//         },
//         Wednesday: {
//           startTime: "6:00:00",
//         },
//         Thursday: {
//           startTime: "6:00:00",
//         },
//         Friday: {
//           startTime: "6:00:00",
//         },
//         Saturday: {
//           startTime: "6:00:00",
//         },
//         Sunday: {
//           startTime: "6:00:00",
//         },
//       },
//       "1D": {
//         Monday: {
//           startTime: "6:00:00",
//         },
//         Tuesday: {
//           startTime: "6:00:00",
//         },
//         Wednesday: {
//           startTime: "6:00:00",
//         },
//         Thursday: {
//           startTime: "6:00:00",
//         },
//         Friday: {
//           startTime: "6:00:00",
//         },
//         Saturday: {
//           startTime: "6:00:00",
//         },
//         Sunday: {
//           startTime: "6:00:00",
//         },
//       },
//       "2A": {
//         Monday: {
//           startTime: "12:30:00",
//         },
//         Tuesday: {
//           startTime: "12:00:00",
//         },
//         Wednesday: {
//           startTime: "12:30:00",
//         },
//         Thursday: {
//           startTime: "12:00:00",
//         },
//         Friday: {
//           startTime: "12:00:00",
//         },
//         Saturday: {
//           startTime: "12:00:00",
//         },
//         Sunday: {
//           startTime: "12:00:00",
//         },
//       },
//     },
//   };

//   useEffect(() => {
//     const timeoutId = setTimeout(() => {
//       setData("");
//     }, 10000);
//     return () => clearTimeout(timeoutId);
//   }, [data]);

//   const handleMarkPresent = async (code) => {
//     if (scannedCodes.has(code)) {
//       console.log(`Student ${code} has already been scanned`);
//       return;
//     }
//     try {
//       const studentInfo = await markStudentPresent(code);
//       if (studentInfo) {
//         const { name, time } = studentInfo;
//         setData(`${name} | ${time}`);
//         setScannedCodes(new Set(scannedCodes.add(code)));
//       }
//     } catch (e) {
//       console.error("Error marking student as present: ", e);
//     }
//   };

//   const markStudentPresent = async (code) => {
//     const [strand, section, id, lrn] = code.split("-");
//     const sectionRef = doc(db, strand, section);
//     const sectionDoc = await getDoc(sectionRef);
//     if (sectionDoc.exists()) {
//       const sectionData = sectionDoc.data();
//       const studentKeys = Object.keys(sectionData).filter(
//         (key) => key.startsWith(id) && key.endsWith("lastScan")
//       );
//       if (studentKeys.length > 0) {
//         const studentData = {};
//         studentKeys.forEach((key) => {
//           studentData[key] = new Date();
//         });
//         const currentDay = new Date().toLocaleDateString("en-US", {
//           weekday: "long",
//         });

//         // Check student's attendance status and update it
//         let attendanceStatus = "";
//         let topNumber = "";

//         const scheduleData = schedules[strand][section][currentDay];

//         const startTimeParts = scheduleData.startTime.split(":");
//         const classStartTime = new Date();
//         classStartTime.setHours(parseInt(startTimeParts[0]));
//         classStartTime.setMinutes(parseInt(startTimeParts[1]));
//         classStartTime.setSeconds(parseInt(startTimeParts[2]));

//         const scanTime = new Date();
//         const timeDifference = scanTime.getTime() - classStartTime.getTime();

//         let badgeFieldName = "";
//         if (timeDifference <= -300000) {
//           // Student is early (arrived 5 minutes or more before class start time)
//           attendanceStatus = "early";
//         } else if (timeDifference <= 60000) {
//           // Student is on time (arrived within 5 minutes of class start time)
//           attendanceStatus = "ontime";
//         } else {
//           // Student is late (arrived more than 5 minutes after class start time)
//           attendanceStatus = "late";
//         }

//         const dayOfWeek = currentDay.substring(0, 3);
//         let dayCode;
//         switch (dayOfWeek) {
//           case "Mon":
//             dayCode = "A";
//             break;
//           case "Tue":
//             dayCode = "B";
//             break;
//           case "Wed":
//             dayCode = "C";
//             break;
//           case "Thu":
//             dayCode = "D";
//             break;
//           case "Fri":
//             dayCode = "E";
//             break;
//           default:
//             dayCode = "X";
//         }

//         const lastScanField = `${id}${dayCode}`;
//         const attendanceStatusField = `${id}${dayCode}s`;

//         studentData[lastScanField] = new Date();
//         studentData[attendanceStatusField] = attendanceStatus;
//         studentData[`${id}present`] = true;
//         studentData[`${id}status`] = attendanceStatus;
//         studentData[`${id}dif`] = timeDifference;

//         await updateDoc(sectionRef, studentData);
//         console.log(
//           `Student ${id} marked as present with ${attendanceStatus} status`
//         );
//         const timeString = new Date().toLocaleTimeString("en-US", {
//           hour: "numeric",
//           minute: "numeric",
//           hour12: true,
//         });
//         return {
//           name: sectionData[id + "name"],
//           time: timeString,
//         };
//       } else {
//         console.log(`No student found with ID ${id}`);
//         return undefined;
//       }
//     } else {
//       console.log(
//         `No section found with Strand ${strand} and Section ${section}`
//       );
//       return undefined;
//     }
//   };

//   useEffect(() => {
//     if (data) {
//       const newLogEntry = {
//         id: lastScanned,
//         info: data,
//       };

//       const existingEntryIndex = log.findIndex(
//         (entry) => entry.id === lastScanned
//       );
//       if (existingEntryIndex !== -1) {
//         const updatedLog = [...log];
//         updatedLog[existingEntryIndex] = newLogEntry;
//         setLog(updatedLog);
//       } else {
//         const updatedLog = [newLogEntry, ...log.slice(0, 9)];
//         setLog(updatedLog);
//       }
//     }
//   }, [data, lastScanned, log]);

//   return (
//     <div className="bg-gray-100 flex flex-col items-center justify-center">
//       <div className="bg-white rounded-lg shadow-md p-6 w-full h-full ">
//         <QrReader
//           onResult={async (result) => {
//             if (!!result) {
//               const code = result.text;
//                  console.log(decodedCode);
//                 console.log(result);
//               if (code !== lastScanned) {
//                 const decodedCode = code
//                   .split("")
//                   .map((char) => mappingTable[char] || "")
//                   .join("");
//                 setLastScanned(code);
//                 handleMarkPresent(decodedCode);
//                 console.log(decodedCode);
//                 console.log(result);
//               }
//             }
//           }}
//           constraints={{ facingMode: "environment" }}
//           style={{ width: "100%", height: "100%" }}
//         />
//         <div className="flex flex-col items-center justify-center mt-6">
//           <p className="text-lg font-bold text-gray-600 mb-2">Scan Result:</p>
//           <div className="flex items-center justify-center bg-white rounded-lg shadow-md p-4">
//             <p className="text-base text-blue-600 font-semibold">{data}</p>
//           </div>
//         </div>

//         <div className="flex flex-col items-center justify-center mt-8">
//           <h1 className="text-3xl font-semibold">
//             Recent{" "}
//             <span class="bg-gradient-to-r from-blue-400 to-violet-400 text-transparent bg-clip-text">
//               Scans
//             </span>
//           </h1>
//         </div>
//         <div className="bg-white rounded-lg shadow-lg mt-6 w-full overflow-y-scroll">
//           <ul className="text-gray-500 divide-y divide-gray-300">
//             {log.map((entry, index) => (
//               <li key={entry.id} className="py-4 px-6">
//                 <span className="block font-semibold">{entry.info}</span>
//               </li>
//             ))}
//           </ul>
//         </div>
//       </div>
//     </div>
//   );
// }

// export default Scan;
