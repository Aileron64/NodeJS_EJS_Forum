const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const fileUpload = require('express-fileupload');
const session = require('express-session');
const {check, validationResult} = require('express-validator');

mongoose.connect('mongodb://localhost:27017/js_project',
{
    useNewUrlParser: true,
    useUnifiedTopology: true
})

const app = express();
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.use(express.static(__dirname + '/public'));
app.use(fileUpload());
app.use(bodyParser.json() ); 
app.use(bodyParser.urlencoded({extended: false})); 

app.use(session(
{
    secret: 'redwood2k',
    resave: false,
    saveUninitialized: true
}));

/************* Models *************/

const Settings = mongoose.model('setting',
{
    siteName: String,
    slogan: String,
    footer: String,
    homeDesc: String
});

const Page = mongoose.model('page',
{
    name: String,
    content: String
});

const Thread = mongoose.model('thread',
{
    title: String,
    desc: String,
    isAdmin: Boolean
});

const Post = mongoose.model('post',
{
    name: String,
    image: String,
    message: String,
    threadID: String,
    isAdmin: Boolean
});

const Admin = mongoose.model('admin',
{
    username: String,
    password: String
});

/************* Home *************/

app.get('/', function(req, res)
{
    renderPage('Index', req, res, null);
});

/************* Admin *************/

app.get('/admin/Login', function(req, res)
{
    renderPage('Login', req, res, null);
});

app.post('/admin/login', function(req, res)
{
    Admin.findOne(
        {
            username:req.body.username, 
            password:req.body.password
        })
        .exec(function(err, admin) 
        {
            try
            {
                req.session.username = admin.username;
                req.session.loggedIn = true;
                res.redirect('/');
            }
            catch
            {
                res.redirect('/');
            }
        });
});

app.get('/Logout', function(req, res)
{
    req.session.loggedIn = false;
    res.redirect('/');
});

/************* Settings *************/

app.get('/Settings', function(req, res)
{
    if(req.session.loggedIn)
        renderPage('settings', req, res, null);
});

app.post('/Settings', function(req, res)
{
    if(req.session.loggedIn)
    {
        Settings.updateOne({ }, 
        {
            siteName: req.body.name,
            slogan: req.body.slogan,
            footer: req.body.footer,
            homeDesc: req.body.desc
        })
        .then(()=>
        {
            console.log("Settings Edited");
            res.redirect('/');
        }); 
    }
});

/************* Extra Pages *************/

app.get('/PageView', function(req, res)
{
    if(req.session.loggedIn)
        renderPage('pageView', req, res, null);
});

app.get('/page:id', function(req, res)
{
    Page.findOne({ "_id" : req.params.id }, function(err, page)
    {
        renderPage('page', req, res, 
        {
            page: page
        });  
    });
});

app.post('/Page', function (req, res)
{
    if(req.session.loggedIn && req.body.name != "")
    {
        var page = new Page(
        {
            name: req.body.name,
            content: req.body.content
        });
    
        page.save().then(()=>
        {
            console.log("New Page Created");
            res.redirect('/PageView');
        }); 
    }
});

/************* Threads *************/

app.get('/thread:id', function(req, res)
{
    Thread.findOne({ "_id" : req.params.id }, function(err, thread)
    {
        Post.find({ "threadID" : req.params.id }, function(err, posts)
        {
            renderPage('thread', req, res, 
            {
                thread: thread,
                posts: posts
            });
        });
    });
});

app.post('/thread', 
[check('title', 'Please enter the name').not().isEmpty()],
function (req, res)
{
    const errors = validationResult(req);
    if(errors.isEmpty())
    {
        var thread = new Thread(
        {
            title: req.body.title,
            desc: req.body.desc,
            isAdmin: req.session.loggedIn
        });

        thread.save().then(()=>
        {
            console.log("New Thread Created");
            res.redirect('/');
        }); 
    }
    else
    {
        console.log(errors);
        res.redirect('/');
    }  
});

/************* Posts *************/

app.post('/post:id', function (req, res)
{
    var name = req.body.name;
    var message = req.body.message;
    var threadID = req.params.id;

    try { var imagePath = createImage(req.files.image); }
    catch{ var imagePath = ""; }

    if(name == "")
        name = "Anonymous";

    if(message != "" || imagePath != "")
    {
        var post = new Post(
        {
            name: name,
            image: imagePath,
            message: message,
            threadID: threadID,
            isAdmin: req.session.loggedIn
        });
    
        post.save().then(()=>
        {
            console.log("New Post Created");
            res.redirect('/thread' + threadID);
        }); 
    }
});

