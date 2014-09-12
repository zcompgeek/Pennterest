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
var url = require("url");
var exec = require('child_process').exec;

function getPins_db(res, id, req) {
	oracle.connect(connectData, function(err, connection) {
		if ( err ) {
			console.log(err);
		} else {
			//user's first 5 pins
			var userPins = "(SELECT * FROM " +
			"(SELECT PINID, CONTENTPATH, FIRSTNAME, USERID, BOARDNAME, CAPTION, CACHED, CONTENTID, RATING, " +
			"  LISTAGG(TAG, ' #') WITHIN GROUP (ORDER BY TAG) as tags FROM " +
			"(SELECT c.CONTENTPATH, c.CACHED, c.CONTENTID, u.FIRSTNAME, u.USERID, p.BOARDNAME, p.CAPTION, p.PINID, t.TAG, AVG(pr.RATING) as RATING " +
			"FROM PIN p, CONTENT c, USERS u, CONTENTTAG ct, TAG t, PINRATING pr " +
			"WHERE p.USERID=" +id+ " AND p.CONTENTID = c.CONTENTID AND u.USERID=" +id +
			" AND c.CONTENTID = ct.CONTENTID(+) AND ct.TAGID = t.TAGID(+) AND p.PINID = pr.PINID(+)" +
			" GROUP BY c.CONTENTPATH, c.CACHED, c.CONTENTID, u.FIRSTNAME, u.USERID, p.BOARDNAME, p.CAPTION, p.PINID, t.TAG)" +
			" GROUP BY PINID, CONTENTPATH, FIRSTNAME, USERID, BOARDNAME, CAPTION, CACHED, CONTENTID, RATING ORDER BY PINID DESC)" +
			" WHERE ROWNUM <= 8)";
			connection.execute(userPins, [],
					function(err, uresults){
				if(err) {console.log(err + "your pins error"); }
				else{
					getSuggestions(uresults, id, connection, res, req);
				}
			});
		}
	});

}

