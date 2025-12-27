const http = require('http');
const fs = require('fs')
const path = require('path');
const { Server } = require ("socket.io")
// const mysql = require('mysql2');
const crypto = require('crypto')
const db = require('./database');
const { json } = require('stream/consumers');

let validAuthTokens = []

// const connection = mysql.createConnection({
//     host: 'localhost',
//     user: 'root',
//     password: '1111',
//     database: 'chat'
// })

// const pool = mysql.createPool({
//     host: 'localhost',
//     user: 'root',
//     password: '1111',
//     database: 'chat'
// });

// const promisePool = pool.promise()


const pathToIndex = path.join(__dirname, 'static', 'index.html');
const indexHtmlFile = fs.readFileSync(pathToIndex);

const pathToStyle = path.join(__dirname, 'static', 'style.css');
const styleCssFile = fs.readFileSync(pathToStyle);

const pathToScript = path.join(__dirname, 'static', 'script.js');
const scriptJsFile = fs.readFileSync(pathToScript);

const pathToRegisterHtml = path.join(__dirname, 'static', 'register.html');
const registerHtml = fs.readFileSync(pathToRegisterHtml);

const authJsPath = path.join(__dirname, 'static', 'auth.js');
const authJs = fs.readFileSync(authJsPath);

const registerCssPath = path.join(__dirname, 'static', 'register.css');
const registerCss = fs.readFileSync(registerCssPath);

const loginHtmlPath = path.join(__dirname, 'static', 'login.html');
const loginHtml = fs.readFileSync(loginHtmlPath);

const loginJsPath = path.join(__dirname, 'static', 'login.js');
const loginJs = fs.readFileSync(loginJsPath);

const server = http.createServer(async (req, res) => {
    if(req.url === '/') {
        return res.end(indexHtmlFile);
    }
    else if(req.url === '/style.css'){
        return res.end(styleCssFile)
    }
    else if(req.url === '/script.js'){
        return res.end(scriptJsFile)
    }
    else if(req.url == '/messages' && req.method == 'GET'){
        let messages = await db.getMessages()
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify(messages));
    }
    else if(req.url === '/register'){
        return res.end(registerHtml)
    }
    else if(req.url === '/auth.js'){
        return res.end(authJs)
    }
    else if(req.url == '/register.css'){
        return res.end(registerCss)
    }
    else if(req.url == '/login'){
        return res.end(loginHtml)
    }
    else if(req.url === '/login.js'){
        return res.end(loginJs)
    }
    else if(req.url === '/api/login'){
        let data = '';
        req.on('data', function(chunk) {
            data += chunk;
        });
        req.on('end', async function() {
            data = JSON.parse(data);
            const user = data.content
            try {
                const token = await db.getAuthToken(user);
                validAuthTokens.push(token);
                res.writeHead(200)
                res.end(JSON.stringify(token));
            }
            catch(e) {
                res.writeHead(500);
                return res.end('Error: ' + e);
            }
        })
    }
    else if(req.url === '/api/register'){
        let data = '';
        req.on('data', function(chunk) {
            data += chunk;
        });
        req.on('end', async function() {
            data = JSON.parse(data);
            const exists = await db.userExists(data.content.login);
            if(!exists){
                db.addUser(data.content.login, data.content.password)
            }
            return res.end(JSON.stringify(exists));
        })
    }
    else if(res.statusCode == 404){
        return res.end('Error 404')
    }

    
})

server.listen(3000)



const io = new Server(server)

io.on('connection', (socket) => {
    let userNickname = 'user';
    // console.log('a user connected. id - ' + socket.id)
    socket.on('new_message', (message) => {
        message = userNickname + ': ' + message
        db.addMessage(message, 1)
        io.emit('message', message);
    })
    socket.on('new_nickname', (nickname) => { 
        userNickname = nickname
    })
})
