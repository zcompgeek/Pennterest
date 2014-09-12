/**
 * New node file
 */
var oracle = require("oracle");
var connectData = { 
		  "hostname": "cis550zne.cbh8gmdnynf7.us-east-1.rds.amazonaws.com", 
		  "user": "zne", 
		  "password": "jacksonf", 
		  "database": "PENNZNE" };

exports.search = function(req, res){
	if(req.session.user == null){
		res.redirect('/login?err=2');
		return;
	}
	
	oracle.connect(connectData, function(err, connection) {
		if(err){
			console.log(err);
		}
		else{
			var query = 
				"SELECT * FROM " +
				"(SELECT PINID, CONTENTPATH, FIRSTNAME, USERID, BOARDNAME, CAPTION, RATING," +
    			" LISTAGG(TAG, ' #') WITHIN GROUP (ORDER BY TAG) as tags FROM " +
				"(SELECT c.CONTENTPATH, u.FIRSTNAME, u.USERID, p.BOARDNAME, p.CAPTION, p.PINID, t.TAG, AVG(pr.RATING) as RATING " +
				"FROM CONTENT c, USERS u, TAG t, PINRATING pr, CONTENTTAG ct, " +
				"(SELECT p.PINID, p.BOARDNAME, p.CAPTION, p.USERID, p.CONTENTID FROM PIN p, CONTENTTAG c, TAG t " +
				"WHERE p.CONTENTID = c.CONTENTID AND c.TAGID = t.TAGID AND " +
				"t.TAG = '" + req.query["searchterm"] + "') p " +
				"WHERE p.USERID = u.USERID AND p.CONTENTID = c.CONTENTID AND c.CONTENTID = ct.CONTENTID(+) AND " +
				"ct.TAGID = t.TAGID(+) AND p.PINID = pr.PINID(+) " +
				"GROUP BY c.CONTENTPATH, u.FIRSTNAME, u.USERID, p.BOARDNAME, p.CAPTION, p.PINID, t.TAG) " +
				"GROUP BY PINID, CONTENTPATH, FIRSTNAME, USERID, BOARDNAME, CAPTION, RATING ORDER BY PINID) " +
				"WHERE ROWNUM <= 50";
			var start = new Date().getTime();
			connection.execute(query,
			[],
			function(err, presults){
				if(err) { console.log(err); }
				else{
					query = "SELECT BOARDNAME FROM BOARD WHERE USERID=" + req.session.user.USERID;
		  	    	connection.execute(query,
		  	    			[],
		  	    			function(err, bresults){
		  	    			if(err) {console.log(err);}
		  	    			else{
		  	    				console.log("SEARCH TIME: " + (new Date().getTime() - start));
		  	    		    	res.render('search.ejs',
		  	    		    			{userID : req.session.user.USERID,  
		  	    		    			 boards : bresults,
		  	    		    			 pins: presults }
		  	    				  );
		  	    				connection.close();
		  	    			}
		  	    	});
				}
			});
		}
	});
}
