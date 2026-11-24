import React from "react";

export default function Loading({ message = "Loading..." }) {
  return (
    <div style={{
      height: "100vh",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      flexDirection: "column"
    }}>
      <div style={{
        width: "40px",
        height: "40px",
        border: "4px solid #ccc",
        borderTop: "4px solid blue",
        borderRadius: "50%",
        animation: "spin 1s linear infinite"
      }} />

      <p style={{ marginTop: "10px" }}>{message}</p>

      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
      </style>
    </div>
  );
}