function getSuggestions(uresults, id, connection,res, req){
	//first 10 pins tagged with user's interests
	var interestsPins = "(SELECT * FROM " +
	"(SELECT PINID, CONTENTPATH, FIRSTNAME, USERID, BOARDNAME, CAPTION, CACHED, CONTENTID, RATING," +
	" LISTAGG(TAG, ' #') WITHIN GROUP (ORDER BY TAG) as tags FROM " +
	"(SELECT c.CONTENTPATH, c.CACHED, c.CONTENTID, u.FIRSTNAME, u.USERID, p.BOARDNAME, p.CAPTION, p.PINID, t.TAG, AVG(pr.RATING) as RATING " +
	"FROM PIN p, CONTENTTAG ct1, CONTENTTAG ct2, TAG t, INTERESTED i, USERS u, CONTENT c, PINRATING pr " +
	"WHERE p.CONTENTID = ct1.CONTENTID AND i.TAGID = ct1.TAGID AND i.USERID =" + id +
	" AND p.CONTENTID = c.CONTENTID AND u.USERID = p.USERID AND u.USERID <> " + id +
	" AND p.CONTENTID = ct2.CONTENTID(+) AND ct2.TAGID = t.TAGID(+) AND p.PINID = pr.PINID(+)" +
	" GROUP BY c.CONTENTPATH, c.CACHED, c.CONTENTID, u.FIRSTNAME, u.USERID, p.BOARDNAME, p.CAPTION, p.PINID, t.TAG" +
	" ORDER BY p.PINID) " +
	" GROUP BY PINID, CACHED, CONTENTID, CONTENTPATH, FIRSTNAME, USERID, BOARDNAME, CAPTION, RATING ORDER BY PINID, RATING DESC) " +
	" WHERE ROWNUM <= 10)";
	console.log(interestsPins);
	//first 10 pins of people the user is following
	var followedsPins = "(SELECT * FROM " +
	"(SELECT PINID, CONTENTPATH, FIRSTNAME, USERID, BOARDNAME, CAPTION, CACHED, CONTENTID, RATING, " +
	"  LISTAGG(TAG, ' #') WITHIN GROUP (ORDER BY TAG) as tags FROM " +
	"(SELECT c.CONTENTPATH, c.CACHED, c.CONTENTID, u.FIRSTNAME, u.USERID, p.BOARDNAME, p.CAPTION, p.PINID, t.TAG, AVG(pr.RATING) as RATING " +
	"FROM PIN p, CONTENT c, USERS u, FOLLOWING f, CONTENTTAG ct, TAG t, PINRATING pr " +
	"WHERE f.FOLLOWER = " +id + " AND p.USERID = f.FOLLOWED " +
	"AND p.CONTENTID = c.CONTENTID AND u.USERID = f.FOLLOWED " +
	"AND c.CONTENTID = ct.CONTENTID(+) AND ct.TAGID = t.TAGID(+) AND p.PINID = pr.PINID(+)" +
	" GROUP BY c.CONTENTPATH, c.CACHED, c.CONTENTID, u.FIRSTNAME, u.USERID, p.BOARDNAME, p.CAPTION, p.PINID, t.TAG) " +
	" GROUP BY PINID, CACHED, CONTENTID, CONTENTPATH, FIRSTNAME, USERID, BOARDNAME, CAPTION, RATING ORDER BY PINID, RATING DESC)" +
	" WHERE ROWNUM <= 10) ";
	console.log(followedsPins);
	var query = "( " + interestsPins + " ) UNION (" + followedsPins + " )";

	var start = new Date().getTime();
	connection.execute(query,
			[],
			function(err, presults) {
		if ( err ) {
			console.log(err + "home error");
		} else {
			console.log("GET HOME CONTENT TIME: " + (new Date().getTime() - start));
			getBoardNames(uresults, presults, id, connection, res, req);
		}
	});
}

function getBoardNames(uresults, presults, id, connection, res, req){
	var query = "SELECT BOARDNAME FROM BOARD WHERE USERID=" + id;
	connection.execute(query,
			[],
			function(err, bresults){
		if(err) {console.log(err + "board error");}
		else {
			if(req.session.user != null) {
				res.render('home.ejs',
					{userID : req.session.user.USERID,
					boards : bresults,
					pins: presults,
					upins : uresults }
				);
				connection.close();
			}
			else {
				res.redirect('/login?err=2');
			}
		}
	});
}

exports.home = function(req, res){
	if(req.session.user == null){
		res.redirect('/login?err=2');
		return;
	}
    getPins_db(res, req.session.user.USERID, req);
};

//adds new rating
exports.update = function(req, res){
	oracle.connect(connectData, function(err, connection) {
		if ( err ) {
			console.log(err);
		} else {
			var query = "SELECT PINID, USERID FROM PINRATING" +
			" WHERE PINID = " + req.body.pinID + " AND USERID = " + req.session.user.USERID;
			var start = new Date().getTime();
			connection.execute(query, [],
					function(err, results) {
				if ( err ) {
					console.log(err);
				} else {
					var insertRating;
					if(results.length > 0){
						insertRating = "UPDATE PINRATING SET RATING = " + req.body.rating +
						" WHERE PINID = " + req.body.pinID + " AND USERID = " + req.session.user.USERID;
					}
					else{
						insertRating = "INSERT INTO PINRATING (USERID, PINID, RATING) VALUES " +
						"(" + req.session.user.USERID + ", " + req.body.pinID + ", " + req.body.rating + ")";
					}
					connection.execute(insertRating,
							[],
							function(err, results) {
						if ( err ) {
							console.log(err);
							res.end();
						}
						else{
							console.log("UPDATE RATING TIME: " + (new Date().getTime() - start));
							connection.close();
							res.end();
						}
					});
				}
			});
		}
	});
	res.end();
};

