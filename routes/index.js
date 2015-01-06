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
    var regMail = /^\w+[\w-\.]*\@\w+((-\w+)|(\w*))\.[a-z]{2,3}$/;

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
                        "userpassword" : String(CryptoJS.SHA3(userPassword))
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
            }
            else
            {var ecom = "Account already exists";
                res.render('newuser', { "error" : ecom });}
        });
    }
    else
    {var ecom = "Incorrect data.. Please, try again";
                res.render('newuser', { "error" : ecom });}
}


/* GET Forgot Password page. */
router.get('/forgotpassword', function(req, res) {
    res.render('forgotpassword', { title: 'Forgot Password' });
});

/* POST Forgot Password Next Step page. */
router.post('/forgotpassword2', function(req, res) {

    var youremail = req.body.youremail;

    var db = req.db;
    var collection = db.get('usercollection');
    collection.count({"useremail" : youremail},function(err, count){
        if(count==0){
            res.send("There is not e-mail in our database - You can register");
        }
        else{
            collection.find({"useremail" : youremail, "userstatus" : {$in : ["A","N"]}},function(err, doc){
            console.log(doc);
            res.render('forgotpassword2', { 
                title: 'Forgot Password',
                info: doc[0] 
            });
            });
        }
    });
});

/* GET Sign In page. */
router.get('/signin', function(req, res) {
    res.render('signin', { title: 'Sign In' });
});

function makeID()
{
    var text = "";
    var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

    for( var i=0; i < 40; i++ )
        text += possible.charAt(Math.floor(Math.random() * possible.length));

    return text;
}


