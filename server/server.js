require('./config/config');

const _ = require('lodash');
const { ObjectID } = require('mongodb');
const express = require('express');
const bodyParser = require('body-parser');

var {mongoose} = require('./db/mongoose');
var { Todo } = require('./models/todo');
var { User } = require('./models/user');
var { authenticate } = require('./middleware/authentication');

var app = express();
const port = process.env.PORT || 3000;  // Get port or use 3000
//const port = 3000;

app.use(bodyParser.json());

app.get('/', (req, res) => {
    var todolist = '<li>*GET /todos</li><li>*POST /todos</li><li>*GET /todos/:id</li><li>*DELETE /todos/:id</li><li>*PATCH /todos/:id</li>';
    var userlist = '<li>POST /users</li><li>*GET /users</li><li>POST /users/login</li><li>*DELETE /users/me/token</li>';
    res.send('<h2>This API Implements</h2><ul>' + todolist + userlist + '</ul><p>* Needs authentication</p>');
});

//************************************ Todos ***************************/

app.post('/todos', authenticate, async (req, res) => {
    const todo = new Todo({
        text: req.body.text,
        _creator: req.user._id
    });
    try {
        const doc = await todo.save();
        res.send(doc);
    } catch (err) {
        res.status(400).send(err);
    }
});

app.get('/todos', authenticate, async (req, res) => {
    try {
        const todos = await Todo.find({ _creator: req.user._id });
        res.send({ todos });
    } catch (err) {
        res.status(400).send(e);
    }
});

app.get('/todos/:id', authenticate, async (req, res) => {
    var id = req.params.id;

    if (!ObjectID.isValid(id)) {
        return res.status(404).send();
    }
    try {
        const todo = await Todo.findOne({ _id: id, _creator: req.user._id });
        if (!todo) {
            return res.status(404).send();
        }
        res.send({ todo });
    } catch (err) {
        res.status(400).send();
    }
});

app.delete('/todos/:id', authenticate, async (req, res) => {
    const id = req.params.id;
    try {
        if (!ObjectID.isValid(id)) {
            return res.status(404).send();
        }
        const todo = await Todo.findOneAndRemove({ _id: id, _creator: req.user._id });
        if (!todo) {
            return res.status(404).send();
        }
        res.send({ todo });
    } catch (err) {
        res.status(400).send();
    }
});

app.patch('/todos/:id', authenticate, async (req, res) => {
    var id = req.params.id;
    var body = _.pick(req.body, ['text', 'completed']);

    if (!ObjectID.isValid(id)) {
        return res.status(404).send();
    }

    if (_.isBoolean(body.completed) && body.completed) {
        body.completedAt = new Date().getTime();
    } else {
        body.completed = false;
        body.completedAt = null;
    }

    try {
        const todo = await Todo.findOneAndUpdate({ _id: id, _creator: req.user._id }, { $set: body }, { new: true });
        if (!todo) {
            return res.status(404).send();
        }
        res.send({ todo });
    } catch (err) {
        res.status(400).send();
    }
});

//************************************ Users ***************************/

app.post('/users', async (req, res) => {
    try {
        const body = _.pick(req.body, ['email', 'password']);
        const user = new User(body);
        await user.save();
        const token = await user.generateAuthToken();
        res.header('x-auth', token).send(user);
    } catch (err) {
        res.status(400).send(err);
    }
});


app.get('/users/me', authenticate, (req, res) => {
    res.send(req.user);
});

app.post('/users/login', async (req, res) => {    
    try {
        const body = _.pick(req.body, ['email', 'password']);
        const user = await User.findByCredentials(body.email, body.password);
        const token = await user.generateAuthToken();
        res.header('x-auth', token).send(user);
    } catch (err) {
        res.status(400).send();
    }
});

app.delete('/users/me/token', authenticate, async (req, res) => {
    try {
        await req.user.removeToken(req.token);
        res.status(200).send();
    } catch (e) {
        res.status(400).send();
    }
});

//********************************** Server ***************************/

app.listen(port, () => {
    console.log(`Listening on port ${port}`);
});

module.exports = {app};