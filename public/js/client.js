const connectToServerMessage = "Please connect to server first...";
const newGameMessage = "Please create a new game or join an exisiting game...";
const gameIsFullMessage = "Game room is full, choose another...";
const gameAlreadyConnectedMessage = "Game is already connected";
const yourTurnMessage = "Your turn";
const waitYourTurnMessage = "Wait your turn";
const waitForSecondPlayerMessage = "Wait for second player to join";
const disconnectMessage = "Disconnected, please connect again";

const waitingElement = document.querySelector(".waitingElement");
const clientIdElement = document.querySelector(".clientIdElement");
const gameIdElement = document.querySelector(".gameIdElement");
const connectButton = document.querySelector('.connectButton');
const newGameButton = document.querySelector('.newGameButton');
const joinButton = document.querySelector('.joinButton');
const gamesBody = document.querySelector('.gamesBody');
const availableGamesTable = document.querySelector('.availableGames');

const cell_00 = document.querySelector('.cell-0-0');
const cell_01 = document.querySelector('.cell-0-1');
const cell_02 = document.querySelector('.cell-0-2');
const cell_10 = document.querySelector('.cell-1-0');
const cell_11 = document.querySelector('.cell-1-1');
const cell_12 = document.querySelector('.cell-1-2');
const cell_20 = document.querySelector('.cell-2-0');
const cell_21 = document.querySelector('.cell-2-1');
const cell_22 = document.querySelector('.cell-2-2');
const cells = [cell_00, cell_01, cell_02, 
				cell_10, cell_11, cell_12, 
				cell_20, cell_21, cell_22];

var clientId =  "";
var gameId = "";

function isUserConnected() {
	if (clientId == "") {
		console.log(connectToServerMessage);
		clientIdElement.innerHTML = "";
		waitingElement.innerHTML = connectToServerMessage;
		connectButton.disabled = false;
		return false;
	} else {
		clientIdElement.innerHTML = clientId;
		waitingElement.innerHTML = "";
		connectButton.disabled = true;
		return true;
	}
}

function isGameConnected() {
	if (gameId == "") {
		console.log(newGameMessage);
		gameIdElement.innerHTML = "";
		waitingElement.innerHTML = newGameMessage;
		newGameButton.disabled = false;
		availableGamesTable.classList.add("table-hover");
		joinButton.disabled = false;
		return false
	} else {
		gameIdElement.innerHTML = gameId;
		waitingElement.innerHTML = "";
		newGameButton.disabled = true;
		availableGamesTable.classList.remove("table-hover");
		joinButton.disabled = true;
		return true;
	}
}

function setupApp() {
	if (isUserConnected()) {
		console.log("user is already connected");
	} else {
		return;
	}
	if (isGameConnected()) {
		console.log("game is already connected");
	}
}

setupApp();

function askForGames(socket) {
	console.log("ask for games");
	socket.emit('createMessage', {
		'tag': 'getGames',
		'clientId': clientId
	});
}

function selectGame(socket, game) {
	console.log("game " + game + " was selected");
	socket.emit('createMessage', {
		'tag': 'selectGame',
		'clientId': clientId,
		'gameId': game
	});
}

