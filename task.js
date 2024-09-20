const express = require('express');

const routes = express.Router();

const taskcontroller = require("../controller/taskcontroller");



routes.post('/add_task', taskcontroller.add_task);
routes.get('/view_task', taskcontroller.view_task);

routes.get('/exportTask', taskcontroller.exportTask);

routes.post('/importTask', taskcontroller.importTask);


module.exports = routes;






