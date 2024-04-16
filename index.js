// Global variables to track who has logged in
var loggedinCredentials = {}
// Import node-fetch using dynamic import
const fetch = import('node-fetch');
// importing the required modules
const express = require("express");
const path = require('path');
const bodyParser = require('body-parser');
const session = require('express-session')
const { randomBytes } = require('crypto');
const { sendOTP } = require('./emailService');

 

const otps = {}; // In-memory storage for OTPs (use a database in production)
const OTP_EXPIRATION_TIME = 10 * 60 * 1000; // 10 minutes


// get the  schema here
const { Book, requestedbook, curr_Ordered_books, Customers, Employees, Owners, BookSolds, OrderedBook } = require("./models/data.js");

// get the mongoose
const mongoose = require('mongoose');

// Get the MonogStore For the Session Management
const MongoStore = require("connect-mongo");

// establish the connection
mongoose.connect('mongodb://localhost/accounts', {
    // useNewUrlParser: true,
    // useUnifiedTopology: true,
});


// 5th April
// Define a Mongoose schema
const UserSchema = new mongoose.Schema({
    username: String,
    email: String,
    password: String
});

// Create a Mongoose model
const user = mongoose.model('User', UserSchema);

// create the app instance
const app = express();
const PORT = 8000;


// init the session management
app.use(session({
    secret: 'your-secret-key',
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
        mongoUrl: 'mongodb://localhost/accounts',
        collectionName: 'sessions'
    })
}))

// middleware
app.use(bodyParser.json());


// 5th April 19
// Middleware to check if user is authenticated
const isAuthenticated = async (req, res, next) => {
    console.log("Inside the isAuth function!");
    console.log(req.session.user)
    if (req.session.user) {
        console.log("I am inside the authentication thing");
        console.log(`${req.session.user}`);
        console.log(`${req.session.user.username}`)
        console.log(`${req.session.user.email}`)
        console.log(`${req.session.user.password}`)
        next(); // User is authenticated, proceed to the next middleware/route handler
    } else {
        res.redirect('/login'); // User is not authenticated, redirect to login page
    }
};




// get the subject list
let list = ["Fictional", "Health", "Mystery", "Thriller", "History", "CS"];
app.set("view engine", "ejs");
app.set("views", path.resolve("./views"));

app.use(express.urlencoded({ extended: true }));

app.use(express.static("views"));

// function to get the current Date from the System
async function getCurrDate() {
    // Create a new Date object
    const currentDate = new Date();

    // Get the current date components
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth() + 1; // Months are zero-indexed, so add 1
    const day = currentDate.getDate();
    const hours = currentDate.getHours();
    const minutes = currentDate.getMinutes();
    const seconds = currentDate.getSeconds();

    // Format the date as needed
    const formattedDate = `${year}-${month}-${day}`;

    // Display the current date
    console.log(formattedDate);
    return formattedDate;

}

// april 10th code
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Something went wrong!');
});

app.get("/", async (req, res) => {
    let result = [];
    for (values in list) {
        let results_book = await Book.find({ subject: list[values] }).limit(5);

        result.push(results_book);

    }
    console.log("Inside home ", loggedinCredentials.emailOfUser);
    return res.render("home", { create: loggedinCredentials.emailOfUser, result: result, list: list, type: loggedinCredentials.typeOfUser });
});

// build the signin api (in get format)
app.get("/login", async (req, res) => {

    return res.render("signin");
});

// build the signup api (in get format:get the data from the front-end)
app.get("/signup", (req, res) => {
    return res.render("signup");
});

// build the signup api (in post format:post the data to the back-end)
app.post("/signup", async (req, res) => {
    const id = req.body;
    console.log("I am inside the signup function!")
    console.log(req.body);
    if (id.gmail && id.password) {
        // check if the the requested gmail already exists
        let user = await Customers.findOne({ gmail: id.gmail });
        if (!user) {
            // User Doesn Not exist in Customer Section , then find in Employee section
            user = await Employees.findOne({ gmail: id.gmail });
            if (!user) {
                user = await Employees.findOne({ gmail: id.gmail });
            }
        }

        // if the requeste gmail is not present any section 
        if (!user) {
            const result1 = await Customers.create({
                gmail: id.gmail, password: id.password, address: id.address,
                phonenumber: id.phonenumber,
                fullname: id.fullname,
            });
            loggedinCredentials.emailOfUser = id.gmail;
            loggedinCredentials.passwordOfUser = id.password;
            loggedinCredentials.typeOfUser = 'c';
            let result = [];
            for (values in list) {
                let results_book = await Book.find({ subject: list[values] }).limit(5);

                result.push(results_book);

            }
            return res.render("home", { create: id.gmail, list: list, result: result, type: "c" }); // Pass local to template
        }

        return res.render("signup", { same: "ok" });
    }
});
// get the about api
app.get("/about", async (req, res) => {
    res.render("about");
})
// get the contact api
app.get("/contact", async (req, res) => {
    res.render("contact");
})
app.get("/invokesign", async (req, res) => {
    console.log(req.query);

    try {
        await SIGNIN(req.query.gmail, req.query.password, res, req);
    } catch (error) {
        console.error("Error during sign-in:", error);
        // Handle the error appropriately
        res.status(500).send("Internal Server Error");
    }
});



// 15 th April: code to implement the user auth if he has forgetten the password
// Endpoint to handle password reset request
app.post('/forget-password', async (req, res) => {
    console.log('I am inside the forget-password!')
    const email  = req.body.gmail;
    console.log(email);
    console.log(`I am in body ${req.body}`)
    console.log(`${req.query}`)
    // Check if email is provided
    if (!email) {
        return res.status(400).json({ error: 'Email is required' });
    }

    // Generate a random OTP (6 characters in hexadecimal)
    const otp = randomBytes(3).toString('hex');
    console.log(`otp generated is ${otp}`)

    // Store the OTP and its expiration time
    otps[email] = {
        otp,
        expiration: Date.now() + OTP_EXPIRATION_TIME,
    };

    console.log('I am here!')
    // Send the OTP to the user's email
    await sendOTP(email, otp);

    console.log('After the sendotp function!')

    return res.status(200).json({ message: 'OTP sent to your email' });
});