//adds new pin
exports.pinExisting = function(req, res){
	var description = req.body.description;
	var tags = getTags(description);
	var contentid;
	oracle.connect(connectData, function(err, connection) {
		if ( err ) {
			console.log(err);
		} else {
			var start = new Date().getTime();
			var query = "SELECT CONTENTID FROM PIN WHERE PINID = " + req.body.pinID;
			console.log(query);
			connection.execute(query,
					[],
					function(err, results){
				if(err) {console.log(err);}
				else{
					var cID = results[0].CONTENTID;
					var checkpincount = "SELECT c.CONTENTPATH, c.CACHED, COUNT(*) AS count FROM PIN p, CONTENT c WHERE p.CONTENTID=c.CONTENTID AND c.CONTENTID='"+cID+"' GROUP BY c.CONTENTPATH, c.CACHED";
					console.log(checkpincount);
					connection.execute(checkpincount,
							[],
							function(err, results){
						if(err) {console.log(err);}
						else{
							console.log(results);
							if(results[0].COUNT >=2 && results[0].CACHED != '1') {
								console.log("we should cache this");
								var fname = cID;
								download_file_wget(results[0].CONTENTPATH, fname, connection);
							}
						}
					});
					var data = {"contentid":results[0]["CONTENTID"], "userid":req.session.user.USERID, "boardname":req.body.boardName, 
							"description":req.body.description, "tags":tags, "connection":connection, "response":res, "time":start};
					pinContent(data);
				}
			});
		}
	});
};

function getTags(description){
	var alphanumeric = new RegExp('[0-9a-zA-z]');
	var tags = [];
	for(var i = 0; i < description.length; i++){
		var c = description.charAt(i);
		if(c === '#'){
			var tag = "";
			i++;
			c = description.charAt(i);
			while(alphanumeric.test(c)){
				tag = tag +  c;
				i++;
				c = description.charAt(i);
			}
			tags.push(tag);
			i--;
		}
	}
	return tags;
}

function pinContent(data){
	var query = "INSERT INTO PIN (USERID, CONTENTID, BOARDNAME, CAPTION, PINID) VALUES" +
	" (" + data["userid"] + ", " + data["contentid"] + ", \'" + data["boardname"] +
	"\', '" + data["description"] + "' " + ", seq_pin_id.nextval)";
	data["connection"].execute(query, [],
			function(err, results){
		if(err) { console.log(err); }
		else{
			if(data["tags"].length > 0){
				addTags(data);
			}
			else{
				console.log("PIN TIME (NO TAGS): " + (new Date().getTime() - data["time"]))
				data["response"].end();
				data["connection"].close();
			}
		}
	});
}

function addTags (data){
	for(var i = 0; i < data["tags"].length; i++){
		getTagId(data, i);
	}
	data["response"].end();
}

function getTagId(data, index){
	query = "SELECT TAGID FROM TAG WHERE TAG='" + data["tags"][index] + "'";
	data["connection"].execute(query, [],
			function(err, results){
		if(err) {console.log(err);}
		if(results.length > 0){
			insertContentTag(data, results[0]["TAGID"], index);
		}
		else{
			insertTag(data, data["tags"][index], index);
		}
	});
}

function insertContentTag (data, tagid, index){
	query = "INSERT INTO CONTENTTAG (TAGID, CONTENTID) VALUES (" + tagid +
	", " + data["contentid"] + ")";
	data["connection"].execute(query,
			[],
			function(err,insertRes){
		if(err) {console.log(err);}
		if(index == data["tags"].length-1){
			data["connection"].close();
			console.log("PIN TIME (W/ TAGS): " + (new Date().getTime() - data["time"]));
		}
	});
}

