import { useState } from "react";
import Scan from "./Scan";

function PasswordProtectedContent() {
  const [password, setPassword] = useState("");
  const [showContent, setShowContent] = useState(false);

  const handlePasswordChange = (event) => {
    setPassword(event.target.value);
  };

  const handleFormSubmit = (event) => {
    event.preventDefault();
    // Replace this with your actual password check logic
    if (password === "") {  // For example purposes, use a simple password check
      setShowContent(true);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-r from-[#035172] to-[#0587be]">
      {!showContent ? (
        <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md">
          <form onSubmit={handleFormSubmit} className="space-y-4">
            <label
              htmlFor="password"
              className="block font-medium text-gray-700"
            >
              Enter password:
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={handlePasswordChange}
              className="border border-gray-300 rounded-lg px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="submit"
              className="w-full bg-blue-600 text-white rounded-lg px-4 py-2 hover:bg-blue-700 transition duration-300"
            >
              Submit
            </button>
          </form>
        </div>
      ) : (
        <div className="bg-white shadow-lg w-full">
          <Scan />
        </div>
      )}
    </div>
  );
}

export default PasswordProtectedContent;
