const prompt = require('prompt-sync')();

const Users = {
	blank: " ",
	user1: "X",
	user2: "O"
}
const numRows = 3;
const numCols = 3;

function printBoard(board) {
	for (row_index in board) {
		console.log(board[row_index]);
	}
}

function printWinner(user) {
	console.log("User '" + user + "' has won! woohoo!");
}

function printGameOver() {
	console.log("Game over :)");
}

function chooseSpot(user, board) {
	console.log();
	console.log("User '" + user + "', your turn!");
	var row = -1;

	isNotAvailable = true;
	while (isNotAvailable) {
		while (isNaN(row) || row < 0 || row > 2) {
			row = prompt("User '" + user + "', please enter a valid row index [0,1,2]: ");
		}
		var col = -1;
		while (isNaN(col) || col < 0 || col > 2) {
			col = prompt("User '" + user + "', please enter a valid column index [0,1,2]: ");
		}
		if (board[row][col] == Users.blank) {
			isNotAvailable = false;
			break;
		}
		console.log("spot is taken!");
	}
	return {
		'row': row,
		'col': col
	};
}

function updateBoard(user, row, col, board) {
	board[row][col] = user;
}

function spotsStillAvailable(board) {
	for (i = 0; i < numRows; i++) {
		for (j = 0; j < numCols; j++) {
			if (board[i][j] == Users.blank) {
				return true;
			}
		}
	}
	return false;
}

function userHasWon(user, board) {
	// check rows
	for (i = 0; i < numRows; i++) {
		if (board[i][0] == user && board[i][1] == user && board[i][2] == user) {
			return true;
		}
	}
	// check cols
	for (j = 0; j < numCols; j++) {
		if (board[0][j] == user && board[1][j] == user && board[2][j] == user) {
			return true;
		}
	}
	// check diagonals
	if (board[0][0] == user && board[1][1] == user && board[2][2] == user) {
		return true;
	}
	if (board[0][2] == user && board[1][1] == user && board[2][0] == user) {
		return true;
	}
	return false;
}

function playGame() {
	// setup
	var board = [
		[Users.blank, Users.blank, Users.blank], 
		[Users.blank, Users.blank, Users.blank],
		[Users.blank, Users.blank, Users.blank]
	];
	var currentUser = Users.user1;

	// the game
	console.log("Welcome to tic-tac-toe! Let's play!")
	while (spotsStillAvailable(board)) {
		// user takes turn
		coordinate = chooseSpot(currentUser, board);
		updateBoard(currentUser, coordinate.row, coordinate.col, board);
		printBoard(board);
		// check if user won
		if (userHasWon(currentUser, board)) {
			printWinner(currentUser);
			break;
		}
		// switch user
		if (currentUser == Users.user1) {
			currentUser = Users.user2;
		} else {
			currentUser = Users.user1;
		}
	}
	printGameOver();
}

playGame();