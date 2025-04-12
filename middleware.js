const Review = require("./models/review");

const isAuthenticated = (req, res, next) => {
    if (req.isAuthenticated()) {
      return next();
    }
    req.flash('error', 'Please login to continue');
    res.redirect('/loginsignup');
  };
  
  const isAuthorized = (req, res, next) => {
    if (req.params.id === req.user._id.toString()) {
      return next();
    }
    req.flash('error', 'Unauthorized access');
    res.redirect('/loginsignup');
  };

const isLoggedIn = (req, res, next) =>{
    if(!req.isAuthenticated()){
        req.session.redirectUrl = req.originalUrl;
        req.flash("error", "Please login to continue!");
        return res.redirect("/loginsignup");
    }
    next();
};  

// const isReviewAuthor = async (req, res, next) => {
//   let { id, idD, idR } = req.params;
//   let review = await Review.findById(idR);
//   if(!review.author.equals(res.locals.currUser._id)){
//       req.flash("error", "You have not created this review, Sorry!");
//       return res.redirect(/collections/${id}/doctor/${idD});
//   }
//   next();
// }

const isReviewAuthor = async (req, res, next) => {
  try {
    let { id, idD, idR } = req.params;
    let review = await Review.findById(idR);
    
    if (!review) {
      req.flash("error", "Review not found");
      return res.redirect(`/collections/${id}/doctor/${idD}`);
    }
    
    if (!req.user || !review.author.equals(req.user._id)) {
      req.flash("error", "You have not created this review, Sorry!");
      return res.redirect(`/collections/${id}/doctor/${idD}`);
    }
    next();
  } catch (e) {
    next(e);
  }
}

  
module.exports = {isAuthenticated, isAuthorized, isLoggedIn, isReviewAuthor};