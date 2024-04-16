// Import the mongoose here
const mongoose = require("mongoose");

// Define the DataScheme here
const customerSchema = new mongoose.Schema(
  {
    gmail: {
      type: String,
      required: true,
    },
    password:
    {
      type: String,
      required: true,
    },
    bookspurchased:
      [
        {
          Date: String,
          seller: String,
          copies: Number,
          price: Number,
          ISBN: String,
          title: String,
          author: String,
          flag:
          {
            type: Boolean,
            default: false,
          },
          receipt:
          {
            type: Boolean,
            default: false,
          }
        }
      ],
    booksrequested:

      [
        {
          Date1: { 
            type:String,
            default:"",
          },
          Date2:
          {
            type:String,
            default:"",
          },
          ISBN: String,
          title: String,
          author: String,
          flag:
          {
            type: Boolean,
            default: false,
          },
        }
      ],

    address:
    {
      type: String,
    },
    fullname:
    {
      type: String,
    },
    phonenumber:
    {
      type: Number,
    },
    addedtocart:
      [
        {
          title: String,
          author: String,
          price: Number,
          ISBN: String,
        }
      ],
  });

// Define the Employee Schema
const employeeSchema = new mongoose.Schema({
  gmail:
  {
    type: String,
    required: true,
  },
  password:
  {
    type: String,
    required: true,
  },
  salary:
  {
    type: Number,
    default: 2500,
  },
  booksSold:
    [
      {
        Date: String,
        buyer: String,
        copies: Number,
        price: Number,
        ISBN: String,
      }
    ],
  address:
  {
    type: String,
  },
  fullname:
  {
    type: String,
  },
  phonenumber:
  {
    type: Number,
  }
})

// Define the owner Schema
const ownerSchema = new mongoose.Schema({
  gmail:
  {
    type: String,
    required: true,
  },
  password:
  {
    type: String,
    required: true,
  }
})

// Define the Book here
const book = new mongoose.Schema({
  ISBN: {
    type: String,
    required: true
  },
  title: {
    type: String,
    required: true
  },
  author: {
    type: String,
    required: true
  },
  publication_date: {
    type: String,
  },
  genre: {
    type: String,
  },
  image_url_s: {
    type: String,

  },
  image_url_m: {
    type: String,

  },
  image_url_l: {
    type: String,

  },
  frequency: {
    type: Number,

  },
  subject: {
    type: String,

  },
  location_id: {
    type: String,

  },
  price: {
    type: Number,

  }
});

// create the schema of requested_books
const requestedBookSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    unique: true,
  },
  author: {
    type: String,
    required: true
  },
  genre: {
    type: String,
    default: ""
  },
  subject: {
    type: String,
    required: true,
  },
  count: {
    type: Number,
    default: 1,
  },
  customerid:
    [
      {
        gmail: String,
      }
    ],
  ISBN:
  {
    type: String,
    required: true,
  },
  image_url_l:
  {
    type: String,
    required: true,
  },
  image_url_s:
  {
    type: String,
    default: "",
  },
  image_url_m:
  {
    type: String,
    default: "",
  },
  price:
  {
    type: Number,
    required: true,
  },
  location:
  {
    type: String,
    default: "Not Present",
  },
  publication_date:
  {
    type: String,
    default: "",
  }
});

// create the schema for the currorderedbooks

const currentorderedbookschema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  author: {
    type: String,
    required: true
  },
  subject: {
    type: String,
    default: ""
  },
  count: {
    type: Number,
    default: 1,
  },
  customerid: {
    type: mongoose.Schema.Types.Mixed, // Allows storing any type of data, including objects
    required: true
  },
  ISBN:
  {
    type: String,
    required: true,
  },
  price:
  {
    type: Number,
    required: true,
  }
})
// Get the Schema for the bookssolds
const bookSoldsSchema = new mongoose.Schema({
  ISBN: {
    type: String,
    required: true
  },
  title: {
    type: String,
    required: true
  },
  author: {
    type: String,
    required: true
  },
  publication_date: {
    type: String,
  },
  genre: {
    type: String,
  },
  image_url_s: {
    type: String,

  },
  image_url_m: {
    type: String,

  },
  image_url_l: {
    type: String,

  },
  frequency: {
    type: Number,
    default: 1,
  },
  subject: {
    type: String,

  },
  price: {
    type: Number,

  },
  details:
  {
    type: mongoose.Schema.Types.Mixed,
  },
  currdate:
  {
    type: String,
    required: true,
  },
  year:
  {
    type: String,
    required: true,
  },
  month:
  {
    type: String,
    required: true,
  },
  date:
  {
    type: String,
    required: true,
  },
  hours:
  {
    type: String,
    required: true,
  }
})

// create the schema for the ordered_book
const order_book = new mongoose.Schema({
  title:
  {
    type: String,
    required: true,
  },
  author:
  {
    type: String,
    required: true,
  },
  ISBN:
  {
    type: String,
    required: true,
  },
  subject:
  {
    type: String,
    required: true,
  },
  image_url_l:
  {
    type: String,
    default: "",
  },
  image_url_m:
  {
    type: String,
    default: "",
  },
  image_url_s:
  {
    type: String,
    default: "",
  },
  publication_date:
  {
    type: String,
    default: "0000-00-00",
  },
  price:
  {
    type: Number,
    default: 1000,
  },
  frequency:
  {
    type: Number,
    default: 1,
  },
  location:
  {
    type: String,
    default: "Not present",
  }
})

// Get the models here
const curr_Ordered_books = mongoose.model("currorderedbook", currentorderedbookschema);
const requestedbook = mongoose.model("requestedbook", requestedBookSchema);
const Book = mongoose.model("book", book);
const BookSolds = mongoose.model("booksboughts", bookSoldsSchema);
const Customers = mongoose.model("customer", customerSchema);
const Employees = mongoose.model("employees", employeeSchema);
const Owners = mongoose.model("Owners", ownerSchema);
const OrderedBook = mongoose.model("orderbooks", order_book);
module.exports = { Book, requestedbook, curr_Ordered_books, Customers, Employees, Owners, BookSolds, OrderedBook };