// Endpoint to verify the OTP
app.post('/verify-otp', (req, res) => {
    const { email, otp } = req.body;

    // Check if email and otp are provided
    if (!email || !otp) {
        return res.status(400).json({ error: 'Email and OTP are required' });
    }

    const userOtp = otps[email];

    // Check if an OTP was sent to this email
    if (!userOtp) {
        return res.status(400).json({ error: 'No OTP found for this email' });
    }

    // Check if the OTP has expired
    if (Date.now() > userOtp.expiration) {
        delete otps[email]; // Remove expired OTP
        return res.status(400).json({ error: 'OTP has expired' });
    }

    // Verify the OTP
    if (userOtp.otp === otp) {
        delete otps[email]; // Remove OTP after successful verification
        return res.status(200).json({ message: 'OTP verified successfully' });
    } else {
        return res.status(400).json({ error: 'Invalid OTP' });
    }
});


async function SIGNIN(valGmail, valPassword, res, req) {
    // console.log("I am here int the index/signin!");
    if (valGmail && valPassword) {
        console.log(`valGmail:${valGmail} and valPassword:${valPassword}`);
        // check if the user is present in the Customers Section
        let user = await Customers.findOne({ gmail: valGmail });
        console.log(`User find in singin api is ${user}`);
        if (!user) {
            console.log("I am here!");
            // check if is present in the Employees Section
            user = await Employees.findOne({ gmail: valGmail });
            console.log(`User find in em api is ${user}`);
            if (!user) {
                user = await Owners.findOne({ gmail: valGmail });
                console.log(`User find in owner api is ${user}`);
                if (!user) {
                    console.log('Invalid credentials for the owner!');
                    // Invalid Credentials
                    res.render("signin", { same: "ok" });

                }
                else {
                    if (valPassword == user.password) {// Owner
                        loggedinCredentials.emailOfUser = valGmail;
                        loggedinCredentials.passwordOfUser = valPassword;
                        loggedinCredentials.typeOfUser = 'o';
                        // Set user data in session
                        req.session.user = {
                            username: valGmail,
                            password: valPassword
                        };
                        res.redirect("/owner");
                    }
                    else {
                        // Invalid Credentials
                        res.render("signin", { same: "no" });
                    }
                }
            }
            else {
                // User Can be Employee
                if (valPassword == user.password) {
                    // User is employee
                    loggedinCredentials.emailOfUser = valGmail;
                    loggedinCredentials.passwordOfUser = valPassword;
                    console.log("I am at the employee page!");
                    loggedinCredentials.typeOfUser = 'e';
                    // search all the curr_ordered books and pass it to the employee page
                    res.redirect("/employee");

                }
                else {
                    // Invalid Credentials
                    res.render("signin", { same: "no" });
                }
            }
        }
        else {
            // User Can be customer
            if (valPassword == user.password) {
                // User is the Customer
                loggedinCredentials.emailOfUser = valGmail;
                loggedinCredentials.passwordOfUser = valPassword;
                loggedinCredentials.typeOfUser = 'c';
                let result = [];
                for (values in list) {
                    let results_book = await Book.find({ subject: list[values] }).limit(5);
                    result.push(results_book);
                }
                res.render("home", { create: valGmail, result: result, list: list, type: "c" });
            }
            else {
                // Invalid Credentials
                res.render("signin", { same: "no" });
            }
        }
    }
}

// 8th april codes
app.get("/logoutem", async (req, res) => {
    let result = [];
    for (values in list) {
        let results_book = await Book.find({ subject: list[values] }).limit(5);

        result.push(results_book);

    }
    loggedinCredentials = {};
    res.render("home", { create: "", type: "", result: result, list: list });
})

// 5th April codes

// Route to render owner page
app.get("/owner", isAuthenticated, async (req, res) => {
    // Render owner page view using EJS
    console.log("Am i getting triggered!");
    res.render("owner", { message: "" });
});


// api to render the image of single page
app.get("/bookpage", async (req, res) => {
    console.log(req.body);
    console.log(req.query);
    console.log("I am here!");
    // get the book-title here
    const bookTitle = req.query.title;
    // search the book-title here 
    const bookinfo = await Book.find({ title: bookTitle });
    console.log("I am printing the info of the book!");
    console.log(bookinfo);
    console.log("************");
    res.render("singlebook", { books: bookinfo });

})
// get the employee page
app.get("/employee", async (req, res) => {
    console.log(typeof (Customers));
    // get the curr_ordered_books
    const book = await curr_Ordered_books.find();
    console.log(typeof (book));
    // get id and gmail
    return res.render("employee_page", { message: "", books: book, empGmail: loggedinCredentials.emailOfUser, empPassword: loggedinCredentials.passwordOfUser, Employees, Book });
})

// api to see the inventory
app.get('/api/inventory', async (req, res) => {
    // fetch all the OrderBooks
    console.log('Hi , i am inside the /api/inventory function');
    const fetchedOrderBooks = await OrderedBook.find();
    console.log(fetchedOrderBooks);
    res.json(fetchedOrderBooks);
})

// api to order all the requested books
app.post("/order-all-books", async (req, res) => {
    // /get all the books from the requestedbooks and push them all to the books section
    let reqbook = await requestedbook.find();
    // push all the book to book section
    for (let i = 0; i < reqbook.length; i++) {
        // Get the corresponding users who have requsted for the books, and now mark the flag as true
        const cust_array = await requestedbook.findOne({ title: reqbook[i].title });
        // traverse the customer section of the book and mark the flag as true
        // Assuming cust_array.customerid is an array of customer objects with a 'gmail' property
        // Traverse the customer section of the book and mark the flag as true
        for (const customer of cust_array.customerid) {
            // Find the customer in the Customers collection and update the flag for the requested book
            await Customers.findOneAndUpdate(
                { gmail: customer.gmail, "booksrequested.title": reqbook[i].title },
                { $set: { "booksrequested.$.flag": true } },
                { $set: { Date2: new Date() } },
                { returnOriginal: false, },
            );
        }
        // first check if the book is already orderd
        const ifBookAlreadyOrdered = await OrderedBook.findOne({ title: reqbook[i].title });
        // create a book
        if (!ifBookAlreadyOrdered) {
            await OrderedBook.create(
                {
                    title: reqbook[i].title,
                    author: reqbook[i].author,
                    ISBN: reqbook[i].ISBN,
                    image_url_l: reqbook[i].image_url_l,
                    image_url_s: reqbook[i].image_url_l,
                    image_url_m: reqbook[i].image_url_l,
                    price: reqbook[i].price,
                    frequency: reqbook[i].count,
                    publication_date: reqbook[i].publication_date,
                    subject: reqbook[i].subject,
                });
        }
        else {
            await OrderedBook.findOneAndUpdate
                (
                    { title: reqbook[i].title },
                    {
                        $inc: { frequency: reqbook[i].count },
                    },
                    {
                        returnOriginal: false,
                    }
                )
        }
    }
    res.redirect("/owner");
});