/************* Edit *************/

app.get('/editPage:id', function(req, res)
{
    if(req.session.loggedIn)
    {
        Page.findOne({ "_id" : req.params.id }, function(err, page)
        {
            renderPage('editPage', req, res, 
            {
                page: page
            });
        });
    }
});

app.post('/editPage:id', function(req, res)
{
    if(req.session.loggedIn)
    {
        Page.updateOne({ "_id" : req.params.id }, 
        {
            _id: req.params.id,
            name: req.body.name,
            content: req.body.content
        })
        .then(()=>
        {
            console.log("Page Edited");
            res.redirect('/PageView');
        }); 
    }
});

app.get('/editThread:id', function(req, res)
{
    if(req.session.loggedIn)
    {
        Thread.findOne({ "_id" : req.params.id }, function(err, thread)
        {
            renderPage('editThread', req, res, 
            {
                thread: thread
            });
        });
    }
});

app.post('/editThread:id', function(req, res)
{
    if(req.session.loggedIn)
    {
        Thread.updateOne({ "_id" : req.params.id }, 
        {
            _id: req.params.id,
            title: req.body.title,
            desc: req.body.desc
        })
        .then(()=>
        {
            console.log("Thread Edited");
            res.redirect('/thread' + req.params.id);
        }); 
    }
});

app.get('/editPost:id', function(req, res)
{
    if(req.session.loggedIn)
    {
        Post.findOne({ "_id" : req.params.id }, function(err, post)
        {
            req.session.threadID = post.threadID;
    
            renderPage('editPost', req, res, 
            {
                post: post
            });
        });
    }
});

app.post('/editPost:id', function(req, res)
{
    if(req.session.loggedIn)
    {
        var name = req.body.name;
        var message = req.body.message;

        if(name == "")
            name = "Anonymous";
        try
        {
            var imagePath = createImage(req.files.image);

            Post.updateOne({ "_id" : req.params.id }, 
            {
                _id: req.params.id,
                name: name,
                image: imagePath,
                message: message
            })
            .then(()=>
            {
                console.log("Post Edited");
                res.redirect('/thread' + req.session.threadID);
            }); 
        }
        catch
        {
            Post.updateOne({ "_id" : req.params.id }, 
            {
                _id: req.params.id,
                name: name,
                message: message
            })
            .then(()=>
            {
                console.log("Post Edited");
                res.redirect('/thread' + req.session.threadID);
            }); 
        }
    }
});

/************* Delete *************/

app.get('/deletePost:id', function(req, res)
{
    if(req.session.loggedIn)
    {
        Post.deleteOne({ "_id" : req.params.id }).then(()=>
        {
            res.redirect('/');
        });
    }
});

app.get('/deleteThread:id', function(req, res)
{
    if(req.session.loggedIn)
    {
        Thread.deleteOne({ "_id" : req.params.id }).then(()=>
        {
            res.redirect('/');
        });
    }
});

app.get('/deletePage:id', function(req, res)
{
    if(req.session.loggedIn)
    {
        Page.deleteOne({ "_id" : req.params.id }).then(()=>
        {
            res.redirect('/pageView');
        });
    }
});

/************* Utility *************/

function renderPage(path, req, res, data)
{
    Settings.findOne({}, function(err, settings)
    {
        Page.find({}, function(err, pages)
        {
            Thread.find({}, function(err, threads)
            {
                res.render(path, 
                {
                    data: data,
                    setting: settings,
                    threads: threads,
                    pages: pages,
                    isAdmin: req.session.loggedIn
                });
            });
        });
    });
}

function createImage(image)
{
    var name = image.name;

    console.log('Name = ' + name);

    var imageType = '.jpg';
    var imgID = Math.floor(Math.random() * 100000000);
    var imageName = imgID + imageType;
    var imagePath = '\\images\\' + imageName;
    var publicPath = 'public\\images\\' + imageName;

    image.mv(publicPath, function(err)
    {
        if(err)
            console.log(err);
    });

    return imagePath;
}

//lt --port 8080
app.listen(8080);
console.log('\n\n------ Site on port 8080 ------');