function profileFunction(req,res){
        // Set our internal DB variable
    var db = req.db;
    
    var gotosurveyid = req.body.gotosurveyid;
    var gotoresultid = req.body.gotoresultid;
    //console.log("go to survey id: "+gotosurveyid);
    // Get our form values. These rely on the "name" attributes
    //console.log(req.body.useremail);
    if(req.body.useremail != undefined ){    
        var userEmail = req.body.useremail;
        var userPassword = req.body.userpassword;
    }
    else {
        //console.log(req.cookies.useremail);
        var userEmail = req.cookies.useremail;
        var userPassword = req.cookies.userpassword; 
    }   
    // Set our collection
    var collection = db.get('usercollection');

    collection.count({"useremail" : userEmail, "userpassword" : String(CryptoJS.SHA3(userPassword))},function(err, count){
        if(count==1)
        {
            var sessionId = makeID();
            res.cookie('sessionId', sessionId, { maxAge: 900000, httpOnly: true });
            res.cookie('useremail', userEmail, { maxAge: 900000, httpOnly: true });
            res.cookie('userpassword', userPassword, { maxAge: 900000, httpOnly: true });
            //console.log("go to survey id: "+gotosurveyid);
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
            collection.find({"useremail" : userEmail, "userpassword" : String(CryptoJS.SHA3(userPassword))},function(e,docs){
            
                var collection2 = db.get('usersurveycollection');

                collection2.find({"email" : userEmail},function(e,docs2) {
                    var list = [];
                    for (i=0; i<docs2.length; i++) {
                
                        list[list.length] = parseInt(docs2[i].surveyid);
                    }
                    //console.log(list);
                    //console.log(docs2.length);

                    var collection3 = db.get('surveycollection');

                    collection3.find({"surveyid" : {$in : list}},function(e, docs3) {

                        collection3.find({"surveyowner" : userEmail}, function(e, docs4){
                            //console.log(docs3);

                            res.render('profile', {
                            title: 'Your Profile',
                                "profile" : docs,
                                "surveys" : docs3,
                                "surveysowner" : docs4,
                            });
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
    res.render('creator', { title: 'Survey Creator' });
});

/* GET Change Password page. */
router.get('/changepassword', function(req, res) {
    res.render('changepassword', { title: 'Change your password' });
});

function changepassword(req,res,email,oldpass,newpass,next){
    var db = req.db;
    var collection = db.get('usercollection');

    collection.update({"useremail" : email, "userstatus" : {$in : ["A","N"]},"userpassword" : String(CryptoJS.SHA3(oldpass))}, {$set: {"userpassword" : String(CryptoJS.SHA3(newpass))}},function(err, count, status){
            //console.log(count);
            //console.log(status);
            next(req,res,email,oldpass,newpass);
    });
};
function changehash(req,res,email,oldpass,newpass){
    //console.log(email);
    //console.log(oldpass);
    //console.log(newpass);
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
                    //console.log(count+","+doc[i].surveyid+","+doc[i].email+","+email);
                    i++;
                    loop2();
                });
            }
            else{
                res.send("Password is changed");
            }
        }
        loop2();
    });
};

/* GET Creator page. */
router.post('/changepassword2', function(req, res) {
    var email = req.cookies.useremail;
    var oldpass = req.body.oldpass;
    var newpass = req.body.newpass;
    var newpass2 = req.body.newpass2;
    if((newpass != "") && (newpass==newpass2)){
        var db = req.db;
        var collection = db.get("usercollection");

        collection.count({"useremail" : email, "userstatus" : {$in : ["A","N"]},"userpassword" : String(CryptoJS.SHA3(oldpass))},function(err, count){//$in:[A,N]
            if(count==1){
                changepassword(req,res,email,oldpass,newpass,changehash);
            }
            else{
                res.send("Incorret current password");
            }
        });
    }
    else {
        res.send("Incorret new password");
    }
    //res.location("/profile");
    //res.redirect("/profile");
});

/*Link to survey*/
router.get('/gotosurvey', function(req, res){
    
    var surveyid = req.query['id'];
    if(surveyid == undefined || surveyid == "")
    {
        res.send("No no. of survey");
        return;
    } 
    var db = req.db;
    // Get our form values. These rely on the "name" attributes
    //console.log(req.body.useremail);
    if(req.cookies.useremail == undefined){    
        // If it worked, set the header so the address bar doesn't still say /adduser
        res.location("/");
        // And forward to success page
        res.redirect("/?gotosurvey="+surveyid);
        return;
    }
    else {
        //console.log(req.cookies.useremail);
        var userEmail = req.cookies.useremail;
        var userPassword = req.cookies.userpassword;
        //console.log(userEmail); 
       // console.log(surveyid); 
    }   
    // Set our collection
    var collection = db.get('usercollection');

    collection.count({"useremail" : userEmail, "userpassword" : String(CryptoJS.SHA3(userPassword))},function(err, count){
        if(count==1){

            //console.log(count);
            var collection2 = db.get('surveycollection');

            collection2.find({"surveyid" : parseInt(surveyid)}, function(err,doc){

                var collection3 = db.get('usersurveycollection');
                //console.log(doc[0].whoanswer);
                if(doc[0].whoanswer == "invited"){

                    collection3.count({"surveyid" : surveyid, "email" : userEmail}, function(err,count3){
                        console.log(count3);
                        if(count3>0){
                            res.render('gotosurvey', {
                                "surveyid" : surveyid,
                            });
                        }
                        else{
                            res.send("You are not invited to fill this survey");
                        }

                    });
                }
                else if(doc[0].whoanswer == "everybody"){

                        collection3.insert({"surveyid" : surveyid, "email" : userEmail}, function(err,doc3){
                            if (err) {
                            // If it failed, return error
                            res.send("There was a problem adding the information to the database.");
                        }
                        else {
                            res.render('gotosurvey', {
                                "surveyid" : surveyid,
                            });
                        }
                    });
                }
            });
        }
        else {
            res.send("Is problem with you");
            return;
        }

    });
});

/* POST to Add Survey Service */
router.post('/addsurvey', function(req, res) {

    var useremail = req.cookies.useremail;
    
    var surveyname = req.body.surveyname;
    var quest = req.body.question;
    console.log(quest);
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
                    res.send("There was a problem adding the information to the database.");
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
    //console.log(surveyid);
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
    //console.log(aemail);
    //console.log(asubject);
    //console.log(atext);

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
    //console.log(req.body);
    //console.log(req.body.email.length);
    var db = req.db;
    var surveyid = req.body.surveyid;
    var startdate = req.body.startdate;
    var emails = req.body.email;
    console.log(req.body.email);
    if( typeof emails === 'string' ) {
        emails = [ emails ];
    }
    //console.log(emails);
    //console.log(emails.length);
    var collection = db.get('usersurveycollection');
    var collection2 = db.get('usercollection');
    var to = [];
    for (i in emails) {
        //console.log(emails[i]);
        collection.insert({
            "surveyid" : surveyid, 
            "email" : emails[i],
            "status" : "active",
            "adddate" : startdate
        }, function (err, doc) {});
    }
    var j = 0;
    function loop(){
        if(j<emails.length){
            collection2.count({"useremail" : emails[j].toString()},function(err, count){
            if(count>0){
                //info
                //console.log()
                var to = emails[j].toString();
                console.log("info "+to);
                var sub = "Magic Survey App - You have new invitation to fill survey";
                var text = "Open this link: \nhttps://magic-survey-app.herokuapp.com/gotosurvey?id="+surveyid.toString()+"\nBye ;)";
                sendmail(to, sub, text);
            }
            else{
                //rejestrcyjny
                var to = emails[j].toString();
                //console.log("reg "+to);
                var sub = "Magic Survey App - You have a invitation to fill survey";
                var text = "Register and then open this link: \nhttps://magic-survey-app.herokuapp.com/gotosurvey?id="+surveyid.toString()+"\nBye ;)";
                sendmail(to, sub, text);
            }
            j++;
            loop();
            });
        }
    }
    loop();

    res.render('adduserstosurvey', {title: 'Survey made'});
});

router.post('/fillorcheck', function(req,res){

        var db = req.db;

        var useremail = req.cookies.useremail;

        var userPassword = req.body.yourpassword;
        var userpass = String(CryptoJS.SHA3(userPassword));
        var surveyId = req.body.yoursurveyid; 
       
        var stringToCheck = useremail + userPassword + surveyId;
        stringToCheck = String(CryptoJS.SHA3(stringToCheck));

        var collection = db.get('usercollection');

        collection.count( { "useremail" : useremail, "userpassword" : userpass }, function(err, count){ //sprawdzanie poprawności hasła
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
                                "questionlist" : questions
                            }); 
                        });
                    });

                }
                else
                {
                    var collection = db.get('surveycollection');
                    var number = parseInt(surveyId);
                    collection.find({ "surveyid" : number }, function(e,docs) { //pobieramy pytania do żądanej ankiety
                        res.render('fillingsurvey', {
                        "result" : docs ,
                        "user" : stringToCheck,
                        });
                    });
                }
            });
        }
        else
        {
            res.send("Incorrect password!");
        }
        });

});

