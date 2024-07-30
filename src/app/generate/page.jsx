
"use client"
// generate.js
import React, { useState } from "react";
import QRCode from "react-qr-code";

const mappingTable = {
  _: "_",
  A: "G",
  B: "Z",
  C: "R",
  D: "L",
  E: "V",
  F: "N",
  G: "H",
  H: "Q",
  I: "J",
  J: "P",
  K: "W",
  L: "S",
  M: "B",
  N: "T",
  O: "U",
  P: "M",
  Q: "K",
  R: "F",
  S: "X",
  T: "A",
  U: "O",
  V: "E",
  W: "Y",
  X: "D",
  Y: "C",
  Z: "I",
  a: "h",
  b: "q",
  c: "e",
  d: "k",
  e: "r",
  f: "v",
  g: "y",
  h: "b",
  i: "j",
  j: "z",
  k: "m",
  l: "o",
  m: "u",
  n: "s",
  o: "g",
  p: "x",
  q: "l",
  r: "p",
  s: "f",
  t: "d",
  u: "n",
  v: "t",
  w: "a",
  x: "c",
  y: "w",
  z: "i",
  0: "5",
  1: "8",
  2: "3",
  3: "7",
  4: "1",
  5: "9",
  6: "0",
  7: "4",
  8: "2",
  9: "6"
};

function Generate() {
  const [qrCodeValue, setQrCodeValue] = useState("");

  const transformValue = (value) => {
    let transformedValue = "utqh_";
    for (let i = 0; i < value.length; i++) {
      const char = value[i];
      if (mappingTable.hasOwnProperty(char)) {
        transformedValue += mappingTable[char];
      }
    }
    console.log(transformedValue); // Log the transformed string
    return transformedValue;
  };

  const downloadQRCode = () => {
    const svg = document.querySelector("svg");
    const serializer = new XMLSerializer();
    const svgString = serializer.serializeToString(svg);

    const canvas = document.createElement("canvas");
    canvas.width = 500;
    canvas.height = 500;

    const ctx = canvas.getContext("2d");
    const img = new Image();
    img.src = "data:image/svg+xml;base64," + btoa(svgString);
    img.onload = () => {
      // Draw white card template
      ctx.fillStyle = "#ffffff";

      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw QR code in center
      const qrSize = Math.min(canvas.width, canvas.height) * 0.7;
      const qrX = (canvas.width - qrSize) / 2;
      const qrY = (canvas.height - qrSize) / 2;
      ctx.drawImage(img, qrX, qrY, qrSize, qrSize);

      const name = "PASAGDAN, RENZ";
      ctx.font = "bold 24px sans-serif";
      ctx.textAlign = "center";
      ctx.fillStyle = "#333333";
      ctx.fillText(name, canvas.width / 2, qrY + qrSize + 40);

      // Download image
      const link = document.createElement("a");
      link.download = "qrcode.png";
      link.href = canvas.toDataURL("image/png");
      link.click();
    };
  };

  return (
    <div className="bg-gray-100 flex flex-col items-center justify-center h-screen">
      <div className="bg-white rounded-lg shadow-md p-6 w-full max-w-md">
        <h1 className="text-3xl font-semibold mb-4">Generate QR Code</h1>
        <div className="flex items-center justify-center mb-6">
          {qrCodeValue !== "" && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <QRCode value={transformValue(qrCodeValue)} />
              <button
                className="mt-4 px-4 py-2 rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none"
                onClick={downloadQRCode}
              >
                Save to Device
              </button>
            </div>
          )}
        </div>
        <label className="text-lg font-semibold">QR Code Value:</label>
        <input
          className="w-full border border-gray-300 rounded-md p-2 mt-2 mb-4"
          onChange={(e) => {
            setQrCodeValue(e.target.value);
          }}
        />
      </div>
    </div>
  );
}

export default Generate;


























// // generate.js
// import React, { useState } from "react";
// import QRCode from "react-qr-code";

