/**
 * New node file
 */

var oracle = require("oracle");
var connectData = {
	"hostname": "cis550zne.cbh8gmdnynf7.us-east-1.rds.amazonaws.com",
	"user": "zne",
	"password": "jacksonf",
	"database": "PENNZNE"
};
	
exports.getBoardContent = function(req, res){
	if(req.session.user == null){
		res.redirect('/login?err=2');
		return;
	}
	var boardName = req.query["boardName"];
	var buserID = req.query["buserID"]; //board owner's id
	var suserID = req.session.user.USERID;
	oracle.connect(connectData, function(err, connection){
		if(err) {console.log(err);}
		else{
			var query =
			"SELECT PINID, CONTENTPATH, FIRSTNAME, USERID, BOARDNAME, CAPTION, CACHED, CONTENTID, RATING, " +
			"LISTAGG(TAG, ' #') WITHIN GROUP (ORDER BY TAG) as tags FROM " +
			"(SELECT c.CONTENTPATH, c.CACHED, c.CONTENTID, u.FIRSTNAME, u.USERID, p.BOARDNAME, p.CAPTION, p.PINID, t.TAG, AVG(pr.RATING) as RATING " +
			"FROM PIN p, CONTENT c, USERS u, CONTENTTAG ct, TAG t, PINRATING pr " +
			"WHERE p.USERID=" + buserID + " AND p.CONTENTID = c.CONTENTID AND p.BOARDNAME='" + boardName +
			"' AND u.USERID=" +buserID +
			" AND c.CONTENTID = ct.CONTENTID(+) AND ct.TAGID = t.TAGID(+) AND p.PINID = pr.PINID(+)" +
			" GROUP BY c.CONTENTPATH, c.CACHED, c.CONTENTID, u.FIRSTNAME, u.USERID, p.BOARDNAME, p.CAPTION, p.PINID, t.TAG)" +
			" GROUP BY PINID, CONTENTPATH, FIRSTNAME, USERID, BOARDNAME, CAPTION, CACHED, CONTENTID, RATING ORDER BY PINID DESC";
			var start = new Date().getTime();
			connection.execute(query, [], function(err, cresults){
				if(err) {console.log(err);}
				else{
					query = "SELECT BOARDNAME FROM BOARD WHERE USERID=" + suserID;
				  	connection.execute(query,
				  			[],
				  			function(err, bresults){
				  			if(err) {console.log(err);}
				  			else{
				  				console.log("GET BOARD CONTENT TIME: " + (new Date().getTime() - start));
				  				if(req.session.user != null){				  		    	
				  					res.render('board.ejs',
				  		    			{userID : suserID,  
				  		    			 boards : bresults,
				  		    			 pins: cresults,
				  		    			 boardName: boardName
				  		    			}
				  				  );
				  				}
				  				connection.close();
				  			}
							   });
				}
			});
		}
	});
};

