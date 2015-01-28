var express = require('express');
var router = express.Router();
var CryptoJS= require('crypto-js');
var nodemailer = require('nodemailer');

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
    var gotosurveyid = req.query["gotosurvey"];
    var gotoresultid = req.query["gotoresult"];
    res.render('index', { title: 'Annonymous Surveys',
        gotosurvey : gotosurveyid,
        gotoresult : gotoresultid
    });
});

/* GET Hello World page. */
router.get('/helloworld', function(req, res) {
    
    var transporter = nodemailer.createTransport({
        service: 'Gmail',
        auth: {
            user: 'magic.survey.app@gmail.com',
            pass: 'magic2014'
        }
    }); 

    var mailOptions = {
    from: 'magic.survey.app@gmail.com',    
    to: 'ma0pla@gmail.com', // list of receivers
    subject: 'Welcome to Magic Survey App', // Subject line
    text: 'Welcome to Magic Survey App!!!', // plaintext body
    };
    // send mail with defined transport object
    transporter.sendMail(mailOptions, function(error, info){
        if(error){
            console.log(error);
        }else{
            console.log('Message sent: ' + info.response);
        }
    });
    //res.render('helloworld', { title: 'Hello, World!' })
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
router.post('/adduser',adduserFunction);


function adduserFunction(req, res) {

    // Set our internal DB variable
    var db = req.db;

    // Get our form values. These rely on the "name" attributes
    var userName = String(req.body.username);
    var userSurname = String(req.body.usersurname);
    var userEmail = String(req.body.useremail);
    var userPassword = String(req.body.userpassword);
    var userRepeatPassword = String(req.body.userrepeatpassword);

    var reg = /^[a-zA-ZąćęłńóśżźĄĆĘŁŃÓŚŻŹ]{2,20}$/;
    var regMail = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,4}$/;

    if((userName.match(reg)) && (userSurname.match(reg)) && (userEmail.match(regMail)) && (!userPassword=="") && (userPassword==userRepeatPassword) ){
    
        // Set our collection
        var collection = db.get('usercollection');

        collection.count({"useremail" : userEmail},function(err, count){
            if(count==0){
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
                        "userregdate" : new Date(),
                        "userpassword" : String(CryptoJS.SHA3(userPassword))
                    }, function (err, doc) {
                        if (err) {
                            // If it failed, return error
                            var ecom = "There was a problem during adding the information to the database.";
                            res.render('errorpage', { "error" : ecom, "page" : "/profile" });
                            return;
                        }
                        else {
                            // If it worked, set the header so the address bar doesn't still say /adduser
                            res.location("/");
                            // And forward to success page
                            res.redirect("/");
                        }
                    });
                });
            }
            else
            {var ecom = "Account already exists.";
                res.render('newuser', { "error" : ecom });}
        });
    }
    else
    {var ecom = "Incorrect data. Please try again!";
                res.render('newuser', { "error" : ecom });}
}


/* GET Forgot Password page. */
router.get('/forgotpassword', function(req, res) {

    res.render('forgotpassword', { title: 'Forgot Password' });
});

router.post('/forgotpasswordsendemail', function(req, res) {
    
    var youremail = req.body.youremail;
    var regMail = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,4}$/;

    if(!youremail.match(regMail)){
        var ecom = "Incorrect e-mail address!";
        res.render('errorpage', { "error" : ecom, "page" : "/" });
        return;
    }

    var db = req.db;
    var collection = db.get('usercollection');
    collection.count({"useremail" : youremail},function(err, count){
        if(count==0){
            var ecom = "We don't have this e-mail address in our database - you can register.";
            res.render('errorpage', { "error" : ecom, "page" : "/" });
            return;
        }
        else{
            collection.find({"useremail" : youremail, "userstatus" : {$in : ["A","N"]}},function(err, doc){
                
                var hashpass = String(CryptoJS.SHA3(doc[0].userpassword+doc[0].useremail)).substring(0, 20);

                var link = "https://magic-survey-app.herokuapp.com/forgotpassword2?email="+youremail+"&id="+hashpass;
                var text = "In order to set a new password click this link:\n"+link+"\nBye";

                sendmail(youremail,"Magic Survey App - new password", text);

                res.render('forgotpassword', { 
                    title: 'Forgot Password',
                    info: "E-mail confirming password change was sent to you." 
                });
            });
        }
    });
});

/* GET Forgot Password Next Step page. */
router.get('/forgotpassword2', function(req, res) {

    var youremail = req.query['email'];
    var hash = req.query['id'];
    
    var db = req.db;
    var collection = db.get('usercollection');
    collection.count({"useremail" : youremail},function(err, count){
        if(count==0){
            var ecom = "There is not such an e-mail in our database - you can register";
            res.render('errorpage', { "error" : ecom, "page" : "/" });
            return;            
        }
        else{
            collection.find({"useremail" : youremail, "userstatus" : {$in : ["A","N"]}},function(err, doc){
            
                if(hash == String(CryptoJS.SHA3(doc[0].userpassword+doc[0].useremail)).substring(0, 20)){

                    res.render('forgotpassword2', { 
                        title: 'Forgot Password',
                        info: doc[0] 
                    });    
                }
                else{

                    var ecom = "Something went wrong! Please try again.";
                    res.render('errorpage', { "error" : ecom, "page" : "/" });
                    return;
                }
            });
        }
    });

});

