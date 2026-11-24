import React, { useState } from "react";
import { createAssignment } from "../services/api";

const CreateAssignment = () => {
  const [deadline, setDeadline] = useState("");

  const [questions, setQuestions] = useState([
    {
      question: "",
      options: ["", "", "", ""],
      correctAnswer: "",
    },
  ]);

  const handleQuestionChange = (
    index,
    field,
    value
  ) => {
    const updatedQuestions = [...questions];
    updatedQuestions[index][field] = value;
    setQuestions(updatedQuestions);
  };

  const handleOptionChange = (
    questionIndex,
    optionIndex,
    value
  ) => {
    const updatedQuestions = [...questions];

    updatedQuestions[questionIndex].options[
      optionIndex
    ] = value;

    setQuestions(updatedQuestions);
  };

  const addQuestion = () => {
    setQuestions([
      ...questions,
      {
        question: "",
        options: ["", "", "", ""],
        correctAnswer: "",
      },
    ]);
  };

  const publishAssignment = async () => {
    try {
      if (!deadline) {
        alert("Please select deadline");
        return;
      }

      const { data } = await createAssignment({
        deadline,
        questions,
      });

      alert("Assignment Published Successfully");

      console.log(data);

      setDeadline("");

      setQuestions([
        {
          question: "",
          options: ["", "", "", ""],
          correctAnswer: "",
        },
      ]);
    } catch (error) {
      console.error(error);

      alert(
        error?.response?.data?.message ||
          "Failed to publish assignment"
      );
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-5xl mx-auto bg-white rounded-xl shadow p-6">

        <h1 className="text-3xl font-bold mb-6">
          Create Assignment
        </h1>

        <div className="mb-6">
          <label className="block mb-2 font-medium">
            Deadline
          </label>

          <input
            type="datetime-local"
            value={deadline}
            onChange={(e) =>
              setDeadline(e.target.value)
            }
            className="border p-2 rounded w-full"
          />
        </div>

        {questions.map((question, index) => (
          <div
            key={index}
            className="border rounded-lg p-4 mb-6"
          >
            <h2 className="font-bold mb-3">
              Question {index + 1}
            </h2>

            <input
              type="text"
              placeholder="Enter Question"
              value={question.question}
              onChange={(e) =>
                handleQuestionChange(
                  index,
                  "question",
                  e.target.value
                )
              }
              className="border p-2 rounded w-full mb-4"
            />

            {question.options.map(
              (option, optionIndex) => (
                <input
                  key={optionIndex}
                  type="text"
                  placeholder={`Option ${
                    optionIndex + 1
                  }`}
                  value={option}
                  onChange={(e) =>
                    handleOptionChange(
                      index,
                      optionIndex,
                      e.target.value
                    )
                  }
                  className="border p-2 rounded w-full mb-2"
                />
              )
            )}

            <select
              value={question.correctAnswer}
              onChange={(e) =>
                handleQuestionChange(
                  index,
                  "correctAnswer",
                  e.target.value
                )
              }
              className="border p-2 rounded w-full mt-2"
            >
              <option value="">
                Select Correct Answer
              </option>

              {question.options.map(
                (option, optionIndex) => (
                  <option
                    key={optionIndex}
                    value={option}
                  >
                    Option {optionIndex + 1}
                  </option>
                )
              )}
            </select>
          </div>
        ))}

        <div className="flex gap-3">
          <button
            onClick={addQuestion}
            className="bg-blue-500 text-white px-4 py-2 rounded"
          >
            + Add Question
          </button>

          <button
            onClick={publishAssignment}
            className="bg-green-500 text-white px-4 py-2 rounded"
          >
            Publish Assignment
          </button>
        </div>

      </div>
    </div>
  );
};

export default CreateAssignment;