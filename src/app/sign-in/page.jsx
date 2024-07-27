"use client";

import Image from "next/image";
import { useState, useEffect } from "react";
import { useSignInWithEmailAndPassword, useSignInWithGoogle } from "react-firebase-hooks/auth";
import { auth, googleAuthProvider } from "@/app/firebase/config";
import { useRouter } from "next/navigation";
import { AiFillEye, AiFillEyeInvisible } from "react-icons/ai"; // Make sure to install react-icons if you haven't already
import teen from "../img.png";

const SignIn = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [signInWithEmailAndPassword, user, loading, error] = useSignInWithEmailAndPassword(auth);
  const [signInWithGoogle, googleUser, googleLoading, googleError] = useSignInWithGoogle(auth);
  const router = useRouter();

  useEffect(() => {
    const savedUser = JSON.parse(localStorage.getItem("user"));

    if (savedUser) {
      signInWithEmailAndPassword(savedUser.email, savedUser.password);
    }
  }, [signInWithEmailAndPassword]);

  useEffect(() => {
    if (user || googleUser) {
      localStorage.setItem("user", JSON.stringify({ email, password, uid: user?.uid || googleUser?.uid }));
      router.push("/");
    }
  }, [user, googleUser, email, password, router]);

  const handleSignIn = async () => {
    try {
      await signInWithEmailAndPassword(email, password);
    } catch (e) {
      console.error(e);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      await signInWithGoogle();
    } catch (e) {
      console.error(e);
    }
  };

  const togglePasswordVisibility = () => {
    setPasswordVisible(!passwordVisible);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-r from-[#035172] to-[#0587be] p-4">
      <div className="bg-white rounded-lg shadow-lg flex flex-col md:flex-row w-full max-w-4xl">
        <div className="md:w-1/2 p-8 flex flex-col justify-center items-center bg-gradient-to-br from-gray-900 to-gray-800 text-white rounded-lg">
          <div>
            <Image src={teen} width="260" height="260" alt="/" />
          </div>
        </div>
        <div className="md:w-1/2 p-8 flex flex-col justify-center items-center">
          {error && <p className="text-red-500 mb-4">Error Logging in</p>}
          {googleError && <p className="text-red-500 mb-4 text-center">Error with Google Sign-In. Please make sure to use your school Gmail account.</p>}
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full p-3 mb-4 bg-gray-100 rounded border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#0587be]"
          />
          <div className="w-full mb-4 relative">
            <input
              type={passwordVisible ? "text" : "password"}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-3 bg-gray-100 rounded border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#0587be]"
            />  
            <button
              type="button"
              onClick={togglePasswordVisibility}
              className="absolute inset-y-0 right-3 flex items-center text-gray-600">
              {passwordVisible ? (
                <AiFillEyeInvisible size={24} />
              ) : (
                <AiFillEye size={24} />
              )}
            </button>
          </div>
          <button
            onClick={handleSignIn}
            className="w-full p-3 bg-[#035172] text-white rounded hover:bg-[#0587be] transition duration-300"
            disabled={loading}>
            {loading ? "Signing In..." : "Sign In"}
          </button>
          <button
            onClick={handleGoogleSignIn}
            className="w-full p-3 mt-4 bg-[#3aad42] text-white rounded hover:bg-[#55fa60] transition duration-300"
            disabled={googleLoading}>
            {googleLoading ? "Signing In with Google..." : "Sign In with Google"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SignIn;




//original from p1 25
// "use client";

// import Image from "next/image";
// import { useState, useEffect } from "react";
// import { useSignInWithEmailAndPassword, useSignInWithGoogle } from "react-firebase-hooks/auth";
// import { auth, googleAuthProvider } from "@/app/firebase/config";
// import { useRouter } from "next/navigation";
// import { AiFillEye, AiFillEyeInvisible } from "react-icons/ai"; // Make sure to install react-icons if you haven't already
// import teen from "../img.png";

// const SignIn = () => {
//   const [email, setEmail] = useState("");
//   const [password, setPassword] = useState("");
//   const [passwordVisible, setPasswordVisible] = useState(false);
//   const [signInWithEmailAndPassword, user, loading, error] = useSignInWithEmailAndPassword(auth);
//   const [signInWithGoogle, googleUser, googleLoading, googleError] = useSignInWithGoogle(auth);
//   const router = useRouter();

//   useEffect(() => {
//     const savedEmail = localStorage.getItem("email");
//     const savedPassword = localStorage.getItem("password");

//     if (savedEmail && savedPassword) {
//       signInWithEmailAndPassword(savedEmail, savedPassword);
//     }
//   }, [signInWithEmailAndPassword]);

//   useEffect(() => {
//     if (user || googleUser) {
//       localStorage.setItem("email", email);
//       localStorage.setItem("password", password);
//       sessionStorage.setItem("user", true);
//       router.push("/");
//     }
//   }, [user, googleUser, email, password, router]);

//   const handleSignIn = async () => {
//     try {
//       await signInWithEmailAndPassword(email, password);
//     } catch (e) {
//       console.error(e);
//     }
//   };

//   const handleGoogleSignIn = async () => {
//     try {
//       await signInWithGoogle();
//     } catch (e) {
//       console.error(e);
//     }
//   };

//   const togglePasswordVisibility = () => {
//     setPasswordVisible(!passwordVisible);
//   };

//   return (
//     <div className="min-h-screen flex items-center justify-center bg-gradient-to-r from-[#035172] to-[#0587be] p-4">
//       <div className="bg-white rounded-lg shadow-lg flex flex-col md:flex-row w-full max-w-4xl">
//         <div className="md:w-1/2 p-8 flex flex-col justify-center items-center bg-gradient-to-br from-gray-900 to-gray-800 text-white rounded-lg">
//           <div>
//             <Image src={teen} width="260" height="260" alt="/" />
//           </div>
//         </div>
//         <div className="md:w-1/2 p-8 flex flex-col justify-center items-center">
//           {error && <p className="text-red-500 mb-4">Error Logging in</p>}
//           {googleError && <p className="text-red-500 mb-4 text-center">Error with Google Sign-In. Please make sure to use your school Gmail account.</p>}
//           <input
//             type="email"
//             placeholder="Email"
//             value={email}
//             onChange={(e) => setEmail(e.target.value)}
//             className="w-full p-3 mb-4 bg-gray-100 rounded border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#0587be]"
//           />
//           <div className="w-full mb-4 relative">
//             <input
//               type={passwordVisible ? "text" : "password"}
//               placeholder="Password"
//               value={password}
//               onChange={(e) => setPassword(e.target.value)}
//               className="w-full p-3 bg-gray-100 rounded border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#0587be]"
//             />
//             <button
//               type="button"
//               onClick={togglePasswordVisibility}
//               className="absolute inset-y-0 right-3 flex items-center text-gray-600">
//               {passwordVisible ? (
//                 <AiFillEyeInvisible size={24} />
//               ) : (
//                 <AiFillEye size={24} />
//               )}
//             </button>
//           </div>
//           <button
//             onClick={handleSignIn}
//             className="w-full p-3 bg-[#035172] text-white rounded hover:bg-[#0587be] transition duration-300"
//             disabled={loading}>
//             {loading ? "Signing In..." : "Sign In"}
//           </button>
//           <button
//             onClick={handleGoogleSignIn}
//             className="w-full p-3 mt-4 bg-[#3aad42] text-white rounded hover:bg-[#55fa60] transition duration-300"
//             disabled={googleLoading}>
//             {googleLoading ? "Signing In with Google..." : "Sign In with Google"}
//           </button>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default SignIn;







// "use client";

// import Image from "next/image";
// import { useState, useEffect } from "react";
// import { useSignInWithEmailAndPassword } from "react-firebase-hooks/auth";
// import { auth } from "@/app/firebase/config";
// import { useRouter } from "next/navigation";
// import { AiFillEye, AiFillEyeInvisible } from "react-icons/ai"; // Make sure to install react-icons if you haven't already
// import teen from "../img.png";

// const SignIn = () => {
//   const [email, setEmail] = useState("");
//   const [password, setPassword] = useState("");
//   const [passwordVisible, setPasswordVisible] = useState(false);
//   const [signInWithEmailAndPassword, user, loading, error] =
//     useSignInWithEmailAndPassword(auth);
//   const router = useRouter();

//   useEffect(() => {
//     const savedEmail = localStorage.getItem("email");
//     const savedPassword = localStorage.getItem("password");

//     if (savedEmail && savedPassword) {
//       signInWithEmailAndPassword(savedEmail, savedPassword);
//     }
//   }, [signInWithEmailAndPassword]);

//   useEffect(() => {
//     if (user) {
//       localStorage.setItem("email", email);
//       localStorage.setItem("password", password);
//       sessionStorage.setItem("user", true);
//       router.push("/");
//     }
//   }, [user, email, password, router]);

//   const handleSignIn = async () => {
//     try {
//       await signInWithEmailAndPassword(email, password);
//     } catch (e) {
//       console.error(e);
//     }
//   };

//   const togglePasswordVisibility = () => {
//     setPasswordVisible(!passwordVisible);
//   };

//   return (
//     <div className="min-h-screen flex items-center justify-center bg-gradient-to-r from-[#035172] to-[#0587be] p-4">
//       <div className="bg-white rounded-lg shadow-lg flex flex-col md:flex-row w-full max-w-4xl">
//         <div className="md:w-1/2 p-8 flex flex-col justify-center items-center bg-gradient-to-br from-gray-900 to-gray-800 text-white rounded-lg">
//           <div>
//             <Image src={teen} width="260" height="260" alt="/" />
//           </div>
//         </div>
//         <div className="md:w-1/2 p-8 flex flex-col justify-center items-center">
//           {error && <p className="text-red-500 mb-4">Error Logging in</p>}
//           <input
//             type="email"
//             placeholder="Email"
//             value={email}
//             onChange={(e) => setEmail(e.target.value)}
//             className="w-full p-3 mb-4 bg-gray-100 rounded border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#0587be]"
//           />
//           <div className="w-full mb-4 relative">
//             <input
//               type={passwordVisible ? "text" : "password"}
//               placeholder="Password"
//               value={password}
//               onChange={(e) => setPassword(e.target.value)}
//               className="w-full p-3 bg-gray-100 rounded border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#0587be]"
//             />
//             <button
//               type="button"
//               onClick={togglePasswordVisibility}
//               className="absolute inset-y-0 right-3 flex items-center text-gray-600">
//               {passwordVisible ? (
//                 <AiFillEyeInvisible size={24} />
//               ) : (
//                 <AiFillEye size={24} />
//               )}
//             </button>
//           </div>
//           <button
//             onClick={handleSignIn}
//             className="w-full p-3 bg-[#035172] text-white rounded hover:bg-[#0587be] transition duration-300"
//             disabled={loading}>
//             {loading ? "Signing In..." : "Sign In"}
//           </button>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default SignIn;























// 'use client';

// import { useState, useEffect } from 'react';
// import { useSignInWithEmailAndPassword } from 'react-firebase-hooks/auth';
// import { auth } from '@/app/firebase/config';
// import { useRouter } from 'next/navigation';

// const SignIn = () => {
//   const [email, setEmail] = useState('');
//   const [password, setPassword] = useState('');
//   const [signInWithEmailAndPassword, user, loading, error] = useSignInWithEmailAndPassword(auth);
//   const router = useRouter();

//   useEffect(() => {
//     if (user) {
//       sessionStorage.setItem('user', true);
//       router.push('/');
//     }
//   }, [user, router]);

//   const handleSignIn = async () => {
//     try {
//       await signInWithEmailAndPassword(email, password);
//     } catch (e) {
//       console.error(e);
//     }
//   };

//   return (
//     <div className="min-h-screen flex items-center justify-center bg-white">
//       <div className="bg-gray-800 p-10 rounded-lg shadow-xl w-96">
//         <h1 className="text-white text-2xl mb-5">Sign In</h1>
//         {error && <p className="text-red-500 mb-4">Error Logging in</p>}
//         <input
//           type="email"
//           placeholder="Email"
//           value={email}
//           onChange={(e) => setEmail(e.target.value)}
//           className="w-full p-3 mb-4 bg-gray-700 rounded outline-none text-white placeholder-gray-500"
//         />
//         <input
//           type="password"
//           placeholder="Password"
//           value={password}
//           onChange={(e) => setPassword(e.target.value)}
//           className="w-full p-3 mb-4 bg-gray-700 rounded outline-none text-white placeholder-gray-500"
//         />
//         <button
//           onClick={handleSignIn}
//           className="w-full p-3 bg-[#0587be] rounded text-white hover:bg-indigo-500"
//           disabled={loading}
//         >
//           {loading ? 'Signing In...' : 'Sign In'}
//         </button>
//       </div>
//     </div>
//   );
// };

// export default SignIn;
