/*
 * index.js: this represents when someone
 * navigates to www.oursite.com/.
 */

/*
 * GET home page.
 */

/*
 * Here we use render to convert /views/index.ejs 
 * into real HTML for the user, given the little 
 * chunk of data saying that title='Pennterest'. Neat, huh?
 */
exports.index = function(req, res){
  res.render('index', { title: 'Pennterest' });
};