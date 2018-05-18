const express = require('express');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const sequelize = require('sequelize');
const app = express();
const COOKIE_SECRET ='cookie secret';

const db = new sequelize('test', 'root', '', {
    host: 'localhost',
    dialect: 'mysql'
});

const User = db.define('user', {
    firstname : { type: sequelize.STRING } ,
    lastname : { type: sequelize.STRING } ,
    email : { type: sequelize.STRING } ,
    password : { type: sequelize.STRING }
});
const Review = db.define('review', {
    jeu: { type: sequelize.STRING },
    critique: { type: sequelize.TEXT },
    vote: {type: sequelize.STRING }
});

const Comment = db.define('comment', {
    commentaire: { type: sequelize.STRING }
});

const Like = db.define('like');

const Dislike = db.define('dislike');

db.sync().then(r => {
    console.log("DB SYNCED");
}).catch(e => {
    console.error(e);
});

Comment.belongsTo(Review);
Review.hasMany(Comment);
Like.belongsTo(Review);
Review.hasMany(Like);
Dislike.belongsTo(Review);
Review.hasMany(Dislike);
Comment.belongsTo(User);
User.hasMany(Comment);

passport.use(new LocalStrategy((email, password, done) => {
    User
        .findOne({
            where: {
                email: email,
                password: password
            }
        }).then((user) => {
            if (user) {
                return done(null, user)
            } else {
                return done(null, false, {
                    message: 'Invalid credentials'
                });
            }
        })
        .catch(done);
}));

passport.serializeUser((user, callback) => {
    callback(null, user.email);
});
passport.deserializeUser((email, cb) => {
    User.findOne({
        where : { email }
    }).then(user => {
        if(user) return cb(null, user);
        else return cb(new Error("No user corresponding to the cookie's email address"));
    });
});

db.sync();

app.set('view engine', 'pug');

app.use(cookieParser(COOKIE_SECRET));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({ secret: COOKIE_SECRET, resave: false, saveUninitialized: false}));
app.use(passport.initialize());
app.use(passport.session());

app.get('/', (req, res) => {
    Review
        .sync()
        .then(() => {
            Review
        .findAll({include: [Like, Dislike, {model: Comment, include: [User]},]})
        .then((reviews) => {
            res.render('review', {reviews, user: req.user});
        })
})

});

app.post('/review/', (req, res) => {
    const { jeu, critique, vote } = req.body;
    const username = req.body.username;
    const password = req.body.password;
    User
        .create({
            username: username,
            password: password
        })
    .then((user) => {
        req.login(user, () => {
            res.redirect('/');

        });
    });
    Review
        .sync()
        .then(() => Review.create({ jeu, critique, vote }))
        .then(() => res.redirect('/'));
});

app.get('/logout', (req, res) => {
    req.logout();
    res.redirect('/');
    res.render('authentification');

});

app.post('/signup', (req, res) => {
    User.create({ email: req.body.username, password: req.body.password }).then((user) => {
        req.login(user, () => {
            res.redirect('/');
        });
    });
});

app.post('/signin',
    passport.authenticate('local', {
        successRedirect: '/',
        failureRedirect: '/login'
    }));


app.get('/', (req, res) => {
    Comment
        res.render('comment');
});

app.post('/', (req, res) => {
    Comment
        .sync()
        .then(() => Comment.create({ commentaire, reviewId: req.params.reviewId}))
        .then(() => res.redirect('/'));
});

app.post('/review/:reviewId/like', (req, res) => {
    Like
        .sync()
        .then(() => Like.create({ action: 'like', reviewId: req.params.reviewId }))
        .then(()=> res.redirect('/'));
});

app.post('/review/:reviewId/dislike', (req, res) => {
    Dislike
        .sync()
        .then(() => Dislike.create({ action: 'dislike', reviewId: req.params.reviewId }))
        .then(()=> res.redirect('/'));
});

app.listen(3000, () => {
    console.log('Listening on port 3000');
});