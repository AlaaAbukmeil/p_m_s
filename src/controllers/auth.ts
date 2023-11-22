
require("dotenv").config()

const mongoose = require('mongoose');
const jwt = require('jsonwebtoken')
const jwtSecret = process.env.SECRET
const bcrypt = require('bcrypt');
const {
  MongoClient,
  ServerApiVersion
} = require('mongodb');
const saltRounds: any = process.env.SALT_ROUNDS
            
const uri = "mongodb+srv://alaa:" + process.env.MONGODBPASSWORD + "@atlascluster.zpfpywq.mongodb.net/?retryWrites=true&w=majority";

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

mongoose.connect(uri, {
  useNewUrlParser: true
})

export async function registerUser(email: string, password: string, verificationCode: string) {
    try {
      const database = client.db("auth");
      const usersCollection = database.collection("users");
      const secretCollection = database.collection("secrets")
      const verificationCodeDB = await secretCollection.findOne({ function: "verificationCode" })
      let salt = await bcrypt.genSalt(parseInt(saltRounds));
      let cryptedPassword = await bcrypt.hash(password, salt)
  
      const user = await usersCollection.findOne({ email: email });
      if (user == null && verificationCode == verificationCodeDB.code) {
        const updateDoc = {
  
          email: email,
          password: cryptedPassword,
          accessRole: "2"
        };
        const action = await usersCollection.insertOne(updateDoc);
        return { message: "registered",status: 200 }
      }
      else if (user) {
        return { message: "user already exist",status: 404 }
      }
      else {
        return { message: "unauthorized",status: 401 }
      }
  
    } catch (error) {
      return error
    }
  }
  export async function checkIfUserExists(email: string, password: string) {
    try {
      const database = client.db("auth");
      const usersCollection = database.collection("users");
  
      const user = await usersCollection.findOne({ email: email });
      if (user) {
        try {
          const result = await bcrypt.compare(password, user.password)
          if (result) {
            const jwtObject = {email: email, accessRole: user["accessRole"] }
            const token = jwt.sign(jwtObject, jwtSecret, { expiresIn: '24h' });
            return { "message": "authenticated", "status": 200, "token": token, "email": email };
          } else {
            return { "message": "wrong password", "status": 401 };
          }
        } catch (error) {
          return error
          // handle error appropriately
        }
      }
      else {
        return { "message": "user does not exit", "status": 401 };
      }
  
    } catch (error) {
      return error
    }
  }