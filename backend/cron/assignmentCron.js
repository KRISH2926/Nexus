const cron = require("node-cron");

const Assignment = require("../models/assignmentModel");
const Submission = require("../models/submissionModel");
const Student = require("../models/studentModel");

cron.schedule("*/5 * * * *", async () => {
  try {
    const expiredAssignments = await Assignment.find({
      deadline: { $lt: new Date() },
      status: "active",
    });

    for (const assignment of expiredAssignments) {
      const students = await Student.find({
        batch: assignment.batch,
      });

      for (const student of students) {
        const alreadySubmitted =
          await Submission.findOne({
            assignment: assignment._id,
            student: student._id,
          });

        if (!alreadySubmitted) {
          await Submission.create({
            assignment: assignment._id,
            student: student._id,
            answers: [],
            score: 0,
            status: "missed",
          });
        }
      }

      assignment.status = "closed";

      await assignment.save();
    }

    console.log("Assignment cron executed");
  } catch (error) {
    console.log(error.message);
  }
});