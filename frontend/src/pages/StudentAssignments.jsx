
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getStudentAssignments } from "../services/api";

const StudentAssignments = () => {
  const [assignments, setAssignments] = useState([]);

  useEffect(() => {
    fetchAssignments();
  }, []);

  const fetchAssignments = async () => {
    try {
      const { data } = await getStudentAssignments();
      setAssignments(data.assignments || []);
    } catch (error) {
      console.error(error);
    }
  };

  const pendingCount = assignments.filter(
    (a) => a.status === "pending"
  ).length;

  const submittedCount = assignments.filter(
    (a) => a.status === "submitted"
  ).length;

  const missedCount = assignments.filter(
    (a) => a.status === "missed"
  ).length;

  return (
    <div className="min-h-screen bg-gray-100 p-6">

      {/* HEADER */}

      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-800">
          My Assignments
        </h1>

        <p className="text-gray-500 mt-2">
          Track your assignments and scores
        </p>
      </div>

      {/* STATS */}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">

        <div className="bg-blue-500 text-white p-6 rounded-2xl shadow">
          <p className="text-sm">Pending Assignments</p>

          <h2 className="text-4xl font-bold mt-2">
            {pendingCount}
          </h2>
        </div>

        <div className="bg-green-500 text-white p-6 rounded-2xl shadow">
          <p className="text-sm">Submitted Assignments</p>

          <h2 className="text-4xl font-bold mt-2">
            {submittedCount}
          </h2>
        </div>

        <div className="bg-red-500 text-white p-6 rounded-2xl shadow">
          <p className="text-sm">Missed Assignments</p>

          <h2 className="text-4xl font-bold mt-2">
            {missedCount}
          </h2>
        </div>

      </div>

      {/* NO ASSIGNMENTS */}

      {assignments.length === 0 ? (

        <div className="bg-white rounded-2xl shadow p-10 text-center">

          <div className="text-6xl mb-4">
            🎉
          </div>

          <h2 className="text-2xl font-bold text-gray-700">
            You're all caught up!
          </h2>

          <p className="text-gray-500 mt-2">
            No assignments available right now.
          </p>

        </div>

      ) : (

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {assignments.map((assignment) => {

            let topBarClass =
              "bg-blue-600 px-6 py-4 text-white flex justify-between items-center";

            if (assignment.status === "submitted") {
              topBarClass =
                "bg-green-600 px-6 py-4 text-white flex justify-between items-center";
            }

            if (assignment.status === "missed") {
              topBarClass =
                "bg-red-600 px-6 py-4 text-white flex justify-between items-center";
            }

            return (
              <div
                key={assignment._id}
                className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition"
              >

                {/* TOP BAR */}

                <div className={topBarClass}>

                  <h2 className="text-xl font-bold">
                    {assignment.assignmentName}
                  </h2>

                  <span className="bg-white text-black text-xs px-3 py-1 rounded-full font-semibold">

                    {assignment.status === "submitted"
                      ? "✅ Submitted"
                      : assignment.status === "missed"
                      ? "❌ Missed"
                      : "📝 Pending"}

                  </span>

                </div>

                {/* CONTENT */}

                <div className="p-6">

                  <div className="space-y-3">

                    <p>
                      <span className="font-semibold">
                        Subject:
                      </span>{" "}
                      {assignment.subject?.name || "N/A"}
                    </p>

                    <p>
                      <span className="font-semibold">
                        Deadline:
                      </span>{" "}
                      {new Date(
                        assignment.deadline
                      ).toLocaleString()}
                    </p>

                    <p>
                      <span className="font-semibold">
                        Total Marks:
                      </span>{" "}
                      {assignment.totalMarks}
                    </p>

                  </div>

                  {assignment.status === "submitted" && (
                    <div className="mt-5 bg-green-50 border border-green-200 rounded-lg p-4">

                      <p className="font-semibold text-green-700">
                        Score
                      </p>

                      <p className="text-2xl font-bold text-green-700">
                        {assignment.score}/
                        {assignment.totalMarks}
                      </p>

                    </div>
                  )}

                  {assignment.status === "pending" && (
                    <Link
                      to={`/student/attempt/${assignment._id}`}
                      className="block text-center mt-6 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-semibold"
                    >
                      🚀 Start Assignment
                    </Link>
                  )}

                  {assignment.status === "submitted" && (
                    <div className="mt-6 text-green-600 font-semibold">
                      Assignment submitted successfully
                    </div>
                  )}

                  {assignment.status === "missed" && (
                    <div className="mt-6 text-red-600 font-semibold">
                      Deadline has passed
                    </div>
                  )}

                </div>

              </div>
            );
          })}

        </div>

      )}

    </div>
  );
};

export default StudentAssignments;