// api to get the notifications for the employee
app.get("/get-notifications", async (req, res) => {
    const curr_Customer = await Customers.findOne({ gmail: loggedinCredentials.emailOfUser });
    res.render("notification", { customer: curr_Customer });
})

// api to order all the books below thresolds
app.post("/order-all-books-below-thresholds", async (req, res) => {
    // get the parameters from the api
    let Tobeadded = req.body.quantityTobeAdded;
    let Thresold = req.body.threshold;
    console.log(Thresold, 'i am thresold!');
    let bookBelowThresold = await Book.find({ frequency: { $lt: Thresold } });
    console.log('The number of books below thresold is ', bookBelowThresold.length);
    for (let i = 0; i < bookBelowThresold.length; i++) {
        // get all the books and push to orderd books for more copies
        // first check if the book is already orderd
        const ifBookAlreadyOrdered = await OrderedBook.findOne({ title: bookBelowThresold[i].title });
        console.log(ifBookAlreadyOrdered);
        console.log('I am if already Ordered!');
        // create a book
        if (!ifBookAlreadyOrdered) {
            await OrderedBook.create(
                {
                    title: bookBelowThresold[i].title,
                    author: bookBelowThresold[i].author,
                    ISBN: bookBelowThresold[i].ISBN,
                    image_url_l: bookBelowThresold[i].image_url_l,
                    image_url_s: bookBelowThresold[i].image_url_l,
                    image_url_m: bookBelowThresold[i].image_url_l,
                    price: bookBelowThresold[i].price,
                    frequency: Tobeadded,
                    publication_date: bookBelowThresold[i].publication_date,
                    subject: bookBelowThresold[i].subject,
                });
        }
        else {
            await OrderedBook.findOneAndUpdate
                (
                    { title: bookBelowThresold[i].title },
                    {
                        $inc: { frequency: Tobeadded },
                    },
                    {
                        returnOriginal: false,
                    }
                )
        }
    }
    res.render("owner", { message: "Book ordered SucessFully!" });
})

app.get("/view-business-data-employee-by-emoloyee", async (req, res) => {
    // get the date,month and year
    const gmail = req.query.gmail;
    const date = req.query.date;
    const month = req.query.month;
    const year = req.query.year;

    if (date && month && year) {
        // If all three are given
        const bookFallenBelowThreshold = await BookSolds.find({
            date: date,
            year: year,
            month: month,
            "details.Seller": loggedinCredentials.emailOfUser// Assuming gmail is a variable containing the seller's email
        }); // Searching with respect to both year, date, and month
        let totalamount = 0;
        bookFallenBelowThreshold.forEach((book, index) => {
            totalamount = totalamount + (book.price * book.frequency);
        });

        console.log(bookFallenBelowThreshold);
        res.render("accounts", {
            books: bookFallenBelowThreshold,
            total: totalamount,
        });
    } else {
        if (month && year) {
            // If only month and year are given
            const bookFallenBelowThreshold = await BookSolds.find({
                year: year,
                month: month,
                "details.Seller": loggedinCredentials.emailOfUser,
            });
            let totalamount = 0;
            bookFallenBelowThreshold.forEach((book, index) => {
                totalamount = totalamount + (book.price * book.frequency);
            });
            console.log(bookFallenBelowThreshold);
            res.render("accounts", {
                books: bookFallenBelowThreshold,
                total: totalamount,
            });
        } else {
            if (year) {
                // If only year is given
                const bookFallenBelowThreshold = await BookSolds.find({ year: year, "details.Seller": loggedinCredentials.emailOfUser });
                console.log(bookFallenBelowThreshold);
                let totalamount = 0;
                bookFallenBelowThreshold.forEach((book, index) => {
                    totalamount = totalamount + (book.price * book.frequency);
                });
                res.render("accounts", {
                    books: bookFallenBelowThreshold,
                    total: totalamount,
                });
            } else {
                // If neither year, month, nor date are given
                res.redirect("/owner");
            }
        }
    }
});




// api to see the buisness data
app.get("/view-business-data", async (req, res) => {
    // get the date,month and year
    const date = req.query.date;
    const month = req.query.month;
    const year = req.query.year;

    if (date && month && year) {
        // If all three are given
        const bookFallenBelowThreshold = await BookSolds.find({
            date: date,
            year: year,
            month: month,
        }); // Searching with respect to both year, date, and month
        let totalamount = 0;
        bookFallenBelowThreshold.forEach((book, index) => {
            totalamount = totalamount + (book.price * book.frequency);
        });

        console.log(bookFallenBelowThreshold);
        res.render("accounts", {
            books: bookFallenBelowThreshold,
            total: totalamount,
        });
    } else {
        if (month && year) {
            // If only month and year are given
            const bookFallenBelowThreshold = await BookSolds.find({
                year: year,
                month: month,
            });
            let totalamount = 0;
            bookFallenBelowThreshold.forEach((book, index) => {
                totalamount = totalamount + (book.price * book.frequency);
            });
            console.log(bookFallenBelowThreshold);
            res.render("accounts", {
                books: bookFallenBelowThreshold,
                total: totalamount,
            });
        } else {
            if (year) {
                // If only year is given
                const bookFallenBelowThreshold = await BookSolds.find({ year: year });
                console.log(bookFallenBelowThreshold);
                let totalamount = 0;
                bookFallenBelowThreshold.forEach((book, index) => {
                    totalamount = totalamount + (book.price * book.frequency);
                });
                res.render("accounts", {
                    books: bookFallenBelowThreshold,
                    total: totalamount,
                });
            } else {
                // If neither year, month, nor date are given
                res.redirect("/owner");
            }
        }
    }
});

