import React, { useState, useRef, useEffect } from "react";
import { QrReader } from "react-qr-reader";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "./firebase.js";
import { mappingTable, getPhilippineTime } from "./Constants";
import Email from "./Email"; // Import the Email component
import successSound from './success.wav'; // Import the success sound
import errorSound from './error.wav'; // Import the error sound
import alreadyScannedSound from './scanned.wav'; // Import the already scanned sound

function Scan() {
  const [data, setData] = useState("");
  const [log, setLog] = useState([]);
  const [studentName, setStudentName] = useState("");
  const [currentDecodedCode, setCurrentDecodedCode] = useState("");
  const [emailData, setEmailData] = useState({ shouldSend: false, decodedCode: "", studentName: "" });
  const [isCheckInMode, setIsCheckInMode] = useState(null);
  const [backgroundColor, setBackgroundColor] = useState("bg-gray-100"); // State for background color

  const scannedCodesRef = useRef(new Set());
  const lastPlayedRef = useRef(0); // Ref to store the last time the already scanned sound was played

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
        const now = Date.now();
        if (now - lastPlayedRef.current >= 1000) { // Check if at least 1 second has passed
          triggerVisualFeedback("bg-[#FFCC00]", alreadyScannedSound);
          lastPlayedRef.current = now;
        }
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
          <div className="flex items           center justify-center bg-gray-50 rounded-lg shadow-md p-4 w-full">
            <p className="text-lg text-blue-600 font-semibold">{data} {studentName && `(${studentName})`}</p>
          </div>
        </div>
        <div className="bg-gray-50 rounded-lg shadow-lg mt-6 w-full overflow-y-scroll">
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

