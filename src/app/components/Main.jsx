import { useEffect } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '@/app/firebase/config';
import { useRouter } from 'next/navigation.js';
import { signOut } from 'firebase/auth';
import Scan from './Scan.jsx';

export default function Main() {
  const [user] = useAuthState(auth);
  const router = useRouter();
  const adminUID = 'ytv9sju3TWhFOtrQZrmkUBexU2C3'; // Admin UID

  useEffect(() => {
    const handleUserCheck = () => {
      const storedUser = JSON.parse(localStorage.getItem('user'));

      if (!user && !storedUser) {
        router.push('/sign-in');
        return;
      }

      if (user && user.uid !== adminUID) {
        console.error('Access denied. Only admin can access this.');
        router.push('/error'); // Redirect to error page for unauthorized access
        return;
      }

      if (user) {
        localStorage.setItem('user', JSON.stringify(user));
      }
    };

    handleUserCheck();
  }, [user, router]);

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      localStorage.removeItem('user');
      router.push('/sign-in');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <main className="flex min-h-screen flex-col bg-[#031525] justify-between">
      <button onClick={handleSignOut} className="self-end m-4 p-2 bg-red-600 text-white rounded">
        Sign Out
      </button>
      <Scan />
    </main>
  );
}


//simple working chuchu 25
// import { useEffect } from 'react';
// import { useAuthState } from 'react-firebase-hooks/auth';
// import { auth } from '@/app/firebase/config';
// import { useRouter } from 'next/navigation.js';
// // import YourComponent from './YourComponent'; // Import the component you want to render
// import Scan from "./Scan.jsx"


// export default function Main() {
//   const [user] = useAuthState(auth);
//   const router = useRouter();
//   const userSession = typeof window !== 'undefined' ? sessionStorage.getItem('user') : null;
//   const adminUID = 'ytv9sju3TWhFOtrQZrmkUBexU2C3'; // Admin UID

//   useEffect(() => {
//     const handleUserCheck = () => {
//       if (!user && !userSession) {
//         router.push('/sign-in');
//         return;
//       }

//       // Ensure only the admin UID can proceed
//       if (user && user.uid !== adminUID) {
//         console.error('Access denied. Only admin can access this.');
//         router.push('/error'); // Redirect to error page for unauthorized access
//         return;
//       }
//     };

//     handleUserCheck();
//   }, [user, userSession, router]);

//   return (
//     <main >
//       <Scan/>
//     </main>
//   );
// }