// to get the business data  of employ
app.get("/view-business-data-employee", async (req, res) => {
    // get the date,month and year
    const gmail = req.query.gmail;
    const date = req.query.date;
    const month = req.query.month;
    const year = req.query.year;

    if (date && month && year) {
        // If all three are given
        const bookFallenBelowThreshold = await BookSolds.find({
            date: date,
            year: year,
            month: month,
            "details.Seller": gmail // Assuming gmail is a variable containing the seller's email
        }); // Searching with respect to both year, date, and month
        let totalamount = 0;
        bookFallenBelowThreshold.forEach((book, index) => {
            totalamount = totalamount + (book.price * book.frequency);
        });

        console.log(bookFallenBelowThreshold);
        res.render("accounts", {
            books: bookFallenBelowThreshold,
            total: totalamount,
        });
    } else {
        if (month && year) {
            // If only month and year are given
            const bookFallenBelowThreshold = await BookSolds.find({
                year: year,
                month: month,
                "details.Seller": gmail
            });
            let totalamount = 0;
            bookFallenBelowThreshold.forEach((book, index) => {
                totalamount = totalamount + (book.price * book.frequency);
            });
            console.log(bookFallenBelowThreshold);
            res.render("accounts", {
                books: bookFallenBelowThreshold,
                total: totalamount,
            });
        } else {
            if (year) {
                // If only year is given
                const bookFallenBelowThreshold = await BookSolds.find({ year: year, "details.Seller": gmail });
                console.log(bookFallenBelowThreshold);
                let totalamount = 0;
                bookFallenBelowThreshold.forEach((book, index) => {
                    totalamount = totalamount + (book.price * book.frequency);
                });
                res.render("accounts", {
                    books: bookFallenBelowThreshold,
                    total: totalamount,
                });
            } else {
                // If neither year, month, nor date are given
                res.redirect("/owner");
            }
        }
    }
});


// get  the history of the book 
app.get("/history-of-book", async (req, res) => {
    // get the date,month and year
    const book = req.query.book;
    const date = req.query.date;
    const month = req.query.month;
    const year = req.query.year;

    if (date && month && year) {
        // If all three are given
        const bookFallenBelowThreshold = await BookSolds.find({
            date: date,
            year: year,
            month: month,
            title: book // Assuming gmail is a variable containing the seller's email
        }); // Searching with respect to both year, date, and month
        let totalamount = 0;
        bookFallenBelowThreshold.forEach((book, index) => {
            totalamount = totalamount + (book.price * book.frequency);
        });

        console.log(bookFallenBelowThreshold);
        res.render("accounts", {
            books: bookFallenBelowThreshold,
            total: totalamount,
        });
    } else {
        if (month && year) {
            // If only month and year are given
            const bookFallenBelowThreshold = await BookSolds.find({
                year: year,
                month: month,
                title: book,
            });
            let totalamount = 0;
            bookFallenBelowThreshold.forEach((book, index) => {
                totalamount = totalamount + (book.price * book.frequency);
            });
            console.log(bookFallenBelowThreshold);
            res.render("accounts", {
                books: bookFallenBelowThreshold,
                total: totalamount,
            });
        } else {
            if (year) {
                // If only year is given
                const bookFallenBelowThreshold = await BookSolds.find({ year: year, title: book });
                console.log(bookFallenBelowThreshold);
                let totalamount = 0;
                bookFallenBelowThreshold.forEach((book, index) => {
                    totalamount = totalamount + (book.price * book.frequency);
                });
                res.render("accounts", {
                    books: bookFallenBelowThreshold,
                    total: totalamount,
                });
            } else {
                // If neither year, month, nor date are given
                res.redirect("/owner");
            }
        }
    }
});
app.get("/allbooks", async (req, res) => {
    const subject = req.query.subject;
    console.log(subject);
    let result = await Book.find({ subject: subject });

    console.log(result);

    return res.render("allbooks", { create: loggedinCredentials.emailOfUser, subject: subject, result: result })
});
app.get("/singlebook", async (req, res) => {
    const book = req.query.book;
    console.log(book);
});

// define the search method
app.get("/search", async (req, res) => {

    // get the title name or the author name of the book 
    let inputval = req.query.query;
    let search_basis = req.query.searchType;
    console.log(`The query is ${inputval} and the search_basis is ${search_basis}`);
    let book_details = [];//get init with empty string
    if (search_basis == "author") {
        book_details = await Book.find({ author: inputval });
        console.log(`The total number of such books is ${book_details.length}`)
    }
    else {
        book_details = await Book.find({ title: inputval });
    }

    //if book is not available
    if (book_details.length == 0) {
        if (search_basis == "title")
            return res.render("confirmRequest", { title: inputval });
        else
            return res.render("confirmRequest", { author: inputval });
    }
    else {
        return res.render("singlebook", { books: book_details });
    }

});


// create the request(book requst) api (if book is not found in the backend)
app.post("/request", async (req, res) => {
    return res.render("askDetails");
})
// get the function to display the book if it has been found

app.get("/singlebook", async (req, res) => {
    book_name = req.query.book;
    let book_details = await Book.findOne({ title: book_name });
    return res.render("singlebook", { book: book_details })
});

app.post("/singlebook", async (req, res) => {

    return res.redirect("/")
});

// Function to get the ISBN number given the title and the author name
const axios = require('axios');
const { stat } = require('fs');
const { cursorTo } = require('readline');
const { time } = require('console');
const { Logger } = require('selenium-webdriver/lib/logging.js');
// const { default: mongoose } = require("mongoose");

async function getISBN(title, author) {
    try {
        const response = await axios.get('https://www.googleapis.com/books/v1/volumes', {
            params: {
                q: `intitle:${title}+inauthor:${author}`,
                maxResults: 1,
                key: 'YOUR_API_KEY' // Replace with your actual API key
            }
        });

        const book = response.data.items[0];
        const isbn = book.volumeInfo.industryIdentifiers.find(id => id.type === 'ISBN_13').identifier;

        return isbn;
    } catch (error) {
        console.error('Error fetching ISBN:', error.message);
        return null;
    }
}

