/*
 * test.js: this represents when someone
 * navigates to www.oursite.com/test.
 */

/*
 * GET test page and display info about req and response
 */

exports.index = function(req, res){
  res.render('test', { title: 'Pennterest', request: req });
};