// const mappingTable = {
//   A: "G",
//   B: "Z",
//   C: "R",
//   D: "L",
//   E: "V",
//   F: "N",
//   G: "H",
//   H: "Q",
//   I: "J",
//   J: "P",
//   K: "W",
//   L: "S",
//   M: "B",
//   N: "T",
//   O: "U",
//   P: "M",
//   Q: "K",
//   R: "F",
//   S: "X",
//   T: "A",
//   U: "O",
//   V: "E",
//   W: "Y",
//   X: "D",
//   Y: "C",
//   Z: "I",
//   a: "h",
//   b: "q",
//   c: "e",
//   d: "k",
//   e: "r",
//   f: "v",
//   g: "y",
//   h: "b",
//   i: "j",
//   j: "z",
//   k: "m",
//   l: "o",
//   m: "u",
//   n: "s",
//   o: "g",
//   p: "x",
//   q: "l",
//   r: "p",
//   s: "f",
//   t: "d",
//   u: "n",
//   v: "t",
//   w: "a",
//   x: "c",
//   y: "w",
//   z: "i"
// };

// function Generate() {
//   const [qrCodeValue, setQrCodeValue] = useState("");

//   const transformValue = (value) => {
//     let transformedValue = "";
//     for (let i = 0; i < value.length; i++) {
//       const char = value[i].toUpperCase();
//       if (mappingTable.hasOwnProperty(char)) {
//         transformedValue += mappingTable[char];
//       }
//       console.log(transformedValue);
//     }
//     return transformedValue;
//     // console.log(qrCodeValue)
//   };

//   const downloadQRCode = () => {
//     const svg = document.querySelector("svg");
//     const serializer = new XMLSerializer();
//     const svgString = serializer.serializeToString(svg);

//     const canvas = document.createElement("canvas");
//     canvas.width = 500;
//     canvas.height = 500;

//     const ctx = canvas.getContext("2d");
//     const img = new Image();
//     img.src = "data:image/svg+xml;base64," + btoa(svgString);
//     img.onload = () => {
//       // Draw white card template
//       ctx.fillStyle = "#e8dff5";

//       // #e8dff5 ST1A violet
//       // #fce1e4 ST1B pink
//       // #fcf4dd ST1C yellow
//       // #ddedea ST1D mint
//       // #daeaf6 ST2A  blue
//       ctx.fillRect(0, 0, canvas.width, canvas.height);

//       // Draw QR code in center
//       const qrSize = Math.min(canvas.width, canvas.height) * 0.7;
//       const qrX = (canvas.width - qrSize) / 2;
//       const qrY = (canvas.height - qrSize) / 2;
//       ctx.drawImage(img, qrX, qrY, qrSize, qrSize);

//       const name = "PUREZA, XEDRICK";
//           ctx.font = "bold 24px sans-serif";
//           ctx.textAlign = "center";
//           ctx.fillStyle = "#333333";
//           ctx.fillText(name, canvas.width / 2, qrY + qrSize + 40);


//       // Download image
//       const link = document.createElement("a");
//       link.download = "qrcode.png";
//       link.href = canvas.toDataURL("image/png");
//       link.click();
//     };
//   };

//   return (
//     <div className="bg-gray-100 flex flex-col items-center justify-center h-screen">
//       <div className="bg-white rounded-lg shadow-md p-6 w-full max-w-md">
//         <h1 className="text-3xl font-semibold mb-4">Generate QR Code</h1>
//         <div className="flex items-center justify-center mb-6">
//           {qrCodeValue !== "" && (
//             <div className="bg-white rounded-lg shadow-md p-6">
//               <QRCode value={transformValue(qrCodeValue)} />
//               <button
//                 className="mt-4 px-4 py-2 rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none"
//                 onClick={downloadQRCode}
//               >
//                 Save to Device
//               </button>
//             </div>
//           )}
//         </div>
//         <label className="text-lg font-semibold">QR Code Value:</label>
//         <input
//           className="w-full border border-gray-300 rounded-md p-2 mt-2 mb-4"
//           onChange={(e) => {
//             setQrCodeValue(e.target.value);
//           }}
//         />
//       </div>
//     </div>
//   );
// }

// export default Generate;








































