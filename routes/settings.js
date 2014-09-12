/**
 * New node file
 */

var connectData = {
		"hostname": "cis550zne.cbh8gmdnynf7.us-east-1.rds.amazonaws.com",
		"user": "zne",
		"password": "jacksonf",
		"database": "PENNZNE"
	};

var oracle =  require("oracle");
exports.settings = function(req, res){
	if(req.session.user == null){
		res.redirect('/login?err=2');
		return;
	}
	oracle.connect(connectData, function(err, connection) {
		if ( err ) {
			console.log(err);
		} else {
			var query = "SELECT USERID, FIRSTNAME, LASTNAME, GENDER, BIO, AFFILIATION, EMAIL, PROFILEPICPATH, " +
					"DOB, LISTAGG(TAG, ', ') WITHIN GROUP (ORDER BY TAG) as interests FROM " +
					"(SELECT t.TAG, u.USERID, u.FIRSTNAME, u.LASTNAME, u.GENDER, u.BIO, u.AFFILIATION, u.EMAIL, " +
    		"u.PROFILEPICPATH, TO_CHAR(u.DOB, 'MM / DD / YYYY') AS DOB " +
    		"FROM USERS u, INTERESTED i, TAG t WHERE u.USERID=" + req.session.user.USERID + " AND u.USERID = i.USERID (+) AND " +
    				"i.TAGID = t.TAGID (+)) " +
    				"GROUP BY USERID, FIRSTNAME, LASTNAME, GENDER, BIO, AFFILIATION, EMAIL, PROFILEPICPATH, DOB";
			console.log(query);
			var start = new Date().getTime();
			connection.execute(query, [], function(err, results){
				if(err){console.log(err);}
				else{
					console.log(results[0]["INTERESTS"]);
					console.log("GET USER SETTINGS TIME: " + (new Date().getTime() - start));
					res.render('settings.ejs',
							{user: results}
							);
				}
			});
		}
	});
}

exports.change = function(req, res){
	oracle.connect(connectData, function(err, connection){
		if(err) {console.log(err);}
		else{
			var firstName = req.body.firstName;
			var lastName = req.body.lastName;
			var email = req.body.email;
			var dob = req.body.dob;
			var gender = req.body.gender;
			var bio = req.body.bio;
			var affiliation = req.body.affiliation;
			var profilepic = req.body.profilepic;
			var interests = req.body.interests.split(", ");
			console.log(interests);
			var query = "UPDATE USERS " +
					"SET FIRSTNAME = '" + firstName +
					"', LASTNAME = '" + lastName +
					"', EMAIL = '" + email +
					"', DOB = TO_DATE('" + dob + "', 'MM/DD/YYYY')" +
					", GENDER = '" + gender +
					"', BIO = '" + bio +
					"', AFFILIATION = '" + req.body.affiliation +
					"', PROFILEPICPATH = '" + req.body.profilepic + 
					"' WHERE USERID = " + req.session.user.USERID;
			var start = new Date().getTime();
			connection.execute(query, [], function(err, results){
				if(err ){console.log(err);}
				else{
					findTags(req.session.user.USERID, interests, connection, res);
					console.log("UPDATE SETTINGS TIME: " + (new Date().getTime() - start));
				}
			});
		}
	});
}

function findTags(userID, tags, connection, response){
	for(var i = 0; i < tags.length; i++){
		var tag = tags[i];
		var query = "SELECT TAGID FROM TAG WHERE TAG = '" + tag + "'";
		console.log(tag);
		connection.execute(query, [], function(err, results){
			if(err) { console.log(err); }
			else{
				if(results.length > 0){
					insertInterest(userID, results[0]["TAGID"], connection, response, i, tags.length);
				}
				else{
					console.log(tag);
					insertTag(userID, tag, connection, response, i, tags.length);
				}
			}
		})
	}
}

function insertTag(userID, tag, connection, response, index, targetIndex){
	var query = "INSERT INTO TAG (TAGID, TAG) VALUES (seq_tag_id.nextval, '" +  tag + "')";
	console.log(query);
	connection.execute(query, [], function(err, results){
		if(err) {console.log(err);}
		else{
			var query = "SELECT seq_tag_id.currval FROM DUAL";
			console.log(query);
			connection.execute(query, [], function(err, results){
				if(err) {console.log(err);}
				else{
					insertInterest(userID, results[0]["CURRVAL"], connection, response, index, targetIndex);
				}
			});
		}
	});
}

function insertInterest(userID, interest, connection, response, index, targetIndex){
	var query = "INSERT INTO INTERESTED (USERID, TAGID) VALUES (" + userID + ", " + interest + ")";
	console.log(query);
	connection.execute(query, [], function(err, results){
		//will happen if the tags are already there...not a big deal
		if(err) {console.log(err);}
		else{
			if(index == targetIndex) {
				connection.close();
				response.redirect("/user?userID=" + userID);
			}
		}
	});
}