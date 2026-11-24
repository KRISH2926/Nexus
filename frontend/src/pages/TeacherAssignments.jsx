import React, { useEffect, useState } from "react";
import axios from "axios";
import API_BASE from "../services/apiBase";

const TeacherAssignments = () => {
  const [assignments, setAssignments] = useState([]);
  const [selectedAssignment, setSelectedAssignment] =
    useState(null);
  const [results, setResults] = useState(null);

  const token = localStorage.getItem("token");

  useEffect(() => {
    fetchAssignments();
  }, []);

  const fetchAssignments = async () => {
    try {
      const res = await axios.get(
        `${API_BASE}/assignment/teacher`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setAssignments(res.data.assignments);
    } catch (error) {
      console.error(error);
    }
  };

  const fetchResults = async (
    assignmentId
  ) => {
    try {
      const res = await axios.get(
        `${API_BASE}/assignment/results/${assignmentId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setResults(res.data);
      setSelectedAssignment(
        res.data.assignment
      );
    } catch (error) {
      console.error(error);
      alert(
        error.response?.data?.message ||
          "Failed to fetch results"
      );
    }
  };

  return (
  <div className="min-h-screen bg-gray-100 p-6">

    <div className="flex justify-between items-center mb-8">

      <h1 className="text-3xl font-bold text-gray-800">
        Assignment Analytics
      </h1>

      <button
        onClick={() =>
          window.location.href =
            "/teacher/create-assignment"
        }
        className="bg-green-600 hover:bg-green-700 text-white px-5 py-2 rounded-lg shadow"
      >
        + Create Assignment
      </button>

    </div>

    {!selectedAssignment ? (

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">

        {assignments.map(
          (assignment) => (

            <div
              key={assignment._id}
              className="bg-white p-6 rounded-2xl shadow hover:shadow-lg transition"
            >

              <h2 className="text-xl font-bold text-gray-800">
                {assignment.assignmentName}
              </h2>

              <p className="text-gray-500 mt-3">
                Deadline
              </p>

              <p className="font-medium">
                {new Date(
                  assignment.deadline
                ).toLocaleString()}
              </p>

              <button
                onClick={() =>
                  fetchResults(
                    assignment._id
                  )
                }
                className="mt-5 w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg"
              >
                View Results
              </button>

            </div>

          )
        )}

      </div>

    ) : (

      <div>

        <button
          onClick={() => {
            setSelectedAssignment(null);
            setResults(null);
          }}
          className="mb-6 bg-gray-700 hover:bg-gray-800 text-white px-4 py-2 rounded-lg"
        >
          ← Back
        </button>

        <div className="bg-white p-6 rounded-2xl shadow mb-6">

          <h2 className="text-2xl font-bold mb-6">
            {selectedAssignment.assignmentName}
          </h2>

          <div className="grid md:grid-cols-4 gap-4">

            <div className="bg-blue-100 p-5 rounded-xl">
              <h3>Total Students</h3>
              <p className="text-3xl font-bold">
                {results.analytics.totalStudents}
              </p>
            </div>

            <div className="bg-green-100 p-5 rounded-xl">
              <h3>Submitted</h3>
              <p className="text-3xl font-bold">
                {results.analytics.submittedCount}
              </p>
            </div>

            <div className="bg-red-100 p-5 rounded-xl">
              <h3>Pending</h3>
              <p className="text-3xl font-bold">
                {results.analytics.pendingCount}
              </p>
            </div>

            <div className="bg-indigo-100 p-5 rounded-xl">
              <h3>Submission Rate</h3>
              <p className="text-3xl font-bold">
                {results.analytics.totalStudents
                  ? Math.round(
                      (
                        results.analytics.submittedCount /
                        results.analytics.totalStudents
                      ) * 100
                    )
                  : 0}
                %
              </p>
            </div>

          </div>

          <div className="grid md:grid-cols-3 gap-4 mt-5">

            <div className="bg-yellow-100 p-5 rounded-xl">
              <h3>Highest Score</h3>
              <p className="text-3xl font-bold">
                {results.analytics.highestScore}
              </p>
            </div>

            <div className="bg-purple-100 p-5 rounded-xl">
              <h3>Average Score</h3>
              <p className="text-3xl font-bold">
                {results.analytics.averageScore}
              </p>
            </div>

            <div className="bg-orange-100 p-5 rounded-xl">
              <h3>Lowest Score</h3>
              <p className="text-3xl font-bold">
                {results.analytics.lowestScore}
              </p>
            </div>

          </div>

        </div>

        <div className="grid lg:grid-cols-2 gap-6">

          <div className="bg-white rounded-2xl shadow overflow-hidden">

            <div className="bg-green-600 text-white px-6 py-4">
              <h3 className="text-xl font-bold">
                Submitted Students (
                {results.submittedStudents.length}
                )
              </h3>
            </div>

            <div className="overflow-x-auto">

              <table className="w-full">

                <thead className="bg-gray-100">

                  <tr>
                    <th className="text-left p-4">
                      Roll No
                    </th>

                    <th className="text-left p-4">
                      Name
                    </th>

                    <th className="text-left p-4">
                      Score
                    </th>
                  </tr>

                </thead>

                <tbody>

                  {results.submittedStudents.length === 0 ? (

                    <tr>
                      <td
                        colSpan="3"
                        className="text-center p-6 text-gray-500"
                      >
                        No submissions yet
                      </td>
                    </tr>

                  ) : (

                    results.submittedStudents.map(
                      (student) => (

                        <tr
                          key={student._id}
                          className="border-b hover:bg-gray-50"
                        >

                          <td className="p-4">
                            {student.rollNo}
                          </td>

                          <td className="p-4 font-medium">
                            {student.name}
                          </td>

                          <td className="p-4">
                            <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full">
                              {student.score}
                            </span>
                          </td>

                        </tr>

                      )
                    )

                  )}

                </tbody>

              </table>

            </div>

          </div>

          <div className="bg-white rounded-2xl shadow overflow-hidden">

            <div className="bg-red-600 text-white px-6 py-4">
              <h3 className="text-xl font-bold">
                Pending Students (
                {results.pendingStudents.length}
                )
              </h3>
            </div>

            <div className="overflow-x-auto">

              <table className="w-full">

                <thead className="bg-gray-100">

                  <tr>
                    <th className="text-left p-4">
                      Roll No
                    </th>

                    <th className="text-left p-4">
                      Name
                    </th>
                  </tr>

                </thead>

                <tbody>

                  {results.pendingStudents.length === 0 ? (

                    <tr>
                      <td
                        colSpan="2"
                        className="text-center p-6 text-gray-500"
                      >
                        Everybody submitted 🎉
                      </td>
                    </tr>

                  ) : (

                    results.pendingStudents.map(
                      (student) => (

                        <tr
                          key={student._id}
                          className="border-b hover:bg-gray-50"
                        >

                          <td className="p-4">
                            {student.rollNo}
                          </td>

                          <td className="p-4 font-medium">
                            {student.name}
                          </td>

                        </tr>

                      )
                    )

                  )}

                </tbody>

              </table>

            </div>

          </div>

        </div>

      </div>

    )}

  </div>
);
};
export default TeacherAssignments;