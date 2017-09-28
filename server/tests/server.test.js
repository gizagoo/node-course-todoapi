const expect = require('expect');
const request = require('supertest');
var { ObjectID } = require('mongodb');

var { app } = require('./../server');
var { Todo } = require('./../models/todo');

// Declare array for seeding
const todos = [
    {
        _id: new ObjectID(),
        text: 'Walk the Dog'
    }, {
        _id: new ObjectID(),
        text: 'Feed the Cat'
    }];

beforeEach((done) => {
    Todo.remove({}).then(() => {
        return Todo.insertMany(todos);
    }).then(() => done());
});

describe('POST /todos', () => {
    it('should create a new todo', (done) => {
        var text = 'Frank test';
        request(app)
            .post('/todos')
            .send({ text })                 // Post the data
            .expect(200)                    // Should be ok
            .expect((response) => {
                expect(response.body.text).toBe(text);  // Did we get respose
            })
            .end((err, res) => {
                if (err) {
                    return done(err);   // Return to prevent further processing
                }
                // Now check that it was added to MongoDB
                Todo.find().then((todos) => {
                    expect(todos.length).toBe(3);
                    done(); // No return, we're not done
                }).catch((e) => done(e));
            });
    });

    it('should fail to create empty todo', (done) => {
        request(app)
            .post('/todos')
            .send({})
            .expect(400)                    // Should get error code, no data
            .end((err, res) => {
                if (err) {
                    return done(err);   // Return to prevent further processing
                }
                // Now check that it was added to MongoDB
                Todo.find().then((todos) => {
                    expect(todos.length).toBe(2);
                    done(); // No return, we're not done
                }).catch((e) => done(e));
            });
    });
});

describe('GET /todos', () => {
    it('should get all todos', (done) => {
        request(app)
            .get('/todos')
            .expect(200)
            .expect((res) => {
                expect(res.body.todos.length).toBe(2);
            })
            .end(done);
    });
});

describe('GET /todos/:id', () => {
    it('should return the first todo', (done) => {
        request(app)
            .get(`/todos/${todos[0]._id.toHexString()}`)
            .expect(200)
            .expect((res) => {
                expect(res.body.todo.text).toBe(todos[0].text);
            })
            .end(done);
    });

    it('should return 404 for not found id', (done) => {
        var newId = new ObjectID();
        request(app)
            .get(`/todos/${newId.toHexString()}`)
            .expect(404)
            .end(done);
    });

    it('should return 404 for invalid id', (done) => {
        request(app)
            .get('/todos/abcdefg')
            .expect(404)
            .end(done);
    });

});

describe('DELETE /todos/:id', () => {
    it('should delete a given todo', (done) => {
        var hexString = todos[0]._id.toHexString();
        request(app) 
            .delete(`/todos/${hexString}`)
            .expect(200)
            .expect((res) => {
                expect(res.body.todo._id).toBe(hexString);
            })
            .end((err, res) => {
                if (err) {
                    return done(err);   // Return to prevent further processing
                }
                // Now check that it was deleted from MongoDB
                Todo.findById(hexString).then((todos) => {
                    expect(todos).toNotExist;
                    done();
                }).catch((e) => done(e));
            });
    });

    it('should return 404 if id not found', (done) => {
        var newId = new ObjectID();
        request(app)
            .delete(`/todos/${newId.toHexString()}`)
            .expect(404)
            .end(done);
    });

    it('should return 404 if id is invalid', (done) => {
        request(app)
            .get('/todos/abcdefg')
            .expect(404)
            .end(done);
    });

});
