var express = require('express');
var router = express.Router();

var Db = require('mongodb').Db,
    MongoClient = require('mongodb').MongoClient,
    Server = require('mongodb').Server,
    ReplSetServers = require('mongodb').ReplSetServers,
    ObjectID = require('mongodb').ObjectID,
    Binary = require('mongodb').Binary,
    GridStore = require('mongodb').GridStore,
    Grid = require('mongodb').Grid,
    Code = require('mongodb').Code,
    BSON = require('mongodb').pure().BSON,
    assert = require('assert');

/* GET home page. */
router.get('/', function(req, res) {
  res.render('index', { title: 'Annonymous Surveys' });
});

/* GET Hello World page. */
router.get('/helloworld', function(req, res) {
    res.render('helloworld', { title: 'Hello, World!' })
});

/* GET Userlist page. */
router.get('/userlist', function(req, res) {
    var db = req.db;
    var collection = db.get('usercollection');
    collection.find({},{},function(e,docs){
        res.render('userlist', {
        	title: 'User list',
            "userlist" : docs
        });
    });
});

/* GET New User page. */
router.get('/newuser', function(req, res) {
    res.render('newuser', { title: 'Add New User' });
});


/* POST to Add User Service */
router.post('/adduser', function(req, res) {

    // Set our internal DB variable
    var db = req.db;

    // Get our form values. These rely on the "name" attributes
    var userName = req.body.username;
    var userSurname = req.body.usersurname;
    var userEmail = req.body.useremail;
    var userPassword = req.body.userpassword;
    var userRepeatPassword = req.body.userrepeatpassword;


        // Set our collection
        var collection = db.get('usercollection');
        var userid=0;
        collection.count({},function(err, count){
            userid = count+1;  
        // Submit to the DB
            collection.insert({
                "userid" : userid,
                "userstatus" : "A",  //user is active
                "username" : userName,
                "usersurname" : userSurname,
                "useremail" : userEmail,
                "userpassword" : userPassword
            }, function (err, doc) {
                if (err) {
                    // If it failed, return error
                    res.send("There was a problem adding the information to the database.");
                }
                else {
                    // If it worked, set the header so the address bar doesn't still say /adduser
                    res.location("/");
                    // And forward to success page
                    res.redirect("/");
                }
            });
        });
});


/* GET Sign In page. */
router.get('/signin', function(req, res) {
    res.render('signin', { title: 'Sign In' });
});

/* POST to Verify Sign In Service */
router.post('/profile', function(req, res) {

    // Set our internal DB variable
    var db = req.db;

    // Get our form values. These rely on the "name" attributes
    var userEmail = req.body.useremail;
    var userPassword = req.body.userpassword;
    res.cookie('useremail', userEmail, { maxAge: 900000, httpOnly: true });

    // Set our collection
    var collection = db.get('usercollection');

	collection.count({"useremail" : userEmail, "userpassword" : userPassword},function(err, count){
  		if(count==1)
  		{
  			collection.find({"useremail" : userEmail, "userpassword" : userPassword},function(e,docs){
    		//console.log(docs.username);
  				res.render('profile', {
        				title: 'Your Profile',
            				"profile" : docs
        			});
  			});
  		}
  		else
  		{

  			// If it worked, set the header so the address bar doesn't still say /adduser
            		res.location("/");
            		// And forward to success page
            	res.redirect("/");
                
  		}
	});

});

/* GET Creator page. */
router.get('/creator', function(req, res) {
    res.render('creator', { title: 'Survey Creator' });
});

/* POST to Add Survey Service */
router.post('/addsurvey', function(req, res) {

    var surveyname = req.body.surveyname;
    var question = req.body.question;
    var answertype = req.body.answertype;
    var useremail = req.cookies.useremail;
    console.log(answertype);
    console.log(question);
    console.log(surveyname);
    console.log(useremail);

    var db = req.db;
    var collection = db.get('surveycollection');
    var surveyid = collection.count();
    /*collection.insert({
        "surveyname" : surveyname, 
        "surveyowner" : user}
        );
    }
    */


});


module.exports = router;
