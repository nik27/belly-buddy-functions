const admin = require('firebase-admin')
const serviceAccount = require('../serviceAccount.json')

const firebase = require('firebase/app')
const config = require('../firebaseconf.js')
require('firebase/auth')

firebase.initializeApp(config)

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://belly-buddy-bf3e1.firebaseio.com'
})

const db = admin.firestore()

module.exports = { admin, db, firebase }
