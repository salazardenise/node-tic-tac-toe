const express = require('express');
const app = express();
const exphbs = require('express-handlebars');
// pushing to a web host, will pick up PORT env var
// locally, port is 5000
const PORT = process.env.PORT || 5000;

// Set Handlebars middleware
app.engine('handlebars', exphbs.engine());
app.set('view engine', 'handlebars');
app.set('views', './views');

// set handlebar routes
app.get('/', (req, res) => {
	res.render('home', {
		// send stuff to handlebars here
	});
});

app.listen(PORT, () => console.log("Sever Listening on port " + PORT));