// let's write the submitt details api
app.post("/submit_details", async (req, res) => {
    // since we have got the data's for the requested books , now push it to the backe-end database
    const infoOfBook = req.body;
    const titleOfBook = infoOfBook.title;
    const authorOfBook = infoOfBook.author;
    const isbnOfBook = infoOfBook.isbn;
    // const isbnOfBook = getISBN(titleOfBook, authorOfBook);
    // const publication_dateOfBook = infoOfBook.publication_date;
    const genre_of_book = infoOfBook.genre;
    const descpOfBook = infoOfBook.description;
    const subOfBook = infoOfBook.subject;
    // push the info that the user has requsted for the books
    await Customers.findOneAndUpdate(
        { gmail: loggedinCredentials.emailOfUser }
        , {
            $push: { booksrequested: { Date1: new Date(), title: titleOfBook, author: authorOfBook, ISBN: isbnOfBook } },
        }, {
        returnOriginal: false,
    }
    )
    // completed pushing to the customers database
    // find if the request already exists
    const ifalreadyexist = await requestedbook.findOne({ title: titleOfBook });
    console.log('I am inside the submit_details function!')
    console.log(ifalreadyexist);
    if (ifalreadyexist) {
        await requestedbook.updateOne({ title: titleOfBook }, { $inc: { count: 1 } }, { $push: { customerid: { gmail: loggedinCredentials.emailOfUser } } });
    }
    // now push the data to the requested_books collection
    else {
        // randomly generate the price
        let min = 1300;
        let max = 2000;
        let priceVal = await Math.floor(Math.random() * (max - min)) + min;
        const new_Requested_book = await requestedbook.create({ title: titleOfBook, author: authorOfBook, genre: genre_of_book, subject: subOfBook, ISBN: infoOfBook.isbn, image_url_l: infoOfBook.image, image_url_m: infoOfBook.image, image_url_s: infoOfBook.image, price: priceVal, customerid: [{ gmail: loggedinCredentials.emailOfUser }] });
    }
    res.redirect("/");
})

// writing the apis which will be handling the function of the owner
app.get('/view-requested-books', async (req, res) => {
    try {
        // Fetch requested books data from MongoDB
        const books = await requestedbook.find();
        res.render('renderRequestedBooks.ejs', { books });
    } catch (error) {
        console.error('Error fetching requested books:', error);
        res.status(500).send('Internal Server Error');
    }

});

// api's to ignore the book-requests
app.delete('/ignore-book/:bookId', async (req, res) => {
    const bookId = req.params.bookId;
    console.log("I am delete in the index.js file!");
    try {
        // Delete the book document from the database
        await requestedbook.findByIdAndDelete(bookId);
        res.sendStatus(200); // Send success response
    } catch (error) {
        console.error('Error ignoring book:', error);
        res.sendStatus(500); // Send internal server error response
    }
});

// api's to search the book-online
// Define route to handle requests to /book-details



// Update the route handler
app.get('/search-online', async (req, res) => {
    const title = req.query.title;
    const author = req.query.author;
    try {
        // Use node-fetch to make the HTTP request
        const response = await fetch(`https://www.googleapis.com/books/v1/volumes?q=intitle:${title}+inauthor:${author}`);
        const data = await response.json();
        // Render the book details page
        res.render("showBook", { book: data });
    } catch (error) {
        console.error('Error fetching book details:', error);
        res.status(500).send('Internal Server Error');
    }
});


// get the api to save the data to the backends
app.post("/save_to_currordered_books", async (req, res) => {
    try {
        console.log("Inside the save function!");
        console.log(req.body);
        console.log(req.query);
        console.log(loggedinCredentials);

        // Assuming `loggedinCredentials` contains the ID of the logged-in user

        // Save the data to the curr_ordered_books collection
        await curr_Ordered_books.create({
            title: req.query.title,
            author: req.query.author,
            ISBN: req.query.isbn,
            customerid: loggedinCredentials,
            price: req.query.price,
            count: req.query.count,
        });
        // Save the data that the cutomer have requested for this book
        await Customers.findOneAndUpdate(
            { gmail: loggedinCredentials.emailOfUser },
            {
                $push: {
                    bookspurchased: {
                        Date: new Date().toISOString(),
                        title: req.query.title,
                        author: req.query.author,
                        copies: req.query.count, // or whatever the count is
                        price: req.query.price, // or whatever the price is
                        ISBN: req.query.isbn,
                        flag: false // or true, depending on your requirement
                    }
                }
            }
        );// Send a success response
        res.sendStatus(200);
    } catch (error) {
        console.error("Error saving data to curr_ordered_books:", error);
        // Send an error response
        res.status(500).send("Error saving data to curr_ordered_books");
    }
});

// Give the get recipt function here
app.get("/get_receipt", async (req, res) => {
    console.log('I am inside the /get_receipt api');
    console.log(req.body);
    console.log(req.query);
    console.log(req.params);
    const TodayDate = await getCurrDate();
    res.render("generate_reciept", { title: decodeURIComponent(req.query.title), price: decodeURIComponent(req.query.price), isbn: decodeURIComponent(req.query.isbn), author: decodeURIComponent(req.query.author), count: decodeURIComponent(req.query.count), customId: decodeURIComponent(loggedinCredentials.emailOfUser), todayDate: TodayDate });
})