// import React, { useState } from "react";
// import QRCode from "react-qr-code";

// const mappingTable = {
//   0: "Z",
//   1: "X",
//   2: "C",
//   3: "V",
//   4: "B",
//   5: "N",
//   6: "M",
//   "-": "-",
//   8: "L",
//   9: "K",
//   7: "D",
//   A: "Q",
//   B: "R",
//   C: "E",
//   D: "F",
//   E: "G",
//   F: "H",
//   G: "I",
//   H: "J",
//   I: "P",
//   J: "S",
//   K: "U",
//   L: "Y",
//   M: "A",
//   N: "O",
//   O: "W",
//   P: "T",
//   Q: "1",
//   R: "2",
//   S: "3",
//   T: "4",
//   U: "5",
//   V: "6",
//   W: "7",
//   X: "8",
//   Y: "9",
//   Z: "0",
// };

// function Generate() {
//   const [qrCodeValue, setQrCodeValue] = useState("");

//   const transformValue = (value) => {
//     let transformedValue = "";
//     for (let i = 0; i < value.length; i++) {
//       const char = value[i].toUpperCase();
//       if (mappingTable.hasOwnProperty(char)) {
//         transformedValue += mappingTable[char];
//       }
//       console.log(transformedValue);
//     }
//     return transformedValue;
//     // console.log(qrCodeValue)
//   };

//   const downloadQRCode = () => {
//     const svg = document.querySelector("svg");
//     const serializer = new XMLSerializer();
//     const svgString = serializer.serializeToString(svg);

//     const canvas = document.createElement("canvas");
//     canvas.width = 500;
//     canvas.height = 500;

//     const ctx = canvas.getContext("2d");
//     const img = new Image();
//     img.src = "data:image/svg+xml;base64," + btoa(svgString);
//     img.onload = () => {
//       // Draw white card template
//       ctx.fillStyle = "#ffffff";
//       ctx.fillRect(0, 0, canvas.width, canvas.height);

//       // Draw QR code in center
//       const qrSize = Math.min(canvas.width, canvas.height) * 0.7;
//       const qrX = (canvas.width - qrSize) / 2;
//       const qrY = (canvas.height - qrSize) / 2;
//       ctx.drawImage(img, qrX, qrY, qrSize, qrSize);

//       const name = "PASAGDAN, RENZ";
//           ctx.font = "bold 24px sans-serif";
//           ctx.textAlign = "center";
//           ctx.fillStyle = "#333333";
//           ctx.fillText(qrCodeValue, canvas.width / 2, qrY + qrSize + 40);


//       // Download image
//       const link = document.createElement("a");
//       link.download = "qrcode.png";
//       link.href = canvas.toDataURL("image/png");
//       link.click();
//     };
//   };

//   return (
//     <div className="bg-gray-100 flex flex-col items-center justify-center h-screen">
//       <div className="bg-white rounded-lg shadow-md p-6 w-full max-w-md">
//         <h1 className="text-3xl font-semibold mb-4">Generate QR Code</h1>
//         <div className="flex items-center justify-center mb-6">
//           {qrCodeValue !== "" && (
//             <div className="bg-white rounded-lg shadow-md p-6">
//               <QRCode value={transformValue(qrCodeValue)} />
//               <button
//                 className="mt-4 px-4 py-2 rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none"
//                 onClick={downloadQRCode}
//               >
//                 Save to Device
//               </button>
//             </div>
//           )}
//         </div>
//         <label className="text-lg font-semibold">QR Code Value:</label>
//         <input
//           className="w-full border border-gray-300 rounded-md p-2 mt-2 mb-4"
//           onChange={(e) => {
//             setQrCodeValue(e.target.value);
//           }}
//         />
//       </div>
//     </div>
//   );
// }

// export default Generate;












// import React, { useState } from "react";
// import QRCode from "react-qr-code";

// function Generate() {
//   const [qrCodeValue, setQrCodeValue] = useState("");

