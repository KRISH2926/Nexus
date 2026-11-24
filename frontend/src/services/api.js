import axios from "axios";
import API_BASE from "./apiBase";

const API = axios.create({
baseURL: API_BASE,
});

/* ================= ASSIGNMENTS ================= */

export const createAssignment = async (data) => {
const token = localStorage.getItem("token");

return API.post("/assignment/create", data, {
headers: {
Authorization: `Bearer ${token}`,
},
});
};

export const getStudentAssignments = async () => {
const token = localStorage.getItem("token");

return API.get("/assignment/student", {
headers: {
Authorization: `Bearer ${token}`,
},
});
};

export const submitAssignment = async (data) => {
const token = localStorage.getItem("token");

return API.post("/assignment/submit", data, {
headers: {
Authorization: `Bearer ${token}`,
},
});
};

export default API;
