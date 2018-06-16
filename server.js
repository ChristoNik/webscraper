var express = require("express");
var bodyParser = require("body-parser");
var mongoose = require("mongoose");
var path = require("path");
var methodOverride = require("method-override");

var Note = require("./models/note.js");
var Job = require("./models/jobs.js");

var request = require("request");
var cheerio = require("cheerio");

mongoose.Promise = Promise;


var app = express();
var PORT = process.env.PORT || 3000;

app.use(bodyParser.urlencoded({
    extended: false
}));

app.use(methodOverride('_method'));

app.use(express.static("./public"));

var exphbs = require("express-handlebars");

app.set('views', __dirname + '/views');
app.engine("handlebars", exphbs({
    defaultLayout: "main",
    layoutsDir: __dirname + "/views/layouts"
}));
app.set("view engine", "handlebars");

//var databaseUri = "mongodb://localhost/jobscrper";

var databaseUri = "mongodb://hln6480:123Fun@ds261460.mlab.com:61460/jobscraper";
if (process.env.MONGODB_URI) {
    mongoose.connect(process.env.MONGODB_URI);
} else {
    mongoose.connect(databaseUri);
}
var db = mongoose.connection;

db.on("error", function(error) {
    console.log("Mongoose Error: ", error);
});

db.once("open", function() {
    console.log("Mongoose connection successful.");
});


app.get("/", function(req, res) {
    Job.find({})
        .exec(function(error, data) {
            if (error) {
                res.send(error);
            } else {
                var newsObj = {
                    Job: data
                };
                res.render("index", newsObj);
            }
        });
});

app.get("/scrape", function(req, res) {

    request("https://www.indeed.com/jobs?q=html&l=Kennesaw,%20GA", function(error, response, html) {

        var $ = cheerio.load(html);

        $(".jobtitle").each(function(i, element) {

            var result = {};

            result.title = $(this).text();
            result.link = $(this).parent("a").attr("href");

            var entry = new Job(result);

            entry.save(function(err, doc) {
                if (err) {
                    console.log(err);
                } else {
                    console.log(doc);
                }
            });

        });
        res.redirect("/");
        console.log("Successfully Scraped");
    });
});

app.post("/notes/:id", function(req, res) {
    var newNote = new Note(req.body);
    newNote.save(function(error, doc) {
        if (error) {
            console.log(error);
        } else {
            console.log("this is the DOC " + doc);
            Job.findOneAndUpdate({
                "_id": req.params.id
            }, {
                $push: {
                    "note": doc._id
                }
            }, {
                new: true
            }, function(err, doc) {
                if (err) {
                    console.log(err);
                } else {
                    console.log("note saved: " + doc);
                    res.redirect("/notes/" + req.params.id);
                }
            });
        }
    });
});

app.get("/notes/:id", function(req, res) {
    console.log("This is the req.params: " + req.params.id);
    Job.find({
            "_id": req.params.id
        }).populate("note")
        .exec(function(error, doc) {
            if (error) {
                console.log(error);
            } else {
                var notesObj = {
                    Job: doc
                };
                console.log(notesObj);
                res.render("notes", notesObj);
            }
        });
});

app.get("/delete/:id", function(req, res) {
    Note.remove({
        "_id": req.params.id
    }).exec(function(error, doc) {
        if (error) {
            console.log(error);
        } else {
            console.log("note deleted");
            res.redirect("/");
        }
    });
});


app.listen(PORT, function() {
    console.log("App running on PORT" + PORT + "!");
});