import React, { useEffect } from "react";
import { codeMappings } from "./mappings"; // Adjust the path as needed

const Email = ({ studentName, decodedCode, onEmailSent }) => {
  const sendEmail = async (info) => {
    try {
      const response = await fetch("/api/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(info),
      });
      console.log("Email sent successfully:", response);
      onEmailSent();
    } catch (error) {
      console.error("Error sending email:", error);
    }
  };

  useEffect(() => {
    if (studentName && decodedCode) {
      const mapping = codeMappings[decodedCode];
      if (!mapping) {
        console.error("No mapping found for decoded code:", decodedCode);
        return;
      }

      const dateToday = new Date().toLocaleDateString();
      const currentTime = new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
      const currentHour = new Date().getHours();
      const currentMinute = new Date().getMinutes();
      const firstName = studentName.split(",")[1].trim();

      const isArrival = (currentHour > 6 || (currentHour === 6 && currentMinute >= 0)) &&
                        (currentHour < 13 || (currentHour === 14 && currentMinute < 50));
      const title = `${firstName} has ${isArrival ? "arrived" : "left"}`;
      const subject = `${isArrival ? "Arrival" : "Departure"} Log - ${dateToday}`;
      const message = `${studentName} has ${isArrival ? "arrived" : "left"} safely at ${currentTime}.`;

      const emailInfo = {
        title,
        studentName,
        email: mapping.email,
        subject,
        message,
        token: mapping.token,
      };

      sendEmail(emailInfo);
    }
  }, [studentName, decodedCode, onEmailSent]);

  return null;
};

export default Email;





// // Email.jsx
// import React, { useEffect } from "react";
// import { codeMappings } from './mappings'; // Adjust the path as needed

// const Email = ({ studentName, decodedCode, onEmailSent }) => {
//   const sendEmail = async (studentName, email, token) => {
//     const info = {
//       studentName: studentName,
//       email: email,
//       phone: "asdfasdf",
//       subject: "Attendance",
//       message: decodedCode,
//       token: token
//     };

//     try {
//       const response = await fetch('/api/send', {
//         method: 'POST',
//         headers: {
//           'Content-Type': 'application/json',
//         },
//         body: JSON.stringify(info),
//       });
//       console.log('Email sent successfully:', response);
//       onEmailSent();
//     } catch (error) {
//       console.error('Error sending email:', error);
//     }
//   };

//   useEffect(() => {
//     if (studentName && decodedCode) {
//       const mapping = codeMappings[decodedCode];
//       if (mapping) {
//         sendEmail(studentName, mapping.email, mapping.token);
//       } else {
//         console.error('No mapping found for decoded code:', decodedCode);
//       }
//     }
//   }, [studentName, decodedCode]);

//   return null;
// };

// export default Email;
