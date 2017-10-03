const expect = require('expect');
const request = require('supertest');
var { ObjectID } = require('mongodb');

var { app } = require('./../server');
var { Todo } = require('./../models/todo');
var { User } = require('./../models/user');

const { todos, populateTodos, users, populateUsers } = require('./seed/seed');


beforeEach(populateUsers);
beforeEach(populateTodos);

describe('POST /todos', () => {
    it('should create a new todo', (done) => {
        var text = 'Frank test';
        request(app)
            .post('/todos')
            .set('x-auth', users[0].tokens[0].token)
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
            .set('x-auth', users[0].tokens[0].token)
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
            .set('x-auth', users[0].tokens[0].token)
            .expect(200)
            .expect((res) => {
                expect(res.body.todos.length).toBe(1);
            })
            .end(done);
    });
});

describe('GET /todos/:id', () => {
    it('should return the first todo', (done) => {
        request(app)
            .get(`/todos/${todos[0]._id.toHexString()}`)
            .set('x-auth', users[0].tokens[0].token)
            .expect(200)
            .expect((res) => {
                expect(res.body.todo.text).toBe(todos[0].text);
            })
            .end(done);
    });

    it('should not return todo of another user', (done) => {
        request(app)
            .get(`/todos/${todos[0]._id.toHexString()}`)
            .set('x-auth', users[1].tokens[0].token)
            .expect(404)
            .end(done);
    });

    it('should return 404 for not found id', (done) => {
        var newId = new ObjectID();
        request(app)
            .get(`/todos/${newId.toHexString()}`)
            .set('x-auth', users[0].tokens[0].token)
            .expect(404)
            .end(done);
    });

    it('should return 404 for invalid id', (done) => {
        request(app)
            .get('/todos/abcdefg')
            .set('x-auth', users[0].tokens[0].token)
            .expect(404)
            .end(done);
    });

});

