import { useState } from "react";
import API from "../services/api";

export default function GatepassForm() {
  const [date, setDate] = useState("");
  const [reason, setReason] = useState("");

  const submitRequest = async (e) => {
    e.preventDefault();

    try {
      const studentId = localStorage.getItem("id");

      await API.post("/gatepass/create", {
        student: studentId,
        reason,
        date
      });

      alert("Gatepass request sent successfully ✔");

      setDate("");
      setReason("");

    } catch (err) {
      alert(err.response?.data?.message || "Error sending request");
      console.log(err);
    }
  };

  return (
    <div className="p-4 bg-white shadow rounded w-full max-w-md">

      <h2 className="text-xl font-bold mb-4">
        Request Gatepass
      </h2>

      <form onSubmit={submitRequest}>

        {/* SINGLE DATE */}
        <input
          type="date"
          className="w-full border p-2 rounded mb-3"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />

        {/* REASON */}
        <textarea
          className="w-full border p-2 rounded mb-3"
          placeholder="Reason for gatepass..."
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />

        <button className="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700">
          Submit Request
        </button>

      </form>

    </div>
  );
}