const express = require('express');
const mysql = require("mysql2");
const jwt = require('jsonwebtoken');
const app= express();

app.use(express.json());

//Create a MySql Connection
const db = mysql.createConnection({
    host:"localhost",
    user:"root",
    password:"/Puja#29",
    database: "taskdb"
}) 

//Connect to MySQl
db.connect(err=>{
    if(err){
        console.log("Error Connecting To MYSQL Database: ",err);
        return;
    }
    console.log("Connected to MYSQL Database");
});

//JWT middleware
const authenticateToken = (req,res,next)=>{
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(" ")[1];
    if(!token){
        return res.status(401).json({error:"Unauthorized - No token provided"});
    }
    jwt.verify(token,'1357908642',(err, user)=>{
        if(err){
            return res.status(403).json({error:"Forbidden - Invalid Token"});
        }
        res.user = user;
        next();
    });
};

// Login Route
app.post("/login", async (req, res) => {
    const { username, password } = req.body;
    try {
        const [rows] = await db.promise().query("SELECT role FROM users WHERE username=? AND password=?", [username, password]);
        if (rows.length === 0) {
            return res.status(404).json({ message: "User not found" });
        }
        const role = rows[0].role;
        if (role === 'admin' || role === "manager") {
            const jwtToken = jwt.sign({ username, password, role }, "1357908642", { expiresIn: '1h' });
            const dcodeJwtToken = jwt.verify(jwtToken, "1357908642");
            return res.send({ token: jwtToken, decode: dcodeJwtToken });
        } else {
            return res.status(401).json({ message: "Invalid role. Only ADMIN or MANAGER roles are supported" });
        }
    } catch (err) {
        console.log("Error authenticating user: ", err);
        res.status(500).json({ error: "Internal server error" });
    }
});

// GET all tasks
app.get("/tasks", async (req, res) => {
    try {
        const [rows] = await db.promise().query('SELECT * FROM tasks');
        res.json(rows);
    } catch (err) {
        console.log("Error while retrieving tasks: ", err);
        res.status(500).json({ error: "Internal server error" });
    }
});

// GET task by Id
app.get('/tasks/:id', async (req, res) => {
    const taskId = req.params.id;
    try {
        const [rows] = await db.promise().query("SELECT * FROM tasks WHERE id=?", taskId);
        if (rows.length === 0) {
            return res.status(404).json({ error: "Task not found" });
        }
        res.json(rows);
    } catch (err) {
        console.log("Error while retrieving task: ", err);
        res.status(500).json({ error: "Internal server error" });
    }
});

// CREATE new user
app.post("/users",async(req,res)=>{
    const {username,password,role} = req.body;
    try{
     await db.promise().query(
        "INSERT INTO users(username,password,role)VALUES(?,?,?)",[username,password,role])
            res.json({message:"user craeted successfully"});
    }catch(err){
        console.log("Error creating task: ", err);
        res.status(500).json({ error: "Internal server error" });
    }
});

// Create new task
app.post("/tasks", authenticateToken, async (req, res) => {
    const { title, description, status, assignee_id } = req.body;
    const created_at = new Date();
    const updated_at = new Date();
    try {
        await db.promise().query(
            "INSERT INTO tasks (title, description, status, assignee_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
            [title, description, status, assignee_id, created_at, updated_at]
        );
        res.status(201).json({ message: "Task created successfully" });
    } catch (err) {
        console.log("Error creating task: ", err);
        res.status(500).json({ error: "Internal server error" });
    }
});

// PUT Task Route
app.put("/tasks/:id", authenticateToken, async (req, res) => {
    const taskId = req.params.id;
    const { title, description, status, assignee_id } = req.body;
    const updated_at = new Date();
    try {
        const [result] = await db.promise().query(
            "UPDATE tasks SET title=?, description=?, status=?, assignee_id=?, updated_at=? WHERE id=?",
            [title, description, status, assignee_id, updated_at, taskId]
        );
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: "Task not found" });
        }
        res.status(200).json({ message: "Task updated successfully" });
    } catch (err) {
        console.log("Error updating task: ", err);
        res.status(500).json({ error: "Internal server error" });
    }
});

// DELETE Task Route
app.delete("/tasks/:id", authenticateToken, async (req, res) => {
    const taskId = req.params.id;
    try {
        const [result] = await db.promise().query("DELETE FROM tasks WHERE id = ?", taskId);
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: "Task not found" });
        }
        res.json({ message: "Task deleted successfully" });
    } catch (err) {
        console.log("Error deleting task: ", err);
        res.status(500).json({ error: "Internal server error" });
    }
});


app.listen(3000, () => console.log("Server running at http://localhost:3000"));

module.exports = app;