// api to update the receipt status of the customer for a book
// Assuming you are using Express.js
app.get('/update_receipt_status', async (req, res) => {
    try {
        const isbn = req.query.isbn;
        const cid = req.query.cust;

        console.log('I am inside the update_receipt status');
        console.log(isbn);
        console.log(cid);

        // Update the receipt status
        const updatedCustomer = await Customers.findOneAndUpdate(
            {
                gmail: cid,
                "bookspurchased.ISBN": isbn,
                "bookspurchased.receipt": false
            },
            {
                $set: {
                    "bookspurchased.$.receipt": true
                }
            },
            { new: true }
        );

        if (updatedCustomer) {
            console.log("Receipt status updated successfully:", updatedCustomer);
            res.json({ success: true, message: "Receipt status updated successfully" });
        } else {
            console.log("No matching document found to update receipt status");
            res.json({ success: false, message: "No matching document found to update receipt status" });
        }
    } catch (error) {
        console.error('Error updating receipt status:', error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
});


// Api to see the customer history
app.get("/cust_hist", async (req, res) => {

    console.log(req.query.gmail);
    // now find the customer in the database
    const UniqueCust = await Customers.findOne({ gmail: req.query.gmail });
    // now render the page of history
    console.log('I am inside the /cust_hist api , and the value of the UniqueCust is ', UniqueCust);
    res.render("custbook", { customer: UniqueCust });
})

// Get the api to check if the book-ordered is issued by the Employee and if it so , then ISBN must be deleted form the Database// Handle request to check if ISBN is deleted
app.get('/check_isbn_deleted', async (req, res) => {
    try {
        // Perform a query to check if the ISBN is deleted from curr_Ordered_books
        // Here you would perform a query to your MongoDB database to check if the ISBN exists in the curr_Ordered_books collection
        console.log(req.query);
        console.log(req.body);
        const isbnExists = await curr_Ordered_books.findOne({ ISBN: req.query.isbn, "customerid.emailOfUser": req.query.cust });
        console.log(isbnExists);
        console.log(req.query.isbn);
        // Send the response indicating whether the ISBN is deleted
        if (!isbnExists) {
            // find the same book in bookssolds
            const forseller = await BookSolds.findOne({ ISBN: req.query.isbn, "details.Buyer": req.query.cust });
            res.json({ isDeleted: true, seller: forseller.details.Seller }); // If ISBN does not exist, it's considered deleted
        }
        else {
            res.json({ isDeleted: false });
        }
    } catch (error) {
        console.error('Error checking ISBN:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});


// getall_Books api for the employee page(curr_ordered books)
// Define routes
app.get('/get_all_books', async (req, res) => {
    try {
        const books = await curr_Ordered_books.find(); // Fetch all books from the database
        console.log(res.json(books));
        return res.json(books); // Send the books as JSON response
    } catch (err) {
        console.error('Error fetching books:', err);
        res.status(500).send('Internal Server Error');
    }
});


// function to add the employee
app.post("/add-employee", async (req, res) => {
    // let's create the user in the data's collection of the mongodb
    console.log(req.body);
    const id = req.body;
    const emId = req.body.email;
    const emPassword = req.body.password;

    // first search if someone with same id exists in Customer section, Employee or the owner section
    let ifsameid = await Customers.findOne({ gmail: emId });
    if (!ifsameid) {
        ifsameid = await Employees.findOne({ gmail: emId });
        // check if it present in the Owner Section
        if (!ifsameid) {
            ifsameid = await Employees.findOne({ gmail: emId });
        }
    }
    if (ifsameid) {
        res.render("owner", { message: "This email ID already exists!" });
    } else {
        await Employees.create({
            gmail: emId, password: emPassword, address: id.address,
            phonenumber: id.phonenumber,
            fullname: id.fullname, salary: id.salary
        });
        res.render("owner", { message: "Employee added successfully!" });
    }
});
// Get the api for the remove-employee
app.post("/remove-employee", async (req, res) => {
    // find and delete the employee from the database
    try {
        await Employees.findOneAndDelete({ gmail: req.body.email });
        // redirect the owner to owner page again
        res.render("owner", { message: "Employee removed successfully!" });
    }
    catch (error) {
        res.render("owner", { message: "Error Employee successfully!" });
    }
}
)

// Get the last 10 days statistics
app.get("/view-last-10-days-stats", async (req, res) => {
    try {
        // Get the current date
        const currentDate = new Date();

        // Calculate the date 10 days ago
        const startDate = new Date(currentDate);
        startDate.setDate(startDate.getDate() - 10);

        // Find books sold within the last 10 days
        const soldbooks = await BookSolds.find();

        // Render the "lastendays.ejs" page with the soldbooks data
        return res.render("lastendays", { soldbooks });
    } catch (error) {
        console.error("Error fetching last 10 days statistics:", error);
        // Handle error and render an error page if needed
        return res.render("error", { error });
    }
})

// API TO SEE THE BOOKS BELOW THRESOLD
app.get("/view-books-below-threshold", async (req, res) => {
    // create a json object array
    let BookBelowThresold = [];
    // get the thresold value
    let thresholdvalue = req.query.threshold;
    console.log(thresholdvalue);
    // now get the books in the Books that have fallen below the thresold
    const bookFallenBelowThreshold = await Book.find({ frequency: { $lt: thresholdvalue } });
    // console.log(bookFallenBelowThreshold.length);
    res.render("belowthresold", { books: bookFallenBelowThreshold, val: thresholdvalue });

})

// Delete book by ISBN
app.delete('/delete-book/:isbn/:cid/:freqCopies', async (req, res) => {
    console.log("I am inside the delete api with given count 9th april!")
    const isbn = req.params.isbn;
    const custId = req.params.cid;
    console.log(req.params);
    console.log("Here and There!");
    console.log(isbn);
    const value = parseInt(req.params.freqCopies);
    try {
        // Find the book in curr_requested_books collection and delete it
        let statusVal = await curr_Ordered_books.findOneAndDelete({ ISBN: isbn, "customerid.emailOfUser": req.params.cid });
        // Update the status of the book in the customer section
        console.log("Updating the flag inside the delete function!");
        console.log(custId);
        // update the count of the book 
        await Book.findOneAndUpdate(
            { ISBN: isbn },
            { $inc: { frequency: -value } },
            { returnOriginal: false }
        );

        await Customers.findOneAndUpdate(
            {
                gmail: custId,
                "bookspurchased.ISBN": isbn,
                "bookspurchased.flag": false,
            },
            {
                $set: {
                    "bookspurchased.$.flag": true, // Update the flag field of the matched book
                    "bookspurchased.$.seller": loggedinCredentials.emailOfUser,
                }
            },
            { new: true }
        )
            .then(updatedCustomer => {
                console.log("Flag updated successfully:", updatedCustomer);
            })
            .catch(err => {
                console.log("Error updating flag:", err);
            });
        await Employees.findOneAndUpdate(
            { gmail: loggedinCredentials.emailOfUser }, // Filter object
            {
                $push: {
                    booksSold: {
                        Date: new Date(),
                        copies: value,
                        buyer: custId,
                        price: statusVal.price,
                        ISBN: statusVal.ISBN
                    }
                }
            },
            { returnOriginal: false, }, // Update object
        );

        if (statusVal) {
            // Book has been sold 
            // Get the CurrentDate
            const currentDate = new Date();
            const curryear = currentDate.getFullYear();
            const currmonth = currentDate.getMonth();
            const currdate = currentDate.getDate();
            const currhour = currentDate.getHours();
            // Add the books to the sold history
            await BookSolds.create({ title: statusVal.title, ISBN: statusVal.ISBN, author: statusVal.author, frequency: statusVal.no_Of_Copies_Asked, details: { Buyer: statusVal.customerid.emailOfUser, Seller: loggedinCredentials.emailOfUser }, price: statusVal.price, currdate: currentDate.toString(), year: curryear, month: currmonth + 1, date: currdate, hours: currhour });
            // Push the book sold to the list of the Employees
            await Employees.findOneAndUpdate({ gmail: statusVal.customerid.emailOfUser }, { $push: { booksSold: { Date: currdate.toString(), buyer: statusVal.customerid.emailOfUser, copies: statusVal.no_Of_Copies_Asked, price: statusVal.price, ISBN: statusVal.ISBN } } });
            res.sendStatus(200);
        }
        else {
            // console.error('Error deleting book by ISBN:', error);
            res.sendStatus(500);
        }
        // res.sendStatus(200); // Send success response
    } catch (error) {
        console.error('Error deleting book by ISBN:', error);
        // res.sendStatus(500); // Send internal server error response
    }
});

// api to order the book
app.post("/order-book", async (req, res) => {
    // console.log('i am done! inside the done!')
    // first find if the book has been already ordered
    // console.log(req.body.title);
    const ifalreadyOrdered = await OrderedBook.find({ title: req.body.title });
    console.log(`i am inside the app.post if alraedy orderd ${ifalreadyOrdered}`)
    const { titleInput, authorInput, isbnInput, subjectInput, imageLinkInput, publicationDateInput, priceInput, copiesInput } = req.body;
    if (ifalreadyOrdered) {
        await OrderedBook.findOneAndUpdate(
            {
                title: titleInput,
            }
            ,
            {
                $inc: { frequency: parseInt(copiesInput) }
            },
            {
                returnOriginal: false,
            }
        )
    }
    else {
        await OrderedBook.create({
            title: titleInput,
            author: authorInput,
            ISBN: isbnInput,
            subject: subjectInput,
            image_url_l: imageLinkInput, // Assuming this is the large image URL
            image_url_m: imageLinkInput, // Assuming this is the medium image URL
            image_url_s: imageLinkInput, // Assuming this is the small image URL
            publication_date: publicationDateInput,
            price: parseInt(priceInput),
            frequency: parseInt(copiesInput),
        });
    }
    res.render("owner", { message: "Book has been Ordered!" });
})

// api to order the books below thresolds
app.post("/order_book", async (req, res) => {
    // confirm the fetch request
    // console.log(req.body);
    // let's order the book
    console.log("_____________________");
    console.log(req.body.title);
    console.log("_______________________");
    // check if the user already exists
    const ifalreadyexist=await OrderedBook.findOne({title:req.body.title});
    // console.log(Book.find({ title: req.body.title }));
   if(!ifalreadyexist) {
    const getBook = await Book.findOne({ title: req.body.title });
    console.log(getBook);
    await OrderedBook.create({
        title: getBook.title,
        author: getBook.author,
        ISBN: getBook.ISBN,
        subject: getBook.subject,
        image_url_l: getBook.image_url_l, // Assuming this is the large image URL
        image_url_m: getBook.image_url_l, // Assuming this is the medium image URL
        image_url_s: getBook.image_url_l, // Assuming this is the small image URL
        publication_date: getBook.publication_date,
        price: getBook.price,
        frequency: parseInt(req.body.quantity),
        location: getBook.location_id,
    });
    }else
    {
        await OrderedBook.findOneAndUpdate(
                        {
                            title: req.body.title,
                        }
                        ,
                        {
                            $inc: { frequency: parseInt(req.body.quantity) }
                        },
                        {
                            returnOriginal: false,
                        }
                    )

    }console.log("Done");
    res.sendStatus(200);

})
// api to order the requested books
app.post("/order_req_book", async (req, res) => {
    // confirm the fetch request
    // console.log(req.body);
    // let's order the book
    console.log("_____________________");
    console.log(req.body.title);
    console.log("_______________________");
    // console.log(Book.find({ title: req.body.title }));
    // 14th April
    // Get the corresponding users who have requsted for the books, and now mark the flag as true
    const cust_array = await requestedbook.findOne({ title: req.body.title });
    // traverse the customer section of the book and mark the flag as true



    // Assuming cust_array.customerid is an array of customer objects with a 'gmail' property
    // Traverse the customer section of the book and mark the flag as true
    for (const customer of cust_array.customerid) {
        // Find the customer in the Customers collection and update the flag for the requested book
        await Customers.findOneAndUpdate(
            { gmail: customer.gmail, "booksrequested.title": req.body.title },
            {
                $set: {
                    "booksrequested.$.flag": true, // Update the flag in the array
                    Date2: new Date() // Update Date2 to the current date and time
                }
            },
            { returnOriginal: false, },
        );
    }
    // first check if the book has been already ordered
    let ifordered = await OrderedBook.findOne({ title: req.body.title });
    if (!ifordered) {
        await OrderedBook.create({ title: req.body.title, author: req.body.author, ISBN: req.body.ISBN, price: req.body.price, frequency: req.body.quantity, image_url_l: req.body.image, image_url_m: req.body.image, image_url_s: req.body.image, subject: req.body.subject });
    }
    else {
        await OrderedBook.findOneAndUpdate({ title: req.body.title }, { $inc: { frequency: req.body.title } }, { returnOriginal: false },);
    }// finally delete the book from the requested section
    await requestedbook.deleteOne({ title: req.body.title });
    res.sendStatus(200);

})

// api to add the book-requested by owner or employee
app.post("/book-request", async (req, res) => {
    // This will add the book to database
    console.log("I am inside the book-request function!")
    console.log(req.query)
    console.log(req.body)
    // Extracting values from req.body using object destructuring
    const { titleInput, authorInput, isbnInput, subjectInput, imageLinkInput, publicationDateInput, priceInput, copiesInput, location } = req.body;

    // first find if the book is already there
    const tempbook = await Book.findOne({ title: titleInput });
    if (!tempbook)
    // Now push these books to the Shop 
    {
        await Book.create({
            title: titleInput,
            author: authorInput,
            ISBN: isbnInput,
            subject: subjectInput,
            image_url_l: imageLinkInput, // Assuming this is the large image URL
            image_url_m: imageLinkInput, // Assuming this is the medium image URL
            image_url_s: imageLinkInput, // Assuming this is the small image URL
            publication_date: publicationDateInput,
            price: priceInput,
            frequency: copiesInput,
            location_id: location
        });
    } else {
        // The book is already there
        await Book.findOneAndUpdate(
            { title: titleInput },
            {
                $inc: { frequency: copiesInput }
            }
            , {
                returnOriginal: false,
            }
        )
    }
    // Now remove the book from the orderbooks section
    await OrderedBook.deleteOne({ title: titleInput });
    res.redirect('/employee?param1=${Book has been added sucessfully}');
})

// api to inspect the employee
app.get("/inspectem", async (req, res) => {

    console.log(req.body);
    console.log(req.query);
    // now perform the operation
    const employee = await Employees.find({ gmail: req.query.employee_email });
    console.log(`I am inside the employee section!`);
    console.log(employee);
    if (employee) {
        res.render("showemp", { employee: employee });
    }
    else {
        res.render("owner", { message: "No Such Employee Exist!" });
    }
}
)

// api to inspect the customer
app.get("/inspectcs", async (req, res) => {

    console.log(req.body);
    console.log(req.query);
    // now perform the operation
    const customer = await Customers.find({ gmail: req.query.customer_email });
    console.log(`I am inside the employee section!`);
    console.log(customer);
    if (customer) {
        res.render("showcs", { customer: customer });
    }
    else {
        res.render("owner", { message: "No Such Employee Exist!" });
    }
}
)

// 7th april: By Tharun

// api to render the individual logout and data  page
app.get("/individualspage", async (req, res) => {
    if (loggedinCredentials.emailOfUser == "owner@gmail.com") {
        res.render("owner", { message: "" });
    }
    else if (loggedinCredentials.typeOfUser == "e") {

    }
    else{

    const customer = await Customers.findOne({
        gmail: loggedinCredentials.emailOfUser,
    });
    console.log(loggedinCredentials.emailOfUser);
    console.log(customer);
    // console.log(customer.get("gmail"));
    res.render("individuals", { customer: customer });
}
});

// api to get the inventory for all the books
app.get("/seeinventorybyowner",async(req,res)=>{
    const bookarray=await BookSolds.find();
    res.render("showinventory",{books:bookarray});
})

// api to  to edit the profile and logout
app.post("/individualspage", async (req, res) => {
    console.log("Inside the individual page!");
    if (req.query.gmail) {
        res.render("editprofile");
    } else {
        loggedinCredentials.emailOfUser = "";
        res.redirect("/");
    }
});
/// api to edit the profile
app.post("/editprofile", async (req, res) => {
    const id = req.body;
    const updatedCustomer = await Customers.findOneAndUpdate(
        { gmail: loggedinCredentials.emailOfUser }, // Search query: Find the document with the matching 'gmail' field
        {
            $set: {
                address: id.address, // Update the 'address' field with the new value
                phonenumber: id.phonenumber, // Update the 'phonenumber' field with the new value
                fullname: id.fullname, // Update the 'fullname' field with the new value
            },
        }, // Update fields using the $set operator
        { new: true } // Return the updated document after the update is applied
    );
    res.redirect("/");
});

// april 11th 
// api to allow the customers to add the books to cart
app.get("/add-to-cart", async (req, res) => {

    tittle = req.query.tittle;
    console.log("hello");
    console.log(tittle);
    let book_details = await Book.findOne({ title: tittle });
    await Customers.findOneAndUpdate(
        { gmail: loggedinCredentials.emailOfUser }, // Search query: Find the document with the matching ID
        { $push: { addedtocart: { title: book_details.title, author: book_details.author, price: book_details.price, ISBN: book_details.ISBN } } },
        {
            returnOriginal: false,
        }
    );
    console.log("hello");
    console.log(book_details);
    res.redirect("/");
});
app.get("/view-cart", async (req, res) => {
    try {
        // Fetch requested books data from MongoDB
        let customer = await Customers.findOne(
            { gmail: loggedinCredentials.emailOfUser }, // Search query: Find the document with the matching ID 
        );
        let books = customer.get("addedtocart");
        console.log(books);
        res.render("cart.ejs", { books });
    } catch (error) {
        console.error("Error fetching requested books:", error);
        res.status(500).send("Internal Server Error");
    }

});
app.get("/singlebook-cart", async (req, res) => {
    const bookTitle = req.query.title;
    // search the book-title here
    const custId = loggedinCredentials.emailOfUser;
    // let's remove the book from the cart
    await Customers.findOneAndUpdate(
        { gmail: custId },
        {
            $pull: { addedtocart: { title: bookTitle } },
        },
        {
            returnOriginal: false,
        }
    )
    const bookinfo = await Book.find({ title: bookTitle });
    console.log(bookinfo);
    console.log("************");
    res.render("singlebook", { books: bookinfo });

});
app.get("/remove-from-cart", async (req, res) => {
    const bookTitle = req.query.title;
    const custId = loggedinCredentials.emailOfUser;

    // Remove the book from the cart
    await Customers.findOneAndUpdate(
        { gmail: custId },
        {
            $pull: { addedtocart: { title: bookTitle } },
        },
        {
            new: true, // Return the updated document
        }
    );

    // Fetch the updated customer document
    const customer = await Customers.findOne(
        { gmail: loggedinCredentials.emailOfUser } // Search query: Find the document with the matching email
    );

    // Get the updated list of books in the cart
    const books = customer.addedtocart;

    console.log(books);

    // Render the "cart.ejs" template with the updated list of books in the cart
    res.render("cart.ejs", { books });
});



app.listen(PORT, async () => console.log("server started"));