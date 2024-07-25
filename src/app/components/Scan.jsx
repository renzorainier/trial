import React, { useState, useRef, useEffect } from "react";
import { QrReader } from "react-qr-reader";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "./firebase.js";
import { mappingTable, getPhilippineTime } from "./Constants";
import Email from "./Email";
import successSoundFile from "./success.wav";
import errorSoundFile from "./error.wav";
import alreadyScannedSoundFile from "./alreadyscanned.wav";
import complete from "./complete.wav";

const checkInMessages = [complete];
const checkOutMessages = [complete];

const checkMode = () => {
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  return (currentHour > 6 || (currentHour === 6 && currentMinute >= 0)) && currentHour < 10;
};

const cleanup = (setData, setLog, setStudentName, setCurrentDecodedCode, setEmailData, scannedCodesRef) => {
  console.log("Running cleanup...");
  setData("");
  setLog([]);
  setStudentName("");
  setCurrentDecodedCode("");
  setEmailData({ shouldSend: false, decodedCode: "", studentName: "" });
  scannedCodesRef.current.clear();
};

const playSound = (audioRef) => {
  if (audioRef.current) {
    audioRef.current.play();
  }
};

const triggerVisualFeedback = (color, audioRef, setBackgroundColor) => {
  setBackgroundColor(color);
  playSound(audioRef);
  setTimeout(() => setBackgroundColor("bg-gray-100"), 1000);
};

const playRandomMessageSound = (messages, audioRefs) => {
  const randomIndex = Math.floor(Math.random() * messages.length);
  const randomSoundRef = audioRefs[randomIndex];
  playSound(randomSoundRef);
};

