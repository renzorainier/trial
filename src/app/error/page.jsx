// components/ErrorPage.jsx
import React from 'react';

const ErrorPage = () => {
  return (
    <div className="flex min-h-screen bg-gray-900 items-center justify-center">
      <div className="bg-red-700 p-8 rounded-lg shadow-lg text-center text-white max-w-md">
        <h1 className="text-4xl font-bold mb-4">Unauthorized Access</h1>

        <p className="text-sm text-gray-300">
          Your activities are monitored.
        </p>
        <p className="text-sm text-gray-300">
          Breaching security will have consequences.
        </p>
      </div>
    </div>
  );
};

export default ErrorPage;