function insertTag(data, tag, index){
	//start a new connection for each tag so I can use currval (gives last used value per session)
	oracle.connect(connectData, function(err, connection){
		var query = "INSERT INTO TAG (TAGID, TAG) VALUES (seq_tag_id.nextval, '" +
		tag + "')";
		connection.execute(query,
				[],
				function(err, insertRes){
			if(err) {console.log(err);}
			else{
				query = "INSERT INTO CONTENTTAG (TAGID, CONTENTID) VALUES (seq_tag_id.currval, " + data["contentid"] + ")";
				connection.execute(query,
						[],
						function(err, results){
					if(err) { console.log(err); }
					connection.close();
					if(index == data["tags"].length-1){
						data["connection"].close();
						console.log("PIN TIME (W/ TAGS): " + (new Date().getTime() - data["time"]));
					}
				});
			}
		});
	});
}

exports.pinNewContent = function(req, res){
	var boardName = req.body.boardName;
	var userID = req.session.user.USERID;
	var url = req.body.url;
	var description = req.body.description;
	oracle.connect(connectData, function(err, connection){
		var query = "SELECT p.PINID, c.CONTENTID FROM PIN p, CONTENT c WHERE c.CONTENTPATH = '" + url +
		"' AND p.CONTENTID=c.CONTENTID";
		connection.execute(query, [], function(err, results){
			if(err) {console.log(err);}
			else{
				//new content
				console.log("There are already "+results.length+" of these in the DB");
				if(results.length === 0){
					addContent(req, res, connection);
				}
				else if (results.length >= 2) {
					console.log("HEY, WE SHOULD CACHE THIS");
					// need to cache this stuff
					var fname = results[0].CONTENTID;
					download_file_wget(url, fname, connection);
				}
				else { //old content, use pinExisting()
					var body = {};
					body["boardName"] = boardName;
					body["description"] = description;
					body["userID"] = userID;
					body["pinID"] = results[0].PINID;
					var data = {"body" : body};
					data.session = {};
					data.session.user = {};
					data.session.user.USERID = userID;
					exports.pinExisting(data, res);
				}
			}
		});
	});
};

function addContent(req, res, connection){
	var query = "INSERT INTO CONTENT (CONTENTID, CONTENTPATH) VALUES (seq_content_id.nextval, '" + req.body.url + "')";
	var start = new Date().getTime();
	connection.execute(query, [], function(err, results){
		if(err) {console.log(err);}
		else{
			var tags = getTags(req.body.description);
			query = "SELECT seq_content_id.currval FROM DUAL";
			connection.execute(query, [], function(err, cid){
				if(err) {console.log(err);}
				else{
					var data = {"contentid":cid[0]["CURRVAL"], "userid":req.session.user.USERID, "boardname":req.body.boardName,
							"description":req.body.description, "tags":tags, "connection":connection, "response":res, "time":start};
					pinContent(data);
				}
			});
		}
	});
}

function download_file_wget(file_url, contentid, connection) {
	var DOWNLOAD_DIR = "~/550pennterest/Pennterest/public/cache/";
	//	extract the file name
	var file_name = url.parse(file_url).pathname.split('/').pop();
	var ext = file_name.split('.').pop();
	//	compose the wget command
	var wget = 'wget -O '+DOWNLOAD_DIR+contentid+'.'+ext+' '+ file_url;
	//	excute wget using child_process' exec function

	var child = exec(wget, function(err, stdout, stderr) {
		if (err) {throw err;}
		else {
			oracle.connect(connectData, function(err, connection) {
				if ( err ) {
					console.log(err);
				} else {
					console.log(file_name + ' downloaded to ' + DOWNLOAD_DIR + ' as '+contentid+'.'+ext);
					var cache = "UPDATE CONTENT SET CACHED='1' WHERE CONTENTID='"+contentid+"' ";
					connection.execute(cache, [], function(err, results){
						if(err) {console.log(err);}
						else{
							console.log("successfully updated cache entry for content "+contentid);
						}
					});
				}
			});
			
		}
	});
}