function Scan() {
  // State Hooks
  const [data, setData] = useState("");
  const [log, setLog] = useState([]);
  const [studentName, setStudentName] = useState("");
  const [currentDecodedCode, setCurrentDecodedCode] = useState("");
  const [emailData, setEmailData] = useState({ shouldSend: false, decodedCode: "", studentName: "" });
  const [isCheckInMode, setIsCheckInMode] = useState(null);
  const [backgroundColor, setBackgroundColor] = useState("bg-gray-100");

  // Ref Hooks
  const scannedCodesRef = useRef(new Set());
  const lastPlayedRef = useRef(0);
  const delayTimerRef = useRef(null);
  const successSoundRef = useRef(null);
  const errorSoundRef = useRef(null);
  const alreadyScannedSoundRef = useRef(null);
  const checkInMessageSoundRefs = useRef([]);
  const checkOutMessageSoundRefs = useRef([]);

  // Utility Functions
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

  const handleEmailSent = () => {
    setEmailData({ shouldSend: false, decodedCode: "", studentName: "" });
  };

  const handleScanError = (error) => {
    console.error("QR Scan Error:", error);
    triggerVisualFeedback("bg-[#FF0000]", errorSoundRef, setBackgroundColor);
  };

  // Effect Hooks
  useEffect(() => {
    // Pre-load sounds
    successSoundRef.current = new Audio(successSoundFile);
    errorSoundRef.current = new Audio(errorSoundFile);
    alreadyScannedSoundRef.current = new Audio(alreadyScannedSoundFile);
    checkInMessageSoundRefs.current = checkInMessages.map((sound) => new Audio(sound));
    checkOutMessageSoundRefs.current = checkOutMessages.map((sound) => new Audio(sound));

    const initialCheckInMode = checkMode();
    setIsCheckInMode(initialCheckInMode);
    console.log(`Currently in ${initialCheckInMode ? "check-in" : "check-out"} mode`);

    const interval = setInterval(() => {
      const currentMode = checkMode();
      if (currentMode !== isCheckInMode) {
        console.log(`Switching to ${currentMode ? "check-in" : "check-out"} mode`);
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
      if (currentHour === 14 && currentMinute === 39) {
        cleanup(setData, setLog, setStudentName, setCurrentDecodedCode, setEmailData, scannedCodesRef);
      }
    }, 60000);

    return () => clearInterval(cleanupInterval);
  }, []);

  // Main Function
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

        if (isCheckIn) {
          if (!attendance[dateStr]) {
            attendance[dateStr] = { checkIn: nowStr, checkOut: null };
            await updateDoc(userDocRef, { attendance });
            console.log("Check-in successful");
            setEmailData({ shouldSend: true, decodedCode, studentName: currentStudentName });
            triggerVisualFeedback("bg-[#06D001]", successSoundRef, setBackgroundColor);
            playRandomMessageSound(checkInMessages, checkInMessageSoundRefs.current);
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
              triggerVisualFeedback("bg-[#06D001]", successSoundRef, setBackgroundColor);
              playRandomMessageSound(checkOutMessages, checkOutMessageSoundRefs.current);
            } else {
              console.log("Already checked out");
            }
          } else {
            // No check-in recorded but it's check-out time, record check-out
            attendance[dateStr] = { checkIn: null, checkOut: nowStr };
            await updateDoc(userDocRef, { attendance });
            console.log("No check-in recorded but check-out successful");
            setEmailData({ shouldSend: true, decodedCode, studentName: currentStudentName });
            triggerVisualFeedback("bg-[#06D001]", successSoundRef, setBackgroundColor);
            playRandomMessageSound(checkOutMessages, checkOutMessageSoundRefs.current);
          }
        }
        // Add the log entry with the current student's name
        addLogEntry(decodedCode, currentStudentName);
      } else {
        console.log("No document found for this student ID");
        triggerVisualFeedback("bg-[#FF0000]", errorSoundRef, setBackgroundColor);
        return; // Stop the process if no document is found
      }
    } catch (error) {
      console.error("Error updating attendance: ", error);
      triggerVisualFeedback("bg-[#FF0000]", errorSoundRef, setBackgroundColor);
    }
  };

  const handleResult = (result) => {
    if (!!result) {
      const code = result.text;
      const decodedCode = code.split("").map((char) => mappingTable[char] || "").join("");

      if (!decodedCode.startsWith("mvba_")) {
        console.log("Invalid code");
        triggerVisualFeedback("bg-[#FF0000]", errorSoundRef, setBackgroundColor);
        return;
      }

      const processedCode = decodedCode.slice(5);

      const now = new Date();
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();

      if (!scannedCodesRef.current.has(processedCode)) {
        setData(processedCode);
        scannedCodesRef.current.add(processedCode);

        const isCheckIn = currentHour >= 6 && currentHour < 10;

        updateAttendance(processedCode, isCheckIn);

        setCurrentDecodedCode(processedCode);

        // Clear any existing delay timer
        if (delayTimerRef.current) {
          clearTimeout(delayTimerRef.current);
          delayTimerRef.          current = null;
        }

        // Start a new delay timer
        delayTimerRef.current = setTimeout(() => {
          delayTimerRef.current = null;
        }, 3000); // Set delay for 3 seconds
      } else {
        console.log("Already scanned this code");
        const now = Date.now();
        if (!delayTimerRef.current && now - lastPlayedRef.current >= 1500) {
          triggerVisualFeedback("bg-[#FFCC00]", alreadyScannedSoundRef, setBackgroundColor);
          lastPlayedRef.current = now;
        }
      }
    }
  };

  return (
    <div className={`${backgroundColor} flex flex-col lg:flex-row items-center overflow-hidden justify-center min-h-screen p-6`}>
      <div className="bg-white rounded-lg shadow-lg p-8 w-full lg:w-1/2 h-full mb-6 lg:mb-0 lg:mr-6 transition-transform transform hover:scale-105">
        <QrReader
          onResult={handleResult}
          onError={handleScanError}
          constraints={{ facingMode: "environment" }}
          style={{ width: "100%", height: "100%", borderRadius: "8px" }}
        />
      </div>
      <div className="bg-white rounded-lg shadow-lg p-8 w-full lg:w-1/2 h-full flex flex-col items-center transition-transform transform hover:scale-105">
        <div className="flex flex-col items-center justify-center mb-6">
          <div className="flex items-center justify-center bg-gray-50 rounded-lg shadow-md p-4 w-full">
            <p
              className={`text-lg font-semibold ${
                isCheckInMode ? "text-green-600" : "text-red-600"
              }`}
            >
              {isCheckInMode ? "Check-In Mode" : "Check-Out Mode"}
            </p>
          </div>
        </div>

        <div className="flex flex-col items-center justify-center mb-6">
          <p className="text-xl font-bold text-gray-800 mb-2">Scan Result:</p>
          <div className="flex items-center justify-center bg-gray-50 rounded-lg shadow-md p-4 w-full">
            <p className="text-lg text-blue-600 font-semibold">
              {data} {studentName && `(${studentName})`}
            </p>
          </div>
        </div>

        <div
          className="bg-gray-50 rounded-lg shadow-lg mt-6 w-full overflow-y-scroll"
          style={{ maxHeight: "300px" }}
        >
          <ul className="text-gray-700 divide-y divide-gray-300 w-full">
            {log.map((entry, index) => (
              <li key={`${entry.id}-${index}`} className="py-4 px-6">
                <span className="block text-lg font-semibold">
                  {entry.time}
                </span>
                <span className="block text-sm">{entry.studentName}</span>
              </li>
            ))}
          </ul>
        </div>

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


//shorter version, not sure if it really work properly, maybe? 25
// import React, { useState, useRef, useEffect } from "react";
// import { QrReader } from "react-qr-reader";
// import { doc, getDoc, updateDoc } from "firebase/firestore";
// import { db } from "./firebase.js";
// import { mappingTable, getPhilippineTime } from "./Constants";
// import Email from "./Email"; // Import the Email component
// import successSound from "./success.wav"; // Import the success sound
// import errorSound from "./error.wav"; // Import the error sound
// import alreadyScannedSound from "./alreadyscanned.wav"; // Import the already scanned sound

// // Import message sounds for check-in and check-out modes
// import complete from "./complete.wav";
// const checkInMessages = [complete];
// const checkOutMessages = [complete];

// function Scan() {
//   // State Hooks
//   const [data, setData] = useState("");
//   const [log, setLog] = useState([]);
//   const [studentName, setStudentName] = useState("");
//   const [currentDecodedCode, setCurrentDecodedCode] = useState("");
//   const [emailData, setEmailData] = useState({ shouldSend: false, decodedCode: "", studentName: "" });
//   const [isCheckInMode, setIsCheckInMode] = useState(null);
//   const [backgroundColor, setBackgroundColor] = useState("bg-gray-100");

//   // Ref Hooks
//   const scannedCodesRef = useRef(new Set());
//   const lastPlayedRef = useRef(0);
//   const delayTimerRef = useRef(null);

//   // Utility Functions
//   const checkMode = () => {
//     const now = new Date();
//     const currentHour = now.getHours();
//     const currentMinute = now.getMinutes();
//     return (currentHour > 6 || (currentHour === 6 && currentMinute >= 0)) && currentHour < 10;
//   };

//   const cleanup = () => {
//     console.log("Running cleanup...");
//     setData("");
//     setLog([]);
//     setStudentName("");
//     setCurrentDecodedCode("");
//     setEmailData({ shouldSend: false, decodedCode: "", studentName: "" });
//     scannedCodesRef.current.clear();
//   };

//   const playSound = (sound) => {
//     const audio = new Audio(sound);
//     audio.play();
//   };

//   const triggerVisualFeedback = (color, sound) => {
//     setBackgroundColor(color);
//     playSound(sound);
//     setTimeout(() => setBackgroundColor("bg-gray-100"), 1000);
//   };

//   const playRandomMessageSound = (messages) => {
//     const randomIndex = Math.floor(Math.random() * messages.length);
//     const randomSound = messages[randomIndex];
//     playSound(randomSound);
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

//   const handleEmailSent = () => {
//     setEmailData({ shouldSend: false, decodedCode: "", studentName: "" });
//   };

//   const handleScanError = (error) => {
//     console.error("QR Scan Error:", error);
//     triggerVisualFeedback("bg-[#FF0000]", errorSound);
//   };

//   // Effect Hooks
//   useEffect(() => {
//     const initialCheckInMode = checkMode();
//     setIsCheckInMode(initialCheckInMode);
//     console.log(`Currently in ${initialCheckInMode ? "check-in" : "check-out"} mode`);

//     const interval = setInterval(() => {
//       const currentMode = checkMode();
//       if (currentMode !== isCheckInMode) {
//         console.log(`Switching to ${currentMode ? "check-in" : "check-out"} mode`);
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
//       if (currentHour === 16 && currentMinute === 3) {
//         cleanup();
//       }
//     }, 60000);

//     return () => clearInterval(cleanupInterval);
//   }, []);

//   // Main Function
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

//         if (isCheckIn) {
//           if (!attendance[dateStr]) {
//             attendance[dateStr] = { checkIn: nowStr, checkOut: null };
//             await updateDoc(userDocRef, { attendance });
//             console.log("Check-in successful");
//             setEmailData({ shouldSend: true, decodedCode, studentName: currentStudentName });
//             triggerVisualFeedback("bg-[#06D001]", successSound);
//             playRandomMessageSound(checkInMessages);
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
//               triggerVisualFeedback("bg-[#06D001]", successSound);
//               playRandomMessageSound(checkOutMessages);
//             } else {
//               console.log("Already checked out");
//             }
//           } else {
//             // No check-in recorded but it's check-out time, record check-out
//             attendance[dateStr] = { checkIn: null, checkOut: nowStr };
//             await updateDoc(userDocRef, { attendance });
//             console.log("No check-in recorded but check-out successful");
//             setEmailData({ shouldSend: true, decodedCode, studentName: currentStudentName });
//             triggerVisualFeedback("bg-[#06D001]", successSound);
//             playRandomMessageSound(checkOutMessages);
//           }
//         }
//         // Add the log entry with the current student's name
//         addLogEntry(decodedCode, currentStudentName);
//       } else {
//         console.log("No document found for this student ID");
//         triggerVisualFeedback("bg-[#FF0000]", errorSound);
//         return; // Stop the process if no document is found
//       }
//     } catch (error) {
//       console.error("Error updating attendance: ", error);
//       triggerVisualFeedback("bg-[#FF0000]", errorSound);
//     }
//   };

//   const handleResult = (result) => {
//     if (!!result) {
//       const code = result.text;
//       const decodedCode = code.split("").map((char) => mappingTable[char] || "").join("");

//       if (!decodedCode.startsWith("mvba_")) {
//         console.log("Invalid code");
//         triggerVisualFeedback("bg-[#FF0000]", errorSound);
//         return;
//       }

//       const processedCode = decodedCode.slice(5);

//       const now = new Date();
//       const currentHour = now.getHours();
//       const currentMinute = now.getMinutes();

//       if (!scannedCodesRef.current.has(processedCode)) {
//         setData(processedCode);
//         scannedCodesRef.current.add(processedCode);

//         const isCheckIn = currentHour >= 6 && currentHour < 10;

//         updateAttendance(processedCode, isCheckIn);

//         setCurrentDecodedCode(processedCode);

//         // Clear any existing delay timer
//         if (delayTimerRef.current) {
//           clearTimeout(delayTimerRef.current);
//           delayTimerRef.current = null;
//         }

//         // Start a new delay timer
//         delayTimerRef.current = setTimeout(() => {
//           delayTimerRef.current = null;
//         }, 3000); // Set delay for 3 seconds
//       } else {
//         console.log("Already scanned this code");
//         const now = Date.now();
//         if (!delayTimerRef.current && now - lastPlayedRef.current >= 1500) {
//           triggerVisualFeedback("bg-[#FFCC00]", alreadyScannedSound);
//           lastPlayedRef.current = now;
//         }
//       }
//     }
//   };

//   return (
//     <div className={`${backgroundColor} flex flex-col lg:flex-row items-center overflow-hidden justify-center min-h-screen p-6`}>
//       <div className="bg-white rounded-lg shadow-lg p-8 w-full lg:w-1/2 h-full mb-6 lg:mb-0 lg:mr-6 transition-transform transform hover:scale-105">
//         <QrReader
//           onResult={handleResult}
//           onError={handleScanError}
//           constraints={{ facingMode: "environment" }}
//           style={{ width: "100%", height: "100%", borderRadius: "8px" }}
//         />
//       </div>
//       <div className="bg-white rounded-lg shadow-lg p-8 w-full lg:w-1/2 h-full flex flex-col items-center transition-transform transform hover:scale-105">
//         <div className="flex flex-col items-center justify-center mb-6">
//           <div className="flex items-center justify-center bg-gray-50 rounded-lg shadow-md p-4 w-full">
//             <p
//               className={`text-lg font-semibold ${
//                 isCheckInMode ? "text-green-600" : "text-red-600"
//               }`}
//             >
//               {isCheckInMode ? "Check-In Mode" : "Check-Out Mode"}
//             </p>
//           </div>
//         </div>

//         <div className="flex flex-col items-center justify-center mb-6">
//           <p className="text-xl font-bold text-gray-800 mb-2">Scan Result:</p>
//           <div className="flex items-center justify-center bg-gray-50 rounded-lg shadow-md p-4 w-full">
//             <p className="text-lg text-blue-600 font-semibold">
//               {data} {studentName && `(${studentName})`}
//             </p>
//           </div>
//         </div>

//         <div
//           className="bg-gray-50 rounded-lg shadow-lg mt-6 w-full overflow-y-scroll"
//           style={{ maxHeight: "300px" }}
//         >
//           <ul className="text-gray-700 divide-y divide-gray-300 w-full">
//             {log.map((entry, index) => (
//               <li key={`${entry.id}-${index}`} className="py-4 px-6">
//                 <span className="block text-lg font-semibold">
//                   {entry.time}
//                 </span>
//                 <span className="block text-sm">{entry.studentName}</span>
//               </li>
//             ))}
//           </ul>
//         </div>

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











































//working version 25
// import React, { useState, useRef, useEffect } from "react";
// import { QrReader } from "react-qr-reader";
// import { doc, getDoc, updateDoc } from "firebase/firestore";
// import { db } from "./firebase.js";
// import { mappingTable, getPhilippineTime } from "./Constants";
// import Email from "./Email"; // Import the Email component
// import successSound from "./success.wav"; // Import the success sound
// import errorSound from "./error.wav"; // Import the error sound
// import alreadyScannedSound from "./alreadyscanned.wav"; // Import the already scanned sound

// // Import message sounds for check-in and check-out modes
// import complete from "./complete.wav";
// const checkInMessages = [complete];

// const checkOutMessages = [complete];

// function Scan() {
//   const [data, setData] = useState("");
//   const [log, setLog] = useState([]);
//   const [studentName, setStudentName] = useState("");
//   const [currentDecodedCode, setCurrentDecodedCode] = useState("");
//   const [emailData, setEmailData] = useState({
//     shouldSend: false,
//     decodedCode: "",
//     studentName: "",
//   });
//   const [isCheckInMode, setIsCheckInMode] = useState(null);
//   const [backgroundColor, setBackgroundColor] = useState("bg-gray-100"); // State for background color

//   const scannedCodesRef = useRef(new Set());
//   const lastPlayedRef = useRef(0); // Ref to store the last time the already scanned sound was played
//   const delayTimerRef = useRef(null); // Ref to store the delay timer

//   const checkMode = () => {
//     const now = new Date();
//     const currentHour = now.getHours();
//     const currentMinute = now.getMinutes();

//     return (
//       (currentHour > 6 || (currentHour === 6 && currentMinute >= 0)) &&
//       currentHour < 10
//     );
//   };
//   //try lan

//   useEffect(() => {
//     const initialCheckInMode = checkMode();
//     setIsCheckInMode(initialCheckInMode);
//     console.log(
//       `Currently in ${initialCheckInMode ? "check-in" : "check-out"} mode`
//     );

//     const interval = setInterval(() => {
//       const currentMode = checkMode();
//       if (currentMode !== isCheckInMode) {
//         console.log(
//           `Switching to ${currentMode ? "check-in" : "check-out"} mode`
//         );
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

//       if (currentHour === 16 && currentMinute === 3) {
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

//         if (isCheckIn) {
//           if (!attendance[dateStr]) {
//             attendance[dateStr] = { checkIn: nowStr, checkOut: null };
//             await updateDoc(userDocRef, { attendance });
//             console.log("Check-in successful");
//             setEmailData({
//               shouldSend: true,
//               decodedCode,
//               studentName: currentStudentName,
//             });
//             triggerVisualFeedback("bg-[#06D001]", successSound);
//             playRandomMessageSound(checkInMessages);
//           } else {
//             console.log("Already checked in for today");
//           }
//         } else {
//           if (attendance[dateStr]) {
//             if (!attendance[dateStr].checkOut) {
//               attendance[dateStr].checkOut = nowStr;
//               await updateDoc(userDocRef, { attendance });
//               console.log("Checkout successful");
//               setEmailData({
//                 shouldSend: true,
//                 decodedCode,
//                 studentName: currentStudentName,
//               });
//               triggerVisualFeedback("bg-[#06D001]", successSound);
//               playRandomMessageSound(checkOutMessages);
//             } else {
//               console.log("Already checked out");
//             }
//           } else {
//             // No check-in recorded but it's check-out time, record check-out
//             attendance[dateStr] = { checkIn: null, checkOut: nowStr };
//             await updateDoc(userDocRef, { attendance });
//             console.log("No check-in recorded but check-out successful");
//             setEmailData({
//               shouldSend: true,
//               decodedCode,
//               studentName: currentStudentName,
//             });
//             triggerVisualFeedback("bg-[#06D001]", successSound);
//             playRandomMessageSound(checkOutMessages);
//           }
//         }
//         // Add the log entry with the current student's name
//         addLogEntry(decodedCode, currentStudentName);
//       } else {
//         console.log("No document found for this student ID");
//         triggerVisualFeedback("bg-[#FF0000]", errorSound);
//         return; // Stop the process if no document is found
//       }
//     } catch (error) {
//       console.error("Error updating attendance: ", error);
//       triggerVisualFeedback("bg-[#FF0000]", errorSound);
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
//         console.log("Invalid code");
//         triggerVisualFeedback("bg-[#FF0000]", errorSound);
//         return;
//       }

//       const processedCode = decodedCode.slice(5);

//       const now = new Date();
//       const currentHour = now.getHours();
//       const currentMinute = now.getMinutes();

//       if (!scannedCodesRef.current.has(processedCode)) {
//         setData(processedCode);
//         scannedCodesRef.current.add(processedCode);

//         const isCheckIn = currentHour >= 6 && currentHour < 10;

//         updateAttendance(processedCode, isCheckIn);

//         setCurrentDecodedCode(processedCode);

//         // Clear any existing delay timer
//         if (delayTimerRef.current) {
//           clearTimeout(delayTimerRef.current);
//           delayTimerRef.current = null;
//         }

//         // Start a new delay timer
//         delayTimerRef.current = setTimeout(() => {
//           delayTimerRef.current = null;
//         }, 3000); // Set delay for 3 seconds
//       } else {
//         console.log("Already scanned this code");
//         const now = Date.now();
//         if (!delayTimerRef.current && now - lastPlayedRef.current >= 1500) {
//           triggerVisualFeedback("bg-[#FFCC00]", alreadyScannedSound);
//           lastPlayedRef.current = now;
//         }
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
//     triggerVisualFeedback("bg-[#FF0000]", errorSound);
//   };

//   const handleEmailSent = () => {
//     setEmailData({ shouldSend: false, decodedCode: "", studentName: "" });
//   };

//   const playSound = (sound) => {
//     const audio = new Audio(sound);
//     audio.play();
//   };

//   const triggerVisualFeedback = (color, sound) => {
//     setBackgroundColor(color);
//     playSound(sound);
//     setTimeout(() => setBackgroundColor("bg-gray-100"), 1000);
//   };

//   const playRandomMessageSound = (messages) => {
//     const randomIndex = Math.floor(Math.random() * messages.length);
//     const randomSound = messages[randomIndex];
//     playSound(randomSound);
//   };

//   return (
//     <div
//       className={`${backgroundColor} flex flex-col lg:flex-row items-center overflow-hidden justify-center min-h-screen p-6 `}>
//       <div className="bg-white rounded-lg shadow-lg p-8 w-full lg:w-1/2 h-full mb-6 lg:mb-0 lg:mr-6 transition-transform transform hover:scale-105">
//         <QrReader
//           onResult={handleResult}
//           onError={handleScanError}
//           constraints={{ facingMode: "environment" }}
//           style={{ width: "100%", height: "100%", borderRadius: "8px" }}
//         />
//       </div>
//       <div className="bg-white rounded-lg shadow-lg p-8 w-full lg:w-1/2 h-full flex flex-col items-center transition-transform transform hover:scale-105">
//         <div className="flex flex-col items-center justify-center mb-6">
//           <div className="flex items-center justify-center bg-gray-50 rounded-lg shadow-md p-4 w-full">
//             <p
//               className={`text-lg font-semibold ${
//                 isCheckInMode ? "text-green-600" : "text-red-600"
//               }`}>
//               {isCheckInMode ? "Check-In Mode" : "Check-Out Mode"}
//             </p>
//           </div>
//         </div>

//         <div className="flex flex-col items-center justify-center mb-6">
//           <p className="text-xl font-bold text-gray-800 mb-2">Scan Result:</p>
//           <div className="flex items-center justify-center bg-gray-50 rounded-lg shadow-md p-4 w-full">
//             <p className="text-lg text-blue-600 font-semibold">
//               {data} {studentName && `(${studentName})`}
//             </p>
//           </div>
//         </div>

//         <div
//           className="bg-gray-50 rounded-lg shadow-lg mt-6 w-full overflow-y-scroll"
//           style={{ maxHeight: "300px" }}>
//           <ul className="text-gray-700 divide-y divide-gray-300 w-full">
//             {log.map((entry, index) => (
//               <li key={`${entry.id}-${index}`} className="py-4 px-6">
//                 <span className="block text-lg font-semibold">
//                   {entry.time}
//                 </span>
//                 <span className="block text-sm">{entry.studentName}</span>
//               </li>
//             ))}
//           </ul>
//         </div>

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

//ffin works but simplified
// import React, { useState, useRef, useEffect } from "react";
// import { QrReader } from "react-qr-reader";
// import { doc, getDoc, updateDoc } from "firebase/firestore";
// import { db } from "./firebase.js";
// import { mappingTable, getPhilippineTime } from "./Constants";

// function Scan() {
//   const [data, setData] = useState("");
//   const [isProcessing, setIsProcessing] = useState(false);
//   const scannedCodesRef = useRef(new Set());

//   const updateAttendance = async (decodedCode) => {
//     try {
//       const userDocRef = doc(db, "users", decodedCode);
//       console.log(`Attempting to read from Firebase for decodedCode: ${decodedCode}`);
//       const userDocSnap = await getDoc(userDocRef);
//       console.log(`Firebase read complete for ${decodedCode}`);
//       const nowStr = getPhilippineTime();
//       const dateStr = nowStr.split("T")[0];

//       if (userDocSnap.exists()) {
//         const userData = userDocSnap.data();
//         const attendance = userData.attendance || {};

//         if (!attendance[dateStr]) {
//           attendance[dateStr] = { checkIn: nowStr, checkOut: null };
//           await updateDoc(userDocRef, { attendance });
//           console.log("Check-in successful");
//         } else if (!attendance[dateStr].checkOut) {
//           attendance[dateStr].checkOut = nowStr;
//           await updateDoc(userDocRef, { attendance });
//           console.log("Checkout successful");
//         } else {
//           console.log("Already checked out");
//         }
//       } else {
//         console.log("No document found for this student ID");
//       }
//     } catch (error) {
//       console.error("Error updating attendance: ", error);
//     }
//   };

//   const handleResult = (result) => {
//     if (!!result && !isProcessing) {
//       const code = result.text;
//       console.log(`QR code detected: ${code}`);
//       const decodedCode = code
//         .split("")
//         .map((char) => mappingTable[char] || "")
//         .join("");

//       if (!decodedCode.startsWith("mvba_")) {
//         console.log("Invalid code");
//         return;
//       }

//       const processedCode = decodedCode.slice(5);

//       if (!scannedCodesRef.current.has(processedCode)) {
//         console.log(`New QR code scan: ${processedCode}`);
//         setData(processedCode);
//         scannedCodesRef.current.add(processedCode);
//         setIsProcessing(true); // Set the processing flag

//         updateAttendance(processedCode).finally(() => {
//           setIsProcessing(false); // Reset the processing flag when done
//         });
//       } else {
//         console.log("Already scanned this code");
//       }
//     }
//   };

//   const handleScanError = (error) => {
//     console.error("QR Scan Error:", error);
//   };

//   return (
//     <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-gray-100">
//       <div className="bg-white rounded-lg shadow-lg p-8 w-full lg:w-1/2 mb-6 transition-transform transform hover:scale-105">
//         <QrReader
//           onResult={handleResult}
//           onError={handleScanError}
//           constraints={{ facingMode: "environment" }}
//           style={{ width: "100%", height: "100%", borderRadius: "8px" }}
//         />
//       </div>
//       <div className="bg-white rounded-lg shadow-lg p-8 w-full lg:w-1/2 flex flex-col items-center transition-transform transform hover:scale-105">
//         <div className="flex flex-col items-center justify-center mb-6">
//           <p className="text-xl font-bold text-gray-800 mb-2">Scan Result:</p>
//           <div className="flex items-center justify-center bg-gray-50 rounded-lg shadow-md p-4 w-full">
//             <p className="text-lg text-blue-600 font-semibold">{data}</p>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// }

// export default Scan;


//work?simploified 25
// import React, { useState, useRef, useEffect } from "react";
// import { QrReader } from "react-qr-reader";
// import { doc, getDoc, updateDoc } from "firebase/firestore";
// import { db } from "./firebase.js";
// import { mappingTable, getPhilippineTime } from "./Constants";

// function Scan() {
//   const [data, setData] = useState("");
//   const [isProcessing, setIsProcessing] = useState(false);
//   const [lastScanTime, setLastScanTime] = useState(0);
//   const scannedCodesRef = useRef(new Set());

//   const DEBOUNCE_TIME = 2000; // 2 seconds debounce time

//   const updateAttendance = async (decodedCode) => {
//     try {
//       const userDocRef = doc(db, "users", decodedCode);
//       console.log(`Attempting to read from Firebase for decodedCode: ${decodedCode}`);
//       const userDocSnap = await getDoc(userDocRef);
//       console.log(`Firebase read complete for ${decodedCode}`);
//       const nowStr = getPhilippineTime();
//       const dateStr = nowStr.split("T")[0];

//       if (userDocSnap.exists()) {
//         const userData = userDocSnap.data();
//         const attendance = userData.attendance || {};

//         if (!attendance[dateStr]) {
//           attendance[dateStr] = { checkIn: nowStr, checkOut: null };
//           await updateDoc(userDocRef, { attendance });
//           console.log("Check-in successful");
//         } else if (!attendance[dateStr].checkOut) {
//           attendance[dateStr].checkOut = nowStr;
//           await updateDoc(userDocRef, { attendance });
//           console.log("Checkout successful");
//         } else {
//           console.log("Already checked out");
//         }
//       } else {
//         console.log("No document found for this student ID");
//       }
//     } catch (error) {
//       console.error("Error updating attendance: ", error);
//     }
//   };

//   const handleResult = (result) => {
//     const now = Date.now();
//     if (!!result && !isProcessing && (now - lastScanTime > DEBOUNCE_TIME)) {
//       const code = result.text;
//       console.log(`QR code detected: ${code}`);
//       const decodedCode = code
//         .split("")
//         .map((char) => mappingTable[char] || "")
//         .join("");

//       if (!decodedCode.startsWith("mvba_")) {
//         console.log("Invalid code");
//         return;
//       }

//       const processedCode = decodedCode.slice(5);

//       if (!scannedCodesRef.current.has(processedCode)) {
//         console.log(`New QR code scan: ${processedCode}`);
//         setData(processedCode);
//         scannedCodesRef.current.add(processedCode);
//         setIsProcessing(true); // Set the processing flag
//         setLastScanTime(now); // Update last scan time

//         updateAttendance(processedCode).finally(() => {
//           setIsProcessing(false); // Reset the processing flag when done
//         });
//       } else {
//         console.log("Already scanned this code");
//       }
//     }
//   };

//   const handleScanError = (error) => {
//     console.error("QR Scan Error:", error);
//   };

//   return (
//     <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-gray-100">
//       <div className="bg-white rounded-lg shadow-lg p-8 w-full lg:w-1/2 mb-6 transition-transform transform hover:scale-105">
//         <QrReader
//           onResult={handleResult}
//           onError={handleScanError}
//           constraints={{ facingMode: "environment" }}
//           style={{ width: "100%", height: "100%", borderRadius: "8px" }}
//         />
//       </div>
//       <div className="bg-white rounded-lg shadow-lg p-8 w-full lg:w-1/2 flex flex-col items-center transition-transform transform hover:scale-105">
//         <div className="flex flex-col items-center justify-center mb-6">
//           <p className="text-xl font-bold text-gray-800 mb-2">Scan Result:</p>
//           <div className="flex items-center justify-center bg-gray-50 rounded-lg shadow-md p-4 w-full">
//             <p className="text-lg text-blue-600 font-semibold">{data}</p>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// }

// export default Scan;




// import React, { useState, useRef, useEffect } from "react";
// import { QrReader } from "react-qr-reader";
// import { doc, getDoc, updateDoc } from "firebase/firestore";
// import { db } from "./firebase.js";
// import { mappingTable, getPhilippineTime } from "./Constants";
// import Email from "./Email"; // Import the Email component
// import successSound from "./success.wav"; // Import the success sound
// import errorSound from "./error.wav"; // Import the error sound
// import alreadyScannedSound from "./alreadyscanned.wav"; // Import the already scanned sound

// // Import message sounds for check-in and check-out modes
// import complete from "./complete.wav";
// const checkInMessages = [complete];

// const checkOutMessages = [complete];

// function Scan() {
//   const [data, setData] = useState("");
//   const [log, setLog] = useState([]);
//   const [studentName, setStudentName] = useState("");
//   const [currentDecodedCode, setCurrentDecodedCode] = useState("");
//   const [emailData, setEmailData] = useState({
//     shouldSend: false,
//     decodedCode: "",
//     studentName: "",
//   });
//   const [isCheckInMode, setIsCheckInMode] = useState(null);
//   const [backgroundColor, setBackgroundColor] = useState("bg-gray-100"); // State for background color
//   const [isProcessing, setIsProcessing] = useState(false);

//   const scannedCodesRef = useRef(new Set());
//   const lastPlayedRef = useRef(0); // Ref to store the last time the already scanned sound was played
//   const delayTimerRef = useRef(null); // Ref to store the delay timer

//   const checkMode = () => {
//     const now = new Date();
//     const currentHour = now.getHours();
//     const currentMinute = now.getMinutes();

//     return (
//       (currentHour > 6 || (currentHour === 6 && currentMinute >= 0)) &&
//       currentHour < 10
//     );
//   };
//   //try lan

//   useEffect(() => {
//     const initialCheckInMode = checkMode();
//     setIsCheckInMode(initialCheckInMode);
//     console.log(
//       `Currently in ${initialCheckInMode ? "check-in" : "check-out"} mode`
//     );

//     const interval = setInterval(() => {
//       const currentMode = checkMode();
//       if (currentMode !== isCheckInMode) {
//         console.log(
//           `Switching to ${currentMode ? "check-in" : "check-out"} mode`
//         );
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

//       if (currentHour === 16 && currentMinute === 3) {
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
//       console.log(`Attempting to read from Firebase for decodedCode: ${decodedCode}`);
//       const userDocSnap = await getDoc(userDocRef);
//       console.log(`Firebase read complete for ${decodedCode}`);
//       const nowStr = getPhilippineTime();
//       const dateStr = nowStr.split("T")[0];

//       if (userDocSnap.exists()) {
//         const userData = userDocSnap.data();
//         const attendance = userData.attendance || {};
//         const currentStudentName = userData.name || "Unknown";
//         setStudentName(currentStudentName);

//         if (isCheckIn) {
//           if (!attendance[dateStr]) {
//             attendance[dateStr] = { checkIn: nowStr, checkOut: null };
//             await updateDoc(userDocRef, { attendance });
//             console.log("Check-in successful");
//             setEmailData({
//               shouldSend: true,
//               decodedCode,
//               studentName: currentStudentName,
//             });
//             triggerVisualFeedback("bg-[#06D001]", successSound);
//             playRandomMessageSound(checkInMessages);
//           } else {
//             console.log("Already checked in for today");
//           }
//         } else {
//           if (attendance[dateStr]) {
//             if (!attendance[dateStr].checkOut) {
//               attendance[dateStr].checkOut = nowStr;
//               await updateDoc(userDocRef, { attendance });
//               console.log("Checkout successful");
//               setEmailData({
//                 shouldSend: true,
//                 decodedCode,
//                 studentName: currentStudentName,
//               });
//               triggerVisualFeedback("bg-[#06D001]", successSound);
//               playRandomMessageSound(checkOutMessages);
//             } else {
//               console.log("Already checked out");
//             }
//           } else {
//             attendance[dateStr] = { checkIn: null, checkOut: nowStr };
//             await updateDoc(userDocRef, { attendance });
//             console.log("No check-in recorded but check-out successful");
//             setEmailData({
//               shouldSend: true,
//               decodedCode,
//               studentName: currentStudentName,
//             });
//             triggerVisualFeedback("bg-[#06D001]", successSound);
//             playRandomMessageSound(checkOutMessages);
//           }
//         }
//         addLogEntry(decodedCode, currentStudentName);
//       } else {
//         console.log("No document found for this student ID");
//         triggerVisualFeedback("bg-[#FF0000]", errorSound);
//         return;
//       }
//     } catch (error) {
//       console.error("Error updating attendance: ", error);
//       triggerVisualFeedback("bg-[#FF0000]", errorSound);
//     }
//   };


//   const handleResult = (result) => {
//     if (!!result && !isProcessing) {
//       const code = result.text;
//       console.log(`QR code detected: ${code}`);
//       const decodedCode = code
//         .split("")
//         .map((char) => mappingTable[char] || "")
//         .join("");

//       if (!decodedCode.startsWith("mvba_")) {
//         console.log("Invalid code");
//         triggerVisualFeedback("bg-[#FF0000]", errorSound);
//         return;
//       }

//       const processedCode = decodedCode.slice(5);

//       if (!scannedCodesRef.current.has(processedCode)) {
//         console.log(`New QR code scan: ${processedCode}`);
//         setData(processedCode);
//         scannedCodesRef.current.add(processedCode);
//         setIsProcessing(true); // Set the processing flag

//         const isCheckIn = checkMode(); // Update to use checkMode function
//         updateAttendance(processedCode, isCheckIn)
//           .finally(() => {
//             setIsProcessing(false); // Reset the processing flag when done
//           });

//         setCurrentDecodedCode(processedCode);

//         if (delayTimerRef.current) {
//           clearTimeout(delayTimerRef.current);
//           delayTimerRef.current = null;
//         }

//         delayTimerRef.current = setTimeout(() => {
//           delayTimerRef.current = null;
//         }, 3000);
//       } else {
//         console.log("Already scanned this code");
//         const now = Date.now();
//         if (!delayTimerRef.current && now - lastPlayedRef.current >= 1500) {
//           triggerVisualFeedback("bg-[#FFCC00]", alreadyScannedSound);
//           lastPlayedRef.current = now;
//         }
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
//     triggerVisualFeedback("bg-[#FF0000]", errorSound);
//   };

//   const handleEmailSent = () => {
//     setEmailData({ shouldSend: false, decodedCode: "", studentName: "" });
//   };

//   const playSound = (sound) => {
//     const audio = new Audio(sound);
//     audio.play();
//   };

//   const triggerVisualFeedback = (color, sound) => {
//     setBackgroundColor(color);
//     playSound(sound);
//     setTimeout(() => setBackgroundColor("bg-gray-100"), 1000);
//   };

//   const playRandomMessageSound = (messages) => {
//     const randomIndex = Math.floor(Math.random() * messages.length);
//     const randomSound = messages[randomIndex];
//     playSound(randomSound);
//   };

//   return (
//     <div
//       className={`${backgroundColor} flex flex-col lg:flex-row items-center overflow-hidden justify-center min-h-screen p-6 `}>
//       <div className="bg-white rounded-lg shadow-lg p-8 w-full lg:w-1/2 h-full mb-6 lg:mb-0 lg:mr-6 transition-transform transform hover:scale-105">
//         <QrReader
//           onResult={handleResult}
//           onError={handleScanError}
//           constraints={{ facingMode: "environment" }}
//           style={{ width: "100%", height: "100%", borderRadius: "8px" }}
//         />
//       </div>
//       <div className="bg-white rounded-lg shadow-lg p-8 w-full lg:w-1/2 h-full flex flex-col items-center transition-transform transform hover:scale-105">
//         <div className="flex flex-col items-center justify-center mb-6">
//           <div className="flex items-center justify-center bg-gray-50 rounded-lg shadow-md p-4 w-full">
//             <p
//               className={`text-lg font-semibold ${
//                 isCheckInMode ? "text-green-600" : "text-red-600"
//               }`}>
//               {isCheckInMode ? "Check-In Mode" : "Check-Out Mode"}
//             </p>
//           </div>
//         </div>

//         <div className="flex flex-col items-center justify-center mb-6">
//           <p className="text-xl font-bold text-gray-800 mb-2">Scan Result:</p>
//           <div className="flex items-center justify-center bg-gray-50 rounded-lg shadow-md p-4 w-full">
//             <p className="text-lg text-blue-600 font-semibold">
//               {data} {studentName && `(${studentName})`}
//             </p>
//           </div>
//         </div>

//         <div
//           className="bg-gray-50 rounded-lg shadow-lg mt-6 w-full overflow-y-scroll"
//           style={{ maxHeight: "300px" }}>
//           <ul className="text-gray-700 divide-y divide-gray-300 w-full">
//             {log.map((entry, index) => (
//               <li key={`${entry.id}-${index}`} className="py-4 px-6">
//                 <span className="block text-lg font-semibold">
//                   {entry.time}
//                 </span>
//                 <span className="block text-sm">{entry.studentName}</span>
//               </li>
//             ))}
//           </ul>
//         </div>

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







//i really thought this is the one
// import React, { useState, useRef, useEffect } from "react";
// import { QrReader } from "react-qr-reader";
// import { doc, getDoc, updateDoc } from "firebase/firestore";
// import { db } from "./firebase.js";
// import { mappingTable, getPhilippineTime } from "./Constants";
// import Email from "./Email"; // Import the Email component
// import successSound from "./success.wav"; // Import the success sound
// import errorSound from "./error.wav"; // Import the error sound
// import alreadyScannedSound from "./alreadyscanned.wav"; // Import the already scanned sound

// // Import message sounds for check-in and check-out modes
// import complete from "./complete.wav";
// const checkInMessages = [complete];

// const checkOutMessages = [complete];

// function Scan() {
//   const [data, setData] = useState("");
//   const [log, setLog] = useState([]);
//   const [studentName, setStudentName] = useState("");
//   const [currentDecodedCode, setCurrentDecodedCode] = useState("");
//   const [emailData, setEmailData] = useState({
//     shouldSend: false,
//     decodedCode: "",
//     studentName: "",
//   });
//   const [isCheckInMode, setIsCheckInMode] = useState(null);
//   const [backgroundColor, setBackgroundColor] = useState("bg-gray-100"); // State for background color
//   const [lastProcessedCode, setLastProcessedCode] = useState("");

//   const scannedCodesRef = useRef(new Set());
//   const lastPlayedRef = useRef(0); // Ref to store the last time the already scanned sound was played
//   const delayTimerRef = useRef(null); // Ref to store the delay timer

//   const checkMode = () => {
//     const now = new Date();
//     const currentHour = now.getHours();
//     const currentMinute = now.getMinutes();

//     return (
//       (currentHour > 6 || (currentHour === 6 && currentMinute >= 0)) &&
//       currentHour < 10
//     );
//   };

//   useEffect(() => {
//     const initialCheckInMode = checkMode();
//     setIsCheckInMode(initialCheckInMode);
//     console.log(
//       `Currently in ${initialCheckInMode ? "check-in" : "check-out"} mode`
//     );

//     const interval = setInterval(() => {
//       const currentMode = checkMode();
//       if (currentMode !== isCheckInMode) {
//         console.log(
//           `Switching to ${currentMode ? "check-in" : "check-out"} mode`
//         );
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

//       if (currentHour === 16 && currentMinute === 3) {
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

//         if (isCheckIn) {
//           if (!attendance[dateStr]) {
//             attendance[dateStr] = { checkIn: nowStr, checkOut: null };
//             await updateDoc(userDocRef, { attendance });
//             console.log("Check-in successful");
//             setEmailData({
//               shouldSend: true,
//               decodedCode,
//               studentName: currentStudentName,
//             });
//             triggerVisualFeedback("bg-[#06D001]", successSound);
//             playRandomMessageSound(checkInMessages);
//           } else {
//             console.log("Already checked in for today");
//           }
//         } else {
//           if (attendance[dateStr]) {
//             if (!attendance[dateStr].checkOut) {
//               attendance[dateStr].checkOut = nowStr;
//               await updateDoc(userDocRef, { attendance });
//               console.log("Checkout successful");
//               setEmailData({
//                 shouldSend: true,
//                 decodedCode,
//                 studentName: currentStudentName,
//               });
//               triggerVisualFeedback("bg-[#06D001]", successSound);
//               playRandomMessageSound(checkOutMessages);
//             } else {
//               console.log("Already checked out");
//             }
//           } else {
//             // No check-in recorded but it's check-out time, record check-out
//             attendance[dateStr] = { checkIn: null, checkOut: nowStr };
//             await updateDoc(userDocRef, { attendance });
//             console.log("No check-in recorded but check-out successful");
//             setEmailData({
//               shouldSend: true,
//               decodedCode,
//               studentName: currentStudentName,
//             });
//             triggerVisualFeedback("bg-[#06D001]", successSound);
//             playRandomMessageSound(checkOutMessages);
//           }
//         }
//         // Add the log entry with the current student's name
//         addLogEntry(decodedCode, currentStudentName);
//       } else {
//         console.log("No document found for this student ID");
//         triggerVisualFeedback("bg-[#FF0000]", errorSound);
//         return; // Stop the process if no document is found
//       }
//     } catch (error) {
//       console.error("Error updating attendance: ", error);
//       triggerVisualFeedback("bg-[#FF0000]", errorSound);
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
//         console.log("Invalid code");
//         triggerVisualFeedback("bg-[#FF0000]", errorSound);
//         return;
//       }

//       const processedCode = decodedCode.slice(5);

//       if (processedCode === lastProcessedCode) {
//         console.log("Same code still in view, ignoring");
//         return;
//       }

//       const now = new Date();
//       const currentHour = now.getHours();
//       const currentMinute = now.getMinutes();

//       if (!scannedCodesRef.current.has(processedCode)) {
//         setData(processedCode);
//         scannedCodesRef.current.add(processedCode);
//         setLastProcessedCode(processedCode);

//         const isCheckIn = currentHour >= 6 && currentHour < 10;

//         updateAttendance(processedCode, isCheckIn);

//         setCurrentDecodedCode(processedCode);

//         // Clear any existing delay timer
//         if (delayTimerRef.current) {
//           clearTimeout(delayTimerRef.current);
//           delayTimerRef.current = null;
//         }

//         // Start a new delay timer
//         delayTimerRef.current = setTimeout(() => {
//           delayTimerRef.current = null;
//           setLastProcessedCode("");
//         }, 3000); // Set delay for 3 seconds
//       } else {
//         console.log("Already scanned this code");
//         const now = Date.now();
//         if (!delayTimerRef.current && now - lastPlayedRef.current >= 1500) {
//           triggerVisualFeedback("bg-[#FFCC00]", alreadyScannedSound);
//           lastPlayedRef.current = now;
//         }
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
//     triggerVisualFeedback("bg-[#FF0000]", errorSound);
//   };

//   const handleEmailSent = () => {
//     setEmailData({ shouldSend: false, decodedCode: "", studentName: "" });
//   };

//   const playSound = (sound) => {
//     const audio = new Audio(sound);
//     audio.play();
//   };

//   const triggerVisualFeedback = (color, sound) => {
//     setBackgroundColor(color);
//     playSound(sound);
//     setTimeout(() => setBackgroundColor("bg-gray-100"), 1000);
//   };

//   const playRandomMessageSound = (
//     messages) => {
//       const randomIndex = Math.floor(Math.random() * messages.length);
//       const randomSound = messages[randomIndex];
//       playSound(randomSound);
//     };

//     return (
//       <div
//         className={`${backgroundColor} flex flex-col lg:flex-row items-center overflow-hidden justify-center min-h-screen p-6`}>
//         <div className="bg-white rounded-lg shadow-lg p-8 w-full lg:w-1/2 h-full mb-6 lg:mb-0 lg:mr-6 transition-transform transform hover:scale-105">
//           <QrReader
//             onResult={handleResult}
//             onError={handleScanError}
//             constraints={{ facingMode: "environment" }}
//             style={{ width: "100%", height: "100%", borderRadius: "8px" }}
//           />
//         </div>
//         <div className="bg-white rounded-lg shadow-lg p-8 w-full lg:w-1/2 h-full flex flex-col items-center transition-transform transform hover:scale-105">
//           <div className="flex flex-col items-center justify-center mb-6">
//             <div className="flex items-center justify-center bg-gray-50 rounded-lg shadow-md p-4 w-full">
//               <p
//                 className={`text-lg font-semibold ${
//                   isCheckInMode ? "text-green-600" : "text-red-600"
//                 }`}>
//                 {isCheckInMode ? "Check-In Mode" : "Check-Out Mode"}
//               </p>
//             </div>
//           </div>

//           <div className="flex flex-col items-center justify-center mb-6">
//             <p className="text-xl font-bold text-gray-800 mb-2">Scan Result:</p>
//             <div className="flex items-center justify-center bg-gray-50 rounded-lg shadow-md p-4 w-full">
//               <p className="text-lg text-blue-600 font-semibold">
//                 {data} {studentName && `(${studentName})`}
//               </p>
//             </div>
//           </div>

//           <div
//             className="bg-gray-50 rounded-lg shadow-lg mt-6 w-full overflow-y-scroll"
//             style={{ maxHeight: "300px" }}>
//             <ul className="text-gray-700 divide-y divide-gray-300 w-full">
//               {log.map((entry, index) => (
//                 <li key={`${entry.id}-${index}`} className="py-4 px-6">
//                   <span className="block text-lg font-semibold">
//                     {entry.time}
//                   </span>
//                   <span className="block text-sm">{entry.studentName}</span>
//                 </li>
//               ))}
//             </ul>
//           </div>

//           {emailData.shouldSend && (
//             <Email
//               studentName={emailData.studentName}
//               decodedCode={emailData.decodedCode}
//               onEmailSent={handleEmailSent}
//             />
//           )}
//         </div>
//       </div>
//     );
//   }

//   export default Scan;





//left on thurs july 24
// import React, { useState, useRef, useEffect } from "react";
// import { QrReader } from "react-qr-reader";
// import { doc, getDoc, updateDoc } from "firebase/firestore";
// import { db } from "./firebase.js";
// import { mappingTable, getPhilippineTime } from "./Constants";
// import Email from "./Email"; // Import the Email component
// import successSound from "./success.wav"; // Import the success sound
// import errorSound from "./error.wav"; // Import the error sound
// import alreadyScannedSound from "./alreadyscanned.wav"; // Import the already scanned sound

// // Import message sounds for check-in and check-out modes
// import complete from "./complete.wav";
// const checkInMessages = [complete];
// const checkOutMessages = [complete];

// function Scan() {
//   const [data, setData] = useState("");
//   const [log, setLog] = useState([]);
//   const [studentName, setStudentName] = useState("");
//   const [currentDecodedCode, setCurrentDecodedCode] = useState("");
//   const [emailData, setEmailData] = useState({
//     shouldSend: false,
//     decodedCode: "",
//     studentName: "",
//   });
//   const [isCheckInMode, setIsCheckInMode] = useState(null);
//   const [backgroundColor, setBackgroundColor] = useState("bg-gray-100"); // State for background color
//   const [processing, setProcessing] = useState(false); // State to manage QR scanner status

//   const scannedCodesRef = useRef(new Set());
//   const processingCodesRef = useRef(new Set());
//   const lastPlayedRef = useRef(0); // Ref to store the last time the already scanned sound was played
//   const delayTimerRef = useRef(null); // Ref to store the delay timer

//   const checkMode = () => {
//     const now = new Date();
//     const currentHour = now.getHours();
//     const currentMinute = now.getMinutes();
//     return (
//       (currentHour > 6 || (currentHour === 6 && currentMinute >= 0)) &&
//       currentHour < 10
//     );
//   };

//   useEffect(() => {
//     const initialCheckInMode = checkMode();
//     setIsCheckInMode(initialCheckInMode);
//     console.log(`Currently in ${initialCheckInMode ? "check-in" : "check-out"} mode`);

//     const interval = setInterval(() => {
//       const currentMode = checkMode();
//       if (currentMode !== isCheckInMode) {
//         console.log(`Switching to ${currentMode ? "check-in" : "check-out"} mode`);
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

//       if (currentHour === 16 && currentMinute === 3) {
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
//     processingCodesRef.current.clear();
//     setProcessing(false);
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

//         if (isCheckIn) {
//           if (!attendance[dateStr]) {
//             attendance[dateStr] = { checkIn: nowStr, checkOut: null };
//             await updateDoc(userDocRef, { attendance });
//             console.log("Check-in successful");
//             setEmailData({
//               shouldSend: true,
//               decodedCode,
//               studentName: currentStudentName,
//             });
//             triggerVisualFeedback("bg-[#06D001]", successSound);
//             playRandomMessageSound(checkInMessages);
//           } else {
//             console.log("Already checked in for today");
//           }
//         } else {
//           if (attendance[dateStr]) {
//             if (!attendance[dateStr].checkOut) {
//               attendance[dateStr].checkOut = nowStr;
//               await updateDoc(userDocRef, { attendance });
//               console.log("Checkout successful");
//               setEmailData({
//                 shouldSend: true,
//                 decodedCode,
//                 studentName: currentStudentName,
//               });
//               triggerVisualFeedback("bg-[#06D001]", successSound);
//               playRandomMessageSound(checkOutMessages);
//             } else {
//               console.log("Already checked out");
//             }
//           } else {
//             // No check-in recorded but it's check-out time, record check-out
//             attendance[dateStr] = { checkIn: null, checkOut: nowStr };
//             await updateDoc(userDocRef, { attendance });
//             console.log("No check-in recorded but check-out successful");
//             setEmailData({
//               shouldSend: true,
//               decodedCode,
//               studentName: currentStudentName,
//             });
//             triggerVisualFeedback("bg-[#06D001]", successSound);
//             playRandomMessageSound(checkOutMessages);
//           }
//         }
//         // Add the log entry with the current student's name
//         addLogEntry(decodedCode, currentStudentName);
//         scannedCodesRef.current.add(decodedCode); // Add code to scanned set after successful processing
//       } else {
//         console.log("No document found for this student ID");
//         triggerVisualFeedback("bg-[#FF0000]", errorSound);
//         return; // Stop the process if no document is found
//       }
//     } catch (error) {
//       console.error("Error updating attendance: ", error);
//       triggerVisualFeedback("bg-[#FF0000]", errorSound);
//     } finally {
//       processingCodesRef.current.delete(decodedCode);
//       setProcessing(false); // Re-enable QR scanner
//     }
//   };

//   const handleResult = (result) => {
//     if (!!result && !processing) { // Check if QR scanner is not processing
//       setProcessing(true); // Disable QR scanner during processing
//       const code = result.text;
//       const decodedCode = code
//         .split("")
//         .map((char) => mappingTable[char] || "")
//         .join("");

//       if (!decodedCode.startsWith("mvba_")) {
//         console.log("Invalid code");
//         triggerVisualFeedback("bg-[#FF0000]", errorSound);
//         setProcessing(false); // Re-enable QR scanner on invalid code
//         return;
//       }

//       const processedCode = decodedCode.slice(5);

//       if (!scannedCodesRef.current.has(processedCode) && !processingCodesRef.current.has(processedCode)) {
//         setData(processedCode);
//         processingCodesRef.current.add(processedCode);

//         const isCheckIn = checkMode();
//         updateAttendance(processedCode, isCheckIn);

//         setCurrentDecodedCode(processedCode);

//         // Clear any existing delay timer
//         if (delayTimerRef.current) {
//           clearTimeout(delayTimerRef.current);
//           delayTimerRef.current = null;
//         }

//         // Start a new delay timer
//         delayTimerRef.current = setTimeout(() => {
//           delayTimerRef.current = null;
//         }, 3000); // Set delay for 3 seconds
//       } else {
//         console.log("Already scanned this code");
//         const now = Date.now();
//         if (!delayTimerRef.current && now - lastPlayedRef.current >= 1500) {
//           triggerVisualFeedback("bg-[#FFCC00]", alreadyScannedSound);
//           lastPlayedRef.current = now;
//         }
//         setProcessing(false); // Re-enable QR scanner if code already scanned
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
//     triggerVisualFeedback("bg-[#FF0000]", errorSound);
//     setProcessing(false); // Re-enable QR scanner on scan error
//   };

//   const handleEmailSent = () => {
//     setEmailData({ shouldSend: false, decodedCode: "", studentName: "" });
//   };

//   const playSound = (sound) => {
//     const audio = new Audio(sound);
//     audio.play();
//   };

//   const triggerVisualFeedback = (color, sound) => {
//     setBackgroundColor(color);
//     playSound(sound);
//     setTimeout(() => setBackgroundColor("bg-gray-100"), 1000);
//   };

//   const playRandomMessageSound = (messages) => {
//     const randomIndex = Math.floor(Math.random() * messages.length);
//     const randomSound = messages[randomIndex];
//     playSound(randomSound);
//   };
//   return (
//     <div
//       className={`${backgroundColor} flex flex-col lg:flex-row items-center overflow-hidden justify-center min-h-screen p-6`}>
//       <div className="bg-white rounded-lg shadow-lg p-8 w-full lg:w-1/2 h-full mb-6 lg:mb-0 lg:mr-6 transition-transform transform hover:scale-105">
//         <QrReader
//           onResult={handleResult}
//           onError={handleScanError}
//           constraints={{ facingMode: "environment" }}
//           style={{ width: "100%", height: "100%", borderRadius: "8px" }}
//         />
//       </div>
//       <div className="bg-white rounded-lg shadow-lg p-8 w-full lg:w-1/2 h-full flex flex-col items-center transition-transform transform hover:scale-105">
//         <div className="flex flex-col items-center justify-center mb-6">
//           <div className="flex items-center justify-center bg-gray-50 rounded-lg shadow-md p-4 w-full">
//             <p className={`text-lg font-semibold ${isCheckInMode ? "text-green-600" : "text-red-600"}`}>
//               {isCheckInMode ? "Check-In Mode" : "Check-Out Mode"}
//             </p>
//           </div>
//         </div>

//         <div className="flex flex-col items-center justify-center mb-6">
//           <p className="text-xl font-bold text-gray-800 mb-2">Scan Result:</p>
//           <div className="flex items-center justify-center bg-gray-50 rounded-lg shadow-md p-4 w-full">
//             <p className="text-lg text-blue-600 font-semibold">
//               {data} {studentName && `(${studentName})`}
//             </p>
//           </div>
//         </div>

//         <div className="bg-gray-50 rounded-lg shadow-lg mt-6 w-full overflow-y-scroll" style={{ maxHeight: "300px" }}>
//           <ul className="text-gray-700 divide-y divide-gray-300 w-full">
//             {log.map((entry, index) => (
//               <li key={`${entry.id}-${index}`} className="py-4 px-6">
//                 <span className="block text-lg font-semibold">{entry.time}</span>
//                 <span className="block text-sm">{entry.studentName}</span>
//               </li>
//             ))}
//           </ul>
//         </div>

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




//special thanks to this chhuchu
// import React, { useState, useRef, useEffect } from "react";
// import { QrReader } from "react-qr-reader";
// import { doc, getDoc, updateDoc } from "firebase/firestore";
// import { db } from "./firebase.js";
// import { mappingTable, getPhilippineTime } from "./Constants";
// import Email from "./Email";
// import successSound from "./success.wav";
// import errorSound from "./error.wav";
// import alreadyScannedSound from "./alreadyscanned.wav";
// import complete from "./complete.wav";

//how can i import the sound files?



// const checkInMessages = [complete];
// const checkOutMessages = [complete];

// function Scan() {
//   const [data, setData] = useState("");
//   const [log, setLog] = useState([]);
//   const [studentName, setStudentName] = useState("");
//   const [currentDecodedCode, setCurrentDecodedCode] = useState("");
//   const [emailData, setEmailData] = useState({
//     shouldSend: false,
//     decodedCode: "",
//     studentName: "",
//   });
//   const [isCheckInMode, setIsCheckInMode] = useState(null);
//   const [backgroundColor, setBackgroundColor] = useState("bg-gray-100");
//   const scannedCodesRef = useRef(new Set());
//   const lastPlayedRef = useRef(0);
//   const delayTimerRef = useRef(null);
//   const processingRef = useRef(false);

//   const checkMode = () => {
//     const now = new Date();
//     const currentHour = now.getHours();
//     const currentMinute = now.getMinutes();
//     return (currentHour > 6 || (currentHour === 6 && currentMinute >= 0)) && currentHour < 10;
//   };

//   useEffect(() => {
//     const initialCheckInMode = checkMode();
//     setIsCheckInMode(initialCheckInMode);
//     console.log(`Currently in ${initialCheckInMode ? "check-in" : "check-out"} mode`);

//     const interval = setInterval(() => {
//       const currentMode = checkMode();
//       if (currentMode !== isCheckInMode) {
//         console.log(`Switching to ${currentMode ? "check-in" : "check-out"} mode`);
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
//       if (currentHour === 16 && currentMinute === 3) {
//         cleanup();
//       }
//     }, 60000);

//     return () => clearInterval(cleanupInterval);
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
//     if (processingRef.current) return;
//     processingRef.current = true;

//     try {
//       const userDocRef = doc(db, "users", decodedCode);
//       console.log(`Reading from Firebase: ${decodedCode}`);
//       const userDocSnap = await getDoc(userDocRef);
//       console.log(`Firebase read complete for ${decodedCode}`);

//       if (userDocSnap.exists()) {
//         const userData = userDocSnap.data();
//         const attendance = userData.attendance || {};
//         const currentStudentName = userData.name || "Unknown";
//         setStudentName(currentStudentName);

//         const nowStr = getPhilippineTime();
//         const dateStr = nowStr.split("T")[0];

//         let shouldUpdate = false;
//         if (isCheckIn) {
//           if (!attendance[dateStr]) {
//             attendance[dateStr] = { checkIn: nowStr, checkOut: null };
//             shouldUpdate = true;
//           }
//         } else {
//           if (attendance[dateStr] && !attendance[dateStr].checkOut) {
//             attendance[dateStr].checkOut = nowStr;
//             shouldUpdate = true;
//           } else if (!attendance[dateStr]) {
//             attendance[dateStr] = { checkIn: null, checkOut: nowStr };
//             shouldUpdate = true;
//           }
//         }

//         if (shouldUpdate) {
//           await updateDoc(userDocRef, { attendance });
//           console.log(`${isCheckIn ? "Check-in" : "Check-out"} successful`);
//           setEmailData({
//             shouldSend: true,
//             decodedCode,
//             studentName: currentStudentName,
//           });
//           triggerVisualFeedback("bg-[#06D001]", successSound);
//           playRandomMessageSound(isCheckIn ? checkInMessages : checkOutMessages);
//         } else {
//           console.log(`Already ${isCheckIn ? "checked in" : "checked out"}`);
//           triggerVisualFeedback("bg-[#FFCC00]", alreadyScannedSound);
//         }

//         addLogEntry(decodedCode, currentStudentName);
//       } else {
//         console.log("No document found for this student ID");
//         triggerVisualFeedback("bg-[#FF0000]", errorSound);
//       }
//     } catch (error) {
//       console.error("Error updating attendance: ", error);
//       triggerVisualFeedback("bg-[#FF0000]", errorSound);
//     } finally {
//       processingRef.current = false;
//     }
//   };

//   const handleResult = (result) => {
//     if (result && !processingRef.current) {
//       const code = result.text;
//       const decodedCode = code
//         .split("")
//         .map((char) => mappingTable[char] || "")
//         .join("");

//       if (!decodedCode.startsWith("mvba_")) {
//         console.log("Invalid code");
//         triggerVisualFeedback("bg-[#FF0000]", errorSound);
//         return;
//       }

//       const processedCode = decodedCode.slice(5);

//       if (!scannedCodesRef.current.has(processedCode)) {
//         setData(processedCode);
//         scannedCodesRef.current.add(processedCode);
//         const isCheckIn = checkMode();
//         updateAttendance(processedCode, isCheckIn);
//         setCurrentDecodedCode(processedCode);

//         if (delayTimerRef.current) {
//           clearTimeout(delayTimerRef.current);
//         }
//         delayTimerRef.current = setTimeout(() => {
//           delayTimerRef.current = null;
//         }, 3000);
//       } else {
//         console.log("Already scanned this code");
//         const now = Date.now();
//         if (!delayTimerRef.current && now - lastPlayedRef.current >= 1500) {
//           triggerVisualFeedback("bg-[#FFCC00]", alreadyScannedSound);
//           lastPlayedRef.current = now;
//         }
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
//     triggerVisualFeedback("bg-[#FF0000]", errorSound);
//   };

//   const handleEmailSent = () => {
//     setEmailData({ shouldSend: false, decodedCode: "", studentName: "" });
//   };

//   const playSound = (sound) => {
//     const audio = new Audio(sound);
//     audio.play();
//   };

//   const triggerVisualFeedback = (color, sound) => {
//     setBackgroundColor(color);
//     playSound(sound);
//     setTimeout(() => setBackgroundColor("bg-gray-100"), 1000);
//   };

//   const playRandomMessageSound = (messages) => {
//     const randomIndex = Math.floor(Math.random() * messages.length);
//     const randomSound = messages[randomIndex];
//     playSound(randomSound);
//   };

//   return (
//     <div
//       className={`${backgroundColor} flex flex-col lg:flex-row items-center overflow-hidden justify-center min-h-screen p-6 `}
//     >
//       <div className="bg-white rounded-lg shadow-lg p-8 w-full lg:w-1/2 h-full mb-6 lg:mb-0 lg:mr-6 transition-transform transform hover:scale-105">
//         <QrReader
//           onResult={handleResult}
//           onError={handleScanError}
//           constraints={{ facingMode: "environment" }}
//           style={{ width: "100%", height: "100%", borderRadius: "8px" }}
//         />
//       </div>
//       <div className="bg-white rounded-lg shadow-lg p-8 w-full lg:w-1/2 h-full flex flex-col items-center transition-transform transform hover:scale-105">
//         <div className="flex flex-col items-center justify-center mb-6">
//           <div className="flex items-center justify-center bg-gray-50 rounded-lg shadow-md p-4 w-full">
//             <p
//               className={`text-lg font-semibold ${
//                 isCheckInMode ? "text-green-600" : "text-red-600"
//               }`}
//             >
//               {isCheckInMode ? "Check-In Mode" : "Check-Out Mode"}
//             </p>
//           </div>
//         </div>
//         <div className="flex flex-col items-center justify-center mb-6">
//           <p className="text-xl font-bold text-gray-800 mb-2">Scan Result:</p>
//           <div className="flex items-center justify-center bg-gray-50 rounded-lg shadow-md p-4 w-full">
//             <p className="text-lg text-blue-600 font-semibold">
//               {data} {studentName && `(${studentName})`}
//             </p>
//           </div>
//         </div>
//         <div
//           className="bg-gray-50 rounded-lg shadow-lg mt-6 w-full overflow-y-scroll"
//           style={{ maxHeight: "300px" }}
//         >
//           <ul className="text-gray-700 divide-y divide-gray-300 w-full">
//             {log.map((entry, index) => (
//               <li key={`${entry.id}-${index}`} className="py-4 px-6">
//                 <span className="block text-lg font-semibold">
//                   {entry.time}
//                 </span>
//                 <span className="block text-sm">{entry.studentName}</span>
//               </li>
//             ))}
//           </ul>
//         </div>
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


















//noo ffin progress
// import React, { useState, useRef, useEffect } from "react";
// import { QrReader } from "react-qr-reader";
// import { doc, getDoc, updateDoc } from "firebase/firestore";
// import { db } from "./firebase.js";
// import { mappingTable, getPhilippineTime } from "./Constants";
// import Email from "./Email"; // Import the Email component
// import successSound from "./success.wav"; // Import the success sound
// import errorSound from "./error.wav"; // Import the error sound
// import alreadyScannedSound from "./alreadyscanned.wav"; // Import the already scanned sound

// // Import message sounds for check-in and check-out modes
// import complete from "./complete.wav";
// const checkInMessages = [complete];
// const checkOutMessages = [complete];

// function Scan() {
//   const [data, setData] = useState("");
//   const [log, setLog] = useState([]);
//   const [studentName, setStudentName] = useState("");
//   const [currentDecodedCode, setCurrentDecodedCode] = useState("");
//   const [emailData, setEmailData] = useState({
//     shouldSend: false,
//     decodedCode: "",
//     studentName: "",
//   });
//   const [isCheckInMode, setIsCheckInMode] = useState(null);
//   const [backgroundColor, setBackgroundColor] = useState("bg-gray-100"); // State for background color

//   const scannedCodesRef = useRef(new Set());
//   const lastPlayedRef = useRef(0); // Ref to store the last time the already scanned sound was played
//   const delayTimerRef = useRef(null); // Ref to store the delay timer

//   const checkMode = () => {
//     const now = new Date();
//     const currentHour = now.getHours();
//     const currentMinute = now.getMinutes();
//     return (
//       (currentHour > 6 || (currentHour === 6 && currentMinute >= 0)) &&
//       currentHour < 10
//     );
//   };

//   useEffect(() => {
//     const initialCheckInMode = checkMode();
//     setIsCheckInMode(initialCheckInMode);
//     console.log(
//       `Currently in ${initialCheckInMode ? "check-in" : "check-out"} mode`
//     );

//     const interval = setInterval(() => {
//       const currentMode = checkMode();
//       if (currentMode !== isCheckInMode) {
//         console.log(
//           `Switching to ${currentMode ? "check-in" : "check-out"} mode`
//         );
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

//       if (currentHour === 16 && currentMinute === 3) {
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

//         if (isCheckIn) {
//           if (!attendance[dateStr]) {
//             attendance[dateStr] = { checkIn: nowStr, checkOut: null };
//             await updateDoc(userDocRef, { attendance });
//             console.log("Check-in successful");
//             setEmailData({
//               shouldSend: true,
//               decodedCode,
//               studentName: currentStudentName,
//             });
//             triggerVisualFeedback("bg-[#06D001]", successSound);
//             playRandomMessageSound(checkInMessages);
//           } else {
//             console.log("Already checked in for today");
//           }
//         } else {
//           if (attendance[dateStr]) {
//             if (!attendance[dateStr].checkOut) {
//               attendance[dateStr].checkOut = nowStr;
//               await updateDoc(userDocRef, { attendance });
//               console.log("Checkout successful");
//               setEmailData({
//                 shouldSend: true,
//                 decodedCode,
//                 studentName: currentStudentName,
//               });
//               triggerVisualFeedback("bg-[#06D001]", successSound);
//               playRandomMessageSound(checkOutMessages);
//             } else {
//               console.log("Already checked out");
//             }
//           } else {
//             // No check-in recorded but it's check-out time, record check-out
//             attendance[dateStr] = { checkIn: null, checkOut: nowStr };
//             await updateDoc(userDocRef, { attendance });
//             console.log("No check-in recorded but check-out successful");
//             setEmailData({
//               shouldSend: true,
//               decodedCode,
//               studentName: currentStudentName,
//             });
//             triggerVisualFeedback("bg-[#06D001]", successSound);
//             playRandomMessageSound(checkOutMessages);
//           }
//         }
//         // Add the log entry with the current student's name
//         addLogEntry(decodedCode, currentStudentName);
//       } else {
//         console.log("No document found for this student ID");
//         triggerVisualFeedback("bg-[#FF0000]", errorSound);
//         return; // Stop the process if no document is found
//       }
//     } catch (error) {
//       console.error("Error updating attendance: ", error);
//       triggerVisualFeedback("bg-[#FF0000]", errorSound);
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
//         console.log("Invalid code");
//         triggerVisualFeedback("bg-[#FF0000]", errorSound);
//         return;
//       }

//       const processedCode = decodedCode.slice(5);

//       if (!scannedCodesRef.current.has(processedCode)) {
//         // Immediately add the code to the set to ensure it is only processed once
//         scannedCodesRef.current.add(processedCode);
//         setData(processedCode);

//         const isCheckIn = checkMode();
//         updateAttendance(processedCode, isCheckIn);

//         setCurrentDecodedCode(processedCode);

//         // Clear any existing delay timer
//         if (delayTimerRef.current) {
//           clearTimeout(delayTimerRef.current);
//           delayTimerRef.current = null;
//         }

//         // Start a new delay timer
//         delayTimerRef.current = setTimeout(() => {
//           delayTimerRef.current = null;
//         }, 3000); // Set delay for 3 seconds
//       } else {
//         console.log("Already scanned this code");
//         const now = Date.now();
//         if (!delayTimerRef.current && now - lastPlayedRef.current >= 1500) {
//           triggerVisualFeedback("bg-[#FFCC00]", alreadyScannedSound);
//           lastPlayedRef.current = now;
//         }
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
//     triggerVisualFeedback("bg-[#FF0000]", errorSound);
//   };

//   const handleEmailSent = () => {
//     setEmailData({ shouldSend: false, decodedCode: "", studentName: "" });
//   };

//   const playSound = (sound) => {
//     const audio = new Audio(sound);
//     audio.play();
//   };

//   const triggerVisualFeedback = (color, sound) => {
//     setBackgroundColor(color);
//     playSound(sound);
//     setTimeout(() => setBackgroundColor("bg-gray-100"), 1000);
//   };

//   const playRandomMessageSound = (messages) => {
//     const randomIndex = Math.floor(Math.random() * messages.length);
//     const randomSound = messages[randomIndex];
//     playSound(randomSound);
//   };

//   return (
//     <div
//       className={`${backgroundColor} flex flex-col lg:flex-row items-center overflow-hidden justify-center min-h-screen p-6 `}>
//       <div className="bg-white rounded-lg shadow-lg p-8 w-full lg:w-1/2 h-full mb-6 lg:mb-0 lg:mr-6 transition-transform transform hover:scale-105">
//         <QrReader
//           onResult={handleResult}
//           onError={handleScanError}
//           constraints={{ facingMode: "environment" }}
//           style={{ width: "100%", height: "100%", borderRadius: "8px" }}
//         />
//       </div>
//       <div className="bg-white rounded-lg shadow-lg p-8 w-full lg:w-1/2 h-full flex flex-col items-center transition-transform transform hover:scale-105">
//         <div className="flex flex-col items-center justify-center mb-6">
//           <div className="flex items-center justify-center bg-gray-50 rounded-lg shadow-md p-4 w-full">
//             <p
//               className={`text-lg font-semibold ${
//                 isCheckInMode ? "text-green-600" : "text-red-600"
//               }`}>
//               {isCheckInMode ? "Check-In Mode" : "Check-Out Mode"}
//             </p>
//           </div>
//         </div>

//         <div className="flex flex-col items-center justify-center mb-6">
//           <p className="text-xl font-bold text-gray-800 mb-2">Scan Result:</p>
//           <div className="flex items-center justify-center bg-gray-50 rounded-lg shadow-md p-4 w-full">
//             <p className="text-lg text-blue-600 font-semibold">
//               {data} {studentName && `(${studentName})`}
//             </p>
//           </div>
//         </div>

//         <div
//           className="bg-gray-50 rounded-lg shadow-lg mt-6 w-full overflow-y-scroll"
//           style={{ maxHeight: "300px" }}>
//           <ul className="text-gray-700 divide-y divide-gray-300 w-full">
//             {log.map((entry, index) => (
//               <li key={`${entry.id}-${index}`} className="py-4 px-6">
//                 <span className="block text-lg font-semibold">
//                   {entry.time}
//                 </span>
//                 <span className="block text-sm">{entry.studentName}</span>
//               </li>
//             ))}
//           </ul>
//         </div>

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





//current july 23, multiple firebase reads



// import React, { useState, useRef, useEffect } from "react";
// import { QrReader } from "react-qr-reader";
// import { doc, getDoc, updateDoc } from "firebase/firestore";
// import { db } from "./firebase.js";
// import { mappingTable, getPhilippineTime } from "./Constants";
// import Email from "./Email"; // Import the Email component
// import successSound from "./success.wav"; // Import the success sound
// import errorSound from "./error.wav"; // Import the error sound
// import alreadyScannedSound from "./alreadyscanned.wav"; // Import the already scanned sound

// // Import message sounds for check-in and check-out modes
// import complete from "./complete.wav";
// const checkInMessages = [complete];
// const checkOutMessages = [complete];

// function Scan() {
//   const [data, setData] = useState("");
//   const [log, setLog] = useState([]);
//   const [studentName, setStudentName] = useState("");
//   const [currentDecodedCode, setCurrentDecodedCode] = useState("");
//   const [emailData, setEmailData] = useState({
//     shouldSend: false,
//     decodedCode: "",
//     studentName: "",
//   });
//   const [isCheckInMode, setIsCheckInMode] = useState(null);
//   const [backgroundColor, setBackgroundColor] = useState("bg-gray-100"); // State for background color

//   const scannedCodesRef = useRef(new Set());
//   const lastPlayedRef = useRef(0); // Ref to store the last time the already scanned sound was played
//   const delayTimerRef = useRef(null); // Ref to store the delay timer

//   const checkMode = () => {
//     const now = new Date();
//     const currentHour = now.getHours();
//     const currentMinute = now.getMinutes();
//     return (
//       (currentHour > 6 || (currentHour === 6 && currentMinute >= 0)) &&
//       currentHour < 10
//     );
//   };

//   useEffect(() => {
//     const initialCheckInMode = checkMode();
//     setIsCheckInMode(initialCheckInMode);
//     console.log(
//       `Currently in ${initialCheckInMode ? "check-in" : "check-out"} mode`
//     );

//     const interval = setInterval(() => {
//       const currentMode = checkMode();
//       if (currentMode !== isCheckInMode) {
//         console.log(
//           `Switching to ${currentMode ? "check-in" : "check-out"} mode`
//         );
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

//       if (currentHour === 16 && currentMinute === 3) {
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

//         if (isCheckIn) {
//           if (!attendance[dateStr]) {
//             attendance[dateStr] = { checkIn: nowStr, checkOut: null };
//             await updateDoc(userDocRef, { attendance });
//             console.log("Check-in successful");
//             setEmailData({
//               shouldSend: true,
//               decodedCode,
//               studentName: currentStudentName,
//             });
//             triggerVisualFeedback("bg-[#06D001]", successSound);
//             playRandomMessageSound(checkInMessages);
//           } else {
//             console.log("Already checked in for today");
//           }
//         } else {
//           if (attendance[dateStr]) {
//             if (!attendance[dateStr].checkOut) {
//               attendance[dateStr].checkOut = nowStr;
//               await updateDoc(userDocRef, { attendance });
//               console.log("Checkout successful");
//               setEmailData({
//                 shouldSend: true,
//                 decodedCode,
//                 studentName: currentStudentName,
//               });
//               triggerVisualFeedback("bg-[#06D001]", successSound);
//               playRandomMessageSound(checkOutMessages);
//             } else {
//               console.log("Already checked out");
//             }
//           } else {
//             // No check-in recorded but it's check-out time, record check-out
//             attendance[dateStr] = { checkIn: null, checkOut: nowStr };
//             await updateDoc(userDocRef, { attendance });
//             console.log("No check-in recorded but check-out successful");
//             setEmailData({
//               shouldSend: true,
//               decodedCode,
//               studentName: currentStudentName,
//             });
//             triggerVisualFeedback("bg-[#06D001]", successSound);
//             playRandomMessageSound(checkOutMessages);
//           }
//         }
//         // Add the log entry with the current student's name
//         addLogEntry(decodedCode, currentStudentName);
//       } else {
//         console.log("No document found for this student ID");
//         triggerVisualFeedback("bg-[#FF0000]", errorSound);
//         return; // Stop the process if no document is found
//       }
//     } catch (error) {
//       console.error("Error updating attendance: ", error);
//       triggerVisualFeedback("bg-[#FF0000]", errorSound);
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
//         console.log("Invalid code");
//         triggerVisualFeedback("bg-[#FF0000]", errorSound);
//         return;
//       }

//       const processedCode = decodedCode.slice(5);

//       if (!scannedCodesRef.current.has(processedCode)) {
//         setData(processedCode);
//         scannedCodesRef.current.add(processedCode);

//         const isCheckIn = checkMode();
//         updateAttendance(processedCode, isCheckIn);

//         setCurrentDecodedCode(processedCode);

//         // Clear any existing delay timer
//         if (delayTimerRef.current) {
//           clearTimeout(delayTimerRef.current);
//           delayTimerRef.current = null;
//         }

//         // Start a new delay timer
//         delayTimerRef.current = setTimeout(() => {
//           delayTimerRef.current = null;
//         }, 3000); // Set delay for 3 seconds
//       } else {
//         console.log("Already scanned this code");
//         const now = Date.now();
//         if (!delayTimerRef.current && now - lastPlayedRef.current >= 1500) {
//           triggerVisualFeedback("bg-[#FFCC00]", alreadyScannedSound);
//           lastPlayedRef.current = now;
//         }
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
//     triggerVisualFeedback("bg-[#FF0000]", errorSound);
//   };

//   const handleEmailSent = () => {
//     setEmailData({ shouldSend: false, decodedCode: "", studentName: "" });
//   };

//   const playSound = (sound) => {
//     const audio = new Audio(sound);
//     audio.play();
//   };

//   const triggerVisualFeedback = (color, sound) => {
//     setBackgroundColor(color);
//     playSound(sound);
//     setTimeout(() => setBackgroundColor("bg-gray-100"), 1000);
//   };

//   const playRandomMessageSound = (messages) => {
//     const randomIndex = Math.floor(Math.random() * messages.length);
//     const randomSound = messages[randomIndex];
//     playSound(randomSound);
//   };

//   return (
//     <div
//       className={`${backgroundColor} flex flex-col lg:flex-row items-center overflow-hidden justify-center min-h-screen p-6 `}>
//       <div className="bg-white rounded-lg shadow-lg p-8 w-full lg:w-1/2 h-full mb-6 lg:mb-0 lg:mr-6 transition-transform transform hover:scale-105">
//         <QrReader
//           onResult={handleResult}
//           onError={handleScanError}
//           constraints={{ facingMode: "environment" }}
//           style={{ width: "100%", height: "100%", borderRadius: "8px" }}
//         />
//       </div>
//       <div className="bg-white rounded-lg shadow-lg p-8 w-full lg:w-1/2 h-full flex flex-col items-center transition-transform transform hover:scale-105">
//         <div className="flex flex-col items-center justify-center mb-6">
//           <div className="flex items-center justify-center bg-gray-50 rounded-lg shadow-md p-4 w-full">
//             <p
//               className={`text-lg font-semibold ${
//                 isCheckInMode ? "text-green-600" : "text-red-600"
//               }`}>
//               {isCheckInMode ? "Check-In Mode" : "Check-Out Mode"}
//             </p>
//           </div>
//         </div>

//         <div className="flex flex-col items-center justify-center mb-6">
//           <p className="text-xl font-bold text-gray-800 mb-2">Scan Result:</p>
//           <div className="flex items-center justify-center bg-gray-50 rounded-lg shadow-md p-4 w-full">
//             <p className="text-lg text-blue-600 font-semibold">
//               {data} {studentName && `(${studentName})`}
//             </p>
//           </div>
//         </div>

//         <div
//           className="bg-gray-50 rounded-lg shadow-lg mt-6 w-full overflow-y-scroll"
//           style={{ maxHeight: "300px" }}>
//           <ul className="text-gray-700 divide-y divide-gray-300 w-full">
//             {log.map((entry, index) => (
//               <li key={`${entry.id}-${index}`} className="py-4 px-6">
//                 <span className="block text-lg font-semibold">
//                   {entry.time}
//                 </span>
//                 <span className="block text-sm">{entry.studentName}</span>
//               </li>
//             ))}
//           </ul>
//         </div>

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
















// working tues, but seems like multiple reads from firebase
// import React, { useState, useRef, useEffect } from "react";
// import { QrReader } from "react-qr-reader";
// import { doc, getDoc, updateDoc } from "firebase/firestore";
// import { db } from "./firebase.js";
// import { mappingTable, getPhilippineTime } from "./Constants";
// import Email from "./Email"; // Import the Email component
// import successSound from "./success.wav"; // Import the success sound
// import errorSound from "./error.wav"; // Import the error sound
// import alreadyScannedSound from "./alreadyscanned.wav"; // Import the already scanned sound

// // Import message sounds for check-in and check-out modes
// import complete from "./complete.wav";
// const checkInMessages = [complete];

// const checkOutMessages = [complete];

// function Scan() {
//   const [data, setData] = useState("");
//   const [log, setLog] = useState([]);
//   const [studentName, setStudentName] = useState("");
//   const [currentDecodedCode, setCurrentDecodedCode] = useState("");
//   const [emailData, setEmailData] = useState({
//     shouldSend: false,
//     decodedCode: "",
//     studentName: "",
//   });
//   const [isCheckInMode, setIsCheckInMode] = useState(null);
//   const [backgroundColor, setBackgroundColor] = useState("bg-gray-100"); // State for background color

//   const scannedCodesRef = useRef(new Set());
//   const lastPlayedRef = useRef(0); // Ref to store the last time the already scanned sound was played
//   const delayTimerRef = useRef(null); // Ref to store the delay timer

//   const checkMode = () => {
//     const now = new Date();
//     const currentHour = now.getHours();
//     const currentMinute = now.getMinutes();

//     return (
//       (currentHour > 6 || (currentHour === 6 && currentMinute >= 0)) &&
//       currentHour < 10
//     );
//   };
//   //try lan

//   useEffect(() => {
//     const initialCheckInMode = checkMode();
//     setIsCheckInMode(initialCheckInMode);
//     console.log(
//       `Currently in ${initialCheckInMode ? "check-in" : "check-out"} mode`
//     );

//     const interval = setInterval(() => {
//       const currentMode = checkMode();
//       if (currentMode !== isCheckInMode) {
//         console.log(
//           `Switching to ${currentMode ? "check-in" : "check-out"} mode`
//         );
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

//       if (currentHour === 16 && currentMinute === 3) {
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

//         if (isCheckIn) {
//           if (!attendance[dateStr]) {
//             attendance[dateStr] = { checkIn: nowStr, checkOut: null };
//             await updateDoc(userDocRef, { attendance });
//             console.log("Check-in successful");
//             setEmailData({
//               shouldSend: true,
//               decodedCode,
//               studentName: currentStudentName,
//             });
//             triggerVisualFeedback("bg-[#06D001]", successSound);
//             playRandomMessageSound(checkInMessages);
//           } else {
//             console.log("Already checked in for today");
//           }
//         } else {
//           if (attendance[dateStr]) {
//             if (!attendance[dateStr].checkOut) {
//               attendance[dateStr].checkOut = nowStr;
//               await updateDoc(userDocRef, { attendance });
//               console.log("Checkout successful");
//               setEmailData({
//                 shouldSend: true,
//                 decodedCode,
//                 studentName: currentStudentName,
//               });
//               triggerVisualFeedback("bg-[#06D001]", successSound);
//               playRandomMessageSound(checkOutMessages);
//             } else {
//               console.log("Already checked out");
//             }
//           } else {
//             // No check-in recorded but it's check-out time, record check-out
//             attendance[dateStr] = { checkIn: null, checkOut: nowStr };
//             await updateDoc(userDocRef, { attendance });
//             console.log("No check-in recorded but check-out successful");
//             setEmailData({
//               shouldSend: true,
//               decodedCode,
//               studentName: currentStudentName,
//             });
//             triggerVisualFeedback("bg-[#06D001]", successSound);
//             playRandomMessageSound(checkOutMessages);
//           }
//         }
//         // Add the log entry with the current student's name
//         addLogEntry(decodedCode, currentStudentName);
//       } else {
//         console.log("No document found for this student ID");
//         triggerVisualFeedback("bg-[#FF0000]", errorSound);
//         return; // Stop the process if no document is found
//       }
//     } catch (error) {
//       console.error("Error updating attendance: ", error);
//       triggerVisualFeedback("bg-[#FF0000]", errorSound);
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
//         console.log("Invalid code");
//         triggerVisualFeedback("bg-[#FF0000]", errorSound);
//         return;
//       }

//       const processedCode = decodedCode.slice(5);

//       const now = new Date();
//       const currentHour = now.getHours();
//       const currentMinute = now.getMinutes();

//       if (!scannedCodesRef.current.has(processedCode)) {
//         setData(processedCode);
//         scannedCodesRef.current.add(processedCode);

//         const isCheckIn = currentHour >= 6 && currentHour < 10;

//         updateAttendance(processedCode, isCheckIn);

//         setCurrentDecodedCode(processedCode);

//         // Clear any existing delay timer
//         if (delayTimerRef.current) {
//           clearTimeout(delayTimerRef.current);
//           delayTimerRef.current = null;
//         }

//         // Start a new delay timer
//         delayTimerRef.current = setTimeout(() => {
//           delayTimerRef.current = null;
//         }, 3000); // Set delay for 3 seconds
//       } else {
//         console.log("Already scanned this code");
//         const now = Date.now();
//         if (!delayTimerRef.current && now - lastPlayedRef.current >= 1500) {
//           triggerVisualFeedback("bg-[#FFCC00]", alreadyScannedSound);
//           lastPlayedRef.current = now;
//         }
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
//     triggerVisualFeedback("bg-[#FF0000]", errorSound);
//   };

//   const handleEmailSent = () => {
//     setEmailData({ shouldSend: false, decodedCode: "", studentName: "" });
//   };

//   const playSound = (sound) => {
//     const audio = new Audio(sound);
//     audio.play();
//   };

//   const triggerVisualFeedback = (color, sound) => {
//     setBackgroundColor(color);
//     playSound(sound);
//     setTimeout(() => setBackgroundColor("bg-gray-100"), 1000);
//   };

//   const playRandomMessageSound = (messages) => {
//     const randomIndex = Math.floor(Math.random() * messages.length);
//     const randomSound = messages[randomIndex];
//     playSound(randomSound);
//   };

//   return (
//     <div
//       className={`${backgroundColor} flex flex-col lg:flex-row items-center overflow-hidden justify-center min-h-screen p-6 `}>
//       <div className="bg-white rounded-lg shadow-lg p-8 w-full lg:w-1/2 h-full mb-6 lg:mb-0 lg:mr-6 transition-transform transform hover:scale-105">
//         <QrReader
//           onResult={handleResult}
//           onError={handleScanError}
//           constraints={{ facingMode: "environment" }}
//           style={{ width: "100%", height: "100%", borderRadius: "8px" }}
//         />
//       </div>
//       <div className="bg-white rounded-lg shadow-lg p-8 w-full lg:w-1/2 h-full flex flex-col items-center transition-transform transform hover:scale-105">
//         <div className="flex flex-col items-center justify-center mb-6">
//           <div className="flex items-center justify-center bg-gray-50 rounded-lg shadow-md p-4 w-full">
//             <p
//               className={`text-lg font-semibold ${
//                 isCheckInMode ? "text-green-600" : "text-red-600"
//               }`}>
//               {isCheckInMode ? "Check-In Mode" : "Check-Out Mode"}
//             </p>
//           </div>
//         </div>

//         <div className="flex flex-col items-center justify-center mb-6">
//           <p className="text-xl font-bold text-gray-800 mb-2">Scan Result:</p>
//           <div className="flex items-center justify-center bg-gray-50 rounded-lg shadow-md p-4 w-full">
//             <p className="text-lg text-blue-600 font-semibold">
//               {data} {studentName && `(${studentName})`}
//             </p>
//           </div>
//         </div>

//         <div
//           className="bg-gray-50 rounded-lg shadow-lg mt-6 w-full overflow-y-scroll"
//           style={{ maxHeight: "300px" }}>
//           <ul className="text-gray-700 divide-y divide-gray-300 w-full">
//             {log.map((entry, index) => (
//               <li key={`${entry.id}-${index}`} className="py-4 px-6">
//                 <span className="block text-lg font-semibold">
//                   {entry.time}
//                 </span>
//                 <span className="block text-sm">{entry.studentName}</span>
//               </li>
//             ))}
//           </ul>
//         </div>

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

//divided scanner
// import React, { useState, useEffect } from "react";
// import { doc, getDoc, updateDoc } from "firebase/firestore";
// import { db } from "./firebase.js";
// import { mappingTable, getPhilippineTime } from "./Constants";
// import Email from "./Email"; // Import the Email component
// import QrScanner from "./QrScanner"; // Import the QrScanner component
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
//             triggerVisualFeedback("bg-[#06D001]", successSound);
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
//               triggerVisualFeedback("bg-[#06D001]", successSound);
//             } else {
//               console.log("Already checked out");
//             }
//           } else {
//             // No check-in recorded but it's check-out time, record check-out
//             attendance[dateStr] = { checkIn: null, checkOut: nowStr };
//             await updateDoc(userDocRef, { attendance });
//             console.log("No check-in recorded but check-out successful");
//             setEmailData({ shouldSend: true, decodedCode, studentName: currentStudentName });
//             triggerVisualFeedback("bg-[#06D001]", successSound);
//           }
//         }
//         // Add the log entry with the current student's name
//         addLogEntry(decodedCode, currentStudentName);
//       } else {
//         console.log("No document found for this student ID");
//         triggerVisualFeedback("bg-[#FF0000]", errorSound);
//         return; // Stop the process if no document is found
//       }
//     } catch (error) {
//       console.error("Error updating attendance: ", error);
//       triggerVisualFeedback("bg-[#FF0000]", errorSound);
//     }
//   };

//   const handleResult = (code, scannedCodesRef) => {
//     const decodedCode = code
//       .split("")
//       .map((char) => mappingTable[char] || "")
//       .join("");

//     if (!decodedCode.startsWith("mvba_")) {
//       console.log("Invalid code, get better at coding boi");
//       triggerVisualFeedback("bg-[#FF0000]", errorSound);
//       return;
//     }

//     const processedCode = decodedCode.slice(5);

//     const now = new Date();
//     const currentHour = now.getHours();
//     const currentMinute = now.getMinutes();

//     if (!scannedCodesRef.current.has(processedCode)) {
//       setData(processedCode);
//       scannedCodesRef.current.add(processedCode);

//       const isCheckIn = (currentHour > 6 || (currentHour === 6 && currentMinute >= 0)) &&
//         (currentHour < 13 || (currentHour === 14 && currentMinute < 50));

//       updateAttendance(processedCode, isCheckIn);

//       setCurrentDecodedCode(processedCode);
//     } else {
//       console.log("Already scanned this code");
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
//     triggerVisualFeedback("bg-[#FF0000]", errorSound);
//   };

//   const handleEmailSent = () => {
//     setEmailData({ shouldSend: false, decodedCode: "", studentName: "" });
//   };

//   const playSound = (sound) => {
//     const audio = new Audio(sound);
//     audio.play();
//   };

//   const triggerVisualFeedback = (color, sound) => {
//     setBackgroundColor(color);
//     playSound(sound);
//     setTimeout(() => setBackgroundColor("bg-gray-100"), 1000);
//   };

//   return (
//     <div className={`${backgroundColor} flex flex-col lg:flex-row items-center justify-center min-h-screen p-6`}>
//       <QrScanner
//         onResult={handleResult}
//         onScanError={handleScanError}
//         backgroundColor={backgroundColor}
//         setBackgroundColor={setBackgroundColor}
//       />
//       <div className="bg-white rounded-lg shadow-xl p-8 w-full lg:w-1/2 h-full flex flex-col items-center">
//         <div className="flex flex-col items-center justify-center mb-6">
//           <p className="text-xl font-bold text-gray-700 mb-2">Scan Result:</p>
//           <div className="flex items-center justify-center bg-gray-50 rounded-lg shadow-md p-4 w-full">
//             <p className="text-lg text-blue-600 font-semibold">{data} {studentName && `(${studentName})`}</p>
//           </div>
//         </div>
//         <div className="bg-gray-50 rounded-lg shadow-lg mt-6 w-full overflow-y-scroll">
//           <ul className="text-gray-700 divide-y divide-gray-300 w-full">
//             {log.map((entry, index) => (
//               <li key={`${entry.id}-${index}`} className="py-4 px-6">
//                      <span className="block text-lg font-semibold">{entry.time}</span>
//                 <span className="block text-sm">{entry.studentName}</span>
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
