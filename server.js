// silly chrome wants SSL to do screensharing
var fs = require('fs'),
    express = require('express'),
    https = require('https'),
    http = require('http'),
    pg = require('pg');

var privateKey = fs.readFileSync('fakekeys/privatekey.pem').toString(),
    certificate = fs.readFileSync('fakekeys/certificate.pem').toString();

var app = express();

var roomlist = {};

// app.use(express.static(__dirname));

// Set the view directory to /views
app.set("views", __dirname + "/views");

//assets
app.use(express.static(__dirname + '/public'));

app.use(express.urlencoded());
// Let's get rid of defaut Jade and use HTML templating language
app.engine('html', require('ejs').renderFile);
app.set("view engine", "html");

app.get("/", function(request, response) {
  response.render('landing', { title: 'ejs' });
});
app.get("/room", function(request, response) {
  response.render('index', { title: 'ejs' });
});


app.post("/exist", function(request,response) {
    var data = request.body;
    console.log("Login attempted. " + JSON.stringify(data));
    pg.connect(process.env.DATABASE_URL, function(err, client, done) {
        client.query('SELECT * FROM users where email=$1 and password=$2', [data.email,data.password],
                     function(err, result) {
                         console.log("Email is " + data.email);
                         console.log("Result is " + JSON.stringify(result.rows));
                         done();
                         if(err) return console.error(err);
                         if (result.rows.length > 0) {
                             response.cookie('auth',data.email)
                             .cookie('name',result.rows[0].name).redirect('/room');
                         } else
                             response.cookie('flash','Login incorrect').redirect('/');
                     });
    });
});


// Connect to postgres
console.log("Postresql URL is " + process.env.DATABASE_URL);

pg.connect(process.env.DATABASE_URL, function(err, client, done) {
//  client.query('INSERT into users values (default,$1,$2)',['foo','foo@example.com']);
  client.query('SELECT * FROM users', function(err, result) {
    done();
    if(err) return console.error(err);
    console.log(result.rows);
  });
});


var open_port = Number(process.env.PORT || 5000);

// var secure_port = Number(process.env.PORT || 5001);


// https.createServer({key: privateKey, cert: certificate}, app).listen(secure_port);
var server = http.createServer(app).listen(open_port);

// Open web socket

var WebSocketServer = require('ws').Server;


var wss = new WebSocketServer({server: server});
console.log('websocket server created');
wss.on('connection', function(ws) {
  //var id = setInterval(function() {
//    ws.send(JSON.stringify(new Date()), function() {  });
//  }, 1000);

  var myRoomId = "none";

  console.log('websocket connection open');

  ws.on('message', function(data,flags) {
      data = JSON.parse(data);

      // Register a room
      switch (data.key) {
        case "room":
          ws.roomId = data.value;
          roomlist[ws.roomId] = 1;
          console.log("Room created: " + ws.roomId);
          ws.send(JSON.stringify("Room is " + ws.roomId),function () {});
          console.log("Rooms are: " + JSON.stringify(roomlist));
          break;
        case "login":

      }

  });
    ws.on('close', function() {
        roomlist[ws.roomId] = 1;
        console.log('websocket connection close');
        console.log('room close is ' + ws.roomId);
    });
});

var status = 'Not reset yet.';

console.log('running on http://localhost:5000');
