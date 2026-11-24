import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  getStudentAssignments,
  submitAssignment,
} from "../services/api";

const AttemptAssignment = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [assignment, setAssignment] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [currentQuestion, setCurrentQuestion] =
    useState(0);

  useEffect(() => {
    fetchAssignment();
  }, []);

  const fetchAssignment = async () => {
    try {
      const { data } =
        await getStudentAssignments();

      const selectedAssignment =
        data.assignments.find(
          (assignment) =>
            assignment._id === id
        );

      setAssignment(selectedAssignment);
    } catch (error) {
      console.error(error);
    }
  };

  const handleOptionSelect = (
    questionIndex,
    option
  ) => {
    const filteredAnswers =
      answers.filter(
        (answer) =>
          answer.questionIndex !==
          questionIndex
      );

    filteredAnswers.push({
      questionIndex,
      selectedAnswer: option,
    });

    setAnswers(filteredAnswers);
  };

  const getSelectedAnswer = (
    questionIndex
  ) => {
    const answer = answers.find(
      (answer) =>
        answer.questionIndex ===
        questionIndex
    );

    return answer
      ? answer.selectedAnswer
      : null;
  };

  const handleSubmit = async () => {
    const confirmSubmit =
      window.confirm(
        "Are you sure you want to submit?"
      );

    if (!confirmSubmit) return;

    try {
      const { data } =
        await submitAssignment({
          assignmentId:
            assignment._id,
          answers,
        });

      alert(
        `🎉 Assignment Submitted!\n\nScore: ${data.score}/${assignment.totalMarks}`
      );

      navigate(
        "/student/assignments"
      );
    } catch (error) {
      console.error(error);

      alert(
        error?.response?.data
          ?.message ||
          "Failed to submit assignment"
      );
    }
  };

  if (!assignment) {
    return (
      <div className="p-8 text-center">
        Loading Assignment...
      </div>
    );
  }

  const question =
    assignment.questions[
      currentQuestion
    ];

  const progress =
    ((currentQuestion + 1) /
      assignment.questions.length) *
    100;

  return (
    <div className="min-h-screen bg-gray-100 p-6">

      <div className="max-w-5xl mx-auto">

        <div className="bg-white rounded-xl shadow p-6 mb-6">

          <h1 className="text-3xl font-bold">
            {
              assignment.assignmentName
            }
          </h1>

          <p className="text-gray-600 mt-2">
            Total Marks:
            {" "}
            {assignment.totalMarks}
          </p>

          <div className="mt-5">
            <div className="flex justify-between mb-2">
              <span>
                Progress
              </span>

              <span>
                Question{" "}
                {currentQuestion + 1}
                /
                {
                  assignment.questions
                    .length
                }
              </span>
            </div>

            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className="bg-blue-600 h-3 rounded-full"
                style={{
                  width: `${progress}%`,
                }}
              />
            </div>
          </div>

        </div>

        <div className="grid grid-cols-5 gap-2 mb-6">

          {assignment.questions.map(
            (_, index) => (
              <button
                key={index}
                onClick={() =>
                  setCurrentQuestion(
                    index
                  )
                }
                className={`p-2 rounded font-medium ${
                  currentQuestion ===
                  index
                    ? "bg-blue-600 text-white"
                    : getSelectedAnswer(
                        index
                      )
                    ? "bg-green-500 text-white"
                    : "bg-white border"
                }`}
              >
                Q{index + 1}
              </button>
            )
          )}

        </div>

        <div className="bg-white rounded-xl shadow p-6">

          <h2 className="text-xl font-semibold mb-6">
            Question{" "}
            {currentQuestion + 1}
          </h2>

          <p className="text-lg mb-6">
            {question.question}
          </p>

          <div className="space-y-3">

            {question.options.map(
              (
                option,
                optionIndex
              ) => {
                const selected =
                  getSelectedAnswer(
                    currentQuestion
                  ) === option;

                return (
                  <button
                    key={optionIndex}
                    onClick={() =>
                      handleOptionSelect(
                        currentQuestion,
                        option
                      )
                    }
                    className={`w-full text-left p-4 rounded-lg border transition ${
                      selected
                        ? "bg-blue-600 text-white border-blue-600"
                        : "bg-white hover:bg-gray-50"
                    }`}
                  >
                    {option}
                  </button>
                );
              }
            )}

          </div>

          <div className="flex justify-between mt-8">

            <button
              onClick={() =>
                setCurrentQuestion(
                  (prev) =>
                    Math.max(
                      prev - 1,
                      0
                    )
                )
              }
              disabled={
                currentQuestion === 0
              }
              className="bg-gray-500 text-white px-5 py-2 rounded disabled:opacity-50"
            >
              Previous
            </button>

            {currentQuestion ===
            assignment.questions
              .length -
              1 ? (
              <button
                onClick={
                  handleSubmit
                }
                className="bg-green-600 text-white px-6 py-2 rounded"
              >
                Submit Assignment
              </button>
            ) : (
              <button
                onClick={() =>
                  setCurrentQuestion(
                    (prev) =>
                      prev + 1
                  )
                }
                className="bg-blue-600 text-white px-5 py-2 rounded"
              >
                Next
              </button>
            )}

          </div>

        </div>

      </div>

    </div>
  );
};

export default AttemptAssignment;