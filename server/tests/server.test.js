const expect = require('expect');
const request = require('supertest');

var { app } = require('./../server');
var { Todo } = require('./../models/todo');

beforeEach((done) => {
    Todo.remove({}).then(() => done());
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
                    expect(todos.length).toBe(1);
                    expect(todos[0].text).toBe(text);
                    done(); // No return, we're not done
                }).catch((e) => done(e));
            });
    });

    it('should create a new todo', (done) => {
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
                    expect(todos.length).toBe(0);
                    done(); // No return, we're not done
                }).catch((e) => done(e));
            });
    });
});