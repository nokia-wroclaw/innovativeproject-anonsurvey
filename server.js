//initial comment
var http = require('http');
var url = require('url');
var fs = require('fs');
var qs = require('querystring');


function index(req, res)
{
	var HTML = fs.readFileSync("index.html");
	res.writeHead(200, {'Content-Type': 'text/html'});
  	res.write(HTML);
  	res.end();
}

function signIn(req, res)
{
	var requestData = "";
	res.writeHead(200, {'Content-Type': 'text/html'});

	if (req.method == "POST") {
		req.setEncoding('utf-8');
		req.on('data', function(data) {
			requestData += data;
		});
		req.on('end', function() {
			var postData = qs.parse(requestData);
			res.write('<h1>Your nickname is: '+ postData.name + '</h1>'); //postData.name to login
			res.write('<h1>Your #password is: '+ postData.password + '</h1>'); //postData.password to haslo

			if(true) {
				//logowanie poprawne 
			}
			else 	{
				//logowanie niepoprawne	
			}
			
		});
	}
	else 
	{
		res.write("<h1>bez post</h1>");	
		res.end();
	}
	
}

function render404(req,res)
{
	res.writeHead(404);
	res.end('File not found');
}

var server = http.createServer(function (req, res) {

	var signInRegex = new RegExp('/signIn/*');
	var indexRegex = new RegExp('/*');
	var pathname = url.parse(req.url).pathname;
	
	if(signInRegex.test(pathname)) {
		signIn(req,res);
	}
	else if(indexRegex.test(pathname)) {
		index(req,res);
	}
	else {
		render404(req,res);
	}
});

server.listen(1337, '127.0.0.1');
console.log('Server running at http://127.0.0.1:1337/');
