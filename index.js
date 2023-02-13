const express = require('express');
const exphbs = require('express-handlebars');
const socketIO = require('socket.io');
const http = require('http');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const PORT = process.env.PORT || 5000;
const app = express();
const server = http.createServer(app);
// init new instance of socket.io by passing the http server
const io = socketIO(server);

const userType = {
	blank: " ",
	user1: "X",
	user2: "O"
}
const numRows = 3;
const numCols = 3;

// global data structures
var clients = [];
var games = [];
var clientMap = new Map();
var gameMap = new Map();

function spotsStillAvailable(board) {
	for (i = 0; i < numRows; i++) {
		for (j = 0; j < numCols; j++) {
			if (board[i][j] == userType.blank) {
				return true;
			}
		}
	}
	return false;
}

function userHasWon(userType, board) {
	// check rows
	for (i = 0; i < numRows; i++) {
		if (board[i][0] == userType && board[i][1] == userType && board[i][2] == userType) {
			return true;
		}
	}
	// check cols
	for (j = 0; j < numCols; j++) {
		if (board[0][j] == userType && board[1][j] == userType && board[2][j] == userType) {
			return true;
		}
	}
	// check diagonals
	if (board[0][0] == userType && board[1][1] == userType && board[2][2] == userType) {
		return true;
	}
	if (board[0][2] == userType && board[1][1] == userType && board[2][0] == userType) {
		return true;
	}
	return false;
}

class Game {
	constructor(gameId, clientId1) {
		this.gameId = gameId;
		this.numberOfUsers = 1;
		this.user1 = clientId1;
		this.user2 = "";
		this.currentUser = this.user1;
		this.board = [
			[userType.blank, userType.blank, userType.blank], 
			[userType.blank, userType.blank, userType.blank],
			[userType.blank, userType.blank, userType.blank]
		];
	}

	addSecondUser(clientId) {
		if (this.numberOfUsers == 2) {
			console.log("WARN: game " + gameId + " has reached max capcacity")
			return;
		}
		this.user2 = clientId;
		this.numberOfUsers = this.numberOfUsers + 1;
	}

	setCurrentUser(clientdId) {
		this.currentUser = clientdId;
	}

	getNumberOfUsers() {
		return this.numberOfUsers;
	}

}

// set handlebars middleware
app.engine('handlebars', exphbs.engine());
app.set('view engine', 'handlebars');
app.set('views', './views');
app.use(express.static(path.join(__dirname, '/public')));

// set handlebar routes
app.get('/', (req, res) => {
	console.log("all clients: ", clients);
	console.log("all games: ", games);
	res.render('home', {
		// send stuff to handlebars here
	});
});
app.get('/games', (req, res) => {
	console.log("all games: ", games);
	res.setHeader('Conent-Type', 'application/json');
	res.end(JSON.stringify({
		'games': games
	}));
});