router.post('/setnewpassword', function(req, res) {

    var userName = req.body.yourname;
    var userSurname = req.body.yoursurname;
    var userEmail = req.body.youremail;
    var userPassword = req.body.yournewpass;
    var userRepeatPassword = req.body.yournewpass2;

    var reg = /^[a-zA-ZąćęłńóśżźĄĆĘŁŃÓŚŻŹ]{2,20}$/;
    var regMail = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,4}$/;

    if (!((userName.match(reg)) && (userSurname.match(reg)) && (userEmail.match(regMail)) && (!userPassword=="") && (userPassword==userRepeatPassword))){
        var ecom = "Incorrect data";
        res.render('errorpage', { "error" : ecom, "page" : "/" });
        return;
    }

    
    var db = req.db;
    var collection = db.get('usercollection');
 
    collection.update({"useremail" : userEmail, "userstatus" : {$in : ["A","N"]}},{$set: {"userstatus" : "U"}},function (err1, docup){ //user is unactive

        collection.count({},function (err2, count){
            userid = count+1;  
            // Submit to the DB
            collection.insert({
                "userid" : userid,
                "userstatus" : "N",  //user is new active
                "username" : userName,
                "usersurname" : userSurname,
                "useremail" : userEmail,
                "userregdate" : new Date(),
                "userpassword" : String(CryptoJS.SHA3(userPassword))
            }, function (err, doc) {
                if (err) {
                    // If it failed, return error
                    var ecom = "There was a problem during adding the information to the database";
                    res.render('errorpage', { "error" : ecom, "page" : "/" });
                    return;
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
});

/* GET Sign In page. */
router.get('/signin', function(req, res) {
    res.render('signin', { title: 'Sign In' });
});



function profileFunction(req, res){
        // Set our internal DB variable
    var db = req.db;
    
    var gotosurveyid = req.body.gotosurveyid;
    var gotoresultid = req.body.gotoresultid;

 
    if(req.body.useremail != undefined ){    

        var userEmail = req.body.useremail;
        var userPassword = req.body.userpassword;
        userPassword = String(CryptoJS.SHA3(userPassword));
        var cookieSet = false;

    }
    else {
        if( req.session.user ){
        var userEmail = req.session.user.useremail;
        var userPassword = req.session.user.userpassword; 
        var cookieSet = true;
        } else {
                res.render('index', { title: 'Annonymous Surveys' });
        }
    }   
    // Set our collection
    var collection = db.get('usercollection');

    collection.findOne({"useremail" : userEmail,"userstatus" : {$in : ["A","N"]}, "userpassword" : userPassword },function(err, user){
       
        if(user!=null)
        {

            if(cookieSet == false) req.session.user = user; // jeżeli cookie jest ustawione, to nie ustawiamy jeszcze raz

            if(gotosurveyid != undefined && gotosurveyid != ""){
                // If it worked, set the header so the address bar doesn't still say /adduser
                res.location("/gotosurvey");
                // And forward to success page
                res.redirect("/gotosurvey?id="+gotosurveyid);
                return;
            }
            else if(gotoresultid != undefined && gotoresultid != ""){
                // If it worked, set the header so the address bar doesn't still say /adduser
                res.location("/result");
                // And forward to success page
                res.redirect("/result?survey="+gotoresultid);
                return;
            }

                      
            if(user.userstatus == "A"){
                var date = new Date(0);
            }
            else {
                var date = new Date(user.userregdate);
            }
            var collection2 = db.get('usersurveycollection');
            collection2.find({ "email" : userEmail, "status" : "active" , "adddate" : { $gt : date } },function(e,docs2) {
                var list = [];
                for (i=0; i<docs2.length; i++) {
            
                    list[list.length] = parseInt(docs2[i].surveyid);
                }

                var collection3 = db.get('surveycollection');

                collection3.find({"surveyid" : {$in : list}},function(e, docs3) {

                    collection3.find({ "surveyowner" : userEmail,"surveystatus" : "active"}, function(e, docs4){

                        res.render('profile', {
                        title: 'Your Profile',
                            "profile" : user,
                            "surveys" : docs3,
                            "surveysowner" : docs4,
                        });
                    });
                });
            });
        }
        else
        {
                var ecom = "Incorrect data. If you don't have an account - Sign up";
                res.render('index', { "error" : ecom });
        }
    });
};
/* GET to Verify Sign In Service */
router.get('/profile', profileFunction);

/* POST to Verify Sign In Service */
router.post('/profile', profileFunction);

/* GET Creator page. */
router.get('/creator', function(req, res) {

    if( !req.session.user ) res.render('index', { title: 'Annonymous Surveys' });
    var x = new Date();
    var today = x.getFullYear().toString();
    if(x.getMonth()>9){
        today = today+"-"+(x.getMonth()+1).toString();
    }
    else{
        today = today+"-0"+(x.getMonth()+1).toString();
    }
        if(x.getDate()>9){
        today = today+"-"+x.getDate().toString();
    }
    else{
        today = today+"-0"+x.getDate().toString();
    }
    res.render('creator', { title: 'Survey Creator', todaydate : today });
});

/* GET Change Password page. */
router.get('/changepassword', function(req, res) {
    res.render('changepassword', { title: 'Change your password' });
});

router.get('/logout', function(req, res){
    req.session.reset();
    res.redirect('/');
});

function changepassword(req,res,email,oldpass,newpass,next){
    var db = req.db;
    var collection = db.get('usercollection');

    collection.update({"useremail" : email, "userstatus" : {$in : ["A","N"]},"userpassword" : String(CryptoJS.SHA3(oldpass))}, {$set: {"userpassword" : String(CryptoJS.SHA3(newpass))}},function(err, count, status){
            next(req,res,email,oldpass,newpass);
    });
};
function changehash(req,res,email,oldpass,newpass){

    var db = req.db;
    var collection = db.get('usersurveycollection');
    collection.find({"email" : email},function(err,doc){
        var i = 0;
        function loop2(){
            if(i<doc.length){

                var stringToCheck = email + oldpass + doc[i].surveyid;
                stringToCheck = String(CryptoJS.SHA3(stringToCheck));

                var newStringToCheck = email + newpass + doc[i].surveyid;
                newStringToCheck = String(CryptoJS.SHA3(newStringToCheck));

                var collectionloop = db.get("surveyanswers"+doc[i].surveyid);

                collectionloop.update({"user" : stringToCheck},{$set: {"user" : newStringToCheck}},function(err, count, status){
                    i++;
                    loop2();
                });
            }
            else{
                var ecom = "Password is changed";
                res.render('errorpage', { "success" : ecom, "page" : "/" });
                return;
            }
        }
        loop2();
    });
};

/* GET Creator page. */
router.post('/changepassword2', function(req, res) {
    var email = req.session.user.useremail;
    var oldpass = req.body.oldpass;
    var newpass = req.body.newpass;
    var newpass2 = req.body.newpass2;
    if((newpass != "") && (newpass==newpass2)){
        var db = req.db;
        var collection = db.get("usercollection");

        collection.count({"useremail" : email, "userstatus" : {$in : ["A","N"]}, "userpassword" : String(CryptoJS.SHA3(oldpass))},function(err, count){//$in:[A,N]
            if(count==1){
                changepassword(req,res,email,oldpass,newpass,changehash);
            }
            else{
                var ecom = "Incorrect current password";
                res.render('errorpage', { "error" : ecom, "page" : "/profile" });
                return;
            }
        });
    }
    else {
        var ecom = "Incorrect new password";
        res.render('errorpage', { "error" : ecom, "page" : "/profile" });
        return;
    }
  
});

/*Link to survey*/
router.get('/gotosurvey', function(req, res){
    
    var surveyid = req.query['id'];
    if(surveyid == undefined || surveyid == "")

    {
        var ecom = "There is no survey with this number";
        res.render('errorpage', { "error" : ecom, "page" : "/profile" });
        return;
    } 
    var db = req.db;
    // Get our form values. These rely on the "name" attributes
    if(!req.session.user){    
        // If it worked, set the header so the address bar doesn't still say /adduser
        res.location("/");
        // And forward to success page
        res.redirect("/?gotosurvey="+surveyid);
        return;
    }
    else {

        var userEmail = req.session.user.useremail;
        var userPassword = req.session.user.userpassword;

    }   
    // Set our collection
    var collection = db.get('usercollection');

    collection.find({"useremail" : userEmail,"userstatus" : {$in : ["A","N"]}, "userpassword" : userPassword },function(err, find){
        if(find.length==1){

            var collection2 = db.get('surveycollection');

            collection2.find({"surveyid" : parseInt(surveyid)}, function(err,doc){
                
                if(doc[0]==undefined || doc[0]==""){
                    var ecom = "Wrong number of survey";
                    res.render('errorpage', { "error" : ecom, "page" : "/profile" });
                    return;
                }
                var collection3 = db.get('usersurveycollection');
                if(new Date(doc[0].surveystart)>new Date()){
                    var ecom = "It is too early for answer";
                    res.render('errorpage', { "info" : ecom, "page" : "/profile" });
                    return;
                }
                if(doc[0].whoanswer == "invited"){

                    collection3.find({"surveyid" : surveyid, "email" : userEmail}, function(err,find3){

                        if(find3.length>0){
                            if(find[0].userstatus == "N"){
                                if(find3[0].adddate > find[0].userregdate){

                                    res.render('gotosurvey', {
                                        "surveyid" : surveyid,
                                    });
                                        
                                }
                                else
                                    var ecom = "You can't fill neither check this survey - after changing the password, you don't have access to old surveys (1)";
                                    res.render('errorpage', { "error" : ecom, "page" : "/profile" });
                                    return;
                            }
                            else{
                                res.render('gotosurvey', {
                                    "surveyid" : surveyid,
                                });
                            }
                        }
                        else{
                            var ecom = "You are not invited to fill this survey";
                            res.render('errorpage', { "info" : ecom, "page" : "/profile" });
                            return;                            
                        }

                    });
                }
                else if(doc[0].whoanswer == "everybody"){

                        collection3.count({"surveyid" : surveyid, "email" : userEmail}, function(err,count3){
                            if(count3==0){
                                collection3.insert({
                                    "surveyid" : surveyid, 
                                    "email" : userEmail,
                                    "status" : "active",
                                    "adddate" : new Date()
                                }, function(err,doc3){
                                    if (err) {
                                        // If it failed, return error
                                        var ecom = "There was a problem during adding the information to the database.";
                                        res.render('errorpage', { "error" : ecom, "page" : "/profile" });
                                        return;
                                    }
                                    else {
                                        res.render('gotosurvey', {
                                            "surveyid" : surveyid,
                                        });
                                    }
                                });
                            }
                            else {
                                if((find[0].userstatus == "A") || (find[0].userstatus == "N" && doc[0].surveystart > find[0].userregdate)){
                                    res.render('gotosurvey', {
                                        "surveyid" : surveyid,
                                    });
                                }
                                else if(find[0].userstatus == "N"){

                                    collection3.find({"surveyid" : surveyid, "email" : userEmail}, function(err,find3){
                                        if(find3.length>0 && find3[0].adddate > find[0].userregdate){
                                            res.render('gotosurvey', {
                                                "surveyid" : surveyid,
                                            });
                                        }
                                        else{
                                            var ecom = "You can't fill neither check this survey - after changing the password, you don't have access to old surveys (2).";
                                            res.render('errorpage', { "error" : ecom, "page" : "/profile" });
                                            return;
                                        }
                                    });
                                }
                                else{
                                    var ecom = "You can't fill neither check this survey - after changing the password, you don't have access to old surveys (3).";
                                    res.render('errorpage', { "error" : ecom, "page" : "/profile" });
                                    return;
                                }      
                            }
                        });
                }
           
            });
        }
        else {
            var ecom = "Is problem with you";
            res.render('errorpage', { "info" : ecom, "page" : "/profile" });
            return;
        }

    });
});

/* POST to Add Survey Service */
router.post('/addsurvey', function(req, res) {

    var useremail = req.session.user.useremail;
    
    var surveyname = req.body.surveyname;
    var quest = req.body.question;

    var startdate = new Date(req.body.startofsurvey);
    startdate.setHours(0);
    startdate.setMinutes(0);
    startdate.setSeconds(1);
    var enddate = new Date(req.body.endofsurvey);
    enddate.setHours(23);
    enddate.setMinutes(59);
    enddate.setSeconds(59);
    if( typeof quest === 'string' ) {
        quest = [ quest ];
    }
    var questions = [];
    for(i=0;i<quest.length; i++){
        var answers = [];
        var answerslength = 0;
        switch(req.body.answertype[i]){
            case "text":

                break;
            case "textarea":

                break;
            case "date":

                break;
            case "range":
                answers = req.body.answer[i];
                answerslength = answers.length;
                break;
            case "checkbox":
                if(typeof req.body.answer[i] === 'string'){
                    answers = [ req.body.answer[i] ];
                    answerslength = 1;
                }
                else {
                    answers = req.body.answer[i];
                    answerslength = answers.length;
                }
                break;
            case "radio":
                if(typeof req.body.answer[i] === 'string'){
                    answers = [ req.body.answer[i] ];
                    answerslength = 1;
                }
                else {
                    answers = req.body.answer[i];
                    answerslength = answers.length;
                }
                break;
        }
        
        questions[i] = {
        "questionnumber" : i,
        "question" : req.body.question[i],  
        "answertype" : req.body.answertype[i],
        "availbeanswers" : answers,
        "answercount" : answerslength,
        "otheranswer" : req.body.otheranswer[i],
        }; 
    }    
    
    var db = req.db;
    var collection = db.get('surveycollection');
        collection.count({},function(err, count){
            surveyid = count+1;  
            // Submit to the DB
            collection.insert({
                "surveyname" : surveyname,
                "surveyowner" : useremail,
                "surveyid" : surveyid,
                "surveystatus" : "active",
                "surveystart" : startdate,
                "surveyend" : req.body.endofsurvey,
                "surveyend2" : enddate,
                "whoanswer" : req.body.whoanswer,
                "whoseeresult" : req.body.whoseeresult, 
                "questions" : questions,
                "questionscount" : req.body.question.length
            }, function (err, doc) {
                if (err) {
                    // If it failed, return error
                    var ecom = "There was a problem during adding the information to the database.";
                    res.render('errorpage', { "error" : ecom, "page" : "/profile" });
                    return;
                }
                else {
                    // If it worked, set the header so the address bar doesn't still say /adduser
                    res.location("/chooseuser");
                    // And forward to success page
                    res.redirect("/chooseuser?survey="+surveyid+"&start="+startdate);
                }
            });
        });
        
});

router.get('/chooseuser', function(req, res) {
    var db = req.db;
    var collection = db.get('usercollection');
    var surveyid = req.query['survey'];
    var startdate = req.query['start'];

    collection.find({},{},function(e,docs){
        res.render('chooseuser', {
            title: 'Choose users who can answer from the list', 
            getsurveyid : surveyid,
            getstartdate : startdate
        });
    });
});

/* GET Hello World page. */
function sendmail(aemail, asubject, atext) {
    var transporter = nodemailer.createTransport({
        service: 'Gmail',
        auth: {
            user: 'magic.survey.app@gmail.com',
            pass: 'magic2014'
        }
    }); 

    var mailOptions = {
    from: 'magic.survey.app@gmail.com',    
    to: aemail.toString(), // list of receivers
    subject: asubject.toString(), // Subject line
    text: atext.toString(), // plaintext body
    };
    // send mail with defined transport object
    transporter.sendMail(mailOptions, function(error, info){
        if(error){
            console.log(error);
        }else{
            console.log('Message sent: ' + info.response);
        }
    });
    //res.render('helloworld', { title: 'Hello, World!' })
};

router.post('/adduserstosurvey', function(req, res) {

    var db = req.db;
    var surveyid = req.body.surveyid;
    var startdate = req.body.startdate;
    if(startdate == undefined || startdate == ""){
        startdate = new Date();
    }
    else{
        startdate = new Date(startdate);
    }
    var emails = req.body.email;
    if(emails == undefined || emails == ""){
        res.render('adduserstosurvey', {title: 'Survey made'});
        return;
    }

    if( typeof emails === 'string' ) {
        emails = [ emails ];
    }
   
    var collection = db.get('usersurveycollection');
    var collection2 = db.get('usercollection');
    var to = [];
    var i = 0;
    function adduserstosurvey(){
        if(i<emails.length)
        collection.count({"surveyid" : surveyid, "email" : emails[i]}, function(err,count3){
            if(count3==0){
                collection.insert({
                    "surveyid" : surveyid, 
                    "email" : emails[i],
                    "status" : "active",
                    "adddate" : startdate
                }, function(err,doc3){
                    if (err) {
                        // If it failed, return error
                        var ecom = "There was a problem during adding the information to the database.";
                        res.render('errorpage', { "error" : ecom, "page" : "/profile" });
                        return;
                    }
                    i++;
                    adduserstosurvey();              
                });
            }
        });
    }
    adduserstosurvey();
    var j = 0;
    function loop(){
        if(j<emails.length){
            collection2.count({"useremail" : emails[j].toString()},function(err, count){
            if(count>0){
                var to = emails[j].toString();
                var sub = "Magic Survey App - You have a new invitation to fill a survey";
                var text = "Open this link: \nhttps://magic-survey-app.herokuapp.com/gotosurvey?id="+surveyid.toString()+"\nBye ;)";
                sendmail(to, sub, text);
            }
            else{
                //rejestrcyjny
                var to = emails[j].toString();
                var sub = "Magic Survey App - You have an invitation to fill a survey";
                var text = "Register and then open this link: \nhttps://magic-survey-app.herokuapp.com/gotosurvey?id="+surveyid.toString()+"\nBye ;)";
                sendmail(to, sub, text);
            }
            j++;
            loop();
            });
        }
    }
    loop();
    var ecom = "People have been invited";
    res.render('errorpage', { "success" : ecom, "page" : "/profile" });
});

router.post('/unactivesurvey', function(req,res){
    var surveyID = req.body.surveyid;
    var userEmail = req.session.user.useremail;
    var db = req.db;
    var collection = db.get('usersurveycollection');
    collection.update({"surveyid" : surveyID, "email" : userEmail}, {$set: {"status": "unactive"}},function(err, count, status){
        if (err){
            // If it failed, return error
            res.send("There was a problem during adding the information to the database.");
        }
        else{
            res.send("Survey number "+surveyID+" is forgotten");
        }
    });
});

router.post('/ounactivesurvey', function(req,res){
    var surveyID = req.body.surveyid;
    var userEmail = req.session.user.useremail;
    var db = req.db;
    var collection = db.get('surveycollection');
    collection.update({"surveyid" : parseInt(surveyID), "surveyowner" : userEmail}, {$set: {"surveystatus": "unactive"}},function(err, count, status){
        if (err){
            // If it failed, return error
            res.send("There was a problem during adding the information to the database.");
        }
        else{
            res.send("Survey number "+surveyID+" is forgotten");
        }
    });
});

router.post('/fillorcheck', function(req,res){

        var db = req.db;

        var useremail = req.session.user.useremail;

        var userPassword = req.body.yourpassword;
        var userpass = String(CryptoJS.SHA3(userPassword));
        var surveyId = req.body.yoursurveyid; 
       
        var stringToCheck = useremail + userPassword + surveyId;
        stringToCheck = String(CryptoJS.SHA3(stringToCheck));

        var collection = db.get('usercollection');

        collection.count( { "useremail" : useremail,"userstatus" : {$in : ["A","N"]}, "userpassword" : userpass }, function(err, count){ //sprawdzanie poprawności hasła
        collection = db.get('surveycollection');
        collection.findOne({ "surveyid" : parseInt(surveyId) }, { "surveyname" : 1 }, function(err, name){
            if(count == 1){

                var baseName = 'surveyanswers' + surveyId;
                var collection = db.get(baseName);

                collection.count( {"user" : stringToCheck },function(err, count){ //sprawdzanie czy już istnieją w bazie odpowiedzi tego użytkownika

                    if( count == 1 ){

                        collection = db.get('surveycollection');
                        var number = parseInt(surveyId);
                        var questions = [];
                        collection.find({ "surveyid" : number }, function(e, docs1){ //Getting questions from database


                            for (var j = 0; j < docs1[0].questions.length; j++) questions.push(docs1[0].questions[j].question);
                            collection = db.get(baseName);
                            
                            collection.find( { user : stringToCheck  } ,  function(e,docs2) { //pobieranie odpowiedzi użytkownika z bazy

                                res.render('checkuseranswer', { 
                                    "answerlist" : docs2,
                                    "questionlist" : questions,
                                    "surveyname" : name
                                }); 
                            });
                        });
                    }
                    else
                    {
                        var collection = db.get('surveycollection');
                        var number = parseInt(surveyId);
                        collection.find({ "surveyid" : number }, function(e,docs) { //pobieramy pytania do żądanej ankiety
                            var today = new Date();
                            var startdate = new Date(docs[0].surveystart);
                            var enddate = new Date(docs[0].surveyend2);
                            if(today<startdate){

                                var ecom = "It is too early for answer";
                                res.render('errorpage', { "info" : ecom, "page" : "/profile" });
                                return;
                            }
                            if(today>enddate){

                                var ecom = "It is too late for answer";
                                res.render('errorpage', { "info" : ecom, "page" : "/profile" });
                                return;
                            }

                            res.render('fillingsurvey', {
                                "result" : docs ,
                                "user" : stringToCheck,
                                "surveyname" : name
                            });
                        });
                    }
                });
            }
            else
            {
                var ecom = "Incorrect password!";
                res.render('errorpage', { "error" : ecom, "page" : "/profile" });
                return;
            }
            });
        });

});

router.post('/answertobase', function(req,res){

    var db = req.db;
    
    var user = req.body.user; //Pobieranie hasha użytkownika
    var surveyid = req.body.surveyid; //Pobieranie numeru ankiety
    var questionsamount = req.body.questionsamount; //pobieranie ilości pytań
    var collection = db.get('surveycollection'); 
    var collectionSurvey = db.get('surveycollection');
                
    
    var answers = []; //Tu będziemy przechowywać pytania i odpowiedzi na nie

    collectionSurvey.find({ "surveyid" : parseInt(surveyid)}, function(err, find){ 

        for(var i = 0; i < questionsamount; i++){ // pobieranie odpowiedzi do pytań 

            var newAnswersAmount = 0;
            var strAnswer = "ans" + String(i);
            var ans = req.param(strAnswer,"No answer"); //Jeżeli nie ma odpowiedzi na to pytanie, to do bazy zapisujemy "No answer"

            //sprawdzamy, czy użytkownik udzielił swoich odpowiedzi w radiobuttonach i checkboxach
            strAnswer += "User"; 
            var ansUser = req.param(strAnswer,"No answer");

            answers[i]=[];       
            if( ansUser == 'No answer' || ansUser == ''){ //Tutaj sprawdzamy czy użytkownik udzielił własnych odpowiedzi i dodajemy je do bazy
                if ((find[0].questions[i].answertype=="checkbox")  &&  (typeof ans == 'string')){
                    answers[i][0] = ans; 
                } else answers[i] = ans; 
                     //Jeżeli nie to zapisujemy po prostu jego odpowiedzi do bazy
            }  else {                   //update, dodatkowe odpowiedzi w ankiecie. Obsługa w zalezności od ilości udzielonych odpowiedzi.
                var number = parseInt(surveyid);
                if(typeof ansUser == "string") {
                    collectionSurvey.update( { "surveyid" : number , questions: {$elemMatch: {questionnumber : parseInt(i)}}}, { $addToSet: {"questions.$.availbeanswers": ansUser}});
                    newAnswersAmount++; 
                } else {
                    for(var k = 0; k < ansUser.length; k++){
                        collectionSurvey.update( { "surveyid" : number , questions: {$elemMatch: {questionnumber : parseInt(i)}}}, { $addToSet: {"questions.$.availbeanswers": ansUser[k]}});
                        newAnswersAmount++; 
                    }
                }

                var j = 0;
                var answersArray = [];
                if(ans != 'No answer' && typeof ans == 'object') {
                    Array.prototype.push.apply(answersArray,ans);
                    j = ans.length;
                }
                else {
                    if( !(ans =='No answer') ){
                        answersArray[0] = ans;
                        j++;
                    }
                }
                if(typeof ansUser == 'string') answersArray[j] = ansUser;
                else Array.prototype.push.apply(answersArray,ansUser);

                answers[i] = answersArray;          
            }

            //update ilości odpowiedzi
            if(newAnswersAmount > 0) collectionSurvey.update( { "surveyid" : number , questions: {$elemMatch: {questionnumber : parseInt(i)}}}, { $inc: {"questions.$.answercount": newAnswersAmount }});  
        }    
        

    var baseName = 'surveyanswers' + surveyid; //sklejanie z numerem, żeby stworzyć bazę odpowiedzi danej ankiety
    var collection = db.get(baseName);

    collection.count({"user" : user},function(err, count){
        if(count==0){
            
            collection.insert({
                "user" : user,
                "answers" : answers,
                "questionsamount" : questionsamount
            }, function (err, doc) {
                if (err) {
                    var ecom = "There was a problem during adding the information to the database.";
                    res.render('errorpage', { "error" : ecom, "page" : "/profile" });
                    return;
                }
            });

        }
        else{
            var ecom = "There was a problem during adding the information to the database.";
            res.render('errorpage', { "error" : ecom, "page" : "/profile" });
            return;
        }
    });              



        var ecom = "Thank you for answering!";
        res.render('errorpage', { "success" : ecom, "page" : "/profile" });
        return;

    });
});


function CountFunctionRadio(all,wart,collection, docs , i, n){
    var howManyAnswerInQuestion = docs[0].questions[i].answercount;
    collection.find({}, function(err,ans){ 
            how =0;
            for (h=0;h<all;h++){
                if (String(ans[h].answers[i][0])==String(docs[0].questions[i].availbeanswers[n])) how++;
            }
           wart +="\n" + docs[0].questions[i].availbeanswers[n]+": " + how+ "\n";

           n++;
           if (n < howManyAnswerInQuestion) CountFunctionRadio(all,wart,collection, docs , i, n); 
       return wart;                                
    });
}

function CountFunctionCheckbox(all,wart,collection, docs, i, n){
    var howManyAnswerInQuestion = docs[0].questions[i].answercount;
    collection.find({}, function(err,ans){ 
            how =0;
            for (h=0;h<all;h++){
                for (l=0;l<howManyAnswerInQuestion;l++){
                if (String(ans[h].answers[i][l])==String(docs[0].questions[i].availbeanswers[n])) how++;
                }
            }
           wart +="\n" + docs[0].questions[i].availbeanswers[n]+": " + how+ "\n";
           n++;
           if (n < howManyAnswerInQuestion) CountFunctionCheckbox(all,wart,collection, docs , i, n); 
        return wart;                               
    });
}

router.get('/result', function(req, res){
    
    var resultid = req.query['survey'];
    if(resultid == undefined || resultid == "")
    {
        var ecom = "There is no survey with this number";
        res.render('errorpage', { "error" : ecom, "page" : "/profile" });
        return;
    } 
    // Get our form values. These rely on the "name" attributes
    if(!req.session.user){    
        // If it worked, set the header so the address bar doesn't still say /adduser
        res.location("/");
        // And forward to success page
        res.redirect("/?gotoresult="+resultid);
        return;
    }
    else {

        var userEmail = req.session.user.useremail;
        var userPassword = req.session.user.userpassword; // oczywiście w zmiennej zapisujemy hasz hasła, który znajduje się zaszyfrowany w cookie :)

    }   
    // Set our collection
    var db = req.db;
    var collection = db.get('usercollection');

    collection.count({"useremail" : userEmail, "userstatus" : {$in : ["A","N"]}, "userpassword" : userPassword },function(err, count){
        if(count==1){

            var collection2 = db.get('surveycollection');

            collection2.find({"surveyid" : parseInt(resultid)}, function(err,doc){
                if(doc[0]==undefined || doc[0]==""){
                    var ecom = "Wrong number of survey";
                    res.render('errorpage', { "error" : ecom, "page" : "/profile" });
                    return;
                }
                //owner of survey
                if((doc[0].whoseeresult == "onlyyou" || doc[0].whoseeresult == "youandwhoanswer") && doc[0].surveyowner == userEmail){

                    result(req,res);
                }
                else if(doc[0].whoseeresult == "everybody"){

                    result(req,res);
                }
                else if(doc[0].whoseeresult == "everywhoanswer" || doc[0].whoseeresult == "youandwhoanswer"){

                    res.render('seeresults', {
                        "verifypass" : resultid
                    });
                }
                else {
                    var ecom = "You are not allowed to see results of this survey";
                    res.render('errorpage', { "info" : ecom, "page" : "/profile" });
                    return;
                }   
            });
        }
        else {
            var ecom = "Is problem with you";
            res.render('errorpage', { "info" : ecom, "page" : "/profile" });
            return;
        }

    });
});

router.post('/result', function(req, res){
    
    var resultid = req.body.yourresultid;
    if(resultid == undefined || resultid == "")
    {
        var ecom = "There is no survey with this number";
        res.render('errorpage', { "error" : ecom, "page" : "/profile" });
        return;
    } 
    var userPassword = req.body.yourpassword;
    var userEmail = req.session.user.useremail;

    var stringToCheck = userEmail + userPassword + resultid;
    stringToCheck = String(CryptoJS.SHA3(stringToCheck));

    var db = req.db;
    var baseName = 'surveyanswers' + resultid;
    var collection = db.get(baseName);

    collection.count( {"user" : stringToCheck },function(err, count){ //sprawdzanie czy już istnieją w bazie odpowiedzi tego użytkownika
        if(count==1){
            result(req,res);
        } 
        else{
            res.render('seeresults', {
                    "result" : "You are not allowed to see results of this survey - wrong password or survey isn't filled yet." 
                });

        }   
    });
});

function result(req, res){

    var surveyid = req.query['survey']; //Pobieranie numeru ankiety
    if(surveyid == undefined || surveyid == ""){
        surveyid = req.body.yourresultid;
    }
    var db = req.db;

    var collectionUser = db.get('usersurveycollection');

    var baseName = 'surveyanswers' + surveyid;

    var collection = db.get(baseName);

    var odp = [];

    var ile = [];

    var co = [];


    collectionUser.count({"surveyid" : surveyid,}, function(err, all){

        collection.count({}, function(err, countt){

            var collectionSurvey = db.get('surveycollection');
                collectionSurvey.find({ "surveyid" : parseInt(surveyid) }, function(err, doc){ 

                    var sy = parseInt(doc[0].surveyend[0]+doc[0].surveyend[1]+doc[0].surveyend[2]+doc[0].surveyend[3]);
                    var sm = parseInt(doc[0].surveyend[5]+doc[0].surveyend[6]);
                    var sd = parseInt(doc[0].surveyend[8]+doc[0].surveyend[9]);
                    
                    var T = new Date();
                    var y = parseInt(T.getFullYear());
                    var m = parseInt(T.getMonth()+1);
                    var d = parseInt(T.getDay());

            if((doc[0].whoanswer == "everybody") || (countt > all/2) || (y>sy) || ((y=sy)&&(m>sm)) ||((y=sy)&&(m=sm)&&(d>=sd)))
            {
                    collectionSurvey.find({ "surveyid" : parseInt(surveyid) }, function(err, docs){ 

                    count = String(parseInt((countt/all)*100)) + "%";        //ile udzielono odpowiedzi

                    if(doc[0].whoanswer == "everybody") count = "NAN";
                     
                            var howManyQuestions =parseInt(docs[0].questionscount);

                            var srednia = [];
                            srednia[0]=0;
                            var i=0;
                            h=0;
                            n=0;
                            how =0;
                            h=0;
                            l=0;
                            odp[i]=[];
                            ile[i]= [];
                            ile[i][n]="";
                            odp[i][n]="";
                            co[i]= [];
                            co[i][n]="";
                            

                    collection.find({},function(err,find){

                   function CountFunction(){

                            if (i<howManyQuestions){

                                    if (docs[0].questions[i].answertype=="date"){
                                                
                                                if (h<countt){
                                                        odp[i][0]+=";-;-;"+find[h].answers[i];
                                                          h++;
                                                        CountFunction();
                                                }
                                                else h=0;
                                                i++;
                                                odp[i]=[];
                                                odp[i][0]="";
                                                ile[i]= [];
                                                co[i]=[];
                                                srednia[i]=0;
                                                CountFunction();
                                        

                                    }

                                    else if (docs[0].questions[i].answertype=="radio"){

                                        var howManyAnswerInQuestion = docs[0].questions[i].answercount;

                                        if (n < howManyAnswerInQuestion){ 

                                                if ((String(docs[0].questions[i].availbeanswers[n])=="") || (String(docs[0].questions[i].availbeanswers[n])=="undefined"))
                                                    {odp[i][n]="";
                                                     ile[i][n]="";
                                                     co[i][n]="";
                                                    n++;
                                                    CountFunction();
                                                    }

                                                else{
                                                
                                                    if (h<countt){
                                                        if (String(find[h].answers[i])==String(docs[0].questions[i].availbeanswers[n])) how++;
                                                        h++;
                                                        CountFunction();
                                                    }
                                                    else{
                                                    h=0;
                                                    ile[i][n]=how;
                                                    
                                                    if (n==0) {
                                                        odp[i][n] =docs[0].questions[i].availbeanswers[n]+"  : " + how;
                                                        co[i][n]=String(docs[0].questions[i].availbeanswers[n]);
                                                    }
                                                    else {
                                                        odp[i][n] =docs[0].questions[i].availbeanswers[n]+"  : " + how;
                                                        co[i][n]=";"+String(docs[0].questions[i].availbeanswers[n]);
                                                    }
                                                    how=0;
                                                    n++;
                                                    CountFunction();
                                                    }
                                                }
                                        }
                                        else{
                                        n=0;
                                        i++;
                                        odp[i]=[];
                                        odp[i][0]="";
                                        ile[i]= [];
                                        co[i]=[];
                                        srednia[i]=0;
                                        CountFunction();
                                        }
                                    }

                                    else if (docs[0].questions[i].answertype=="checkbox"){

                                        var howManyAnswerInQuestion = docs[0].questions[i].answercount;

                                        if (n < howManyAnswerInQuestion){


                                                if ((String(docs[0].questions[i].availbeanswers[n])=="") || (String(docs[0].questions[i].availbeanswers[n])=="undefined"))
                                                    {odp[i][n]="";
                                                    ile[i][n]="";
                                                     co[i][n]="";
                                                    n++;
                                                    CountFunction();
                                                    }
                                                else{
                                                
                                                    if (h<countt){
                                                        if (l<find[h].answers[i].length){
                                                            if (String(find[h].answers[i][l])==String(docs[0].questions[i].availbeanswers[n])) how++;
                                                            l++;
                                                            CountFunction();
                                                        }
                                                        else{ 
                                                        l=0;
                                                        h++;
                                                        CountFunction();
                                                        }
                                                    }
                                                    else{
                                                    h=0;
                                                    ile[i][n]=how;
                                                    
                                                    if (n==0) {
                                                        odp[i][n]=docs[0].questions[i].availbeanswers[n]+"  : " + how;
                                                        co[i][n]=String(docs[0].questions[i].availbeanswers[n]);
                                                    }
                                                    else {
                                                        odp[i][n] =docs[0].questions[i].availbeanswers[n]+"  : " + how;
                                                        co[i][n]=";"+String(docs[0].questions[i].availbeanswers[n]);
                                                    }
                                                    how=0;
                                                    n++;
                                                    CountFunction();
                                                    }
                                                }
                                        }
                                        else{
                                        n=0;
                                        i++;
                                        odp[i]=[];
                                        odp[i][0]="";
                                        srednia[i]=0;
                                        ile[i]= [];
                                        co[i]=[];
                                        CountFunction();
                                        }
                                    }

                                    else if (docs[0].questions[i].answertype=="range"){

                                            p=parseFloat(docs[0].questions[i].availbeanswers[0]);
                                           step=parseFloat(docs[0].questions[i].availbeanswers[2]);
                                            coile=parseFloat(p+(n*step));
                                            coile=Math.round(coile*100,2)/100;
                                           // console.log(coile);

                                                
                                                if (coile<=docs[0].questions[i].availbeanswers[1]){
                                                    if (h<countt){
                                                            if (String(find[h].answers[i])==String(coile)) how++;
                                                            h++;
                                                            CountFunction();
                                                    }
                                                    else h=0;
                                                    ile[i][n]=how;
                                                    co[i][n]=coile;
                                                    if (n==0) odp[i][n] =coile +":" + how;
                                                    else odp[i][n]=";" + coile +":" + how;
                                                    srednia[i]+=parseFloat(coile*how);
                                                    how=0;
                                                    n++;
                                                    CountFunction();
                                                }
                                                else n=0;  
                                                srednia[i]/=countt;
                   
                                                i++;
                                                ile[i]= [];
                                                co[i]=[];
                                                srednia[i]=0;
                                                odp[i]=[];
                                                odp[i][0]="";
                                                CountFunction();
                                    }

                                    else {
                                                if (h<countt){
                                                        odp[i][0]+=";-;-;"+find[h].answers[i];
                                                        h++;
                                                        CountFunction();
                                                }
                                                else h=0;
                                                i++;
                                                ile[i]= [];
                                                co[i]=[];
                                                odp[i]=[];
                                                odp[i][0]="";
                                                srednia[i]=0;
                                                CountFunction();


                                    }
                            }
                    }
                            i=0;
                            CountFunction();                         
                            
                            
                            res.render('seeresults', {
                                "count" : count,"countt" : countt, "co" : co, "srednia" : srednia, "results" : docs, "odp" : odp, "ile" : ile
                            });
                    });
                  
                });
            }
            else
            {   
                var result = "Results are not available yet. At least fifty percent of respondents must fill this survey.";
                res.render('seeresults', {
                    "result" : result 
                });

            }
            });
            
        });
    });
};


module.exports = router;