router.post('/answertobase', function(req,res){

    var db = req.db;
    
    var user = req.body.user; //Pobieranie hasha użytkownika
    var surveyid = req.body.surveyid; //Pobieranie numeru ankiety
    var questionsamount = req.body.questionsamount; //pobieranie ilości pytań
    var collection = db.get('surveycollection'); 
    
    var answers = []; //Tu będziemy przechowywać pytania i odpowiedzi na nie

    for(var i = 0; i < questionsamount; i++){ // pobieranie odpowiedzi do pytań 

        var newAnswersAmount = 0;
        var strAnswer = "ans" + String(i);
        var ans = req.param(strAnswer,"No answer"); //Jeżeli nie ma odpowiedzi na to pytanie, to do bazy zapisujemy "No answer"

        //sprawdzamy, czy użytkownik udzielił swoich odpowiedzi w radiobuttonach i checkboxach
        strAnswer += "User"; 
        var ansUser = req.param(strAnswer,"No answer");
       
        if( ansUser == 'No answer' || ansUser == ''){ //Tutaj sprawdzamy czy użytkownik udzielił własnych odpowiedzi i dodajemy je do bazy
            answers[i] = ans;        //Jeżeli nie to zapisujemy po prostu jego odpowiedzi do bazy
        }  else {                   //update, dodatkowe odpowiedzi w ankiecie. Obsługa w zalezności od ilości udzielonych odpowiedzi.
            var number = parseInt(surveyid);
            if(typeof ansUser == "string") {
                collection.update( { "surveyid" : number , questions: {$elemMatch: {questionnumber : parseInt(i)}}}, { $addToSet: {"questions.$.availbeanswers": ansUser}});
                newAnswersAmount++; 
            } else {
                for(var k = 0; k < ansUser.length; k++){
                    collection.update( { "surveyid" : number , questions: {$elemMatch: {questionnumber : parseInt(i)}}}, { $addToSet: {"questions.$.availbeanswers": ansUser[k]}});
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
        if(newAnswersAmount > 0) collection.update( { "surveyid" : number , questions: {$elemMatch: {questionnumber : parseInt(i)}}}, { $inc: {"questions.$.answercount": newAnswersAmount }});  
    }        

    var baseName = 'surveyanswers' + surveyid; //sklejanie z numerem, żeby stworzyć bazę odpowiedzi danej ankiety
    var collection = db.get(baseName);              
    collection.insert({
                "user" : user,
                "answers" : answers,
                "questionsamount" : questionsamount
            }, function (err, doc) {
                if (err) {
                    res.send("There was a problem adding the information to the database.");
                }
            });
     // Trzeba dodać jakieś powiadomienie w stylu: Dziękujemy za wypełenie ankiety
    res.location("/profile");
    res.redirect("/profile");

});


function CountFunctionRadio(all,wart,collection, docs , i, n){
    var howManyAnswerInQuestion = docs[0].questions[i].answercount;
    collection.find({}, function(err,ans){ 
            how =0;
            for (h=0;h<all;h++){
                if (String(ans[h].answers[i][0])==String(docs[0].questions[i].availbeanswers[n])) how++;
            }
           wart +="\n" + docs[0].questions[i].availbeanswers[n]+": " + how+ "\n";
          //  odp[i] =wart;
           // console.log(odp[i]);
           n++;
           if (n < howManyAnswerInQuestion) CountFunctionRadio(all,wart,collection, docs , i, n); 
       return wart;                                
    });
}

function CountFunctionCheckbox(all,wart,collection, docs , i, n){
    var howManyAnswerInQuestion = docs[0].questions[i].answercount;
    collection.find({}, function(err,ans){ 
            how =0;
            for (h=0;h<all;h++){
                for (l=0;l<howManyAnswerInQuestion;l++){
                if (String(ans[h].answers[i][l])==String(docs[0].questions[i].availbeanswers[n])) how++;
                }
            }
           wart +="\n" + docs[0].questions[i].availbeanswers[n]+": " + how+ "\n";
            //odp[i] =wart;
            //console.log(odp[i]);
           n++;
           if (n < howManyAnswerInQuestion) CountFunctionCheckbox(all,wart,collection, docs , i, n); 
        return wart;                               
    });
}

router.get('/result', function(req, res){
    
    var resultid = req.query['survey'];
    if(resultid == undefined || resultid == "")
    {
        res.send("No no. of survey");
        return;
    } 
    // Get our form values. These rely on the "name" attributes
    //console.log(req.body.useremail);
    if(req.cookies.useremail == undefined){    
        // If it worked, set the header so the address bar doesn't still say /adduser
        res.location("/");
        // And forward to success page
        res.redirect("/?gotoresult="+resultid);
        return;
    }
    else {
        //console.log(req.cookies.useremail);
        var userEmail = req.cookies.useremail;
        var userPassword = req.cookies.userpassword;
        //console.log(userEmail); 
       // console.log(surveyid); 
    }   
    // Set our collection
    var db = req.db;
    var collection = db.get('usercollection');

    collection.count({"useremail" : userEmail, "userpassword" : String(CryptoJS.SHA3(userPassword))},function(err, count){
        if(count==1){

            //console.log(count);
            var collection2 = db.get('surveycollection');

            collection2.find({"surveyid" : parseInt(resultid)}, function(err,doc){

                //owner of survey
                if(doc[0].whoseeresult == "onlyyou" && doc[0].surveyowner == userEmail){

                    result(req,res);
                }
                else if(doc[0].whoseeresult == "everybody"){

                    result(req,res);
                }
                else if(doc[0].whoseeresult == "everywhoanswer"){

                    res.render('seeresults', {
                        "verifypass" : resultid
                    });
                }
                else {
                    res.send("You dont have access to see result of this survey");
                    return;
                }   
            });
        }
        else {
            res.send("Is problem with you");
            return;
        }

    });
});

router.post('/result', function(req, res){
    
    var resultid = req.body.yourresultid;
    if(resultid == undefined || resultid == "")
    {
        res.send("No no. of survey");
        return;
    } 
    var userPassword = req.body.yourpassword;
    var userEmail = req.cookies.useremail;

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
            res.send("You dont have access to see result of this survey - wrong password or no filled survey");
            return;
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

    collectionUser.count({"surveyid" : surveyid,}, function(err, all){

        collection.count({}, function(err, countt){

            var collectionSurvey = db.get('surveycollection');
                collectionSurvey.find({ "surveyid" : parseInt(surveyid) }, function(err, docs){ 

                    var sy = parseInt(docs[0].surveyend[0]+docs[0].surveyend[1]+docs[0].surveyend[2]+docs[0].surveyend[3]);
                    var sm = parseInt(docs[0].surveyend[5]+docs[0].surveyend[6]);
                    var sd = parseInt(docs[0].surveyend[8]+docs[0].surveyend[9]);
                    
                    var T = new Date();
                    var y = parseInt(T.getFullYear());
                    var m = parseInt(T.getMonth()+1);
                    var d = parseInt(T.getDay());

            if((countt > all/2) || (y>sy) || ((y=sy)&&(m>sm)) ||((y=sy)&&(m=sm)&&(d>=sd)))
            {
                    collectionSurvey.find({ "surveyid" : parseInt(surveyid) }, function(err, docs){ 

                    count = String(parseInt((countt/all)*100)) + "%";        //ile udzielono odpowiedzi
                     
                            var howManyQuestions =parseInt(docs[0].questionscount);

                            var i=0;
                            h=0;
                            odp[i]="";
                            n=0;
                            how =0;
                            h=0;
                            l=0;

                    collection.find({},function(err,find){

                    function CountFunction(){

                            if (i<howManyQuestions){

                                    if (docs[0].questions[i].answertype=="date"){
                                        
                                                if (h<countt){
                                                        if (h==0) odp[i]+=find[h].answers[i];
                                                        else odp[i]+="\n" +find[h].answers[i];
                                                        h++;
                                                        CountFunction();
                                                }
                                                else h=0;
                                                i++;
                                                odp[i]="";
                                                CountFunction();
                                        

                                    }

                                    else if (docs[0].questions[i].answertype=="radio"){

                                        var howManyAnswerInQuestion = docs[0].questions[i].answercount;

                                        if (n < howManyAnswerInQuestion){ 
                                                
                                                if (h<countt){
                                                    if (String(find[h].answers[i][0])==String(docs[0].questions[i].availbeanswers[n])) how++;
                                                    h++;
                                                    CountFunction();
                                                }
                                                else{
                                                h=0;
                                                if (n==0) odp[i] +=docs[0].questions[i].availbeanswers[n]+":" + how;
                                                else odp[i] +="\n" + docs[0].questions[i].availbeanswers[n]+":" + how;
                                                how=0;
                                                n++;
                                                CountFunction();
                                                }
                                        }
                                        else{
                                        n=0;
                                        i++;
                                        odp[i]="";
                                        CountFunction();
                                        }
                                    }

                                    else if (docs[0].questions[i].answertype=="checkbox"){

                                        var howManyAnswerInQuestion = docs[0].questions[i].answercount;

                                        if (n < howManyAnswerInQuestion){
                                                
                                                
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
                                                if (n==0) odp[i] +=docs[0].questions[i].availbeanswers[n]+":" + how;
                                                else odp[i] +="\n" + docs[0].questions[i].availbeanswers[n]+":" + how;
                                                how=0;
                                                n++;
                                                CountFunction();
                                                }
                                        }
                                        else{
                                        n=0;
                                        i++;
                                        odp[i]="";
                                        CountFunction();
                                        }
                                    }

                                    else if (docs[0].questions[i].answertype=="range"){

                                            p=parseInt(docs[0].questions[i].availbeanswers[0]);
                                            co=parseInt(p+n);
                                                
                                                if (co<=docs[0].questions[i].availbeanswers[1]){
                                                    if (h<countt){
                                                            if (String(find[h].answers[i][0])==String(co)) how++;
                                                            h++;
                                                            CountFunction();
                                                    }
                                                    else h=0;
                                                    if (n==0) odp[i] +=co +":" + how;
                                                    else odp[i]+="\n" + co +":" + how;
                                                    how=0;
                                                    n++;
                                                    CountFunction();
                                                }
                                                else n=0;    
                                                i++;
                                                odp[i]="";
                                                CountFunction();
                                    }

                                    else {
                                                if (h<countt){
                                                        if (h==0) odp[i]+=find[h].answers[i];
                                                        else odp[i]+="\n" +find[h].answers[i];
                                                        h++;
                                                        CountFunction();
                                                }
                                                else h=0;
                                                i++;
                                                odp[i]="";
                                                CountFunction();


                                    }
                            }
                    }
                            i=0;
                            CountFunction();                         
                            
                            console.log(odp[0]);
                          //  console.log(odp[1]);

                            
                            res.render('seeresults', {
                                "count" : count, "results" : docs, "odp" : odp 
                            });
                    });
                  
                });
            }
            else
            {   
                var result = "There's no result. nie ma minimum";
                res.render('seeresults', {
                    "result" : result 
                });

            }
            });
            
        });
    });
};


module.exports = router;
