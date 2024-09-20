const express = require('express');

const port = 9007;

const  app = express();

const db = require("./cofig/mongoose")

app.use(express.urlencoded());

app.use('/',require("./route/task"));

app.listen(port, (err) => {
    (err) ? console.log("server not connect") : console.log("server is connect", port);
})
