const Task = require('../model/taskpanel');
const createObjectCsvWriter = require('csv-writer').createObjectCsvWriter;
const multer = require('multer');
const csv = require('csv-parser');
const fs = require('fs');
const path = require('path');
const { body, validationResult } = require('express-validator');

const ALLOWED_STATUSES = ['Pending', 'In Progress', 'Completed'];
const ALLOWED_PRIORITIES = ['Low', 'Medium', 'High'];

const upload = multer({
    dest: 'uploads/',
    limits: { fileSize: 5 * 1024 * 1024 }, // Limit file size to 5MB
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'text/csv' || file.mimetype === 'application/vnd.ms-excel') {
            cb(null, true);
        } else {
            cb(new Error('Only CSV files are allowed!'), false);
        }
    }
});



module.exports.add_task = async (req, res) => {
    // console.log(req.body);
    try {
        const check = await Task.findOne({ title: req.body.title });
        if (check) {
            return res.status(200).json({ mes: "title already exits", status: 0 });
        }
        else {
            req.body.dueDate = new Date().toLocaleDateString();
            const data = await Task.create(req.body);
            if (data) {
                return res.status(200).json({ mes: "data insert succesfully", data: data, status: 1 });
            }
            else {
                return res.status(200).json({ mes: "data not found", status: 0 });

            }
        }
    } catch (error) {
        console.log(error);
        return res.status(400).json({ mes: "something worng", status: 0 });
    }
}


module.exports.view_task = async (req, res) => {
    try {
        const viewData = await Task.find();
        if (viewData) {
            return res.status(200).json({
                msg: "Here is all Task data", viewData: viewData, status: 1
            });
        }


        // paginnation 

        const { page = 1, limit = 10, status, priority, assignedUsers, sortBy } = req.query;
        const options = {
            page: parseInt(page),
            limit: parseInt(limit),
        };

        const totalTasks = await Task.countDocuments(query);
        const Tasks = await Task.find(query)
            .sort(sortBy ? { [sortBy]: 1 } : {})
            .skip((options.page - 1) * options.limit)
            .limit(options.limit);

        const totalPages = Math.ceil(totalTasks / options.limit);
        if (Tasks.length) {
            return res.status(200).json({
                msg: "Here are the filtered and sorted tasks",
                viewData: Tasks,
                pagination: {
                    totalTasks,
                    totalPages,
                    currentPage: options.page,
                    limit: options.limit,
                },
                status: 1,
            });
        }


        /// filtering and sorting 
        let query = {};

        if (status && ALLOWED_STATUSES.includes(status)) {
            query.status = status;
        }
        if (priority && ALLOWED_PRIORITIES.includes(priority)) {
            query.priority = priority;
        }
        if (assignedUsers) {
            query.assignedUsers = { $regex: assignedUsers, $options: 'i' }; // Case insensitive search
        }

        const tasks = await Task.find(query);


        let sortedTasks = tasks;
        if (sortBy) {
            sortedTasks = tasks.sort((a, b) => {
                if (sortBy === 'dueDate') {
                    return new Date(a.dueDate) - new Date(b.dueDate);
                } else if (sortBy === 'priority') {
                    return ALLOWED_PRIORITIES.indexOf(a.priority) - ALLOWED_PRIORITIES.indexOf(b.priority);
                }

                return 0;
            });
        }

        if (sortedTasks.length) {
            return res.status(200).json({
                msg: "Here are the filtered and sorted tasks",
                viewData: sortedTasks,
                status: 1,
            });
        } else {
            return res.status(200).json({ msg: "No tasks found", status: 0 });
        }


    } catch (error) {
        console.log(error);
        return res.status(400).json({ mes: "something worng", status: 0 })
    }
}



module.exports.exportTask = async (req, res) => {
    try {
        const tasks = await Task.find();

        if (!tasks.length) {
            return res.status(200).json({ msg: "No tasks to export", status: 0 });
        }

        const csvWriter = createObjectCsvWriter({
            path: 'exports/tasks.csv',
            header: [
                { id: 'title', title: 'Title' },
                { id: 'description', title: 'Description' },
                { id: 'dueDate', title: 'Due Date' },
                { id: 'priority', title: 'Priority' },
                { id: 'status', title: 'Status' },
                { id: 'assignedUsers', title: 'Assigned Users' },
            ],
        });

        const formattedTasks = tasks.map(task => ({
            title: task.title,
            description: task.description,
            dueDate: task.dueDate,
            priority: task.priority,
            status: task.status,
            assignedUsers: task.assignedUsers,
        }));

        await csvWriter.writeRecords(formattedTasks);

        res.download('exports/tasks.csv', 'tasks.csv', (err) => {
            if (err) {
                console.log(err);
                res.status(500).json({ meg: 'Error exporting tasks', status: 0 });
            }
        });
    } catch (error) {
        console.log(error);
        res.status(500).json({ msg: "Error exporting tasks", status: 0 });
    }
}

module.exports.importTask = [
    upload.single('file'),
    // Validation Middleware
    body('file').notEmpty().withMessage('No file uploaded.').custom((value, { req }) => {
        if (req.file && (req.file.mimetype !== 'text/csv' && req.file.mimetype !== 'application/vnd.ms-excel')) {
            throw new Error('Only CSV files are allowed!');
        }
        return true;
    }),
    async (req, res) => {
        // Check for validation errors
        const error = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array(), status: 0 });
        }
        const filePath = req.file.path;
        const tasks = [];
        const errors = [];
        const stream = fs.createReadStream(filePath)
            .pipe(csv())
            .on('data', (row) => {
                tasks.push(row);
            })
            .on('end', async () => {
                fs.unlinkSync(filePath);

                for (let i = 0; i < tasks.length; i++) {
                    const task = tasks[i];
                    const validationErrors = [];


                    if (!task.title || !task.description || !task.dueDate || !task.priority || !task.status || !task.assignedUsers) {
                        validationErrors.push('Missing required fields.');
                    }


                    if (task.dueDate && !/^\d{4}-\d{2}-\d{2}$/.test(task.dueDate)) {
                        validationErrors.push('Invalid due date format. Use YYYY-MM-DD.');
                    }


                    if (task.priority && !ALLOWED_PRIORITIES.includes(task.priority)) {
                        validationErrors.push(`Invalid priority. Allowed values: ${ALLOWED_PRIORITIES.join(', ')}.`);
                    }


                    if (task.status && !ALLOWED_STATUSES.includes(task.status)) {
                        validationErrors.push(`Invalid status. Allowed values: ${ALLOWED_STATUSES.join(', ')}.`);
                    }

                    if (validationErrors.length > 0) {
                        errors.push({ row: i + 1, errors: validationErrors });
                    } else {

                        tasks[i].dueDate = task.dueDate;
                        tasks[i].assignedUsers = task.assignedUsers;
                    }
                }

                if (errors.length > 0) {
                    return res.status(400).json({ msg: "Validation errors", errors, status: 0 });
                }

                try {

                    await Task.insertMany(tasks);
                    res.status(200).json({ msg: "Tasks imported successfully", status: 1 });
                } catch (dbError) {
                    console.error('Database error:', dbError);
                    res.status(500).json({ msg: "Error importing tasks", status: 0 });
                }
            })
            .on('error', (err) => {
                console.error('Error reading CSV file:', err);
                res.status(500).json({ msg: "Error processing CSV file", status: 0 });
            });
    }
];
