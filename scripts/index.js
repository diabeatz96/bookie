import bodyParser from 'body-parser';
import express from 'express';
const app = express()
const port = 3000
import * as pg from 'pg'
const { Pool } = pg.default;
import multer from 'multer';
const upload = multer();


app.use(bodyParser.json())

app.use(
    bodyParser.urlencoded({
        extended: true,
    })
)

app.get('/', (request, response) => {
    response.json({ info: 'API EXPRESS/JS IMPLEMENTATION' })
})


app.listen(port, () => {
    console.log(`App running on port ${port}.`)
})


/** Postgres Swag **/

const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'booklist',
    password: 'twinglocks77!',
    port: 5432,
})

/** USER FUNCTIONS */
const getUsers = (request, response) => {
    pool.query('SELECT * FROM users ORDER BY id ASC', (error, results) => {
        if (error) {
            throw error
        }
        response.status(200).json(results.rows)
    })
}

const createUser = (request, response) => {
    const { name, email } = request.body;

    pool.query('INSERT INTO users (name, email) VALUES ($1, $2)', [name, email], (error, results) => {
        if (error) {
            throw error
        }
        console.log(name, email);
        response.status(201).send(`User added with ID: ${results.insertId}`)
    })
}

const deleteUser = (request, response) => {
    const id = parseInt(request.params.id)

    pool.query('DELETE FROM users WHERE id = $1', [id], (error, results) => {
        if (error) {
            throw error
        }
        response.status(200).send(`User deleted with ID: ${id}`)
    })
}

/** BOOK FUNCTIONS FUNCTIONS */

const getBooks = (request, response) => {
    pool.query('SELECT * FROM books ORDER BY book_id ASC', (error, results) => {
        if (error) {
            throw error
        }
        response.status(200).json(results.rows)
    })
}

const createBook = (request, response) => {
    const {book_name, genre, author, isbn} = request.body;

    pool.query('INSERT INTO books (book_name, genre, author, isbn) VALUES ($1, $2, $3, $4)', [book_name, genre, author, isbn], (error, results) => {
        if (error) {
            throw error
        }

        console.log(book_name, genre, author, isbn);
        response.status(201).send(`Book added`)
    })
}

const deleteBook = (request, response) => {
    const id = parseInt(request.params.id)

    pool.query('DELETE FROM books WHERE id = $1', [id], (error, results) => {
        if (error) {
            throw error
        }
        response.status(200).send(`Book deleted with ID: ${id}`)
    })
}

app.get('/users', getUsers);
app.get('/books', getBooks);
app.post('/users', upload.none(), createUser);
app.post('/books', createBook);