// connection with server
connectButton.addEventListener('click', (src) => {
	console.log(">>> connecting to server...");

	// disable connectButton
	connectButton.disabled = true;
	var socket=io();

	// connection with server
	socket.on('connect', () => {
		console.log('Connected to server');
	});

	askForGames(socket);

	// message listener from server
	socket.on('newMessage', (msg) => {
		console.log(">>> messsage from sever: ", msg);
		switch (msg.tag) {
			case 'connected':
				console.log("connected with client id: ", msg.clientId);
				clientIdElement.innerHTML = msg.clientId;
				clientId = msg.clientId;
				break;
			case 'allGames':
				console.log("available games: ", msg.games);
				// empty the table
				gamesBody.innerHTML = '';
				// recreate games rows in table
				msg.games.forEach((game) => {
					var tr = document.createElement("tr");
					gamesBody.appendChild(tr);
					var th = document.createElement("th");
					th.innerText = game;
					th.scope = "row";
					th.classList.add("gameId");
					tr.appendChild(th);

					// add event listener on th
					th.addEventListener('click', (src) => {
						selectGame(socket, game);
					});
				});

				break;
			case 'gameCreated':
				console.log("new game for client id " + clientId + " created: ", msg.gameId);
				gameId = msg.gameId;

				// update avialble games table
				var tr = document.createElement("tr");
				gamesBody.appendChild(tr);
				var th = document.createElement("th");
				th.innerText = gameId;
				th.scope = "row";
				th.classList.add("gameId");
				tr.appendChild(th);

				// update user's game id
				gameIdElement.innerHTML = gameId;
				waitingElement.innerHTML = waitForSecondPlayerMessage;
				newGameButton.disabled = true;
				availableGamesTable.classList.remove("table-hover");
				break;
			case 'gameIsFull':
				waitingElement.innerHTML = (gameIsFullMessage);
				break;
			case 'beginGame':
				newGameButton.disabled = true;
				gameId = game;
				gameIdElement.innerHTML = game;
				availableGamesTable.classList.remove("table-hover");
				cells.forEach((cell) => {
					var x = "";
					var y = "";
					var classNames = cell.classList;
					for (i = 0; i < classNames.length; i++) {
						if (classNames[i].startsWith("cell-")) {
							x = classNames[i].substring(5,6);
							y = classNames[i].substring(7,8);
							cell.addEventListener('click', (src) => {
								socket.emit('createMessage', {
									'tag': 'cellChosen',
									'clientId': clientId,
									'gameId': gameId,
									'x': x,
									'y': y
								});
							});
							break;
						}
					}
					if ((!x) || (!y)) {
						console.log("WARN: cannot determine cell coordinates");
					}
					if (msg.currentUser == clientId) {
						waitingElement.innerHTML = yourTurnMessage;
					} else {
						waitingElement.innerHTML = waitYourTurnMessage;
					}
				});
				break;
			case 'takeTurn':
				console.log("user " + msg.currentUser + " take turn now");
				console.log("board is " + msg.board);
				// update waiting message
				if (msg.currentUser == clientId) {
					waitingElement.innerHTML = yourTurnMessage;
				} else {
					waitingElement.innerHTML = waitYourTurnMessage;
				}
				// update board
				for (i = 0; i < 3; i++) {
					for (j = 0; j < 3; j++) {
						var cellClassName = ".cell-" + i + "-" + j;
						// console.log("setting cell with class name " + cellClassName + " at " + i + ", " + j);
						document.querySelector(cellClassName).innerHTML = msg.board[i][j];
					}
				}
				break;
			case 'gameOver':
				console.log(msg.msg);
				// update board
				for (i = 0; i < 3; i++) {
					for (j = 0; j < 3; j++) {
						var cellClassName = ".cell-" + i + "-" + j;
						// console.log("setting cell with class name " + cellClassName + " at " + i + ", " + j);
						document.querySelector(cellClassName).innerHTML = msg.board[i][j];
					}
				}
				// tell client why the game is over
				waitingElement.innerHTML = msg.msg;
				// remove event listeners from board
				for (i = 0; i < 3; i++) {
					for (j = 0; i < 3; j++) {
						var cellClassName = ".cell-" + i + "-" + j;
						document.querySelector(cellClassName).removeEventListener('click', () => {
							console.log("removing event listener on cell with class ", cellClassName);
						});
					}
				}
			default:
				console.log("unknown message received from server");
		}
	});

	// when disconnected from server
	socket.on('disconnect', function() {
		console.log('Disconnected from server');
		clientIdElement.innerHTML = "";
		gameIdElement.innerHTML = "";
		clientId = "";
		gameId = "";
		waitingElement.innerHTML = disconnectMessage;
		for (i = 0; i < 3; i++) {
			for (j = 0; j < 3; j++) {
				var cellClassName = ".cell-" + i + "-" + j;
				document.querySelector(cellClassName).innerHTML = " ";
				console.log("removing event listener on cell with class name ", cellClassName);
				document.querySelector(cellClassName).removeEventListener('click', () => {
					console.log("removing event listener on cell ", cellClassName);
				});
			}
		}
		connectButton.disabled = false;
		newGameButton.disabled = false;
		availableGamesTable.classList.add("table-hover");
	});

	newGameButton.addEventListener('click', (src) => {
		if (!isUserConnected()) { return; }

		// send message to server to create new game
		socket.emit('createMessage', {
			'tag': 'newGame',
			'clientId': clientId,
		});
	});

	

});