describe('DELETE /todos/:id', () => {
    it('should delete a given todo', (done) => {
        var hexString = todos[1]._id.toHexString();
        request(app) 
            .delete(`/todos/${hexString}`)
            .set('x-auth', users[1].tokens[0].token)
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

    it('should not delete another users todo', (done) => {
        var hexString = todos[0]._id.toHexString();
        request(app)
            .delete(`/todos/${hexString}`)
            .set('x-auth', users[1].tokens[0].token)
            .expect(404)
            .end((err, res) => {
                if (err) {
                    return done(err);   // Return to prevent further processing
                }
                // Now check that it was deleted from MongoDB
                Todo.findById(hexString).then((todos) => {
                    expect(todos).toExist;
                    done();
                }).catch((e) => done(e));
            });
    });
    it('should return 404 if id not found', (done) => {
        var newId = new ObjectID();
        request(app)
            .delete(`/todos/${newId.toHexString()}`)
            .set('x-auth', users[1].tokens[0].token)
            .expect(404)
            .end(done);
    });

    it('should return 404 if id is invalid', (done) => {
        request(app)
            .get('/todos/abcdefg')
            .set('x-auth', users[1].tokens[0].token)
            .expect(404)
            .end(done);
    });

});

describe('PATCH /todos/:id', () => {
    it('should mark 0 complete and set timestamp', (done) => {
        var hexString = todos[0]._id.toHexString();
        request(app)
            .patch(`/todos/${hexString}`)
            .set('x-auth', users[0].tokens[0].token)
            .send({ text: 'New text for zero', completed: true })
            .expect(200)
            .expect((res) => {
                expect(res.body.todo.text).toBe('New text for zero');
                expect(res.body.todo.completed).toBe(true);
                expect(typeof(res.body.todo.completedAt)).toBe('number');
            })
            .end(done);
    });

    it('should not mark complete for other user', (done) => {
        var hexString = todos[0]._id.toHexString();
        request(app)
            .patch(`/todos/${hexString}`)
            .set('x-auth', users[1].tokens[0].token)
            .send({ text: 'New text for zero', completed: true })
            .expect(404)
            .end(done);
    });



    it('should mark 1 incomplete and clear timestamp', (done) => {
        var hexString = todos[1]._id.toHexString();
        request(app)
            .patch(`/todos/${hexString}`)
            .set('x-auth', users[1].tokens[0].token)
            .send({ text: 'New text for one', completed: false })
            .expect(200)
            .expect((res) => {
                expect(res.body.todo.text).toBe('New text for one');
                expect(res.body.todo.completed).toBe(false);
                expect(res.body.todo.completedAt).toBeFalsy;
            })
            .end(done);
    });

});

describe('GET /users/me', () => {
    it('should return value when authenticated', (done) => {
        request(app)
            .get('/users/me')
            .set('x-auth', users[0].tokens[0].token)
            .expect(200)
            .expect((res) => {
                expect(res.body._id).toBe(users[0]._id.toHexString());
                expect(res.body.email).toBe(users[0].email);
            })
            .end(done);
    });

    it('should return 401 when not authenticated', (done) => {
        request(app)
            .get('/users/me')
            .expect(401)
            .expect((res) => {
                expect(res.body).toEqual({});
            })
            .end(done);
    });
});

describe('POST /users', () => {
    it('should create a user for valid data', (done) => {
        var email = 'anewuser@domain.com';
        var password = 'TopSecretPass';

        request(app)
            .post('/users')
            .send({ email, password })
            .expect(200)
            .expect((res) => {
                expect(res.headers['x-auth']).toBeTruthy();
                expect(res.body._id).toBeTruthy();
                expect(res.body.email).toBe(email);
            })
            .end((err) => {
                if (err) {
                    return done(err);
                }

                User.findOne({ email }).then((user) => {
                    expect(user).toBeTruthy();
                    expect(user.password).not.toBe(password);
                    done();
                }).catch((e) => done(e));
            });
    });

    it('should return errors for invalid email', (done) => {
        var email = 'anewuser';
        var password = 'TopSecretPass';
        request(app)
            .post('/users')
            .send({ email, password })
            .expect(400)
            .end(done);
    });

    it('should not create user for existing email', (done) => {
        var email = 'frank.nds@gmail.com';
        var password = 'NewImprovedPassword';
        request(app)
            .post('/users')
            .send({ email, password })
            .expect(400)
            .end(done);
    });

});

describe('POST /users/login', () => {
    it('should login a valid user', (done) => {
        var email = users[1].email;
        var password = users[1].password;
        var xauth;
        request(app)
            .post('/users/login')
            .send({ email, password })
            .expect(200)
            .expect((res) => {
                expect(res.headers['x-auth']).toBeTruthy();
                xauth = res.headers['x-auth'];
                expect(res.body._id).toBeTruthy();
                expect(res.body.email).toBe(email);
            })
            .end((err) => {
                if (err) {
                    return done(err);
                }

                User.findById(users[1]._id).then((user) => {
                    expect(user.tokens[1]).toBeTruthy();
                    expect(user.tokens[1].access).toBe('auth');
                    expect(user.tokens[1].token).toBe(xauth);
                    done();
                }).catch((e) => done(e));
            });
    });

    it('should reject an invalid login attempt', (done) => {
        var email = users[1].email;
        var password = 'wrongpassword';
        request(app)
            .post('/users/login')
            .send({ email, password })
            .expect(400)
            .expect((res) => {
                expect(res.headers['x-auth']).toBeFalsy();
                expect(res.body).toEqual({});
            })
            .end((err) => {
                if (err) {
                    return done(err);
                }

                User.findById(users[1]._id).then((user) => {
                    expect(user.tokens.length).toBe(1);
                    done();
                }).catch((e) => done(e));
            });
    });
});

describe('DELETE /users/me/token', () => {
    it('should remove an existing token to logout', (done) => {
        request(app)
            .delete('/users/me/token')
            .set('x-auth', users[0].tokens[0].token)
            .expect(200)
            .expect((res) => {
                expect(res.headers['x-auth']).toBeFalsy();
                expect(res.body).toEqual({});
            })
            .end((err) => {
                if (err) {
                    return done(err);
                }

                User.findById(users[0]._id).then((user) => {
                    expect(user.tokens.length).toBe(0);
                    done();
                }).catch((e) => done(e));
            });
    });
});