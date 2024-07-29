'use client'
// Import statements
import successSound from "./success.wav";
import errorSound from "./error.wav";
import alreadyScannedSound from "./alreadyscanned.wav";

import in1 from "./in/good_morning_2.wav";
import in2 from "./in/good_morning.wav";
import in3 from "./in/great_to_see_you_again.wav";
import in4 from "./in/have_a_great_day.wav";
import in5 from "./in/hello_there.wav";
import in6 from "./in/hi_there.wav";
import in7 from "./in/well_hello.wav";
import in8 from "./in/you_look_great_today.wav";

import out1 from "./out/bye.wav";
import out2 from "./out/dont_forget_your_homework.wav";
import out3 from "./out/get_home_safe.wav";
import out4 from "./out/good_bye.wav";
import out5 from "./out/great_job_today.wav";
import out6 from "./out/see_you_around.wav";
import out7 from "./out/see_you_again.wav";
import out8 from "./out/stay_safe.wav";
import out9 from "./out/until_next_time.wav";

import done1 from "./completed/scan_completed.wav";
import done2 from "./completed/scan_done.wav";
import done3 from "./completed/scan_finished.wav";

// Preload sounds
const preloadSound = (src) => {
  const audio = new Audio(src);
  audio.load();
  return audio;
};

const successSoundObj = preloadSound(successSound);
const errorSoundObj = preloadSound(errorSound);
const alreadyScannedSoundObj = preloadSound(alreadyScannedSound);

const in1Obj = preloadSound(in1);
const in2Obj = preloadSound(in2);
const in3Obj = preloadSound(in3);
const in4Obj = preloadSound(in4);
const in5Obj = preloadSound(in5);
const in6Obj = preloadSound(in6);
const in7Obj = preloadSound(in7);
const in8Obj = preloadSound(in8);

const out1Obj = preloadSound(out1);
const out2Obj = preloadSound(out2);
const out3Obj = preloadSound(out3);
const out4Obj = preloadSound(out4);
const out5Obj = preloadSound(out5);
const out6Obj = preloadSound(out6);
const out7Obj = preloadSound(out7);
const out8Obj = preloadSound(out8);
const out9Obj = preloadSound(out9);

const done1Obj = preloadSound(done1);
const done2Obj = preloadSound(done2);
const done3Obj = preloadSound(done3);

// Message arrays
const checkInMessages = [in1Obj, in2Obj, in3Obj, in4Obj, in5Obj, in6Obj, in7Obj, in8Obj];
const checkOutMessages = [out1Obj, out2Obj, out3Obj, out4Obj, out5Obj, out6Obj, out7Obj, out8Obj, out9Obj];
const confirmationMessages = [done1Obj, done2Obj, done3Obj];

// Utility function to play a sound
const playSound = (audioObj, callback) => {
  audioObj.currentTime = 0;  // Reset to start in case it was previously played
  audioObj.play();
  if (callback) {
    audioObj.addEventListener('ended', callback, { once: true });
  }
};

// Function to play a random message sound and then play a random confirmation sound
export const playRandomMessageSound = (messages) => {
  const randomIndex = Math.floor(Math.random() * messages.length);
  const randomSound = messages[randomIndex];
  playSound(randomSound, () => playRandomConfirmation(confirmationMessages));
};

// Function to play a random confirmation sound
export const playRandomConfirmation = (messages) => {
  const randomIndex = Math.floor(Math.random() * messages.length);
  const randomSound = messages[randomIndex];
  playSound(randomSound);
};

// Exports
export {
  successSoundObj as successSound,
  errorSoundObj as errorSound,
  alreadyScannedSoundObj as alreadyScannedSound,
  checkInMessages,
  checkOutMessages,
  playSound,
  confirmationMessages
};


// // Import statements
// import successSound from "./success.wav";
// import errorSound from "./error.wav";
// import alreadyScannedSound from "./alreadyscanned.wav";

// import out1 from "./out/bye.wav";
// import out2 from "./out/dont_forget_your_homework.wav";
// import out3 from "./out/get_home_safe.wav";
// import out4 from "./out/good_bye.wav";
// import out5 from "./out/great_job_today.wav";
// import out6 from "./out/see_you_around.wav";
// import out7 from "./out/see_you_again.wav";
// import out8 from "./out/stay_safe.wav";
// import out9 from "./out/until_next_time.wav";

// import done1 from "./completed/scan_completed.wav";
// import done2 from "./completed/scan_done.wav";
// import done3 from "./completed/scan_finished.wav";

// // Message arrays
// const checkInMessages = [out1];
// const checkOutMessages = [out1, out2, out3, out4, out5, out6, out7, out8, out9];

// const confirmationMessages = [done1, done2, done3];

// // Utility function to play a sound
// const playSound = (sound, callback) => {
//   const audio = new Audio(sound);
//   audio.play();
//   if (callback) {
//     audio.addEventListener('ended', callback);
//   }
// };

// // Function to play a random message sound and then play a random confirmation sound
// export const playRandomMessageSound = (messages) => {
//   const randomIndex = Math.floor(Math.random() * messages.length);
//   const randomSound = messages[randomIndex];
//   playSound(randomSound, () => playRandomConfirmation(confirmationMessages));
// };

// // Function to play a random confirmation sound
// export const playRandomConfirmation = (messages) => {
//   const randomIndex = Math.floor(Math.random() * messages.length);
//   const randomSound = messages[randomIndex];
//   playSound(randomSound);
// };

// // Exports
// export {
//   successSound,
//   errorSound,
//   alreadyScannedSound,
//   checkInMessages,
//   checkOutMessages,
//   playSound,
//   confirmationMessages
// };


// // MessagePlayer.js
// // import in1 from "./in/complete.wav";
// import successSound from "./success.wav";
// import errorSound from "./error.wav";
// import alreadyScannedSound from "./alreadyscanned.wav";

// import out1 from "./out/bye.wav";
// import out2 from "./out/dont_forget_your_homework.wav";
// import out3 from "./out/get_home_safe.wav";
// import out4 from "./out/good_bye.wav";
// import out5 from "./out/great_job_today.wav";
// import out6 from "./out/see you around.wav";
// import out7 from "./out/see_you_again.wav";
// import out8 from "./out/stay_safe.wav";
// import out9 from "./out/until_next_time.wav";


// import done1 from "./completed/scan_completed.wav";
// import done2 from "./completed/scan_done.wav";
// import done3 from "./completed/scan_finished.wav";

// // Message arrays
// const checkInMessages = [out1];
// const checkOutMessages = [out1, out2, out3, out4, out5, out6, out7, out8, out9];

// const confirmationMessages = [done1, done2, done3];

// // Utility function to play a sound
// const playSound = (sound) => {
//   const audio = new Audio(sound);
//   audio.play();
// };

// // Function to play a random message sound
// export const playRandomMessageSound = (messages) => {
//   const randomIndex = Math.floor(Math.random() * messages.length);
//   const randomSound = messages[randomIndex];
//   playSound(randomSound);
// };

// export const playRandomConfirmation = (messages) => {
//   const randomIndex = Math.floor(Math.random() * messages.length);
//   const randomSound = messages[randomIndex];
//   playSound(randomSound);
// };


// export {
//   successSound,
//   errorSound,
//   alreadyScannedSound,
//   checkInMessages,
//   checkOutMessages,
//   playSound,
//   confirmationMessages
// };