// listen on connection event for incoming sockets
io.on('connection', (socket) => {
	// create unique client id to send back to client
	const clientId = uuidv4();
	clients.push(clientId);
	console.log("new user " + clientId + " connected.");
	console.log("all clients: ", clients);
	console.log("all games: ", games);

	// emit message from server to user
	socket.emit('newMessage', {
		'tag': 'connected',
		'clientId': clientId
	});

	// listen for message from user
	socket.on('createMessage', (msg) => {
		console.log(">>> messsage from client: ", msg);
		switch (msg.tag) {
			case 'getGames':
				console.log("sending all games: ", games);
				socket.emit('newMessage', {
					'tag': 'allGames',
					'games': games
				})
				break;
			case 'newGame':
				var gameId = uuidv4();
				games.push(gameId);
				gameMap.set(gameId, new Game(gameId, clientId));
				clientMap.set(clientId, gameId);
				console.log("creating new game with id: ", gameId);
				console.log("current games: ", [...gameMap.keys()]);
				console.log("current games: ", games);
				socket.emit('newMessage', {
					'tag': 'gameCreated',
					'clientId': clientId,
					'gameId': gameId
				});
				console.log("client id " + clientId + " joining room " + gameId);
				socket.join(gameId);
				break;
			case 'selectGame':
				console.log("client id " + msg.clientId + " selected game " + msg.gameId);
				console.log("current games: ", [...gameMap.keys()]);
				if (gameMap.get(msg.gameId).getNumberOfUsers() == 2) {
					console.log("WARN: game " + msg.gameId + " is full");
					socket.emit("newMessage", {
						'tag': 'gameIsFull',
						'clientId': msg.clientId
					});
					break;
				}
				gameMap.get(msg.gameId).addSecondUser(msg.clientId);
				console.log("client id " + clientId + " joining room " + msg.gameId);
				socket.join(msg.gameId);
				beginGame(msg.gameId);
				break;
			case 'cellChosen':
				console.log("client id " + msg.clientId + " chose cell in game " + msg.gameId);
				console.log("current games: ", [...gameMap.keys()]);
				var user1 = gameMap.get(msg.gameId).user1;
				var user2 = gameMap.get(msg.gameId).user2;
				var board = gameMap.get(msg.gameId).board;
				var currentUser = gameMap.get(msg.gameId).currentUser;
				var currentUserType = (currentUser == user1) ? userType.user1 : userType.user2;
				console.log("user 1: ", user1);
				console.log("user 2: ", user2);
				console.log("board: ", board);
				console.log("current user: ", currentUser);
				console.log("current user type: ", currentUserType);
				if (msg.clientId != currentUser) {
					console.log("client id " + msg.clientId + " is not the current user, do nothing");
				} else if (board[msg.x][msg.y] == userType.user1 || board[msg.x][msg.y] == userType.user2) {
					console.log("spot " + msg.x + ", " + msg.y + " is taken, do nothing");
					console.log("board for game " + msg.gameId + ": " + board);
				} else {
					// clientId is currentUser
					// spot is available to be taken
					// first mark spot of current user on board
					if (msg.clientId == user1) {
						gameMap.get(msg.gameId).board[msg.x][msg.y] = userType.user1; 
					} else {
						gameMap.get(msg.gameId).board[msg.x][msg.y] = userType.user2;
					}
					console.log("board for game " + msg.gameId + ": " + board);
					// check if current user won
					console.log("check if current user " + currentUserType + " has won game " + msg.gameId + "...");
					if (userHasWon(currentUserType, board)) {
						console.log("YAS");
						io.to(msg.gameId).emit("newMessage", {
							'tag': 'gameOver',
							'msg': 'user ' + gameMap.get(msg.gameId).currentUser + " has won!!!",
							'board': gameMap.get(msg.gameId).board
						})
						break;
					} else {
						console.log("NOPE");
					}
					// update current user
					if (msg.clientId == user1) {
						gameMap.get(msg.gameId).currentUser = user2;
					} else {
						gameMap.get(msg.gameId).currentUser = user1;
					}
					if (spotsStillAvailable(board)) {
						console.log("spots are still available for game " + msg.gameId);
						takeTurn(msg.gameId);
					} else {
						console.log("it's a tie for game ", msg.gameId);
						io.to(gameId).emit("newMessage", {
							'tag': 'gameOver',
							'msg': "It's a tie!!!",
							'board': gameMap.get(msg.gameId).board
						});
					}
				}
				break;
			default:
				console.log("unknown message received from user");
		}
	});

	// when server disconnects from user
	socket.on('disconnect', () => {
		console.log('disconnected from user ', clientId);
		var index = clients.indexOf(clientId);
		if (index > -1) { clients.splice(index, 1); }
		// remove game connected to client
		const gameId = clientMap.get(clientId);
		clientMap.delete(clientId);
		gameMap.delete(gameId);
		// inform other user(s) that game is over
		io.to(gameId).emit("newMessage", {
			'tag': 'gameOver',
			'msg': 'one user has diconnected, game suspended!!!',
			'board': [
				[userType.blank, userType.blank, userType.blank], 
				[userType.blank, userType.blank, userType.blank],
				[userType.blank, userType.blank, userType.blank]
			]
		});
	});

	socket.on('popup', function(msg){
    console.log("hello: ", msg)
	});
	socket.on('connection', function() {
	    console.log("client connected");
	});

	socket.on('connect_error', function(err) {
	    console.log("client connect_error: ", err);
	});

	socket.on('connect_timeout', function(err) {
	    console.log("client connect_timeout: ", err);
	});
});

server.listen(PORT, () => {
	console.log("Server listening on port " + PORT + "...");
});

function beginGame(gameId) {
	console.log("beginning game for " + gameId + "...");
	io.to(gameId).emit("newMessage", {
		'tag': 'beginGame',
		'currentUser': gameMap.get(gameId).currentUser
	});
}

function takeTurn(gameId) {
	console.log("current games: ", [...gameMap.keys()]);
	var currentUser = gameMap.get(gameId).currentUser;
	io.to(gameId).emit("newMessage", {
		'tag': 'takeTurn',
		'currentUser': currentUser,
		'board': gameMap.get(gameId).board
	});
}

function disconnect(clientId) {
	console.log('disconnected from user ', clientId);
	// remove clientId from clients list
	var index = clients.indexOf(clientId);
	if (index > -1) { clients.splice(index, 1); }
	// remove gameId from games list
	index = games.indexOf(gameId);;
	if (index > -1) {games.splice(index, 1,); }
	// remove game connected to client in gameMap
	const gameId = clientMap.get(clientId);
	clientMap.delete(clientId);
	gameMap.delete(gameId);
	// inform other user(s) that game is over
	io.to(gameId).emit("newMessage", {
		'tag': 'gameOver',
		'msg': 'one user has diconnected, game suspended!!!',
		'board': [
			[userType.blank, userType.blank, userType.blank], 
			[userType.blank, userType.blank, userType.blank],
			[userType.blank, userType.blank, userType.blank]
		]
	});
}

