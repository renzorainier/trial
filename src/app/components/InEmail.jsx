import React from 'react';

export const EmailTemplate = ({ studentName, title, message }) => {
  // Get current hour
  const currentHour = new Date().getHours();

  // Determine greeting based on current time
  const greeting = currentHour < 12 ? 'Good Morning' : currentHour < 18 ? 'Good Afternoon' : 'Good Evening';

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>{title}</h1>
      </div>
      <div style={styles.content}>
        <p style={styles.message}>
          {greeting},<br />
          {message}
        </p>
        <p style={styles.link}>
          To view attendance history, login to <a href="https://trialacc.vercel.app/" target="_blank" rel="noopener noreferrer">student portal</a>
        </p>
      </div>
      <div style={styles.footer}>
        <p style={styles.footerText}>
          This is a system generated email, do not reply.
        </p>
      </div>
    </div>
  );
};

const styles = {
  container: {
    fontFamily: 'Arial, sans-serif',
    maxWidth: '600px',
    margin: '20px auto',
    padding: '0',
    backgroundColor: '#ffffff',
    borderRadius: '10px',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
    border: '1px solid #e0e0e0',
    overflow: 'hidden',
  },
  header: {
    backgroundColor: '#4CAF50',
    color: '#ffffff',
    padding: '20px',
    borderRadius: '10px 10px 0 0',
    textAlign: 'center',
  },
  title: {
    fontSize: '28px',
    fontWeight: 'bold',
    margin: '0',
  },
  content: {
    padding: '20px',
    backgroundColor: '#ffffff',
  },
  message: {
    fontSize: '18px',
    lineHeight: '1.8',
    margin: '0 0 20px 0',
    color: '#333333',
  },
  link: {
    fontSize: '18px',
    lineHeight: '1.8',
    color: '#4CAF50',
  },
  footer: {
    padding: '15px 20px',
    backgroundColor: '#f9f9f9',
    borderRadius: '0 0 10px 10px',
    textAlign: 'center',
  },
  footerText: {
    fontSize: '14px',
    color: '#888888',
    margin: '0',
  },
};