//   return (
//     <div className="bg-white flex flex-col items-center">
//       <div>Generate QR</div>
//       {qrCodeValue != "" && <QRCode value={qrCodeValue} />}
//       <input className="text-black"
//         onChange={(e) => {
//           setQrCodeValue(e.target.value);
//         }}
//       />
//     </div>
//   );
// }

// export default Generate;

// import React, { useState } from "react";
// import QRCode from "react-qr-code";

// const mappingTable = {
//   "0": "Z",
//   "1": "X",
//   "2": "C",
//   "3": "V",
//   "4": "B",
//   "5": "N",
//   "6": "M",
//   "-": "-",
//   "8": "L",
//   "9": "K",
//   "7": "D",
//   "A": "Q",
//   "B": "R",
//   "C": "E",
//   "D": "F",
//   "E": "G",
//   "F": "H",
//   "G": "I",
//   "H": "J",
//   "I": "P",
//   "J": "S",
//   "K": "U",
//   "L": "Y",
//   "M": "A",
//   "N": "O",
//   "O": "W",
//   "P": "T",
//   "Q": "1",
//   "R": "2",
//   "S": "3",
//   "T": "4",
//   "U": "5",
//   "V": "6",
//   "W": "7",
//   "X": "8",
//   "Y": "9",
//   "Z": "0"
// };

// function Generate() {
//   const [qrCodeValue, setQrCodeValue] = useState("");

//   const transformValue = (value) => {
//     let transformedValue = "";
//     for (let i = 0; i < value.length; i++) {
//       const char = value[i].toUpperCase();
//       if (mappingTable.hasOwnProperty(char)) {
//         transformedValue += mappingTable[char];
//       }
//       console.log(transformedValue)
//     }
//     return transformedValue;
//     // console.log(qrCodeValue)
//   };

// const downloadQRCode = () => {
//   const svg = document.querySelector("svg");
//   const serializer = new XMLSerializer();
//   const svgString = serializer.serializeToString(svg);

//   const canvas = document.createElement("canvas");
//   canvas.width = 500;
//   canvas.height = 500;

//   const ctx = canvas.getContext("2d");
//   const img = new Image();
//   img.src = "data:image/svg+xml;base64," + btoa(svgString);
//   img.onload = () => {
//     // Draw white card template
//     ctx.fillStyle = "#ffffff";
//     ctx.fillRect(0, 0, canvas.width, canvas.height);

//     // Draw QR code in center
//     const qrSize = Math.min(canvas.width, canvas.height) * 0.7;
//     const qrX = (canvas.width - qrSize) / 2;
//     const qrY = (canvas.height - qrSize) / 2;
//     ctx.drawImage(img, qrX, qrY, qrSize, qrSize);

//     // Add name label
//     ctx.font = "bold 24px sans-serif";
//     ctx.textAlign = "center";
//     ctx.fillStyle = "#333333";
//     ctx.fillText(qrCodeValue, canvas.width / 2, qrY + qrSize + 40);

//     // Download image
//     const link = document.createElement("a");
//     link.download = "qrcode.png";
//     link.href = canvas.toDataURL("image/png");
//     link.click();
//   };
// };

//   return (
//     <div className="bg-gray-100 flex flex-col items-center justify-center h-screen">
//       <div className="bg-white rounded-lg shadow-md p-6 w-full max-w-md">
//         <h1 className="text-3xl font-semibold mb-4">Generate QR Code</h1>
//         <div className="flex items-center justify-center mb-6">
//           {qrCodeValue !== "" && (
//             <div className="bg-white rounded-lg shadow-md p-6">
//               <QRCode value={transformValue(qrCodeValue)} />
//               <button
//                 className="mt-4 px-4 py-2 rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none"
//                 onClick={downloadQRCode}
//               >
//                 Save to Device
//               </button>
//             </div>
//           )}
//         </div>
//         <label className="text-lg font-semibold">QR Code Value:</label>
//         <input
//           className="w-full border border-gray-300 rounded-md p-2 mt-2 mb-4"
//           onChange={(e) => {
//             setQrCodeValue(e.target.value);
//           }}
//         />
//       </div>
//     </div>
//   );

// }

// export default Generate;
